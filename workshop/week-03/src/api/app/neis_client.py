from typing import Any

import httpx

from .config import Settings


class NeisError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


_OK_CODES = {"INFO-000"}
_EMPTY_CODES = {"INFO-200"}


def _extract_result(payload: dict[str, Any], list_key: str) -> tuple[list[dict[str, Any]], str, str]:
    """Return (rows, code, message) from a NEIS json response.

    NEIS responses can either be:
      { "<listKey>": [ { "head": [...] }, { "row": [...] } ] }
    or, on error / empty:
      { "RESULT": { "CODE": "...", "MESSAGE": "..." } }
    """
    if list_key in payload:
        sections = payload[list_key]
        code = "INFO-000"
        message = "OK"
        rows: list[dict[str, Any]] = []
        for section in sections:
            if "head" in section:
                for head in section["head"]:
                    result = head.get("RESULT")
                    if result:
                        code = result.get("CODE", code)
                        message = result.get("MESSAGE", message)
            if "row" in section:
                rows.extend(section["row"])
        return rows, code, message

    result = payload.get("RESULT") or {}
    code = result.get("CODE", "ERROR-UNKNOWN")
    message = result.get("MESSAGE", "Unknown NEIS response")
    return [], code, message


class NeisClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.neis_base_url,
            timeout=httpx.Timeout(15.0),
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: dict[str, Any], list_key: str) -> list[dict[str, Any]]:
        query = {
            "KEY": self._settings.neis_api_key,
            "Type": "json",
            "pIndex": 1,
            "pSize": 1000,
            **{k: v for k, v in params.items() if v is not None and v != ""},
        }
        try:
            response = await self._client.get(path, params=query)
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPError as exc:
            raise NeisError("HTTP-ERROR", str(exc)) from exc
        except ValueError as exc:
            raise NeisError("INVALID-JSON", "Invalid JSON response from NEIS") from exc
        rows, code, message = _extract_result(payload, list_key)
        if code in _OK_CODES:
            return rows
        if code in _EMPTY_CODES:
            return []
        raise NeisError(code, message)

    async def search_schools(self, name: str) -> list[dict[str, Any]]:
        return await self._get(
            "/schoolInfo",
            {"SCHUL_NM": name},
            "schoolInfo",
        )

    async def get_lunch_meals(
        self,
        edu_office_code: str,
        school_code: str,
        from_ymd: str,
        to_ymd: str,
    ) -> list[dict[str, Any]]:
        return await self._get(
            "/mealServiceDietInfo",
            {
                "ATPT_OFCDC_SC_CODE": edu_office_code,
                "SD_SCHUL_CODE": school_code,
                "MMEAL_SC_CODE": "2",
                "MLSV_FROM_YMD": from_ymd,
                "MLSV_TO_YMD": to_ymd,
            },
            "mealServiceDietInfo",
        )
