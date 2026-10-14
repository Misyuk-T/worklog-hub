// The three scenes. They only use the demo's invented data and click what a visitor would click.
import { Recorder } from "./lib/recorder.mjs";

const btn = (page, name) => page.getByRole("button", { name, exact: true });

/** Compare Jira and Redmine day by day: Redmine is an hour short on the 12th and empty after the 13th. */
export async function compare(page) {
  const r = new Recorder(page, 1);
  await r.hold(900);
  await r.click(btn(page, "Compare"), { hold: 500 });
  await r.scrollTo(340);
  await r.hold(500);
  // Jira against Redmine: take ClickUp out of the left side.
  await r.click(page.getByRole("checkbox", { name: "ClickUp" }).first(), { hold: 500 });
  await r.click(page.locator("button", { hasText: /^Compare$/ }).last(), { settle: 700, hold: 1500 });
  const panel = page.locator("h2", { hasText: "Compare Worklogs" }).locator("xpath=..");
  const differ = page.getByText("Hours differ").first();
  await r.scrollInside(panel, page.locator("h3", { hasText: "13-03-2026" }), 40, 6);
  await r.hold(1500);
  await r.scrollInside(panel, differ.locator("xpath=ancestor::table/preceding-sibling::h3[1]"), 20, 6);
  await r.hold(2600);
  return r;
}

/** Generate cards from Jira for three days, then edit the hours of one card and watch the totals follow. */
export async function cards(page) {
  const r = new Recorder(page, 2);
  await r.hold(900);
  await r.click(btn(page, "Generate"), { settle: 700, hold: 700 });
  const dialog = page.getByRole("dialog");
  await r.click(dialog.getByRole("gridcell", { name: "11", exact: true }), { settle: 250, hold: 350, steps: 3 });
  await r.click(dialog.getByRole("gridcell", { name: "13", exact: true }), { settle: 250, hold: 700, steps: 2 });
  await r.click(dialog.getByRole("button", { name: "Export worklogs" }), { settle: 800, hold: 900 });
  await r.scrollTo(690, 4);
  await r.hold(400);
  await r.click(page.getByRole("tab", { name: "11-03" }), { hold: 1000 });
  const hours = page.getByRole("spinbutton").first();
  const { x, y } = await r.center(hours);
  await r.glide(x, y);
  await hours.click();
  await hours.press("ControlOrMeta+a");
  await hours.type("4", { delay: 0 });
  await r.wait(250);
  await r.hold(700);
  await hours.press("Tab");
  await r.wait(400);
  await r.hold(600);
  // Save sits at the bottom of the card.
  await r.scrollTo(890, 3);
  await r.hold(500);
  await r.click(page.getByRole("button", { name: "Save", exact: true }).first(), { settle: 400, hold: 500 });
  await r.scrollTo(690, 3);
  await r.hold(1500);
  await r.click(page.getByRole("tab", { name: "Total" }), { hold: 2200 });
  return r;
}

/** Submit the cards to Redmine. The demo says how many worklogs it would save and sends nothing. */
export async function submit(page) {
  const r = new Recorder(page, 3);
  await page.evaluate(() => window.scrollTo(0, 700));
  await r.wait(300);
  await r.hold(1100);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await r.wait(300);
  await r.hold(700);
  await r.click(btn(page, "Submit cards to Redmine"), { hold: 1500 });
  await r.click(btn(page, "Confirm"), { settle: 900, hold: 3200 });
  return r;
}
