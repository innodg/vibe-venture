import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addDays, differenceInDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_RANGE_DAYS = 31;

export default function DateRangePage() {
  const { schoolCode = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const eduOfficeCode = params.get("eduOfficeCode") ?? "";
  const schoolName = params.get("schoolName") ?? "";
  const eduOfficeName = params.get("eduOfficeName") ?? "";

  const today = useMemo(() => new Date(), []);
  const [range, setRange] = useState<DateRange | undefined>({
    from: today,
    to: addDays(today, 6),
  });

  const span =
    range?.from && range?.to ? differenceInDays(range.to, range.from) + 1 : 0;
  const overLimit = span > MAX_RANGE_DAYS;
  const canSubmit = !!range?.from && !!range?.to && !overLimit;

  const handleSubmit = () => {
    if (!range?.from || !range?.to) return;
    const search = new URLSearchParams({
      eduOfficeCode,
      schoolName,
      eduOfficeName,
      from: format(range.from, "yyyy-MM-dd"),
      to: format(range.to, "yyyy-MM-dd"),
    });
    navigate(`/school/${schoolCode}/meals?${search.toString()}`);
  };

  if (!eduOfficeCode || !schoolCode) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-[var(--color-destructive)]">
          학교 정보가 없습니다.{" "}
          <Link to="/" className="underline">
            처음으로 돌아가기
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-6">
        <Link
          to="/"
          className="text-sm text-[var(--color-muted-foreground)] hover:underline"
        >
          ← 학교 다시 검색
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{schoolName}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {eduOfficeName}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>날짜 범위 선택</CardTitle>
          <CardDescription>
            조회할 중식(점심) 기간을 선택해 주세요. 최대 {MAX_RANGE_DAYS}일까지
            선택할 수 있어요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={setRange}
          />

          <div className="w-full text-sm text-[var(--color-muted-foreground)]">
            {range?.from && range?.to ? (
              <>
                선택됨: <strong>{format(range.from, "yyyy-MM-dd")}</strong> ~{" "}
                <strong>{format(range.to, "yyyy-MM-dd")}</strong> ({span}일)
              </>
            ) : (
              <>시작일과 종료일을 선택해 주세요.</>
            )}
            {overLimit && (
              <span className="ml-2 text-[var(--color-destructive)]">
                기간이 {MAX_RANGE_DAYS}일을 초과했습니다.
              </span>
            )}
          </div>

          <Button
            className="self-end"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            급식 정보 조회
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
