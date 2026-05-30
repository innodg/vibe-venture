"""Integration tests for GET /api/schools.

Mocks the NEIS HTTP boundary with respx so no real network is touched.
"""
import pytest
import respx
from fastapi.testclient import TestClient
from httpx import Response

from tests.conftest import (
    FAKE_NEIS_BASE_URL,
    make_school_row,
    neis_error_response,
    neis_ok_response,
)


pytestmark = pytest.mark.integration


def test_schools_happy_path(client: TestClient, respx_mock: respx.MockRouter) -> None:
    rows = [
        make_school_row(),
        make_school_row(SD_SCHUL_CODE="9999999", SCHUL_NM="서울중학교"),
    ]
    route = respx_mock.get(f"{FAKE_NEIS_BASE_URL}/schoolInfo").mock(
        return_value=Response(200, json=neis_ok_response("schoolInfo", rows))
    )

    response = client.get("/api/schools", params={"name": "서울"})

    assert response.status_code == 200
    assert route.called
    body = response.json()
    assert len(body) == 2
    assert body[0]["schoolName"] == "서울고등학교"
    assert body[0]["eduOfficeCode"] == "B10"
    assert body[0]["lctnScNm"] == "서울특별시"
    assert body[1]["schoolName"] == "서울중학교"


def test_schools_passes_api_key_and_name(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    route = respx_mock.get(f"{FAKE_NEIS_BASE_URL}/schoolInfo").mock(
        return_value=Response(200, json=neis_ok_response("schoolInfo", []))
    )

    client.get("/api/schools", params={"name": "서울"})

    assert route.calls.last.request.url.params["KEY"] == "test-key"
    assert route.calls.last.request.url.params["SCHUL_NM"] == "서울"
    assert route.calls.last.request.url.params["Type"] == "json"


def test_schools_empty_neis_result_returns_empty_list(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/schoolInfo").mock(
        return_value=Response(200, json=neis_error_response("INFO-200", "no data"))
    )

    response = client.get("/api/schools", params={"name": "없는학교"})

    assert response.status_code == 200
    assert response.json() == []


def test_schools_neis_error_returns_502(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/schoolInfo").mock(
        return_value=Response(
            200, json=neis_error_response("ERROR-300", "Required values are missing.")
        )
    )

    response = client.get("/api/schools", params={"name": "x"})

    assert response.status_code == 502
    detail = response.json()["detail"]
    assert detail["code"] == "ERROR-300"
    assert "missing" in detail["message"].lower()


def test_schools_http_error_returns_502(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/schoolInfo").mock(
        return_value=Response(500, text="boom")
    )

    response = client.get("/api/schools", params={"name": "x"})

    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "HTTP-ERROR"


def test_schools_missing_name_returns_422(client: TestClient) -> None:
    response = client.get("/api/schools")
    assert response.status_code == 422


def test_schools_empty_name_returns_422(client: TestClient) -> None:
    response = client.get("/api/schools", params={"name": ""})
    assert response.status_code == 422


def test_schools_handles_partial_row_fields(
    client: TestClient, respx_mock: respx.MockRouter
) -> None:
    rows = [{"SCHUL_NM": "이름만있는학교"}]
    respx_mock.get(f"{FAKE_NEIS_BASE_URL}/schoolInfo").mock(
        return_value=Response(200, json=neis_ok_response("schoolInfo", rows))
    )

    response = client.get("/api/schools", params={"name": "이름"})

    assert response.status_code == 200
    body = response.json()
    assert body[0]["schoolName"] == "이름만있는학교"
    assert body[0]["schoolCode"] == ""
    assert body[0]["lctnScNm"] is None
