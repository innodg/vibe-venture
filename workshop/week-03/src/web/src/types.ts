export interface School {
  schoolCode: string;
  eduOfficeCode: string;
  schoolName: string;
  eduOfficeName: string;
  lctnScNm: string | null;
}

export interface Meal {
  date: string;
  dishes: string[];
  calorie: string | null;
  origin: string[];
  nutrition: string[];
  servings: number | null;
}
