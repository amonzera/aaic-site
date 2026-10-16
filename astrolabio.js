/* AAIC · UFF — Astrolábio vivo.
   Mostra o céu real sobre o Instituto de Computação (22°54′S 43°08′O) no momento do acesso,
   como um astrolábio austral: projeção estereográfica a partir do polo norte celeste sobre o
   plano do equador (centro = polo sul celeste; borda da placa = trópico de Câncer).

   Camadas (três <svg> empilhados dentro de [data-astro-disc]):
     tímpano — fixo, depende só da latitude (horizonte, almucântaras, azimutes, zênite);
     rete    — gira com o tempo sidéreo local (estrelas, constelações, eclíptica, Sol, lupa);
     moldura — fixa (chão abaixo do horizonte, limbo com horas, graus e inscrição, eixo).

   Convenções: zênite para cima, leste à esquerda, céu girando no sentido horário — sem
   espelhamento. Órion aparece "como no hemisfério norte" porque fica além do zênite, e a placa
   não é espelhada como a bandeira do Brasil (que mostra o céu visto de fora). Não é bug.
   Coordenadas J2000 conferidas na SIMBAD; precisão muito acima do necessário.
   Sem dependências. A inscrição do limbo vem do atributo data-inscription do HTML. */
(() => {
  'use strict';

  const host = document.querySelector('[data-astrolabe]');
  const disc = host?.querySelector('[data-astro-disc]');
  if (!host || !disc) return;
  const readout = host.querySelector('[data-astro-readout]');

  /* ── Constantes ───────────────────────────────────────────────────────── */
  const LAT = -22.906;            // IC-UFF, campus da Praia Vermelha, Niterói
  const LON = -43.133;
  const EPS = 23.4393;            // obliquidade da eclíptica (J2000)
  const R = 100;                  // raio do equador no viewBox (-200…200)
  const D = Math.PI / 180;
  const PHI = Math.abs(LAT) * D;
  const RIM = rOf(EPS);           // trópico de Câncer = borda da placa (152,35)
  const LENS_ZOOM = 5;            // ampliação do Cruzeiro do Sul na lupa
  const TIME_ZONE = 'America/Sao_Paulo';

  /* ── Catálogo: [id, AR (h), Dec (°), magnitude, nome] ─────────────────── */
  const STARS = [
    ['sirius', 6.752, -16.72, -1.46, 'Sírius'], ['canopus', 6.399, -52.70, -0.74, 'Canopus'],
    ['rigilKent', 14.660, -60.83, -0.27, 'Alfa do Centauro'], ['arcturus', 14.261, 19.18, -0.05, 'Arcturo'],
    ['rigel', 5.242, -8.20, 0.13, 'Rigel'], ['procyon', 7.655, 5.22, 0.34, 'Prócion'],
    ['achernar', 1.629, -57.24, 0.46, 'Achernar'], ['betelgeuse', 5.920, 7.41, 0.50, 'Betelgeuse'],
    ['hadar', 14.064, -60.37, 0.61, 'Hadar'], ['altair', 19.846, 8.87, 0.76, 'Altair'],
    ['acrux', 12.443, -63.10, 0.76, 'Estrela de Magalhães'], ['aldebaran', 4.599, 16.51, 0.86, 'Aldebarã'],
    ['antares', 16.490, -26.43, 0.96, 'Antares'], ['spica', 13.420, -11.16, 0.97, 'Espiga'],
    ['fomalhaut', 22.961, -29.62, 1.16, 'Fomalhaut'], ['mimosa', 12.795, -59.69, 1.25, 'Mimosa'],
    ['regulus', 10.140, 11.97, 1.40, 'Régulo'], ['adhara', 6.977, -28.97, 1.50, 'Adhara'],
    ['shaula', 17.560, -37.10, 1.63, 'Shaula'], ['gacrux', 12.519, -57.11, 1.64, 'Rubídea'],
    ['bellatrix', 5.419, 6.35, 1.64, 'Bellatrix'], ['miaplacidus', 9.220, -69.72, 1.69, 'Miaplacidus'],
    ['alnilam', 5.604, -1.20, 1.69, 'Alnilam'], ['alnair', 22.137, -46.96, 1.74, 'Alnair'],
    ['alnitak', 5.679, -1.94, 1.77, 'Alnitak'], ['kaus', 18.403, -34.38, 1.81, 'Kaus Australis'],
    ['wezen', 7.140, -26.39, 1.84, 'Wezen'], ['sargas', 17.622, -43.00, 1.86, 'Sargas'],
    ['avior', 8.375, -59.51, 1.86, 'Avior'], ['atria', 16.811, -69.03, 1.91, 'Atria'],
    ['peacock', 20.427, -56.74, 1.94, 'Peacock'], ['mirzam', 6.378, -17.96, 1.98, 'Mirzam'],
    ['alphard', 9.460, -8.66, 1.98, 'Alfard'], ['nunki', 18.921, -26.30, 2.07, 'Nunki'],
    ['palida', 12.252, -58.75, 2.79, 'Pálida'], ['intrometida', 12.356, -60.40, 3.59, 'Intrometida'],
    ['mintaka', 5.533, -0.30, 2.23, 'Mintaka'], ['saiph', 5.796, -9.67, 2.07, 'Saiph'],
    ['meissa', 5.586, 9.93, 3.40, 'Meissa'], ['acrab', 16.091, -19.81, 2.62, 'Acrab'],
    ['dschubba', 16.006, -22.62, 2.29, 'Dschubba'], ['piSco', 15.981, -26.11, 2.89, 'π do Escorpião'],
    ['sigSco', 16.353, -25.59, 2.90, 'σ do Escorpião'], ['tauSco', 16.598, -28.22, 2.82, 'τ do Escorpião'],
    ['epsSco', 16.836, -34.29, 2.29, 'ε do Escorpião'], ['mu1Sco', 16.865, -38.05, 3.00, 'μ¹ do Escorpião'],
    ['zet2Sco', 16.910, -42.36, 3.62, 'ζ² do Escorpião'], ['etaSco', 17.203, -43.24, 3.32, 'η do Escorpião'],
    ['iot1Sco', 17.793, -40.13, 2.99, 'ι¹ do Escorpião'], ['girtab', 17.708, -39.03, 2.39, 'Girtab'],
    ['lesath', 17.513, -37.30, 2.70, 'Lesath'],
  ];

  /* Detalhes para o tooltip nativo (<title>). */
  const NOTES = {
    acrux: 'a mais brilhante do Cruzeiro do Sul',
    mimosa: 'representa o estado do Rio de Janeiro na bandeira',
    sirius: 'a estrela mais brilhante do céu noturno',
    alnitak: 'uma das Três Marias', alnilam: 'uma das Três Marias', mintaka: 'uma das Três Marias',
  };

  /* Figuras (polilinhas). O Cruzeiro é desenhado só na lupa. */
  const FIGURES = {
    orion: [['meissa', 'betelgeuse', 'alnitak', 'saiph'], ['meissa', 'bellatrix', 'mintaka', 'rigel'],
      ['betelgeuse', 'bellatrix'], ['mintaka', 'alnilam', 'alnitak']],
    scorpius: [['acrab', 'dschubba', 'piSco'], ['dschubba', 'sigSco', 'antares', 'tauSco', 'epsSco', 'mu1Sco',
      'zet2Sco', 'etaSco', 'sargas', 'iot1Sco', 'girtab', 'shaula', 'lesath']],
  };
  const CRUX = ['acrux', 'mimosa', 'gacrux', 'palida', 'intrometida'];
  const CRUX_LINES = [['acrux', 'gacrux'], ['mimosa', 'palida']];
  // Antares, Rigel e Betelgeuse ficam sem rótulo próprio: os nomes das figuras já os cobrem.
  const LABELLED = ['sirius', 'canopus', 'rigilKent', 'arcturus', 'procyon', 'achernar', 'aldebaran',
    'spica', 'fomalhaut', 'altair', 'regulus'];
  const LABEL_SHORT = { rigilKent: 'α Centauro' };

  /* Constelações citadas na legenda, pela estrela de referência. */
  const HIGHLIGHTS = [['acrux', 'Cruzeiro do Sul'], ['alnilam', 'Órion'], ['antares', 'Escorpião']];

  /* ── Geometria ────────────────────────────────────────────────────────── */
  function rOf(dec) {
    return R * Math.tan(((90 + dec) * D) / 2);
  }

  // Posição na rete com tempo sidéreo 0 (a rotação = TSL é aplicada depois).
  const pos = (ra, dec) => {
    const r = rOf(dec);
    const a = ra * 15 * D;
    return [-r * Math.sin(a), -r * Math.cos(a)];
  };

  // Almucântara de altitude h: círculo centrado no meridiano.
  const almucantar = (h) => {
    const k = Math.sin(PHI) + Math.sin(h * D);
    return { cy: (-R * Math.cos(PHI)) / k, r: (R * Math.cos(h * D)) / k };
  };

  const f = (n) => Math.round(n * 100) / 100;
  const circle = (cx, cy, r, cls, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" class="${cls}"${extra}/>`;
  const ring = (r) => `M${f(-r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  const diamond = (x, y, s) => `M${f(x)} ${f(y - s)}L${f(x + s)} ${f(y)}L${f(x)} ${f(y + s)}L${f(x - s)} ${f(y)}Z`;

  /* Monograma AAIC (logo primária) no eixo: o mesmo "d" do símbolo aaic-monograma de assets/icons.svg. */
  const MONOGRAM = { viewBox: '272.47 651 378 481.71', ratio: 378 / 481.71, d: 'M410.17 675.11 L362.17 708.51 L354.77 731.81 L343.17 721.71 L272.47 771.11 L272.47 1012 L306.87 1036.1 L306.87 934 L341.27 909.9 L341.27 1060.4 L375.67 1084.5 L375.67 885.81 L410.07 861.71 L410.07 1108.51 L444.47 1132.71 L444.47 651 Z M341.27 868.51 L306.87 892.61 L306.87 788.61 L341.27 764.51 Z M410.07 820.31 L376.87 843.71 L375.67 844.51 L375.67 740.41 L410.07 716.31 Z M513.17 675.11 L513.17 1108.51 L478.77 1132.71 L478.77 651.01 Z M616.07 852.91 L616.07 788.61 L581.67 764.71 L581.67 1019.21 L616.07 995.31 L616.07 931.01 L650.47 907.31 L650.47 1012.51 L547.57 1084.51 L547.57 699.21 L582.97 724.01 L650.47 771.21 L650.47 877.01 Z' };

  const escapeXml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ── Tempo ────────────────────────────────────────────────────────────── */
  const daysSinceJ2000 = (t) => (t - 946728e6) / 864e5;   // J2000.0 = 2000-01-01T12:00Z

  // Tempo sidéreo local em graus (Meeus 12.4; precisão de segundos, suficiente aqui).
  const siderealDeg = (t) => {
    const deg = 280.46061837 + 360.98564736629 * daysSinceJ2000(t) + LON;
    return ((deg % 360) + 360) % 360;
  };

  // Posição aparente do Sol (baixa precisão, ~0,01°).
  const sunRaDec = (t) => {
    const d = daysSinceJ2000(t);
    const L = 280.46 + 0.9856474 * d;
    const g = (357.528 + 0.9856003 * d) * D;
    const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D;
    const ra = Math.atan2(Math.cos(EPS * D) * Math.sin(lambda), Math.cos(lambda)) / D / 15;
    const dec = Math.asin(Math.sin(EPS * D) * Math.sin(lambda)) / D;
    return [(ra + 24) % 24, dec];
  };

  const altitude = (ra, dec, lst) => {
    const H = (lst - ra * 15) * D;
    const lat = LAT * D;
    return Math.asin(Math.sin(lat) * Math.sin(dec * D) + Math.cos(lat) * Math.cos(dec * D) * Math.cos(H)) / D;
  };

  /* ── Construção das camadas ───────────────────────────────────────────── */
  const byId = Object.fromEntries(STARS.map(([id, ra, dec, mag, name]) => [id, { id, ra, dec, mag, name, xy: pos(ra, dec) }]));
  const svgOpen = (cls) => `<svg class="astro-layer ${cls}" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false">`;

  function buildTympan() {
    const horizon = almucantar(0);
    const zenithY = almucantar(90).cy;
    const nadirY = (-R * Math.cos(PHI)) / (Math.sin(PHI) - 1);
    const midY = (zenithY + nadirY) / 2;
    const sec = 1 / Math.cos(PHI);

    let almus = '';
    for (let h = 10; h < 90; h += 10) {
      const { cy, r } = almucantar(h);
      almus += circle(0, cy, r, 'astro-almu');
    }

    let azimuths = `<path d="M0 ${f(zenithY)}L0 ${f(horizon.cy + horizon.r)}" class="astro-azi"/>`;
    for (const A of [30, 60, 90, 120, 150]) {
      const a = A * D;
      azimuths += circle((R * sec * Math.cos(a)) / Math.sin(a), midY, (R * sec) / Math.sin(a), 'astro-azi');
    }

    const twilight = almucantar(-18);
    // Pontos onde o horizonte toca a borda da placa (para os rótulos ORIENS e OCCIDENS).
    const yEdge = (RIM * RIM - horizon.r * horizon.r + horizon.cy * horizon.cy) / (2 * horizon.cy);
    const xEdge = Math.sqrt(RIM * RIM - yEdge * yEdge);

    return `${svgOpen('astro-tympan')}
      <defs>
        <radialGradient id="astro-plate-fill" cx="0" cy="0" r="${f(RIM)}" gradientUnits="userSpaceOnUse">
          <stop offset="0" class="astro-stop-1"/><stop offset="1" class="astro-stop-2"/>
        </radialGradient>
        <clipPath id="astro-clip-plate"><circle r="${f(RIM)}"/></clipPath>
        <clipPath id="astro-clip-sky"><circle cy="${f(horizon.cy)}" r="${f(horizon.r)}"/></clipPath>
        <path id="astro-horizon-path" d="M${f(-xEdge)} ${f(yEdge)}A${f(horizon.r)} ${f(horizon.r)} 0 0 0 ${f(xEdge)} ${f(yEdge)}"/>
      </defs>
      <circle r="${f(RIM)}" fill="url(#astro-plate-fill)"/>
      <g clip-path="url(#astro-clip-plate)">
        ${circle(0, 0, rOf(-EPS), 'astro-ring astro-ring--faint')}
        ${circle(0, 0, R, 'astro-ring astro-ring--faint')}
        <g clip-path="url(#astro-clip-sky)">${azimuths}${almus}</g>
        ${circle(0, twilight.cy, twilight.r, 'astro-twilight')}
        ${circle(0, horizon.cy, horizon.r, 'astro-horizon')}
      </g>
      <path d="M-4 ${f(zenithY)}h8M0 ${f(zenithY - 4)}v8" class="astro-zenith"/>
      <text class="astro-cardinal" dy="-3.5"><textPath href="#astro-horizon-path" startOffset="7%">ORIENS</textPath></text>
      <text class="astro-cardinal" dy="-3.5"><textPath href="#astro-horizon-path" startOffset="93%" text-anchor="end">OCCIDENS</textPath></text>
    </svg>`;
  }

  function buildRete(t) {
    // Eclíptica: tangente aos dois trópicos; centro deslocado na direção de AR 6h.
    const [ex, ey] = pos(6, 0).map((v) => (v / R) * R * Math.tan(EPS * D));
    let html = circle(ex, ey, R / Math.cos(EPS * D), 'astro-ecliptic');

    for (const lines of Object.values(FIGURES)) {
      const d = lines.map((ids) => ids.map((id, i) => `${i ? 'L' : 'M'}${f(byId[id].xy[0])} ${f(byId[id].xy[1])}`).join('')).join('');
      html += `<path d="${d}" class="astro-fig"/>`;
    }

    for (const star of STARS.map(([id]) => byId[id])) {
      if (star.dec > EPS || CRUX.includes(star.id)) continue;
      const [x, y] = star.xy;
      const s = Math.max(0.6, 2.6 - 0.55 * star.mag) * 1.15;
      const note = NOTES[star.id] ? ` — ${NOTES[star.id]}` : '';
      if (star.mag < 0.5) html += circle(x, y, s * 2.4, 'astro-glow');
      html += `<path d="${diamond(x, y, s)}" class="astro-star${star.mag > 2.5 ? ' astro-star--dim' : ''}"><title>${escapeXml(star.name + note)}</title></path>`;
    }

    // Sol: posição de hoje sobre a eclíptica.
    const [sx, sy] = pos(...sunRaDec(t));
    html += `<g><title>Sol</title>${circle(sx, sy, 3.4, 'astro-sun')}${circle(sx, sy, 0.95, 'astro-sun-core')}</g>`;

    // Lupa do Cruzeiro do Sul: perto do polo a projeção encolhe e o Cruzeiro viraria um borrão.
    const cruxPts = CRUX.map((id) => byId[id].xy);
    const cx = cruxPts.reduce((sum, p) => sum + p[0], 0) / cruxPts.length;
    const cy = cruxPts.reduce((sum, p) => sum + p[1], 0) / cruxPts.length;
    const dist = Math.hypot(cx, cy);
    const push = 30;                                    // a lupa fica deslocada para fora, com linha-guia
    const lx = cx * (1 + push / dist);
    const ly = cy * (1 + push / dist);
    const zoom = ([x, y]) => [lx + (x - cx) * LENS_ZOOM, ly + (y - cy) * LENS_ZOOM];
    const lensR = Math.max(...cruxPts.map((p) => Math.hypot(p[0] - cx, p[1] - cy))) * LENS_ZOOM + 6;
    const ux = (lx - cx) / Math.hypot(lx - cx, ly - cy);
    const uy = (ly - cy) / Math.hypot(lx - cx, ly - cy);

    let lens = `<path d="M${f(cx + ux * 3)} ${f(cy + uy * 3)}L${f(lx - ux * lensR)} ${f(ly - uy * lensR)}" class="astro-ring"/>`;
    lens += circle(cx, cy, 3, 'astro-ring');
    lens += circle(lx, ly, lensR, 'astro-lens-bg');
    lens += circle(lx, ly, lensR - 2.2, 'astro-lens-rim astro-lens-rim--inner');
    lens += `<path d="${CRUX_LINES.map((ids) => ids.map((id, i) => {
      const [x, y] = zoom(byId[id].xy);
      return `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
    }).join('')).join('')}" class="astro-fig"/>`;
    for (const id of CRUX) {
      const star = byId[id];
      const [x, y] = zoom(star.xy);
      const s = Math.max(0.9, 2.6 - 0.55 * star.mag) * 1.3;
      const note = NOTES[id] ? ` — ${NOTES[id]}` : '';
      lens += `<path d="${diamond(x, y, s)}" class="astro-star"><title>${escapeXml(`${star.name} (Cruzeiro do Sul)${note}`)}</title></path>`;
    }
    lens += circle(lx, ly, lensR, 'astro-lens-rim');
    html += `<g>${lens}</g>`;

    // Rótulos: ficam em pé (contrarrotação por CSS) e aparecem depois da entrada.
    const label = (x, y, text, cls = '') => `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" dominant-baseline="central" class="astro-label${cls}">${escapeXml(text)}</text>`;
    const outward = ([x, y], by) => {
      const d = Math.hypot(x, y) || 1;
      return [x + (x / d) * by, y + (y / d) * by];
    };
    let labels = '';
    for (const id of LABELLED) {
      const star = byId[id];
      if (star.dec > EPS) continue;
      labels += label(...outward(star.xy, 7.5), LABEL_SHORT[id] || star.name);
    }
    const centroid = (ids) => ids.map((id) => byId[id].xy).reduce((a, p) => [a[0] + p[0] / ids.length, a[1] + p[1] / ids.length], [0, 0]);
    labels += label(...outward(centroid(['betelgeuse', 'bellatrix', 'rigel', 'saiph']), 17), 'ÓRION', ' astro-label--fig');
    labels += label(...outward(centroid(['alnitak', 'alnilam', 'mintaka']), -9), 'TRÊS MARIAS', ' astro-label--fig');
    labels += label(...outward(centroid(['antares', 'tauSco', 'epsSco', 'mu1Sco']), 11), 'ESCORPIÃO', ' astro-label--fig');
    labels += label(lx + ux * (lensR + 8), ly + uy * (lensR + 8), 'CRUZEIRO ×5', ' astro-label--fig');

    return `${svgOpen('astro-rete')}
      <defs><clipPath id="astro-clip-rete"><circle r="${f(RIM)}"/></clipPath></defs>
      <g clip-path="url(#astro-clip-rete)">${html}<g class="astro-labels">${labels}</g></g>
    </svg>`;
  }

  function buildFrame(inscription) {
    const horizon = almucantar(0);
    const inner = RIM + 1.5;

    // Marcações de 1°, 5° e 15° num único path cada.
    const tick = (a, r1, r2) => {
      const s = Math.sin(a * D);
      const c = Math.cos(a * D);
      return `M${f(r1 * s)} ${f(-r1 * c)}L${f(r2 * s)} ${f(-r2 * c)}`;
    };
    let minor = '';
    let major = '';
    for (let a = 0; a < 360; a += 1) {
      if (a % 15 === 0) major += tick(a, 170, 180.5);
      else if (a % 5 === 0) minor += tick(a, 170, 176.5);
      else minor += tick(a, 170, 173.5);
    }

    // XII no topo e as horas crescendo no sentido horário (VI à esquerda e à direita).
    // Na metade de baixo o numeral é desvirado, para não ler "IIX" no lugar de XII.
    const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    let numerals = '';
    for (let h = 0; h < 24; h += 1) {
      const angle = (h - 12) * 15;
      const lower = Math.abs(angle) > 90;
      numerals += `<text transform="rotate(${angle}) translate(0 -162)${lower ? ' rotate(180)' : ''}" text-anchor="middle" dominant-baseline="central" class="astro-numeral">${ROMAN[h % 12 || 12]}</text>`;
    }

    // Inscrição: metade de cima (horária) e metade de baixo (anti-horária, legível).
    const parts = inscription.split(' · ');
    let half = 0;
    let best = Infinity;
    for (let i = 1; i < parts.length; i += 1) {
      const left = parts.slice(0, i).join(' · ').length;
      const diff = Math.abs(left - (inscription.length - left));
      if (diff < best) { best = diff; half = i; }
    }
    const top = parts.slice(0, half).join(' · ');
    const bottom = parts.slice(half).join(' · ');

    return `${svgOpen('astro-frame')}
      <defs>
        <clipPath id="astro-clip-ground"><circle r="${f(RIM)}"/></clipPath>
        <path id="astro-ins-top" d="M-186 0A186 186 0 0 1 186 0"/>
        <path id="astro-ins-bottom" d="M-194.5 0A194.5 194.5 0 0 0 194.5 0"/>
      </defs>
      <path d="${ring(RIM)}M0 ${f(horizon.cy - horizon.r)}a${f(horizon.r)} ${f(horizon.r)} 0 1 0 0.01 0Z" fill-rule="evenodd" clip-path="url(#astro-clip-ground)" class="astro-ground"/>
      <path d="${ring(199.5)}${ring(RIM)}" fill-rule="evenodd" class="astro-limb"/>
      ${circle(0, 0, inner, 'astro-ring')}${circle(0, 0, 170, 'astro-ring')}${circle(0, 0, 181, 'astro-ring')}${circle(0, 0, 199.5, 'astro-ring')}
      <path d="${minor}" class="astro-ticks"/>
      <path d="${major}" class="astro-ticks astro-ticks--major"/>
      ${numerals}
      <text class="astro-inscription"><textPath href="#astro-ins-top" startOffset="50%" text-anchor="middle">${escapeXml(top)}</textPath></text>
      <text class="astro-inscription"><textPath href="#astro-ins-bottom" startOffset="50%" text-anchor="middle">${escapeXml(bottom)}</textPath></text>
      <g>
        ${circle(0, 0, 10, 'astro-pin')}
        <svg x="${f(-6.2 * MONOGRAM.ratio)}" y="-6.2" width="${f(12.4 * MONOGRAM.ratio)}" height="12.4" viewBox="${MONOGRAM.viewBox}" class="astro-pin-mark"><path fill-rule="evenodd" d="${MONOGRAM.d}"/></svg>
      </g>
    </svg>`;
  }

  /* ── Montagem ─────────────────────────────────────────────────────────── */
  const now = Date.now();
  const inscription = host.dataset.inscription || 'SIC ITVR AD ASTRA · AAIC · VFF · NICTHEROY';
  try {
    disc.innerHTML = buildTympan() + buildRete(now) + buildFrame(inscription);
  } catch (error) {
    // Ex.: um id digitado errado em FIGURES/CRUX. Em vez de sumir, mostra o retrato estático.
    console.error('Astrolábio: falha ao montar o SVG; usando a imagem estática.', error);
    disc.innerHTML = '<img class="astro-fallback" src="assets/img/astrolabio.svg" alt="" width="640" height="640">';
    return;
  }

  const tympan = disc.querySelector('.astro-tympan');
  const rete = disc.querySelector('.astro-rete');
  const frame = disc.querySelector('.astro-frame');

  /* ── Legenda (informação em texto; o SVG é decorativo) ────────────────── */
  const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
  const hhmm = (hours) => {
    const total = Math.round(hours * 60) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}h${String(total % 60).padStart(2, '0')}`;
  };
  const list = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`);

  const describe = (t, lst) => {
    const local = clock.format(t).replace(':', 'h');
    const up = HIGHLIGHTS.filter(([id]) => altitude(byId[id].ra, byId[id].dec, lst) > 5).map(([, name]) => name);
    const sunUp = altitude(...sunRaDec(t), lst) > 0;
    const sky = up.length ? `acima do horizonte: ${list(up)}` : 'Cruzeiro, Órion e Escorpião abaixo do horizonte';
    return `Céu sobre o IC agora · ${local} em Niterói · tempo sidéreo ${hhmm(lst / 15)} · ${sky}${sunUp ? ' (é dia: o Sol ofusca as estrelas)' : ''}`;
  };

  /* ── Relógio: a rete gira com o tempo sidéreo ─────────────────────────── */
  let angle = siderealDeg(now);
  let ready = false;
  let inView = true;
  let timer = 0;

  const update = () => {
    const t = Date.now();
    const lst = siderealDeg(t);
    let next = lst;
    while (next < angle - 180) next += 360;      // ângulo só cresce: sem voltas inteiras em 360°
    angle = next;
    disc.style.setProperty('--lst', `${angle.toFixed(3)}deg`);
    if (readout) readout.textContent = describe(t, lst);
  };

  // Atualiza na virada de cada minuto (a legenda mostra hh:mm).
  const tick = () => {
    update();
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = 0;
    if (!ready || !inView || document.hidden) return;
    tick();
  };

  const start = () => {
    ready = true;
    disc.dataset.ready = '';
    schedule();
  };

  new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting; // a entrada mais recente do lote
    schedule();
  }).observe(disc);
  document.addEventListener('visibilitychange', schedule);
  addEventListener('pageshow', (event) => { if (event.persisted) schedule(); });

  disc.style.setProperty('--lst', `${angle.toFixed(3)}deg`);
  if (readout) readout.textContent = describe(now, angle);

  /* ── Entrada: o céu avança até agora (só transform/opacity, no compositor) ── */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof rete.animate !== 'function') {
    start();
    return;
  }

  const ease = 'cubic-bezier(0.32, 0.72, 0, 1)';
  frame.animate(
    [{ opacity: 0, transform: 'rotate(-12deg) scale(0.97)' }, { opacity: 1, transform: 'none' }],
    { duration: 1500, easing: ease, fill: 'backwards' }
  );
  tympan.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, delay: 250, easing: ease, fill: 'backwards' });
  rete.style.willChange = 'transform';
  const spin = rete.animate(
    [{ opacity: 0, transform: `rotate(${angle - 120}deg)` }, { opacity: 1, transform: `rotate(${angle}deg)` }],
    { duration: 2600, delay: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
  );
  spin.finished.then(() => {
    rete.style.willChange = '';
    start();
  }, start);
})();
