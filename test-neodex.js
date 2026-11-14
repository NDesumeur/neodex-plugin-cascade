// lancé par le test « local » de NeoDex : les règles (rotation, ligne, fusion, cristal, chaîne et ses effets), des pièces posées au clavier,
// la manette (déplacer, tourner, poser), la chaîne à l'écran, le bouton son, le plein écran et la place prise à la taille de la fenêtre (avec NEO_SHOTS : garde des images)
module.exports = async ({ pj, sleep }) => {
  const A = code => pj(`(() => { const T = document.getElementById('caCanvas').__ca, ca = T.st(), CA = T.CA; ${code} })()`);
  const key = (k, type = 'keydown') => pj(`document.dispatchEvent(new KeyboardEvent('${type}', {key: '${k}', bubbles: true})), 0`);
  const shot = async n => { if (!process.env.NEO_SHOTS) return; const d = await pj(`document.getElementById('caCanvas').toDataURL()`); require('fs').writeFileSync(require('path').join(process.env.NEO_SHOTS, 'cascade-' + n + '.png'), Buffer.from(d.split(',')[1], 'base64')); };
  await pj(`window.__e = []; addEventListener('error', e => __e.push(e.message)); 0`);
  const chk = await A('return T.check();'); if (chk !== 'ok') throw new Error('règles : ' + chk);
  await sleep(200); await shot('0-depart');
  // au clavier : on lance, trois pièces posées d'un coup
  await key(' '); await sleep(200);
  for (let i = 0; i < 3; i++) { await key(' '); await key(' ', 'keyup'); await sleep(450); }
  const p1 = await A('return ca.pieces;'); if (p1 !== 3) throw new Error('3 pièces posées au clavier, compté ' + p1);
  // la manette : croix à gauche (la pièce part à gauche), A (elle tourne), haut (posée)
  await pj(`(() => { const pad = {axes: [0, 0], buttons: Array.from({length: 17}, () => ({pressed: false}))}; window.__pad = pad; navigator.getGamepads = () => [pad]; return 0; })()`);
  const x0 = await A('return ca.cur.x;');
  await pj(`(__pad.buttons[14].pressed = true, 0)`); await sleep(120); await pj(`(__pad.buttons[14].pressed = false, 0)`); await sleep(60);
  const x1 = await A('return ca.cur.x;'); if (!(x1 < x0)) throw new Error('la croix ne déplace pas : ' + x0 + ' → ' + x1);
  const c0 = await A('return JSON.stringify(ca.cur.cells);');
  await pj(`(__pad.buttons[0].pressed = true, 0)`); await sleep(80); await pj(`(__pad.buttons[0].pressed = false, 0)`); await sleep(60);
  const c1 = await A('return JSON.stringify(ca.cur.cells);'); const n = await A('return ca.cur.n;');
  if (c1 === c0 && n !== 'O4' && n !== 'X5') throw new Error('A ne tourne pas la pièce ' + n);
  await pj(`(__pad.buttons[12].pressed = true, 0)`); await sleep(80); await pj(`(__pad.buttons[12].pressed = false, 0)`); await sleep(500);
  const p2 = await A('return ca.pieces;'); if (p2 !== 4) throw new Error('haut ne pose pas la pièce (' + p2 + ')');
  await pj(`navigator.getGamepads = () => [], 0`);
  // une chaîne de 2 à l'écran : la ligne 18 se casse, le bloc du dessus tombe dans le trou de la ligne 19, qui se casse à son tour
  await A(`ca.board.forEach(r => r.fill(null)); for (let c = 0; c < CA.COLS; c++) { ca.board[18][c] = {c: (c + 1) % 2}; if (c < 9) ca.board[19][c] = {c: c % 2 + 2}; } ca.board[17][9] = {c: 4}; ca.cur = null; ca.chain = 0; T.resolve(); return 0;`);
  let seen = 0; for (let i = 0; i < 40 && seen < 2; i++) { await sleep(60); seen = await A('return ca.chainFx?.n || 0;'); }
  if (seen < 2) throw new Error("pas de chaîne à l'écran (" + seen + ')');
  await sleep(150); await shot('1-chaine');
  // le bouton son fait le tour : tout, effets, coupé, tout
  const snd = []; for (let i = 0; i < 3; i++) { await pj(`document.getElementById('caSnd').click(), 0`); snd.push(await pj(`document.getElementById('caSnd').textContent`)); }
  if (snd.join('|') !== 'SON : EFFETS|SON : COUPÉ|SON : TOUT') throw new Error('bouton son : ' + snd.join('|'));
  await sleep(1500); await shot('2-apres');
  const errs = await pj(`window.__e.join(' | ')`); if (errs) throw new Error('erreur : ' + errs);
  // plein écran, et la zone de jeu qui tient dans la fenêtre
  await pj(`document.getElementById('caFs').click(), 0`); await sleep(700);
  const fs = await pj(`(() => { const c = document.getElementById('caCanvas'), r = c.getBoundingClientRect(); return document.fullscreenElement === c.parentElement && Math.abs(r.height - innerHeight) < 3; })()`);
  await pj(`document.fullscreenElement && document.exitFullscreen(), 0`); await sleep(300);
  if (!fs) throw new Error('le plein écran ne remplit pas la hauteur');
  const L = await pj(`(() => { const r = document.getElementById('caCanvas').getBoundingClientRect(); let s = 0; for (let e = document.getElementById('caCanvas').parentElement; e; e = e.parentElement) s += e.scrollTop; return { bottom: Math.round(r.bottom + s), h: Math.round(r.height), wh: innerHeight, ww: innerWidth, sw: document.documentElement.scrollWidth }; })()`);
  if (process.env.NEO_FIT_LOG) console.log('FIT', JSON.stringify(L));
  if (L.bottom > L.wh + 1 || L.sw > L.ww + 1 || L.h < 300) throw new Error('la zone de jeu dépasse la fenêtre ou reste petite : ' + JSON.stringify(L));
  return 'règles ok · 4 pièces (clavier et manette) · chaîne de 2 · son · plein écran · puits ' + L.h + ' px dans ' + L.ww + '×' + L.wh;
};
