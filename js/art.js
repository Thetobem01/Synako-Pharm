/* Synako Pharmacy — drawn product images.
   Each product gets an SVG pack illustration by pack type, in its own colour, labelled with
   its name and strength. A real photo (assets/products/<id>.png) replaces it automatically. */
window.SYNAKO_ART = (function () {
  "use strict";
  let n = 0;
  const esc = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function shade(hex, amt) {
    const h = hex.replace("#", "");
    const v = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
    const out = v.map(x => Math.max(0, Math.min(255, Math.round(amt < 0 ? x * (1 + amt) : x + (255 - x) * amt))));
    return "#" + out.map(x => x.toString(16).padStart(2, "0")).join("");
  }
  /* Short label lines from the product name */
  function label(p) {
    const base = p.generic && p.generic.length < 18 ? p.generic : p.name.split(/[:(,]/)[0];
    const words = base.replace(/\s+/g, " ").trim().split(" ");
    const lines = []; let cur = "";
    words.forEach(w => { if ((cur + " " + w).trim().length > 13 && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
    if (cur) lines.push(cur);
    return lines.slice(0, 2);
  }
  const txt = (x, y, lines, size, fill, anchor, weight) => lines.map((l, i) =>
    `<text x="${x}" y="${y + i * (size + 2)}" font-family="Poppins, DM Sans, sans-serif" font-size="${size}" font-weight="${weight || 700}" fill="${fill}" text-anchor="${anchor || "start"}">${esc(l)}</text>`).join("");

  function svg(p, body, defs) {
    return `<svg class="art" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.name)}">
      <defs>${defs || ""}<filter id="sh${n}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#1B2A44" flood-opacity=".22"/></filter></defs>
      <ellipse cx="100" cy="146" rx="64" ry="6" fill="#1B2A44" opacity=".08"/>
      <g filter="url(#sh${n})">${body}</g></svg>`;
  }

  const draw = {
    box(p) { // 3D carton
      const c = p.c, L = label(p), rx = p.cls === "pom";
      return svg(p, `
        <path d="M46 40 L136 40 L156 28 L66 28 Z" fill="${shade(c, .35)}"/>
        <path d="M136 40 L156 28 L156 118 L136 132 Z" fill="${shade(c, -.25)}"/>
        <rect x="46" y="40" width="90" height="92" fill="#fff"/>
        <rect x="46" y="40" width="90" height="26" fill="${c}"/>
        <rect x="46" y="66" width="90" height="3" fill="${shade(c, .5)}"/>
        ${txt(52, 57, [p.brand && p.brand !== "Generic" ? p.brand.slice(0, 12) : "SYNAKO"], 8, "#fff")}
        ${txt(52, 84, L, 10, "#1B2A44")}
        ${p.strength ? txt(52, 84 + L.length * 12 + 2, [p.strength], 9, c, "start", 600) : ""}
        <text x="52" y="126" font-family="DM Sans, sans-serif" font-size="7" fill="#5A6680">${esc(p.pack)}</text>
        ${rx ? `<rect x="112" y="110" width="20" height="16" rx="3" fill="#E8892B"/><text x="122" y="122" font-family="Georgia, serif" font-style="italic" font-size="11" fill="#fff" text-anchor="middle">Rx</text>`
             : `<circle cx="122" cy="118" r="8" fill="none" stroke="${c}" stroke-width="2.5" opacity=".6"/>`}
      `);
    },
    blister(p) { // carton behind a blister strip
      const c = p.c, L = label(p);
      let pills = "";
      for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) pills += `<ellipse cx="${84 + k * 20}" cy="${92 + r * 22}" rx="7" ry="5" fill="#fff" stroke="#C9D2E0"/><ellipse cx="${84 + k * 20}" cy="${91 + r * 22}" rx="4" ry="2.5" fill="${shade(c, .55)}"/>`;
      return svg(p, `
        <rect x="34" y="26" width="86" height="80" fill="#fff"/><rect x="34" y="26" width="86" height="22" fill="${c}"/>
        ${txt(40, 64, L, 9, "#1B2A44")}${p.strength ? txt(40, 64 + L.length * 11 + 2, [p.strength], 8, c, "start", 600) : ""}
        <rect x="70" y="78" width="96" height="50" rx="5" fill="#E6EAF1" stroke="#C9D2E0"/>${pills}
      `);
    },
    bottle(p) { // pill / lotion bottle
      const c = p.c, L = label(p);
      return svg(p, `
        <rect x="76" y="20" width="48" height="18" rx="4" fill="${shade(c, -.3)}"/>
        <rect x="80" y="36" width="40" height="8" fill="#E9EDF3"/>
        <rect x="62" y="42" width="76" height="92" rx="14" fill="#fff" stroke="#DCE2EC"/>
        <rect x="62" y="64" width="76" height="50" fill="${c}"/>
        ${txt(100, 82, L, 9, "#fff", "middle")}
        <text x="100" y="${L.length > 1 ? 106 : 96}" font-family="DM Sans, sans-serif" font-size="7" fill="#fff" text-anchor="middle" opacity=".9">${esc(p.pack)}</text>
        <rect x="68" y="48" width="6" height="80" rx="3" fill="#fff" opacity=".5"/>
      `);
    },
    syrup(p) { // amber bottle with measuring cup cap
      const c = p.c, L = label(p);
      return svg(p, `
        <path d="M84 22 h32 v12 h-32z" fill="#F1F4F8" stroke="#C9D2E0"/>
        <rect x="88" y="34" width="24" height="10" fill="#7A4A18"/>
        <path d="M70 58 q0 -14 18 -14 h24 q18 0 18 14 v70 q0 8 -8 8 h-44 q-8 0 -8 -8z" fill="#8A4F14"/>
        <rect x="70" y="70" width="60" height="48" fill="#fff"/>
        <rect x="70" y="70" width="60" height="12" fill="${c}"/>
        ${txt(100, 96, L, 8, "#1B2A44", "middle")}
        ${p.strength ? txt(100, 96 + L.length * 10 + 2, [p.strength], 7, c, "middle", 600) : ""}
        <rect x="75" y="62" width="5" height="64" rx="2.5" fill="#fff" opacity=".18"/>
      `);
    },
    tube(p) { // cream tube with box
      const c = p.c, L = label(p);
      return svg(p, `
        <rect x="40" y="34" width="70" height="88" fill="#fff"/><rect x="40" y="34" width="70" height="20" fill="${c}"/>
        ${txt(46, 70, L, 8, "#1B2A44")}
        <g transform="rotate(-18 130 96)">
          <path d="M78 84 h86 l10 8 v12 l-10 8 h-86 z" fill="#fff" stroke="#D3DAE6"/>
          <rect x="78" y="84" width="54" height="28" fill="${c}"/>
          <rect x="174" y="88" width="14" height="20" rx="3" fill="${shade(c, -.3)}"/>
          <path d="M74 84 v28" stroke="#C9D2E0" stroke-width="5"/>
          ${txt(84, 101, [p.strength || "Cream"], 9, "#fff")}
        </g>
      `);
    },
    sachet(p) { // stacked sachets with zigzag edge
      const c = p.c, L = label(p);
      const zig = (x, y, w) => { let d = `M${x} ${y}`; for (let i = 0; i <= w; i += 6) d += ` l3 -3 l3 3`; return d; };
      const one = (dx, dy, fade) => `<g transform="translate(${dx} ${dy})" opacity="${fade}">
          <rect x="54" y="34" width="92" height="96" rx="4" fill="#fff" stroke="#D3DAE6"/>
          <path d="${zig(54, 37, 90)}" stroke="#D3DAE6" fill="none"/><path d="${zig(54, 127, 90)}" stroke="#D3DAE6" fill="none"/>
          <rect x="54" y="44" width="92" height="30" fill="${c}"/></g>`;
      return svg(p, `${one(14, 6, .55)}${one(0, 0, 1)}${txt(100, 63, ["SYNAKO"], 8, "#fff", "middle")}${txt(100, 92, L, 9, "#1B2A44", "middle")}
        <text x="100" y="120" font-family="DM Sans, sans-serif" font-size="7" fill="#5A6680" text-anchor="middle">${esc(p.pack)}</text>`);
    },
    jar(p) { // tub with lid
      const c = p.c, L = label(p);
      return svg(p, `
        <rect x="52" y="44" width="96" height="20" rx="6" fill="${shade(c, -.2)}"/>
        <path d="M56 64 h88 v54 q0 12 -12 12 h-64 q-12 0 -12 -12z" fill="#fff" stroke="#D3DAE6"/>
        <rect x="56" y="78" width="88" height="30" fill="${c}"/>
        ${txt(100, 92, L, 9, "#fff", "middle")}
      `);
    },
    spray(p) { // nasal spray
      const c = p.c, L = label(p);
      return svg(p, `
        <path d="M94 14 h12 l2 20 h-16z" fill="#F1F4F8" stroke="#C9D2E0"/>
        <rect x="84" y="34" width="32" height="12" rx="3" fill="#E9EDF3" stroke="#C9D2E0"/>
        <rect x="74" y="46" width="52" height="88" rx="12" fill="#fff" stroke="#D3DAE6"/>
        <rect x="74" y="70" width="52" height="44" fill="${c}"/>
        ${txt(100, 88, L, 8, "#fff", "middle")}
      `);
    },
    inhaler(p) {
      const c = p.c;
      return svg(p, `
        <rect x="82" y="16" width="34" height="92" rx="10" fill="${shade(c, .1)}"/>
        <rect x="90" y="8" width="18" height="40" rx="5" fill="#E9EDF3" stroke="#C9D2E0"/>
        <path d="M82 92 h34 v20 q0 16 -16 16 h-54 v-26 q0 -10 10 -10z" fill="${c}"/>
        <rect x="46" y="104" width="10" height="20" rx="3" fill="${shade(c, -.35)}"/>
        ${txt(99, 70, ["Rx"], 12, "#fff", "middle")}
      `);
    },
    device(p) { // electronic monitor
      const c = p.c;
      const big = p.id === "oximeter";
      return big ? svg(p, `
        <rect x="58" y="44" width="84" height="70" rx="22" fill="${c}"/>
        <rect x="70" y="56" width="60" height="30" rx="5" fill="#0D1626"/>
        <text x="84" y="77" font-family="DM Sans, monospace" font-size="15" font-weight="700" fill="#5FE0F2">98</text>
        <text x="110" y="77" font-family="DM Sans, monospace" font-size="11" font-weight="700" fill="#F2C94C">72</text>
        <circle cx="100" cy="100" r="5" fill="#E9EDF3"/>`)
        : svg(p, `
        <path d="M40 112 q-10 -40 30 -50" stroke="#9AA6BA" stroke-width="5" fill="none"/>
        <rect x="64" y="34" width="92" height="96" rx="16" fill="#F7F9FC" stroke="#D3DAE6"/>
        <rect x="76" y="46" width="68" height="44" rx="6" fill="#0D1626"/>
        <text x="110" y="70" font-family="DM Sans, monospace" font-size="17" font-weight="700" fill="#7CF0A6" text-anchor="middle">${p.id === "gluco" ? "5.4" : "120"}</text>
        <text x="110" y="83" font-family="DM Sans, monospace" font-size="9" font-weight="700" fill="#7CF0A6" text-anchor="middle">${p.id === "gluco" ? "mmol/L" : "80  72"}</text>
        <rect x="88" y="100" width="44" height="16" rx="8" fill="${c}"/>
        <text x="110" y="111" font-family="DM Sans, sans-serif" font-size="7" font-weight="700" fill="#fff" text-anchor="middle">START</text>`);
    },
    thermo(p) {
      const c = p.c;
      return svg(p, `<g transform="rotate(-30 100 80)">
        <rect x="40" y="70" width="110" height="22" rx="11" fill="#F7F9FC" stroke="#D3DAE6"/>
        <rect x="150" y="76" width="22" height="10" rx="5" fill="#B8C2D2"/>
        <rect x="58" y="74" width="42" height="14" rx="3" fill="#0D1626"/>
        <text x="79" y="85" font-family="DM Sans, monospace" font-size="10" font-weight="700" fill="#7CF0A6" text-anchor="middle">36.8</text>
        <circle cx="116" cy="81" r="5" fill="${c}"/></g>`);
    },
    kit(p) { // test cassette + box
      const c = p.c, L = label(p);
      return svg(p, `
        <rect x="36" y="30" width="96" height="80" fill="#fff"/><rect x="36" y="30" width="96" height="22" fill="${c}"/>
        ${txt(42, 68, L, 9, "#1B2A44")}
        <rect x="88" y="94" width="88" height="30" rx="8" fill="#F7F9FC" stroke="#D3DAE6"/>
        <rect x="118" y="102" width="30" height="14" rx="3" fill="#EEF1F6" stroke="#D3DAE6"/>
        <line x1="128" y1="103" x2="128" y2="115" stroke="${c}" stroke-width="2"/><line x1="138" y1="103" x2="138" y2="115" stroke="${c}" stroke-width="2" opacity=".35"/>
        <circle cx="102" cy="109" r="5" fill="#EEF1F6" stroke="#D3DAE6"/>
      `);
    },
    strips(p) {
      const c = p.c;
      return svg(p, `
        <rect x="72" y="26" width="44" height="16" rx="4" fill="${shade(c, -.25)}"/>
        <rect x="74" y="40" width="40" height="90" rx="8" fill="#fff" stroke="#D3DAE6"/>
        <rect x="74" y="64" width="40" height="40" fill="${c}"/>
        ${txt(94, 82, ["50"], 12, "#fff", "middle")}${txt(94, 96, ["strips"], 7, "#fff", "middle", 600)}
        <rect x="124" y="70" width="10" height="56" rx="2" fill="#F1F4F8" stroke="#C9D2E0"/><rect x="124" y="70" width="10" height="10" fill="${c}"/>
      `);
    },
    bar(p) { // soap bar
      const c = p.c, L = label(p);
      return svg(p, `
        <rect x="44" y="58" width="112" height="62" rx="26" fill="${c}" opacity=".85"/>
        <rect x="52" y="64" width="96" height="44" rx="20" fill="${shade(c, .25)}" opacity=".9"/>
        ${txt(100, 88, [L[0]], 11, "#fff", "middle")}
        <ellipse cx="70" cy="72" rx="12" ry="4" fill="#fff" opacity=".35"/>
      `);
    }
  };

  return function art(p) { n++; return (draw[p.form] || draw.box)(p); };
})();
