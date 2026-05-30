"""Unit tests for pydantic schemas."""
import pytest
from pydantic import ValidationError

from app.schemas import Meal, School


pytestmark = pytest.mark.unit


class TestSchoolSchema:
    def test_camelcase_aliases_populate_fields(self) -> None:
        school = School(
            schoolCode="7010806",
            eduOfficeCode="B10",
            schoolName="서울고등학교",
            eduOfficeName="서울특별시교육청",
            lctnScNm="서울특별시",
        )
        assert school.school_code == "7010806"
        assert school.edu_office_code == "B10"
        assert school.school_name == "서울고등학교"
        assert school.edu_office_name == "서울특별시교육청"
        assert school.location_name == "서울특별시"

    def test_lctn_sc_nm_is_optional(self) -> None:
        school = School(
            schoolCode="x",
            eduOfficeCode="y",
            schoolName="a",
            eduOfficeName="b",
        )
        assert school.location_name is None

    def test_missing_required_field_raises(self) -> None:
        with pytest.raises(ValidationError):
            School(  # type: ignore[call-arg]
                schoolCode="x",
                eduOfficeCode="y",
                schoolName="a",
            )

    def test_serialization_uses_alias(self) -> None:
        school = School(
            schoolCode="7010806",
            eduOfficeCode="B10",
            schoolName="서울고등학교",
            eduOfficeName="서울특별시교육청",
        )
        dumped = school.model_dump(by_alias=True)
        assert "schoolCode" in dumped
        assert "lctnScNm" in dumped


class TestMealSchema:
    def test_defaults(self) -> None:
        meal = Meal(date="2024-03-01")
        assert meal.dishes == []
        assert meal.origin == []
        assert meal.nutrition == []
        assert meal.calorie is None
        assert meal.servings is None

    def test_full_payload(self) -> None:
        meal = Meal(
            date="2024-03-01",
            dishes=["쌀밥", "김치찌개"],
            calorie="850 Kcal",
            origin=["쌀: 국내산"],
            nutrition=["탄수화물 (g) : 80"],
            servings=120.5,
        )
        assert meal.servings == 120.5
        assert len(meal.dishes) == 2
