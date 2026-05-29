import type { Meal, School } from "@/types";

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    let detail: unknown = null;
    try {
      detail = (await response.json()).detail;
    } catch {
      // ignore
    }
    const message =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object" && "message" in detail
          ? String((detail as { message: unknown }).message)
          : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function searchSchools(name: string): Promise<School[]> {
  const params = new URLSearchParams({ name });
  return request<School[]>(`/api/schools?${params.toString()}`);
}

export function getMeals(args: {
  eduOfficeCode: string;
  schoolCode: string;
  from: string;
  to: string;
}): Promise<Meal[]> {
  const params = new URLSearchParams({
    eduOfficeCode: args.eduOfficeCode,
    schoolCode: args.schoolCode,
    from: args.from,
    to: args.to,
  });
  return request<Meal[]>(`/api/meals?${params.toString()}`);
}
