"""Shared pytest fixtures.

These fixtures override real settings with a fake NEIS API key and
ensure no test ever hits the real NEIS service.
"""
from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from app import config
from app.config import Settings
from app.main import create_app


FAKE_NEIS_BASE_URL = "https://neis.test"
FAKE_NEIS_API_KEY = "test-key"


@pytest.fixture(autouse=True)
def _override_settings(monkeypatch: pytest.MonkeyPatch) -> Iterator[Settings]:
    """Force every test to use a deterministic Settings object.

    We clear the lru_cache so the new env vars take effect.
    """
    monkeypatch.setenv("NEIS_API_KEY", FAKE_NEIS_API_KEY)
    monkeypatch.setenv("NEIS_BASE_URL", FAKE_NEIS_BASE_URL)
    config.get_settings.cache_clear()
    settings = config.get_settings()
    try:
        yield settings
    finally:
        config.get_settings.cache_clear()


@pytest.fixture
def settings(_override_settings: Settings) -> Settings:
    return _override_settings


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Spin up the FastAPI app with the lifespan (so neis_client exists)."""
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def respx_mock() -> Iterator[respx.MockRouter]:
    """An autouse respx mock that asserts no unexpected calls happen."""
    with respx.mock(
        base_url=FAKE_NEIS_BASE_URL,
        assert_all_called=False,
        assert_all_mocked=True,
    ) as router:
        yield router


def neis_ok_response(list_key: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a NEIS-shaped success response."""
    return {
        list_key: [
            {"head": [{"list_total_count": len(rows)}, {"RESULT": {"CODE": "INFO-000", "MESSAGE": "정상 처리되었습니다."}}]},
            {"row": rows},
        ]
    }


def neis_error_response(code: str, message: str) -> dict[str, Any]:
    return {"RESULT": {"CODE": code, "MESSAGE": message}}


def make_school_row(**overrides: Any) -> dict[str, Any]:
    base = {
        "ATPT_OFCDC_SC_CODE": "B10",
        "ATPT_OFCDC_SC_NM": "서울특별시교육청",
        "SD_SCHUL_CODE": "7010806",
        "SCHUL_NM": "서울고등학교",
        "LCTN_SC_NM": "서울특별시",
    }
    base.update(overrides)
    return base


def make_meal_row(**overrides: Any) -> dict[str, Any]:
    base = {
        "MLSV_YMD": "20240301",
        "DDISH_NM": "쌀밥<br/>김치찌개<br/>제육볶음",
        "ORPLC_INFO": "쌀: 국내산<br/>고기: 국내산",
        "NTR_INFO": "탄수화물 (g) : 80<br/>단백질 (g) : 20",
        "CAL_INFO": "850 Kcal",
        "MLSV_FGR": "120.5",
    }
    base.update(overrides)
    return base


__all__ = [
    "FAKE_NEIS_BASE_URL",
    "FAKE_NEIS_API_KEY",
    "neis_ok_response",
    "neis_error_response",
    "make_school_row",
    "make_meal_row",
    "httpx",
]
