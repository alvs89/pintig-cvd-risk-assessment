import { test, expect, type Page } from "@playwright/test";

async function loginWorker(page: Page) {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.getByRole("button", {name:"Sign in →",exact:true}).click();
}
async function openHistory(page: Page) {
  await page.locator('.sidebar [data-act="nav:Assessment History"]').click();
}
test("legacy History shows only captured inputs, no reconstructed eligibility, and explicit illustrative source",async({page})=>{
  await loginWorker(page);
  await openHistory(page);
  await page.locator('[data-act="record:1"]').click();
  await expect(page.getByRole("heading",{name:"Assessment AST-0001"})).toBeVisible();
  const metadata = page.locator('.history-assessment-meta');
  await expect(metadata).toContainText('Assessment date');
  await expect(metadata).toContainText('Assessor');
  await expect(page.getByRole('heading', {name:'Assessment details', exact:true})).toHaveCount(0);
  expect(await metadata.evaluate(el => {
    const status = el.previousElementSibling!;
    const estimate = el.nextElementSibling!;
    return status.getBoundingClientRect().bottom <= el.getBoundingClientRect().top &&
      el.getBoundingClientRect().bottom <= estimate.getBoundingClientRect().top &&
      estimate.getBoundingClientRect().width >= el.getBoundingClientRect().width - 1;
  })).toBe(true);
  const source=page.getByRole("region",{name:"Assessment Result Information"});
  await expect(source).toContainText("Illustrative estimate");
  await expect(source).toContainText("Assessment period");
  await expect(source).toContainText("not been clinically validated");
  await expect(source).toContainText("should not be used for clinical decisions");
  const info=page.getByRole("heading",{name:"Recorded assessment information"}).locator("..");
  await expect(info.getByText(/Some assessment information is unavailable/)).toBeVisible();
  await expect(info.locator(".history-question-group")).toHaveCount(2);
  await expect(info.locator(".history-question-value")).toHaveCount(5);
  await expect(info.getByText("Eligibility questions")).toHaveCount(0);
  await expect(info.getByText("Systolic blood pressure",{exact:true})).toHaveCount(1);
  await expect(info.getByText("165 mmHg",{exact:true})).toHaveCount(1);
  await expect(page.locator(".cif-panel")).toHaveCount(0);
  await expect(page.getByText(/Illustrative estimate; not a clinically validated prediction/)).toBeVisible();
  const before = await source.textContent();
  await page.getByRole("button",{name:"Print record"}).click();
  await expect(source).toHaveText(before!);
  for(const width of [1440,820,390,320]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("new saved assessment retains all questionnaire fields in their original sections and separately identifies its illustrative result",async({page})=>{
  await page.route("http://127.0.0.1:8765/research-cif", route=>route.abort());
  await loginWorker(page);
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await page.getByRole("button",{name:"Prefill questionnaire",exact:true}).click();
  await page.locator('#assessmentForm button[type="submit"]').click();
  await page.locator('[data-act="saveAssessment"]').click();
  await openHistory(page);
  await page.locator('[data-act="record:11"]').click();
  await expect(page.getByRole("heading",{name:"Assessment AST-0011"})).toBeVisible();
  const info=page.getByRole("heading",{name:"Recorded assessment information"}).locator("..");
  const groups=info.locator(".history-question-group");
  await expect(groups).toHaveCount(7);
  for(const text of ["Patient identification","Eligibility questions","Clinic measurements","Smoking and medication history","Alcohol consumption and physical activity","Diet and nutrition","Family and social history"])
    await expect(info.getByRole("heading",{name:text,exact:true})).toBeVisible();
  await expect(info.locator('.history-question-group').filter({has:page.getByRole("heading",{name:"Eligibility questions"})})).toContainText("Information verified");
  await expect(info.getByText("Current blood pressure medication",{exact:true})).toHaveCount(1);
  await expect(info.getByText("156 mmHg",{exact:true})).toHaveCount(1);
  await expect(info.getByText("94 mmHg",{exact:true})).toHaveCount(1);
  await expect(info.getByText(/Some assessment information is unavailable/)).toHaveCount(0);
  await expect(page.getByRole("region",{name:"Assessment Result Information"})).toContainText("Illustrative estimate");
  await expect(page.getByRole("region",{name:"Assessment Result Information"})).toContainText("should not be used for clinical decisions");
  await expect(page.locator(".cif-panel")).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"General Educational Guidance"})).toBeVisible();
});
