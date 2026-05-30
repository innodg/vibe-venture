import { test as base, type Page } from "@playwright/test";
import type { Meal, School } from "../fixtures/types";
import { HomePage } from "./pages/home.page";
import { DateRangePage } from "./pages/date-range.page";
import { MealsPage } from "./pages/meals.page";

interface MockApi {
  /**
   * Mock GET /api/schools?name=... with the given response body.
   * If `status` is omitted, returns 200 with the schools array.
   */
  schools: (schools: School[], opts?: { status?: number; body?: unknown }) => Promise<void>;
  /**
   * Mock GET /api/meals?... with the given response body.
   */
  meals: (meals: Meal[], opts?: { status?: number; body?: unknown }) => Promise<void>;
  /**
   * Wait for at least one request to /api/schools to be observed.
   * Returns the parsed `name` query param of the most recent matching request.
   */
  recordedSchoolNames: () => string[];
}

interface Fixtures {
  mockApi: MockApi;
  home: HomePage;
  dateRange: DateRangePage;
  meals: MealsPage;
}

/**
 * Browser-side `/api/*` mocking: every request the SPA makes to /api/schools
 * or /api/meals is intercepted before it reaches the network. The api server
 * never needs to be running for these E2E tests.
 */
export const test = base.extend<Fixtures>({
  mockApi: async ({ page }, use) => {
    const recorded: string[] = [];

    const installSchools: MockApi["schools"] = async (schools, opts = {}) => {
      await page.route("**/api/schools*", async (route) => {
        const url = new URL(route.request().url());
        recorded.push(url.searchParams.get("name") ?? "");
        await route.fulfill({
          status: opts.status ?? 200,
          contentType: "application/json",
          body: JSON.stringify(opts.body ?? schools),
        });
      });
    };

    const installMeals: MockApi["meals"] = async (meals, opts = {}) => {
      await page.route("**/api/meals*", async (route) => {
        await route.fulfill({
          status: opts.status ?? 200,
          contentType: "application/json",
          body: JSON.stringify(opts.body ?? meals),
        });
      });
    };

    await use({
      schools: installSchools,
      meals: installMeals,
      recordedSchoolNames: () => [...recorded],
    });

    await page.unroute("**/api/schools*");
    await page.unroute("**/api/meals*");
  },
  home: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  dateRange: async ({ page }, use) => {
    await use(new DateRangePage(page));
  },
  meals: async ({ page }, use) => {
    await use(new MealsPage(page));
  },
});

export { expect } from "@playwright/test";
export type { Page };
