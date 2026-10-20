import { importPdf, openPdfDoc, renderPageToCanvas } from './pdfimport.js';
import { importDocx } from './docximport.js';
import { buildDocx } from './export.js';

const L = window.leaf;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const doc = $('#doc'), desk = $('#desk');

/* =============== icons =============== */
const I = {
  compare: '<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/><path d="M5.5 8h3M5.5 11h3M15.5 8h3M15.5 11h3M15.5 14h2"/>',
  save: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  word: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 12l1.3 5 1.7-4 1.7 4 1.3-5"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 17v-4h1.4a1.3 1.3 0 0 1 0 2.6H8.5M13 17v-4h.9a2 2 0 0 1 0 4z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  text: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  clear: '<path d="M4 7V4h16v3M5 20h6M13 4 8 20M15 15l5 5M20 15l-5 5"/>',
  find: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  grow: '<path d="M3 19 8 6l5 13M4.8 15h6.4M17 7v8M13 11h8"/>', shrink: '<path d="M3 19 8 6l5 13M4.8 15h6.4M14 11h7"/>',
  sub: '<path d="m4 6 8 10M12 6l-8 10M16 16.5c0-1 .8-1.5 1.8-1.5s1.7.6 1.7 1.4c0 1.6-3.5 2.1-3.5 3.6h3.6"/>',
  sup: '<path d="m4 9 8 10M12 9l-8 10M16 5.5c0-1 .8-1.5 1.8-1.5s1.7.6 1.7 1.4c0 1.6-3.5 2.1-3.5 3.6h3.6"/>',
  ul: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  ol: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 5h1.2v4M4 9h2.4M3.8 14.2c.3-.6.8-.9 1.4-.9.7 0 1.2.4 1.2 1 0 1-2.6 1.6-2.6 2.7h2.7"/>',
  out: '<path d="M21 5H3M21 19H3M21 10h-9M21 14h-9M7 9l-3 3 3 3"/>', in: '<path d="M21 5H3M21 19H3M21 10h-9M21 14h-9M4 9l3 3-3 3"/>',
  al: '<path d="M3 5h18M3 10h12M3 14h18M3 19h12"/>', ac: '<path d="M3 5h18M6 10h12M3 14h18M6 19h12"/>',
  ar: '<path d="M3 5h18M9 10h12M3 14h18M9 19h12"/>', aj: '<path d="M3 5h18M3 10h18M3 14h18M3 19h18"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-4.5-4.5L7 20"/>',
  tbl: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  brk: '<path d="M6 3v5h12V3M6 21v-5h12v5"/><path d="M3 12h3M9 12h2M13 12h2M18 12h3"/>',
  hr: '<path d="M3 12h18M6 7h12M6 17h12" opacity=".35"/><path d="M3 12h18"/>',
  date: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M12 14h2M16 14h0M8 17h2"/>',
  portrait: '<rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M9 8h6M9 11h6M9 14h4"/>',
  landscape: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M6 10h12M6 13h8"/>',
  sheet: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  mNarrow: '<rect x="5" y="3" width="14" height="18" rx="1"/><rect x="7" y="5" width="10" height="14" stroke-dasharray="2 2"/>',
  mNormal: '<rect x="5" y="3" width="14" height="18" rx="1"/><rect x="8" y="6" width="8" height="12" stroke-dasharray="2 2"/>',
  mWide: '<rect x="5" y="3" width="14" height="18" rx="1"/><rect x="9.5" y="7" width="5" height="10" stroke-dasharray="2 2"/>',
  rail: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M5.5 8h1.5M5.5 11h1.5M5.5 14h1.5"/>',
  minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  rowAbove: '<rect x="3" y="11" width="18" height="10" rx="1.5"/><path d="M3 16h18M12 2v6M9 5h6"/>',
  rowBelow: '<rect x="3" y="3" width="18" height="10" rx="1.5"/><path d="M3 8h18M12 16v6M9 19h6"/>',
  colLeft: '<rect x="11" y="3" width="10" height="18" rx="1.5"/><path d="M16 3v18M2 12h6M5 9v6"/>',
  colRight: '<rect x="3" y="3" width="10" height="18" rx="1.5"/><path d="M8 3v18M16 12h6M19 9v6"/>',
  delRow: '<rect x="3" y="3" width="18" height="10" rx="1.5"/><path d="M3 8h18M9 17l6 4M15 17l-6 4"/>',
  delCol: '<rect x="3" y="3" width="10" height="18" rx="1.5"/><path d="M8 3v18M16 9l5 6M21 9l-5 6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  header: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18" stroke-width="3"/><path d="M3 14h18M9 9v11M15 9v11"/>',
  fill: '<path d="m5 13 7-7 7 7-7 7z"/><path d="M19 17c1 1.5 1.5 2.3 1.5 3a1.5 1.5 0 0 1-3 0c0-.7.5-1.5 1.5-3z"/>',
  iLeft: '<rect x="3" y="6" width="9" height="9" rx="1"/><path d="M15 7h6M15 11h6M15 15h6M3 19h18"/>',
  iCenter: '<rect x="7.5" y="5" width="9" height="9" rx="1"/><path d="M3 18h18M6 21h12"/>',
  iRight: '<rect x="12" y="6" width="9" height="9" rx="1"/><path d="M3 7h6M3 11h6M3 15h6M3 19h18"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  home: '<path d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/><path d="M3 7v11a2 2 0 0 0 2 2h13l3-9H7l-3 9"/>',
  new: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
  cog: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
};
const icon = (name, extra = '') => `<svg class="i" viewBox="0 0 24 24" ${extra}>${I[name] || ''}</svg>`;
const paintIcons = (root = document) => $$('svg[data-i]', root).forEach((s) => { s.innerHTML = I[s.dataset.i] || ''; });
paintIcons();

/* =============== state =============== */
const PAPER = { A4: [794, 1123], Letter: [816, 1056] };
const st = {
  open: false, name: 'Untitled document', savePath: null, src: null, // src: {path, kind, bytes}
  pdf: null, thumb: null, dirty: false, zoom: 100, setup: { paper: 'A4', orient: 'portrait', margin: 1 }, pages: 0,
};
let settings = { theme: 'system', ocr: true, langs: ['deu', 'eng'], images: true, breaks: false, snapAll: false, rail: true };
const baseName = (n) => n.replace(/\.(pdf|docx)$/i, '');
const safeName = () => (($('#docName').value || 'Untitled document').replace(/[\\/:*?"<>|]+/g, '').trim() || 'document');

/* =============== small UI helpers =============== */
function toast(msg, actions = [], ms = 5200) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  const s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
  for (const a of actions) { const b = document.createElement('button'); b.textContent = a.label; b.onclick = () => { a.run(); t.remove(); }; t.appendChild(b); }
  $('#toasts').appendChild(t);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  setTimeout(() => t.remove(), ms);
}
function busy(title, sub, pct) {
  $('#busy').hidden = title == null;
  if (title == null) return;
  $('#busyTitle').textContent = title; $('#busySub').textContent = sub || ' '; $('#busyBar').style.width = (pct || 0) + '%';
}
function modal({ title, body = '', input = false, buttons }) {
  return new Promise((resolve) => {
    $('#mTitle').textContent = title; $('#mBody').textContent = body; $('#mBody').hidden = !body;
    const inp = $('#mInput'); inp.hidden = !input; inp.value = '';
    const acts = $('#mActs'); acts.innerHTML = '';
    const done = (v) => { $('#modal').hidden = true; document.removeEventListener('keydown', key, true); resolve(v); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } if (e.key === 'Enter') { e.preventDefault(); const p = buttons.find((b) => b.primary); if (p) done(input ? (p.value === null ? null : inp.value) : p.value); } };
    for (const b of buttons) {
      const el = document.createElement('button'); el.className = 'btn' + (b.primary ? ' primary' : ''); el.textContent = b.label;
      el.onclick = () => done(input && b.value !== null ? inp.value : b.value); acts.appendChild(el);
    }
    $('#modal').hidden = false; document.addEventListener('keydown', key, true);
    setTimeout(() => (input ? inp : acts.querySelector('.primary') || acts.lastChild).focus(), 30);
  });
}
const closePops = () => { $$('.pop,.dropdown').forEach((p) => { p.hidden = true; }); };
function placePop(pop, anchor) {
  const r = anchor.getBoundingClientRect(); pop.hidden = false;
  pop.style.left = Math.max(10, Math.min(r.left, innerWidth - pop.offsetWidth - 10)) + 'px'; pop.style.top = r.bottom + 6 + 'px';
}

/* =============== theme =============== */
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $$('[data-theme-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeV === settings.theme)));
  L.setTheme(dark);
}
mq.addEventListener('change', applyTheme);
$$('[data-theme-v]').forEach((b) => b.addEventListener('click', () => { settings.theme = b.dataset.themeV; applyTheme(); L.settings.set({ theme: settings.theme }); }));

/* =============== views =============== */
function setView(view) {
  $('#viewHome').hidden = view !== 'home'; $('#viewSettings').hidden = view !== 'settings';
  $$('.nav [data-view]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.view === view)));
}
function showStart(view = 'home') {
  closePops();
  $('#start').hidden = false; setView(view);
  $('#navBack').hidden = !st.open; $('#navDocActs').hidden = !st.open;
  $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === 'file')));
  if (view === 'home') renderRecent();
}
function hideStart() { if (!st.open) return; $('#start').hidden = true; showTab(lastTab); doc.focus({ preventScroll: true }); }
function enterEditor() {
  st.open = true;
  ['#tabs', '#docbox', '#tbActions', '#ribbon', '#work', '#status'].forEach((s) => { $(s).hidden = false; });
  $('#appName').hidden = true;
  $('#start').hidden = true;
  showTab('home');
}
$$('.nav [data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#navBack').addEventListener('click', hideStart);
$('#navOpen').addEventListener('click', () => openDialog());
$('#navNew').addEventListener('click', () => newBlank());
$$('#navDocActs [data-act]').forEach((b) => b.addEventListener('click', () => { hideStart(); runAct(b.dataset.act); }));

/* =============== tabs =============== */
let lastTab = 'home';
function showTab(name) {
  if (name === 'file') { showStart('home'); return; }
  lastTab = name;
  $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== name; });
}
$$('.tab').forEach((t) => t.addEventListener('click', () => { if (t.dataset.tab !== 'file') $('#start').hidden = true; showTab(t.dataset.tab); }));

/* =============== greeting + recent =============== */
function greet() { const h = new Date().getHours(); $('#hello').textContent = h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function when(ts) {
  const d = new Date(ts), now = new Date(), diff = (now - d) / 864e5;
  if (d.toDateString() === now.toDateString()) return 'Today, ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 2 && new Date(now - 864e5).toDateString() === d.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
async function renderRecent() {
  const list = await L.recent.get();
  const box = $('#recent'); box.innerHTML = '';
  $('#clearRecent').hidden = !list.length;
  if (!list.length) { box.innerHTML = '<div class="nothing" style="grid-column:1/-1">Files you open or save will appear here.</div>'; return; }
  for (const r of list) {
    const c = document.createElement('button'); c.className = 'card' + (r.exists ? '' : ' missing'); c.title = r.path;
    const kind = /\.docx$/i.test(r.path) ? 'docx' : 'pdf';
    c.innerHTML = `<div class="sheet">${r.thumb ? `<img alt="" src="${r.thumb}">` : '<div class="ph"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'}<span class="badge ${kind}">${kind.toUpperCase()}</span></div><div class="meta"><b></b><small></small></div><span class="x" role="button" title="Remove from list">${icon('x')}</span>`;
    c.querySelector('b').textContent = baseName(r.name);
    c.querySelector('small').textContent = r.exists ? when(r.opened) : 'File was moved or deleted';
    c.addEventListener('click', (e) => {
      if (e.target.closest('.x')) { e.stopPropagation(); L.recent.remove(r.path).then(renderRecent); return; }
      if (!r.exists) { toast('That file was moved or deleted.', [{ label: 'Remove from list', run: () => L.recent.remove(r.path).then(renderRecent) }]); return; }
      openPath(r.path);
    });
    box.appendChild(c);
  }
}
$('#clearRecent').addEventListener('click', async () => { await L.recent.clear(); renderRecent(); });

/* =============== opening documents =============== */
async function confirmDiscard() {
  if (!st.open || !st.dirty) return true;
  const r = await modal({ title: `Save changes to “${safeName()}”?`, body: 'Your changes will be lost if you don’t save them.', buttons: [{ label: 'Cancel', value: 'cancel' }, { label: 'Don’t save', value: 'discard' }, { label: 'Save', value: 'save', primary: true }] });
  if (r === 'save') return !!(await save());
  return r === 'discard';
}
async function openDialog() {
  if (!(await confirmDiscard())) return;
  const f = await L.openDialog();
  if (f) await openFile(f);
}
async function openPath(p) {
  if (!(await confirmDiscard())) return;
  const f = await L.readFile(p);
  if (f.error) { toast(f.error === 'missing' ? 'That file was moved or deleted.' : 'Couldn’t open the file: ' + f.error); return; }
  await openFile(f);
}
const askPassword = (again) => modal({ title: again ? 'Wrong password' : 'This PDF is protected', body: again ? 'Try the password again.' : 'Enter the password to open it.', input: true, buttons: [{ label: 'Cancel', value: null }, { label: 'Open', value: '', primary: true }] });

async function openFile(f) {
  const isPdf = /\.pdf$/i.test(f.name), isDocx = /\.docx$/i.test(f.name);
  if (!isPdf && !isDocx) { toast('Leaf opens PDF and Word (.docx) files.'); return; }
  closePops();
  try {
    if (isPdf) {
      busy('Opening ' + f.name, 'Reading the PDF…', 2);
      let ocrNote = false;
      const r = await importPdf(f.data, {
        images: settings.images, scan: true, breaks: settings.breaks, snapAll: settings.snapAll,
        ocr: settings.ocr, ocrLangs: settings.langs, ocrFn: L.ocr, onOcr: () => { ocrNote = true; },
      }, (i, n) => busy('Opening ' + f.name, ocrNote ? `Reading scanned page ${Math.min(i + 1, n)} of ${n}…` : `Converting page ${Math.min(i + 1, n)} of ${n}…`, Math.max(4, (i / n) * 100)), askPassword);
      loadDocument({ html: r.html, name: baseName(f.name), savePath: null, src: { path: f.path, kind: 'pdf', bytes: f.data }, thumb: r.thumb, setup: { paper: r.paper, orient: r.orient, margin: 1 }, pages: r.pageCount });
      $('#stInfo').textContent = `Converted from a ${r.pageCount}-page PDF`;
      if (r.ocrPages) toast(`Read ${r.ocrPages} scanned page${r.ocrPages > 1 ? 's' : ''} with text recognition.` + (r.ocrLow ? ' Words it was unsure about are highlighted.' : ''), [], 7000);
      else if (r.totalChars < 30) toast('This PDF has no text layer, so its pages were added as pictures. Turn on text recognition in Settings to make them editable.', [{ label: 'Settings', run: () => showStart('settings') }], 9000);
      await L.recent.add({ path: f.path, name: f.name, thumb: r.thumb, pages: r.pageCount });
      await loadPdfView(f.data);
    } else {
      busy('Opening ' + f.name, 'Reading the Word document…', 40);
      const html = await importDocx(f.data);
      loadDocument({ html, name: baseName(f.name), savePath: f.path, src: { path: f.path, kind: 'docx' }, thumb: null, setup: { paper: 'A4', orient: 'portrait', margin: 1 }, pages: 0 });
      $('#stInfo').textContent = '';
      markSaved(true);
      await L.recent.add({ path: f.path, name: f.name });
    }
  } catch (e) {
    console.error(e);
    if (e && e.name === 'PasswordException') toast('The PDF wasn’t opened because no password was given.');
    else toast('Couldn’t open “' + f.name + '”. ' + ((e && e.message) || ''), [], 8000);
  } finally { busy(null); }
}

function loadDocument({ html, name, savePath, src, thumb, setup, pages }) {
  if (st.pdf) { try { st.pdf.destroy(); } catch (e) { /* ignore */ } st.pdf = null; }
  st.name = name; st.savePath = savePath; st.src = src; st.thumb = thumb; st.pages = pages || 0;
  $('#docName').value = name;
  doc.innerHTML = html || '<p><br></p>';
  applySetup(setup || { paper: 'A4', orient: 'portrait', margin: 1 });
  enterEditor();
  selImg = null; ctxUpdate();
  setCompare(false); $('#thumbs').innerHTML = '';
  setRailMode(src && src.kind === 'pdf' ? 'pages' : 'outline');
  $('#vCompare').disabled = $('#btnCompare').disabled = !(src && src.kind === 'pdf');
  $('#btnCompare').hidden = !(src && src.kind === 'pdf');
  desk.scrollTop = 0;
  buildOutline(); counts(); ocrCount();
  st.dirty = false; L.setDirty(false, name);
  $('#saveChip').className = 'chip' + (savePath ? '' : ' dirty');
  $('#saveTxt').textContent = savePath ? 'Saved' : 'Not saved yet';
  L.setTitle(`${name} – Leaf`);
  L.draft.clear();
  setTimeout(() => doc.focus({ preventScroll: true }), 50);
}
async function newBlank() {
  if (!(await confirmDiscard())) return;
  loadDocument({ html: '<h1><br></h1><p><br></p>', name: 'Untitled document', savePath: null, src: null, thumb: null, setup: { paper: 'A4', orient: 'portrait', margin: 1 } });
  $('#stInfo').textContent = '';
  const h = $('#doc h1'); const r = document.createRange(); r.setStart(h, 0); r.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(r);
}

/* =============== original PDF: thumbnails + compare =============== */
let thumbObs = null, cmpObs = null;
async function loadPdfView(bytes) {
  try { st.pdf = await openPdfDoc(bytes, askPassword); } catch (e) { st.pdf = null; return; }
  const n = st.pdf.numPages;
  const box = $('#thumbs'); box.innerHTML = '';
  const cmp = $('#cmpBody'); cmp.innerHTML = '';
  $('#cmpName').textContent = `${n} page${n > 1 ? 's' : ''}`;
  const p1 = await st.pdf.getPage(1); const v = p1.getViewport({ scale: 1 }); const ratio = `${v.width} / ${v.height}`;
  thumbObs && thumbObs.disconnect(); cmpObs && cmpObs.disconnect();
  thumbObs = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting && !e.target.dataset.done) { e.target.dataset.done = 1; const c = document.createElement('canvas'); e.target.appendChild(c); renderPageToCanvas(st.pdf, +e.target.dataset.n, 136, c, 2).catch(() => {}); } }), { root: box, rootMargin: '300px' });
  cmpObs = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting && !e.target.dataset.done) { e.target.dataset.done = 1; const c = document.createElement('canvas'); e.target.appendChild(c); renderPageToCanvas(st.pdf, +e.target.dataset.n, 900, c, 1.25).catch(() => {}); } }), { root: cmp, rootMargin: '600px' });
  for (let i = 1; i <= n; i++) {
    const b = document.createElement('button'); b.className = 'thumb'; b.dataset.n = i;
    b.innerHTML = `<span class="tp" data-n="${i}" style="aspect-ratio:${ratio}"></span><small>${i}</small>`;
    b.addEventListener('click', () => goPage(i, true));
    box.appendChild(b); thumbObs.observe(b.querySelector('.tp'));
    const cp = document.createElement('div'); cp.className = 'cp'; cp.dataset.n = i; cp.style.aspectRatio = ratio;
    cmp.appendChild(cp); cmpObs.observe(cp);
  }
  curPage = 0; trackPage();
}
let curPage = 0;
function goPage(n, scrollEditor) {
  if (scrollEditor) {
    let el = doc.querySelector(`[data-pg="${n}"]`);
    if (!el) { const all = $$('[data-pg]', doc).filter((x) => +x.dataset.pg <= n); el = all[all.length - 1]; }
    if (el) desk.scrollTo({ top: el.getBoundingClientRect().top - desk.getBoundingClientRect().top + desk.scrollTop - 24, behavior: 'smooth' });
  }
  const cp = $(`#cmpBody .cp[data-n="${n}"]`);
  if (cp && !$('#compare').hidden) $('#cmpBody').scrollTo({ top: cp.offsetTop - 22, behavior: 'smooth' });
  setCurPage(n);
}
function setCurPage(n) {
  if (n === curPage) return; curPage = n;
  $$('#thumbs .thumb').forEach((t) => t.classList.toggle('cur', +t.dataset.n === n));
  const t = $(`#thumbs .thumb[data-n="${n}"]`); if (t) t.scrollIntoView({ block: 'nearest' });
}
let trackRaf = 0;
function trackPage() {
  if (!st.pdf) return;
  const top = desk.getBoundingClientRect().top + 140;
  let n = 1;
  for (const el of $$('[data-pg]', doc)) { if (el.getBoundingClientRect().top <= top) n = +el.dataset.pg; else break; }
  if (n !== curPage) {
    setCurPage(n);
    const cp = $(`#cmpBody .cp[data-n="${n}"]`);
    if (cp && !$('#compare').hidden && !cmpUserScroll) $('#cmpBody').scrollTo({ top: cp.offsetTop - 22, behavior: 'smooth' });
  }
}
let cmpUserScroll = false, cmpT = 0, zoomBeforeCompare = 0;
$('#cmpBody').addEventListener('wheel', () => { cmpUserScroll = true; clearTimeout(cmpT); cmpT = setTimeout(() => { cmpUserScroll = false; }, 1500); }, { passive: true });
desk.addEventListener('scroll', () => { cancelAnimationFrame(trackRaf); trackRaf = requestAnimationFrame(trackPage); }, { passive: true });

function setCompare(on) {
  on = on && !!st.pdf;
  $('#compare').hidden = $('#splitter').hidden = !on;
  $('#btnCompare').setAttribute('aria-pressed', String(on)); $('#vCompare').classList.toggle('on', on);
  if (on) {
    setTimeout(() => {
      const [w, h] = PAPER[st.setup.paper]; const pw = st.setup.orient === 'landscape' ? h : w;
      const fit = ((desk.clientWidth - 70) / pw) * 100;
      if (fit < st.zoom) { zoomBeforeCompare = st.zoom; setZoom(Math.max(50, fit)); }
      if (curPage) goPage(curPage, false);
    }, 30);
  } else if (zoomBeforeCompare) { setZoom(zoomBeforeCompare); zoomBeforeCompare = 0; }
}
$('#btnCompare').addEventListener('click', () => setCompare($('#compare').hidden));
$('#vCompare').addEventListener('click', () => setCompare($('#compare').hidden));
$('#cmpClose').addEventListener('click', () => setCompare(false));
$('#splitter').addEventListener('pointerdown', (e) => {
  const sp = e.currentTarget; sp.setPointerCapture(e.pointerId);
  const work = $('#work').getBoundingClientRect();
  const move = (ev) => { const w = Math.max(280, Math.min(work.right - ev.clientX, work.width * 0.7)); $('#compare').style.width = w + 'px'; };
  const up = () => { sp.removeEventListener('pointermove', move); sp.removeEventListener('pointerup', up); };
  sp.addEventListener('pointermove', move); sp.addEventListener('pointerup', up);
});

/* =============== side rail =============== */
function setRailMode(mode) {
  const hasPages = !!(st.src && st.src.kind === 'pdf');
  if (mode === 'pages' && !hasPages) mode = 'outline';
  $$('#railSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rail === mode)));
  $('#railSeg [data-rail="pages"]').disabled = !hasPages;
  $('#thumbs').hidden = mode !== 'pages'; $('#outline').hidden = mode !== 'outline';
  buildOutline();
}
$$('#railSeg button').forEach((b) => b.addEventListener('click', () => setRailMode(b.dataset.rail)));
function setRail(on) { settings.rail = on; $('#rail').hidden = !on; $('#vRail').classList.toggle('on', on); L.settings.set({ rail: on }); }
$('#vRail').addEventListener('click', () => setRail($('#rail').hidden));
function buildOutline() {
  const hs = $$('h1,h2,h3,h4', doc).filter((h) => h.textContent.trim());
  const ul = $('#outline'); ul.innerHTML = '';
  const note = $('#railNote');
  note.hidden = !(ul.hidden === false && !hs.length);
  note.textContent = 'Headings you use will be listed here. Pick a heading style on the Home tab.';
  for (const h of hs) {
    const li = document.createElement('li'); const b = document.createElement('button');
    b.className = 'l' + h.tagName[1]; b.textContent = b.title = h.textContent.trim();
    b.addEventListener('click', () => { desk.scrollTo({ top: h.getBoundingClientRect().top - desk.getBoundingClientRect().top + desk.scrollTop - 30, behavior: 'smooth' }); placeCaret(h); });
    li.appendChild(b); ul.appendChild(li);
  }
}
function placeCaret(el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); doc.focus({ preventScroll: true }); }

/* =============== page setup / zoom =============== */
function applySetup(s) {
  st.setup = { ...st.setup, ...s };
  const [w, h] = PAPER[st.setup.paper];
  const land = st.setup.orient === 'landscape';
  doc.style.setProperty('--pw', (land ? h : w) + 'px');
  doc.style.setProperty('--ph', (land ? w : h) + 'px');
  doc.style.setProperty('--pm', st.setup.margin + 'in');
  $('#pagestyle').textContent = `@page{size:${st.setup.paper === 'Letter' ? 'letter' : 'A4'} ${st.setup.orient};margin:${st.setup.margin}in}`;
  $$('[data-orient]').forEach((b) => b.classList.toggle('on', b.dataset.orient === st.setup.orient));
  $$('[data-paper]').forEach((b) => b.classList.toggle('on', b.dataset.paper === st.setup.paper));
  $$('[data-margin]').forEach((b) => b.classList.toggle('on', +b.dataset.margin === st.setup.margin));
}
$$('[data-orient]').forEach((b) => b.addEventListener('click', () => { applySetup({ orient: b.dataset.orient }); changed(); }));
$$('[data-paper]').forEach((b) => b.addEventListener('click', () => { applySetup({ paper: b.dataset.paper }); changed(); }));
$$('[data-margin]').forEach((b) => b.addEventListener('click', () => { applySetup({ margin: +b.dataset.margin }); changed(); }));
function setZoom(z) {
  st.zoom = Math.max(50, Math.min(200, Math.round(z)));
  doc.style.zoom = st.zoom / 100;
  $('#zRange').value = st.zoom; $('#sPct').textContent = st.zoom + '%';
}
$('#zOut').onclick = $('#sOut').onclick = () => setZoom(st.zoom - 10);
$('#zIn').onclick = $('#sIn').onclick = () => setZoom(st.zoom + 10);
$('#z100').onclick = $('#sPct').onclick = () => setZoom(100);
$('#zRange').addEventListener('input', (e) => setZoom(+e.target.value));
$('#zFit').onclick = () => { const [w, h] = PAPER[st.setup.paper]; setZoom(((desk.clientWidth - 70) / (st.setup.orient === 'landscape' ? h : w)) * 100); };
desk.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); setZoom(st.zoom - Math.sign(e.deltaY) * 10); } }, { passive: false });

/* =============== selection + formatting =============== */
let saved = null, selImg = null;
document.addEventListener('selectionchange', () => {
  const s = getSelection();
  if (s.rangeCount && doc.contains(s.anchorNode)) { saved = s.getRangeAt(0).cloneRange(); syncRibbon(); }
});
function restoreSel() {
  doc.focus({ preventScroll: true });
  if (!saved) return;
  const s = getSelection(); s.removeAllRanges(); s.addRange(saved);
}
function exec(cmd, val = null) { restoreSel(); document.execCommand('styleWithCSS', false, true); document.execCommand(cmd, false, val); changed(); }
const blockOf = (n) => { for (let e = n && (n.nodeType === 1 ? n : n.parentElement); e && e !== doc; e = e.parentElement) if (/^(P|DIV|H[1-6]|LI|BLOCKQUOTE|TD|TH)$/.test(e.tagName)) return e; return null; };
function selectBlockIfCollapsed() {
  const s = getSelection(); if (!s.isCollapsed) return true;
  const b = blockOf(s.anchorNode); if (!b) return false;
  const r = document.createRange(); r.selectNodeContents(b); s.removeAllRanges(); s.addRange(r); return true;
}
$('#ribbon').addEventListener('mousedown', (e) => { if (!/^(SELECT|INPUT|OPTION|LABEL)$/.test(e.target.tagName) && !e.target.closest('label')) e.preventDefault(); });
$$('[data-cmd]').forEach((b) => b.addEventListener('click', () => exec(b.dataset.cmd)));
$('#fmtPaint').addEventListener('click', () => { exec('removeFormat'); });
$$('[data-block]').forEach((b) => b.addEventListener('click', () => { exec('formatBlock', `<${b.dataset.block}>`); setTimeout(buildOutline, 0); }));
$('#fontSel').addEventListener('change', (e) => { if (!e.target.value) return; restoreSel(); if (selectBlockIfCollapsed()) exec('fontName', e.target.value); });
function applySize(pt) {
  if (!(pt >= 4 && pt <= 400)) return;
  restoreSel(); if (!selectBlockIfCollapsed()) return;
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('fontSize', false, '7');
  $$('span', doc).forEach((sp) => { if (sp.style.fontSize === 'xxx-large') sp.style.fontSize = pt + 'pt'; });
  $$('font[size="7"]', doc).forEach((f) => { const sp = document.createElement('span'); sp.style.fontSize = pt + 'pt'; sp.innerHTML = f.innerHTML; f.replaceWith(sp); });
  $('#sizeIn').value = pt; changed();
}
const curSize = () => parseFloat($('#sizeIn').value) || 11;
const STEPS = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];
$('#sizeIn').addEventListener('change', (e) => applySize(parseFloat(e.target.value)));
$('#sizeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applySize(parseFloat(e.target.value)); } });
$('#grow').addEventListener('click', () => applySize(STEPS.find((s) => s > curSize()) || curSize() + 8));
$('#shrink').addEventListener('click', () => applySize([...STEPS].reverse().find((s) => s < curSize()) || Math.max(4, curSize() - 1)));
$('#fcIn').addEventListener('input', (e) => { $('#fcSw').style.setProperty('--c', e.target.value); exec('foreColor', e.target.value); });
$('#hcIn').addEventListener('input', (e) => { $('#hcSw').style.setProperty('--c', e.target.value); exec('hiliteColor', e.target.value); });
$('#lhSel').addEventListener('change', (e) => {
  const v = e.target.value; e.target.value = ''; if (!v) return;
  restoreSel(); const s = getSelection(); if (!s.rangeCount) return;
  const r = s.getRangeAt(0);
  const blocks = $$('p,div,h1,h2,h3,h4,li,blockquote', doc).filter((b) => r.intersectsNode(b) && !b.querySelector('p,div,h1,h2,h3,h4,li,blockquote'));
  blocks.forEach((b) => { b.style.lineHeight = v; }); changed();
});
function syncRibbon() {
  ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList']
    .forEach((c) => { const b = $(`[data-cmd="${c}"]`); try { b.classList.toggle('on', document.queryCommandState(c)); } catch (e) { /* ignore */ } });
  const s = getSelection(); const n = s.anchorNode; const el = n && (n.nodeType === 1 ? n : n.parentElement);
  if (!el || !doc.contains(el)) return;
  const cs = getComputedStyle(el);
  if (document.activeElement !== $('#sizeIn')) $('#sizeIn').value = Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2;
  const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const fs = $('#fontSel'); fs.value = [...fs.options].some((o) => o.value === fam) ? fam : '';
  const b = blockOf(el); const tag = b ? b.tagName.toLowerCase() : 'p';
  $$('.sty').forEach((x) => x.classList.toggle('on', x.dataset.block === (['h1', 'h2', 'h3', 'blockquote'].includes(tag) ? tag : 'p')));
  ctxUpdate();
}

/* =============== contextual tabs =============== */
function ctxUpdate() {
  const s = getSelection(); const n = s && s.anchorNode; const el = n && (n.nodeType === 1 ? n : n.parentElement);
  const inTbl = !!(el && doc.contains(el) && el.closest('td,th'));
  $('.tab[data-tab="table"]').hidden = !inTbl;
  $('.tab[data-tab="picture"]').hidden = !selImg;
  if ((lastTab === 'table' && !inTbl) || (lastTab === 'picture' && !selImg)) { if ($('#start').hidden) showTab('home'); else lastTab = 'home'; }
}

/* =============== insert =============== */
$('#insImg').addEventListener('click', () => { imgMode = 'insert'; $('#imgIn').click(); });
let imgMode = 'insert';
function insertImageFile(f) {
  const rd = new FileReader();
  rd.onload = () => {
    if (imgMode === 'replace' && selImg) { selImg.src = rd.result; imgMode = 'insert'; changed(); return; }
    restoreSel(); document.execCommand('insertHTML', false, `<img src="${rd.result}" style="max-width:100%">`); changed();
  };
  rd.readAsDataURL(f);
}
$('#imgIn').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) insertImageFile(f); });
// table grid picker
const gp = $('#gridPick');
for (let r = 1; r <= 8; r++) for (let c = 1; c <= 10; c++) { const i = document.createElement('i'); i.dataset.r = r; i.dataset.c = c; gp.appendChild(i); }
gp.addEventListener('mouseover', (e) => { const t = e.target.closest('i'); if (!t) return; const R = +t.dataset.r, C = +t.dataset.c; $$('i', gp).forEach((x) => x.classList.toggle('on', +x.dataset.r <= R && +x.dataset.c <= C)); $('#gridLbl').textContent = `${C} × ${R} table`; });
gp.addEventListener('click', (e) => {
  const t = e.target.closest('i'); if (!t) return; closePops();
  const R = +t.dataset.r, C = +t.dataset.c;
  let h = '<table><tbody>'; for (let i = 0; i < R; i++) h += '<tr>' + '<td><br></td>'.repeat(C) + '</tr>'; h += '</tbody></table><p><br></p>';
  restoreSel(); document.execCommand('insertHTML', false, h); changed();
});
$('#insTbl').addEventListener('click', (e) => { e.stopPropagation(); closePops(); $('#gridLbl').textContent = 'Insert table'; $$('i', gp).forEach((x) => x.classList.remove('on')); placePop($('#gridPop'), e.currentTarget); });
$('#insLink').addEventListener('click', (e) => { e.stopPropagation(); closePops(); $('#lUrl').value = ''; placePop($('#linkPop'), e.currentTarget); $('#lUrl').focus(); });
$('#lCancel').addEventListener('click', closePops);
$('#lOk').addEventListener('click', () => {
  let u = $('#lUrl').value.trim(); closePops(); if (!u) return;
  if (!/^[a-z]+:/i.test(u)) u = (u.includes('@') ? 'mailto:' : 'https://') + u;
  restoreSel();
  if (getSelection().isCollapsed) document.execCommand('insertHTML', false, `<a href="${u.replace(/"/g, '&quot;')}">${u.replace(/</g, '&lt;')}</a>`);
  else document.execCommand('createLink', false, u);
  changed();
});
$('#lUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#lOk').click(); } });
$('#insBrk').addEventListener('click', () => { restoreSel(); document.execCommand('insertHTML', false, '<hr class="pagebreak"><p><br></p>'); changed(); });
$('#insHr').addEventListener('click', () => { restoreSel(); document.execCommand('insertHTML', false, '<hr><p><br></p>'); changed(); });
$('#insDate').addEventListener('click', () => { restoreSel(); document.execCommand('insertText', false, new Date().toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })); changed(); });
doc.addEventListener('click', (e) => {
  if (selImg) selImg.classList.remove('sel-img');
  selImg = e.target.tagName === 'IMG' ? e.target : null;
  if (selImg) { selImg.classList.add('sel-img'); ctxUpdate(); showTab('picture'); } else ctxUpdate();
  if (e.target.closest('a') && e.ctrlKey) { L.openExternal(e.target.closest('a').href); }
});
// table tools
$$('[data-tbl]').forEach((b) => b.addEventListener('click', () => {
  restoreSel();
  const n = getSelection().anchorNode; const td = n && (n.nodeType === 1 ? n : n.parentElement).closest('td,th');
  if (!td) return;
  const tr = td.parentElement, table = td.closest('table'), idx = td.cellIndex, a = b.dataset.tbl;
  const cell = () => { const c = document.createElement('td'); c.innerHTML = '<br>'; return c; };
  const newRow = () => { const nr = document.createElement('tr'); [...tr.cells].forEach(() => nr.appendChild(cell())); return nr; };
  if (a === 'rowAbove') tr.before(newRow());
  if (a === 'rowBelow') tr.after(newRow());
  if (a === 'colLeft') [...table.rows].forEach((r) => { r.cells[idx] ? r.cells[idx].before(cell()) : r.appendChild(cell()); });
  if (a === 'colRight') [...table.rows].forEach((r) => { r.cells[idx] ? r.cells[idx].after(cell()) : r.appendChild(cell()); });
  if (a === 'delRow') { if (table.rows.length > 1) tr.remove(); else table.remove(); }
  if (a === 'delCol') { if (tr.cells.length > 1) [...table.rows].forEach((r) => r.cells[idx] && r.cells[idx].remove()); else table.remove(); }
  if (a === 'delTbl') table.remove();
  if (a === 'header') {
    const first = [...table.rows[0].cells]; const on = first.every((c) => c.dataset.h);
    first.forEach((c) => { if (on) { delete c.dataset.h; c.style.fontWeight = ''; c.style.backgroundColor = ''; } else { c.dataset.h = 1; c.style.fontWeight = '700'; c.style.backgroundColor = '#e3f1ec'; } });
  }
  changed(); ctxUpdate();
}));
$('#cellFill').addEventListener('input', (e) => {
  restoreSel(); const n = getSelection().anchorNode; const td = n && (n.nodeType === 1 ? n : n.parentElement).closest('td,th');
  if (td) { td.style.backgroundColor = e.target.value; changed(); }
});
// picture tools
$$('[data-img]').forEach((b) => b.addEventListener('click', () => {
  if (!selImg) return;
  const v = b.dataset.img;
  if (v === 'del') { selImg.remove(); selImg = null; ctxUpdate(); }
  else if (v === 'replace') { imgMode = 'replace'; $('#imgIn').click(); return; }
  else { selImg.style.width = v + '%'; selImg.style.maxWidth = '100%'; selImg.style.height = 'auto'; }
  changed();
}));
$$('[data-ialign]').forEach((b) => b.addEventListener('click', () => { if (!selImg) return; const p = blockOf(selImg); if (p) { p.style.textAlign = b.dataset.ialign; changed(); } }));

/* =============== find & replace =============== */
function openFind() { if (!st.open) return; closePops(); const fp = $('#findp'); fp.hidden = false; const s = getSelection(); if (s && !s.isCollapsed && doc.contains(s.anchorNode)) $('#fIn').value = s.toString(); $('#fIn').focus(); $('#fIn').select(); }
$('#btnFind').addEventListener('click', (e) => { e.stopPropagation(); openFind(); });
$('#fClose').addEventListener('click', () => { $('#findp').hidden = true; });
$('#fNext').addEventListener('click', () => {
  const q = $('#fIn').value; if (!q) return;
  doc.focus();
  let found = window.find(q, $('#fCase').checked, false, true, false, false, false);
  if (found && !doc.contains(getSelection().anchorNode)) found = false;
  $('#fMsg').textContent = found ? '' : 'No matches found.';
});
$('#fRep').addEventListener('click', () => {
  const q = $('#fIn').value; if (!q) return;
  const s = getSelection(); const cs = $('#fCase').checked;
  const hit = s.rangeCount && doc.contains(s.anchorNode) && (cs ? s.toString() === q : s.toString().toLowerCase() === q.toLowerCase());
  if (hit) { document.execCommand('insertText', false, $('#rIn').value); changed(); }
  $('#fNext').click();
});
$('#fAll').addEventListener('click', () => {
  const q = $('#fIn').value; if (!q) return;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $('#fCase').checked ? 'g' : 'gi');
  const rep = $('#rIn').value; let n = 0;
  const w = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT); const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach((t) => { const v = t.nodeValue; const nv = v.replace(re, () => { n++; return rep; }); if (nv !== v) t.nodeValue = nv; });
  $('#fMsg').textContent = n ? `Replaced ${n} match${n > 1 ? 'es' : ''}.` : 'No matches found.';
  if (n) changed();
});
$('#fIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#fNext').click(); } });

/* =============== OCR review =============== */
function ocrCount() {
  const n = $$('.ocr-low', doc).length;
  $('#ocrChip').hidden = !n;
  $('#ocrChip').textContent = `${n} word${n > 1 ? 's' : ''} to check`;
  $('#ocrChip').title = 'Text recognition was unsure about these. Click to go to the next one.';
}
$('#ocrChip').addEventListener('click', () => {
  const all = $$('.ocr-low', doc); if (!all.length) return;
  const s = getSelection(); let next = all[0];
  if (s.rangeCount && doc.contains(s.anchorNode)) {
    const r = s.getRangeAt(0);
    next = all.find((el) => r.compareBoundaryPoints(Range.END_TO_START, (() => { const x = document.createRange(); x.selectNodeContents(el); return x; })()) < 0 && !el.contains(s.anchorNode)) || all[0];
  }
  next.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const r = document.createRange(); r.selectNodeContents(next); s.removeAllRanges(); s.addRange(r); doc.focus({ preventScroll: true });
});
doc.addEventListener('input', () => {
  const s = getSelection(); const n = s.anchorNode; const el = n && (n.nodeType === 1 ? n : n.parentElement);
  const low = el && el.closest('.ocr-low'); if (low) { low.classList.remove('ocr-low'); ocrCount(); }
});

/* =============== change tracking + drafts =============== */
let draftT = 0, outT = 0;
function counts() {
  const t = doc.innerText; const w = (t.match(/\S+/g) || []).length;
  $('#stWords').textContent = `${w.toLocaleString()} word${w === 1 ? '' : 's'} · ${t.replace(/\s/g, '').length.toLocaleString()} characters`;
}
function markSaved(isSaved) {
  st.dirty = !isSaved;
  $('#saveChip').className = 'chip' + (isSaved ? '' : ' dirty');
  $('#saveTxt').textContent = isSaved ? (st.savePath ? 'Saved' : 'Not saved yet') : 'Edited';
  L.setDirty(!isSaved, safeName());
}
function changed() {
  counts();
  if (!st.dirty) markSaved(false);
  clearTimeout(outT); outT = setTimeout(() => { buildOutline(); ocrCount(); }, 400);
  clearTimeout(draftT);
  draftT = setTimeout(() => L.draft.save({ html: doc.innerHTML, name: safeName(), savePath: st.savePath, srcPath: st.src && st.src.path, srcKind: st.src && st.src.kind, thumb: st.thumb, setup: st.setup, t: Date.now() }), 1500);
}
doc.addEventListener('input', changed);
$('#docName').addEventListener('input', () => { changed(); L.setTitle(`${safeName()} – Leaf`); });
$('#docName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doc.focus(); } });
async function checkDraft() {
  const d = await L.draft.load();
  $('#recover').hidden = !d;
  if (!d) return;
  $('#recTitle').textContent = `Unsaved changes to “${d.name}”`;
  $('#recSub').textContent = 'Leaf closed before they were saved. Last edited ' + when(d.t).toLowerCase() + '.';
  $('#recOpen').onclick = async () => {
    loadDocument({ html: d.html, name: d.name, savePath: d.savePath, src: d.srcKind ? { path: d.srcPath, kind: d.srcKind } : null, thumb: d.thumb, setup: d.setup });
    markSaved(false);
    if (d.srcKind === 'pdf' && d.srcPath) { const f = await L.readFile(d.srcPath); if (!f.error) { st.src.bytes = f.data; await loadPdfView(f.data); setRailMode('pages'); $('#btnCompare').hidden = false; $('#vCompare').disabled = $('#btnCompare').disabled = false; } }
    L.draft.save({ ...d });
  };
  $('#recDiscard').onclick = async () => { await L.draft.clear(); $('#recover').hidden = true; };
}

/* =============== save / export =============== */
async function save(saveAs = false) {
  if (!st.open) return false;
  try {
    busy('Saving', 'Building the Word document…', 55);
    const prev = doc.style.zoom; doc.style.zoom = 1;
    if (selImg) selImg.classList.remove('sel-img');
    let blob;
    try { blob = await buildDocx(doc, { ...st.setup, title: safeName() }); } finally { doc.style.zoom = prev; if (selImg) selImg.classList.add('sel-img'); }
    const data = new Uint8Array(await blob.arrayBuffer());
    busy(null);
    const r = await L.save({ path: saveAs ? null : st.savePath, defaultName: safeName(), ext: 'docx', data, saveAs });
    if (!r) return false;
    if (r.error) { toast(r.error === 'busy' ? 'Couldn’t save because the file is open in another program, like Word. Close it there and save again.' : 'Couldn’t save: ' + r.error, [], 8000); return false; }
    st.savePath = r.path; st.name = baseName(r.name); $('#docName').value = st.name;
    markSaved(true); L.setTitle(`${st.name} – Leaf`); L.draft.clear();
    await L.recent.add({ path: r.path, name: r.name, thumb: st.thumb });
    toast(`Saved “${r.name}”`, [{ label: 'Open in Word', run: () => L.openPath(r.path) }, { label: 'Show in folder', run: () => L.showInFolder(r.path) }]);
    return true;
  } catch (e) { console.error(e); toast('Couldn’t save: ' + (e.message || e), [], 8000); return false; }
  finally { busy(null); }
}
async function exportAs(kind) {
  if (!st.open) return;
  if (selImg) { selImg.classList.remove('sel-img'); selImg = null; ctxUpdate(); }
  let r;
  if (kind === 'pdf') {
    const prev = doc.style.zoom; doc.style.zoom = 1;
    try { r = await L.exportPdf({ defaultName: safeName(), paper: st.setup.paper, landscape: st.setup.orient === 'landscape' }); } finally { doc.style.zoom = prev; }
  } else {
    let text;
    if (kind === 'html') {
      const c = doc.cloneNode(true); c.removeAttribute('contenteditable'); c.removeAttribute('style'); $$('.ocr-low', c).forEach((x) => x.classList.remove('ocr-low'));
      text = `<!doctype html><html><head><meta charset="utf-8"><title>${safeName().replace(/</g, '&lt;')}</title><style>body{font:11pt/1.4 Calibri,Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;white-space:pre-wrap;color:#151a18}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 6px}hr.pagebreak{border:0;border-top:1px dashed #bbb}</style></head><body>${c.innerHTML}</body></html>`;
    } else text = doc.innerText;
    r = await L.save({ path: null, defaultName: safeName(), ext: kind, data: new TextEncoder().encode(text), saveAs: true });
  }
  if (!r) return;
  if (r.error) { toast(r.error === 'busy' ? 'Couldn’t export because that file is open in another program. Close it and try again.' : 'Couldn’t export: ' + r.error, [], 8000); return; }
  toast(`Exported “${r.name}”`, [{ label: 'Open', run: () => L.openPath(r.path) }, { label: 'Show in folder', run: () => L.showInFolder(r.path) }]);
}
function print() { if (!st.open) return; if (selImg) { selImg.classList.remove('sel-img'); selImg = null; } const prev = doc.style.zoom; doc.style.zoom = 1; window.print(); doc.style.zoom = prev; }
function runAct(a) {
  closePops();
  if (a === 'save') save(); else if (a === 'saveas') save(true); else if (a === 'print') print(); else exportAs(a);
}
$('#btnSave').addEventListener('click', () => save());
$('#btnSaveMenu').addEventListener('click', (e) => { e.stopPropagation(); const m = $('#saveMenu'); const was = m.hidden; closePops(); m.hidden = !was; });
$$('#saveMenu [data-act]').forEach((b) => b.addEventListener('click', () => runAct(b.dataset.act)));
L.onSaveThenClose(async () => { if (await save()) L.closeNow(); });

/* =============== keyboard =============== */
window.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.key === 'Escape') { if (!$('#modal').hidden) return; closePops(); if (!$('#start').hidden && st.open) hideStart(); return; }
  if (!mod) return;
  const inDoc = doc.contains(document.activeElement) || document.activeElement === doc;
  const map = {
    o: () => openDialog(), n: () => newBlank(), s: () => save(e.shiftKey), p: () => print(),
    f: () => openFind(), h: () => openFind(), '=': () => setZoom(st.zoom + 10), '+': () => setZoom(st.zoom + 10), '-': () => setZoom(st.zoom - 10), 0: () => setZoom(100),
  };
  if (k === 'e' && e.shiftKey) { e.preventDefault(); exportAs('pdf'); return; }
  if (inDoc && !e.shiftKey && ['l', 'e', 'r', 'j'].includes(k)) { e.preventDefault(); exec({ l: 'justifyLeft', e: 'justifyCenter', r: 'justifyRight', j: 'justifyFull' }[k]); return; }
  if (map[k] && (st.open || ['o', 'n'].includes(k))) { e.preventDefault(); map[k](); }
});
document.addEventListener('click', (e) => { if (!e.target.closest('.pop,.dropdown,.menu')) closePops(); });

/* =============== paste / drop =============== */
doc.addEventListener('paste', (e) => {
  const cd = e.clipboardData; if (!cd) return;
  const img = [...cd.files].find((f) => f.type.startsWith('image/'));
  if (img && !cd.getData('text/html')) { e.preventDefault(); imgMode = 'insert'; insertImageFile(img); return; }
  const html = cd.getData('text/html'); if (!html) return;
  e.preventDefault();
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  $$('script,style,meta,link,title,o\\:p', tmp).forEach((n) => n.remove());
  $$('*', tmp).forEach((n) => { n.removeAttribute('class'); n.removeAttribute('id'); if (n.style) ['background', 'background-color', 'color', 'white-space'].forEach((p) => n.style.removeProperty(p)); });
  document.execCommand('insertHTML', false, tmp.innerHTML.replace(/\n/g, ' '));
  changed();
});
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth++; $('#dragcover').hidden = false; $('#dropzone').classList.add('drag'); } });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#dragcover').hidden = true; $('#dropzone').classList.remove('drag'); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', async (e) => {
  e.preventDefault(); dragDepth = 0; $('#dragcover').hidden = true; $('#dropzone').classList.remove('drag');
  const f = e.dataTransfer && e.dataTransfer.files[0]; if (!f) return;
  if (f.type.startsWith('image/') && st.open && $('#start').hidden) { imgMode = 'insert'; insertImageFile(f); return; }
  const p = L.pathForFile(f);
  if (p) openPath(p);
  else { if (!(await confirmDiscard())) return; openFile({ path: null, name: f.name, data: new Uint8Array(await f.arrayBuffer()) }); }
});
$('#dropzone').addEventListener('click', () => openDialog());

/* =============== init =============== */
L.onOpenPath((p) => openPath(p));
(async () => {
  try { settings = { ...settings, ...(await L.settings.get()) }; } catch (e) { /* defaults */ }
  const info = await L.info();
  document.body.classList.toggle('mac', info.platform === 'darwin');
  $('#aboutTxt').textContent = `Leaf ${info.version}`;
  applyTheme(); greet(); setRail(settings.rail !== false);
  // settings controls
  $('#oOcr').checked = settings.ocr; $('#oImgs').checked = settings.images; $('#oBreaks').checked = settings.breaks; $('#oSnap').checked = settings.snapAll;
  $$('[data-lang]').forEach((c) => { c.checked = settings.langs.includes(c.dataset.lang); });
  const persist = () => {
    settings.ocr = $('#oOcr').checked; settings.images = $('#oImgs').checked; settings.breaks = $('#oBreaks').checked; settings.snapAll = $('#oSnap').checked;
    settings.langs = $$('[data-lang]').filter((c) => c.checked).map((c) => c.dataset.lang);
    if (!settings.langs.length) { settings.langs = ['eng']; $('[data-lang="eng"]').checked = true; }
    L.settings.set({ ocr: settings.ocr, images: settings.images, breaks: settings.breaks, snapAll: settings.snapAll, langs: settings.langs });
  };
  $$('#viewSettings input[type=checkbox]').forEach((c) => c.addEventListener('change', persist));
  setZoom(100); applySetup(st.setup);
  await renderRecent(); await checkDraft();
})();
