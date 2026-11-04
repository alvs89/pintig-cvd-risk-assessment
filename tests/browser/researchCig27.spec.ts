import { test,expect } from '@playwright/test';
import { completePreAssessment } from './preAssessmentHelpers';
for(const width of [1440,820,390])test(`incompatible questionnaires explain blocked CIG without fetching at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});let requests=0;
 await page.route('**/research-cig-27',route=>{requests++;return route.abort();});
 await page.goto('/');await page.locator('[data-act="workerDemo"]').click();await page.locator('#loginForm button[type="submit"]').click();
 await page.locator('[data-act="nav:New Risk Assessment"]').first().click();await page.locator('#pid').selectOption('1');await completePreAssessment(page);
 await page.getByLabel('Go to section',{exact:true}).selectOption({label:'Review and save'});
 await page.getByRole('button',{name:'Calculate Risk',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Assessment Result',exact:true})).toBeVisible();
 const cig=page.locator('.research-cig');await expect(cig).toContainText('SES cannot be matched');await expect(cig).toContainText('Diet scoring differs');
 await expect(cig).toContainText('Research use only');await expect(cig.locator('svg')).toHaveCount(0);
 await expect(cig.getByRole('button',{name:'Refresh research CIG'})).toBeDisabled();expect(requests).toBe(0);
 await expect(page.getByRole('heading',{name:'Factors associated with this estimate'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
