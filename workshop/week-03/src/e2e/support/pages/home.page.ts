import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "급식 정보 조회" });
    this.searchInput = page.getByPlaceholder("예: 서울고등학교");
    this.emptyMessage = page.getByText("검색 결과가 없습니다.");
  }

  async goto() {
    await this.page.goto("/");
    await this.heading.waitFor();
  }

  async searchSchool(name: string) {
    await this.searchInput.fill(name);
  }

  schoolCard(schoolName: string) {
    return this.page.getByRole("button", { name: new RegExp(schoolName) });
  }

  async selectSchool(schoolName: string) {
    await this.schoolCard(schoolName).click();
  }
}
