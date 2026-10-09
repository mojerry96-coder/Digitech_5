// record.mjs — record the real Qualitative Coding Sandbox build as timed screenshots plus a cursor timeline.
// Same approach as the Drive practice walkthrough: drives the Google Chrome already installed on this Mac
// in headless mode over the DevTools protocol (Node 22 has WebSocket built in), nothing extra to install.
//
// Needs the dev server running (npm run dev), because the recorder fast-forwards between narrated
// sections through the app's dev-only store handles. Run from the project root:
//   node video/record.mjs
// Output (in video/): shots/*.png and timeline.json, read by schedule.py and compose.py.
//
// The walkthrough shows how to use the simulation without showing which analytical choices are right:
// off-camera fast-forwards clear the feedback banners, and the on-camera choices are neutral examples.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGIN = process.env.QCS_URL || 'http://localhost:5173';
const PAGE = ORIGIN + '/?skipintro&nowalk';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9341;
const SHOTS = path.join(HERE, 'shots');
const S = 4 / 3;                       // CSS px -> video px (1440x810 -> 1920x1080)
const GAP = 0.25;                      // silence between narration lines
const LINES = JSON.parse(fs.readFileSync(path.join(HERE, 'lines.json'), 'utf8'));

const dur = i => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
  path.join(HERE, 'narration', `s${i}.wav`)]).toString());
const DUR = LINES.map((_, i) => dur(i + 1));
const sleep = ms => new Promise(r => setTimeout(r, ms));

try { await fetch(ORIGIN); } catch { throw new Error(`The app is not running at ${ORIGIN}. Start it with: npm run dev`); }

/* ---------- Chrome + CDP ---------- */
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'qcs-rec-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
  '--window-size=1440,810', 'about:blank'], { stdio: 'ignore' });

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
}
if (!target) { chrome.kill(); throw new Error('Chrome did not start'); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let msgId = 0;
const pending = new Map(), waiters = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  else if (m.method) waiters.filter(w => w.method === m.method).forEach(w => { waiters.splice(waiters.indexOf(w), 1); w.res(m.params); });
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++msgId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const once = method => new Promise(res => waiters.push({ method, res }));
async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 810, deviceScaleFactor: S, mobile: false });
const loaded = once('Page.loadEventFired');
await send('Page.navigate', { url: PAGE });
await loaded;
await ev('document.fonts.ready.then(() => true)');
for (let i = 0; i < 50; i++) { if (await ev('!!window.__session')) break; await sleep(100); }
// The learner for the demo, straight to the ATLAS.ti Welcome Screen with the handoff
await ev(`(() => { __session.getState().setLearner('Demo Learner'); __session.getState().setStage('welcome'); return true; })()`);
await sleep(900);
await ev(`(() => { const s = document.createElement('style'); s.textContent = '*{caret-color:#1f1f1f} .toast{display:none}'; document.head.appendChild(s); return true; })()`);
// Page-side helpers for fast-forwards (the same modules the app uses)
await ev(`(async () => {
  window.__A = await import('/src/sim/analysis.ts');
  window.__G1 = await import('/src/sim/gameplay1.ts');
  window.__G2 = await import('/src/sim/gameplay2.ts');
  window.__G3 = await import('/src/sim/gameplay3.ts');
  window.__quiet = () => __session.getState().patch({ consequence: null });
  // screen rectangle of a phrase inside the open document (for real mouse selection)
  window.__phrase = (phrase) => {
    for (const body of document.querySelectorAll('.doc-text .p-body')) {
      const nodes = []; const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); let n, acc = '';
      while ((n = w.nextNode())) { nodes.push([n, acc.length]); acc += n.textContent; }
      const i = acc.indexOf(phrase); if (i < 0) continue;
      const loc = o => { for (let k = nodes.length - 1; k >= 0; k--) if (o >= nodes[k][1]) return [nodes[k][0], o - nodes[k][1]]; };
      const r1 = document.createRange(); r1.setStart(...loc(i)); r1.setEnd(...loc(i + 1));
      const r2 = document.createRange(); r2.setStart(...loc(i + phrase.length - 1)); r2.setEnd(...loc(i + phrase.length));
      const a = r1.getBoundingClientRect(), b = r2.getBoundingClientRect();
      return [a.left + 1, a.top + a.height / 2, b.right - 1, b.top + b.height / 2];
    }
    return null;
  };
  return true; })()`);

/* ---------- Recorder (real clock: t is seconds since the first frame) ---------- */
let T0 = 0, n = 0;
const now = () => (Date.now() - T0) / 1000;
const images = [], keys = [], clicks = [], marks = {};
let cur = [1500, 700];

async function shot() {
  const t = now();
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(SHOTS, String(++n).padStart(4, '0') + '.png');
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  images.push([+t.toFixed(3), file]);
}
async function hold(d) { const end = now() + d; do { await shot(); await sleep(60); } while (now() < end); }
async function untilT(t) { if (now() < t) await hold(t - now()); }

async function center(sel) {
  for (let i = 0; i < 50; i++) {
    const c = await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null;
      e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const r = e.getBoundingClientRect(); if (!r.width) return null; return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
    if (c) return c;
    await sleep(100);
  }
  throw new Error('not found: ' + sel);
}
let tagN = 0;
async function byText(sel, text) {
  const id = 'r' + (++tagN);
  for (let i = 0; i < 50; i++) {
    const ok = await ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find(x => x.textContent.includes(${JSON.stringify(text)}) && x.getBoundingClientRect().width);
      if (!e) return false; e.dataset.rec = ${JSON.stringify(id)}; return true; })()`);
    if (ok) return `[data-rec="${id}"]`;
    await sleep(100);
  }
  throw new Error(`not found: ${sel} "${text}"`);
}
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'none' }, extra));

async function move(target, d = 0.8, { dx = 0, dy = 0 } = {}) {
  let [x, y] = typeof target === 'string' ? await center(target) : target;
  x += dx; y += dy;
  keys.push([now(), ...cur]);
  await hold(d * 0.85);
  cur = [x * S, y * S];
  keys.push([now(), ...cur]);
  await mouse('mouseMoved', x, y);
  await sleep(120);
  await shot();
}
async function click({ button = 'left', count = 1, settle = 0.45 } = {}) {
  const [x, y] = [cur[0] / S, cur[1] / S];
  clicks.push([now(), ...cur]);
  for (let c = 1; c <= count; c++) {
    await mouse('mousePressed', x, y, { button, clickCount: c, buttons: button === 'left' ? 1 : 2 });
    await mouse('mouseReleased', x, y, { button, clickCount: c });
  }
  await hold(settle);
}
/** A real drag-select of text: press at the phrase start, sweep, release at its end. */
async function selectPhrase(phrase, d = 1.4) {
  const r = await ev(`__phrase(${JSON.stringify(phrase)})`);
  if (!r) throw new Error('phrase not found: ' + phrase);
  const [x1, y1, x2, y2] = r;
  await move([x1, y1], 0.8);
  clicks.push([now(), ...cur]);
  await mouse('mousePressed', x1, y1, { button: 'left', clickCount: 1, buttons: 1 });
  const steps = Math.max(10, Math.round(d / 0.08));
  for (let s = 1; s <= steps; s++) {
    const u = s / steps, e = u * u * (3 - 2 * u);
    // sweep along the lines: x travels, y steps down with the text
    const x = x1 + (x2 - x1) * e, y = y1 + (y2 - y1) * e;
    cur = [x * S, y * S];
    keys.push([now(), ...cur]);
    await mouse('mouseMoved', x, y, { button: 'left', buttons: 1 });
    await shot();
  }
  await mouse('mouseReleased', x2, y2, { button: 'left', clickCount: 1 });
  await hold(0.5);
}
async function type(text, d) {
  const step = d / text.length;
  for (let i = 0; i < text.length; i += 2) {
    await send('Input.insertText', { text: text.slice(i, i + 2) });
    await shot();
    const lag = step * 2 * 1000 - 60;
    if (lag > 0) await sleep(lag);
  }
}
async function key(k, code, vk) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: k === 'Enter' ? '\r' : undefined });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
}
/** Scroll the page under the cursor by script (mouseWheel can stall headless Chrome), filming each step. */
async function wheel(x, y, dy, steps = 6) {
  for (let i = 0; i < steps; i++) {
    await ev(`(() => { let e = document.elementFromPoint(${x}, ${y});
      while (e && !(e.scrollHeight > e.clientHeight && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement;
      (e || document.scrollingElement).scrollBy(0, ${dy / steps}); return true; })()`);
    await shot();
    await sleep(60);
  }
}

/** Smoothly scroll the debrief so an element sits near the top, filming each step. */
async function scrollTo(sel, steps = 8) {
  const dy = await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? e.getBoundingClientRect().top - 24 : 0; })()`);
  await wheel(720, 420, dy, steps);
}

/* Narration bookkeeping: line i may start at its mark, never before the previous line ends. */
let lineEnd = 0;
const idx = id => LINES.findIndex(l => l.id === id) + 1;
async function section(id) {
  const i = idx(id);
  await untilT(lineEnd + GAP);
  marks[id] = +now().toFixed(2);
  lineEnd = now() + DUR[i - 1];
}
function follow(id) { lineEnd = lineEnd + GAP + DUR[idx(id) - 1]; }

/* ================== The walkthrough ================== */
T0 = Date.now();
keys.push([0, ...cur]);
await shot();

// 1 · Welcome — the ATLAS.ti Welcome Screen, with the case handoff
await hold(0.6);
marks.welcome = +now().toFixed(2);
lineEnd = now() + DUR[0];
await move('.wl-msg-subject', 1.6);
await hold(1.5);

// 2 · The handoff, then open the shared project
await section('handoff');
await move('.wl-instruction', 1.0);
await hold(2.2);
await move('.wl-message .wl-open', 1.0);
await click({ settle: 1.2 });

// 3 · A tour of the workspace
await section('tour');
await move(await byText('.tree-row', 'Documents'), 0.9);
await hold(0.4);
await move(await byText('.tree-row.leaf', 'D2:'), 0.7);
await click({ count: 2, settle: 1.0 });
await move('.doc-text', 0.9, { dy: -60 });
await hold(0.3);
await move('.rail .case-section', 1.0);
await hold(1.0);

// 4 · Segment: a real drag-select, then Create Free Quotation
await section('segment');
await selectPhrase("Oh, it's brilliant. I always tell people it's good.", 1.4);
await move('.sel-bar .sel-btn.primary', 0.9);
await click({ settle: 1.2 });
await move('.quote-label', 0.8);
await hold(0.8);

// 5 · All six transcripts (fast-forward off-camera), then Finish segmenting
await section('segall');
await ev(`(() => { const P = __project.getState(); for (const u of __A.locateUnits(P.docs).filter(u => u.participant !== 'P8'))
  __project.getState().createQuotation({ docId: u.docId, start: u.start, end: u.end }); __project.getState().setSelection(null); return true; })()`);
await hold(0.4);
await move(await byText('.rail .btn', 'Finish segmenting'), 1.0);
await click({ settle: 0.2 });
await ev('(__quiet(), true)');
await hold(0.6);

// 6 · Code: select a segment in the margin, Apply Codes, type a name
await section('code');
await ev(`(() => { __project.getState().openTab({ kind: 'document', id: 2 }, 0); return true; })()`);
await hold(0.3);
await move('.quote-label', 0.8);
await click({ settle: 0.4 });
await move(await byText('.tb-btn', 'Apply code'), 0.8);
await click({ settle: 0.5 });
await type('positive about the service', 1.5);
await key('Enter', 'Enter', 13);
await hold(0.7);
await key('Escape', 'Escape', 27);
await hold(0.4);

// 7 · The Codes tab in the right panel
await section('manager');
await move('.rail-tabs button[role="tab"]:nth-child(2)', 0.9);
await click({ settle: 0.6 });
await move('.cl-row', 0.8);
await hold(0.6);
await move('.cl-row:nth-child(3)', 0.7);
await click({ button: 'right', settle: 1.4 });
await ev('(document.dispatchEvent(new MouseEvent("mousedown")), true)');
await hold(0.4);
await move('.rail-tabs button[role="tab"]:nth-child(1)', 0.8);
await click({ settle: 0.5 });

// 8 · Finish coding → Codebook Confidence (fast-forward the rest of the coding)
await section('meter');
await ev(`(() => {
  const NAME = { ENDORSE: 'positive about the service', ENCOUNTER: 'positive about the service', CRITIQUE: 'critical of the service',
    NONENGAGE: 'not attending', SELFRELIANCE: 'copes alone', ILLEGIT: 'doubts own need', STIGMA: 'worried about being seen',
    DISTRESS: 'struggling', ACCESS: 'waits and opening hours', PUBLICPRIVATE: 'tells others to go' };
  const P = () => __project.getState();
  for (const u of __A.locateUnits(P().docs).filter(u => u.participant !== 'P8')) {
    const q = P().quotations.find(q => q.docId === u.docId && q.start === u.start); if (q) P().applyCode(q.id, P().createCode(NAME[u.mechanism]).id);
  }
  return true; })()`);
await hold(0.3);
await move(await byText('.rail .btn', 'Finish first-pass coding'), 0.9);
await click({ settle: 0.2 });
await ev('(__quiet(), true)');
await hold(0.4);
await move('.meter', 0.9);
await hold(1.6);

// 9 · Intercoder Agreement with Coder 2
await section('ica');
await move('.ica-card .ica-excerpt', 1.0);
await hold(0.8);
await move('.ica-card .ica-compare > div:nth-child(2)', 0.9);
await hold(0.8);
await move(await byText('.ica-card:first-of-type .ica-opt', 'Codebook needs revision'), 0.9);
await click({ settle: 0.6 });
await move('.ica-card:first-of-type .ica-options:not(.cls) .ica-opt', 0.8);
await hold(0.8);
// fast-forward the rest of the reconciliation (standard route), straight on to Gameplay 2
// (the fast-forward answers are deliberately not the reference ones, and the reconciliation tab is closed
// before the next frame so no classification is shown as if it were a model answer)
await ev(`(() => { const S = __session.getState();
  S.setRecon('P2', { cls: 'revise', action: 'keep' }); S.setRecon('P4', { cls: 'variation', action: 'keep' }); S.setRecon('P5', { cls: 'overlap', action: 'keep' });
  __G1.submitReconciliation(); S.clearFlag('reliability-check-incomplete'); __G2.startGP2(); __quiet();
  const P = __project.getState(); if (P.groups[0].tabs.some(t => t.kind === 'ica')) P.closeTab(0, 'ica');
  __project.getState().openTab({ kind: 'overview' }, 0); return true; })()`);
await hold(0.4);

// 10 · Gameplay 2: category count, then Sort into Bins
await section('bins');
await move('.count-step .step-btn:last-of-type', 0.9);
await click({ settle: 0.3 });
await move('.count-step .step-btn:first-of-type', 0.6);
await click({ settle: 0.4 });
await move(await byText('.rail .btn', 'Open Sort into Bins'), 0.8);
await click({ settle: 0.8 });
await move('.bins-unsorted .bin-chip', 0.9);
await hold(0.4);
await ev(`(() => { const sel = document.querySelector('.bins-unsorted .bin-chip select');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'CG1'); sel.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
clicks.push([now(), ...cur]);
await hold(0.6);
await move('.bin', 0.8);
await hold(0.8);

// 11 · Rank themes, P7 arrives, stress-test
await section('themes');
await ev(`(() => { const P = __project.getState(); const refs = __A.codeRefCategories(P.docs, P.quotations, P.codes, P.codings, P.currentUser);
  const order = ['SEEN', 'ENTITLED', 'SERVICE', 'ACCESS'];
  for (const c of __G2.categorisableCodes()) __G2.assignCode(c.id, 'CG' + (order.indexOf(refs.get(c.id) ?? 'SERVICE') + 1));
  __G2.finishCategories(); __quiet(); __project.getState().openTab({ kind: 'overview' }, 0); return true; })()`);
await hold(0.3);
await move('.rank-list li:nth-child(2) .rank-body', 0.9);
await hold(0.5);
// show the controls without making a ranking choice on camera
await move('.rank-list li:nth-child(2) .rank-btn', 0.6);
await hold(0.6);
await move(await byText('.rail .btn', 'Confirm ranking'), 0.8);
await click({ settle: 0.2 });
await ev('(__quiet(), true)');
await hold(1.0);
await move(await byText('.rail .btn', 'Open stress test'), 0.9);
await click({ settle: 0.6 });
// hover the P7 readings without choosing one (the outcome is the learner's to find)
await move('.stress-view .ica-opt', 0.9);
await hold(0.6);
await move(await byText('.stress-view .ica-opt', 'A negative case'), 0.8);
await hold(1.0);

// 12 · Gameplay 3: link categories to the theme on the interpretation map
await section('network');
await ev(`(() => { const S = __session.getState(); S.patch({ p7: { step1: 'boundary', step2: 'integrate' } });
  __G2.commitStressTest();
  // feedback from off-camera choices stays off the walkthrough
  for (const f of ['overcorrected', 'inflated', 'theme-misranked']) S.clearFlag(f);
  __G3.startGP3(); __quiet(); return true; })()`);
await hold(0.6);
await move(await byText('.net-tool', 'Link Nodes'), 0.9);
await click({ settle: 0.3 });
await move('[data-node="codeGroup:CG1"]', 0.8);
await click({ settle: 0.3 });
await move('[data-node="theme:THEME"]', 0.8);
await click({ settle: 0.8 });
await move('.net-link-label', 0.7);
await hold(0.8);

// 13 · Memo for the Dean, then the peer reviewer's challenge
await section('memo');
await ev(`(() => { // complete the jigsaw off-camera
  const P = () => __project.getState(); const net = 'NET-MAP';
  for (const g of P().codeGroups) {
    P().addLink(net, 'codeGroup:' + g.id, 'theme:THEME', 'is part of');
    const qid = P().codings.find(c => g.memberCodeIds.includes(c.codeId)).quotationId;
    P().addNode(net, 'quotation', qid, 60, 560); P().addLink(net, 'quotation:' + qid, 'codeGroup:' + g.id, 'supports');
  }
  const p7 = P().docs.find(d => d.participant === 'P7'); const t = p7.paragraphs.join('\\n'); const ph = "No, I knew I deserved it.";
  const s = t.indexOf(ph); const q = P().createQuotation({ docId: p7.id, start: s, end: s + ph.length });
  P().addNode(net, 'quotation', q.id, 700, 560); P().addLink(net, 'quotation:' + q.id, 'theme:THEME', 'contradicts');
  __G3.toMemo(); __quiet(); return true; })()`);
await hold(0.4);
await move('#memo-themeClaim', 0.9);
await click({ settle: 0.2 });
await type('Students treat support as something for other people.', 2.0);
await hold(0.4);
await ev(`(() => { const S = __session.getState();
  S.setMemo({ themeClaim: S.memo.themeClaim, strongestEvidence: '4:4', strongestEvidenceNote: 'P4 ranks their own need below patients.',
    reconciliationNote: 'The P4 disagreement with Coder 2 changed the codebook.', negativeCaseTreatment: 'P7 marks where the theme stops.',
    finalInterpretation: 'Students decide their need does not count.' });
  S.patch({ memoStatus: 'review' }); return true; })()`);
await hold(0.6);
await ev(`(() => { __G3.submitMemo(); __quiet(); return true; })()`);
await hold(0.5);
await move('.challenge-text', 0.9);
await hold(0.8);
await move(await byText('.challenge:first-of-type .posture', 'Qualify'), 0.8);
await click({ settle: 0.6 });

// 14 · The debrief — graded panels (submitted theme + meters, decision tiers, competency levels,
// challenge assessment) are hidden for the recording only, so the walkthrough stays answer-neutral.
await section('debrief');
await ev(`(() => { const st = document.createElement('style');
  st.textContent = '.debrief .db-section:has(.db-theme), .debrief .db-section:has(.db-callbacks), .debrief .db-section:has(.db-profile), .debrief .db-section.bonus { display: none !important; }';
  document.head.appendChild(st);
  const S = __session.getState();
  for (const c of S.challenges) S.setResponse(c.id, { posture: 'qualify', evidenceQuotationId: '6:4', rationale: 'P6 makes the same move outside nursing, so it is not only professional norms.' });
  __G3.submitResponses(); return true; })()`);
await sleep(500);
await hold(1.6);
await move([720, 420], 0.8);
// a slow pan from the evidence lineage down to the reflection and replay; each step repaints before capture
for (let i = 0; i < 14; i++) {
  await ev(`(() => { const sc = document.querySelector('.debrief'); sc.scrollTop += 70; return true; })()`);
  await sleep(140);
  await shot();
}
await hold(2.4);

// 15 · End card (drawn in the page; the player lays a real button over its Begin)
await untilT(lineEnd + 0.6);
marks.endcard = +now().toFixed(2);
await ev(`(() => { const d = document.createElement('div'); d.id = 'endcard';
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:radial-gradient(ellipse at 50% 40%,#0C3F66 0%,#09314F 52%,#06243C 100%);color:#fff;font-family:Manrope,sans-serif;overflow:hidden';
  d.innerHTML = '<div style="position:absolute;inset:0;background:url(/opener/chevrons.svg) right -14% center / min(980px,105vh) no-repeat;opacity:.55"></div>'
    + '<img src="/opener/miva.svg" alt="" style="position:absolute;left:50%;top:200px;height:66px;transform:translateX(-50%)">'
    + '<div style="position:absolute;left:0;right:0;top:300px;text-align:center;font:650 64px/1 Afacad,sans-serif;letter-spacing:-.02em;text-transform:uppercase">Your <span style="color:#EE9B01">turn</span></div>'
    + '<div style="position:absolute;left:50%;top:463px;transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:10px;background:#EE9B01;color:#472E00;border-radius:999px;padding:0 30px;height:56px;font:700 19px Manrope,sans-serif;white-space:nowrap">Begin &nbsp;&#8594;</div>'
    + '<div style="position:absolute;left:0;right:0;top:530px;text-align:center;font:700 14px Manrope,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(214,228,250,.72)">The Qualitative Coding Sandbox · DT01_RD_05_03</div>';
  document.body.appendChild(d); return true; })()`);
await sleep(400);
const endcardT = +now().toFixed(2);
await shot();
const end = +(Math.max(endcardT, lineEnd) + 3.4).toFixed(2);

fs.writeFileSync(path.join(HERE, 'timeline.json'), JSON.stringify({ images, keys, clicks, marks, endcard_t: endcardT, end }));
console.log(`shots ${n}, last t ${now().toFixed(2)}, end ${end}`);
console.log('marks', JSON.stringify(marks));
ws.close();
await new Promise(r => { chrome.once('exit', r); chrome.kill(); });
try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* temp profile; the OS clears it */ }
