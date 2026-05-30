import type { Locator, Page } from "@playwright/test";

export class MealsPage {
  readonly page: Page;
  readonly schoolHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.schoolHeading = page.locator("header h1");
  }

  async waitForLoaded(schoolName: string) {
    await this.schoolHeading.filter({ hasText: schoolName }).waitFor();
  }

  dishItem(dish: string) {
    return this.page.getByRole("listitem").filter({ hasText: dish });
  }

  emptyDayMessages() {
    return this.page.getByText("급식 정보 없음");
  }
}
