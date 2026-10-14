// Frame recorder: every frame is a real screenshot of the demo, taken after a fixed wait,
// so the same build gives the same GIF. A small cursor is drawn into the page, because
// headless screenshots do not include the system cursor.

export const SIZE = { width: 880, height: 600 };

// Fixed "today" for the demo's relative dates (the demo builds its days from `new Date()`).
export const FIXED_NOW = new Date("2026-03-18T10:00:00Z");

const CURSOR_CSS = `
/* CSS transitions and animations would be caught half way by a screenshot; JS animations (modals) settle in the waits. */
*, *::before, *::after { caret-color: transparent !important; transition: none !important; animation: none !important; }
#rm-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; z-index: 2147483647;
  pointer-events: none; transform: translate(-100px, -100px); }
#rm-cursor svg { display: block; width: 22px; height: 22px; }
#rm-ring { position: fixed; left: 0; top: 0; width: 34px; height: 34px; margin: -17px 0 0 -17px;
  border: 3px solid #000; box-shadow: 0 0 0 2px #fff; border-radius: 50%; z-index: 2147483646;
  pointer-events: none; display: none; }
`;
const CURSOR_SVG =
  '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#fff" d="M1 0h2v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1H9v1h3v1h-1v2H9v-1H8v-1H7v-1H6v-1H5v1H4v1H3v1H1z"/><path fill="#000" d="M2 2v11h1v-1h1v-1h1v-1h1v1h1v1h1v1h1v-1H8v-1H7V9h4V8H10V7H9V6H8V5H7V4H6V3H5V2H4V1H3v1z"/></svg>';

export async function createPage(browser, url) {
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    locale: "en-US",
    timezoneId: "UTC",
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_NOW);
  // Chakra picks the avatar colour with Math.random(): seed it so every run draws the same one.
  await page.addInitScript(() => {
    let a = 0x2f6e2b1;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: CURSOR_CSS });
  await page.evaluate((svg) => {
    const c = document.createElement("div");
    c.id = "rm-cursor";
    c.innerHTML = svg;
    const r = document.createElement("div");
    r.id = "rm-ring";
    document.body.append(c, r);
    window.addEventListener("mousemove", (e) => {
      c.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      r.style.left = e.clientX + "px";
      r.style.top = e.clientY + "px";
    });
  }, CURSOR_SVG);
  await page.waitForTimeout(600);
  return { context, page };
}

export class Recorder {
  constructor(page, seg = 0) {
    this.page = page;
    this.seg = seg;
    this.frames = [];
    this.pos = { x: 760, y: 560 };
    this.last = null;
  }

  /** Take a frame that stays on screen for `ms`. */
  async hold(ms) {
    const png = await this.page.screenshot({ type: "png" });
    this.frames.push({ png, ms, seg: this.seg });
    this.last = png;
  }

  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  /** Glide the cursor to (x, y) in a few frames. */
  async glide(x, y, steps = 3, stepMs = 70) {
    const from = this.pos;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t * t * (3 - 2 * t);
      await this.page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await this.hold(stepMs);
    }
    this.pos = { x, y };
  }

  async center(locator) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  }

  /** Move to the element, press with a ring around the cursor, release. */
  async click(locator, { settle = 450, hold = 600, steps = 3 } = {}) {
    const { x, y } = await this.center(locator);
    await this.glide(x, y, steps);
    await this.page.evaluate(() => (document.getElementById("rm-ring").style.display = "block"));
    await this.page.mouse.down();
    await this.hold(90);
    await this.page.mouse.up();
    await this.page.evaluate(() => (document.getElementById("rm-ring").style.display = "none"));
    await this.wait(settle);
    await this.hold(hold);
  }

  /** Scroll the window to `y` in eased steps. */
  async scrollTo(y, steps = 5, stepMs = 60) {
    const from = await this.page.evaluate(() => window.scrollY);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t * t * (3 - 2 * t);
      await this.page.evaluate((v) => window.scrollTo(0, v), Math.round(from + (y - from) * e));
      await this.hold(stepMs);
    }
  }

  /** Scroll an inner scrollable container so `target` sits `offset` px below its top. */
  async scrollInside(container, target, offset = 70, steps = 6, stepMs = 70) {
    const handle = await container.elementHandle();
    const goal = await target.evaluate(
      (el, [c, off]) =>
        el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - off,
      [handle, offset],
    );
    const from = await handle.evaluate((c) => c.scrollTop);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t * t * (3 - 2 * t);
      await handle.evaluate((c, v) => (c.scrollTop = v), Math.round(from + (goal - from) * e));
      await this.hold(stepMs);
    }
  }
}
