// Cascade : ton appli d'origine (HTML et code inchangés), livrée en plugin.
// Ses données sont dans le dossier du plugin, que NeoDex sauvegarde (synchro cloud et sauvegardes) ; à la première ouverture elle reprend ce que tu avais dans NeoDex.
// Elle tourne dans le bac à sable de NeoDex, avec ses outils d'interface (ctx.host) et seulement les autorisations de son plugin.json.
const HTML = "<div class=\"appWrap\">\n      <div class=\"agHead\"><span class=\"label\">Cascade</span><span class=\"hint\" id=\"caInfo\"></span><div class=\"agNav\"><select class=\"f gSel\" id=\"caMode\" title=\"Mode de jeu\"></select></div></div>\n      <div class=\"gameBox tall\"><canvas id=\"caCanvas\" width=\"240\" height=\"320\" tabindex=\"0\"></canvas></div>\n      <div class=\"row\" style=\"justify-content:center;margin-top:8px\"><button class=\"btn px\" id=\"caSnd\">SON : TOUT</button><button class=\"btn px\" id=\"caFs\">PLEIN ÉCRAN</button></div>\n      <div class=\"hint\">← → ou Q D : déplacer · ↑, X ou W : tourner (Z : dans l'autre sens) · ↓ : descendre vite · espace : poser d'un coup · C ou Maj : réserve · P ou Échap : pause. Manette : croix ou stick pour déplacer, bas pour descendre vite, haut pour poser d'un coup, A et B pour tourner, X ou les gâchettes pour la réserve, Start pour la pause. Une ligne pleine se casse, et aussi tout groupe de 9 blocs de la même couleur (fusion). Les blocs qui pendent retombent ensuite un par un : de nouvelles lignes ou fusions font des chaînes qui multiplient les points. Les cristaux ne se cassent qu'avec une ligne ; une bombe fait sauter le carré autour d'elle. Marathon, Zen ou 24 défis à trois étoiles, sauvegardés et synchronisés.</div>\n    </div>";
/*CSS-MOVED*/ const CSS = `.gameBox{display:grid;place-items:center;padding:10px;background:#05010b;box-shadow:0 0 0 3px var(--line2)}
.gameBox canvas{width:min(100%,1152px);aspect-ratio:384/144;image-rendering:pixelated;cursor:var(--cp,pointer)}
.gameBox.tall canvas{width:min(100%,max(240px,calc((100vh - 270px) * 240 / 320)));height:auto;aspect-ratio:240/320}
.gameBox:fullscreen{padding:0;display:grid;place-items:center;background:#05010b}
.gameBox.tall:fullscreen canvas{width:min(100vw,calc(100vh * 240 / 320))}
.gSel{width:auto;font-size:14px;padding:6px 10px;margin-right:8px}
.tqTile.hole{transition:opacity .4s}
`;  // le style de ce plugin (il utilise les variables du thème de NeoDex)
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const host = ctx.host, { el, toast, sfx, ask, newTab, pixIcon, PIX, WX } = host;
  const folder = ctx.folder, legacy = ctx.legacy || {};
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  const $ = id => id === "cascadeApp" ? view : (view.querySelector('#' + id) || document.getElementById(id));  // les identifiants de ta vue d'abord, puis ceux de la page (fenêtres, menus)
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const __icon = () => ctx.icon;  // l'icône de ce plugin
  const LEGACY_GAMES = {"top":["cascade"],"best":"^cascade"};
  let games = await doc('games');
  if (games == null) {  // première ouverture : tu retrouves tes records et tes parties d'avant
    const old = legacy.api ? await legacy.api('games').catch(() => null) : null; games = { best: {} };
    if (old) { const re = new RegExp(LEGACY_GAMES.best); for (const [k, v] of Object.entries(old.best || {})) if (re.test(k)) games.best[k] = v; for (const k of LEGACY_GAMES.top) if (old[k] !== undefined) games[k] = old[k]; await folder.write('games', games); }
  }
  games = { best: {}, ...games };
  let gamesTimer = null;
  const saveGames = () => { clearTimeout(gamesTimer); gamesTimer = setTimeout(() => { gamesTimer = null; folder.write('games', games).catch(() => {}); }, 500); };
  const best = (k, v, higher = true) => { const b = games.best[k]; if (b == null || (higher ? v > b : v < b)) { games.best[k] = v; saveGames(); return true; } return false; };
  const gstore = (k, init) => (games[k] ??= init);  // la section d'un jeu
function gameLoop(st, appKey, update, draw) {
  cancelAnimationFrame(st.raf);
  const STEP = 1000 / 60; let acc = 0, last = performance.now();
  const frame = t => {
    if (!view.classList.contains('on')) { st.raf = 0; if (st.mode === 'play') st.mode = 'pause'; return; }  // leaving the tab pauses the game
    st.raf = requestAnimationFrame(frame);
    acc += Math.min(200, t - last); last = t;
    while (acc >= STEP) { if (st.mode === 'play') update(); st.tick++; acc -= STEP; }
    draw();
  };
  st.raf = requestAnimationFrame(frame);
}
function gameText(g, w, lines, y0) {  // centred pixel-font lines over a dark band
  g.fillStyle = 'rgba(11,3,28,.72)'; g.fillRect(0, y0 - 14, w, lines.length * 14 + 14);
  g.textAlign = 'center';
  lines.forEach(([text, color, size], i) => { g.fillStyle = color; g.font = (size || 8) + 'px "Press Start 2P", monospace'; g.fillText(text, w / 2, y0 + i * 14); });
  g.textAlign = 'left';
}
const px = (g, color, x, y, w = 1, h = 1) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); };
function sprite(g, rows, x, y, pal) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = pal[r[i]]; if (c) px(g, c, x + i, y + j); } }); }
  // ---- ton code d'origine ----
/* ---------- jeu "Cascade": a falling-block puzzle of NeoDex's own. Shards of 3 to 5 pixels fall into a 10 x 20 well; a full row breaks,
   and so does any group of 7 blocks of the same colour ("fusion"). After a break the blocks left hanging fall one by one, which can make
   new rows or fusions: chains multiply the score. Crystals (in the challenges) only break with a row, bombs blow up a 3 x 3 square.
   Modes: Marathon (faster every 8 rows), Zen (no speed-up) and 24 challenges with stars. Records and stars in games.json (synced). ---------- */
const CA = {W: 240, H: 320, COLS: 10, ROWS: 20, S: 14, X: 10, Y: 24,
  // colours: base, light, dark
  col: [['#ff5ad9', '#ffb0ec', '#a0207e'], ['#7fe0ee', '#d4f8ff', '#2a8a9e'], ['#ffd07a', '#fff0c8', '#b8741c'], ['#8ee8a0', '#d8ffe0', '#2f8f4a'], ['#b46aee', '#e4c8ff', '#5e2aa0'], ['#ff7a4f', '#ffc8b0', '#a8381c']],
  // the shards: 3 to 5 pixels, smaller ones more often
  shapes: [
    {n: 'I3', w: 1.5, c: [[0, 0], [1, 0], [2, 0]]}, {n: 'V3', w: 1.5, c: [[0, 0], [0, 1], [1, 1]]},
    {n: 'I4', w: 2, c: [[0, 0], [1, 0], [2, 0], [3, 0]]}, {n: 'O4', w: 2, c: [[0, 0], [1, 0], [0, 1], [1, 1]]}, {n: 'T4', w: 2, c: [[0, 0], [1, 0], [2, 0], [1, 1]]},
    {n: 'L4', w: 2, c: [[0, 0], [0, 1], [0, 2], [1, 2]]}, {n: 'Z4', w: 2, c: [[0, 0], [1, 0], [1, 1], [2, 1]]},
    {n: 'P5', w: 1, c: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]}, {n: 'U5', w: 1, c: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]}, {n: 'X5', w: .5, c: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]},
    {n: 'L5', w: .7, c: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]]}, {n: 'Y5', w: .7, c: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]]},
  ],
  FUSE: 9, LOCK: 24, MOVES: 10,  // moins facile : il faut 9 blocs d'une couleur, moins de temps pour glisser une pièce posée
};
// the 24 challenges: goals in rows, crystals, fusions, chains or score, with a starting heap for some
const CA_LEVELS = [
  ['Premiers éclats', {rows: 8}, {}], ['Arc-en-ciel', {fusions: 2}, {}], ['Fondations', {gems: 3}, {heap: 3, gems: 3}], ['En chaîne', {chain: 2}, {heap: 4}],
  ['Vitesse lumière', {rows: 12}, {speed: 5}], ['Mine de cristal', {gems: 6}, {heap: 6, gems: 6}], ['Fusion double', {fusions: 4}, {speed: 2}], ['Compte à rebours', {score: 6000, time: 120}, {}],
  ['Économie', {rows: 10, pieces: 36}, {}], ['Grotte profonde', {gems: 8}, {heap: 8, gems: 8}], ['Réaction', {chain: 3}, {heap: 6}], ['Tempête', {rows: 20}, {speed: 8}],
  ['Prisme', {fusions: 6}, {speed: 4}], ['Course', {score: 12000, time: 150}, {speed: 3}], ['Filon', {gems: 10}, {heap: 9, gems: 10}], ['Cascade', {chain: 4}, {heap: 7}],
  ['Précision', {rows: 14, pieces: 45}, {speed: 4}], ['Faille', {gems: 12}, {heap: 11, gems: 12, speed: 3}], ['Fournaise', {score: 20000, time: 180}, {speed: 6}], ['Kaléidoscope', {fusions: 10}, {speed: 6}],
  ['Avalanche', {rows: 30}, {speed: 10}], ['Cœur de cristal', {gems: 16}, {heap: 13, gems: 16, speed: 4}], ['Chaîne infinie', {chain: 5}, {heap: 9, speed: 3}], ['Supernova', {score: 40000, time: 240}, {speed: 9}],
];
const caSave = () => gstore('cascade', {best: {}, stars: {}, rows: 0, games: 0, chain: 0});
const caGoalText = g => g.rows ? g.rows + ' lignes' + (g.pieces ? ' en ' + g.pieces + ' pièces' : '') : g.gems ? 'Casser ' + g.gems + ' cristaux' : g.fusions ? g.fusions + ' fusions' : g.chain ? 'Une chaîne de ' + g.chain : g.score + ' points en ' + Math.round(g.time / 60) + ' min';
let ca = null;
// ---- les sons et la petite musique, faits sur place (Web Audio) ; le bouton SON : tout, effets seulement, ou rien
let caAc = null;
const caAudio = () => { try { caAc ??= new AudioContext(); if (caAc.state === 'suspended') caAc.resume(); return caAc; } catch { return null; } };
function caTone(f, d, {type = 'square', vol = .05, slide = 0, at = 0} = {}) {
  if (!ca || ca.mode === 'check' || (caSave().snd || 0) === 2) return; const ac = caAudio(); if (!ac) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02);
}
function caNoise(d, vol) {  // un souffle (bombe, pièce posée d'un coup)
  if (!ca || ca.mode === 'check' || (caSave().snd || 0) === 2) return; const ac = caAudio(); if (!ac) return;
  const n = Math.ceil(ac.sampleRate * d), buf = ac.createBuffer(1, n, ac.sampleRate), data = buf.getChannelData(0); for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = ac.createBufferSource(), g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.value = vol; src.buffer = buf; src.connect(lp).connect(g).connect(ac.destination); src.start();
}
const caSemi = (f, s) => f * 2 ** (s / 12);
const CA_SFX = {
  move: () => caTone(220, .03, {vol: .02}),
  rot: () => caTone(440, .05, {vol: .025, slide: 660}),
  hold: () => caTone(330, .08, {type: 'triangle', vol: .05, slide: 495}),
  lock: () => caTone(120, .09, {type: 'triangle', vol: .08, slide: 70}),
  drop: () => { caTone(170, .14, {type: 'triangle', vol: .1, slide: 55}); caNoise(.1, .06); },
  clear: (rows, chain) => [0, 4, 7, 12].slice(0, 1 + Math.min(3, rows)).forEach((s, i) => caTone(caSemi(392, s + (chain - 1) * 2), .12, {at: i * .06, vol: .045})),
  fusion: () => [0, 7, 12, 19].forEach((s, i) => caTone(caSemi(523, s), .2, {type: 'triangle', at: i * .045, vol: .06})),
  boom: () => { caNoise(.5, .22); caTone(90, .4, {type: 'sawtooth', vol: .07, slide: 30}); },
  gem: () => caTone(1568, .3, {type: 'sine', vol: .05, slide: 2093}),
  chain: n => [0, 4, 7, 12, 16, 19].slice(0, Math.min(6, n + 2)).forEach((s, i) => caTone(caSemi(659, s), .1, {at: .18 + i * .05, vol: .04})),
  over: () => [0, -3, -7, -12].forEach((s, i) => caTone(caSemi(330, s), .28, {type: 'triangle', at: i * .18, vol: .07})),
  win: () => [0, 4, 7, 12, 7, 12].forEach((s, i) => caTone(caSemi(523, s), .14, {at: i * .1, vol: .045})),
};
// la musique : 32 croches en la mineur (la, fa, sol, mi), mélodie douce et basse ; elle accélère avec le niveau et ne joue que pendant la partie
const CA_MEL = [12, null, 15, 17, 19, null, 17, 15, 12, null, 8, 12, 15, null, null, null, 14, null, 15, 17, 19, null, 22, 19, 16, null, 14, 12, 11, null, null, null];
const CA_BASS = [-24, -12, -28, -16, -26, -14, -29, -17];
const caMus = {step: 0, at: 0};
function caMusic() {  // appelée à chaque image : prépare les notes du quart de seconde qui vient
  if (!ca || ca.mode !== 'play' || (caSave().snd || 0) !== 0 || !caAc) { caMus.at = 0; return; }
  const ac = caAc, eighth = 30 / Math.min(168, 108 + ca.level * 5);
  if (caMus.at < ac.currentTime) caMus.at = ac.currentTime + .05;
  while (caMus.at < ac.currentTime + .25) {
    const i = caMus.step++ % 32, m = CA_MEL[i], at = caMus.at - ac.currentTime;
    if (m != null) caTone(caSemi(440, m), eighth * 1.6, {type: 'square', vol: .014, at});
    if (i % 2 === 0) caTone(caSemi(440, CA_BASS[(i >> 3) * 2 + (i % 8 === 4 ? 1 : 0)]), eighth * 1.8, {type: 'triangle', vol: .05, at});
    caMus.at += eighth;
  }
}
const CA_STAR = ['....y....', '...yyy...', '...ywy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '..yy.yy..', '.yy...yy.', 'y.......y'];
function caRot(cells) {  // a quarter turn clockwise, moved back to the top-left corner
  const r = cells.map(([x, y]) => [-y, x]), mx = Math.min(...r.map(c => c[0])), my = Math.min(...r.map(c => c[1]));
  return r.map(([x, y]) => [x - mx, y - my]);
}
function caBag() {  // shapes drawn by weight, never three times the same in a row
  const tot = CA.shapes.reduce((a, s) => a + s.w, 0);
  for (;;) { let r = Math.random() * tot; const s = CA.shapes.find(s => (r -= s.w) < 0) || CA.shapes[0]; const h = ca.hist; if (!(h[0] === s.n && h[1] === s.n)) { h.unshift(s.n); h.length = 2; return s; } }
}
function caPiece() {
  const s = caBag(), c = Math.floor(Math.random() * CA.col.length), bomb = ++ca.count % 22 === 0 ? Math.floor(Math.random() * s.c.length) : -1;
  return {cells: s.c.map(p => [...p]), color: c, bomb, n: s.n};
}
function caStart(mode = ca?.kind || 'marathon', level = ca?.levelIdx ?? 0) {
  const lv = mode === 'challenge' ? CA_LEVELS[level] : null, opt = lv?.[2] || {};
  // mode: ready / play / pause / over (gameLoop pauses it when the tab is left); kind: marathon, zen or challenge
  ca = {raf: ca?.raf || 0, g: $('caCanvas').getContext('2d'), mode: 'ready', kind: mode, levelIdx: level, lv, goal: lv?.[1] || null, tick: 0, phase: 'fall',
    board: Array.from({length: CA.ROWS}, () => Array(CA.COLS).fill(null)), hist: [], count: 0, next: [], hold: null, held: false, cur: null,
    score: 0, rows: 0, level: 1 + (opt.speed || 0), fusions: 0, gems: 0, bestChain: 0, pieces: 0, chain: 0, t0: 0, time: 0,
    lock: 0, moves: 0, fallT: 0, keys: {}, das: 0, dir: 0, anim: 0, clearing: null, parts: [], pops: [], shake: 0, stars: Array.from({length: 50}, () => [Math.random() * CA.W, Math.random() * CA.H, Math.random()])};
  if (opt.heap) caHeap(opt.heap, opt.gems || 0);
  for (let i = 0; i < 4; i++) ca.next.push(caPiece());
  caSpawn();
  caInfo();
  gameLoop(ca, 'neodex:cascade', caUpdate, caDraw);
}
function caHeap(h, gems) {  // rows of mixed blocks with holes, settled (nothing hanging, no full row), crystals spread in them
  for (let r = CA.ROWS - h; r < CA.ROWS; r++) {
    const hole = Math.floor(Math.random() * CA.COLS);
    for (let c = 0; c < CA.COLS; c++) if (c !== hole && Math.random() < .86) ca.board[r][c] = {c: Math.floor(Math.random() * CA.col.length)};
  }
  for (let k = 0; k < 50; k++) {
    while (caGravity());
    const full = ca.board.findIndex(row => row.every(Boolean)); if (full < 0) break;
    ca.board[full][Math.floor(Math.random() * CA.COLS)] = null;
  }
  const spots = [];
  for (let r = 0; r < CA.ROWS; r++) for (let c = 0; c < CA.COLS; c++) if (ca.board[r][c]) spots.push([r, c]);
  // no free fusion in the starting heap: blocks of a group of 7 change colour until there is none
  for (let k = 0; k < 200; k++) { const f = caFind(); if (!f.fusions) break; const [first] = f.hit; const r = first / CA.COLS | 0, c = first % CA.COLS; ca.board[r][c].c = (ca.board[r][c].c + 1 + Math.floor(Math.random() * 5)) % CA.col.length; }
  for (let i = 0; i < gems && spots.length; i++) { const [r, c] = spots.splice(Math.floor(Math.random() * spots.length), 1)[0]; ca.board[r][c] = {c: -1, gem: true}; }
  ca.gemsTotal = gems;
}
const caSpeed = () => Math.max(2, Math.round(42 * Math.pow(.78, ca.level - 1)));  // frames per row
const caFits = (cells, x, y) => cells.every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < CA.COLS && Y < CA.ROWS && (Y < 0 || !ca.board[Y][X]); });
function caSpawn() {
  const p = ca.next.shift(); ca.next.push(caPiece());
  const w = Math.max(...p.cells.map(c => c[0])) + 1;
  ca.cur = {...p, x: Math.floor((CA.COLS - w) / 2), y: -Math.max(...p.cells.map(c => c[1]))};
  ca.held = false; ca.lock = 0; ca.moves = 0; ca.fallT = 0;
  if (!caFits(ca.cur.cells, ca.cur.x, ca.cur.y + 1) && !caFits(ca.cur.cells, ca.cur.x, ca.cur.y)) caOver(false);
}
function caMove(dx) { if (ca.cur && caFits(ca.cur.cells, ca.cur.x + dx, ca.cur.y)) { ca.cur.x += dx; caReset(); CA_SFX.move(); return true; } return false; }
function caRotate(dir) {
  if (!ca.cur) return;
  let cells = ca.cur.cells; for (let i = 0; i < (dir > 0 ? 1 : 3); i++) cells = caRot(cells);
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, 1]]) if (caFits(cells, ca.cur.x + dx, ca.cur.y + dy)) {
    // the bomb pixel turns with the shard: same index in the list
    ca.cur.cells = cells; ca.cur.x += dx; ca.cur.y += dy; caReset(); CA_SFX.rot(); return;
  }
}
function caReset() { if (ca.lock > 0 && ca.moves < CA.MOVES) { ca.lock = 0; ca.moves++; } }
function caGhostY() { let y = ca.cur.y; while (caFits(ca.cur.cells, ca.cur.x, y + 1)) y++; return y; }
function caHardDrop() { if (!ca.cur) return; const y = caGhostY(); ca.score += (y - ca.cur.y) * 2; ca.cur.y = y; CA_SFX.drop(); caLock(); }
function caHold() {
  if (!ca.cur || ca.held) return;
  const h = ca.hold; ca.hold = {cells: CA.shapes.find(s => s.n === ca.cur.n).c.map(p => [...p]), color: ca.cur.color, bomb: ca.cur.bomb, n: ca.cur.n};
  if (h) { const w = Math.max(...h.cells.map(c => c[0])) + 1; ca.cur = {...h, x: Math.floor((CA.COLS - w) / 2), y: -Math.max(...h.cells.map(c => c[1]))}; ca.lock = 0; ca.moves = 0; } else caSpawn();
  ca.held = true; CA_SFX.hold();
}
function caLock() {
  const p = ca.cur; ca.cur = null; ca.pieces++;
  let above = false;
  p.cells.forEach(([cx, cy], i) => { const X = p.x + cx, Y = p.y + cy; if (Y < 0) above = true; else ca.board[Y][X] = {c: p.color, bomb: i === p.bomb}; });
  if (above) return caOver(false);
  CA_SFX.lock(); ca.chain = 0;
  caResolve();
}
// what breaks now: full rows (crystals included), then groups of 7 of one colour; bombs that break blow up their 3 x 3 square
function caFind() {
  const B = ca.board, hit = new Set(), key = (r, c) => r * CA.COLS + c;
  let rows = 0, fusions = 0;
  for (let r = 0; r < CA.ROWS; r++) if (B[r].every(Boolean)) { rows++; for (let c = 0; c < CA.COLS; c++) hit.add(key(r, c)); }
  const seen = new Set();
  for (let r = 0; r < CA.ROWS; r++) for (let c = 0; c < CA.COLS; c++) {
    const b = B[r][c]; if (!b || b.gem || seen.has(key(r, c))) continue;
    const grp = [], todo = [[r, c]]; seen.add(key(r, c));
    while (todo.length) { const [y, x] = todo.pop(); grp.push([y, x]); for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const Y = y + dy, X = x + dx, n = B[Y]?.[X]; if (n && !n.gem && n.c === b.c && !seen.has(key(Y, X))) { seen.add(key(Y, X)); todo.push([Y, X]); } } }
    if (grp.length >= CA.FUSE) { fusions++; for (const [y, x] of grp) hit.add(key(y, x)); }
  }
  for (const k of [...hit]) { const r = k / CA.COLS | 0, c = k % CA.COLS; if (B[r][c]?.bomb) for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) if (B[y]?.[x] && !(B[y][x].gem && !rowsFull(y))) hit.add(key(y, x)); }
  return {hit, rows, fusions};
  function rowsFull(y) { return B[y].every(Boolean); }
}
function caResolve() {
  const f = caFind();
  if (!f.hit.size) { ca.phase = 'fall'; caCheckGoal(); if (ca.mode === 'play') caSpawn(); return; }
  ca.chain++;
  const B = ca.board; let gems = 0, bombs = 0;
  for (const k of f.hit) { const b = B[k / CA.COLS | 0][k % CA.COLS]; if (b.gem) gems++; if (b.bomb) bombs++; }
  const lvl = ca.level, base = [0, 100, 300, 500, 800][Math.min(4, f.rows)] + Math.max(0, f.rows - 4) * 400, mult = 1 + (ca.chain - 1) * .5;
  const pts = Math.round((base * lvl + f.fusions * 60 * f.hit.size / CA.FUSE + gems * 150 + bombs * 100) * mult);
  ca.score += pts; ca.rows += f.rows; ca.fusions += f.fusions; ca.gems += gems; ca.bestChain = Math.max(ca.bestChain, ca.chain);
  if (ca.kind === 'marathon') ca.level = 1 + Math.floor(ca.rows / 8);
  const label = [f.rows > 1 ? f.rows + ' LIGNES' : f.rows ? 'LIGNE' : '', f.fusions ? 'FUSION' + (f.fusions > 1 ? ' x' + f.fusions : '') : '', bombs ? 'BOUM' : ''].filter(Boolean).join(' · ');
  ca.pops.push({text: label, pts, t: 70});
  ca.clearing = f.hit; ca.phase = 'clear'; ca.anim = 0; ca.shake = Math.max(ca.shake, bombs ? 10 : f.rows >= 3 ? 5 : 0);
  // ce qu'on voit et entend : un éclair sur le puits (couleur de la fusion), et pour une chaîne le gros « CHAÎNE ×N » qui tremble
  const one = B[[...f.hit][0] / CA.COLS | 0][[...f.hit][0] % CA.COLS];
  ca.flash = ca.chain > 1 || f.rows >= 3 || bombs ? 14 : 7; ca.flashCol = f.fusions && !f.rows && one.c >= 0 ? CA.col[one.c][1] : '#ffffff';
  if (ca.chain > 1) { ca.chainFx = {n: ca.chain, t: 80}; ca.shake = Math.max(ca.shake, 4 + ca.chain * 2); CA_SFX.chain(ca.chain); }
  if (f.rows) CA_SFX.clear(f.rows, ca.chain); if (f.fusions) CA_SFX.fusion(); if (bombs) CA_SFX.boom(); if (gems) CA_SFX.gem();
}
function caBurst() {  // the blocks that break fly away
  for (const k of ca.clearing) {
    const r = k / CA.COLS | 0, c = k % CA.COLS, b = ca.board[r][c], col = b.gem ? '#e8fbff' : CA.col[b.c][0];
    for (let i = 0; i < 3; i++) ca.parts.push({x: CA.X + c * CA.S + 7, y: CA.Y + r * CA.S + 7, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, t: 40, col});
    ca.board[r][c] = null;
  }
  ca.clearing = null;
}
function caGravity() {  // every block with nothing under it falls one row; true while something moves
  let moved = false;
  for (let r = CA.ROWS - 2; r >= 0; r--) for (let c = 0; c < CA.COLS; c++) if (ca.board[r][c] && !ca.board[r + 1][c]) { ca.board[r + 1][c] = ca.board[r][c]; ca.board[r][c] = null; moved = true; }
  return moved;
}
function caCheckGoal() {
  const g = ca.goal; if (!g || ca.mode !== 'play') return;
  const done = g.rows ? ca.rows >= g.rows : g.gems ? ca.gems >= g.gems : g.fusions ? ca.fusions >= g.fusions : g.chain ? ca.bestChain >= g.chain : ca.score >= g.score;
  const failed = (g.pieces && ca.pieces >= g.pieces && !done) || (g.time && ca.time >= g.time * 60 && !done);
  if (done) caOver(true); else if (failed) caOver(false);
}
function caOver(won) {
  ca.mode = 'over'; ca.won = won; ca.cur = null; ca.overAt = Date.now();
  const s = caSave(); s.games++; s.rows += ca.rows; s.chain = Math.max(s.chain, ca.bestChain);
  if (ca.kind === 'challenge') {
    if (won) { const g = ca.goal, t = ca.time / 60, par = g.time ? t < g.time * .6 : g.pieces ? ca.pieces < g.pieces * .75 : ca.pieces < (g.rows || g.gems * 2 || g.fusions * 5 || g.chain * 8 || 30) * 1.6;
      const stars = 1 + (ca.score >= 3000 * (ca.levelIdx + 1) * .4 ? 1 : 0) + (par ? 1 : 0); ca.got = stars; s.stars[ca.levelIdx] = Math.max(s.stars[ca.levelIdx] || 0, stars); CA_SFX.win(); }
    else CA_SFX.over();
  } else { ca.record = best('cascade' + (ca.kind === 'zen' ? 'Zen' : ''), ca.score); (ca.record ? CA_SFX.win : CA_SFX.over)(); }
  saveGames(); caInfo(); caMenu();
}
function caPress() {
  if (!ca) return;
  if (ca.mode === 'ready' || ca.mode === 'pause') { ca.mode = 'play'; return; }
  if (ca.mode === 'over' && Date.now() - ca.overAt > 700) { const next = ca.won && ca.kind === 'challenge' && ca.levelIdx < CA_LEVELS.length - 1; caStart(ca.kind, ca.levelIdx + (next ? 1 : 0)); ca.mode = 'play'; caMenu(); }
}
function caUpdate() {
  ca.tick++; ca.time++;
  if (ca.shake) ca.shake--;
  if (ca.flash) ca.flash--;
  if (ca.chainFx && --ca.chainFx.t <= 0) ca.chainFx = null;
  for (const p of ca.parts) { p.x += p.vx; p.y += p.vy; p.vy += .15; p.t--; } ca.parts = ca.parts.filter(p => p.t > 0);
  for (const p of ca.pops) p.t--; ca.pops = ca.pops.filter(p => p.t > 0);
  if (ca.phase === 'clear') { if (++ca.anim >= 16) { caBurst(); ca.phase = 'drop'; ca.anim = 0; } return; }
  if (ca.phase === 'drop') { if (++ca.anim % 3) return; if (!caGravity()) caResolve(); return; }
  if (!ca.cur) return;
  caCheckGoal(); if (ca.mode !== 'play') return;
  // held left / right: one step, then repeats quickly after a short wait
  const d = (ca.keys.ArrowRight || ca.keys.d || ca.keys.padR ? 1 : 0) - (ca.keys.ArrowLeft || ca.keys.q || ca.keys.a || ca.keys.padL ? 1 : 0);
  if (d !== ca.dir) { ca.dir = d; ca.das = 0; if (d) caMove(d); } else if (d && ++ca.das > 10 && ca.das % 2 === 0) caMove(d);
  const soft = ca.keys.ArrowDown || ca.keys.s || ca.keys.padD, speed = ca.kind === 'zen' ? 48 : caSpeed();
  if (++ca.fallT >= (soft ? Math.min(3, speed) : speed)) {
    ca.fallT = 0;
    if (caFits(ca.cur.cells, ca.cur.x, ca.cur.y + 1)) { ca.cur.y++; if (soft) ca.score += 1; ca.lock = 0; }
  }
  if (!caFits(ca.cur.cells, ca.cur.x, ca.cur.y + 1)) { if (++ca.lock >= CA.LOCK) caLock(); }
}
/* ---------- drawing ---------- */
function caBlock(g, x, y, s, b, t) {
  if (b.gem) {  // a crystal: a pale diamond that glints
    g.fillStyle = '#1c3a5a'; g.fillRect(x, y, s, s);
    const m = s / 2; g.fillStyle = '#7fe0ee';
    for (let i = 0; i < m; i++) g.fillRect(x + m - i - 1, y + 1 + i, (i + 1) * 2, 1), g.fillRect(x + m - i - 1, y + s - 2 - i, (i + 1) * 2, 1);
    g.fillStyle = '#e8fbff'; g.fillRect(x + m - 2, y + 3, 2, 2);
    if ((t + x * 3 + y) % 90 < 6) { g.fillStyle = '#fff'; g.fillRect(x + m - 1, y + 1, 1, s - 2); g.fillRect(x + 1, y + m - 1, s - 2, 1); }
    return;
  }
  const [base, lt, dk] = CA.col[b.c];
  g.fillStyle = dk; g.fillRect(x, y, s, s);
  g.fillStyle = base; g.fillRect(x + 1, y + 1, s - 2, s - 2);
  g.fillStyle = lt; g.fillRect(x + 1, y + 1, s - 2, 2); g.fillRect(x + 1, y + 1, 2, s - 2);
  g.fillStyle = dk; g.fillRect(x + 2, y + s - 3, s - 3, 1); g.fillRect(x + s - 3, y + 2, 1, s - 3);
  // dithering in the middle, a pixel of shine
  g.fillStyle = 'rgba(255,255,255,.18)'; for (let j = 4; j < s - 4; j += 2) for (let i = 4 + (j % 4 ? 1 : 0); i < s - 4; i += 3) g.fillRect(x + i, y + j, 1, 1);
  g.fillStyle = '#fff'; g.fillRect(x + 3, y + 3, 1, 1);
  if (b.bomb) {
    g.fillStyle = '#1c1238'; g.fillRect(x + 3, y + 4, s - 6, s - 6); g.fillRect(x + 4, y + 3, s - 8, s - 4);
    g.fillStyle = t % 20 < 10 ? '#ffd07a' : '#ff4f6d'; g.fillRect(x + s - 5, y + 2, 2, 2);
    g.fillStyle = '#5e4d85'; g.fillRect(x + 5, y + 5, 2, 1);
  }
}
function caMini(g, p, cx, cy, s) {  // a piece drawn small and centred, for the next ones and the hold
  if (!p) return;
  const w = Math.max(...p.cells.map(c => c[0])) + 1, h = Math.max(...p.cells.map(c => c[1])) + 1;
  p.cells.forEach(([x, y], i) => caBlock(g, Math.round(cx - w * s / 2 + x * s), Math.round(cy - h * s / 2 + y * s), s, {c: p.color, bomb: i === p.bomb}, ca.tick));
}
function caDraw() {
  const g = ca.g, t = ca.tick, B = ca.board, S = CA.S;
  caMusic();
  g.save();
  if (ca.shake) g.translate(Math.round((Math.random() - .5) * ca.shake), Math.round((Math.random() - .5) * ca.shake));
  // sky: a dark gradient whose hue follows the level, twinkling stars
  const hue = (260 + (ca.kind === 'challenge' ? ca.levelIdx * 15 : ca.level * 12)) % 360;
  const bg = g.createLinearGradient(0, 0, 0, CA.H); bg.addColorStop(0, `hsl(${hue},55%,9%)`); bg.addColorStop(1, `hsl(${(hue + 40) % 360},60%,4%)`);
  g.fillStyle = bg; g.fillRect(-10, -10, CA.W + 20, CA.H + 20);
  for (const [x, y, k] of ca.stars) { g.fillStyle = (t / 20 + k * 9) % 6 < 1 ? '#ffffff' : 'rgba(217,198,255,.35)'; g.fillRect(x | 0, y | 0, 1, 1); }
  // the well
  g.fillStyle = 'rgba(5,1,11,.78)'; g.fillRect(CA.X, CA.Y, CA.COLS * S, CA.ROWS * S);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let r = 0; r < CA.ROWS; r++) for (let c = (r % 2); c < CA.COLS; c += 2) g.fillRect(CA.X + c * S, CA.Y + r * S, S, S);
  g.fillStyle = `hsl(${hue},60%,45%)`; g.fillRect(CA.X - 3, CA.Y - 3, CA.COLS * S + 6, 3); g.fillRect(CA.X - 3, CA.Y + CA.ROWS * S, CA.COLS * S + 6, 3); g.fillRect(CA.X - 3, CA.Y, 3, CA.ROWS * S); g.fillRect(CA.X + CA.COLS * S, CA.Y, 3, CA.ROWS * S);
  for (let r = 0; r < CA.ROWS; r++) for (let c = 0; c < CA.COLS; c++) {
    const b = B[r][c]; if (!b) continue;
    const x = CA.X + c * S, y = CA.Y + r * S;
    if (ca.clearing?.has(r * CA.COLS + c)) { if ((ca.anim >> 1) % 2) { g.fillStyle = '#ffffff'; g.fillRect(x, y, S, S); } else caBlock(g, x, y, S, b, t); continue; }
    caBlock(g, x, y, S, b, t);
  }
  if (ca.cur && ca.mode !== 'over') {
    const gy = caGhostY();  // where it will land: dotted outline
    g.fillStyle = 'rgba(255,255,255,.28)';
    for (const [cx, cy] of ca.cur.cells) { const x = CA.X + (ca.cur.x + cx) * S, y = CA.Y + (gy + cy) * S; if (gy + cy < 0) continue; for (let i = 0; i < S; i += 2) { g.fillRect(x + i, y, 1, 1); g.fillRect(x + i, y + S - 1, 1, 1); g.fillRect(x, y + i, 1, 1); g.fillRect(x + S - 1, y + i, 1, 1); } }
    ca.cur.cells.forEach(([cx, cy], i) => { const y = ca.cur.y + cy; if (y >= 0) caBlock(g, CA.X + (ca.cur.x + cx) * S, CA.Y + y * S, S, {c: ca.cur.color, bomb: i === ca.cur.bomb}, t); });
  }
  for (const p of ca.parts) { g.fillStyle = p.col; g.fillRect(p.x | 0, p.y | 0, 2, 2); }
  if (ca.flash) { g.globalAlpha = ca.flash / 14 * .55; g.fillStyle = ca.flashCol; g.fillRect(CA.X, CA.Y, CA.COLS * S, CA.ROWS * S); g.globalAlpha = 1; }
  if (ca.chainFx) {  // « CHAÎNE ×N » en gros au-dessus du puits : il grossit en arrivant, change de couleur, puis s'efface
    const c = ca.chainFx, cx = CA.X + CA.COLS * S / 2, y = CA.Y + 40 + Math.round(Math.sin(c.t / 3) * 2), big = c.t > 72 ? 16 : c.t > 66 ? 32 : 24, col = ['#ff5ad9', '#7fe0ee', '#ffd07a', '#8ee8a0'][(c.t >> 2) % 4];
    g.globalAlpha = Math.min(1, c.t / 16); g.textAlign = 'center';
    for (const [txt, size, yy, cc] of [['CHAINE', 16, y, '#ffffff'], ['×' + c.n, big, y + 8 + big, col]]) { g.font = size + 'px "Press Start 2P", monospace'; g.fillStyle = '#05010b'; g.fillText(txt, cx + 2, yy + 2); g.fillStyle = cc; g.fillText(txt, cx, yy); }
    for (const [d, cc] of [[2, '#05010b'], [0, '#ffffff']]) { const ix = cx + 8 + d, iy = y - 20 + d; g.fillStyle = cc; g.fillRect(ix - 5, iy + 2, 3, 2); g.fillRect(ix - 2, iy, 4, 2); g.fillRect(ix + 2, iy + 2, 3, 2); }  // l'accent de « CHAÎNE », que la police n'a pas
    g.textAlign = 'left'; g.globalAlpha = 1;
  }
  // side panel
  const px0 = 162, label = (s, y) => { g.fillStyle = '#8f7bb8'; g.font = '6px "Press Start 2P", monospace'; g.fillText(s, px0, y); }, value = (s, y, c = '#ffffff') => { g.fillStyle = c; g.font = '8px "Press Start 2P", monospace'; g.fillText(s, px0, y); };
  label('SUIVANT', 30); ca.next.slice(0, 3).forEach((p, i) => { g.fillStyle = 'rgba(5,1,11,.6)'; g.fillRect(px0, 36 + i * 34, 66, 30); caMini(g, p, px0 + 33, 51 + i * 34, i ? 6 : 8); });
  label('RÉSERVE  C', 152); g.fillStyle = 'rgba(5,1,11,.6)'; g.fillRect(px0, 158, 66, 30); caMini(g, ca.hold, px0 + 33, 173, 7);
  label('SCORE', 204); value(String(ca.score), 216, '#ffd07a');
  label(ca.kind === 'challenge' ? 'DÉFI ' + (ca.levelIdx + 1) : ca.kind === 'zen' ? 'ZEN' : 'NIVEAU', 232); value(ca.kind === 'challenge' ? '' : String(ca.level), 244);
  label('LIGNES', 260); value(String(ca.rows), 272);
  if (ca.goal) {
    const g2 = ca.goal, have = g2.rows ? ca.rows : g2.gems ? ca.gems : g2.fusions ? ca.fusions : g2.chain ? ca.bestChain : ca.score, need = g2.rows || g2.gems || g2.fusions || g2.chain || g2.score;
    label('OBJECTIF', 288); g.fillStyle = 'rgba(5,1,11,.6)'; g.fillRect(px0, 292, 66, 8); g.fillStyle = '#8ee8a0'; g.fillRect(px0 + 1, 293, Math.min(64, 64 * have / need), 6);
    g.fillStyle = '#d9c6ff'; g.font = '6px "Press Start 2P", monospace';
    g.fillText(g2.time ? Math.max(0, Math.ceil(g2.time - ca.time / 60)) + ' s' : g2.pieces ? (g2.pieces - ca.pieces) + ' pièces' : have + ' / ' + need, px0, 310);
  } else { label('MEILLEUR', 288); value(String(games?.best['cascade' + (ca.kind === 'zen' ? 'Zen' : '')] ?? 0), 300, '#d9c6ff'); }
  // texts of the breaks
  ca.pops.forEach((p, i) => { const y = CA.Y + 120 - (70 - p.t) * .5 - i * 22; g.globalAlpha = Math.min(1, p.t / 20); gameText(g, CA.COLS * S + 20, [[p.text, '#ffffff', 7], ['+' + p.pts, '#ffd07a', 7]], y); g.globalAlpha = 1; });
  g.restore();
  g.fillStyle = `hsl(${hue},60%,70%)`; g.font = '8px "Press Start 2P", monospace'; g.fillText('CASCADE', CA.X, 16);
  if (ca.mode === 'ready') gameText(g, CA.W, [[ca.lv ? 'DÉFI ' + (ca.levelIdx + 1) + ' : ' + ca.lv[0].toUpperCase() : ca.kind === 'zen' ? 'MODE ZEN' : 'MARATHON', '#ff5ad9', 8], [ca.goal ? caGoalText(ca.goal) : 'Lignes et fusions de 9', '#d9c6ff', 7], ['ESPACE OU CLIC POUR JOUER', '#ffffff', 7]], 140);
  if (ca.mode === 'pause') gameText(g, CA.W, [['PAUSE', '#ffd07a', 10], ['ESPACE POUR REPRENDRE', '#d9c6ff', 7]], 150);
  if (ca.mode === 'over') gameText(g, CA.W, ca.kind === 'challenge' ? (ca.won ? [['DÉFI RÉUSSI', '#8ee8a0', 10], ['', '#ffd07a', 10], [ca.levelIdx < CA_LEVELS.length - 1 ? 'ESPACE : DÉFI SUIVANT' : 'TOUS LES DÉFIS !', '#ffffff', 7]]
    : [['RATÉ', '#ff4f6d', 10], [ca.score + ' POINTS', '#ffd07a', 8], ['ESPACE : RÉESSAYER', '#ffffff', 7]]) : [['FIN DE PARTIE', '#ff4f6d', 10], [ca.score + ' POINTS' + (ca.record ? ' · RECORD !' : ''), '#ffd07a', 8], ['ESPACE : REJOUER', '#ffffff', 7]], 140);
  if (ca.mode === 'over' && ca.won) for (let i = 0; i < 3; i++) sprite(g, CA_STAR, CA.W / 2 - 22 + i * 16, 148, {y: i < ca.got ? '#ffd07a' : '#3a2a6e', w: i < ca.got ? '#fff5d0' : '#5e4d85'});  // the stars won, drawn in pixels (the pixel font has none)
}
/* ---------- page: mode choice, keys ---------- */
function caInfo() { const s = caSave(); $('caInfo').textContent = 'Record marathon : ' + (games?.best.cascade ?? 0) + ' · zen : ' + (games?.best.cascadeZen ?? 0) + ' · défis : ' + Object.values(s.stars).reduce((a, b) => a + b, 0) + ' / ' + CA_LEVELS.length * 3 + ' ★ · meilleure chaîne ' + s.chain; }
function caMenu() {
  const s = caSave(), sel = $('caMode'), cur = ca ? (ca.kind === 'challenge' ? 'c' + ca.levelIdx : ca.kind) : 'marathon';
  sel.replaceChildren(Object.assign(el('option', '', 'Marathon'), {value: 'marathon'}), Object.assign(el('option', '', 'Zen (sans accélération)'), {value: 'zen'}),
    ...CA_LEVELS.map(([n, goal], i) => { const unlocked = i === 0 || s.stars[i - 1] || s.stars[i]; return Object.assign(el('option', '', 'Défi ' + (i + 1) + ' · ' + n + ' · ' + caGoalText(goal) + (s.stars[i] ? ' · ' + '★'.repeat(s.stars[i]) : '') + (unlocked ? '' : ' 🔒')), {value: 'c' + i, disabled: !unlocked}); }));
  sel.value = cur;
}
function caOpen() { if (!ca) { caStart('marathon', 0); caMenu(); } else gameLoop(ca, 'neodex:cascade', caUpdate, caDraw); caInfo(); }
$('caMode').onchange = () => { const v = $('caMode').value; caStart(v.startsWith('c') ? 'challenge' : v, v.startsWith('c') ? +v.slice(1) : 0); caMenu(); $('caCanvas').focus(); };
$('caCanvas').onclick = () => caPress();
document.addEventListener('keydown', e => {
  if (!view.classList.contains('on') || !ca || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
  if (ca.mode !== 'play') { if (k === ' ' || k === 'Enter') caPress(); return; }
  if (k === 'p' || k === 'Escape') { ca.mode = 'pause'; return; }
  ca.keys[k] = true;
  if (e.repeat) return;
  const d = {ArrowLeft: -1, q: -1, a: -1, ArrowRight: 1, d: 1}[k];
  if (d) { caMove(d); ca.dir = d; ca.das = 0; return; }  // the first step right away, the repeats in caUpdate
  if (k === 'ArrowUp' || k === 'x' || k === 'w') caRotate(1);
  else if (k === 'z' || k === 'Control') caRotate(-1);
  else if (k === ' ') caHardDrop();
  else if (k === 'c' || k === 'Shift') caHold();
});
document.addEventListener('keyup', e => { if (!ca) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; ca.keys[k] = false; });
function caCheck() {  // vérification : un quart de tour quatre fois rend la forme, une ligne et une fusion de 9 sont trouvées, les cristaux tombent comme le reste,
  // une ligne qui en fait tomber une autre donne une chaîne de 2, avec l'éclair et le texte ; renvoie 'ok' ou ce qui ne va pas
  const keep = ca, bad = [], empty = () => Array.from({length: CA.ROWS}, () => Array(CA.COLS).fill(null));
  ca = {board: empty(), hist: [], mode: 'check'};
  const s = CA.shapes.find(x => x.n === 'L5').c, back = caRot(caRot(caRot(caRot(s))));
  if (JSON.stringify(back) !== JSON.stringify(s)) bad.push('rotation');
  for (let c = 0; c < CA.COLS; c++) ca.board[19][c] = {c: c % 2};
  for (let i = 0; i < CA.FUSE; i++) ca.board[18 - (i / 5 | 0)][i % 5] = {c: 3};
  ca.board[10][4] = {c: -1, gem: true};
  const f = caFind(); while (caGravity());
  if (!(f.rows === 1 && f.fusions === 1 && f.hit.size === 10 + CA.FUSE)) bad.push('ligne et fusion ' + JSON.stringify({rows: f.rows, fusions: f.fusions, hit: f.hit.size}));
  if (!ca.board[17][4]?.gem) bad.push('cristal');
  // la chaîne : la ligne 18 pleine se casse, le bloc de la ligne 17 (colonne 9) tombe dans le trou de la ligne 19, qui est alors pleine
  ca = {board: empty(), hist: [], mode: 'check', chain: 0, score: 0, rows: 0, level: 1, fusions: 0, gems: 0, bestChain: 0, kind: 'zen', goal: null, pops: [], parts: [], shake: 0, flash: 0, tick: 0, time: 0, phase: 'fall'};
  for (let c = 0; c < CA.COLS; c++) { ca.board[18][c] = {c: (c + 1) % 2}; if (c < 9) ca.board[19][c] = {c: c % 2}; }
  ca.board[17][9] = {c: 4};
  caResolve(); let sawFx = false;
  for (let i = 0; i < 300; i++) { caUpdate(); if (ca.chainFx?.n === 2 && ca.flash) sawFx = true; }
  if (ca.bestChain !== 2 || ca.rows !== 2) bad.push('chaîne ' + ca.bestChain + ' / ' + ca.rows + ' lignes');
  if (!sawFx) bad.push('effets de chaîne');
  ca = keep;
  return bad.length ? bad.join(', ') : 'ok';
}
console.assert(caCheck() === 'ok', 'cascade', caCheck());
$('caCanvas').__ca = {st: () => ca, check: caCheck, CA, resolve: () => caResolve()};  // pour l'auto-test
// la manette : croix ou stick pour déplacer et descendre vite, haut pour poser d'un coup, A et B pour tourner, X ou LB / RB pour la réserve, Start pour la pause
{ let prev = [];
  const loop = () => { requestAnimationFrame(loop); if (!view.classList.contains('on') || !ca) return;
    const p = [...(navigator.getGamepads?.() || [])].find(Boolean); if (!p) return;
    const b = i => !!p.buttons[i]?.pressed, ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const now = [b(14) || ax < -.5, b(15) || ax > .5, b(13) || ay > .5, b(12) || ay < -.6, b(0), b(1), b(2) || b(4) || b(5), b(9)], hit = i => now[i] && !prev[i];
    if (ca.mode === 'play') { [ca.keys.padL, ca.keys.padR, ca.keys.padD] = now; if (hit(3)) caHardDrop(); if (hit(4)) caRotate(1); if (hit(5)) caRotate(-1); if (hit(6)) caHold(); if (hit(7)) ca.mode = 'pause'; }
    else { ca.keys.padL = ca.keys.padR = ca.keys.padD = false; if (hit(4) || hit(7)) caPress(); }
    prev = now; };
  requestAnimationFrame(loop); }
$('caFs').onclick = () => { $('caFs').blur(); if (document.fullscreenElement) document.exitFullscreen(); else $('caCanvas').parentElement.requestFullscreen?.().catch(() => {}); };
const CA_SND = ['SON : TOUT', 'SON : EFFETS', 'SON : COUPÉ'];
$('caSnd').onclick = () => { const s = caSave(); s.snd = ((s.snd || 0) + 1) % 3; saveGames(); $('caSnd').textContent = CA_SND[s.snd]; $('caSnd').blur(); };
$('caSnd').textContent = CA_SND[caSave().snd || 0];  // (non indenté : les textes sur plusieurs lignes restent exactement les tiens)
  // ---- fin ----
  ctx.onOpen(() => { caOpen(); });
}
