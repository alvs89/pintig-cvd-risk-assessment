import { test, expect } from "@playwright/test";

test.skip(!process.env.PINTIG_LIVE_RSF, "Requires private, local R research server. Run with PINTIG_LIVE_RSF=1.");

test("actual 500-tree questionnaire-compatible RSF returns different CIFs for two fictional patient assessments", async ({page})=>{
  const output: number[]=[];
  const formPayloads: any[]=[];
  page.on("request", request=>{
    if(request.url().startsWith("http://127.0.0.1:8765/research-cif"))
      formPayloads.push(request.postDataJSON());
  });
  for(const id of ["1","2"]){
    await page.goto("/");
    await page.locator('[data-act="workerDemo"]').click();
    await page.locator('button[type="submit"]').click();
    await page.locator('.sidebar [data-act="nav:New Risk Assessment"]').click();
    await page.locator("#pid").selectOption(id);
    await page.getByRole("button",{name:"Prefill questionnaire",exact:true}).click();
    await page.locator('#assessmentForm button[type="submit"]').click();
    const panel=page.locator(".research-cig");
    await expect(panel.locator(".research-cif-curve")).toBeVisible({timeout:60000});
    const riskText=await page.getByTestId("research-cig-risk").innerText();
    const risk=Number(riskText.replace("%",""));
    expect(Number.isFinite(risk)).toBeTruthy();
    expect(risk).toBeGreaterThanOrEqual(0);
    expect(risk).toBeLessThanOrEqual(100);
    output.push(risk);
    await panel.getByText("View original model-derived annual probabilities").click();
    await expect(panel.locator("tbody tr")).toHaveCount(10);
    await expect(panel.locator(".research-cig-inspection")).toContainText(risk.toFixed(2)+"%");
    await expect(page.locator(".cif-empty")).toBeVisible();
  }
  expect(formPayloads.length).toBe(2);
  expect(formPayloads[0].predictors.sbp_mmhg).toBe(156);
  expect(formPayloads[1].predictors.sbp_mmhg).toBe(138);
  expect(formPayloads[0].predictors.sex_male).toBe(1);
  expect(formPayloads[1].predictors.sex_male).toBe(0);
  expect(output[0]).not.toBe(output[1]);
  console.log("TRUE PRIVATE FOREST RESULT: patient 1 fictional vector:",output[0]+"%");
  console.log("TRUE PRIVATE FOREST RESULT: patient 2 fictional vector:",output[1]+"%");
});
