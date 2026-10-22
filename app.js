(() => {
  "use strict";
  const { ingredients, species, hats, outfits } = MonsterData,
    art = MonsterArt.render,
    $ = (id) => document.getElementById(id),
    KEY = "wonder-village-v2";
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
    choose = (a) => a[Math.floor(Math.random() * a.length)],
    byKind = (id) => species.find((s) => s.id === id) || species[0],
    byId = (id) => state.residents.find((m) => m.id === id),
    item = (id) => ingredients.find((i) => i.id === id);
  const finite = (v, fallback) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function freeSpot(residents) {
    if (!residents.length) return { x: 40, y: 78 };
    const candidates = [59, 70, 81, 90].flatMap((y) =>
      [13, 26, 39, 52, 65, 77].map((x) => ({ x, y })),
    );
    const distance = (p) =>
      Math.min(
        ...residents.map((m) => Math.hypot((m.x - p.x) * 1.6, m.y - p.y)),
      ) +
      Math.random() * 0.2;
    return candidates.sort((a, b) => distance(b) - distance(a))[0];
  }
  function makeResident(s, name, neighbors = []) {
    const spot = freeSpot(neighbors);
    return {
      id: uid(),
      kind: s.id,
      name: name || s.name,
      color: s.color,
      hat: "none",
      outfit: "none",
      x: spot.x,
      y: spot.y,
      born: new Date().toISOString(),
      gathered: 0,
    };
  }
  function validateResident(v) {
    if (
      !v ||
      typeof v.id !== "string" ||
      !/^[\w-]{1,80}$/.test(v.id) ||
      !species.some((s) => s.id === v.kind)
    )
      return null;
    const s = byKind(v.kind);
    return {
      id: v.id,
      kind: s.id,
      name:
        typeof v.name === "string" && v.name.trim()
          ? v.name.trim().slice(0, 24)
          : s.name,
      color: /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : s.color,
      hat: hats.some((h) => h[0] === v.hat) ? v.hat : "none",
      outfit: outfits.some((h) => h[0] === v.outfit) ? v.outfit : "none",
      x: clamp(finite(v.x, 40), 10, 79),
      y: clamp(finite(v.y, 75), 56, 91),
      born:
        typeof v.born === "string" && Number.isFinite(Date.parse(v.born))
          ? v.born
          : new Date().toISOString(),
      gathered: clamp(finite(v.gathered, 0), 0, 99999),
    };
  }
  function initialState() {
    let starter = makeResident(species[0]);
    try {
      const old = JSON.parse(localStorage.getItem("wonder-monster"));
      if (old && typeof old.name === "string") {
        const kind = {
          forest: "sprout",
          cosmic: "cosmic",
          fire: "flame",
          mixed: "cyclops",
        }[old.kind];
        if (kind)
          starter =
            validateResident({ ...starter, ...old, id: starter.id, kind }) ||
            starter;
      }
    } catch {}
    return {
      version: 2,
      residents: [starter],
      selected: starter.id,
      flowers: 12,
      inventory: Object.fromEntries(ingredients.map((i) => [i.id, 6])),
      relationships: {},
      stats: { gathered: 0, chats: 0, crafted: 0, weddings: 0 },
    };
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw?.version === 2 && Array.isArray(raw.residents)) {
        const seen = new Set(),
          residents = raw.residents
            .slice(0, 30)
            .map(validateResident)
            .filter((m) => m && !seen.has(m.id) && seen.add(m.id));
        if (residents.length) {
          const inventory = Object.fromEntries(
              ingredients.map((i) => [
                i.id,
                clamp(Math.floor(finite(raw.inventory?.[i.id], 6)), 0, 999),
              ]),
            ),
            relationships = {};
          const ids = new Set(residents.map((m) => m.id)),
            spouses = new Set();
          for (const [key, v] of Object.entries(raw.relationships || {})) {
            const pair = key.split("|");
            if (
              pair.length !== 2 ||
              pair[0] === pair[1] ||
              !pair.every((id) => ids.has(id)) ||
              !v
            )
              continue;
            const married =
              v.married === true && !pair.some((id) => spouses.has(id));
            if (married) pair.forEach((id) => spouses.add(id));
            relationships[pair.sort().join("|")] = {
              friendship: clamp(finite(v.friendship, 0), 0, 99),
              hearts: clamp(finite(v.hearts, 0), 0, 3),
              married,
            };
          }
          return {
            version: 2,
            residents,
            selected: ids.has(raw.selected) ? raw.selected : residents[0].id,
            flowers: clamp(Math.floor(finite(raw.flowers, 12)), 0, 99999),
            inventory,
            relationships,
            stats: Object.fromEntries(
              ["gathered", "chats", "crafted", "weddings"].map((k) => [
                k,
                clamp(finite(raw.stats?.[k], 0), 0, 99999),
              ]),
            ),
          };
        }
      }
    } catch {}
    return initialState();
  }
  let state = load(),
    sound = false,
    dialogMode = "",
    brewSelection = [],
    brewing = false,
    draft = null,
    partnerId = "",
    toastTimer;
  const jobs = new Map(),
    visuals = new Map(),
    speechTimers = new Map(),
    recentlyActive = new Map();
  let audioContext = null;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      $("save-status").textContent = "● Мир сохраняется автоматически";
      $("save-status").classList.remove("storage-warning");
    } catch {
      $("save-status").textContent = "⚠ Сохранение недоступно в этом браузере";
      $("save-status").classList.add("storage-warning");
      toast(
        "Браузер запретил сохранение. Не закрывай вкладку, если хочешь сохранить этот мир.",
      );
    }
  }
  function toast(text) {
    clearTimeout(toastTimer);
    $("toast").textContent = text;
    $("toast").classList.add("show");
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 4300);
  }
  function chime() {
    if (!sound) return;
    try {
      audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume();
      [523.25, 659.25, 783.99].forEach((f, n) => {
        const o = audioContext.createOscillator(),
          g = audioContext.createGain(),
          t = audioContext.currentTime + n * 0.1;
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.045, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g);
        g.connect(audioContext.destination);
        o.start(t);
        o.stop(t + 0.36);
      });
    } catch {}
  }
  const selected = () => byId(state.selected) || state.residents[0];
  function pairKey(a, b) {
    return [a, b].sort().join("|");
  }
  function relationship(a, b) {
    return (
      state.relationships[pairKey(a, b)] || {
        friendship: 0,
        hearts: 0,
        married: false,
      }
    );
  }
  function spouse(m) {
    const match = Object.entries(state.relationships).find(
      ([k, r]) => r.married && k.split("|").includes(m.id),
    );
    return match ? byId(match[0].split("|").find((id) => id !== m.id)) : null;
  }
  function crush(m) {
    const entry = Object.entries(state.relationships)
      .filter(
        ([k, r]) => k.split("|").includes(m.id) && r.hearts > 0 && !r.married,
      )
      .sort((a, b) => b[1].hearts - a[1].hearts)[0];
    return entry
      ? {
          resident: byId(entry[0].split("|").find((id) => id !== m.id)),
          hearts: entry[1].hearts,
        }
      : null;
  }
  function hearts(n) {
    return "♥".repeat(n) + "♡".repeat(3 - n);
  }
  function effect(m, icons, count = 6) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "floating-effect";
      el.textContent = choose(icons);
      el.style.left = m.x + (Math.random() - 0.5) * 12 + "%";
      el.style.top = m.y - 8 + Math.random() * 5 + "%";
      el.style.setProperty("--drift", (Math.random() - 0.5) * 110 + "px");
      el.style.animationDelay = i * 0.07 + "s";
      $("world-effects").append(el);
      setTimeout(() => el.remove(), 3000);
    }
  }
  function say(m, text, voice = true) {
    const node = document.getElementById("resident-" + m.id);
    if (!node) return;
    const otherBubbles = [
      ...document.querySelectorAll(".resident-speech"),
    ].filter((b) => b.parentElement !== node && b.textContent);
    while (otherBubbles.length > 1) {
      const bubble = otherBubbles.shift();
      bubble.textContent = "";
      const owner = byId(bubble.parentElement.dataset.resident);
      if (owner) bubble.parentElement.style.zIndex = Math.round(owner.y);
    }
    node.querySelector(".resident-speech").textContent = text;
    node.style.zIndex = 80;
    clearTimeout(speechTimers.get(m.id));
    speechTimers.set(
      m.id,
      setTimeout(() => {
        node.querySelector(".resident-speech").textContent = "";
        node.style.zIndex = Math.round(m.y);
      }, 6500),
    );
    if (sound && voice && "speechSynthesis" in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ru-RU";
      u.pitch = 1.1 + (species.findIndex((s) => s.id === m.kind) % 4) * 0.13;
      u.rate = 1.08;
      speechSynthesis.speak(u);
    }
  }
  function animate(m, action, mood = "happy", ms = 3000) {
    visuals.set(m.id, { action, mood });
    syncResident(m);
    setTimeout(() => {
      if (visuals.get(m.id)?.action === action) {
        visuals.delete(m.id);
        syncResident(m);
      }
    }, ms);
  }
  function syncResident(m) {
    let el = document.getElementById("resident-" + m.id);
    if (!el) {
      el = document.createElement("button");
      el.id = "resident-" + m.id;
      el.dataset.resident = m.id;
      el.innerHTML =
        '<span class="resident-shadow"></span><span class="sprite-art"></span><span class="resident-name"></span><span class="resident-speech"></span>';
      $("residents-layer").append(el);
    }
    const visual = visuals.get(m.id),
      key = [m.kind, m.color, m.hat, m.outfit, visual?.mood || "happy"].join(
        ":",
      );
    if (el.dataset.visual !== key) {
      el.querySelector(".sprite-art").innerHTML = art(m, {
        mood: visual?.mood,
      });
      el.dataset.visual = key;
    }
    el.className =
      "world-resident" +
      (m.id === state.selected ? " selected" : "") +
      (visual?.action ? " " + visual.action : "");
    el.style.setProperty("--x", m.x + "%");
    el.style.setProperty("--y", m.y + "%");
    el.style.setProperty("--delay", -state.residents.indexOf(m) * 0.43 + "s");
    el.style.setProperty("--depth", Math.round(m.y));
    el.querySelector(".resident-name").textContent = m.name;
    el.setAttribute("aria-label", m.name + ", " + byKind(m.kind).title);
    el.setAttribute("aria-pressed", String(m.id === state.selected));
  }
  function renderCards() {
    const wrap = $("resident-cards");
    wrap.innerHTML =
      state.residents
        .map(
          (m) =>
            `<button class="resident-card ${m.id === state.selected ? "selected" : ""}" data-card="${m.id}" aria-pressed="${m.id === state.selected}"><span class="portrait">${art(m)}</span><span><strong>${escape(m.name)}</strong><small>${byKind(m.kind).title}</small><em>${spouse(m) ? "♥ В браке" : "✦ " + (jobs.has(m.id) ? "Занят делом" : "Живёт свою лучшую жизнь")}</em></span></button>`,
        )
        .join("") +
      '<button class="resident-card add" data-nav="brew"><b>＋</b>Ещё один друг?</button>';
  }
  function renderControls() {
    const m = selected(),
      others = state.residents.filter((o) => o.id !== m.id);
    if (!others.some((o) => o.id === partnerId))
      partnerId = others[0]?.id || "";
    const p = byId(partnerId),
      r = p ? relationship(m.id, p.id) : null;
    const partnerSpouse = p && spouse(p),
      mySpouse = spouse(m);
    $("resident-controls").innerHTML =
      `<div class="control-identity"><h2>${escape(m.name)}</h2><p>${jobs.has(m.id) ? "✦ " + jobs.get(m.id) : "♡ Чем займёмся сегодня?"}</p><button class="text-button" data-nav="passport">Открыть паспорт ↗</button></div><div class="activity-buttons"><button data-action="gather" ${jobs.has(m.id) ? "disabled" : ""}>🌷 Собрать цветы</button><button data-action="dance" ${jobs.has(m.id) ? "disabled" : ""}>♫ Танцевать</button><button data-action="hello">👋 Привет!</button><button data-nav="wardrobe">🎀 Нарядить</button></div><div class="social-controls">${p ? `<div class="social-label">С КЕМ ПОДРУЖИМСЯ?</div><div class="partner-row"><select id="partner" aria-label="Друг для общения">${others.map((o) => `<option value="${o.id}" ${o.id === p.id ? "selected" : ""}>${escape(o.name)}</option>`).join("")}</select><span id="relationship-label">${r.married ? "💍" : hearts(r.hearts)}</span></div><div class="social-actions"><button data-action="chat" ${jobs.has(m.id) || jobs.has(p.id) ? "disabled" : ""}>💬 Общаться</button><button data-action="gift" ${jobs.has(m.id) || jobs.has(p.id) || state.flowers < 1 || r.friendship < 1 || (!!mySpouse && mySpouse.id !== p.id) || (!!partnerSpouse && partnerSpouse.id !== m.id) ? "disabled" : ""} title="Сначала познакомься, затем дари цветы. Три сердечка — и можно устроить свадьбу.">🌸 Цветок</button><button data-action="marry" ${jobs.has(m.id) || jobs.has(p.id) || r.hearts < 3 || r.friendship < 1 || mySpouse || partnerSpouse ? "disabled" : ""}>💍 Свадьба</button></div>` : '<p class="empty-social">💬 Наколдуй ещё одного жителя — вместе они смогут дружить, влюбляться и играть свадьбы.</p>'}</div>`;
  }
  function renderWishes() {
    const s = state.stats;
    $("wishes").innerHTML = [
      [state.residents.length > 1, "Поселить нового друга"],
      [s.gathered > 0, "Собрать букет на поляне"],
      [s.chats > 0, "Поболтать с соседом"],
    ]
      .map(
        ([done, text]) =>
          `<div class="wish ${done ? "done" : ""}"><span class="wish-check">${done ? "✓" : ""}</span>${text}</div>`,
      )
      .join("");
  }
  function renderAll() {
    const kinds = new Set(state.residents.map((m) => m.kind));
    $("flowers-count").textContent = state.flowers;
    $("species-count").textContent = kinds.size;
    $("collection-count").textContent = kinds.size + "/20";
    $("population-count").textContent =
      state.residents.length +
      " " +
      plural(state.residents.length, "житель", "жителя", "жителей");
    $("resident-total").textContent = state.residents.length;
    $("world").classList.toggle("crowded", state.residents.length > 12);
    state.residents.forEach(syncResident);
    renderCards();
    renderControls();
    renderWishes();
  }
  function plural(n, a, b, c) {
    const t = n % 100;
    return t >= 11 && t <= 14
      ? c
      : n % 10 === 1
        ? a
        : n % 10 >= 2 && n % 10 <= 4
          ? b
          : c;
  }
  function selectResident(id) {
    const m = byId(id);
    if (!m) return;
    state.selected = id;
    recentlyActive.set(id, Date.now());
    renderAll();
    save();
  }
  async function walk(m, x, y) {
    const node = document.getElementById("resident-" + m.id),
      distance = Math.hypot(m.x - x, m.y - y),
      duration = clamp(distance * 48, 650, 2600);
    node.style.setProperty("--travel", duration + "ms");
    m.x = clamp(x, 10, 79);
    m.y = clamp(y, 56, 91);
    visuals.set(m.id, { action: "moving" });
    syncResident(m);
    await new Promise((r) => setTimeout(r, duration));
    visuals.delete(m.id);
    syncResident(m);
  }
  async function gather() {
    const m = selected();
    if (jobs.has(m.id)) return;
    recentlyActive.set(m.id, Date.now());
    jobs.set(m.id, "Собирает цветочки");
    renderControls();
    await walk(m, 76, 84);
    animate(m, "excited", "happy", 1600);
    effect(m, ["🌸", "🌼", "✦"], 7);
    state.flowers += 3;
    m.gathered += 3;
    state.stats.gathered += 3;
    const found = choose(ingredients);
    state.inventory[found.id] = Math.min(999, state.inventory[found.id] + 1);
    jobs.delete(m.id);
    say(
      m,
      choose([
        "Вот букет! Один цветочек улыбнулся мне первым.",
        "Три цветочка для самых любимых друзей!",
        "Пахнет летом и маленьким волшебством.",
      ]),
    );
    toast("+3 цветочка и " + found.icon + " " + found.name + " в корзину");
    chime();
    renderAll();
    save();
  }
  async function socialize(action) {
    const m = selected(),
      p = byId(partnerId);
    if (!p || jobs.has(m.id) || jobs.has(p.id)) return;
    const r = relationship(m.id, p.id),
      ms = spouse(m),
      ps = spouse(p);
    if (
      action !== "chat" &&
      ((ms && ms.id !== p.id) || (ps && ps.id !== m.id))
    ) {
      toast("Эти чудики уже выбрали свою пару. Они всё ещё могут дружить!");
      return;
    }
    if (action === "gift" && (state.flowers < 1 || r.friendship < 1)) {
      toast(
        r.friendship < 1
          ? "Сначала поболтайте и познакомьтесь!"
          : "Нужен цветочек: собери букет на поляне.",
      );
      return;
    }
    if (action === "marry" && (r.hearts < 3 || r.friendship < 1 || ms || ps))
      return;
    if (action === "marry") {
      openDialog("wedding", `${m.name} + ${p.name}`, "САМЫЙ ВОЛШЕБНЫЙ ДЕНЬ");
      $("modal-body").innerHTML =
        `<div class="wedding-couple">${art({ ...m, hat: "flower" }, { mood: "love" })}<span>♥</span>${art({ ...p, hat: "crown" }, { mood: "love" })}</div><p class="modal-description">Эти двое нашли друг друга! Устроим праздник для всей деревни? После церемонии они станут семьёй — это появится в обоих паспортах.</p><button class="primary" data-confirm-wedding="${p.id}" data-wedding-from="${m.id}">💍 Сыграть свадьбу</button>`;
      return;
    }
    if (action === "gift") {
      state.flowers--;
      renderAll();
      save();
    }
    jobs.set(m.id, action === "chat" ? "Болтает с другом" : "Дарит цветок");
    jobs.set(p.id, "Встречается с другом");
    renderControls();
    await walk(m, clamp(p.x - 11, 10, 70), p.y);
    state.relationships[pairKey(m.id, p.id)] = r;
    if (action === "chat") {
      r.friendship = Math.min(99, r.friendship + 1);
      state.stats.chats++;
      say(
        m,
        choose([
          "А если облака — это чьи-то пушистые монстрики?",
          "Пойдём как-нибудь считать светлячков?",
          "С тобой даже обычный день — немножко праздник!",
        ]),
      );
      setTimeout(
        () =>
          say(
            p,
            choose([
              "Я за! С тобой мне очень весело.",
              "Ура, у меня новый друг!",
              "Давай! Я как раз искал компанию.",
            ]),
            false,
          ),
        1800,
      );
      effect(m, ["💬", "✦"], 4);
      toast(
        m.name + " и " + p.name + " стали ближе. Теперь можно дарить цветы!",
      );
    }
    if (action === "gift") {
      r.hearts = Math.min(3, r.hearts + 1);
      animate(m, "excited", "love", 4500);
      animate(p, "excited", "love", 4500);
      say(m, "Этот цветочек — тебе. Потому что ты чудо!");
      setTimeout(
        () =>
          say(
            p,
            r.hearts >= 3
              ? "Кажется, я влюбился… ♥"
              : "Я сохраню его в самой любимой вазочке! ♡",
            false,
          ),
        1500,
      );
      effect(m, ["♥", "🌸", "💕"], 10);
      toast(
        r.hearts === 3
          ? "Три сердечка! Теперь можно сыграть свадьбу 💍"
          : "Симпатия растёт: " + hearts(r.hearts),
      );
      chime();
    }
    jobs.delete(m.id);
    jobs.delete(p.id);
    renderAll();
    save();
  }
  function celebrate(wedding = false) {
    state.residents.forEach((m, i) => {
      animate(m, "dancing", wedding ? "love" : "happy", 7000);
      if (i < 8) {
        effect(
          m,
          wedding ? ["♥", "🌸", "💍", "✦"] : ["✦", "🎵", "🌸", "🎉"],
          7,
        );
        setTimeout(
          () =>
            say(
              m,
              choose(
                wedding
                  ? [
                      "Горько! Ой, сладко! ♥",
                      "Любовь — самое сильное волшебство!",
                      "Ура новой семье!",
                    ]
                  : [
                      "Танцуют все, даже мои зубы!",
                      "Это мой любимый день!",
                      "Лапки вверх! Праздник!",
                    ],
              ),
              false,
            ),
          i * 350,
        );
      }
    });
    chime();
    toast(
      wedding
        ? "В деревне новая семья! Любовь сохранена в паспортах."
        : "Дискотека светлячков! Вся деревня танцует ✦",
    );
  }
  function openDialog(mode, title, kicker) {
    if (dialogMode !== mode) $("modal").scrollTop = 0;
    dialogMode = mode;
    $("modal").className = mode + "-dialog";
    $("modal-title").textContent = title;
    $("modal-kicker").textContent = kicker || "МАЛЕНЬКАЯ МАГИЯ";
    if (!$("modal").open) $("modal").showModal();
  }
  function recipeKind(ids) {
    const key = [...ids].sort().join(",");
    return (
      species.find((s) => [...s.recipe].sort().join(",") === key) ||
      species[
        ids
          .map((id) => ingredients.findIndex((i) => i.id === id) + 1)
          .sort((a, b) => a - b)
          .reduce((n, x) => n * 7 + x, 0) % species.length
      ]
    );
  }
  function potMarkup() {
    return '<div class="mini-cauldron"><span>✦</span><i>✧</i><b>🫧</b><div>✶</div></div>';
  }
  function openBrew() {
    openDialog("brew", "Кого сегодня наколдуем?", "ВОЛШЕБНЫЙ КОТЁЛ");
    renderBrew();
  }
  function renderBrew() {
    const s = brewSelection.length === 3 ? recipeKind(brewSelection) : null;
    $("modal-body").innerHTML =
      `<p class="modal-description">Выбирай или перетаскивай находки в котёл. Каждая смесь из трёх разных ингредиентов оживёт — а точные рецепты всех 20 видов есть в книге чудиков.</p><div class="brew-layout"><div><div class="ingredients">${ingredients.map((i) => `<button class="ingredient ${brewSelection.includes(i.id) ? "selected" : ""}" style="--bg:${i.bg}" data-ingredient="${i.id}" draggable="${!brewing}" aria-pressed="${brewSelection.includes(i.id)}" ${state.inventory[i.id] < 1 || brewing ? "disabled" : ""}><span>${i.icon}</span><strong>${i.name}</strong><small>×${state.inventory[i.id]}</small></button>`).join("")}</div><button class="brew-refill" id="refill" ${state.flowers < 3 || brewing ? "disabled" : ""}>🧺 Волшебная корзина: +2 всех находок за 3 🌸</button></div><div class="brew-preview"><div class="big-pot ${brewing ? "mixing" : ""}" id="pot-drop" aria-label="Брось ингредиент в котёл">${potMarkup()}</div><div class="brew-selected">${[0, 1, 2].map((n) => `<button class="recipe-slot" ${brewing ? "disabled" : ""} data-slot="${n}" aria-label="${brewSelection[n] ? "Убрать " + item(brewSelection[n]).name : "Пустое место"}">${brewSelection[n] ? item(brewSelection[n]).icon : "✧"}</button>`).join("")}</div><p class="brew-hint">${brewing ? "Пых-пых… Чудо уже близко!" : s ? "В котле прячется " + s.name + "!<br>" + s.title : "Слышишь? В котле<br>кто-то тихонько хихикает…"}</p><button class="primary" id="brew" ${brewSelection.length !== 3 || brewing || state.residents.length >= 30 ? "disabled" : ""}>${brewing ? "✦ Колдуем…" : "✦ Наколдовать друга"}</button></div></div><p class="dialog-footnote">✧ Находки лежат и прямо в деревне — собирай их нажатием. На цветочной поляне жители находят новые ингредиенты. ${state.residents.length >= 30 ? "Деревня заполнена: здесь могут жить до 30 чудиков." : ""}</p>`;
  }
  function addIngredient(id) {
    if (brewing || !item(id)) return;
    const at = brewSelection.indexOf(id);
    if (at >= 0) brewSelection.splice(at, 1);
    else if (state.inventory[id] > 0) {
      if (brewSelection.length === 3) {
        toast("В котле уже три находки. Нажми на одну из них, чтобы заменить.");
        return;
      }
      brewSelection.push(id);
    }
    renderBrew();
  }
  function brew() {
    if (
      brewing ||
      brewSelection.length !== 3 ||
      brewSelection.some((id) => state.inventory[id] < 1) ||
      state.residents.length >= 30
    )
      return;
    const ids = [...brewSelection],
      s = recipeKind(ids);
    brewing = true;
    renderBrew();
    chime();
    setTimeout(() => {
      const duplicate = state.residents.filter((m) => m.kind === s.id).length,
        m = makeResident(
          s,
          duplicate ? s.name + " " + (duplicate + 1) : s.name,
          state.residents,
        );
      ids.forEach((id) => state.inventory[id]--);
      state.residents.push(m);
      recentlyActive.set(m.id, Date.now());
      state.stats.crafted++;
      state.selected = m.id;
      brewSelection = [];
      brewing = false;
      renderAll();
      save();
      effect(m, ["✦", "⭐", "💜", "🌸"], 12);
      animate(m, "newborn", "surprised", 1800);
      say(m, "Привет! Я " + m.name + ". А тут красиво!");
      toast("Добро пожаловать в деревню, " + m.name + "!");
      chime();
      if (dialogMode === "brew" && $("modal").open) openPassport(m.id, true);
    }, 1200);
  }
  function openCollection() {
    openDialog(
      "collection",
      "Книга необыкновенных чудиков",
      "20 ВИДОВ · У КАЖДОГО СВОЯ МАГИЯ",
    );
    const owned = new Set(state.residents.map((m) => m.kind));
    $("modal-body").innerHTML =
      '<p class="modal-description">Кого поселим по соседству? Выбери рецепт — нужные находки сами отправятся в котёл. Необычные смеси тоже работают!</p><div class="collection-grid">' +
      species
        .map(
          (s) =>
            `<article data-kind="${s.id}" class="species-card ${owned.has(s.id) ? "discovered" : ""}"><span class="discovery-badge">${owned.has(s.id) ? "✓ Открыт" : "✧ Найди меня"}</span>${art({ kind: s.id })}<h3>${s.name}</h3><p>${s.title}</p><div class="recipe-icons" aria-label="${s.recipe.map((id) => item(id).name).join(", ")}">${s.recipe.map((id) => `<span title="${item(id).name}">${item(id).icon}</span>`).join("")}</div><button data-recipe="${s.id}">В котёл с этим рецептом ↗</button></article>`,
        )
        .join("") +
      "</div>";
  }
  function residentTabs(m) {
    return (
      '<div class="passport-list">' +
      state.residents
        .map(
          (o) =>
            `<button class="${o.id === m.id ? "chosen" : ""}" data-passport="${o.id}">${escape(o.name)}</button>`,
        )
        .join("") +
      "</div>"
    );
  }
  function openPassport(id = state.selected, newborn = false) {
    const m = byId(id);
    if (!m) return;
    state.selected = id;
    const s = byKind(m.kind),
      partner = spouse(m),
      sweetheart = crush(m),
      friends = Object.entries(state.relationships).filter(
        ([k, r]) => k.split("|").includes(m.id) && r.friendship > 0,
      ).length;
    openDialog(
      "passport",
      newborn ? "В деревне новое чудо!" : "Паспорт монстрика",
      "МИНИСТЕРСТВО ПУШИСТЫХ И НЕ ОЧЕНЬ",
    );
    $("modal-body").innerHTML =
      residentTabs(m) +
      `<div class="passport-layout"><div class="portrait-stage">${art(m)}<span class="species-type">${s.title}</span></div><div class="passport-details"><h3>${escape(m.name)}</h3><p>${s.trait}</p><div class="passport-row"><span>Родные места</span><strong>${s.habitat}</strong></div><div class="passport-row"><span>Обожает</span><strong>${s.love}</strong></div><div class="passport-row"><span>Появился в деревне</span><strong>${new Date(m.born).toLocaleDateString("ru-RU")}</strong></div><div class="passport-row"><span>Собрано цветочков</span><strong>${m.gathered} 🌸</strong></div><div class="passport-row"><span>Друзей</span><strong>${friends}</strong></div><div class="passport-row"><span>Сердечные дела</span><strong>${partner ? "💍 " + escape(partner.name) : sweetheart ? "♥ " + escape(sweetheart.resident.name) + " · " + hearts(sweetheart.hearts) : "♡ Открыт для любви"}</strong></div><span class="passport-stamp">ЖИТЕЛЬ ДОЛИНЫ ЧУДИКОВ</span></div></div><div class="passport-actions"><button class="primary" data-nav="wardrobe">🎀 Нарядить и придумать имя</button><button class="secondary" id="return-village">🏡 В деревню</button></div>`;
    renderAll();
    save();
  }
  function openWardrobe() {
    const m = selected();
    draft = { ...m };
    openDialog(
      "wardrobe",
      "Характер в каждой детали",
      "ГАРДЕРОБ МАЛЕНЬКИХ ЧУДЕС",
    );
    renderWardrobe();
  }
  function renderWardrobe() {
    const palette = [
      byKind(draft.kind).color,
      "#f3b05d",
      "#a4d180",
      "#b28be2",
      "#ed97b8",
      "#85cddd",
      "#e8d27d",
      "#bcdbed",
    ];
    $("modal-body").innerHTML =
      `<div class="wardrobe-layout"><div class="portrait-stage" id="wardrobe-preview">${art(draft)}<span class="species-type">${byKind(draft.kind).title}</span></div><div><label class="field-label" for="monster-name">Как зовут этого чудика?</label><input id="monster-name" maxlength="24" autocomplete="off" value="${escape(draft.name)}" placeholder="Придумай волшебное имя"><span class="field-label">Цвет настроения</span><div class="swatches">${[...new Set(palette)].map((c, n) => `<button class="swatch ${draft.color === c ? "chosen" : ""}" style="--swatch:${c}" data-color="${c}" aria-label="Цвет ${n + 1}" aria-pressed="${draft.color === c}"></button>`).join("")}</div><span class="field-label">На макушку</span><div class="accessory-options">${hats.map(([v, icon, label]) => `<button class="accessory-option ${draft.hat === v ? "chosen" : ""}" data-hat="${v}" aria-label="${label}" title="${label}" aria-pressed="${draft.hat === v}">${icon}</button>`).join("")}</div><span class="field-label">Для особого шарма</span><div class="accessory-options">${outfits.map(([v, icon, label]) => `<button class="accessory-option ${draft.outfit === v ? "chosen" : ""}" data-outfit="${v}" aria-label="${label}" title="${label}" aria-pressed="${draft.outfit === v}">${icon}</button>`).join("")}</div><button class="primary wardrobe-save" id="save-outfit">Сохранить образ ✦</button></div></div>`;
  }
  function closeDialog() {
    if ($("modal").open) $("modal").close();
    dialogMode = "";
    draft = null;
  }
  function navigate(mode) {
    if (mode === "village") {
      closeDialog();
      $("world").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (mode === "brew") openBrew();
    if (mode === "collection") openCollection();
    if (mode === "wardrobe") openWardrobe();
    if (mode === "passport") openPassport();
  }
  function help() {
    openDialog("help", "Тут можно быть чудным", "ДОЛИНА БЕЗ СПЕШКИ И ПРАВИЛ");
    $("modal-body").innerHTML =
      '<div class="help-grid">' +
      [
        [
          "🫧 Наколдуй друга",
          "Смешай три разные находки в котле. В книге есть рецепты всех 20 видов, но экспериментировать тоже можно. Находки в мире собираются нажатием.",
        ],
        [
          "🎀 Будь собой",
          "Выбирай жителя на поляне или на карточке внизу. В гардеробе меняй имя, цвет и аксессуары, а в паспорте читай про характер.",
        ],
        [
          "🌷 Живи в деревне",
          "Нажми на поляну — выбранный чудик пойдёт туда. Отправляй его собирать цветы, разговаривай с ним или устрой общую дискотеку.",
        ],
        [
          "💗 Придумай историю любви",
          "Выбери соседа и поболтай с ним. Каждый подаренный цветок добавляет сердечко. Три сердечка открывают свадьбу: новая семья появится в паспортах.",
        ],
      ]
        .map(([t, p]) => `<div class="help-tip"><b>${t}</b><p>${p}</p></div>`)
        .join("") +
      '</div><p class="dialog-footnote">Мир, жители, гардероб, запасы и отношения сохраняются в этом браузере. Можно поселить до 30 жителей. На другом устройстве сохранение пока не переносится. Озвучку включай кнопкой ♫; на телефоне она также есть в этом окне. Русский голос зависит от браузера.</p><div class="dialog-actions"><button class="secondary" id="help-sound">♫ ' +
      (sound ? "Выключить" : "Включить") +
      ' озвучку</button><button class="primary" id="return-village">В мой волшебный мир ↗</button></div>';
  }
  function toggleSound() {
    sound = !sound;
    $("sound").setAttribute("aria-pressed", String(sound));
    $("sound").querySelector("span").textContent = sound
      ? "Звук включён"
      : "Звук выключен";
    if (!sound) {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    } else {
      chime();
      say(selected(), "Привет! Теперь ты меня слышишь!");
    }
    if (dialogMode === "help") help();
  }
  const pickupSpots = [
    { x: 13, y: 57 },
    { x: 36, y: 49 },
    { x: 61, y: 58 },
    { x: 18, y: 87 },
    { x: 66, y: 91 },
    { x: 78, y: 58 },
  ];
  function spawnPickup(n) {
    const spot = pickupSpots[n],
      i = choose(ingredients);
    const b = document.createElement("button");
    b.className = "pickup";
    b.dataset.pickup = String(n);
    b.dataset.item = i.id;
    b.style.left = spot.x + "%";
    b.style.top = spot.y + "%";
    b.style.setProperty("--delay", -n * 0.5 + "s");
    b.innerHTML = `<span>${i.icon}</span>`;
    b.setAttribute("aria-label", "Подобрать: " + i.name);
    $("ingredient-pickups").append(b);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.nav) {
      navigate(d.nav);
      return;
    }
    if (d.resident) {
      selectResident(d.resident);
      say(
        selected(),
        choose([
          byKind(selected().kind).voice,
          "Я тут! Чем займёмся?",
          "Привет, это снова я!",
        ]),
      );
      return;
    }
    if (d.card) {
      selectResident(d.card);
      return;
    }
    if (d.pickup !== undefined) {
      const i = item(d.item);
      state.inventory[i.id] = Math.min(999, state.inventory[i.id] + 1);
      b.remove();
      save();
      toast(i.icon + " " + i.name + " — в корзинке!");
      chime();
      setTimeout(() => spawnPickup(Number(d.pickup)), 18000);
      return;
    }
    if (d.ingredient) {
      addIngredient(d.ingredient);
      return;
    }
    if (d.slot !== undefined) {
      if (!brewing) {
        brewSelection.splice(Number(d.slot), 1);
        renderBrew();
      }
      return;
    }
    if (d.recipe) {
      if (brewing) {
        toast("Котёл уже колдует, подожди секундочку!");
        return;
      }
      const s = byKind(d.recipe);
      if (s.recipe.some((id) => state.inventory[id] < 1)) {
        openBrew();
        toast(
          "Не хватает находок. Собери их в деревне или пополни корзину за цветы.",
        );
        return;
      }
      brewSelection = [...s.recipe];
      openBrew();
      return;
    }
    if (d.passport) {
      openPassport(d.passport);
      return;
    }
    for (const k of ["color", "hat", "outfit"])
      if (d[k] && draft) {
        draft[k] = d[k];
        renderWardrobe();
        return;
      }
    if (d.action) {
      if (d.action === "gather") gather();
      if (d.action === "hello") {
        say(selected(), byKind(selected().kind).voice);
        animate(selected(), "excited", "happy", 2400);
      }
      if (d.action === "dance" && !jobs.has(selected().id)) {
        animate(selected(), "dancing", "happy", 4500);
        say(
          selected(),
          choose([
            "Лапки делают топ-топ, сердце делает тук-тук!",
            "А теперь — танец хвостом! Даже если его нет.",
            "Шевели ушами! У нас маленькая дискотека!",
          ]),
        );
        effect(selected(), ["🎵", "✦"], 6);
        chime();
      }
      if (["chat", "gift", "marry"].includes(d.action)) socialize(d.action);
      return;
    }
    if (d.confirmWedding) {
      const a = byId(d.weddingFrom),
        p = byId(d.confirmWedding);
      if (!a || !p) return;
      const r = relationship(a.id, p.id);
      if (r.hearts < 3 || r.friendship < 1 || spouse(a) || spouse(p)) return;
      r.married = true;
      state.relationships[pairKey(a.id, p.id)] = r;
      state.stats.weddings++;
      closeDialog();
      renderAll();
      save();
      celebrate(true);
      return;
    }
    switch (b.id) {
      case "close-modal":
      case "return-village":
        closeDialog();
        break;
      case "brew":
        brew();
        break;
      case "refill":
        if (!brewing && state.flowers >= 3) {
          state.flowers -= 3;
          ingredients.forEach(
            (i) =>
              (state.inventory[i.id] = Math.min(
                999,
                state.inventory[i.id] + 2,
              )),
          );
          renderAll();
          save();
          renderBrew();
          toast("Шур-шур! В корзине по две новые находки каждого вида.");
        }
        break;
      case "save-outfit":
        if (draft) {
          const m = byId(draft.id);
          if (m) {
            m.name = draft.name.trim().slice(0, 24) || byKind(m.kind).name;
            m.color = draft.color;
            m.hat = draft.hat;
            m.outfit = draft.outfit;
            renderAll();
            save();
            closeDialog();
            say(m, "Какой образ! Это точно я!");
            effect(m, ["✨", "🎀"], 5);
          }
        }
        break;
      case "celebrate":
        celebrate();
        break;
      case "garden":
        gather();
        break;
      case "help":
        help();
        break;
      case "sound":
      case "help-sound":
        toggleSound();
        break;
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "monster-name" && draft) draft.name = e.target.value;
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "partner") {
      partnerId = e.target.value;
      renderControls();
    }
  });
  $("modal").addEventListener("close", () => {
    dialogMode = "";
    draft = null;
  });
  $("modal").addEventListener("click", (e) => {
    if (e.target === $("modal")) {
      const r = $("modal").getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDialog();
    }
  });
  document.addEventListener("dragstart", (e) => {
    const b = e.target.closest("[data-ingredient]");
    if (b && !brewing)
      e.dataTransfer.setData("text/plain", b.dataset.ingredient);
  });
  document.addEventListener("dragover", (e) => {
    if (e.target.closest("#pot-drop") && !brewing) e.preventDefault();
  });
  document.addEventListener("drop", (e) => {
    if (e.target.closest("#pot-drop") && !brewing) {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (!brewSelection.includes(id)) addIngredient(id);
    }
  });
  $("world").addEventListener("click", async (e) => {
    if (e.target.closest("button")) return;
    const m = selected();
    if (jobs.has(m.id)) {
      toast(m.name + " занят. Скоро закончит!");
      return;
    }
    const r = $("world").getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * 100,
      y = ((e.clientY - r.top) / r.height) * 100;
    if (y < 54) {
      say(m, "Давай гулять на поляне! Там мягкая травка.");
      return;
    }
    recentlyActive.set(m.id, Date.now());
    jobs.set(m.id, "Гуляет по поляне");
    const marker = document.createElement("i");
    marker.className = "destination-marker";
    marker.style.left = clamp(x, 10, 79) + "%";
    marker.style.top = clamp(y, 56, 91) + "%";
    $("world-effects").append(marker);
    setTimeout(() => marker.remove(), 1200);
    renderControls();
    await walk(m, x, y);
    jobs.delete(m.id);
    renderControls();
    save();
  });
  setInterval(() => {
    if (document.hidden) return;
    const eligible = state.residents.filter(
      (m) =>
        !jobs.has(m.id) &&
        Date.now() - (recentlyActive.get(m.id) || 0) > 12000 &&
        !visuals.has(m.id),
    );
    if (!eligible.length) return;
    const m = choose(eligible);
    if (Math.random() < 0.55) {
      jobs.set(m.id, "Гуляет");
      if (state.selected === m.id) renderControls();
      walk(
        m,
        clamp(m.x + (Math.random() - 0.5) * 24, 14, 75),
        clamp(m.y + (Math.random() - 0.5) * 15, 59, 89),
      ).then(() => {
        jobs.delete(m.id);
        if (state.selected === m.id) renderControls();
        save();
      });
    } else {
      say(
        m,
        choose([
          byKind(m.kind).voice,
          "А облачко похоже на пирожное…",
          "Мне приснилось, что цветы умеют петь.",
          "Как хорошо жить здесь с вами!",
        ]),
        false,
      );
      if (Math.random() < 0.4) animate(m, "excited", "happy", 2000);
    }
  }, 7500);
  $("sticker-monster").innerHTML = art({ kind: "cyclops", hat: "flower" });
  pickupSpots.forEach((_, n) => spawnPickup(n));
  renderAll();
  save();
})();
