"""Unit tests for helpers in app.routers.meals (pure functions)."""
import pytest

from app.routers.meals import _split, _to_iso, _to_ymd
from datetime import date


pytestmark = pytest.mark.unit


class TestSplit:
    def test_none_returns_empty_list(self) -> None:
        assert _split(None) == []

    def test_empty_string_returns_empty_list(self) -> None:
        assert _split("") == []

    def test_splits_on_br_slash(self) -> None:
        assert _split("쌀밥<br/>김치찌개<br/>제육볶음") == ["쌀밥", "김치찌개", "제육볶음"]

    def test_splits_on_br_no_slash(self) -> None:
        assert _split("a<br>b<br>c") == ["a", "b", "c"]

    def test_strips_whitespace_and_drops_blanks(self) -> None:
        assert _split("  쌀밥 <br/>  <br/>김치찌개 ") == ["쌀밥", "김치찌개"]


class TestToYmd:
    def test_basic(self) -> None:
        assert _to_ymd(date(2024, 3, 1)) == "20240301"

    def test_year_with_leading_zero_month(self) -> None:
        assert _to_ymd(date(2024, 1, 9)) == "20240109"


class TestToIso:
    def test_8_digit_input_converted(self) -> None:
        assert _to_iso("20240301") == "2024-03-01"

    def test_non_8_digit_input_returned_as_is(self) -> None:
        assert _to_iso("2024-03-01") == "2024-03-01"
        assert _to_iso("") == ""
