/* Original vector characters: twenty silhouettes, animated eyes, teeth and accessories. */
window.MonsterArt = (() => {
  let serial = 0;
  const path = (d, fill, extra = "") =>
    `<path d="${d}" fill="${fill}" ${extra}/>`;
  function render(m, options = {}) {
    const s =
        MonsterData.species.find((s) => s.id === m.kind) ||
        MonsterData.species[0],
      c = m.color || s.color,
      a = s.accent,
      id = "monster" + ++serial,
      mood = options.mood || m.mood || "happy";
    const stroke =
      'stroke="#423151" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"';
    const shape = (d, fill = c) => path(d, fill, stroke);
    const ellipse = (x, y, rx, ry, fill = c) =>
      `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${stroke}/>`;
    const dots = (points, fill = a, r = 4) =>
      points
        .map(
          ([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`,
        )
        .join("");
    let back = "",
      body = "",
      detail = "",
      front = "",
      face = [120, 126, 1],
      eyes = 2;
    const feet = () =>
      shape(
        "M79 186 L67 216 Q78 231 99 218 L106 188 M143 189 L147 218 Q167 233 179 216 L169 184",
        c,
      );
    const arms = () =>
      shape(
        "M66 125 Q25 129 44 157 Q54 166 73 147 M177 125 Q216 123 197 153 Q187 165 174 150",
        c,
      );
    switch (s.id) {
      case "fluff":
        back = feet() + arms();
        body = shape(
          "M63 169 L48 160 L59 146 L48 133 L58 120 L50 104 L68 99 L62 81 L83 83 L86 64 L103 72 L116 54 L130 68 L147 58 L153 78 L174 73 L173 93 L192 98 L184 115 L199 128 L187 141 L195 157 L181 167 L184 186 L164 188 L155 207 L138 201 L122 216 L105 203 L86 208 L80 190 L62 189Z",
        );
        detail = path(
          "M74 115 l10 -7 M157 98 l10 8 M78 174 l9 7 M157 178 l10 -8 M102 85 l9 5",
          "none",
          'stroke="#ce8d44" stroke-width="3" stroke-linecap="round"',
        );
        face = [122, 132, 1];
        break;
      case "sprout":
        back = feet() + arms();
        back +=
          shape("M119 69 Q73 43 89 19 Q128 20 125 62", "#74ac5c") +
          shape("M122 63 Q126 13 165 21 Q171 58 122 63", "#a4d36d");
        body = shape(
          "M92 74 Q125 48 148 78 Q151 106 174 140 Q199 194 153 207 Q79 226 64 188 Q50 158 79 122Z",
        );
        detail = ellipse(119, 178, 29, 23, "#dfeda7");
        face = [120, 126, 0.9];
        break;
      case "cyclops":
        back =
          feet() +
          arms() +
          shape(
            "M78 91 Q48 59 69 37 L105 78 M146 77 L173 36 Q201 63 168 92",
            a,
          );
        body = ellipse(121, 141, 67, 73);
        face = [121, 125, 1.45];
        eyes = 1;
        break;
      case "dragon":
        back =
          shape("M159 176 Q228 203 223 133 Q250 186 222 209 Q195 230 153 206") +
          shape("M197 175 L216 163 L215 186 M209 201 L228 192 L222 213", a) +
          shape(
            "M72 124 Q36 67 17 98 L24 147 L51 133 L57 159 M172 122 Q204 72 225 98 L218 150 L189 133 L181 160",
            a,
          ) +
          feet();
        body = shape(
          "M79 83 Q77 48 98 69 Q119 56 143 72 Q160 47 164 85 Q197 123 174 181 Q163 218 119 212 Q67 215 63 169 Q56 115 79 83Z",
        );
        detail =
          ellipse(123, 179, 32, 26, "#b9e3ec") +
          shape("M121 66 L130 43 L143 72", a);
        face = [120, 124, 1];
        break;
      case "axo":
        back =
          shape("M161 180 Q212 152 226 187 Q207 231 161 214", a) +
          shape(
            "M76 103 L34 79 L31 94 L60 113 L24 112 L26 128 L62 130 L35 145 L43 159 L74 146 M168 104 L211 78 L216 93 L184 115 L220 113 L218 129 L183 131 L211 146 L203 159 L169 146",
            a,
          ) +
          feet();
        body = shape(
          "M60 128 Q53 76 119 77 Q188 74 184 133 L176 186 Q153 218 109 211 Q68 210 62 181Z",
        );
        face = [122, 124, 1.05];
        break;
      case "cloud":
        back = shape(
          "M55 146 Q11 115 22 153 Q23 172 62 171 M183 143 Q231 116 220 154 Q215 177 180 170",
          "#fff5dd",
        );
        body = shape(
          "M62 180 Q16 173 35 131 Q20 91 66 88 Q72 42 114 65 Q148 35 169 76 Q214 67 209 109 Q241 132 211 162 Q211 204 172 195 Q151 225 122 200 Q83 223 62 180Z",
        );
        detail = dots(
          [
            [66, 190],
            [175, 211],
            [123, 226],
          ],
          "#b1a0e4",
          5,
        );
        face = [123, 127, 1];
        break;
      case "jelly":
        back = shape(
          "M55 148 Q24 222 60 214 Q76 205 74 162 M88 155 Q58 244 95 228 L110 163 M125 163 Q105 244 137 228 L145 166 M158 155 Q154 234 181 218 L179 155 M185 151 Q217 214 222 181 L199 134",
          a,
        );
        body = shape(
          "M33 145 Q32 58 119 57 Q205 58 207 145 Q196 163 181 150 Q165 171 149 153 Q133 173 117 154 Q100 172 85 153 Q64 168 51 150 Q40 157 33 145Z",
        );
        detail = path(
          "M60 107 Q69 79 97 79",
          "none",
          'stroke="#ffffff90" stroke-width="10" stroke-linecap="round"',
        );
        face = [120, 115, 0.78];
        eyes = 3;
        break;
      case "mush":
        back = feet() + arms();
        body = shape(
          "M82 116 L78 186 Q76 220 120 219 Q165 221 163 187 L158 113",
          "#f7dca8",
        );
        front = shape(
          "M29 113 Q40 34 118 32 Q202 35 213 113 Q185 140 122 132 Q62 141 29 113Z",
          a,
        );
        front += dots(
          [
            [77, 83],
            [117, 57],
            [158, 91],
            [47, 105],
            [186, 107],
          ],
          "#fff1d8",
          11,
        );
        face = [122, 166, 0.78];
        break;
      case "cactus":
        back =
          feet() +
          shape(
            "M78 143 L49 143 Q26 141 28 115 L29 95 Q39 81 48 96 L48 119 L77 119 M166 145 L194 145 Q216 145 215 116 L216 104 Q206 88 197 103 L198 124 L167 124",
          );
        body = shape(
          "M77 197 L76 98 Q77 56 121 56 Q166 56 167 98 L168 197 Q127 226 77 197Z",
        );
        detail =
          path(
            "M94 85 V192 M148 85 V192",
            "none",
            'stroke="#ffffff35" stroke-width="4"',
          ) +
          path(
            "M75 96 l-8 -5 M77 158 l-9 3 M166 100 l9 -4 M166 172 l10 2 M111 71 l-2 -10",
            "none",
            'stroke="#426b53" stroke-width="3"',
          );
        front = `<text x="132" y="70" font-size="39">🌸</text>`;
        face = [122, 129, 0.85];
        break;
      case "bat":
        back =
          shape(
            "M78 127 Q39 68 9 114 L16 167 Q35 141 47 164 Q58 139 78 165 M161 128 Q204 68 235 114 L228 167 Q211 144 197 164 Q183 142 162 166",
            a,
          ) + feet();
        body = shape(
          "M78 100 L71 31 L109 76 Q122 68 136 77 L176 30 L165 101 Q186 132 168 181 Q144 217 107 205 Q69 199 67 153 Q61 121 78 100Z",
        );
        detail = shape("M81 90 L80 53 L102 86 M143 87 L167 53 L160 93", a);
        face = [121, 130, 0.9];
        break;
      case "rock":
        back =
          feet() +
          arms() +
          shape(
            "M81 82 L72 48 L93 31 L113 70 M144 72 L160 33 L184 49 L174 90",
            a,
          );
        body = shape(
          "M51 112 L80 71 L143 64 L185 94 L197 159 L170 205 L111 219 L63 193 L44 153Z",
        );
        detail = path(
          "M51 112 L82 120 L63 193 M143 64 L140 96 L185 94 M170 205 L159 171 L197 159",
          "none",
          'stroke="#ffffff40" stroke-width="4"',
        );
        face = [121, 130, 0.83];
        eyes = 3;
        break;
      case "moth":
        back = shape(
          "M106 113 Q41 21 18 75 Q-7 113 66 141 Q-1 162 45 199 Q72 214 109 171 M138 113 Q198 22 222 75 Q248 117 177 142 Q247 163 198 199 Q176 214 135 170",
          a,
        );
        back +=
          dots(
            [
              [50, 95],
              [193, 95],
            ],
            "#f7d88e",
            19,
          ) +
          dots(
            [
              [51, 173],
              [191, 173],
            ],
            "#bc7ab3",
            11,
          );
        body = shape(
          "M102 77 L96 64 L112 69 L120 54 L131 68 L147 61 L141 81 Q173 104 156 144 L161 171 L149 178 L152 193 L134 195 L122 207 L110 194 L94 194 L95 177 L83 168 L92 145 Q74 105 102 77Z",
        );
        back += path(
          "M109 77 Q85 36 76 44 M133 77 Q151 32 164 44",
          "none",
          'stroke="#63446e" stroke-width="5"',
        );
        face = [122, 123, 0.8];
        break;
      case "octo":
        body = shape(
          "M60 145 Q43 69 122 63 Q196 67 179 147 Q218 160 225 191 Q224 216 201 205 L178 179 Q189 223 166 225 Q146 222 147 190 Q138 235 119 230 Q103 228 106 193 Q89 232 69 221 Q58 209 76 180 Q48 218 26 201 Q12 178 60 145Z",
        );
        detail = dots(
          [
            [48, 193],
            [81, 209],
            [127, 215],
            [167, 208],
            [206, 190],
          ],
          "#efd4f2",
          5,
        );
        face = [122, 122, 1];
        break;
      case "flame":
        back = feet() + arms();
        body = shape(
          "M59 167 Q45 133 79 94 Q89 73 81 51 Q111 56 114 82 Q144 51 134 20 Q184 51 169 93 Q202 109 190 150 Q209 195 163 211 Q124 231 86 211 Q54 203 59 167Z",
        );
        detail = shape(
          "M85 184 Q76 158 102 143 Q102 165 120 167 Q143 154 139 129 Q174 156 163 188 Q129 219 85 184Z",
          a,
        );
        face = [126, 129, 1];
        break;
      case "yeti":
        back =
          shape(
            "M80 100 Q40 73 49 27 Q63 63 97 68 M149 68 Q178 58 183 24 Q200 70 168 99",
            "#f4e7c4",
          ) +
          feet() +
          shape(
            "M68 117 Q18 115 22 163 L38 176 L47 164 L58 170 L76 145 M171 117 Q221 115 222 164 L204 179 L195 166 L184 174 L166 145",
          );
        body = shape(
          "M71 88 L83 68 L97 73 L109 60 L122 72 L139 59 L150 75 L166 72 L176 94 L174 108 L188 123 L181 138 L195 153 L180 162 L190 180 L173 187 L169 207 L151 204 L137 222 L122 210 L102 221 L94 205 L76 207 L73 187 L57 180 L65 162 L53 149 L64 135 L56 117 L70 111Z",
        );
        detail = ellipse(122, 147, 48, 49, "#edf6f6");
        face = [122, 133, 1.1];
        break;
      case "snail":
        back =
          ellipse(153, 142, 64, 67, a) +
          path(
            "M160 181 C224 150 183 81 145 107 C104 132 137 180 163 153 C183 133 148 119 145 140",
            "none",
            'stroke="#c27c5b" stroke-width="7" stroke-linecap="round"',
          );
        body = shape(
          "M48 191 L46 118 Q49 95 70 96 Q91 98 91 124 L93 164 Q113 182 179 190 Q205 198 188 215 L57 217 Q25 214 34 196Z",
        );
        back += shape("M52 111 L39 64 M79 108 L89 62");
        face = [65, 73, 0.7];
        break;
      case "blob":
        body = shape(
          "M29 193 Q58 171 61 130 Q58 84 106 75 Q165 58 176 111 Q184 151 211 181 Q244 219 202 222 Q180 207 165 221 Q144 237 122 221 Q98 239 76 221 Q20 240 29 193Z",
        );
        detail =
          path(
            "M82 112 Q86 93 111 94",
            "none",
            'stroke="#ffffff80" stroke-width="10" stroke-linecap="round"',
          ) +
          dots(
            [
              [75, 181],
              [168, 166],
            ],
            "#ffffff55",
            7,
          );
        face = [122, 142, 1.1];
        break;
      case "bunny":
        back =
          feet() +
          arms() +
          shape(
            "M83 93 Q38 5 79 9 Q108 14 111 89 M137 85 Q142 0 174 13 Q201 40 161 96",
          );
        back += shape(
          "M85 75 Q67 28 79 26 Q93 33 97 77 M148 75 Q157 25 169 28 Q181 38 158 81",
          a,
        );
        body = shape(
          "M62 123 Q59 73 122 76 Q183 77 182 130 L177 183 Q164 219 122 217 Q76 218 64 185Z",
        );
        face = [123, 130, 0.85];
        eyes = 3;
        break;
      case "puffer": {
        back = feet();
        let d = "";
        for (let i = 0; i < 40; i++) {
          const t = (i / 40) * Math.PI * 2,
            r = i % 2 ? 68 : 91;
          d +=
            (i ? "L" : "M") +
            (120 + Math.cos(t) * r).toFixed(1) +
            " " +
            (139 + Math.sin(t) * r).toFixed(1) +
            " ";
        }
        body = shape(d + "Z");
        detail = ellipse(120, 147, 54, 55, a);
        face = [120, 134, 1.2];
        break;
      }
      case "cosmic":
        back =
          shape(
            "M71 94 Q29 62 58 23 Q56 57 98 65 M145 65 Q193 49 181 17 Q222 64 170 97",
            a,
          ) +
          feet() +
          arms();
        body = shape(
          "M70 99 Q119 53 168 99 Q204 148 175 191 Q151 225 120 215 Q77 222 59 183 Q39 139 70 99Z",
        );
        detail =
          dots(
            [
              [83, 169],
              [163, 175],
              [123, 193],
              [76, 111],
              [161, 113],
            ],
            "#fbe8aa",
            3,
          ) + `<text x="102" y="99" fill="#ffdfa0" font-size="25">✧</text>`;
        face = [121, 140, 1];
        break;
    }
    function eye(x, y, r) {
      if (mood === "love")
        return `<path d="M${x} ${y + 9} C${x - 24} ${y - 4} ${x - 7} ${y - 20} ${x} ${y - 9} C${x + 8} ${y - 20} ${x + 23} ${y - 4} ${x} ${y + 9}" fill="#e95b97"/>`;
      if (mood === "sleepy")
        return path(
          `M${x - r} ${y} Q${x} ${y + 12} ${x + r} ${y}`,
          "none",
          'stroke="#423151" stroke-width="4" stroke-linecap="round"',
        );
      return `<g class="monster-eye"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.17}" fill="#fffdf1" stroke="#423151" stroke-width="2"/><ellipse cx="${x + 2}" cy="${y + 2}" rx="${r * 0.45}" ry="${r * 0.65}" fill="#423151"/><circle cx="${x + 5}" cy="${y - 3}" r="${r * 0.18}" fill="white"/></g>`;
    }
    const [fx, fy, scale] = face;
    let facial = "";
    if (eyes === 1) facial = eye(fx, fy - 9, 22 * scale);
    else if (eyes === 3)
      facial =
        eye(fx - 27 * scale, fy, 12 * scale) +
        eye(fx, fy - 14 * scale, 13 * scale) +
        eye(fx + 27 * scale, fy, 12 * scale);
    else
      facial =
        eye(fx - 24 * scale, fy - 5, 15 * scale) +
        eye(fx + 24 * scale, fy - 5, 15 * scale);
    const my = fy + 26 * scale,
      mw = 21 * scale;
    facial += `<ellipse cx="${fx - 39 * scale}" cy="${fy + 16 * scale}" rx="9" ry="5" fill="#ed8caa77"/><ellipse cx="${fx + 39 * scale}" cy="${fy + 16 * scale}" rx="9" ry="5" fill="#ed8caa77"/>`;
    if (mood === "surprised") facial += ellipse(fx, my, 10, 13, "#65425b");
    else {
      facial += path(
        `M${fx - mw} ${my - 5} Q${fx} ${my + 24} ${fx + mw} ${my - 5} Q${fx} ${my + 2} ${fx - mw} ${my - 5}`,
        "#68394d",
        'stroke="#423151" stroke-width="2"',
      );
      facial += path(
        `M${fx - 12} ${my - 3} L${fx - 10} ${my + 7} L${fx - 3} ${my + 7} L${fx - 3} ${my - 1} M${fx + 5} ${my - 1} L${fx + 5} ${my + 8} L${fx + 12} ${my + 6} L${fx + 13} ${my - 3}`,
        "#fffde9",
      );
      if (s.id === "yeti" || s.id === "bat" || s.id === "dragon")
        facial += path(
          `M${fx - mw + 2} ${my - 4} L${fx - mw + 10} ${my + 13} L${fx - mw + 16} ${my - 1} M${fx + mw - 2} ${my - 4} L${fx + mw - 10} ${my + 13} L${fx + mw - 16} ${my - 1}`,
          "#fffde9",
        );
    }
    let accessory = "";
    const hat = m.hat || "none",
      outfit = m.outfit || "none";
    if (outfit === "cape")
      back =
        shape(
          "M82 139 Q40 166 37 223 Q120 201 202 223 Q197 166 159 139",
          "#e36d8e",
        ) + back;
    if (hat === "flower")
      accessory += '<text x="148" y="91" font-size="40">🌸</text>';
    if (hat === "crown")
      accessory += shape(
        "M83 77 L77 42 L104 55 L122 29 L143 55 L170 42 L165 77Z",
        "#ffd775",
      );
    if (hat === "wizard")
      accessory +=
        shape("M83 75 L134 1 L164 75Z", "#754fc2") +
        ellipse(122, 77, 57, 9, "#8c68dc") +
        '<text x="119" y="55" fill="#ffe294" font-size="23">✦</text>';
    if (hat === "bow")
      accessory += shape(
        "M126 74 Q81 34 83 78 Q94 93 124 82 Q157 98 162 75 Q161 37 126 74",
        "#f075b1",
      );
    if (hat === "party")
      accessory +=
        shape("M92 77 L122 6 L157 77Z", "#ffb976") +
        dots(
          [
            [119, 34],
            [113, 55],
            [139, 64],
          ],
          "#b88bda",
          5,
        ) +
        '<circle cx="122" cy="6" r="9" fill="#f59ac6"/>';
    if (outfit === "scarf")
      accessory +=
        shape("M76 165 Q120 187 166 165 L167 181 Q121 205 75 181Z", "#e4748e") +
        shape("M143 188 L164 185 L176 218 L151 214Z", "#e4748e");
    if (outfit === "bowtie")
      accessory +=
        shape(
          "M120 178 L95 162 L95 194Z M120 178 L146 162 L146 194Z",
          "#f389b6",
        ) + ellipse(120, 178, 6, 7, "#af5d91");
    if (outfit === "necklace")
      accessory += dots(
        [
          [80, 170],
          [91, 180],
          [105, 187],
          [121, 190],
          [137, 187],
          [151, 181],
          [163, 171],
        ],
        "#ffdc7d",
        6,
      );
    if (outfit === "bag")
      accessory +=
        path("M84 139 L168 199", "none", 'stroke="#885b76" stroke-width="6"') +
        shape("M139 185 L176 185 L176 218 L139 218Z", "#c88ce0") +
        path("M141 191 L173 191", "none", 'stroke="#f2caff" stroke-width="3"');
    return `<svg class="monster-svg kind-${s.id}" viewBox="0 0 240 245" role="img" aria-label="${s.title}"><defs><filter id="${id}"><feDropShadow dx="0" dy="3" stdDeviation="1" flood-color="#44315c" flood-opacity=".09"/></filter></defs><g filter="url(#${id})">${back}${body}${detail}${front}${facial}${accessory}</g></svg>`;
  }
  return { render };
})();
