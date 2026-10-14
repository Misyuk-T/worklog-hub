// Draws the social preview (1400x560) and the two small icons of the landing page into site/assets/.
// Black and white, Silkscreen lettering, the pixel logo. Called by `npm run media -- --og`.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export async function renderOg(browser, siteDir) {
  const assets = resolve(siteDir, "assets");
  const fontUrl = (f) => `data:font/woff2;base64,${readFileSync(resolve(assets, "fonts", f)).toString("base64")}`;
  const logo = readFileSync(resolve(assets, "logo.svg"), "utf8").replace(/<style>.*?<\/style>/, "<style>path{fill:#fff}</style>");
  const logoUri = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;

  const page = await browser.newPage({ viewport: { width: 1400, height: 560 } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:S;font-weight:700;src:url("${fontUrl("silkscreen-latin-700-normal.woff2")}")}
@font-face{font-family:M;font-weight:100 800;src:url("${fontUrl("jetbrains-mono-latin-wght-normal.woff2")}")}
*{box-sizing:border-box;margin:0}
html,body{width:1400px;height:560px;background:#000;color:#fff;overflow:hidden}
.frame{position:absolute;inset:28px;border:2px solid #3a3a3a;padding:56px 64px}
.logo{position:absolute;right:64px;top:56px;width:192px;height:192px;image-rendering:pixelated}
h1{font:700 84px/1 S,monospace;text-transform:uppercase;margin-top:44px}
p.t{font:700 34px/1.3 S,monospace;text-transform:uppercase;margin-top:36px}
p.l{font:400 26px/1.5 M,monospace;color:#a6a6a6;margin-top:30px}
.bar{position:absolute;left:64px;bottom:56px;width:64px;height:4px;background:#fff}
</style><div class="frame"><img class="logo" src="${logoUri}" alt="">
<h1>Worklog Hub</h1><p class="t">Log hours once.<br>Move them between trackers.</p>
<p class="l">Redmine &middot; Jira &middot; ClickUp</p><div class="bar"></div></div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  writeFileSync(resolve(assets, "og-image.png"), await page.screenshot({ type: "png" }));
  await page.close();

  for (const size of [32, 128]) {
    const p = await browser.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<style>html,body{margin:0;background:#000}img{display:block;width:${size}px;height:${size}px;image-rendering:pixelated}</style><img src="${logoUri}" alt="">`);
    writeFileSync(resolve(assets, `icon-${size}.png`), await p.screenshot({ type: "png" }));
    await p.close();
  }
}
