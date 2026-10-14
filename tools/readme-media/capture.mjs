// Records the animated GIFs of the README and the landing page from the demo build.
//
//   cd tools/readme-media && npm install && npx playwright install chromium   (once)
//   npm run media                    -> ../../docs/media/{compare,cards,submit}.gif + compare.png
//   DUMP=dir npm run media           also saves every frame as PNG into dir (to look at them)
//   npm run media -- --og            -> also site/assets/og-image.png
//
// It builds the demo (VITE_DEMO=true, VITE_BASE=/) into .build/, serves it on 127.0.0.1 and drives it with
// Playwright's Chromium. Nothing leaves the machine; the demo has invented data only. "Today" is fixed to
// 2026-03-18 so the dates in the pictures do not move. Frames are encoded to GIF in pure JS (gifenc + pngjs).
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { encodeGif } from "./lib/gif.mjs";
import { SIZE, createPage } from "./lib/recorder.mjs";
import { serve } from "./lib/serve.mjs";
import { cards, compare, submit } from "./scenes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const build = resolve(here, ".build");
const out = resolve(repo, "docs/media");
const PORT = 4731;

if (process.env.SKIP_BUILD !== "1") {
  rmSync(build, { recursive: true, force: true });
  execFileSync("npx", ["vite", "build", "--outDir", build, "--emptyOutDir"], {
    cwd: resolve(repo, "react-app"),
    stdio: "inherit",
    env: { ...process.env, VITE_DEMO: "true", VITE_BASE: "/" },
  });
}

mkdirSync(out, { recursive: true });
const server = await serve(build, PORT);
const browser = await chromium.launch();
try {
  for (const [name, scene] of [["compare", compare], ["cards", cards], ["submit", submit]]) {
    const { context, page } = await createPage(browser, `http://127.0.0.1:${PORT}/`);
    const rec = await scene(page);
    const gif = encodeGif(rec.frames, SIZE);
    writeFileSync(resolve(out, `${name}.gif`), gif);
    if (name === "compare") writeFileSync(resolve(out, "compare.png"), rec.frames.at(-1).png);
    if (process.env.DUMP) {
      mkdirSync(process.env.DUMP, { recursive: true });
      rec.frames.forEach((f, i) => writeFileSync(resolve(process.env.DUMP, `${name}-${String(i).padStart(2, "0")}.png`), f.png));
    }
    console.log(`${name}.gif  ${rec.frames.length} frames  ${(gif.length / 1024).toFixed(0)} KB`);
    await context.close();
  }
  if (process.argv.includes("--og")) {
    const { renderOg } = await import("./og.mjs");
    await renderOg(browser, resolve(repo, "site"));
  }
} finally {
  await browser.close();
  server.close();
}
