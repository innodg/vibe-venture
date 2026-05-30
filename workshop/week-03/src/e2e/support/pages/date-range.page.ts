import type { Locator, Page } from "@playwright/test";

export class DateRangePage {
  readonly page: Page;
  readonly cardTitle: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // CardTitle from shadcn renders a <div>, not a real heading element,
    // so we match by text rather than by role.
    this.cardTitle = page.getByText("날짜 범위 선택");
    this.submitButton = page.getByRole("button", { name: "급식 정보 조회" });
  }

  async waitForLoaded() {
    // Submit button being enabled is the strongest signal that the page is
    // mounted and the default range is populated.
    await this.submitButton.waitFor({ state: "visible" });
  }

  /**
   * The page pre-populates the range with [today, today+6]. For the smoke
   * suite we just submit the default range — it exercises the same
   * navigation + API flow without depending on the calendar widget's
   * keyboard/click semantics.
   */
  async submitDefaultRange() {
    await this.submitButton.click();
  }
}
