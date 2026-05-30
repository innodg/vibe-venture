import { test, expect } from "../support/test-base";
import { buildSampleMeals, sampleSchools } from "../fixtures/neis-mocks";

test("user can search a school, pick dates, and view 중식 menu", async ({
  page,
  mockApi,
  home,
  dateRange,
  meals,
}) => {
  await mockApi.schools(sampleSchools);
  await mockApi.meals(buildSampleMeals());

  // Step 1: landing page
  await home.goto();
  await expect(home.heading).toBeVisible();

  // Step 2: search and confirm we hit /api/schools with the typed name
  const schoolsRequest = page.waitForRequest(/\/api\/schools\?/);
  await home.searchSchool("서울");
  const req = await schoolsRequest;
  expect(new URL(req.url()).searchParams.get("name")).toBe("서울");

  // Step 3: pick a school and navigate to the date range page
  await expect(home.schoolCard("서울중학교")).toBeVisible();
  await home.selectSchool("서울중학교");
  await dateRange.waitForLoaded();
  await expect(page).toHaveURL(/\/school\/7010806\?/);

  // Step 4: submit default range and assert /api/meals is hit with MMEAL/중식 context
  const mealsRequest = page.waitForRequest(/\/api\/meals\?/);
  await dateRange.submitDefaultRange();
  const mealsReq = await mealsRequest;
  const mealsParams = new URL(mealsReq.url()).searchParams;
  expect(mealsParams.get("schoolCode")).toBe("7010806");
  expect(mealsParams.get("eduOfficeCode")).toBe("B10");
  expect(mealsParams.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(mealsParams.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  // Step 5: meals page renders mocked dishes
  await meals.waitForLoaded("서울중학교");
  await expect(meals.dishItem("불고기")).toBeVisible();
  await expect(meals.dishItem("닭볶음탕")).toBeVisible();
});
