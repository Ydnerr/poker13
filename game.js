/* Kartu 13 - SUMBER logika game (online + lawan bot). Edit di sini, lalu build ulang game.min.js (lihat build.sh). Yang dimuat browser itu game.min.js. Naikin VER di bawah tiap rilis. */
/* ====== CONFIG FIREBASE ====== */
const firebaseConfig = {
  apiKey: "AIzaSyDuIFh5L1U6QfmGXf6gwyqhLNqs_flk6-A",
  authDomain: "poker13-86781.firebaseapp.com",
  databaseURL: "https://poker13-86781-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "poker13-86781",
  storageBucket: "poker13-86781.firebasestorage.app",
  messagingSenderId: "277404446731",
  appId: "1:277404446731:web:1b87947e9c6512f8b4d70e"
};
/* ============================= */

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const VER = 'v44.10'; // major = angka biasa (v45), minor = tambah titik (v44.1). Major dinaikkan kalau aturan/data game berubah
const VMAJ = VER.split('.')[0]; // yang disimpan di data game & dicek kecocokannya: cuma bagian major
document.getElementById('gver').textContent = VER;
const R = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'], S = ['♠','♣','♦','♥'];
const rk = id => id >> 2, su = id => id & 3;
const $ = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// id kartu 0..51: rank = id>>2 (3..2), suit = id&3 (♠<♣<♦<♥). Makin besar id = makin kuat.
function ev(cs) {
  const c = [...cs].sort((a, b) => a - b), n = c.length;
  if (!n) return null;
  const r = c.map(rk), top = c[n - 1];
  if (n <= 4 && r.every(x => x === r[0])) return { t: ['', 's', 'p', 't', 'q'][n], n, k: top };
  if (n >= 3 && r[n - 1] < 8 && r.every((x, i) => !i || x === r[i - 1] + 1) && c.every(x => su(x) === su(c[0]))) return { t: 'r', n, k: top }; // seri wajib satu logo
  if (n === 5) { // 3 kembar + pasangan (full house), dibandingkan lewat angka 3 kembarnya
    const m = {}; c.forEach(x => (m[rk(x)] = m[rk(x)] || []).push(x));
    const gs = Object.values(m), tri = gs.find(a => a.length === 3);
    if (gs.length === 2 && tri) return { t: 'f', n, k: Math.max(...tri), k2: Math.max(...c.filter(x => !tri.includes(x))), m: tri };
  }
  if (n === 8) { // 2 x 4 kembar (mis. 3333 + 6666)
    const m = {}; c.forEach(x => (m[rk(x)] = m[rk(x)] || []).push(x));
    const gs = Object.values(m);
    if (gs.length === 2 && gs.every(a => a.length === 4)) return { t: 'd', n, k: top };
  }
  if (n === 6) { // 4 kembar + pasangan
    const m = {}; c.forEach(x => (m[rk(x)] = m[rk(x)] || []).push(x));
    const gs = Object.values(m), q4 = gs.find(a => a.length === 4), pr = gs.find(a => a.length === 2);
    if (gs.length === 2 && q4 && pr) return { t: 'g', n, k: Math.max(...q4), k2: Math.max(...pr), m: q4 };
  }
  if (n >= 5) { // seri satu logo (min 3 kartu) + pasangan
    const L = n - 2;
    for (let s = 0; s < 4; s++) for (let st = 0; st + L - 1 <= 7; st++) {
      const core = Array.from({ length: L }, (_, i) => (st + i) * 4 + s);
      if (!core.every(x => c.includes(x))) continue;
      const rest = c.filter(x => !core.includes(x));
      if (rk(rest[0]) === rk(rest[1])) return { t: 'x', n, k: core[L - 1], k2: Math.max(...rest), m: core };
    }
  }
  return null;
}
function arr(cards, e) { // urutan tampil: bagian utama (seri / 3 kembar / 4 kembar) dulu, pasangan di belakang
  const c = [...cards].sort((a, b) => a - b);
  if (!e || !e.m) return c;
  return c.filter(x => e.m.includes(x)).concat(c.filter(x => !e.m.includes(x)));
}
function beats(a, l) {
  if (!l) return true;
  if (twoPlay(l)) return false; // kartu 2 itu teratas: nggak bisa dibales kartu biasa (termasuk 2 lain), cuma bisa dipotong bom
  if (a.t === l.t && a.n === l.n) return rk(a.k) > rk(l.k); // logo nggak ikut dihitung: angka sama nggak bisa saling kalahin. kombinasi + pasangan: cuma bagian utama (3 kembar / seri / 4 kembar) yang dibandingkan, pasangannya bebas asal kembar
  return false;
}

// Bom biasa: 4 kembar / seri 5 satu logo (masing-masing boleh + 1 pasangan). Bom x2: 8 kartu kembar (2 x 4 kembar).
const isBomb = e => e.t === 'q' || e.t === 'g' || (e.t === 'r' && e.n === 5) || (e.t === 'x' && e.n === 7);
const isDouble = e => e.t === 'd' || (e.t === 'r' && e.n >= 10);
const twoPlay = l => !!l && (l.c || []).length > 0 && l.c.every(c => rk(c) === 12); // meja isinya cuma kartu 2
function cuts(e, l) { // bom menimpa kartu 2: game langsung berakhir
  if (!l || !twoPlay(l)) return false;
  return l.c.length === 1 ? (isBomb(e) || isDouble(e)) : isDouble(e); // 2 tunggal: bom biasa; 2 kembar: wajib bom x2
}
const act = g => g.order.filter(p => !(g.fin || []).includes(p));
const has3 = (g, p) => (g.hands[p] || []).some(c => rk(c) === 0);
const addLog = (g, e) => { g.log = (g.log || []).concat([e]); };
function nextTurn(g, passed) {
  let i = g.turn;
  do { i = (i + 1) % g.order.length; } while (passed[g.order[i]] || (g.fin || []).includes(g.order[i]));
  return i;
}
// ronde baru: p yang buka, atau pemain aktif berikutnya kalau p sudah habis kartu
function startRound(g, p) {
  g.last = null; g.passed = {};
  let i = g.order.indexOf(p);
  while ((g.fin || []).includes(g.order[i])) i = (i + 1) % g.order.length;
  g.turn = i;
}
// pemain kehabisan kartu / berhenti -> masuk daftar juara. true kalau game selesai (tinggal 1 pemain)
function finish(g, pid, msg) {
  g.fin.push(pid);
  addLog(g, { p: pid, m: msg + 'juara ' + g.fin.length });
  const a = act(g);
  if (a.length <= 1) { a.forEach(p => g.fin.push(p)); g.over = true; g.winner = g.fin[0]; g.dec = null; return true; }
  return false;
}
function move(g, pid, cards, pass) {
  if (!g || g.over || g.order[g.turn] !== pid) return;
  if (g.dec && Object.keys(g.dec).length) return; // tunggu pemain murni memilih
  g.fin = g.fin || [];
  if (g.fin.includes(pid)) return;
  if (g.first) { // fase kumpulin 3: tiap pemain yang pegang angka 3 keluarin SEMUA kartu 3-nya sekaligus (1, 2, 3 atau 4 kartu)
    if (pass) return;
    const hand = g.hands[pid] || [], m3 = hand.filter(c => rk(c) === 0);
    if (!m3.length || cards.length !== m3.length || !m3.every(c => cards.includes(c))) return;
    g.hands[pid] = hand.filter(c => rk(c) !== 0);
    const sorted = [...cards].sort((a, b) => a - b);
    addLog(g, { p: pid, c: sorted });
    g.last = { p: pid, c: sorted, t: 'c', n: sorted.length, k: sorted[sorted.length - 1], k2: 0 };
    for (let k = 1; k <= g.order.length; k++) { // pemain berikutnya yang masih pegang 3
      const i = (g.turn + k) % g.order.length, p = g.order[i];
      if (!g.fin.includes(p) && has3(g, p)) { g.turn = i; return g; }
    }
    g.first = false; // semua 3 terkumpul: pemegang 3 terendah (3♠ kalau ada) jalan duluan, bebas kombinasi
    addLog(g, { p: g.st, m: 'semua 3 terkumpul, jalan duluan' });
    startRound(g, g.st);
    return g;
  }
  const last = g.last || null, passed = g.passed || {};
  if (pass) {
    if (!last || g.first) return;
    passed[pid] = true;
    addLog(g, { p: pid, x: 1 });
    const waiting = act(g).filter(p => !passed[p] && p !== last.p);
    if (!waiting.length) startRound(g, last.p);
    else { g.passed = passed; g.turn = nextTurn(g, passed); }
    return g;
  }
  const hand = g.hands[pid] || [];
  if (!cards.length || !cards.every(c => hand.includes(c))) return;
  const e = ev(cards);
  if (!e) return;
  const cut = cuts(e, last);
  if (!cut && !beats(e, last)) return;
  g.hands[pid] = hand.filter(c => !cards.includes(c));
  const sorted = arr(cards, e);
  addLog(g, { p: pid, c: sorted });
  g.first = false;
  if (cut) { // bom menimpa kartu 2: game langsung berakhir, pengeluar bom menang
    g.last = { p: pid, c: sorted, t: e.t, n: e.n, k: e.k, k2: e.k2 ?? 0 };
    g.over = true; g.winner = pid; g.bomb = true; g.fin = [pid];
    return g;
  }
  if (!g.hands[pid].length && cards.some(c => rk(c) === 12)) { // habis kartu pakai 2 = ngebom diri sendiri: pemainnya kalah, game batal (nggak ada pemenang), ulang dari kumpulin 3
    g.last = { p: pid, c: sorted, t: e.t, n: e.n, k: e.k, k2: e.k2 ?? 0 };
    g.over = true; g.winner = null; g.self2 = pid; g.fin = []; g.dec = null;
    return g;
  }
  g.last = { p: pid, c: sorted, t: e.t, n: e.n, k: e.k, k2: e.k2 ?? 0 };
  for (const k in passed) delete passed[k]; // lewat cuma berlaku sejak kartu terakhir keluar: tiap ada yang keluarin kartu, semua pemain dapat giliran lagi (nggak ada auto skip)
  if (!g.hands[pid].length) {
    if (finish(g, pid, 'habis kartu, ')) return g;
    if (!act(g).filter(p => !passed[p]).length) { startRound(g, pid); return g; }
    g.passed = passed; g.turn = nextTurn(g, passed);
    return g;
  }
  g.passed = passed;
  g.turn = nextTurn(g, passed);
  if (g.order[g.turn] === pid) startRound(g, pid);
  return g;
}
// pilihan pemain dengan kartu murni (tanpa J, Q, K)
function decide(g, pid, stop) {
  if (!g || g.over || !g.dec || !g.dec[pid]) return;
  g.fin = g.fin || [];
  delete g.dec[pid];
  if (!stop) { addLog(g, { p: pid, m: 'kartu murni, lanjut main' }); return g; }
  // murni berhenti = langsung masuk juara berikutnya (juara 1 kalau yang pertama), game tetap lanjut buat rebutan juara sisanya
  g.hands[pid] = [];
  g.stopped = g.stopped || {}; g.stopped[pid] = true;
  if (finish(g, pid, 'kartu murni, berhenti: ')) return g;
  if (g.first) { // fase kumpulin 3: starter baru = pemegang 3 terendah dari pemain yang tersisa
    const a = act(g), pool = a.filter(p => has3(g, p)), src = pool.length ? pool : a;
    const low = Math.min(...src.map(p => g.hands[p][0]));
    g.st = g.order.find(p => (g.hands[p] || []).includes(low));
    g.turn = g.order.indexOf(g.st); g.first = pool.length > 0;
  } else if (g.order[g.turn] === pid) startRound(g, pid); // pembuka berhenti -> pemain berikutnya yang buka
  return g;
}
// lead = id juara 1 game sebelumnya (jalan duluan, bebas kombinasi). Tanpa lead (game pertama di room / setelah bom instan):
// pemegang kartu 3 terendah (3♠ kalau terbagi) jalan duluan dan wajib mengeluarkannya di kombinasi pertama.
function deal(pids, lead) {
  const d = [...Array(52).keys()];
  for (let i = 51; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [d[i], d[j]] = [d[j], d[i]]; }
  const hands = {}, dec = {};
  pids.forEach((p, i) => {
    hands[p] = d.slice(i * 13, i * 13 + 13).sort((a, b) => a - b);
    if (!hands[p].some(c => rk(c) >= 8 && rk(c) <= 10)) dec[p] = true; // murni: nol J, Q, K
  });
  const q2 = pids.find(p => hands[p].filter(c => rk(c) === 12).length === 4); // dapat 4 kartu 2 = kalah instan, ulang dari kumpulin 3
  if (q2) return { v: VMAJ, order: pids, hands, s: -1, st: q2, turn: 0, last: null, passed: {}, first: false, over: true, quad2: q2, winner: null, dec: null };
  let low = -1, start = pids.indexOf(lead), col = false;
  if (start < 0) {
    low = Math.min(...pids.map(p => hands[p][0]));
    start = pids.findIndex(p => hands[p].includes(low));
    col = low < 4; // ada kartu 3 yang terbagi -> fase kumpulin 3 (kalau nggak ada, pemegang kartu terendah buka bebas)
  }
  return { v: VMAJ, order: pids, hands, s: low, st: pids[start], turn: start, last: null, passed: {}, first: col, over: false, dec: Object.keys(dec).length ? dec : null };
}

// ---------- bot (lawan komputer): 0 Mudah, 1 Sedang, 2 Susah, 3 Master ----------
const BOTN = ['Budi', 'Sari', 'Joko'], LVN = ['Mudah', 'Sedang', 'Susah', 'Master'];
function pickK(a, k) { const r = []; (function f(i, cur) { if (cur.length === k) { r.push(cur.slice()); return; } for (let j = i; j < a.length; j++) { cur.push(a[j]); f(j + 1, cur); cur.pop(); } })(0, []); return r; }
function combos(hand) { // semua kombinasi valid dari tangan
  const c = [...hand].sort((a, b) => a - b), by = {}, out = [], prs = [], sers = [];
  c.forEach(x => (by[rk(x)] = by[rk(x)] || []).push(x));
  const rs = Object.keys(by).map(Number);
  rs.forEach(r => { for (let k = 1; k <= by[r].length; k++) pickK(by[r], k).forEach(x => { out.push(x); if (k === 2) prs.push(x); }); });
  for (let s = 0; s < 4; s++) {
    const cs = c.filter(x => su(x) === s && rk(x) < 8);
    for (let i = 0; i < cs.length; i++) for (let j = i + 2; j < cs.length && rk(cs[j]) - rk(cs[i]) === j - i; j++) sers.push(cs.slice(i, j + 1));
  }
  out.push(...sers);
  rs.forEach(r => {
    if (by[r].length >= 3) pickK(by[r], 3).forEach(t => prs.forEach(p => { if (rk(p[0]) !== r) out.push(t.concat(p)); }));
    if (by[r].length === 4) {
      prs.forEach(p => { if (rk(p[0]) !== r) out.push(by[r].concat(p)); });
      rs.forEach(r2 => { if (r2 > r && by[r2].length === 4) out.push(by[r].concat(by[r2])); });
    }
  });
  sers.forEach(sr => prs.forEach(p => { if (!p.some(x => sr.includes(x))) out.push(sr.concat(p)); }));
  return out.map(cs => ({ cs, e: ev(cs) })).filter(o => o.e);
}
function unseenOf(g, pid) { // kartu yang belum kelihatan (bukan di tangan bot dan belum keluar)
  const seen = new Set(g.hands[pid] || []);
  (g.log || []).forEach(e => (e.c || []).forEach(x => seen.add(x)));
  return [...Array(52).keys()].filter(x => !seen.has(x));
}
function bombPossible(u) { // mungkinkah lawan punya bom (4 kembar / seri 5 satu logo)
  const n = {}; u.forEach(x => { n[rk(x)] = (n[rk(x)] || 0) + 1; });
  if (Object.values(n).some(v => v === 4)) return true;
  for (let s = 0; s < 4; s++) {
    const ids = new Set(u.filter(x => su(x) === s).map(rk));
    for (let st = 0; st <= 3; st++) if ([0, 1, 2, 3, 4].every(i => ids.has(st + i))) return true;
  }
  return false;
}
function turnsLeft(hand) { // perkiraan jumlah giliran buat ngabisin kartu: ambil kombinasi non-bom terbesar berulang kali
  let h = hand, n = 0;
  while (h.length && n < 14) {
    let b = null; for (const o of combos(h)) if (!isBomb(o.e) && !isDouble(o.e) && (!b || o.cs.length > b.cs.length || (o.cs.length === b.cs.length && o.e.k < b.e.k))) b = o;
    if (!b) b = { cs: [h[0]] };
    h = h.filter(x => !b.cs.includes(x)); n++;
  }
  return n;
}
function botMove(g, pid, lv) {
  const hand = g.hands[pid] || [], last = g.last || null;
  if (g.first) return { cards: hand.filter(c => rk(c) === 0) };
  const leg = combos(hand).filter(o => cuts(o.e, last) || beats(o.e, last));
  if (!leg.length) return { pass: true };
  const has2 = o => o.cs.some(c => rk(c) === 12), bomb = o => isBomb(o.e) || isDouble(o.e);
  const cutters = last && twoPlay(last) ? leg.filter(o => cuts(o.e, last)) : [];
  if (cutters.length && (lv > 0 || Math.random() < .5)) return { cards: cutters.sort((a, b) => a.cs.length - b.cs.length)[0].cs }; // bom motong 2 = menang
  const fin = lv > 0 && leg.find(o => o.cs.length === hand.length);
  if (fin) return { cards: fin.cs };
  if (lv === 0) { if (last && Math.random() < .35) return { pass: true }; return { cards: leg[Math.random() * leg.length | 0].cs }; }
  const minOpp = Math.min(99, ...act(g).filter(p => p !== pid).map(p => (g.hands[p] || []).length)), danger = minOpp <= 2;
  const cnt = {}; hand.forEach(c => { cnt[rk(c)] = (cnt[rk(c)] || 0) + 1; });
  const un = lv === 3 ? unseenOf(g, pid) : null, bp = un ? bombPossible(un) : true;
  let best = null, bs = 1e9;
  for (const o of leg) {
    const rs = {}; o.cs.forEach(c => { rs[rk(c)] = (rs[rk(c)] || 0) + 1; });
    let s = o.e.k >> 2;
    if (lv === 1) { if (has2(o) || bomb(o)) s += 20; }
    else {
      if (has2(o)) s += lv === 3 ? (bp ? 30 : 4) : 12; // 2 yang keluar bisa dipotong bom: master cek dulu
      if (bomb(o) && !(last && twoPlay(last))) s += danger ? 0 : 14; // bom disimpen buat motong 2
      for (const r in rs) { const rem = cnt[r] - rs[r]; if (rem > 0 && cnt[r] >= 2) s += cnt[r] >= 3 ? 5 : 3; } // jangan pecahin pasangan / tiga kembar
      s -= o.cs.length * (lv === 3 ? 2.5 : 1.5);
      if (!last && lv >= 2) { if (minOpp === 1 && o.cs.length === 1) s += 8; if (minOpp === 2 && o.cs.length === 2) s += 5; }
      if (!last && lv === 3 && o.e.t === 's') { const k = o.e.k; if (rk(k) === 12 ? !bp : !un.some(x => rk(x) > rk(k))) s -= 5; } // kartu yang pasti nggak kebales
      if (last && last.n === 1 && minOpp === 1) s = -o.e.k; // lawan sisa 1 kartu: keluarin yang tertinggi
    }
    o.s = s;
    if (s < bs) { bs = s; best = o; }
  }
  if (lv === 3) { // master: dari 6 kandidat terbaik, pilih yang bikin sisa kartu paling cepat habis
    let bb = 1e9; for (const o of leg.slice().sort((a, b) => a.s - b.s).slice(0, 6)) { const v = o.s + 8 * turnsLeft(hand.filter(x => !o.cs.includes(x))); if (v < bb) { bb = v; best = o; } }
  }
  if (last && !cutters.length && (has2(best) || bomb(best)) && !(danger || hand.length <= 4) && (lv >= 2 || Math.random() < .7)) return { pass: true };
  return { cards: best.cs };
}
const botDecide = lv => lv === 0 ? Math.random() < .5 : true; // murni: bot Mudah acak, lainnya langsung berhenti (juara)

// ---------- state lokal ----------
let me = localStorage.getItem('k13pid');
if (!me) { me = 'p' + Math.random().toString(36).slice(2, 10); localStorage.setItem('k13pid', me); }
let lastLog = -1, code = null, room = null, ref = null, sel = new Set(), err = '', sig = '';
let fly = null, order = [], drag = null, pendingDraw = false, dragEnd = 0; // urutan kartu di tangan: diatur sendiri sama pemain, cuma lokal (nggak dikirim ke server)

function setErr(m) { err = m; draw(); }
function genCode() {
  return Array.from({ length: 5 }, () => Math.random() * 10 | 0).join(''); // 5 digit angka
}
async function createRoom() {
  const name = document.getElementById('nm').value.trim();
  if (!name) return setErr('Isi nama dulu.');
  localStorage.setItem('k13name', name);
  for (let i = 0; i < 5; i++) {
    const c = genCode();
    const r = await db.ref('rooms/' + c).transaction(v => v === null ? { host: me, status: 'lobby', created: Date.now(), players: { [me]: { n: name, t: Date.now() } } } : undefined);
    if (r.committed) return enter(c);
  }
  setErr('Gagal bikin room, coba lagi.');
}
async function joinRoom() {
  const name = document.getElementById('nm').value.trim();
  const c = document.getElementById('cd').value.trim().toUpperCase();
  if (!name) return setErr('Isi nama dulu.');
  if (!/^\d{5}$/.test(c)) return setErr('Kode room 5 angka.');
  localStorage.setItem('k13name', name);
  let reason = '';
  const r = await db.ref('rooms/' + c).transaction(v => {
    if (!v) { reason = 'Room tidak ditemukan.'; return v; }
    const ps = v.players || {};
    if (ps[me]) return v;
    if (v.status !== 'lobby') { reason = 'Game sudah dimulai.'; return; }
    if (Object.keys(ps).length >= 4) { reason = 'Room penuh (maks 4).'; return; }
    ps[me] = { n: name, t: Date.now() };
    v.players = ps;
    return v;
  });
  if (!r.committed || !r.snapshot.val()) return setErr(reason || 'Gagal join.');
  enter(c);
}
const ROOM_KEYS = ['players', 'host', 'status', 'game', 'bot'];
function enter(c) {
  lastLog = -1; code = c; err = ''; sel.clear(); sig = ''; order = [];
  localStorage.setItem('k13room', c);
  ref = db.ref('rooms/' + c);
  preloadCards(); wlAcquire();
  chatOn(c);
  reactOn(c);
  presOn();
  // Dengerin bagian room yang dipakai meja aja (players, host, status, game, bot) + presence terpisah.
  // chat, voice, sinyal WebRTC, dan reaksi punya listener sendiri, jadi nggak ikut ke-download tiap ada perubahan.
  const myRef = ref, parts = {}, ldd = new Set(), lastJ = {}; let q = false;
  const flush = () => {
    q = false; if (ref !== myRef || ROOM_KEYS.some(k => !ldd.has(k))) return; // tunggu semua bagian awal masuk dulu
    const ps = parts.players;
    if (!ps || !ps[me]) { leave(true); return; } // room dibubarkan / kita udah nggak terdaftar
    room = { players: ps, host: parts.host, status: parts.status, game: parts.game, bot: parts.bot, presence: pres };
    draw(); botTick(); turnBuzz(); vUI();
  };
  ROOM_KEYS.forEach(k => myRef.child(k).on('value', s => {
    if (ref !== myRef) return;
    const v = s.val(), j = JSON.stringify(v);
    if (ldd.has(k) && j === lastJ[k]) return; // nggak berubah (mis. event lokal sebelum konfirmasi server)
    lastJ[k] = j; parts[k] = v; ldd.add(k);
    if (!q) { q = true; Promise.resolve().then(flush); } // gabung perubahan beberapa bagian dalam satu gambar ulang
  }));
  myRef.child('presence').on('value', s => { // heartbeat: cukup update penanda online, nggak gambar ulang meja
    if (ref !== myRef) return;
    pres = s.val() || {};
    if (!room) return;
    room.presence = pres; paintPres(); botTick(); vUI();
  });
}
function leave(silent) {
  clearTimeout(botT); botT = null; arnHide(); arnKey = '';
  presOff(); sig = '';
  if (ref) { ref.off(); [...ROOM_KEYS, 'presence'].forEach(k => ref.child(k).off()); }
  chatOff(); reactOff(); voiceOff(); wlRelease();
  if (!silent && room && room.status === 'lobby') {
    if (room.host === me) ref.remove(); else { ref.child('players/' + me).remove(); ref.child('presence/' + me).remove(); }
  }
  localStorage.removeItem('k13room');
  abortDrag(); order = []; try { localStorage.removeItem('k13ord'); } catch (_) {}
  lastLog = -1; code = room = ref = null; sel.clear(); draw(); vUI();
  setTimeout(probe, 300);
}
function start() {
  const pids = Object.entries(room.players).sort((a, b) => a[1].t - b[1].t).map(x => x[0]);
  if (pids.length < 2) return;
  const pg = room.game; // juara 1 game sebelumnya jalan duluan, kecuali game sebelumnya berakhir karena bom instan
  const lead = pg && pg.over && !pg.bomb && pg.fin && pids.includes(pg.fin[0]) ? pg.fin[0] : null;
  ref.update({ status: 'play', game: deal(pids, lead) });
}
// driver bot: satu pemain manusia yang online (host dulu, kalau host AFK pindah ke pemain berikutnya) menjalankan bot.
// Bot = pemain dengan flag bot di room.players, ATAU pemain manusia yang AFK (putus / tutup browser / pindah tab lama).
let botT = null;
const isBot = p => !!((room && room.players || {})[p] || {}).bot;
const humans = () => Object.values((room && room.players) || {}).filter(p => !p.bot).length;
const isAfk = p => !isBot(p) && humans() > 1 && pinfo(p).s === 'afk'; // cuma di room multi-pemain, kalau sendirian nggak ada yang ngambil alih
const auto = p => isBot(p) || isAfk(p);
function driver() {
  if (!room) return null;
  const ps = room.players || {};
  const ids = Object.keys(ps).filter(id => !ps[id].bot).sort((x, y) => x === room.host ? -1 : y === room.host ? 1 : ps[x].t - ps[y].t);
  return ids.find(id => id === me || !isAfk(id)) || null;
}
// ---------- giliran lo: getar tipis sekali (nggak ada timer, nggak ada hitung mundur, nggak ada jalan otomatis) ----------
let buzzKey = '';
function turnBuzz() {
  const g = room && room.game;
  if (!g || room.status === 'lobby' || g.over || g.v !== VMAJ || (g.dec && Object.keys(g.dec).length)) { buzzKey = ''; return; }
  if (g.order[g.turn] !== me || (g.fin || []).includes(me)) { buzzKey = ''; return; }
  const key = (g.log || []).length + ':' + g.turn;
  if (key === buzzKey) return;
  buzzKey = key;
  try { navigator.vibrate && navigator.vibrate(25); } catch (_) {}
}
const hostNow = () => driver() === me; // "host efektif": host asli kalau masih aktif, kalau nggak pemain aktif berikutnya
function botTick() {
  if (!room || room.status === 'lobby' || botT || !conn || Date.now() - connAt < 3000) return; // jeda 3 dtk habis reconnect: tunggu data presence segar
  const g = room.game; if (!g || g.over || g.v !== VMAJ) return;
  if (driver() !== me) return;
  const lv = room.bot ? room.bot.lv | 0 : 2, dec = g.dec || {}, bd = Object.keys(dec).find(p => p !== me && auto(p));
  if (bd) { botT = setTimeout(() => { botT = null; if (!auto(bd) || driver() !== me) return botTick(); const stop = isBot(bd) ? botDecide(lv) : false; ref.child('game').transaction(x => x === null ? x : x.v !== VMAJ ? undefined : decide(x, bd, stop), () => botTick(), false); }, 600); return; }
  if (Object.keys(dec).length) return; // nunggu pemain murni (manusia yang masih aktif) memilih
  const cur = g.order[g.turn];
  if (cur === me || !auto(cur) || (g.fin || []).includes(cur)) return;
  botT = setTimeout(() => {
    botT = null;
    const g2 = room && room.game;
    if (!g2 || g2.over || g2.order[g2.turn] !== cur || !auto(cur) || driver() !== me) return botTick(); // pemain udah balik / giliran udah pindah
    const m = botMove(g2, cur, lv);
    const run = (cards, pass, next) => ref.child('game').transaction(x => x === null ? x : x.v !== VMAJ ? undefined : move(x, cur, cards, pass), (e, ok) => { if (!ok && next) next(); else botTick(); }, false);
    run(m.cards || [], !!m.pass, () => run([], true, () => run([Math.min(...(g2.hands[cur] || [0]))], false))); // cadangan: lewat, lalu kartu terkecil
  }, 800 + Math.random() * 700);
}
async function createBotRoom() {
  const name = document.getElementById('nm').value.trim();
  if (!name) return setErr('Isi nama dulu.');
  localStorage.setItem('k13name', name);
  const lv = +document.getElementById('bl').value, t = Date.now(), players = { [me]: { n: name, t } };
  BOTN.forEach((n, i) => { players['bot' + (i + 1)] = { n: 'Bot ' + n, t: t + i + 1, bot: true }; });
  const pids = Object.keys(players);
  for (let i = 0; i < 5; i++) {
    const c = genCode();
    const r = await db.ref('rooms/' + c).transaction(v => v === null ? { host: me, status: 'play', created: t, bot: { lv }, players, game: deal(pids, null) } : undefined);
    if (r.committed) return enter(c);
  }
  setErr('Gagal bikin room, coba lagi.');
}
function decideCall(stop) { ref.child('game').transaction(g => g === null ? g : g.v !== VMAJ ? undefined : decide(g, me, stop)); }
function why(g, cards) {
  const hand = g.hands[me] || [], last = g.last || null, e = ev(cards);
  if (!cards.every(c => hand.includes(c))) return 'Kartu itu nggak ada di tangan lo. Coba refresh halaman.';
  if (g.first) { const m3 = hand.filter(c => rk(c) === 0); return cards.length === m3.length && m3.every(c => cards.includes(c)) ? '' : 'Fase kumpulin 3: keluarin semua kartu 3 lo sekaligus (' + m3.length + ' kartu).'; }
  if (!e) return cards.length > 2 ? 'Bukan kombinasi valid. Seri harus satu logo semua (3+ kartu berurutan, tanpa 2). Lainnya: pasangan, 3 kembar, 3 kembar + pasangan, seri + pasangan.' : 'Dua kartu harus angka sama (pasangan).';
  if (cuts(e, last)) return '';
  if (last && twoPlay(last)) return last.c.length === 1 ? 'Kartu 2 nggak bisa dibales kartu biasa. Cuma bisa lewat atau dipotong bom (4 kembar, seri 5 satu logo, atau bom x2).' : 'Kartu 2 kembar nggak bisa dibales kartu biasa. Cuma bisa lewat atau dipotong bom x2 (8 kartu kembar).';
  if (last && twoPlay(last) && last.c.length >= 2 && (isBomb(e) || e.t === 'q')) return 'Kartu 2 kembar cuma bisa dipotong 8 kartu kembar (2 x 4 kembar, misal 3333 + 6666).';
  if (last && !beats(e, last)) return (e.t !== last.t || e.n !== last.n) ? 'Harus jenis dan jumlah kartu yang sama: ' + typeName[last.t] + (last.t === 'r' ? ' ' + last.n + ' kartu' : '') + '.' : ((e.t === 'f' || e.t === 'x' || e.t === 'g') ? 'Bagian utamanya (3 kembar / seri / 4 kembar) harus lebih tinggi dari yang di meja. Pasangannya bebas.' : 'Kartunya kurang tinggi dari yang di meja.');
  return '';
}
function play(pass) {
  const cards = [...sel];
  if (room.game && room.game.v !== VMAJ) return setErr('Versi halaman lo beda dengan game ini. Tunggu update otomatis atau hard refresh dulu.');
  if (!pass && room.game) { const w = why(room.game, cards); if (w) return setErr(w); }
  ref.child('game').transaction(g => g === null ? g : g.v !== VMAJ ? undefined : move(g, me, cards, pass), (e, ok) => {
    if (!ok) { err = pass ? 'Tidak bisa lewat sekarang.' : 'Kombinasi tidak valid / tidak cukup tinggi.'; draw(); }
    else { err = ''; sel.clear(); }
  }, false);
}

// ---------- chat room (Firebase: rooms/<kode>/chat) ----------
let chatRef = null, lastSend = 0, lastKey = null, unread = 0, toastT = null;
const QUICK = ['😂 Kartu lo jelek banget!', 'Gas terus! 🔥', 'Yah kasian 😅', 'GG! 👏'];
const $id = x => document.getElementById(x);
const chatInView = () => { const r = $id('chat').getBoundingClientRect(); return r.top < innerHeight - 60 && r.bottom > 60; };
function setBadge() { const b = $id('cbadge'); b.textContent = unread > 0 ? String(Math.min(unread, 9)) : ''; b.hidden = unread < 1; }
function showToast(n, m) {
  const t = $id('ctoast'); t.innerHTML = '<b>' + esc(n || '?') + '</b> ' + esc(m || ''); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 4500);
}
function chatOn(c) {
  chatOff();
  lastKey = null; unread = 0; setBadge();
  chatRef = db.ref('rooms/' + c + '/chat').limitToLast(50);
  chatRef.on('value', snap => {
    const box = $id('cmsg'), stick = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    const ents = Object.entries(snap.val() || {}).sort((a, b) => a[0] < b[0] ? -1 : 1);
    box.innerHTML = ents.map(([, m]) => `<div class="cm ${m.p === me ? 'mine' : ''}"><b>${esc(m.n || '?')}</b> ${esc(m.m || '')}</div>`).join('') || '<i>Belum ada pesan. Sapa temen lo!</i>';
    if (stick) box.scrollTop = box.scrollHeight;
    if (lastKey !== null) { // pesan baru dari pemain lain: bunyi + notifikasi kalau panel chat nggak lagi kelihatan
      const fresh = ents.filter(([k, m]) => k > lastKey && m.p !== me);
      if (fresh.length) {
        Snd.msg();
        if (!chatInView()) { unread += fresh.length; setBadge(); const m = fresh[fresh.length - 1][1]; showToast(m.n, m.m); }
      }
    }
    lastKey = ents.length ? ents[ents.length - 1][0] : '';
  });
  $id('chat').hidden = false; $id('cfab').hidden = false;
}
function chatOff() {
  if (chatRef) chatRef.off();
  chatRef = null; unread = 0;
  $id('chat').hidden = true; $id('cfab').hidden = true; $id('ctoast').hidden = true; $id('cmsg').innerHTML = '';
}
function sendText(m) {
  m = (m || '').trim().slice(0, 140);
  if (!m || !code || Date.now() - lastSend < 700) return false;
  lastSend = Date.now();
  const name = (room && room.players && room.players[me] && room.players[me].n) || localStorage.getItem('k13name') || '?';
  db.ref('rooms/' + code + '/chat').push({ p: me, n: name, m, t: firebase.database.ServerValue.TIMESTAMP });
  return true;
}
function sendChat() { const inp = $id('cin'); if (sendText(inp.value)) inp.value = ''; }
$id('csend').onclick = sendChat;
$id('cin').onkeydown = e => { if (e.key === 'Enter') sendChat(); };
QUICK.forEach(t => { const b = document.createElement('button'); b.className = 'ghost chip'; b.textContent = t; b.onclick = () => sendText(t); $id('chips').appendChild(b); });
$id('cfab').onclick = () => { $id('chat').scrollIntoView({ behavior: 'smooth', block: 'end' }); unread = 0; setBadge(); $id('ctoast').hidden = true; };
$id('ctoast').onclick = () => $id('cfab').onclick();
addEventListener('scroll', () => { if (unread && chatInView()) { unread = 0; setBadge(); } }, { passive: true });

// ---------- reaksi emoji: rooms/<kode>/react (efek melayang, nggak disimpan lama) ----------
const REACT = ['😂', '🔥', '👏', '😭', '😡', '🤡', '💀', '👀'];
let reactRef = null, reactReady = false, lastReact = 0;
function floatReact(n, e) {
  const el = document.createElement('div'); el.className = 'rx';
  el.style.left = (12 + Math.random() * (innerWidth - 90)) + 'px'; el.style.bottom = (110 + Math.random() * 60) + 'px';
  el.innerHTML = '<i>' + esc(e) + '</i>' + esc(n || '');
  document.body.appendChild(el); setTimeout(() => el.remove(), 2500);
}
function reactOn(c) {
  reactOff(); reactReady = false;
  reactRef = db.ref('rooms/' + c + '/react').limitToLast(1);
  reactRef.on('child_added', s => {
    const m = s.val();
    if (!reactReady || !m || !REACT.includes(m.e)) return;
    floatReact(m.p === me ? 'Lo' : m.n, m.e);
    if (m.p !== me) Snd.msg();
  });
  reactRef.once('value').then(() => { reactReady = true; });
  $id('rfab').hidden = false;
}
function reactOff() {
  if (reactRef) reactRef.off();
  reactRef = null; reactReady = false;
  $id('rfab').hidden = true; $id('rbar').hidden = true;
}
function sendReact(e) {
  if (!code || Date.now() - lastReact < 400) return;
  lastReact = Date.now();
  const name = (room && room.players && room.players[me] && room.players[me].n) || localStorage.getItem('k13name') || '?';
  const r = db.ref('rooms/' + code + '/react').push({ p: me, n: name, e });
  setTimeout(() => r.remove().catch(() => {}), 8000);
  $id('rbar').hidden = true;
}
REACT.forEach(e => { const b = document.createElement('button'); b.textContent = e; b.setAttribute('aria-label', 'Kirim ' + e); b.onclick = () => sendReact(e); $id('rbar').appendChild(b); });
$id('rfab').onclick = () => { const b = $id('rbar'); b.hidden = !b.hidden; };

// ---------- voice chat: WebRTC antar pemain (mesh), sinyal lewat Firebase rooms/<kode>/voice + vsig ----------
// Suara langsung HP ke HP. Firebase cuma buat "kenalan" (offer/answer/ICE), nggak ada audio yang lewat server.
// Jaringan seluler yang ketat kadang nggak bisa nyambung cuma pakai STUN: kalau ada yang nggak kedengaran, tambahin server TURN di VOICE_ICE.
const VOICE_STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
// TURN = server relay, wajib biar suara tembus antar jaringan beda (data seluler 5G/CGNAT, wifi kantor, dll). STUN doang sering gagal.
// Cara gampang & gratis: daftar di metered.ca (Open Relay), bikin app, lalu isi dua baris ini:
const TURN_APP = '';   // contoh: 'poker13' (dari poker13.metered.live)
const TURN_KEY = '';   // API key dari dashboard metered.ca
// atau isi manual server TURN lain di sini: [{ urls: 'turn:host:443', username: '...', credential: '...' }]
const TURN_MANUAL = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80', username: 'ab597c34ed266524bbe49b26', credential: 'gy41gktZ6lA0pvU2' },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: 'ab597c34ed266524bbe49b26', credential: 'gy41gktZ6lA0pvU2' },
  { urls: 'turn:global.relay.metered.ca:443', username: 'ab597c34ed266524bbe49b26', credential: 'gy41gktZ6lA0pvU2' },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: 'ab597c34ed266524bbe49b26', credential: 'gy41gktZ6lA0pvU2' }
];
let VOICE_ICE = VOICE_STUN.concat(TURN_MANUAL);
async function loadTurn() {
  if (!TURN_APP || !TURN_KEY) return;
  try {
    const r = await fetch('https://' + TURN_APP + '.metered.live/api/v1/turn/credentials?apiKey=' + encodeURIComponent(TURN_KEY));
    const l = await r.json();
    if (Array.isArray(l) && l.length) VOICE_ICE = VOICE_STUN.concat(TURN_MANUAL, l);
  } catch (_) {}
}
const vSafari = /iP(hone|ad|od)/.test(navigator.userAgent) || /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent); // Safari: WebAudio + stream remote suka bikin suara hening
let vMicBad = false;
const voiceOK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection);
let vPtt = localStorage.getItem('k13ptt') === '1', vStream = null, vMuted = false, vPeers = {}, vMembers = {}, vJoined = false, vBusy = false, vCode = null, vCtx = null, vLocal = null, vTimer = null, vShown = '', vRefs = [];
const vpath = x => 'rooms/' + vCode + '/' + x;
function vAnalyser(stream) {
  vCtx = vCtx || new (window.AudioContext || window.webkitAudioContext)();
  const src = vCtx.createMediaStreamSource(stream), an = vCtx.createAnalyser();
  an.fftSize = 512; src.connect(an);
  return { an, src, buf: new Uint8Array(an.fftSize) };
}
function vLevel(A) {
  A.an.getByteTimeDomainData(A.buf);
  let t = 0; for (let i = 0; i < A.buf.length; i++) { const d = (A.buf[i] - 128) / 128; t += d * d; }
  return Math.sqrt(t / A.buf.length);
}
// hemat kuota TURN: Opus ~24 kbps (suara tetap jernih), DTX = nggak kirim data pas hening, FEC = tahan paket hilang
const VOICE_KBPS = 24;
function vOpus(sdp) {
  const m = sdp.match(/a=rtpmap:(\d+) opus\/48000/i); if (!m) return sdp;
  const pt = m[1], add = 'maxaveragebitrate=' + VOICE_KBPS * 1000 + ';stereo=0;sprop-stereo=0;useinbandfec=1;usedtx=1;maxplaybackrate=24000';
  const re = new RegExp('(a=fmtp:' + pt + ' )([^\\r\\n]*)');
  if (re.test(sdp)) return sdp.replace(re, (_, a, b) => a + b.replace(/;?(maxaveragebitrate|stereo|sprop-stereo|useinbandfec|usedtx|maxplaybackrate)=[^;]*/g, '').replace(/^;/, '') + ';' + add);
  return sdp.replace(new RegExp('(a=rtpmap:' + pt + ' [^\\r\\n]*\\r?\\n)'), '$1a=fmtp:' + pt + ' ' + add + '\r\n');
}
function vCap(pc) { // batasi bitrate kirim
  try {
    pc.getSenders().forEach(sn => {
      if (!sn.track || sn.track.kind !== 'audio') return;
      const pr = sn.getParameters(); if (!pr.encodings || !pr.encodings.length) pr.encodings = [{}];
      pr.encodings[0].maxBitrate = VOICE_KBPS * 1000;
      sn.setParameters(pr).catch(() => {});
    });
  } catch (_) {}
}
function vSend(to, k, d) { if (vCode) db.ref(vpath('vsig/' + to)).push({ f: me, k, d: JSON.stringify(d) }); }
function vDrop(q) {
  const P = vPeers[q]; if (!P) return;
  delete vPeers[q];
  try { P.pc.close(); } catch (_) {}
  if (P.audio) { P.audio.srcObject = null; P.audio.remove(); }
  try { if (P.A) P.A.src.disconnect(); } catch (_) {}
}
function vMkPeer(q, vt) { // pemain ber-id lebih kecil yang kirim offer (biar nggak tabrakan)
  vDrop(q);
  const pc = new RTCPeerConnection({ iceServers: VOICE_ICE }), P = { pc, vt, q: Promise.resolve(), audio: null, A: null };
  vPeers[q] = P;
  vStream.getTracks().forEach(t => pc.addTrack(t, vStream));
  pc.onicecandidate = e => { if (e.candidate) vSend(q, 'ice', e.candidate.toJSON()); };
  pc.ontrack = e => {
    const st = e.streams[0]; if (!st) return;
    if (!P.audio) { const a = document.createElement('audio'); a.autoplay = true; a.setAttribute('playsinline', ''); a.muted = false; a.volume = 1; document.body.appendChild(a); P.audio = a; }
    P.audio.srcObject = st;
    const go = () => P.audio && P.audio.play().catch(() => showToast('Voice', 'Suara ketahan browser. Tap layar sekali buat nyalain.'));
    go(); e.track.onunmute = () => { if (P.audio && P.audio.paused) go(); };
    if (!vSafari) { try { if (P.A) P.A.src.disconnect(); P.A = vAnalyser(st); } catch (_) {} } // di Safari/iOS stream lawan nggak dimasukin WebAudio (indikator ngomong lawan dimatiin biar suara aman)
  };
  pc.onconnectionstatechange = () => {
    vUI();
    if (pc.connectionState === 'connected') vCap(pc);
    if (pc.connectionState !== 'failed') return;
    setTimeout(() => {
      if (vPeers[q] !== P || pc.connectionState !== 'failed') return;
      vDrop(q); if (me < q && vMembers[q]) vMkPeer(q, vMembers[q]);
    }, 1500);
  };
  if (me < q) pc.createOffer().then(o => pc.setLocalDescription({ type: o.type, sdp: vOpus(o.sdp) })).then(() => vSend(q, 'offer', pc.localDescription.toJSON())).catch(() => {});
  return P;
}
function vOnSig(snap) {
  const m = snap.val(); snap.ref.remove();
  if (!m || !vJoined || !m.f || m.f === me) return;
  let d; try { d = JSON.parse(m.d); } catch (_) { return; }
  let P = vPeers[m.f];
  if (m.k === 'offer') {
    if (!P || P.pc.remoteDescription) P = vMkPeer(m.f, vMembers[m.f] || 0);
    P.q = P.q.then(async () => { await P.pc.setRemoteDescription(d); { const an = await P.pc.createAnswer(); await P.pc.setLocalDescription({ type: an.type, sdp: vOpus(an.sdp) }); } vSend(m.f, 'answer', P.pc.localDescription.toJSON()); }).catch(() => {});
  } else if (P && m.k === 'answer') P.q = P.q.then(() => P.pc.setRemoteDescription(d)).catch(() => {});
  else if (P && m.k === 'ice') P.q = P.q.then(() => P.pc.addIceCandidate(d)).catch(() => {});
}
function vSync(snap) { // daftar pemain yang lagi di voice berubah
  const v = snap.val() || {}; vMembers = {};
  Object.keys(v).forEach(k => { if (k !== me) vMembers[k] = (v[k] && v[k].t) || 1; });
  Object.keys(vPeers).forEach(q => {
    const P = vPeers[q];
    if (!vMembers[q]) vDrop(q);
    else if (P.vt && P.vt !== vMembers[q]) { vDrop(q); if (me < q) vMkPeer(q, vMembers[q]); } // dia keluar lalu masuk lagi: sambungan baru
    else if (!P.vt) P.vt = vMembers[q];
  });
  Object.keys(vMembers).forEach(q => { if (!vPeers[q] && me < q) vMkPeer(q, vMembers[q]); });
  vUI();
}
function vTick() { // siapa yang lagi ngomong
  const names = [], nm = p => ((room && room.players && room.players[p]) || {}).n || '?';
  if (vJoined && !vMuted && vLocal && vLevel(vLocal) > .02) names.push('Lo');
  Object.keys(vPeers).forEach(q => { const P = vPeers[q]; if (P.A && vLevel(P.A) > .03) names.push(nm(q)); });
  const txt = names.length ? '🔊 ' + names.join(', ') : '';
  const ids = [];
  if (vJoined && !vMuted && vLocal && vLevel(vLocal) > .02) ids.push(me);
  Object.keys(vPeers).forEach(q => { const P = vPeers[q]; if (P.A && vLevel(P.A) > .03) ids.push(q); });
  document.querySelectorAll('[data-p]').forEach(el => el.classList.toggle('talk', ids.includes(el.dataset.p))); // sorot kartu pemain yang lagi ngomong
  if (txt === vShown) return;
  vShown = txt; const el = $id('vspk'); el.textContent = txt; el.hidden = !txt;
}
async function voiceJoin() {
  if (vJoined || vBusy || !code) return;
  vBusy = true;
  await loadTurn();
  try { vStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch (_) { vBusy = false; showToast('Voice', 'Mic nggak bisa dipakai. Cek izin mic di browser.'); return; }
  vBusy = false;
  if (!code) { vStream.getTracks().forEach(t => t.stop()); vStream = null; return; }
  vCode = code; vJoined = true; vMuted = vPtt; vMembers = {};
  vMicBad = false;
  vStream.getAudioTracks().forEach(t => {
    t.enabled = !vMuted;
    t.onended = () => { showToast('Voice', 'Mic keputus (dipakai app lain / telepon masuk?). Tap 🎤 lagi.'); voiceOff(); };
    t.onmute = () => { vMicBad = true; vUI(); };
    t.onunmute = () => { vMicBad = false; vUI(); };
  });
  try { vLocal = vAnalyser(vStream); if (vCtx.state === 'suspended') vCtx.resume(); } catch (_) {}
  const sg = db.ref(vpath('vsig/' + me)), vr = db.ref(vpath('voice')), mine = vr.child(me);
  await sg.remove();
  sg.onDisconnect().remove(); mine.onDisconnect().remove();
  sg.on('child_added', vOnSig); vr.on('value', vSync);
  vRefs = [[sg, 'child_added', vOnSig], [vr, 'value', vSync]];
  mine.set({ t: firebase.database.ServerValue.TIMESTAMP });
  vTimer = setInterval(vTick, 250);
  vUI();
}
function voiceOff() {
  if (!vJoined) return;
  vJoined = false; clearInterval(vTimer); vTimer = null;
  vRefs.forEach(([r, ev, fn]) => r.off(ev, fn)); vRefs = [];
  Object.keys(vPeers).forEach(vDrop);
  try { db.ref(vpath('voice/' + me)).remove(); db.ref(vpath('vsig/' + me)).remove(); } catch (_) {}
  if (vStream) vStream.getTracks().forEach(t => t.stop());
  document.querySelectorAll('.talk').forEach(el => el.classList.remove('talk'));
  vStream = null; vLocal = null; vMembers = {}; vShown = ''; $id('vspk').hidden = true; vCode = null; vMicBad = false;
  vUI();
}
function vLink() { // status sambungan ke tiap pemain, buat nyari tahu kenapa suara nggak kedengaran
  const ids = Object.keys(vMembers); if (!ids.length) return '';
  const ok = ids.filter(q => vPeers[q] && vPeers[q].pc.connectionState === 'connected').length;
  const blocked = ids.some(q => vPeers[q] && vPeers[q].audio && vPeers[q].audio.paused && vPeers[q].audio.srcObject);
  if (ok === ids.length) return ' • tersambung ✓' + (blocked ? ' • ⚠ suara ketahan, tap layar sekali' : '');
  const bad = ids.some(q => vPeers[q] && ['failed', 'disconnected'].includes(vPeers[q].pc.connectionState));
  return ' • nyambung ' + ok + '/' + ids.length + (bad ? ' (gagal, jaringan butuh TURN)' : ' ...');
}
function vUI() {
  const f = $id('vfab'), r = $id('vrow'), ps = (room && room.players) || {};
  const avail = voiceOK && !!code && Object.values(ps).filter(p => p && !p.bot).length >= 2; // minimal 2 pemain asli (sisanya boleh bot)
  f.hidden = !(avail || vJoined);
  f.textContent = !vJoined ? '🎤' : vMuted ? (vPtt ? '✋' : '🔇') : '🎙️';
  f.className = 'fab vfab' + (vJoined ? (vPtt ? ' ptt' + (vMuted ? '' : ' on') : (vMuted ? ' mute' : ' on')) : '');
  $id('vptt').textContent = vPtt ? 'Mode: tahan ngomong' : 'Mode: open mic';
  r.hidden = !vJoined;
  $id('vst').textContent = vJoined ? (vPtt ? (vMuted ? 'Tahan tombol ✋ buat ngomong' : 'Lagi ngomong...') : (vMuted ? 'Mic lo mati, tap 🔇 buat nyalain' : 'Mic lo nyala, tap 🎙️ buat mute')) + ' • ' + (Object.keys(vMembers).length + 1) + ' orang di voice' + vLink() + (vMicBad ? ' • ⚠ mic lo diblok sistem (app lain / telepon lagi pakai mic?)' : '') : '';
}
function vSetMute(m) { vMuted = m; if (vStream) vStream.getAudioTracks().forEach(t => { t.enabled = !vMuted; }); vUI(); }
$id('vfab').onclick = () => {
  if (!vJoined) return voiceJoin();
  if (!vPtt) vSetMute(!vMuted); // mode tahan-ngomong diurus pointerdown/up
};
(function () {
  const f = $id('vfab'), down = e => { if (vJoined && vPtt) { e.preventDefault(); try { f.setPointerCapture(e.pointerId); } catch (_) {} vSetMute(false); } }, up = () => { if (vJoined && vPtt && !vMuted) vSetMute(true); };
  f.addEventListener('pointerdown', down); f.addEventListener('pointerup', up); f.addEventListener('pointercancel', up); f.addEventListener('lostpointercapture', up);
  f.addEventListener('contextmenu', e => e.preventDefault());
})();
$id('vptt').onclick = () => {
  vPtt = !vPtt; localStorage.setItem('k13ptt', vPtt ? '1' : '0');
  vSetMute(vPtt); // PTT: mulai mute; open mic: langsung nyala
};
$id('vleave').onclick = voiceOff;
function vKick() { if (!vJoined) return; try { if (vCtx && vCtx.state === 'suspended') vCtx.resume(); } catch (_) {} Object.values(vPeers).forEach(P => { if (P.audio && P.audio.paused && P.audio.srcObject) P.audio.play().catch(() => {}); }); }
document.addEventListener('pointerdown', vKick, { passive: true });
setInterval(() => { if (vJoined) vUI(); }, 2000); // refresh status koneksi

// ---------- presence: ping server, ping pemain, status AFK ----------
// rooms/<kode>/presence/<pid> = { online, seen (heartbeat 5 dtk), ping (ms), hid (waktu pindah tab), off (waktu putus) }
// putus / tutup browser dideteksi server lewat onDisconnect, jadi tetap jalan walau tab sudah mati.
const TS = firebase.database.ServerValue.TIMESTAMP;
const SRV_STALE = 25000, AFK_GRACE = 8000, AWAY_MAX = 20000; // heartbeat basi / jeda sebelum bot ambil alih / pindah tab maksimal (ms)
let conn = false, connAt = 0, myPing = null, svOff = 0, pres = {}, hbT = null, tickT = null, hidAt = 0, lastDrv = null;
const nowS = () => Date.now() + svOff;
db.ref('.info/serverTimeOffset').on('value', s => { svOff = s.val() || 0; });
db.ref('.info/connected').on('value', s => {
  conn = !!s.val();
  if (conn) connAt = Date.now();
  if (!conn) myPing = null;
  paintSrv();
  if (conn && ref) presUp();
  probe();
  botTick();
});
function presUp() { // daftar onDisconnect dulu, baru tandai online
  if (!ref) return;
  ref.child('presence/' + me).onDisconnect().update({ online: false, off: TS }).then(beat);
}
function beat() {
  if (!ref || !conn) return;
  const t0 = Date.now(), h = document.hidden;
  if (h) { if (!hidAt) hidAt = nowS(); } else hidAt = 0;
  ref.child('presence/' + me).update({ online: true, seen: TS, ping: myPing, hid: h ? hidAt : null }, e => {
    if (e) return;
    if (!h) myPing = Date.now() - t0; // ping = waktu sampai server balas konfirmasi tulis
    paintPres();
  });
}
function tick() {
  if (!room) return;
  paintPres();
  const d = driver();
  if (d !== lastDrv) { lastDrv = d; if (room.game && room.game.over) draw(); } // host efektif berubah: tombol "Main lagi" ikut pindah
  botTick();
}
function presOn() {
  presOff();
  hbT = setInterval(beat, 8000); tickT = setInterval(tick, 2000);
  if (conn) presUp();
}
function presOff() {
  clearInterval(hbT); clearInterval(tickT); hbT = tickT = null;
  if (ref) ref.child('presence/' + me).onDisconnect().cancel();
  pres = {}; myPing = null; hidAt = 0; lastDrv = null;
}
document.addEventListener('visibilitychange', beat);
function pinfo(pid) { // s: bot | on | away (pindah tab) | off (putus, masih masa tunggu) | afk (bot ambil alih)
  if (isBot(pid)) return { s: 'bot' };
  const pr = pres[pid];
  if (!pr || (!pr.seen && pr.online !== false)) return { s: 'on' };
  const n = nowS();
  let since = 0;
  if (pr.online === false) since = pr.off || pr.seen;
  else if (!pr.hid && n - pr.seen > SRV_STALE) since = pr.seen + SRV_STALE;
  if (since) return { s: n - since > AFK_GRACE ? 'afk' : 'off', ping: pr.ping };
  if (pr.hid) return { s: n - pr.hid > AWAY_MAX ? 'afk' : 'away', ping: pr.ping };
  return { s: 'on', ping: pr.ping };
}
const pingCls = ms => ms < 120 ? 'p-on' : ms < 300 ? 'p-mid' : 'p-bad', pingLv = ms => ms < 120 ? 3 : ms < 300 ? 2 : 1;
const sigSvg = n => `<svg class="sg" viewBox="0 0 13 12" aria-hidden="true">${[0, 1, 2].map(i => `<rect x="${i * 5}" y="${8 - i * 4}" width="3" height="${4 + i * 4}" rx=".8" opacity="${i < n ? 1 : .25}"/>`).join('')}</svg>`;
function pdTxt(pid) { // [kelas warna, teks, jumlah batang sinyal 0-3]
  if (pid === me && !conn) return ['p-off', 'offline', 0];
  const i = pinfo(pid);
  if (i.s === 'bot') return ['p-bot', '🤖 bot', -1];
  if (i.s === 'afk') return ['p-off', room && room.status !== 'lobby' && humans() > 1 ? 'offline · bot' : 'offline', 0];
  if (i.s === 'off') return ['p-off', 'putus...', 0];
  const pg = pid === me ? myPing : i.ping;
  if (i.s === 'away') return ['p-away', '🌙 pindah tab', pg == null ? 0 : pingLv(pg)];
  return pg == null ? ['p-on', 'online', 3] : [pingCls(pg), pg + ' ms', pingLv(pg)];
}
const pdIn = ([c, t, l]) => (l >= 0 ? sigSvg(l) : '') + t;
const pdHTML = pid => { const d = pdTxt(pid); return `<span class="pd ${d[0]}" data-pid="${pid}" data-k="${esc(d.join('|'))}">${pdIn(d)}</span>`; };
function paintPres() {
  if (room) document.querySelectorAll('.pd').forEach(el => { const d = pdTxt(el.dataset.pid), k = d.join('|'); el.className = 'pd ' + d[0]; if (el.dataset.k !== k) { el.dataset.k = k; el.innerHTML = pdIn(d); } });
  paintSrv();
}
function paintSrv() {
  const e = $id('srv'); if (!e) return;
  let d;
  if (!conn) d = ['p-off', 'Offline', 0];
  else if (myPing != null) d = [pingCls(myPing), myPing + ' ms', pingLv(myPing)];
  else d = ['p-on', 'Online', 3];
  const k = d.join('|');
  e.className = 'srv ' + d[0];
  if (e.dataset.k !== k) { e.dataset.k = k; e.innerHTML = pdIn(d); }
}
// ping server di luar room: baca path kosong tanpa listener (selalu ke server), waktunya = ping. Error izin pun tetap dihitung.
function probe() {
  if (!conn || ref || document.hidden) return;
  const t0 = Date.now(), done = () => { if (!ref && conn) { myPing = Date.now() - t0; paintSrv(); } };
  db.ref('rooms/_ping').once('value').then(done, done);
}
setInterval(probe, 5000);

// ---------- audio: musik ambient abad pertengahan (sintesis WebAudio, tanpa file) + efek suara ----------
const Snd = (() => {
  let ac, musicGain, sfxGain, mBus, nbuf, timer = null, mt = 0, pt = 0, deg = 3, ci = 0;
  const on = { music: localStorage.getItem('k13m') !== '0', sfx: localStorage.getItem('k13s') !== '0' };
  const SC = [0, 2, 3, 5, 7, 9, 10], D4 = 293.66; // mode Dorian di D
  const freqOf = d => D4 * Math.pow(2, (SC[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7)) / 12);
  const CH = [[146.83, 174.61, 220], [130.81, 164.81, 196], [98, 123.47, 146.83], [110, 130.81, 164.81]]; // Dm, C, G, Am
  const PROG = [0, 1, 0, 3, 2, 0, 1, 3];
  function note(f, t, dur, vel) { // petikan kecapi/lute
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(), fl = ac.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = .25;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(2600, t); fl.frequency.exponentialRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(mBus);
    o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  }
  function pad(fs, t, dur) { // akor panjang yang lembut: 1 filter + 1 gain buat semua nada (dulu per nada)
    const g = ac.createGain(), fl = ac.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 750;
    const v = .045 * fs.length;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + 2); g.gain.setValueAtTime(v, t + dur - 2.2); g.gain.linearRampToValueAtTime(.0001, t + dur);
    fl.connect(g); g.connect(mBus);
    fs.forEach(f => {
      const o = ac.createOscillator();
      o.type = 'triangle'; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 12;
      o.connect(fl); o.start(t); o.stop(t + dur + .05);
    });
  }
  function sched() {
    const now = ac.currentTime;
    if (mt < now) mt = now + .1;
    if (pt < now) pt = now + .1;
    while (pt < now + 4) { pad(CH[PROG[ci++ % PROG.length]], pt, 7); pt += 6; }
    while (mt < now + 4) {
      deg = Math.max(-2, Math.min(9, deg + [-2, -1, -1, 0, 1, 1, 2][Math.random() * 7 | 0]));
      if (Math.random() < .25) { mt += .7 + Math.random() * .6; continue; }
      const dur = [1.2, 1.8, 2.4][Math.random() * 3 | 0];
      note(freqOf(deg), mt, dur, .13);
      if (Math.random() < .2) note(freqOf(deg - 2), mt + .02, dur, .06);
      mt += [.7, .7, 1.4, 1.4, 2.1][Math.random() * 5 | 0];
    }
  }
  function startMusic() { if (!timer && ac && on.music) { sched(); timer = setInterval(sched, 800); } }
  function stopMusic() { clearInterval(timer); timer = null; }
  function init() {
    if (ac) { if (ac.state !== 'running') ac.resume(); return; } // iOS: state bisa 'interrupted' (habis telepon / pindah app), resume tiap sentuhan
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC({ latencyHint: 'balanced' }); } catch (_) { ac = new AC(); } // buffer sedikit lebih besar: nggak gampang kresek / putus kalau HP lagi sibuk gambar animasi
    const master = ac.createGain(), lim = ac.createDynamicsCompressor(); // limiter: musik + efek yang numpuk nggak sampai clipping (itu yang bunyi kresek)
    lim.threshold.value = -10; lim.knee.value = 8; lim.ratio.value = 6; lim.attack.value = .003; lim.release.value = .2;
    master.connect(lim); lim.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = on.music ? .55 : 0; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = on.sfx ? 1 : 0; sfxGain.connect(master);
    mBus = ac.createGain(); mBus.connect(musicGain);
    const rv = ac.createConvolver(), wet = ac.createGain(), len = ac.sampleRate * 1.6 | 0, ib = ac.createBuffer(1, len, ac.sampleRate); // reverb mono 1.6 dtk: convolver jauh lebih ringan (dulu stereo 2.8 dtk)
    for (let c = 0; c < 1; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rv.buffer = ib; wet.gain.value = .6; mBus.connect(rv); rv.connect(wet); wet.connect(musicGain);
    [[73.42, .06], [110, .035]].forEach(([f, v]) => { // dengung rendah (drone)
      const o = ac.createOscillator(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = v; l.frequency.value = .08 + Math.random() * .05; lg.gain.value = v * .5;
      l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(mBus); o.start(); l.start();
    });
    nbuf = ac.createBuffer(1, ac.sampleRate * .4, ac.sampleRate);
    const nd = nbuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    startMusic();
  }
  const ok = () => ac && on.sfx && ac.state === 'running';
  function noise(t, dur, type, f0, f1, vel) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; fl.type = type; fl.Q.value = 3;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur + .02);
  }
  function tone(t, f0, f1, dur, vel) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + .02);
  }
  return {
    init,
    on,
    set(k, v) {
      on[k] = v; localStorage.setItem(k === 'music' ? 'k13m' : 'k13s', v ? '1' : '0');
      if (!ac) { if (v) init(); return; }
      (k === 'music' ? musicGain : sfxGain).gain.setTargetAtTime(v ? (k === 'music' ? .55 : 1) : 0, ac.currentTime, .15);
      if (k === 'music') v ? startMusic() : stopMusic();
    },
    hidden(h) { if (!ac) return; h ? (ac.suspend(), stopMusic()) : (ac.resume(), startMusic()); },
    tick(up) { if (!ok()) return; const t = ac.currentTime; noise(t, .05, 'bandpass', up ? 2800 : 1800, up ? 2200 : 1200, .4); tone(t, up ? 950 : 640, up ? 700 : 480, .06, .12); },
    play(n) { if (!ok()) return; const t = ac.currentTime; for (let i = 0; i < Math.min(n, 4); i++) { const u = t + i * .075; noise(u, .14, 'highpass', 4200, 1400, .3); tone(u + .06, 150, 55, .14, .38); } },
    msg() { if (!ok()) return; const t = ac.currentTime; tone(t, 880, 880, .09, .08); tone(t + .11, 1175, 1175, .12, .08); },
    pass() { if (!ok()) return; tone(ac.currentTime, 330, 220, .12, .1); },
    boom() { if (!ok()) return; const t = ac.currentTime; tone(t, 95, 28, .9, .6); noise(t, .7, 'lowpass', 900, 120, .5); [293.66, 349.23, 440].forEach((f, i) => tone(t + .15 + i * .12, f, f, .7, .12)); }
  };
})();
['pointerdown', 'pointerup', 'keydown', 'touchstart', 'touchend', 'click'].forEach(e => addEventListener(e, () => Snd.init(), { passive: true })); // iOS baru buka kunci audio lewat touchend / click, bukan touchstart
document.addEventListener('visibilitychange', () => Snd.hidden(document.hidden));
const bigOn = () => localStorage.getItem('k13big') === '1';
function barLabels() {
  document.getElementById('tb').textContent = '🔠 Kartu: ' + (bigOn() ? 'besar' : 'normal');
  document.getElementById('tm').textContent = '🎵 Musik: ' + (Snd.on.music ? 'nyala' : 'mati');
  document.getElementById('ts').textContent = '🔊 Suara: ' + (Snd.on.sfx ? 'nyala' : 'mati');
}
document.getElementById('tm').onclick = () => { Snd.init(); Snd.set('music', !Snd.on.music); barLabels(); };
document.getElementById('ts').onclick = () => { Snd.init(); Snd.set('sfx', !Snd.on.sfx); barLabels(); };
document.body.classList.toggle('big', bigOn());
document.getElementById('tb').onclick = () => { localStorage.setItem('k13big', bigOn() ? '0' : '1'); document.body.classList.toggle('big', bigOn()); barLabels(); };
barLabels();

// ---------- background: gambar SVG vektor dirender SEKALI ke canvas, bukan digambar ulang browser terus-terusan ----------
// Gagal / nggak didukung = otomatis pakai background CSS biasa. Matiin lewat ?bgc=0 di URL kalau tampilannya beda.
(function bgCanvas() {
  if (new URLSearchParams(location.search).get('bgc') === '0') return;
  const cs = getComputedStyle(document.documentElement), urlOf = n => { const m = /url\(["']?([^"')]+)["']?\)/.exec(cs.getPropertyValue(n)); return m && m[1]; };
  const srcs = { p: urlOf('--bg-p'), l: urlOf('--bg-l') }, imgs = {};
  if (!srcs.p && !srcs.l) return;
  let cv = null, rt = null, key = '';
  const load = k => imgs[k] || (imgs[k] = new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = srcs[k]; }));
  async function paint() {
    try {
      const k = matchMedia('(orientation:landscape)').matches ? 'l' : 'p'; if (!srcs[k]) return;
      const im = await load(k), iw = im.naturalWidth, ih = im.naturalHeight; if (!(iw > 0 && ih > 0)) throw 0; // SVG tanpa ukuran bawaan: biarin CSS
      const dpr = Math.min(devicePixelRatio || 1, 2); let w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      const cap = 2560 / Math.max(w, h); if (cap < 1) { w = Math.round(w * cap); h = Math.round(h * cap); }
      const kk = k + w + 'x' + h; if (kk === key) return; key = kk;
      if (!cv) { cv = document.createElement('canvas'); cv.id = 'bgc'; cv.setAttribute('aria-hidden', 'true'); document.body.prepend(cv); }
      cv.width = w; cv.height = h;
      const sc = Math.max(w / iw, h / ih), dw = iw * sc, dh = ih * sc, ctx = cv.getContext('2d'); // sama kayak background-size: cover
      ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
      document.body.classList.add('bgc');
    } catch (_) { if (cv) { cv.remove(); cv = null; } document.body.classList.remove('bgc'); key = ''; }
  }
  const later = () => { clearTimeout(rt); rt = setTimeout(paint, 250); };
  addEventListener('resize', later); addEventListener('orientationchange', later);
  paint();
})();

// ---------- tampilan ----------
// gambar kartu: cards/<id>.webp (hasil render dari SVG Vecteezy.com, 264x402), id = angka*4 + logo. File .svg asli tetap jadi cadangan kalau .webp nggak ada
const cardsOf = (cs, extra = '') => { const e = cs.length > 4 && ev(cs), pr = e && ['f', 'x', 'g'].includes(e.t); return cs.map((c, i) => (pr && i === cs.length - 2 ? '<span style="display:inline-block;width:22px"></span>' : '') + card(c, extra)).join(''); };
const card = (id, extra = '') => `<div class="c ${extra}" data-id="${id}" role="img" aria-label="${R[rk(id)]}${S[su(id)]}"><img src="cards/${id}.webp" alt="" draggable="false" decoding="async" onerror="this.onerror=null;this.src=this.src.replace('.webp','.svg')"></div>`;
const _bk = new Image(); _bk.decoding = 'async'; _bk.src = 'cards/back.webp'; if (_bk.decode) _bk.decode().catch(() => {}); // preload + decode punggung kartu (dipakai animasi kartu keluar)
// preload + decode 52 kartu sekali (cicil 4 per jeda) biar gambar nggak di-render ulang tiap gambar ulang meja
const _pre = []; let preDone = false;
function preloadCards() {
  if (preDone) return; preDone = true; let i = 0;
  const step = () => { for (let n = 0; n < 4 && i < 52; n++, i++) { const im = new Image(); im.decoding = 'async'; im.src = 'cards/' + i + '.webp'; _pre.push(im); if (im.decode) im.decode().catch(() => {}); } if (i < 52) setTimeout(step, 120); };
  step();
}
// ---------- tutorial aturan (halaman geser, contoh pakai kartu asli) ----------
const cid = t => R.indexOf(t.slice(0, -1)) * 4 + S.indexOf(t.slice(-1));
const TUT = [
  { h: 'Tujuan dan urutan kartu', p: ['Tiap pemain dapat 13 kartu. Siapa yang kartunya habis duluan jadi juara 1.', 'Urutan dari kecil ke besar: 3 4 5 6 7 8 9 10 J Q K A 2. Kartu 2 paling tinggi.', 'Logo (♠ ♣ ♦ ♥) nggak dihitung buat membandingkan. Angka sama nggak bisa saling kalahin: 9 9 nggak bisa dilawan 9 9. Logo cuma dipakai di awal game buat nentuin 3♠.'], ex: [['Contoh urutan', ['3♠', '7♣', '10♦', 'K♥', 'A♠', '2♣']]] },
  { h: 'Kombinasi dasar', p: ['Lo bisa keluarin satu jenis kombinasi tiap giliran:'], ex: [['Tunggal (1 kartu)', ['9♦']], ['Pasangan (2 angka sama)', ['5♦', '5♥']], ['3 kembar (3 angka sama)', ['8♠', '8♣', '8♦']]] },
  { h: 'Seri', p: ['Seri = minimal 3 kartu berurutan, wajib satu logo, dan cuma angka 3 sampai 10 (nggak boleh J, Q, K, A, 2). Seri terpanjang 8 kartu.'], ex: [['✅ Seri sah', ['5♦', '6♦', '7♦']], ['❌ Beda logo', ['5♦', '6♥', '7♦']], ['❌ Ada J (di atas 10)', ['9♠', '10♠', 'J♠']]] },
  { h: 'Kombinasi + pasangan', p: ['Ada 3 jenis yang ditambah 1 pasangan (5 kartu atau lebih):'], ex: [['3 kembar + pasangan', ['4♠', '4♣', '4♦', '5♠', '5♥']], ['Seri + pasangan', ['3♠', '4♠', '5♠', '7♣', '7♦']], ['4 kembar + pasangan', ['9♠', '9♣', '9♦', '9♥', 'J♠', 'J♥']]], p2: ['Pasangannya bebas angkanya, boleh sama dengan angka di serinya, asal kembar.'] },
  { h: 'Cara melawan kartu di meja', p: ['Lo harus keluarin kombinasi yang sejenis, jumlah kartunya sama, dan lebih tinggi. Atau pilih Lewat.', 'Untuk kombinasi + pasangan, yang dibandingkan cuma bagian utamanya (3 kembar, seri, atau 4 kembar). Pasangannya bebas.'], ex: [['Meja: pasangan 5. Lo boleh:', ['7♠', '7♣']], ['Meja: 4 4 4 + 5 5. Lo boleh:', ['6♠', '6♣', '6♦', '4♥', '4♣']], ['Meja: seri 3♠ 4♠ 5♠. Seri beda logo boleh:', ['6♦', '7♦', '8♦']]] },
  { h: 'Lewat dan jalannya ronde', p: ['Lewat cuma berlaku untuk giliran itu. Kalau ada yang keluarin kartu lagi, semua pemain dapat giliran lagi.', 'Kalau semua pemain lain lewat, pemain terakhir yang keluarin kartu buka ronde baru dengan kombinasi bebas.', 'Giliran bergerak ke arah kanan.'], ex: [] },
  { h: 'Kartu 2', p: ['Kartu 2 paling tinggi. Kartu 2 nggak bisa dibales kartu biasa, termasuk kartu 2 lain. Pemain lain cuma bisa Lewat atau memotongnya pakai bom.', 'Ini berlaku juga untuk pemain yang tadi sudah lewat di ronde itu: mereka dapat kesempatan memotong.'], ex: [['Contoh 2 tunggal', ['2♣']], ['2 kembar (pasangan 22)', ['2♠', '2♥']]] },
  { h: 'Bom', p: ['Bom biasa: 4 kartu kembar, atau seri 5 kartu satu logo. Masing-masing boleh ditambah 1 pasangan.', 'Seri 3 atau 4 kartu bukan bom. Seri 5 kartu atau lebih yang satu logo otomatis jadi bom seri (angka 3 sampai 10 saja).', 'Bom x2: 8 kartu kembar (dua set 4 kembar).'], ex: [['4 kembar', ['6♠', '6♣', '6♦', '6♥']], ['Bom seri: 5 kartu satu logo', ['6♥', '7♥', '8♥', '9♥', '10♥']], ['Bom seri + pasangan', ['3♦', '4♦', '5♦', '6♦', '7♦', 'J♠', 'J♣']], ['Bom x2: 3333 + 6666', ['3♠', '3♣', '3♦', '3♥', '6♠', '6♣', '6♦', '6♥']]] },
  { h: 'Bom memotong kartu 2', p: ['2 tunggal di meja bisa dipotong bom biasa atau bom x2. Pasangan 22, 3 kembar 2, atau 4 kartu 2 cuma bisa dipotong bom x2.', 'Bom yang memotong kartu 2 bikin game langsung berakhir dan yang keluarin bom menang.', 'Bom yang keluar bukan di atas kartu 2 cuma kombinasi biasa. Game lanjut, dan bom biasa cuma bisa dilawan jenis yang sama dengan nilai lebih tinggi.'], ex: [['Meja: 2 tunggal. Dipotong:', ['5♠', '5♣', '5♦', '5♥']]] },
  { h: 'Dua cara kalah instan', p: ['Ngebom diri sendiri: kalau kartu terakhir lo (yang bikin kartu habis) mengandung kartu 2, lo kalah. Game dibatalkan, nggak ada pemenang, dan game berikutnya mulai dari fase kumpulin 3.', 'Dapat 4 kartu 2 di tangan awal: langsung kalah, game diulang dari fase kumpulin 3.'], ex: [['Kartu terakhir ini bikin lo kalah:', ['2♠']]] },
  { h: 'Awal game dan fase kumpulin 3', p: ['Game pertama di room (atau setelah game batal karena bom memotong 2 atau kalah instan) mulai dengan fase kumpulin 3: semua pemain yang punya angka 3 keluarin semua kartu 3-nya sekaligus.', 'Setelah semua 3 keluar, pemain yang keluarin 3♠ jalan duluan. Kalau 3♠ nggak kebagi, pemegang 3 terendah.', 'Di game biasa setelah ada juara, juara 1 jalan duluan dengan kombinasi bebas.'], ex: [['Kartu 3', ['3♠', '3♣', '3♦', '3♥']]] },
  { h: 'Kartu murni dan juara', p: ['Kartu murni = nggak dapat J, Q, K sama sekali. Di awal game lo bisa pilih Berhenti atau Lanjut main. Berhenti bikin lo langsung jadi juara berikutnya (juara 1 kalau yang pertama), dan game tetap lanjut.', 'Juara lain harus ngabisin kartunya beneran. Juara terakhir otomatis yang masih punya sisa kartu.'], ex: [['Contoh tangan murni (tanpa J, Q, K)', ['3♠', '5♦', '7♥', '9♣', 'A♠', '2♦']]] },
  { h: 'Mengatur kartu dan tombol', p: ['Kartu lo nggak diurutin otomatis. Di HP, tahan kartu sebentar lalu geser. Di PC, drag pakai mouse. Tombol Kelompokkan merapikan jadi tunggal, pasangan, 3 kembar, seri, lalu 4 kembar.', 'Pilih kartu dengan menekannya, lalu tekan Keluarkan. Salah pilih? Tekan Batal pilih.', 'Di PC: Enter = Keluarkan, P = Lewat, Esc = Batal pilih.'], ex: [] },
  { h: 'Lawan bot', p: ['Lo lawan 3 bot. Tingkat: Mudah (main acak), Sedang (kartu terendah dulu, simpan bom dan 2), Susah (jaga pasangan dan 3 kembar), Master (ngitung kartu yang belum keluar).', 'Aturannya sama persis dengan online. Coba dulu di tingkat Mudah buat latihan.'], ex: [], practice: true }
];
let tutI = 0;
function showTut() {
  let t = document.getElementById('tut');
  if (!t) { t = document.createElement('div'); t.id = 'tut'; document.body.appendChild(t); }
  const d = TUT[tutI], last = tutI === TUT.length - 1, canPlay = d.practice && document.getElementById('bl');
  t.innerHTML = `<div class="tw"><h3>${tutI + 1}/${TUT.length} · ${d.h}</h3><div class="tbody">${d.p.map(x => `<p>${x}</p>`).join('')}${d.ex.map(([l, cs]) => `<div class="tx"><div class="tl">${l}</div><div class="tc">${cardsOf(cs.map(cid), 'mini')}</div></div>`).join('')}${(d.p2 || []).map(x => `<p>${x}</p>`).join('')}${canPlay ? '<button id="tp" style="width:100%;margin-top:8px">Latihan lawan bot Mudah</button>' : ''}</div>
  <div class="tn"><button class="ghost" id="tv" ${tutI ? '' : 'disabled'}>Sebelumnya</button><span>${last ? '' : 'geser lewat tombol'}</span><button id="tx">${last ? 'Tutup' : 'Berikutnya'}</button></div><button class="ghost" id="tc" style="margin-top:8px;width:100%">Tutup tutorial</button></div>`;
  t.classList.add('on');
  t.querySelector('#tv').onclick = () => { tutI--; showTut(); };
  t.querySelector('#tx').onclick = () => { if (last) closeTut(); else { tutI++; showTut(); } };
  t.querySelector('#tc').onclick = closeTut;
  const tp = t.querySelector('#tp'); if (tp) tp.onclick = () => { closeTut(); document.getElementById('bl').value = '0'; createBotRoom(); };
}
function openRules() { tutI = 0; showTut(); }
function openTut() { // menu: tutorial terpandu atau baca aturan
  let t = document.getElementById('tut');
  if (!t) { t = document.createElement('div'); t.id = 'tut'; document.body.appendChild(t); }
  t.innerHTML = `<div class="tw"><h3>Tutorial</h3><p>Pilih cara belajarnya:</p><button id="m1" style="width:100%;margin:6px 0">Tutorial terpandu (latihan langsung, buat pemula)</button><button id="m2" class="ghost" style="width:100%;margin:6px 0">Baca aturan lengkap</button><button id="m3" class="ghost" style="width:100%;margin:6px 0">Tutup</button></div>`;
  t.classList.add('on');
  t.querySelector('#m1').onclick = openGuide; t.querySelector('#m2').onclick = openRules; t.querySelector('#m3').onclick = closeTut;
}
// ---------- tutorial terpandu: latihan satu langkah demi satu langkah, kombinasi dicek pakai mesin aturan asli ----------
const GUIDE = [
  { h: 'Selamat datang', t: 'Tujuan game ini: habiskan 13 kartu di tangan lo duluan. Di tutorial ini lo latihan langkah demi langkah dengan kartu contoh. Kalau salah, nggak apa-apa, nanti dijelasin kenapa.' },
  { h: 'Keluarin kartu pertama', t: 'Meja kosong, jadi lo yang buka ronde dan bebas pilih. <b>Tekan kartu 5♠</b> (kartunya naik), lalu tekan <b>Keluarkan</b>.', hand: ['4♣', '5♠', '8♦', '9♥', 'J♣'], play: ['5♠'], ok: 'Mantap! 5♠ keluar sebagai tunggal (1 kartu).' },
  { h: 'Ngelawan tunggal', t: 'Bot Budi keluarin 9♦. Lo harus keluarin <b>1 kartu yang angkanya lebih tinggi dari 9</b>. Urutan: 3 4 5 6 7 8 9 10 J Q K A 2. Logo (♠ ♣ ♦ ♥) nggak dihitung.', table: ['Bot Budi', ['9♦']], hand: ['6♣', '8♠', 'J♣', 'K♦'], any: true, ok: 'Betul! Kartu yang lebih tinggi bisa ngalahin kartu di meja.' },
  { h: 'Pasangan', t: 'Bot Sari keluarin pasangan 6 (2 kartu angka sama). Lawan dengan <b>pasangan yang lebih tinggi</b>. Pilih dua kartu, lalu Keluarkan.', table: ['Bot Sari', ['6♠', '6♣']], hand: ['3♦', '7♥', '7♠', '10♣', 'Q♦'], any: true, ok: 'Pas! Pasangan 7 lebih tinggi dari pasangan 6. Aturan penting: harus sejenis dan jumlah kartunya sama.' },
  { h: '3 kembar', t: 'Meja kosong lagi. Keluarin <b>3 kartu angka sama</b>: ketiga kartu 4.', hand: ['4♠', '4♣', '4♦', '9♥', 'K♠'], play: ['4♠', '4♣', '4♦'], ok: 'Bagus! Itu 3 kembar.' },
  { h: 'Seri', t: '<b>Seri</b> = minimal 3 kartu berurutan dan <b>wajib satu logo</b>. Cuma angka 3 sampai 10. Keluarin seri 5♦ 6♦ 7♦ (hati-hati, ada 6♥ yang logonya beda).', hand: ['5♦', '6♥', '6♦', '7♦', '9♣', 'K♠'], play: ['5♦', '6♦', '7♦'], ok: 'Tepat! Seri satu logo. 5♦ 6♥ 7♦ nggak sah karena beda logo.' },
  { h: 'Kombinasi + pasangan', t: 'Bot Joko keluarin <b>3 kembar 4 + pasangan 5</b> (5 kartu). Lawan dengan 5 kartu yang sejenis: <b>3 kembar yang lebih tinggi + pasangan apa saja</b>. Yang dibandingkan cuma 3 kembarnya.', table: ['Bot Joko', ['4♠', '4♣', '4♦', '5♠', '5♥']], hand: ['6♠', '6♣', '6♦', 'J♥', 'J♣', '3♠'], any: true, ok: 'Keren! 6 6 6 lebih tinggi dari 4 4 4, dan pasangannya (J J) bebas.' },
  { h: 'Kapan harus Lewat', t: 'Bot Budi keluarin pasangan K. Lo nggak punya pasangan sama sekali. Kalau nggak ada yang bisa ngalahin, <b>tekan Lewat</b>.', table: ['Bot Budi', ['K♠', 'K♥']], hand: ['3♣', '5♦', '8♠', '9♥', 'J♦'], pass: true, ok: 'Oke. Lewat cuma berlaku untuk giliran itu. Kalau ada yang keluarin kartu lagi, lo dapat giliran lagi. Kalau semua lewat, yang terakhir keluarin kartu buka ronde baru.' },
  { h: 'Kartu 2', t: 'Bot Sari keluarin <b>2♣</b>. Kartu 2 paling tinggi, dan nggak bisa dibales kartu biasa (A pun nggak bisa). Cuma bom yang bisa motong. Lo nggak punya bom, jadi <b>tekan Lewat</b>.', table: ['Bot Sari', ['2♣']], hand: ['3♦', '7♠', 'A♥', 'K♣'], pass: true, ok: 'Betul. Kartu 2 kuat banget, tapi punya kelemahan: bisa dipotong bom.' },
  { h: 'Bom memotong 2', t: 'Bot Joko keluarin 2♣ lagi, tapi sekarang lo punya <b>4 kembar 5 = bom</b>. Bom bisa motong 2 tunggal. Pilih keempat 5, lalu Keluarkan.', table: ['Bot Joko', ['2♣']], hand: ['5♠', '5♣', '5♦', '5♥', '8♠', 'K♦'], play: ['5♠', '5♣', '5♦', '5♥'], ok: 'Boom! Bom yang motong 2 bikin game langsung berakhir dan lo menang. Bom lain: seri 5 satu logo, dan bom x2 (8 kartu kembar, buat motong pasangan 22 atau 3 kembar 2).' },
  { h: 'Bom seri', t: 'Seri biasa (3 atau 4 kartu) cuma kombinasi biasa. Tapi kalau seri-nya <b>5 kartu atau lebih dan satu logo</b>, itu otomatis <b>bom seri</b> (angka 3 sampai 10, boleh ditambah 1 pasangan). Bot Budi keluarin 2♣. Lo punya seri 6 sampai 10 satu logo hati. Pilih kelima kartu itu (bukan 6♠), lalu Keluarkan.', table: ['Bot Budi', ['2♣']], hand: ['6♥', '7♥', '8♥', '9♥', '10♥', '6♠', 'J♦'], play: ['6♥', '7♥', '8♥', '9♥', '10♥'], ok: 'Boom! Bom seri motong 2 tunggal dan lo langsung menang, sama seperti 4 kembar. Kalau seri-nya beda logo, itu bukan bom dan nggak bisa motong 2.' },
  { h: 'Jangan habisin pakai 2', t: 'Sekarang kartu lo tinggal satu: <b>2♠</b>. Coba keluarin 2♠ dan lihat apa yang terjadi.', hand: ['2♠'], play: ['2♠'], bad: true, ok: 'Lo kalah! Kalau kartu terakhir (yang bikin kartu habis) mengandung kartu 2, itu namanya ngebom diri sendiri: game dibatalkan dan nggak ada pemenang. Keluarin 2 selagi masih ada kartu lain, atau simpan buat nahan lawan.' },
  { h: 'Awal game: kumpulin 3', t: 'Game pertama (atau setelah game batal) mulai dengan <b>fase kumpulin 3</b>: semua pemain yang punya angka 3 keluarin semua kartu 3-nya sekaligus. Setelah itu, yang keluarin 3♠ jalan duluan. Kalau lo dapat 4 kartu 2 di awal, lo kalah instan dan game diulang.' },
  { h: 'Kartu murni dan juara', t: 'Kalau lo nggak dapat J, Q, K sama sekali (<b>kartu murni</b>), lo bisa pilih Berhenti: langsung jadi juara berikutnya dan game tetap lanjut. Pemain lain harus ngabisin kartunya beneran. Juara terakhir adalah yang masih punya sisa kartu.' },
  { h: 'Selesai!', t: 'Lo udah tahu semua dasarnya. Tips: kartu di tangan nggak diurutin otomatis. Tekan <b>Kelompokkan</b> buat merapikan, atau tahan lalu geser. Kalau lupa aturan, buka lagi tombol <b>📖 Tutorial</b>.', done: true }
];
let gI = 0, gSel = [], gOK = false, gHint = false, gHand = [];
function openGuide() { gI = 0; gStep(); }
function gStep() { const d = GUIDE[gI]; gSel = []; gOK = false; gHint = false; gHand = (d.hand || []).map(cid); gDraw(''); }
function gDraw(msg, cls) {
  const d = GUIDE[gI], t = document.getElementById('tut'), act = !!(d.play || d.pass || d.any), n = GUIDE.length;
  const table = d.table ? `<div class="tx"><div class="tl">Meja: ${d.table[0]} keluarin</div><div class="tc">${cardsOf(d.table[1].map(cid))}</div></div>` : act ? '<div class="tx"><div class="tl">Meja kosong: lo yang buka ronde</div></div>' : '';
  const need = (d.play || []).map(cid);
  const hand = d.hand ? `<div class="tx"><div class="tl">Kartu lo (tekan buat milih)</div><div class="tc gc" id="gh">${gHand.map(c => card(c, (gSel.includes(c) ? 'sel ' : '') + (gHint && need.includes(c) ? 'gh' : ''))).join('')}</div></div>` : '';
  const btns = act && !gOK ? '<button id="gk">Keluarkan</button><button class="ghost" id="gp">Lewat</button><button class="ghost" id="gi">Petunjuk</button>' : (gI === n - 1 ? '' : '<button id="gn">Lanjut</button>');
  const fin = d.done ? `<button id="gm" style="width:100%;margin-top:8px">${document.getElementById('bl') ? 'Main lawan bot Mudah' : 'Selesai'}</button>` : '';
  t.innerHTML = `<div class="tw"><h3>Latihan ${gI + 1}/${n} · ${d.h}</h3><div class="tbody"><p class="coach">${d.t}</p>${table}${hand}<p class="gm ${cls || ''}" id="gmsg">${msg || ''}</p>${fin}</div>
  <div class="tn">${btns}</div><button class="ghost" id="gx" style="margin-top:8px;width:100%">Tutup tutorial</button></div>`;
  t.classList.add('on');
  t.querySelector('#gx').onclick = closeTut;
  const gn = t.querySelector('#gn'); if (gn) gn.onclick = () => { gI++; gStep(); };
  const gm = t.querySelector('#gm'); if (gm) gm.onclick = () => { closeTut(); if (document.getElementById('bl')) { document.getElementById('bl').value = '0'; createBotRoom(); } };
  t.querySelectorAll('#gh .c').forEach(el => el.onclick = () => { if (gOK) return; const id = +el.dataset.id; gSel = gSel.includes(id) ? gSel.filter(x => x !== id) : gSel.concat(id); gDraw(''); });
  const gi = t.querySelector('#gi'); if (gi) gi.onclick = () => { gHint = true; gDraw(d.pass ? 'Petunjuk: di sini lo harus tekan Lewat.' : 'Petunjuk: kartu yang bercahaya hijau. Pilih, lalu Keluarkan.'); };
  const gp = t.querySelector('#gp'); if (gp) gp.onclick = () => { if (d.pass) return gWin(d); gDraw('Di latihan ini lo punya kartu yang bisa keluar. Coba pilih kartunya dulu.', 'bad'); };
  const gk = t.querySelector('#gk'); if (gk) gk.onclick = () => gPlay(d);
}
function gWin(d) { gOK = true; if (d.play || d.any) gHand = gHand.filter(c => !gSel.includes(c)); gSel = []; gDraw(d.ok, d.bad ? 'bad' : 'ok'); }
function gPlay(d) {
  const ids = [...gSel].sort((a, b) => a - b);
  if (!ids.length) return gDraw('Pilih kartunya dulu, lalu tekan Keluarkan.', 'bad');
  const e = ev(ids), lc = d.table ? d.table[1].map(cid) : null, le = lc && ev(lc), last = le ? { t: le.t, n: le.n, k: le.k, k2: le.k2, c: lc } : null;
  if (!e) return gDraw('Itu bukan kombinasi yang sah. Kombinasi yang boleh: tunggal, pasangan, 3 kembar, seri satu logo, dan yang pakai pasangan.', 'bad');
  if (last && !(cuts(e, last) || beats(e, last))) return gDraw(d.pass ? 'Nggak ada kartu lo yang bisa ngalahin meja. Tekan Lewat.' : 'Nggak bisa: harus sejenis, jumlah kartunya sama, dan angkanya lebih tinggi dari meja.', 'bad');
  if (d.pass) return gDraw('Sebenarnya sah, tapi di latihan ini tekan Lewat.', 'bad');
  if (d.play) { const need = d.play.map(cid).sort((a, b) => a - b); if (need.join() !== ids.join()) return gDraw('Kombinasinya sah, tapi di latihan ini coba keluarin: ' + d.play.join(' ') + '.', 'bad'); }
  gWin(d);
}
function closeTut() { const t = document.getElementById('tut'); if (t) t.classList.remove('on'); }
const typeName = { s: 'Tunggal', p: 'Pasangan', t: 'Tiga kembar', q: 'Bom 4 kembar', d: '8 kartu kembar (2 x 4)', g: '4 kembar + pasangan', r: 'Seri satu logo', c: 'Kumpulin angka 3', f: '3 kembar + pasangan', x: 'Seri satu logo + pasangan' };

function draw() {
  if (drag) { if (drag.on) { pendingDraw = true; return; } endDrag(); } // lagi nyeret kartu: tunda gambar ulang sampai dilepas
  $.className = room && room.status !== 'lobby' ? 'game' : ''; // layout desktop: mode game dibikin satu layar
  if (!room) return drawHome();
  if (room.status === 'lobby') return drawLobby();
  drawGame();
}
function drawHome() {
  const nm = localStorage.getItem('k13name') || '', rc = localStorage.getItem('k13room') || '';
  $.innerHTML = `<h1>Kartu 13</h1><h2>Poker13 online, 2 sampai 4 pemain</h2>
  <div class="box"><label>Isi nama<input id="nm" maxlength="14" value="${esc(nm)}" placeholder="Ketik nama lo di sini" autocomplete="nickname"></label></div>
  <div class="box"><button id="mk" style="width:100%">Buat room baru</button></div>
  <div class="box"><b>Lawan bot (4 pemain)</b><label>Tingkat<select id="bl" style="width:100%;padding:10px;margin-top:4px;border-radius:10px;background:#0000002e;color:inherit;border:1px solid #ffffff33;font:inherit"><option value="0">Mudah</option><option value="1">Sedang</option><option value="2" selected>Susah</option><option value="3">Master</option></select></label>
  <button id="bt" class="ghost" style="width:100%;margin-top:6px">Main lawan bot</button>
  <button id="tt2" class="ghost" style="width:100%;margin-top:6px">Tutorial (terpandu dan aturan)</button></div>
  <div class="box"><label>Atau masuk pakai kode<input id="cd" maxlength="5" inputmode="numeric" pattern="[0-9]*" placeholder="mis. 48215"></label>
  <button id="jn" class="ghost" style="width:100%;margin-top:6px">Join room</button></div>

  <p class="err">${esc(err)}</p><p class="msg" style="font-size:.8rem">Versi ${VER}</p>`;
  mk.onclick = createRoom; jn.onclick = joinRoom; bt.onclick = createBotRoom; tt2.onclick = openTut;
  if (rc) { document.getElementById('cd').value = rc; }
}
// tambah bot di ruang tunggu: cuma host, cuma kalau ada minimal 2 pemain manusia, maks 4 kursi total
function addBot() {
  if (!room || room.status !== 'lobby' || room.host !== me) return;
  const lvl = +($id('blv') || {}).value || 0;
  ref.child('players').transaction(ps => {
    if (!ps) return; // data belum kebaca, batalin
    const ids = Object.keys(ps);
    if (ids.filter(i => !ps[i].bot).length < 2 || ids.length >= 4) return;
    const used = ids.map(i => ps[i].n), nm = BOTN.find(n => !used.includes('Bot ' + n)) || 'Cadangan';
    let id; do { id = 'bot' + Math.random().toString(36).slice(2, 7); } while (ps[id]);
    ps[id] = { n: 'Bot ' + nm, t: Date.now(), bot: true };
    return ps;
  }, (e, ok) => { if (ok) ref.child('bot/lv').set(lvl); });
}
function drawLobby() {
  const ps = Object.entries(room.players).sort((a, b) => a[1].t - b[1].t), host = room.host === me;
  const nh = ps.filter(([, p]) => !p.bot).length, full = ps.length >= 4, blv = room.bot ? room.bot.lv | 0 : 1;
  $.innerHTML = `<h1>Ruang tunggu</h1><h2>Kasih kode ini ke temen lo</h2>
  <div class="box"><div class="code">${code}</div></div>
  <div class="box"><b>Pemain (${ps.length}/4)</b><ul>${ps.map(([id, p]) => `<li data-p="${id}">${esc(p.n)}${id === room.host ? ' (host)' : ''}${id === me ? ' (lo)' : ''} ${pdHTML(id)}${host && p.bot ? ` <button class="ghost" data-rb="${id}" style="padding:0 8px;margin-left:6px" aria-label="Hapus bot">✕</button>` : ''}</li>`).join('')}</ul></div>
  ${host ? `<div class="row"><button id="ab" class="ghost" ${nh >= 2 && !full ? '' : 'disabled'}>＋ Tambah bot</button><select id="blv" aria-label="Level bot">${LVN.map((n, i) => `<option value="${i}" ${i === blv ? 'selected' : ''}>${n}</option>`).join('')}</select></div>${nh < 2 ? '<p class="msg">Tambah bot butuh minimal 2 pemain di room.</p>' : full ? '<p class="msg">Room penuh (maks 4).</p>' : ''}` : ''}
  <div class="row">${host ? `<button id="st" ${ps.length < 2 ? 'disabled' : ''}>${ps.length < 2 ? 'Tunggu minimal 2 pemain' : 'Mulai game'}</button>` : '<p class="msg">Nunggu host mulai game...</p>'}
  <button id="lv" class="ghost">Keluar</button></div>`;
  if (host) {
    st.onclick = start;
    $id('ab').onclick = addBot;
    $id('blv').onchange = e => ref.child('bot/lv').set(+e.target.value);
    $.querySelectorAll('[data-rb]').forEach(x => x.onclick = () => { if ((room.players[x.dataset.rb] || {}).bot) ref.child('players/' + x.dataset.rb).remove(); });
  }
  lv.onclick = () => leave(false);
}
// ---------- atur kartu manual (cuma di layar pemain sendiri, berlaku di online dan lawan bot) ----------
function shuffled(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [r[i], r[j]] = [r[j], r[i]]; } return r; }
function saveOrder() { try { localStorage.setItem('k13ord', JSON.stringify({ c: code, o: order })); } catch (_) {} }
function syncOrder(hs) { // urutan pemain dipertahankan; kartu dibagi baru = acak seperti dibagiin dealer
  if (!order.length) { try { const s = JSON.parse(localStorage.getItem('k13ord') || 'null'); if (s && s.c === code && Array.isArray(s.o)) order = s.o; } catch (_) {} }
  const set = new Set(hs); let k = order.filter(c => set.has(c));
  if (k.length < hs.length) k = shuffled(hs);
  order = k; saveOrder(); return order;
}
function groupHand(hs) { // kelompokkan: kartu tunggal, pasangan, 3 kembar, seri, lalu 4 kembar (kiri ke kanan, kecil ke besar)
  const by = {}, used = new Set(), G = { s: [], p: [], t: [], r: [], q: [] };
  hs.forEach(c => (by[rk(c)] = by[rk(c)] || []).push(c));
  const rest = r => by[r].filter(c => !used.has(c));
  for (const r in by) if (by[r].length === 4) { G.q.push(by[r]); by[r].forEach(c => used.add(c)); }
  for (const r in by) { const a = rest(r); if (a.length === 3) { G.t.push(a); a.forEach(c => used.add(c)); } }
  for (let sx = 0; sx < 4; sx++) { // seri satu logo, min 3 kartu berurutan, cuma angka 3 sampai 10
    let run = [];
    const flush = () => { if (run.length >= 3) { G.r.push(run); run.forEach(c => used.add(c)); } run = []; };
    for (let r = 0; r <= 7; r++) { const c = r * 4 + sx; if (hs.includes(c) && !used.has(c)) run.push(c); else flush(); }
    flush();
  }
  for (const r in by) { const a = rest(r); if (a.length === 2) { G.p.push(a); a.forEach(c => used.add(c)); } }
  hs.filter(c => !used.has(c)).sort((a, b) => a - b).forEach(c => G.s.push([c]));
  const byLow = (a, b) => a[0] - b[0];
  return [].concat(...G.s.sort(byLow), ...G.p.sort(byLow), ...G.t.sort(byLow), ...G.r.sort(byLow), ...G.q.sort(byLow));
}
function flyIn(p) { // kartu meluncur dari pemain ke meja sebagai punggung kartu (cards/back.webp), baru dibalik sesudah sampai: transform + opacity aja (ringan buat HP low end)
  try {
    if (!Element.prototype.animate || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.querySelector('.table .cards'); if (!box) return;
    const src = p === me ? document.getElementById('hand') : document.querySelector('.opp[data-p="' + p + '"]'); if (!src) return;
    const cs = [...box.querySelectorAll('.c')];
    cs.forEach(c => { c.style.willChange = 'transform'; const k = document.createElement('img'); k.className = 'bk'; k.src = 'cards/back.webp'; k.onerror = () => { k.onerror = null; k.src = 'cards/back.svg'; }; k.alt = ''; k.draggable = false; k.decoding = 'sync'; c.appendChild(k); }); // tutup dulu; will-change: tiap kartu dapat layer sendiri dari awal, jadi flip cuma nempelin layer (nggak gambar ulang)
    const reveal = () => cs.forEach((c, i) => { // dibalik satu-satu: sisi punggung menyempit, lalu muka kartu melebar
      const k = c.querySelector('.bk'); if (!k) return;
      const half = (f, t, o) => c.animate([{ transform: 'perspective(500px) rotateY(' + f + 'deg)' }, { transform: 'perspective(500px) rotateY(' + t + 'deg)' }], o);
      half(0, 90, { duration: 120, delay: i * 50, fill: 'backwards' }).onfinish = () => { k.remove(); half(-90, 0, { duration: 120 }); };
    });
    setTimeout(() => cs.forEach(c => { const k = c.querySelector('.bk'); if (k) k.remove(); c.style.willChange = ''; }), 1400); // jaga-jaga: punggung nggak boleh nyangkut
    const a = src.getBoundingClientRect(), b = box.getBoundingClientRect();
    const dx = (a.left + a.width / 2) - (b.left + b.width / 2), dy = (a.top + a.height / 2) - (b.top + b.height / 2);
    box.style.willChange = 'transform, opacity';
    box.animate([{ transform: `translate(${dx}px,${dy}px) scale(.55)`, opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = reveal;
  } catch (_) {}
}
function onHandDown(e) {
  const el = e.target.closest('.c'); if (!el || (e.pointerType === 'mouse' && e.button !== 0) || order.length < 2) return;
  endDrag();
  drag = { pid: e.pointerId, el, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, on: false, timer: null };
  if (e.pointerType !== 'mouse') drag.timer = setTimeout(() => { if (drag && !drag.on) dragStart(); }, 260); // sentuh: tahan sebentar baru nyeret, biar scroll halaman tetap bisa
}
function dragStart() {
  const d = drag, h = document.getElementById('hand'); if (!d || !h) return;
  d.on = true; const r = d.el.getBoundingClientRect(); d.ox = d.x - r.left; d.oy = d.y - r.top;
  const cl = d.el.cloneNode(true); cl.classList.remove('sel'); cl.classList.add('dc'); cl.style.transform = `translate3d(${r.left}px,${r.top}px,0) scale(1.12) rotate(-4deg)`;
  document.body.appendChild(cl); d.cl = cl; d.el.classList.add('ph');
  try { h.setPointerCapture(d.pid); } catch (_) {}
  try { navigator.vibrate && navigator.vibrate(12); } catch (_) {}
}
function onHandMove(e) {
  const d = drag, h = e.currentTarget; if (!d || e.pointerId !== d.pid) return;
  d.x = e.clientX; d.y = e.clientY;
  if (!d.on) {
    if (Math.hypot(d.x - d.x0, d.y - d.y0) > (e.pointerType === 'mouse' ? 5 : 9)) { if (e.pointerType === 'mouse') dragStart(); else { clearTimeout(d.timer); drag = null; } }
    if (!d.on) return;
  }
  if (!d.raf) d.raf = requestAnimationFrame(() => dragFrame(d, h)); // proses 1x per frame, bukan tiap event sentuh
}
function dragFrame(d, h) {
  d.raf = 0; if (drag !== d || !d.on || !d.cl) return;
  d.cl.style.transform = `translate3d(${d.x - d.ox}px,${d.y - d.oy}px,0) scale(1.12) rotate(-4deg)`; // transform = jalur GPU, nggak bikin layout ulang
  const pr = d.el.getBoundingClientRect();
  if (d.x >= pr.left && d.x <= pr.right && d.y >= pr.top && d.y <= pr.bottom) return; // masih di atas slot sendiri
  const hr = h.getBoundingClientRect(); if (d.x < hr.left - 40 || d.x > hr.right + 40 || d.y < hr.top - 50 || d.y > hr.bottom + 50) return;
  let best = null, bd = 1e12;
  for (const c of h.children) { if (c === d.el) continue; const r = c.getBoundingClientRect(), dx = d.x - (r.left + r.width / 2), dy = d.y - (r.top + r.height / 2), q = dx * dx + dy * dy * 2; if (q < bd) { bd = q; best = c; } }
  if (!best) return;
  const br = best.getBoundingClientRect();
  h.insertBefore(d.el, d.x < br.left + br.width / 2 ? best : best.nextSibling);
}
function endDrag() {
  const d = drag; if (!d) return; drag = null; clearTimeout(d.timer); if (d.raf) cancelAnimationFrame(d.raf);
  if (d.on) {
    const h = document.getElementById('hand');
    if (d.cl) d.cl.remove(); d.el.classList.remove('ph');
    if (h && h.contains(d.el)) { order = [...h.children].map(c => +c.dataset.id); saveOrder(); arnHide(); }
    dragEnd = Date.now();
    try { h.releasePointerCapture(d.pid); } catch (_) {}
  }
  if (pendingDraw) { pendingDraw = false; draw(); }
}
function abortDrag() { if (drag) { clearTimeout(drag.timer); if (drag.raf) cancelAnimationFrame(drag.raf); if (drag.cl) drag.cl.remove(); drag = null; } pendingDraw = false; }
document.addEventListener('keydown', e => { // pintasan PC: Enter = Keluarkan, P = Lewat, Esc = Batal pilih
  const t = e.target || {}; if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')) return;
  const b = id => { const x = document.getElementById(id); return x && !x.disabled ? x : null; };
  let x = null;
  if (e.key === 'Enter' && t.tagName !== 'BUTTON') x = b('pl'); else if (e.key === 'Escape') x = b('cl'); else if (e.key === 'p' || e.key === 'P') x = b('ps');
  if (x) { e.preventDefault(); x.click(); }
});
// touchmove non-passive dipasang cuma di #hand (lihat drawGame), biar scroll di area lain nggak nunggu JSl halaman

// ---------- notif mengambang: "Rapikan kartu dulu" 30 detik di awal game ----------
// Muncul sekali tiap game baru (belum ada kartu keluar). Hilang sendiri setelah 30 detik, atau begitu pemain udah ngerapiin (geser kartu / Kelompokkan) atau tap ✕.
let arnT = null, arnKey = '';
function arnHide() { clearTimeout(arnT); arnT = null; const e = document.getElementById('arn'); if (e) e.hidden = true; }
function arnShow() {
  const e = document.getElementById('arn'); if (!e) return;
  e.innerHTML = '<div class="ar"><div><b>🃏 Rapikan kartu terlebih dahulu</b> <span style="color:var(--mute)">(30 detik)</span><br>' +
    '👆 <b>Geser manual:</b> tahan sebentar sebuah kartu, lalu seret ke posisi baru (di PC langsung seret).<br>' +
    '⚡ <b>Otomatis:</b> tap <b>Kelompokkan</b>, kartu kembar dan seri langsung dikumpulin.</div>' +
    '<button id="arx" class="ghost" aria-label="Tutup" style="padding:0 8px">✕</button></div>' +
    '<div class="ab"><button id="arg">Kelompokkan sekarang</button></div><div class="bar30"><i></i></div>';
  e.hidden = false;
  document.getElementById('arx').onclick = arnHide;
  document.getElementById('arg').onclick = () => { order = groupHand(order); saveOrder(); arnHide(); drawGame(); };
  clearTimeout(arnT); arnT = setTimeout(arnHide, 30000);
}
function arnCheck(g, h) { // game baru = tangan baru dan belum ada kartu keluar
  if (g.over || (g.log || []).length || !h || h.length < 2) return;
  const k = code + ':' + h.join(',');
  if (k === arnKey) return;
  arnKey = k; arnShow();
}
function selUI(mt) { // update ringan setelah pilih/batal pilih kartu
  const p = document.getElementById('pl'), c = document.getElementById('cl'), e = document.querySelector('p.msg.err');
  if (p) p.disabled = !(mt && sel.size); if (c) c.disabled = !sel.size; if (e) e.textContent = '';
}
let gsTable = null; // isi HTML meja yang lagi tampil
function syncHandDOM(h, ids) { // samain kartu di tangan dengan urutan terbaru: kartu yang masih ada dipakai lagi (gambar SVG nggak dibuat ulang), cuma yang baru / hilang yang diubah
  const old = new Map([...h.children].map(el => [+el.dataset.id, el]));
  let prev = null;
  ids.forEach(id => {
    let el = old.get(id);
    if (el) old.delete(id); else { const t = document.createElement('template'); t.innerHTML = card(id, ''); el = t.content.firstChild; }
    el.classList.toggle('sel', sel.has(id));
    const want = prev ? prev.nextSibling : h.firstChild;
    if (el !== want) h.insertBefore(el, want);
    prev = el;
  });
  old.forEach(el => el.remove());
}
function drawGame() {
  const g = room.game; if (!g) return;
  const ln = (g.log || []).length; // efek suara saat ada kartu keluar (dari siapa pun)
  if (lastLog >= 0 && ln > lastLog) { const e = g.log[ln - 1]; if ((g.bomb || g.self2) && g.over) Snd.boom(); else if (e.c) Snd.play(e.c.length); else if (e.x) Snd.pass(); if (e.c) fly = e.p; }
  lastLog = ln;
  const P = room.players, hands = g.hands || {}, passed = g.passed || {}, last = g.last || null;
  const dec = g.dec || {}, pend = Object.keys(dec).length, fin = g.fin || [], rank = p => fin.indexOf(p) + 1, stopped = g.stopped || {};
  const cur = g.order[g.turn], mine = syncOrder(hands[me] || []);
  arnCheck(g, hands[me]);
  const myTurn = cur === me && !g.over && !pend && !fin.includes(me);
  const mi = g.order.indexOf(me), after = g.order.map((_, k) => g.order[(mi + 1 + k) % g.order.length]).slice(0, g.order.length - 1).reverse(); // pemain berikutnya ada di paling kanan
  const opps = after.map(p => `<div data-p="${p}" class="opp ${cur === p && !g.over && !pend ? 'turn' : ''} ${passed[p] || rank(p) ? 'pass' : ''}">${esc(P[p]?.n || '?')}${pdHTML(p)}${rank(p) ? 'Juara ' + rank(p) + (stopped[p] ? ' (murni)' : '') : (passed[p] ? 'lewat' : '')}${dec[p] ? '<br>murni, milih...' : ''}</div>`).join('');
  const BL = l => l.t === 'r' ? 'seri ' + l.n + ' satu logo' : ({ q: '4 kembar', g: '4 kembar + pasangan', x: 'seri 5 satu logo + pasangan', d: '8 kartu kembar (2 x 4 kembar)' }[l.t] || 'bom');
  let center;
  if (g.self2) center = `<div class="win">${g.self2 === me ? 'Lo' : esc(P[g.self2]?.n || '?')} ngebom diri sendiri, kalah</div><div>Kartu terakhirnya ada angka 2. Game diulang dari fase kumpulin 3.</div><div class="cards">${cardsOf(last.c)}</div>`;
  else if (g.quad2) center = `<div class="win">${g.quad2 === me ? 'Lo' : esc(P[g.quad2]?.n || '?')} dapat 4 kartu 2, kalah instan</div><div>Game diulang dari fase kumpulin 3.</div>`;
  else if (g.over && !g.bomb) center = `<div class="win">Permainan selesai</div>${fin.map((p, i) => `<div>Juara ${i + 1}: <b>${esc(P[p]?.n || '?')}</b>${p === me ? ' (lo)' : ''}</div>`).join('')}`;
  else if (g.over) center = `<div class="win">${g.winner === me ? 'Lo menang!' : esc(P[g.winner]?.n) + ' menang'}</div>${g.bomb && last ? `<div>Memotong kartu 2 pakai ${BL(last)}</div><div class="cards">${cardsOf(last.c)}</div>` : ''}`;
  else if (pend) center = `<div>Ada kartu murni (tanpa J, Q, K). Game mulai setelah pemain murni memilih.</div>`;
  else if (last) center = `<div>${esc(P[last.p]?.n)} • ${typeName[last.t]}${last.t === 'r' ? ' ' + last.n : ''}</div><div class="cards">${cardsOf(last.c)}</div>`;
  else if (g.first) center = `<div>Fase kumpulin 3: tiap pemain keluarin semua kartu 3-nya sekaligus. Pemegang 3 terendah (3♠ kalau ada) jalan duluan setelahnya.</div>`;
  else center = `<div>${myTurn ? 'Giliran lo buka, bebas kombinasi' : esc(P[cur]?.n) + ' buka ronde baru'}</div>`;
  const status = g.over ? (g.bomb || g.quad2 || g.self2 ? 'Game berikutnya: pemegang kartu 3 jalan duluan, wajib keluarin kartu 3 itu.' : 'Game berikutnya: juara 1 jalan duluan, bebas kombinasi.') : fin.includes(me) ? 'Lo juara ' + rank(me) + '. Nunggu pemain lain selesai.' : pend ? 'Nunggu pemain murni memilih...' : myTurn ? (g.first ? 'Giliran lo. Keluarin semua kartu 3 lo sekaligus.' : 'Giliran lo') : (g.first ? 'Fase kumpulin 3. ' : '') + `Giliran ${esc(P[cur]?.n)}`;
  const oldVer = g.v !== VMAJ ? '<div class="box err">Versi halaman lo beda dengan game ini. Halaman akan update otomatis; kalau nggak, hard refresh atau buka tab private, lalu host mulai game ulang.</div>' : '';
  // Kerangka meja dibikin sekali. Tiap giliran cuma bagian yang berubah yang diisi ulang:
  // tangan lo (kartu yang sama nggak dibuat ulang), meja cuma kalau kartu di meja ganti, sisanya teks kecil.
  if (!document.getElementById('hand') || !document.getElementById('gs-tb')) {
    gsTable = null;
    $.innerHTML = `<div id="gs-old" style="display:contents"></div><div class="row" style="justify-content:space-between"><b>Room ${code}</b><button id="lv" class="ghost" style="flex:0">Keluar</button></div>
  <div class="opps" id="gs-op" style="margin-top:8px"></div>
  <div class="table" id="gs-tb"></div>
  <p class="msg" id="gs-st"></p><p class="msg err" id="gs-er"></p>
  <div id="gs-dec" style="display:contents"></div>
  <div data-p="${me}" class="me" id="gs-me"><div class="cards hand" id="hand"></div>
  <div class="row acts" id="gs-ac" style="margin-top:10px"></div></div>`;
  }
  const gid = x => document.getElementById(x);
  gid('gs-old').innerHTML = oldVer;
  gid('gs-op').innerHTML = opps;
  if (center !== gsTable) { gid('gs-tb').innerHTML = center; gsTable = center; } // meja sama: jangan dibongkar (animasi kartu yang lagi jalan juga nggak terputus)
  gid('gs-st').innerHTML = status; gid('gs-er').textContent = err;
  gid('gs-dec').innerHTML = dec[me] ? `<div class="box"><b>Kartu murni!</b> Lo nggak dapat J, Q, K sama sekali. Berhenti sekarang = juara instan, atau lanjut main.<div class="row" style="margin-top:8px"><button id="bh">Berhenti, juara</button><button id="kt" class="ghost">Lanjut main</button></div></div>` : '';
  gid('gs-me').className = 'me ' + (myTurn ? 'turn' : '');
  syncHandDOM(gid('hand'), mine);
  gid('gs-ac').innerHTML = g.over ? (hostNow() ? '<button id="again">Main lagi</button>' : '<span class="msg">Nunggu host mulai ulang</span>')
    : `<button id="pl" ${myTurn && sel.size ? '' : 'disabled'}>Keluarkan</button><button id="ps" class="ghost" ${myTurn && last && !g.first ? '' : 'disabled'}>Lewat</button><button id="cl" class="ghost" ${sel.size ? '' : 'disabled'}>Batal pilih</button>${mine.length > 1 ? '<button id="kp" class="ghost">Kelompokkan</button>' : ''}${g.first && myTurn ? '<button id="a3" class="ghost">Pilih semua 3</button>' : ''}`;
  if (fly != null) { const f = fly; fly = null; flyIn(f); }
  lv.onclick = () => { if (confirm('Keluar dari game? Lo nggak bisa balik ke game ini.')) { leaveGame(); } };
  hand.oncontextmenu = e => e.preventDefault();
  if (!hand._tm) { hand._tm = 1; hand.addEventListener('touchmove', e => { if (drag && drag.on) e.preventDefault(); }, { passive: false }); } // nyeret kartu: jangan ikut scrol (dipasang sekali, #hand sekarang dipakai terus)
  hand.onpointerdown = onHandDown; hand.onpointermove = onHandMove; hand.onpointerup = hand.onpointercancel = endDrag;
  hand.onclick = e => {
    if (Date.now() - dragEnd < 350) return; // klik susulan habis nyeret kartu: abaikan
    const el = e.target.closest('.c'); if (!el) return;
    const id = +el.dataset.id, up = !sel.has(id); Snd.tick(up); up ? sel.add(id) : sel.delete(id); err = '';
    el.classList.toggle('sel', up); selUI(myTurn);
  };
  if (dec[me]) { bh.onclick = () => decideCall(true); kt.onclick = () => decideCall(false); }
  if (g.over) { if (hostNow()) again.onclick = start; return; }
  if (g.first && myTurn) a3.onclick = () => { sel.clear(); mine.filter(c => rk(c) === 0).forEach(c => sel.add(c)); drawGame(); };
  if (mine.length > 1) kp.onclick = () => { order = groupHand(order); saveOrder(); arnHide(); drawGame(); };
  pl.onclick = () => play(false); ps.onclick = () => play(true); cl.onclick = () => { sel.clear(); document.querySelectorAll('#hand .c.sel').forEach(c => c.classList.remove('sel')); selUI(myTurn); };
}
function leaveGame() {
  // keluar di tengah game: game tetap lanjut, kursi lo langsung dipegang bot (AFK). Room cuma dibubarkan kalau nggak ada manusia lain.
  if (ref && room && humans() <= 1) ref.remove();
  else if (ref) ref.child('presence/' + me).update({ online: false, off: TS });
  leave(true);
}

// ---------- cache gambar kartu + background + Firebase SDK + game.js/style.css (service worker, file sw.js) ----------
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });

// ---------- tahan layar nyala selama di room (Safari 16.4+, Chrome, Edge) ----------
let wlock = null;
async function wlAcquire() {
  try {
    if (!('wakeLock' in navigator) || wlock || document.hidden || !code) return;
    const l = await navigator.wakeLock.request('screen'); wlock = l;
    l.addEventListener('release', () => { if (wlock === l) wlock = null; });
    if (!code) wlRelease();
  } catch (_) { wlock = null; }
}
function wlRelease() { try { if (wlock) wlock.release(); } catch (_) {} wlock = null; }
document.addEventListener('visibilitychange', () => { if (!document.hidden && code) wlAcquire(); }); // browser ngelepas otomatis pas tab disembunyiin, ambil lagi pas balik
addEventListener('pointerup', () => { if (code && !wlock) wlAcquire(); }, { passive: true }); // sebagian browser cuma kasih izin setelah disentuh

// auto-update: kalau game.min.js / style.css di server beda dengan yang lagi jalan, halaman dimuat ulang otomatis (room tetap nyambung).
// Ngeceknya pakai cache:'no-cache' (conditional request, server balas 304 kalau nggak berubah), jadi hemat kuota.
(function autoUpdate() {
  const norm = t => t.replace(/\r\n/g, '\n').trim();
  const hash = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return String(h); };
  const get = async u => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u); return norm(await r.text()); };
  let base = null; // hash game.js + style.css pas pertama dicek; kalau berubah sesudahnya = ada update
  async function check() {
    try {
      const [js, css] = await Promise.all([get('game.min.js'), get('style.css')]);
      const m = js.match(/(?:^|[^\w$.])VER\s*=\s*(['"])([^'"]*)\1/), h = hash(js + '\u0000' + css);
      if (base === null) base = h;
      if ((!m || m[2] === VER) && h === base) return;
      if (sessionStorage.getItem('k13upd') === h) return; // sudah pernah coba muat ulang ke versi ini, cegah loop
      sessionStorage.setItem('k13upd', h);
      $.insertAdjacentHTML('afterbegin', '<p class="msg">Ada update, memuat versi terbaru...</p>');
      try { await Promise.all([fetch('game.min.js', { cache: 'reload' }), fetch('style.css', { cache: 'reload' })]); } catch (_) {} // buang cache browser dulu biar muat ulang pasti dapat file baru
      setTimeout(() => location.replace(location.pathname + '?u=' + Date.now()), 400);
    } catch (e) { /* offline: abaikan */ }
  }
  setTimeout(check, 1500);
  setInterval(check, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();

(function resume() {
  const rc = localStorage.getItem('k13room');
  if (rc) {
    db.ref('rooms/' + rc + '/players/' + me).once('value').then(s => s.exists() ? enter(rc) : (localStorage.removeItem('k13room'), draw()));
  } else draw();
})();
document.getElementById('tt').onclick = openTut;
// meter FPS kecil di pojok kiri bawah. Nyalain/matiin lewat tulisan "Meter FPS" di footer paling bawah (atau ?fps=1 / ?fps=0 di URL). Pilihan tersimpan.
let fpsEl = null, fpsRaf = 0;
function fpsSet(on) {
  try { on ? localStorage.setItem('k13fps', '1') : localStorage.removeItem('k13fps'); } catch (_) {}
  const b = document.getElementById('fpsT'); if (b) b.textContent = 'Meter FPS: ' + (on ? 'nyala' : 'mati');
  if (!on) { cancelAnimationFrame(fpsRaf); if (fpsEl) fpsEl.remove(); fpsEl = null; return; }
  if (fpsEl) return;
  fpsEl = document.createElement('div'); fpsEl.textContent = 'mengukur...';
  fpsEl.style.cssText = 'position:fixed;left:6px;top:calc(6px + env(safe-area-inset-top,0px));z-index:99;font:12px/1 monospace;color:#7be3a0;background:#000c;padding:5px 7px;border-radius:6px;pointer-events:none';
  document.body.appendChild(fpsEl);
  let f = 0, t0 = performance.now(), last = t0, worst = 0;
  const loop = t => { f++; worst = Math.max(worst, t - last); last = t; if (t - t0 >= 1000 && fpsEl) { fpsEl.textContent = Math.round(f * 1000 / (t - t0)) + ' fps | terburuk ' + Math.round(worst) + ' ms'; f = 0; worst = 0; t0 = t; } fpsRaf = requestAnimationFrame(loop); };
  fpsRaf = requestAnimationFrame(loop);
}
(function () {
  const qf = new URLSearchParams(location.search).get('fps'); let on = false;
  try { on = qf === '1' || (qf !== '0' && localStorage.getItem('k13fps') === '1'); } catch (_) {}
  fpsSet(on);
  document.getElementById('fpsT').onclick = e => { e.preventDefault(); fpsSet(!fpsEl); };
})();
