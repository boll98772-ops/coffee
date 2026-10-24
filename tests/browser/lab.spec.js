import { test, expect } from '@playwright/test';

async function setRange(page,id,value){await page.locator(`#${id}`).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input'));},String(value));}

test('real WebGL volume, numerical injection, pause/resume, views, reset and grid changes',async({page})=>{
  await page.setViewportSize({width:1440,height:1100});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto('/');await page.waitForFunction(()=>window.__fluidLab?.time>.05);
  await expect(page.locator('#scene-error')).toBeHidden();
  await expect(page.locator('#viewport canvas')).toBeVisible();
  expect(await page.evaluate(()=>window.__fluidLab.milk)).toBe(0);
  await page.locator('#swirl-preset').click();
  await expect(page.locator('#tilt')).toHaveValue('45');
  await setRange(page,'duration',1);
  await page.locator('#pour').click();
  await page.waitForFunction(()=>window.__fluidLab?.milk>.004);
  await page.locator('#pause').click();await expect(page.locator('#status-text')).toHaveText('模拟已暂停');
  // An already executing worker step may finish once after a pause.
  await page.waitForTimeout(500);const paused=await page.evaluate(()=>window.__fluidLab.time);
  await page.waitForTimeout(300);expect(await page.evaluate(()=>window.__fluidLab.time)).toBe(paused);
  const injected=await page.evaluate(()=>window.__fluidLab);expect(injected.speed).toBeGreaterThan(.05);expect(injected.milk).toBeGreaterThan(0);expect(injected.divergence).toBeLessThan(.1);
  await page.locator('#vectors').check();await page.locator('#side-view').click();
  await page.screenshot({path:'/tmp/coffee-paused.png',fullPage:true});
  await page.locator('#pause').click();await page.waitForFunction(()=>window.__fluidLab?.remaining===0&&window.__fluidLab?.milk>.008);
  const done=await page.evaluate(()=>window.__fluidLab.time);await page.waitForFunction(t=>window.__fluidLab.time>t+.15,done);
  await page.locator('#home-view').click();
  await page.locator('#reset').click();await page.waitForFunction(()=>window.__fluidLab?.milk===0&&window.__fluidLab?.speed===0);
  await page.locator('#resolution').selectOption('20');await page.waitForFunction(()=>window.__fluidLab?.n===20);
  await page.locator('#resolution').selectOption('16');await page.waitForFunction(()=>window.__fluidLab?.n===16);
  await page.locator('#model-link').click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('浓度不严格守恒');await page.locator('#understood').click();
  expect(errors).toEqual([]);
});

test('mobile layout has no horizontal overflow and controls remain usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.waitForFunction(()=>window.__fluidLab?.time>.01);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#central-preset').click();await expect(page.locator('#tilt')).toHaveValue('0');
  await setRange(page,'speed',.8);await expect(page.locator('#speed-value')).toHaveText('0.8 ×');
  await page.locator('#position-pad').click({position:{x:80,y:55}});
  expect(Number(await page.locator('#x').inputValue())).not.toBe(0);
  await page.locator('#about').click();await expect(page.getByRole('dialog')).toBeVisible();await page.locator('#close-dialog').click();
  await page.screenshot({path:'/tmp/coffee-mobile.png',fullPage:true});
});
