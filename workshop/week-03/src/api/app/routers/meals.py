from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..neis_client import NeisClient, NeisError
from ..schemas import Meal

router = APIRouter()

MAX_RANGE_DAYS = 31


def get_client(request: Request) -> NeisClient:
    return request.app.state.neis_client


def _split(value: str | None) -> list[str]:
    if not value:
        return []
    parts = [p.strip() for p in value.replace("<br/>", "\n").replace("<br>", "\n").split("\n")]
    return [p for p in parts if p]


def _to_ymd(d: date) -> str:
    return d.strftime("%Y%m%d")


def _to_iso(ymd: str) -> str:
    if len(ymd) == 8:
        return f"{ymd[:4]}-{ymd[4:6]}-{ymd[6:8]}"
    return ymd


@router.get("/meals", response_model=list[Meal])
async def get_meals(
    eduOfficeCode: str = Query(..., min_length=1),
    schoolCode: str = Query(..., min_length=1),
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    client: NeisClient = Depends(get_client),
) -> list[Meal]:
    if to < from_:
        raise HTTPException(status_code=400, detail="'to' must be on or after 'from'.")
    if (to - from_) > timedelta(days=MAX_RANGE_DAYS - 1):
        raise HTTPException(
            status_code=400,
            detail=f"Date range must not exceed {MAX_RANGE_DAYS} days.",
        )

    try:
        rows = await client.get_lunch_meals(
            edu_office_code=eduOfficeCode,
            school_code=schoolCode,
            from_ymd=_to_ymd(from_),
            to_ymd=_to_ymd(to),
        )
    except NeisError as e:
        raise HTTPException(status_code=502, detail={"code": e.code, "message": e.message})

    meals = [
        Meal(
            date=_to_iso(row.get("MLSV_YMD", "")),
            dishes=_split(row.get("DDISH_NM")),
            calorie=(row.get("CAL_INFO") or None),
            origin=_split(row.get("ORPLC_INFO")),
            nutrition=_split(row.get("NTR_INFO")),
            servings=(
                float(row["MLSV_FGR"])
                if row.get("MLSV_FGR") not in (None, "")
                else None
            ),
        )
        for row in rows
    ]
    meals.sort(key=lambda m: m.date)
    return meals
