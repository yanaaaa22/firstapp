const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const ctx = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync("data.js", "utf8"), ctx);
ctx.MonsterData = ctx.window.MonsterData;
vm.runInContext(fs.readFileSync("monster-art.js", "utf8"), ctx);
const { species, ingredients, hats, outfits } = ctx.MonsterData;
const art = ctx.window.MonsterArt.render;
test("20 species have unique, attainable recipes of 3 distinct ingredients", () => {
  assert.equal(species.length, 20);
  assert.equal(ingredients.length, 20);
  assert.equal(new Set(species.map((s) => s.id)).size, 20);
  const recipes = new Set(),
    usage = {};
  for (const s of species) {
    assert.equal(s.recipe.length, 3);
    assert.equal(new Set(s.recipe).size, 3);
    for (const id of s.recipe) {
      assert.ok(ingredients.some((i) => i.id === id));
      usage[id] = (usage[id] || 0) + 1;
    }
    recipes.add([...s.recipe].sort().join(","));
  }
  assert.equal(recipes.size, 20);
  assert.ok(
    Object.values(usage).every((n) => n <= 6),
    "Initial stock covers every exact recipe once",
  );
});
test("20 different body drawings, including a cyclops and three-eyed species", () => {
  const drawings = species.map((s) => art({ kind: s.id }));
  assert.equal(
    new Set(drawings.map((svg) => svg.replace(/monster\d+/g, "ID"))).size,
    20,
  );
  assert.equal(
    (art({ kind: "cyclops" }).match(/class="monster-eye"/g) || []).length,
    1,
  );
  assert.equal(
    (art({ kind: "jelly" }).match(/class="monster-eye"/g) || []).length,
    3,
  );
  assert.equal(
    (art({ kind: "bunny" }).match(/class="monster-eye"/g) || []).length,
    3,
  );
});
test("Every species supports every accessory and emotion without broken output", () => {
  for (const s of species)
    for (const [hat] of hats)
      for (const [outfit] of outfits)
        for (const mood of ["happy", "love", "sleepy", "surprised"]) {
          const svg = art({ kind: s.id, hat, outfit }, { mood });
          assert.ok(svg.startsWith("<svg"));
          assert.ok(!svg.includes("undefined"));
          assert.ok(!svg.includes("NaN"));
        }
});
