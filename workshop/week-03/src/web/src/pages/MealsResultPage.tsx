import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMeals } from "@/lib/api";
import type { Meal } from "@/types";

function Bullets({ items }: { items: string[] }) {
  if (!items.length) {
    return (
      <span className="text-sm text-[var(--color-muted-foreground)]">—</span>
    );
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
}

function MealSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <Bullets items={items} />
    </div>
  );
}

export default function MealsResultPage() {
  const { schoolCode = "" } = useParams();
  const [params] = useSearchParams();

  const eduOfficeCode = params.get("eduOfficeCode") ?? "";
  const schoolName = params.get("schoolName") ?? "";
  const eduOfficeName = params.get("eduOfficeName") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const enabled = !!eduOfficeCode && !!schoolCode && !!from && !!to;

  const {
    data,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["meals", eduOfficeCode, schoolCode, from, to],
    queryFn: () => getMeals({ eduOfficeCode, schoolCode, from, to }),
    enabled,
  });

  const mealsByDate = useMemo(() => {
    const map = new Map<string, Meal>();
    (data ?? []).forEach((meal) => map.set(meal.date, meal));
    return map;
  }, [data]);

  const days = useMemo(() => {
    if (!from || !to) return [];
    const start = parseISO(from);
    const end = parseISO(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const maxSpanMs = 30 * 24 * 60 * 60 * 1000;
    if (end < start || end.getTime() - start.getTime() > maxSpanMs) return [];
    return eachDayOfInterval({ start, end });
  }, [from, to]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-6">
        <Link
          to={`/school/${schoolCode}?${new URLSearchParams({
            eduOfficeCode,
            schoolName,
            eduOfficeName,
          }).toString()}`}
          className="text-sm text-[var(--color-muted-foreground)] hover:underline"
        >
          ← 날짜 다시 선택
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{schoolName}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {eduOfficeName} · 중식 (점심) · {from} ~ {to}
        </p>
      </header>

      {isFetching && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          식단 정보를 불러오는 중…
        </p>
      )}
      {isError && (
        <p className="text-sm text-[var(--color-destructive)]">
          오류: {(error as Error).message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const meal = mealsByDate.get(iso);
          const weekday = format(day, "EEE");
          return (
            <Card key={iso}>
              <CardHeader>
                <CardTitle className="text-base">
                  {iso}{" "}
                  <span className="text-sm font-normal text-[var(--color-muted-foreground)]">
                    ({weekday})
                  </span>
                </CardTitle>
                {meal ? (
                  <CardDescription>
                    {meal.calorie ?? "칼로리 정보 없음"}
                    {meal.servings ? ` · 급식인원 ${meal.servings}명` : ""}
                  </CardDescription>
                ) : (
                  <CardDescription>급식 정보 없음</CardDescription>
                )}
              </CardHeader>
              {meal && (
                <CardContent className="space-y-4">
                  <MealSection title="메뉴" items={meal.dishes} />
                  <MealSection title="원산지" items={meal.origin} />
                  <MealSection title="영양정보" items={meal.nutrition} />
                  <MealSection
                    title="기타"
                    items={[
                      meal.calorie ? `칼로리: ${meal.calorie}` : "",
                      meal.servings != null
                        ? `급식인원수: ${meal.servings}`
                        : "",
                    ].filter(Boolean)}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
