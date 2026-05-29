import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { searchSchools } from "@/lib/api";
import type { School } from "@/types";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const query = useDebounced(input.trim(), 300);

  const {
    data: schools,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["schools", query],
    queryFn: () => searchSchools(query),
    enabled: query.length > 0,
  });

  const empty = useMemo(
    () => query.length > 0 && !isFetching && (schools?.length ?? 0) === 0,
    [query, isFetching, schools],
  );

  const handleSelect = (school: School) => {
    const params = new URLSearchParams({
      eduOfficeCode: school.eduOfficeCode,
      schoolName: school.schoolName,
      eduOfficeName: school.eduOfficeName,
    });
    navigate(`/school/${school.schoolCode}?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">급식 정보 조회</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          학교 이름의 일부를 입력하면 일치하는 학교 목록을 보여드려요.
        </p>
      </header>

      <Input
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="예: 서울고등학교"
      />

      <div className="mt-6 flex flex-col gap-3">
        {query.length === 0 && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            학교 이름을 입력해 주세요.
          </p>
        )}
        {isFetching && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            검색 중…
          </p>
        )}
        {isError && (
          <p className="text-sm text-[var(--color-destructive)]">
            오류: {(error as Error).message}
          </p>
        )}
        {empty && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            검색 결과가 없습니다.
          </p>
        )}
        {(schools ?? []).map((school) => (
          <Card
            key={`${school.eduOfficeCode}-${school.schoolCode}`}
            className="cursor-pointer transition-colors hover:bg-[var(--color-accent)]"
            onClick={() => handleSelect(school)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(school);
              }
            }}
          >
            <CardContent className="p-4">
              <CardTitle className="text-base">{school.schoolName}</CardTitle>
              <CardDescription className="mt-1">
                {school.eduOfficeName}
                {school.lctnScNm ? ` · ${school.lctnScNm}` : ""}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
