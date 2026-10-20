import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.min.mjs';
import workerSource from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

// Classic (non-module) worker built from the bundled source, so it works from file:// with no network.
const workerUrl = URL.createObjectURL(new Blob([workerSource.replace(/export\s*\{[^}]*\};?\s*$/, '').replace(/import\.meta\.url/g, '""')], { type: 'text/javascript' }));
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
try { pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(workerUrl); } catch (e) { /* main-thread fallback */ }

const OPS = pdfjsLib.OPS;
const LOWCONF = 80;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- open a PDF (also used by the side-by-side viewer) ---------- */
export async function openPdfDoc(bytes, askPassword) {
  const task = pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false });
  task.onPassword = async (update, reason) => {
    const pw = await askPassword(reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD);
    if (pw == null) task.destroy(); else update(pw);
  };
  return task.promise;
}

export async function renderPageToCanvas(pdf, n, cssWidth, canvas, dpr = window.devicePixelRatio || 1) {
  const page = await pdf.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const scale = (cssWidth / base.width) * dpr;
  const vp = page.getViewport({ scale });
  canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
  canvas.style.width = cssWidth + 'px'; canvas.style.aspectRatio = `${base.width} / ${base.height}`; canvas.style.height = 'auto';
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  return canvas;
}

/* ---------- fonts ---------- */
function mapFamily(raw, generic) {
  const s = (raw || '').toLowerCase();
  const table = [
    [/arial|helvetica|liberation\s?sans|arimo|nimbus\s?sans/, 'Arial'],
    [/times|liberation\s?serif|tinos|nimbus\s?roman|^cm[a-z]{1,3}\d*$|latinmodern|lmroman/, 'Times New Roman'],
    [/courier|mono|consolas|menlo|lucida\s?console/, 'Courier New'],
    [/calibri|carlito/, 'Calibri'], [/cambria|caladea/, 'Cambria'], [/georgia/, 'Georgia'],
    [/verdana|dejavusans/, 'Verdana'], [/tahoma/, 'Tahoma'], [/trebuchet/, 'Trebuchet MS'],
    [/garamond/, 'Garamond'], [/palatino|bookantiqua|book\s?antiqua/, 'Palatino Linotype'],
    [/segoe/, 'Segoe UI'], [/aptos/, 'Aptos'],
  ];
  for (const [re, name] of table) if (re.test(s.replace(/[-_,\s]/g, '')) || re.test(s)) return name;
  if (/mono/.test(generic || '')) return 'Courier New';
  if (/serif/.test(generic || '') && !/sans/.test(generic || '')) return 'Times New Roman';
  return 'Arial';
}

/* ---------- images ---------- */
const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
async function getImageObj(page, id) {
  const store = id.startsWith('g_') ? page.commonObjs : page.objs;
  return withTimeout(new Promise((res) => { try { store.get(id, res); } catch (e) { res(null); } }), 3000);
}
function imageToDataUrl(o) {
  const c = imageToCanvas(o);
  if (!c) return null;
  return (c._alpha || c.width * c.height < 90000) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88);
}
function imageToCanvas(o) {
  const w = o.width, h = o.height;
  if (!w || !h || w * h > 36e6) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  let alpha = false;
  if (o.bitmap) { g.drawImage(o.bitmap, 0, 0); alpha = true; }
  else if (o.data) {
    const id = g.createImageData(w, h), out = id.data, d = o.data;
    if (o.kind === 3 || d.length === w * h * 4) { out.set(d.subarray ? d.subarray(0, out.length) : d); alpha = true; }
    else if (o.kind === 2 || d.length === w * h * 3) {
      for (let i = 0, j = 0; i < w * h; i++, j += 3) { out[i * 4] = d[j]; out[i * 4 + 1] = d[j + 1]; out[i * 4 + 2] = d[j + 2]; out[i * 4 + 3] = 255; }
    } else if (o.kind === 1) {
      const rb = (w + 7) >> 3;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = (d[y * rb + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0; const k = (y * w + x) * 4;
        out[k] = out[k + 1] = out[k + 2] = v; out[k + 3] = 255;
      }
    } else return null;
    g.putImageData(id, 0, 0);
  } else return null;
  c._alpha = alpha;
  return c;
}
async function renderPage(page, scale) {
  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
  return c;
}

/* ---------- lines ---------- */
// items: {str, x, y, w, size, bold, italic, font, low}
function buildLine(items, y) {
  items.sort((a, b) => a.x - b.x);
  const segs = [];
  let seg = null, prevEnd = null, text = '';
  const push = (target, txt, it) => {
    const last = target[target.length - 1];
    const sz = Math.round(it.size * 2) / 2;
    if (last && last.bold === it.bold && last.italic === it.italic && last.size === sz && last.font === it.font && !!last.low === !!it.low) last.text += txt;
    else target.push({ text: txt, bold: it.bold, italic: it.italic, size: sz, font: it.font, low: !!it.low });
  };
  const runs = [];
  for (const it of items) {
    let lead = '';
    if (prevEnd !== null) {
      const gap = it.x - prevEnd;
      if (gap > it.size * 1.5) {
        seg = null;
        lead = gap > it.size * 2.6 ? '\t' : ' ';
      } else if (gap > it.size * 0.12 && !/\s$/.test(text) && !/^\s/.test(it.str)) lead = ' ';
    }
    if (!seg) { seg = { x0: it.x, x1: it.x + it.w, runs: [] }; segs.push(seg); push(seg.runs, it.str, it); }
    else { push(seg.runs, lead + it.str, it); seg.x1 = it.x + it.w; }
    push(runs, lead + it.str, it);
    text += lead + it.str;
    prevEnd = it.x + it.w;
  }
  const w = {}; let boldChars = 0, total = 0;
  for (const r of runs) { const n = r.text.trim().length; w[r.size] = (w[r.size] || 0) + n; total += n; if (r.bold) boldChars += n; }
  const size = +Object.keys(w).sort((a, b) => w[b] - w[a])[0] || 11;
  segs.forEach((s) => { s.text = s.runs.map((r) => r.text).join(''); });
  return { y, x0: items[0].x, xEnd: prevEnd, runs, segs, text, size, bold: total > 0 && boldChars / total > 0.85 };
}

/* ---------- page reading ---------- */
async function readPage(page, opts) {
  const vp = page.getViewport({ scale: 1 });
  const [vx0, vy0] = vp.viewBox;
  let opList = null;
  try { opList = await page.getOperatorList(); } catch (e) { /* ignore */ }
  const tc = await page.getTextContent();

  const fontCache = {};
  const fontInfo = (fn) => {
    if (fontCache[fn]) return fontCache[fn];
    let name = '', fb = false, fi = false;
    try { const fo = page.commonObjs.get(fn); name = fo.name || ''; fb = !!fo.bold; fi = !!fo.italic; } catch (e) { /* not loaded */ }
    const raw = name.replace(/^[A-Z]{6}\+/, '');
    const generic = (tc.styles[fn] && tc.styles[fn].fontFamily) || '';
    return (fontCache[fn] = { bold: fb || /bold|black|heavy|semibold|demibold/i.test(raw), italic: fi || /italic|oblique/i.test(raw), family: mapFamily(raw, generic) });
  };

  const items = [];
  let chars = 0;
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const t = it.transform;
    const size = Math.hypot(t[0], t[1]) || it.height || 10;
    if (Math.abs(t[1]) > Math.abs(t[0]) * 0.3) continue; // rotated text (watermarks, margin notes)
    const f = fontInfo(it.fontName);
    items.push({ str: it.str, x: t[4] - vx0, y: t[5] - vy0, w: it.width, size, bold: f.bold, italic: f.italic, font: f.family });
    chars += it.str.length;
  }
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const raw = [];
  let cur = null;
  for (const it of items) {
    if (cur && Math.abs(cur.y - it.y) <= Math.max(2, 0.45 * Math.min(cur.size, it.size))) { cur.items.push(it); if (it.size > cur.size) cur.size = it.size; }
    else { cur = { y: it.y, size: it.size, items: [it] }; raw.push(cur); }
  }
  let lines = raw.map((ln) => buildLine(ln.items, ln.y));

  const images = [];
  if (opts.images && opList) {
    const stack = []; let ctm = [1, 0, 0, 1, 0, 0];
    const pageArea = vp.width * vp.height;
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i], args = opList.argsArray[i];
      if (fn === OPS.save) stack.push(ctm.slice());
      else if (fn === OPS.restore) { if (stack.length) ctm = stack.pop(); }
      else if (fn === OPS.transform) ctm = mul(args, ctm);
      else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject) {
        const w = Math.hypot(ctm[0], ctm[1]), h = Math.hypot(ctm[2], ctm[3]);
        if (w < 18 || h < 12 || (w * h) > pageArea * 0.85) continue;
        images.push({ id: args[0], w, h, x: ctm[4] - vx0, top: ctm[5] + ctm[3] - vy0 });
      }
    }
    for (const im of images) { try { const o = await getImageObj(page, im.id); im.src = o ? imageToDataUrl(o) : null; } catch (e) { im.src = null; } }
  }

  const scanned = chars < 30;
  let ocr = null, snap = null;
  if (scanned && opts.ocr && opts.ocrFn) {
    try {
      if (opts.onOcr) opts.onOcr();
      // Prefer the scan's own pixels (no resampling); otherwise render the page.
      let scale = 3, c = null, sx = 0, sy = 0;
      if (opList) {
        const stack = []; let ctm = [1, 0, 0, 1, 0, 0];
        for (let i = 0; i < opList.fnArray.length && !c; i++) {
          const fn = opList.fnArray[i], args = opList.argsArray[i];
          if (fn === OPS.save) stack.push(ctm.slice());
          else if (fn === OPS.restore) { if (stack.length) ctm = stack.pop(); }
          else if (fn === OPS.transform) ctm = mul(args, ctm);
          else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject) {
            const w = Math.hypot(ctm[0], ctm[1]), h = Math.hypot(ctm[2], ctm[3]);
            if (w * h < vp.width * vp.height * 0.6 || Math.abs(ctm[1]) > 0.01 || ctm[0] < 0 || ctm[3] < 0) continue;
            const o = await getImageObj(page, args[0]);
            const cv = o && imageToCanvas(o);
            if (cv && cv.width / w >= 1.4) { c = cv; scale = cv.width / w; sx = ctm[4] - vx0; sy = vp.height - (ctm[5] - vy0 + h); }
          }
        }
      }
      if (!c) { scale = 3; c = await renderPage(page, scale); }
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const res = await opts.ocrFn(new Uint8Array(await blob.arrayBuffer()), opts.ocrLangs);
      const H = vp.height;
      const ol = [];
      let words = 0, low = 0;
      for (const l of res.lines || []) {
        const lh = (l.rowHeight || (l.y1 - l.y0) * 0.8) / scale;
        const size = Math.max(6, Math.round(lh * 1.1));
        const its = l.words.filter((w) => w.text.trim()).map((w) => {
          words++; if (w.conf < LOWCONF) low++;
          return { str: w.text, x: sx + w.x0 / scale, y: H - sy - l.y1 / scale, w: (w.x1 - w.x0) / scale, size, bold: false, italic: false, font: 'Arial', low: w.conf < LOWCONF };
        });
        if (its.length) ol.push(buildLine(its, H - sy - l.y1 / scale));
      }
      ol.sort((a, b) => b.y - a.y);
      if (ol.length) { lines = ol; ocr = { words, low }; }
    } catch (e) { console.warn('OCR failed', e); }
  }
  if (opts.snapAll || (scanned && !ocr && opts.scan)) {
    try { snap = (await renderPage(page, scanned ? 1.6 : 1.2)).toDataURL('image/jpeg', 0.82); } catch (e) { snap = null; }
  }
  return { width: vp.width, height: vp.height, lines, images: images.filter((i) => i.src), snap, scanned, chars, ocr };
}

/* ---------- structure ---------- */
const BULLET_RE = /^\s*([•●▪◦·■□○◆◇▶►‣⁃*]|[-–—](?=\s))\s*/;
const NUM_RE = /^\s*(\d{1,2}|[a-z])[.)]\s+/;

function statsFor(lines) {
  const sizes = {}, xs = {}, ends = [];
  for (const l of lines) {
    const n = l.text.trim().length;
    for (const r of l.runs) sizes[r.size] = (sizes[r.size] || 0) + r.text.trim().length;
    if (n > 25) { const k = Math.round(l.x0 / 3) * 3; xs[k] = (xs[k] || 0) + n; ends.push(l.xEnd); }
  }
  const mode = (o, fb) => { const k = Object.keys(o); return k.length ? +k.sort((a, b) => o[b] - o[a])[0] : fb; };
  ends.sort((a, b) => a - b);
  const minX = mode(xs, lines.length ? Math.min(...lines.map((l) => l.x0)) : 0);
  const rightEdge = ends.length ? ends[Math.floor(ends.length * 0.9)] : (lines.length ? Math.max(...lines.map((l) => l.xEnd)) : 500);
  return { body: mode(sizes, 11), minX, rightEdge, contentW: Math.max(100, rightEdge - minX) };
}

function headingLevel(l, st) {
  const r = l.size / st.body;
  if (l.text.trim().length > 140) return 0;
  if (r >= 1.7) return 1;
  if (r >= 1.35) return 2;
  if (r >= 1.15) return 3;
  if (l.bold && l.text.trim().length < 70 && !/[.:;,]$/.test(l.text.trim()) && r >= 0.98) return 4;
  return 0;
}
function alignOf(l, st) {
  const w = l.xEnd - l.x0, centre = (l.x0 + l.xEnd) / 2, pc = st.minX + st.contentW / 2;
  if (Math.abs(centre - pc) < st.contentW * 0.035 && l.x0 - st.minX > st.contentW * 0.06 && w < st.contentW * 0.85) return 'center';
  if (l.xEnd > st.minX + st.contentW - st.contentW * 0.03 && l.x0 - st.minX > st.contentW * 0.45) return 'right';
  return 'left';
}
function stripLead(runs, re) {
  const first = runs[0]; if (!first) return;
  first.text = first.text.replace(re, '');
  if (!first.text) runs.shift();
}
function runHtml(r) {
  let st = `font-family:'${r.font}';font-size:${r.size}pt`;
  if (r.bold) st += ';font-weight:700';
  if (r.italic) st += ';font-style:italic';
  return `<span${r.low ? ' class="ocr-low"' : ''} style="${st}">${esc(r.text)}</span>`;
}

// Flowing text: lines → paragraphs, headings, lists
function emitFlow(blocks, st, out) {
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const inner = cur.runs.map(runHtml).join('');
    if (cur.kind === 'h') out.push(`<h${cur.level}${cur.align !== 'left' ? ` style="text-align:${cur.align}"` : ''}>${inner}</h${cur.level}>`);
    else if (cur.kind === 'li') out.push(`<${cur.list}><li>${inner}</li></${cur.list}>`);
    else {
      let style = '';
      if (cur.align !== 'left') style += `text-align:${cur.align};`;
      if (cur.indent > 6) style += `margin-left:${Math.min(cur.indent, st.contentW / 2).toFixed(0)}pt;`;
      out.push(`<p${style ? ` style="${style}"` : ''}>${inner}</p>`);
    }
    cur = null;
  };
  for (const b of blocks) {
    if (b.kind === 'img') {
      flush();
      const wPx = Math.min(b.im.w * 96 / 72, 602);
      out.push(`<p><img src="${b.im.src}" style="width:${Math.round(wPx)}px"></p>`);
      continue;
    }
    const l = b.l;
    if (!l.text.trim()) continue;
    const bullet = BULLET_RE.test(l.text) && l.text.trim().length > 1;
    const numbered = !bullet && NUM_RE.test(l.text) && l.text.trim().length > 4 && l.size <= st.body * 1.1;
    const level = bullet || numbered ? 0 : headingLevel(l, st);
    const align = alignOf(l, st);
    const indent = Math.max(0, l.x0 - st.minX);
    const kind = level ? 'h' : (bullet || numbered) ? 'li' : 'p';

    let merge = false;
    if (cur && !bullet && !numbered) {
      const gap = cur.lastY - l.y;
      const okGap = gap > 0 && gap <= l.size * (kind === 'h' ? 1.6 : 1.65);
      if (okGap && cur.kind === kind && kind === 'h') merge = cur.level === level && cur.align === align;
      else if (okGap && kind === 'p' && (cur.kind === 'p' || cur.kind === 'li')) {
        const firstWord = (l.text.trim().split(/\s+/)[0] || '');
        const fitRoom = st.rightEdge - cur.lastEnd;
        const prevFull = cur.lastEnd >= st.rightEdge - st.contentW * 0.12 || fitRoom < (firstWord.length + 1) * l.size * 0.52;
        const sameAlign = cur.align === 'left' && align === 'left';
        const hanging = cur.kind === 'li' && l.x0 > cur.x0 + 2; // wrapped list item text
        const firstLineIndent = cur.kind === 'p' && cur.lines === 1 ? false : indent - cur.indent > 14;
        merge = (prevFull || hanging && prevFull) && sameAlign && (cur.kind === 'li' ? hanging : !firstLineIndent) && Math.abs(Math.round(l.size) - Math.round(cur.size)) <= 1;
      }
    }
    if (merge) {
      const last = cur.runs[cur.runs.length - 1];
      const prevTxt = last ? last.text : '';
      if (/[A-Za-zÀ-ÿ]-$/.test(prevTxt) && /^[a-zà-ÿ]/.test(l.runs[0].text)) last.text = prevTxt.slice(0, -1);
      else if (!/\s$/.test(prevTxt)) cur.runs.push({ ...l.runs[0], text: ' ', bold: last ? last.bold : false, low: false });
      cur.runs.push(...l.runs.map((r) => ({ ...r })));
      cur.lastY = l.y; cur.lastEnd = l.xEnd; cur.lines++;
    } else {
      flush();
      const runs = l.runs.map((r) => ({ ...r }));
      if (bullet) stripLead(runs, BULLET_RE);
      if (numbered) stripLead(runs, NUM_RE);
      if (kind === 'h') runs.forEach((r) => { r.bold = true; });
      cur = { kind, level, list: numbered ? 'ol' : 'ul', align: kind === 'li' ? 'left' : align, indent, x0: l.x0, runs, lastY: l.y, lastEnd: l.xEnd, size: l.size, lines: 1 };
    }
  }
  flush();
}

// Rows of aligned cells → table; two long text columns → read left column, then right
function emitGrid(lines, st, out) {
  const maxSegs = Math.max(...lines.map((l) => l.segs.length));
  const ref = lines.filter((l) => l.segs.length === maxSegs);
  const avgCell = lines.reduce((a, l) => a + l.segs.reduce((b, s) => b + s.text.trim().length, 0) / l.segs.length, 0) / lines.length;
  if (maxSegs === 2 && avgCell > 28 && lines.length >= 4) {
    for (const col of [0, 1]) {
      const vl = lines.map((l) => {
        const s = l.segs.length === 2 ? l.segs[col] : (col === 0 && l.segs[0].x0 < st.minX + st.contentW / 2 ? l.segs[0] : col === 1 && l.segs[0].x0 >= st.minX + st.contentW / 2 ? l.segs[0] : null);
        if (!s) return null;
        return { y: l.y, x0: s.x0, xEnd: s.x1, runs: s.runs.map((r, i) => (i === 0 ? { ...r, text: r.text.replace(/^\s+/, '') } : r)), segs: [s], text: s.text.trim(), size: l.size, bold: s.runs.every((r) => r.bold) };
      }).filter(Boolean);
      if (vl.length) emitFlow(vl.map((l) => ({ kind: 'line', l })), statsFor(vl), out);
    }
    return;
  }
  // column boundaries from the widest rows
  const bounds = [];
  for (let k = 0; k < maxSegs - 1; k++) {
    const mids = ref.map((l) => (l.segs[k].x1 + l.segs[k + 1].x0) / 2).sort((a, b) => a - b);
    bounds.push(mids[Math.floor(mids.length / 2)]);
  }
  let html = '<table><tbody>';
  for (const l of lines) {
    const cells = Array.from({ length: maxSegs }, () => []);
    for (const s of l.segs) {
      const c = (s.x0 + s.x1) / 2;
      let idx = bounds.findIndex((b) => c < b); if (idx < 0) idx = maxSegs - 1;
      cells[idx].push(...s.runs.map((r, i) => (i === 0 && cells[idx].length === 0 ? { ...r, text: r.text.replace(/^[\s\t]+/, '') } : r)));
    }
    html += '<tr>' + cells.map((rs) => `<td>${rs.length ? rs.map(runHtml).join('') : '<br>'}</td>`).join('') + '</tr>';
  }
  out.push(html + '</tbody></table>');
}

function compatible(run, l) {
  const cols = [];
  run.forEach((r) => r.segs.forEach((s) => cols.push(s)));
  let matched = 0;
  for (const s of l.segs) if (cols.some((c) => Math.abs(c.x0 - s.x0) < 12 || Math.abs(c.x1 - s.x1) < 12)) matched++;
  return matched >= 2 && matched >= l.segs.length - 1;
}

function pageToHtml(page, st, pgNo) {
  const blocks = [
    ...page.lines.map((l) => ({ kind: 'line', y: l.y, l })),
    ...page.images.map((im) => ({ kind: 'img', y: im.top, im })),
  ].sort((a, b) => b.y - a.y);
  const out = [];
  let flow = [];
  const flushFlow = () => { if (flow.length) emitFlow(flow, st, out); flow = []; };
  for (let i = 0; i < blocks.length;) {
    const b = blocks[i];
    if (b.kind === 'line' && b.l.segs.length >= 2) {
      const run = [b.l]; let j = i + 1;
      while (j < blocks.length && blocks[j].kind === 'line') {
        const l = blocks[j].l, prev = run[run.length - 1];
        if (prev.y - l.y > Math.max(l.size, prev.size) * 2.6) break;
        if (l.segs.length < 2) {
          // a column's last lines in two-column text: keep them with their column
          const cols = run.filter((r) => r.segs.length === 2);
          const textCols = cols.length >= 3 && cols.reduce((a, r) => a + r.text.length, 0) / cols.length > 56;
          if (!(textCols && l.segs.length === 1 && cols.some((r) => r.segs.some((sg) => Math.abs(sg.x0 - l.segs[0].x0) < 12)))) break;
        } else if (!compatible(run, l)) break;
        run.push(l); j++;
      }
      if (run.length >= 2) { flushFlow(); emitGrid(run, st, out); i = j; continue; }
    }
    flow.push(b); i++;
  }
  flushFlow();
  let html = out.join('').replace(/<\/ul><ul>/g, '').replace(/<\/ol><ol>/g, '');
  if (pgNo) html = html.replace(/^<(p|h[1-6]|ul|ol|table)\b/, `<$1 data-pg="${pgNo}"`);
  return html;
}

/* ---------- public API ---------- */
export async function importPdf(bytes, opts, onProgress, askPassword) {
  const pdf = await openPdfDoc(bytes, askPassword);
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress && onProgress(i - 1, pdf.numPages, pages.some((p) => p.ocr));
    const page = await pdf.getPage(i);
    pages.push(await readPage(page, opts));
    page.cleanup();
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress && onProgress(pdf.numPages, pdf.numPages);
  const st = statsFor(pages.flatMap((p) => p.lines));
  const parts = [];
  let scannedPages = 0, ocrPages = 0, ocrLow = 0;
  pages.forEach((p, idx) => {
    if (idx > 0 && opts.breaks) parts.push('<hr class="pagebreak">');
    if (p.ocr) { ocrPages++; ocrLow += p.ocr.low; } else if (p.scanned && p.snap) scannedPages++;
    let html = '';
    if (p.snap && (p.scanned || opts.snapAll)) {
      html += `<p data-pg="${idx + 1}"><img src="${p.snap}" style="width:100%"></p>`;
      if (!p.scanned) html += '<hr class="pagebreak">';
    }
    if (p.lines.length || p.images.length) html += pageToHtml(p, p.ocr ? statsFor(p.lines) : st, html ? 0 : idx + 1);
    if (!html) html = `<p data-pg="${idx + 1}"><br></p>`;
    parts.push(html);
  });
  const first = pages[0] || { width: 595, height: 842 };
  const landscape = first.width > first.height;
  const [sw, sh] = landscape ? [first.height, first.width] : [first.width, first.height];
  const letter = Math.abs(sw - 612) < 8 && Math.abs(sh - 792) < 8;
  let thumb = null;
  try { thumb = (await renderPageToCanvas(pdf, 1, 220, document.createElement('canvas'), 1.5)).toDataURL('image/jpeg', 0.8); } catch (e) { /* ignore */ }
  try { await pdf.destroy(); } catch (e) { /* ignore */ }
  return {
    html: parts.join(''), paper: letter ? 'Letter' : 'A4', orient: landscape ? 'landscape' : 'portrait',
    pageCount: pages.length, scannedPages, ocrPages, ocrLow, totalChars: pages.reduce((a, p) => a + p.chars, 0), thumb,
  };
}
