import { test, expect, type Page } from "@playwright/test";

const modelResponse = {
  schemaVersion: "research-7p-cif-v1",
  modelVersion: "FRAMINGHAM-7P-RSF-RESEARCH-20261015",
  source: "local-readonly-randomForestSRC",
  endpoint: "Framingham-recorded CVD; not final PURE major-CVD composite",
  competing: "Death before recorded CVD; cause of death not verified",
  numberOfTrees: 500,
  risk10: 0.156,
  cif: {
    times: [26,365.25,730.5,1095.75,1461,1826.25,2191.5,2556.75,2922,3287.25,3652.5],
    probabilities: [0,0.01,0.022,0.038,0.061,0.085,0.104,0.118,0.131,0.145,0.156],
    timeUnit: "days",daysPerYear:365.25,probabilityUnit:"fraction",supportedUntil:3652.5,
  },
};
async function navigateToFictionalAssessment(page: Page) {
  await page.goto("/");
  await page.locator('[data-act="workerDemo"]').click();
  await page.locator('button[type="submit"]').click();
  await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
  await page.locator("#pid").selectOption("1");
  await page.getByRole("button", {name:"Prefill questionnaire",exact:true}).click();
  await page.locator('#assessmentForm button[type="submit"]').click();
}
test("fictional form inputs invoke isolated local research model; genuine-shaped response displays CIG", async ({page}) => {
  const requests: any[] = [];
  await page.route("http://127.0.0.1:8765/research-cif",async route=>{
    requests.push(route.request().postDataJSON());
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(modelResponse)});
  });
  await navigateToFictionalAssessment(page);
  await expect(page.locator(".research-cig")).toBeVisible();
  await expect(page.getByTestId("research-cig-risk")).toHaveText("15.60%");
  await expect(page.locator(".research-cif-curve")).toHaveAttribute("d", /H /);
  expect(requests.length).toBe(1);
  expect(requests[0].fictionalOnly).toBe(true);
  expect(requests[0].predictors.sbp_mmhg).toBe(156);
  expect(requests[0].predictors.dbp_mmhg).toBe(94);
  expect(requests[0].predictors.sex_male).toBe(1);
  expect(Object.keys(requests[0].predictors).sort()).toEqual([
    "age_years","sex_male","sbp_mmhg","dbp_mmhg",
    "bmi_kg_m2","current_smoker","bp_medication"
  ].sort());
  const p=page.locator(".research-cig");
  await p.getByLabel("Inspect year").selectOption("1");
  await expect(p.locator(".research-cig-inspection")).toContainText("1.00%");
  await p.getByLabel("Probability reference").selectOption("0.2");
  await expect(p.locator(".research-cig-reference")).toContainText("not reached");
  await p.getByLabel("Probability reference").selectOption("0.05");
  await expect(p.locator(".research-cig-reference")).toContainText("Year 4");
  await p.getByRole("button",{name:"Refresh research CIG"}).click();
  await expect.poll(()=>requests.length).toBe(2);
  await expect(page.getByTestId("research-cig-risk")).toHaveText("15.60%");
  for(const width of [1440,820,390,320]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.locator(".cif-panel")).toHaveCount(0);
  await expect(page.locator(".further-assessment")).toContainText("Educational follow-up considerations");
  await expect(page.locator(".further-assessment")).toContainText("not a validated referral threshold");
});

test("private research service failure never fabricates a CIG", async ({page})=>{
  await page.route("http://127.0.0.1:8765/research-cif",route=>
    route.fulfill({status:503,contentType:"application/json",body:'{"error":"offline"}'}));
  await navigateToFictionalAssessment(page);
  await expect(page.locator(".research-cig-empty")).toContainText("Research graph unavailable");
  await expect(page.locator(".research-cif-curve")).toHaveCount(0);
  await expect(page.locator(".cif-panel")).toHaveCount(0);
});
