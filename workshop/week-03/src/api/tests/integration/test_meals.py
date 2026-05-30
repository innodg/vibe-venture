"""Integration tests for GET /api/meals."""
import pytest
import respx
from fastapi.testclient import TestClient
from httpx import Response

from tests.conftest import (
    FAKE_NEIS_BASE_URL,
    make_meal_row,
    neis_error_response,
    neis_ok_response,
)


pytestmark = pytest.mark.integration


BASE_PARAMS = {
    "eduOfficeCode": "B10",
    "schoolCode": "7010806",
    "from": "2024-03-01",
    "to": "2024-03-07",
}


def test_meals_happy_path(client: TestClient, respx_mock: respx.MockRouter) -> None:
    rows = [
        make_meal_row(MLSV_YMD="20240302"),
        make_meal_row(MLSV_YMD="20240301"),
    ]
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/mealServiceDietInfo").mock(
        return_value=Response(200, json=neis_ok_response("mealServiceDietInfo", rows))
    )

    response = client.get("/api/meals", params=BASE_PARAMS)

    assert response.status_code == 200
    body = response.json()
    assert [m["date"] for m in body] == ["2024-03-01", "2024-03-02"]  # sorted asc
    first = body[0]
    assert first["dishes"] == ["쌀밥", "김치찌개", "제육볶음"]
    assert first["origin"] == ["쌀: 국내산", "고기: 국내산"]
    assert first["nutrition"] == ["탄수화물 (g) : 80", "단백질 (g) : 20"]
    assert first["calorie"] == "850 Kcal"
    assert first["servings"] == 120.5


def test_meals_lunch_filter_is_always_2(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    route = respx_mock.get(f"{FAKE_NEIS_BASE_URL}/mealServiceDietInfo").mock(
        return_value=Response(200, json=neis_ok_response("mealServiceDietInfo", []))
    )
    client.get("/api/meals", params=BASE_PARAMS)

    params = route.calls.last.request.url.params
    assert params["MMEAL_SC_CODE"] == "2"
    assert params["MLSV_FROM_YMD"] == "20240301"
    assert params["MLSV_TO_YMD"] == "20240307"
    assert params["ATPT_OFCDC_SC_CODE"] == "B10"
    assert params["SD_SCHUL_CODE"] == "7010806"


def test_meals_handles_blank_servings(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    rows = [make_meal_row(MLSV_FGR="")]
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/mealServiceDietInfo").mock(
        return_value=Response(200, json=neis_ok_response("mealServiceDietInfo", rows))
    )

    response = client.get("/api/meals", params=BASE_PARAMS)

    assert response.status_code == 200
    assert response.json()[0]["servings"] is None


def test_meals_to_before_from_returns_400(client: TestClient) -> None:
    params = {**BASE_PARAMS, "from": "2024-03-10", "to": "2024-03-01"}
    response = client.get("/api/meals", params=params)
    assert response.status_code == 400
    assert "on or after" in response.json()["detail"]


def test_meals_range_over_31_days_returns_400(client: TestClient) -> None:
    params = {**BASE_PARAMS, "from": "2024-03-01", "to": "2024-04-01"}
    response = client.get("/api/meals", params=params)
    assert response.status_code == 400
    assert "31" in response.json()["detail"]


def test_meals_exactly_31_days_is_allowed(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/mealServiceDietInfo").mock(
        return_value=Response(200, json=neis_ok_response("mealServiceDietInfo", []))
    )
    params = {**BASE_PARAMS, "from": "2024-03-01", "to": "2024-03-31"}
    response = client.get("/api/meals", params=params)
    assert response.status_code == 200


def test_meals_invalid_date_format_returns_422(client: TestClient) -> None:
    params = {**BASE_PARAMS, "from": "not-a-date"}
    response = client.get("/api/meals", params=params)
    assert response.status_code == 422


def test_meals_missing_required_param_returns_422(client: TestClient) -> None:
    params = {k: v for k, v in BASE_PARAMS.items() if k != "schoolCode"}
    response = client.get("/api/meals", params=params)
    assert response.status_code == 422


def test_meals_neis_empty_returns_empty(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/mealServiceDietInfo").mock(
        return_value=Response(200, json=neis_error_response("INFO-200", "no data"))
    )
    response = client.get("/api/meals", params=BASE_PARAMS)
    assert response.status_code == 200
    assert response.json() == []


def test_meals_neis_error_returns_502(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/mealServiceDietInfo").mock(
        return_value=Response(
            200, json=neis_error_response("ERROR-290", "Authentication key invalid.")
        )
    )
    response = client.get("/api/meals", params=BASE_PARAMS)
    assert response.status_code == 502
    detail = response.json()["detail"]
    assert detail["code"] == "ERROR-290"


def test_meals_invalid_json_returns_502(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/mealServiceDietInfo").mock(
        return_value=Response(200, text="<html>not json</html>")
    )
    response = client.get("/api/meals", params=BASE_PARAMS)
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "INVALID-JSON"
