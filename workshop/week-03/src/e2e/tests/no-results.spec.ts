import { test, expect } from "../support/test-base";
import { sampleSchools } from "../fixtures/neis-mocks";

test.describe("empty states", () => {
  test("shows empty message when school search returns no results", async ({
    mockApi,
    home,
  }) => {
    await mockApi.schools([]);

    await home.goto();
    await home.searchSchool("없는학교");

    await expect(home.emptyMessage).toBeVisible();
  });

  test("shows '급식 정보 없음' for every day when meals API returns empty", async ({
    page,
    mockApi,
    home,
    dateRange,
    meals,
  }) => {
    await mockApi.schools(sampleSchools);
    await mockApi.meals([]);

    await home.goto();
    await home.searchSchool("서울");
    await home.selectSchool("서울중학교");
    await dateRange.waitForLoaded();
    await dateRange.submitDefaultRange();

    await meals.waitForLoaded("서울중학교");
    // Default range is today + 6 days = 7 day cards. Every card should show
    // the empty meal description because the API returned no rows.
    await expect(meals.emptyDayMessages()).toHaveCount(7);
    await expect(page.getByRole("listitem")).toHaveCount(0);
  });
});
