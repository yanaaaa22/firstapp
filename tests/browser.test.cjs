const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { chromium } = require("playwright");
const KEY = "wonder-village-v2",
  url = process.env.GAME_URL || "http://127.0.0.1:4173";
let browser, server;
before(async () => {
  if (!process.env.GAME_URL) {
    server = spawn(
      "python3",
      ["-m", "http.server", "4173", "--bind", "127.0.0.1"],
      { stdio: "ignore" },
    );
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try {
        ready = (await fetch(url)).ok;
        if (ready) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, "Test server ready");
  }
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
});
after(async () => {
  await browser?.close();
  server?.kill();
});
const state = (p) =>
  p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
async function create(p, kind) {
  await p.locator('[data-nav="collection"]').first().click();
  await p.locator(`[data-kind="${kind}"] [data-recipe]`).click();
  assert.equal(await p.locator(".ingredient.selected").count(), 3);
  await p.locator("#brew").click();
  await p.waitForFunction(
    () =>
      document.getElementById("modal-title").textContent ===
      "В деревне новое чудо!",
  );
  assert.ok((await state(p)).residents.some((m) => m.kind === kind));
  await p.locator("#return-village").click();
}
async function newPage(options = {}) {
  const p = await browser.newPage(options);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.gameErrors = errors;
  await p.goto(url);
  return p;
}
test("All 20 exact recipes create the intended species through the interface", async () => {
  const p = await newPage();
  try {
    await p.locator('[data-nav="collection"]').first().click();
    assert.equal(await p.locator(".species-card").count(), 20);
    const kinds = await p
      .locator(".species-card")
      .evaluateAll((cards) => cards.map((c) => c.dataset.kind));
    await p.locator("#close-modal").click();
    for (const kind of kinds) await create(p, kind);
    const s = await state(p);
    assert.equal(new Set(s.residents.map((m) => m.kind)).size, 20);
    assert.equal(s.residents.length, 21);
    assert.equal(s.stats.crafted, 20);
    assert.ok(Object.values(s.inventory).every((n) => n >= 0));
    assert.equal(await p.locator("#collection-count").textContent(), "20/20");
    await p.reload();
    assert.equal(await p.locator(".world-resident").count(), 21);
    assert.deepEqual(p.gameErrors, []);
  } finally {
    await p.close();
  }
});
test("Wardrobe, movement, gathering, friendship, love and marriage survive reload", async () => {
  const p = await newPage();
  try {
    await create(p, "dragon");
    await p.locator('[data-nav="wardrobe"]').first().click();
    await p.locator("#monster-name").fill("Луна & Пых");
    await p.locator('[data-hat="crown"]').click();
    assert.equal(await p.locator("#monster-name").inputValue(), "Луна & Пых");
    await p.locator('[data-outfit="cape"]').click();
    await p.locator('[data-color="#ed97b8"]').click();
    await p.locator("#save-outfit").click();
    let s = await state(p),
      m = s.residents.find((m) => m.id === s.selected);
    assert.equal(m.name, "Луна & Пых");
    assert.equal(m.hat, "crown");
    assert.equal(m.outfit, "cape");
    assert.equal(m.color, "#ed97b8");
    await p.locator('[data-action="gather"]').click();
    await p.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).stats.gathered === 3,
      KEY,
    );
    s = await state(p);
    assert.equal(s.flowers, 15);
    assert.equal(s.residents.find((o) => o.id === s.selected).gathered, 3);
    assert.ok(await p.locator('[data-action="gift"]').isDisabled());
    await p.locator('[data-action="chat"]').click();
    await p.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).stats.chats === 1,
      KEY,
    );
    for (let i = 1; i <= 3; i++) {
      await p.locator('[data-action="gift"]').click();
      await p.waitForFunction(
        ({ k, n }) =>
          Object.values(JSON.parse(localStorage.getItem(k)).relationships).some(
            (r) => r.hearts === n,
          ),
        { k: KEY, n: i },
      );
    }
    await p.locator('[data-action="marry"]').click();
    assert.ok(await p.locator(".wedding-couple").isVisible());
    await p.locator("[data-confirm-wedding]").click();
    s = await state(p);
    assert.equal(s.flowers, 12);
    assert.equal(s.stats.weddings, 1);
    assert.equal(Object.values(s.relationships)[0].married, true);
    assert.ok(await p.locator('[data-action="marry"]').isDisabled());
    await p.locator('[data-nav="passport"]').first().click();
    assert.match(await p.locator(".passport-details").textContent(), /Плюшик/);
    await p.locator("#close-modal").click();
    await p.reload();
    s = await state(p);
    assert.equal(s.stats.weddings, 1);
    assert.ok(Object.values(s.relationships)[0].married);
    await p.locator('[data-action="dance"]').click();
    assert.ok(
      await p
        .locator(".world-resident.selected")
        .evaluate((e) => e.classList.contains("dancing")),
    );
    await p.locator('[data-action="hello"]').click();
    assert.ok(
      (
        await p
          .locator(".world-resident.selected .resident-speech")
          .textContent()
      ).length > 0,
    );
    assert.deepEqual(p.gameErrors, []);
  } finally {
    await p.close();
  }
});
test("Ingredient pickup, refill, toggling and disabled incomplete recipe behave correctly", async () => {
  const p = await newPage();
  try {
    const pickup = p.locator("[data-pickup]").first(),
      id = await pickup.getAttribute("data-item");
    await pickup.click();
    assert.equal((await state(p)).inventory[id], 7);
    await p.locator(".new-monster").click();
    assert.ok(await p.locator("#brew").isDisabled());
    await p.locator('[data-ingredient="moonleaf"]').click();
    await p.locator('[data-ingredient="moonleaf"]').click();
    assert.equal(await p.locator(".ingredient.selected").count(), 0);
    for (const id of ["moonleaf", "star", "ember"])
      await p.locator(`[data-ingredient="${id}"]`).click();
    await p.locator('[data-ingredient="shell"]').click();
    assert.equal(await p.locator(".ingredient.selected").count(), 3);
    await p.locator("#refill").click();
    assert.equal((await state(p)).flowers, 9);
    await p.locator('[data-slot="0"]').click();
    assert.ok(await p.locator("#brew").isDisabled());
    await p.keyboard.press("Escape");
    assert.equal(await p.locator("#modal").evaluate((d) => d.open), false);
    assert.deepEqual(p.gameErrors, []);
  } finally {
    await p.close();
  }
});
test("Phone and tablet layouts have no horizontal page overflow and dialogs remain usable", async () => {
  const p = await newPage();
  try {
    for (const width of [320, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "Overflow at " + width,
      );
      await p.locator('[data-nav="collection"]').first().click();
      assert.equal(await p.locator(".species-card").count(), 20);
      assert.ok(
        await p.evaluate(
          () =>
            document.getElementById("modal").scrollWidth <=
            document.getElementById("modal").clientWidth + 1,
        ),
        "Dialog overflow at " + width,
      );
      await p.locator("#close-modal").click();
    }
    assert.equal(await p.locator(".steps").count(), 0);
    assert.deepEqual(p.gameErrors, []);
  } finally {
    await p.close();
  }
});
test("Legacy single monster migrates, corrupted save recovers, blocked storage stays playable", async () => {
  const p = await browser.newPage();
  try {
    await p.addInitScript(() =>
      localStorage.setItem(
        "wonder-monster",
        JSON.stringify({
          kind: "cosmic",
          name: "Старый друг",
          hat: "flower",
          outfit: "none",
          color: "#b4a1d5",
        }),
      ),
    );
    await p.goto(url);
    assert.equal((await state(p)).residents[0].name, "Старый друг");
    assert.equal((await state(p)).residents[0].kind, "cosmic");
    await p.evaluate((k) => localStorage.setItem(k, "broken JSON"), KEY);
    await p.reload();
    assert.equal((await state(p)).residents.length, 1);
  } finally {
    await p.close();
  }
  const blocked = await browser.newPage();
  try {
    await blocked.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("Blocked", "SecurityError");
      };
    });
    await blocked.goto(url);
    assert.ok(await blocked.locator(".world-resident").isVisible());
    await blocked.locator(".new-monster").click();
    assert.equal(await blocked.locator(".ingredient").count(), 20);
  } finally {
    await blocked.close();
  }
});
