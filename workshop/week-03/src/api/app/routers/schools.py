from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..neis_client import NeisClient, NeisError
from ..schemas import School

router = APIRouter()


def get_client(request: Request) -> NeisClient:
    return request.app.state.neis_client


@router.get("/schools", response_model=list[School])
async def search_schools(
    name: str = Query(..., min_length=1, description="학교명 (부분 검색)"),
    client: NeisClient = Depends(get_client),
) -> list[School]:
    try:
        rows = await client.search_schools(name)
    except NeisError as e:
        raise HTTPException(status_code=502, detail={"code": e.code, "message": e.message})

    return [
        School(
            schoolCode=row.get("SD_SCHUL_CODE", ""),
            eduOfficeCode=row.get("ATPT_OFCDC_SC_CODE", ""),
            schoolName=row.get("SCHUL_NM", ""),
            eduOfficeName=row.get("ATPT_OFCDC_SC_NM", ""),
            lctnScNm=row.get("LCTN_SC_NM"),
        )
        for row in rows
    ]
