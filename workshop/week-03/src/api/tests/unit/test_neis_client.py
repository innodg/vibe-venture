"""Unit tests for app.neis_client._extract_result.

Pure function; no I/O.
"""
import pytest

from app.neis_client import _extract_result


pytestmark = pytest.mark.unit


class TestExtractResult:
    def test_success_payload_returns_rows(self) -> None:
        payload = {
            "schoolInfo": [
                {"head": [{"RESULT": {"CODE": "INFO-000", "MESSAGE": "OK"}}]},
                {"row": [{"SCHUL_NM": "A"}, {"SCHUL_NM": "B"}]},
            ]
        }
        rows, code, message = _extract_result(payload, "schoolInfo")
        assert code == "INFO-000"
        assert message == "OK"
        assert rows == [{"SCHUL_NM": "A"}, {"SCHUL_NM": "B"}]

    def test_success_without_explicit_result_defaults_to_info_000(self) -> None:
        payload = {
            "schoolInfo": [
                {"head": [{"list_total_count": 1}]},
                {"row": [{"SCHUL_NM": "A"}]},
            ]
        }
        rows, code, message = _extract_result(payload, "schoolInfo")
        assert code == "INFO-000"
        assert message == "OK"
        assert rows == [{"SCHUL_NM": "A"}]

    def test_top_level_result_error(self) -> None:
        payload = {"RESULT": {"CODE": "INFO-200", "MESSAGE": "no data"}}
        rows, code, message = _extract_result(payload, "schoolInfo")
        assert rows == []
        assert code == "INFO-200"
        assert message == "no data"

    def test_unknown_payload_returns_default_error_code(self) -> None:
        rows, code, message = _extract_result({}, "schoolInfo")
        assert rows == []
        assert code == "ERROR-UNKNOWN"
        assert message == "Unknown NEIS response"

    def test_list_key_present_but_no_rows_section(self) -> None:
        payload = {
            "schoolInfo": [
                {"head": [{"RESULT": {"CODE": "INFO-000", "MESSAGE": "OK"}}]}
            ]
        }
        rows, code, _ = _extract_result(payload, "schoolInfo")
        assert rows == []
        assert code == "INFO-000"
