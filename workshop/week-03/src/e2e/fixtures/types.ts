// Mirror of the web app's API shapes. Kept local to keep the e2e package
// independent of the web/api workspaces.
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
