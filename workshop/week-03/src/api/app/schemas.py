from pydantic import BaseModel, Field


class School(BaseModel):
    school_code: str = Field(..., alias="schoolCode")
    edu_office_code: str = Field(..., alias="eduOfficeCode")
    school_name: str = Field(..., alias="schoolName")
    edu_office_name: str = Field(..., alias="eduOfficeName")
    location_name: str | None = Field(None, alias="lctnScNm")

    model_config = {"populate_by_name": True}


class Meal(BaseModel):
    date: str
    dishes: list[str] = []
    calorie: str | None = None
    origin: list[str] = []
    nutrition: list[str] = []
    servings: float | None = None
