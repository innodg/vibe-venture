import type { Meal, School } from "./types";

export const sampleSchools: School[] = [
  {
    schoolCode: "7010806",
    eduOfficeCode: "B10",
    schoolName: "서울중학교",
    eduOfficeName: "서울특별시교육청",
    lctnScNm: "서울특별시",
  },
  {
    schoolCode: "7010807",
    eduOfficeCode: "B10",
    schoolName: "서울고등학교",
    eduOfficeName: "서울특별시교육청",
    lctnScNm: "서울특별시",
  },
];

function isoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Builds meal payloads dated relative to "today" so they fall inside the
 * default date range (today..today+6) used by the date picker page.
 */
export function buildSampleMeals(today: Date = new Date()): Meal[] {
  const day0 = new Date(today);
  const day1 = new Date(today);
  day1.setDate(day1.getDate() + 1);
  return [
    {
      date: isoDate(day0),
      dishes: ["백미밥", "미역국", "불고기", "콩나물무침", "배추김치"],
      calorie: "678.5 Kcal",
      origin: ["쌀: 국내산", "쇠고기: 국내산"],
      nutrition: ["탄수화물(g): 90.0", "단백질(g): 25.0"],
      servings: 320,
    },
    {
      date: isoDate(day1),
      dishes: ["흑미밥", "된장찌개", "닭볶음탕", "시금치나물", "포기김치"],
      calorie: "702.1 Kcal",
      origin: ["쌀: 국내산", "닭고기: 국내산"],
      nutrition: ["탄수화물(g): 95.0", "단백질(g): 28.0"],
      servings: 318,
    },
  ];
}
