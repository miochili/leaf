import * as D from 'docx';

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR']);
const HEADINGS = { H1: D.HeadingLevel.HEADING_1, H2: D.HeadingLevel.HEADING_2, H3: D.HeadingLevel.HEADING_3, H4: D.HeadingLevel.HEADING_4, H5: D.HeadingLevel.HEADING_5, H6: D.HeadingLevel.HEADING_6 };
const px2tw = (px) => Math.round(px * 15);

function hex(c) {
  const m = /rgba?\(([^)]+)\)/.exec(c || '');
  if (!m) return null;
  const p = m[1].split(',').map((s) => parseFloat(s));
  if (p.length > 3 && p[3] === 0) return null;
  return p.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function b64ToU8(b64) {
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export async function buildDocx(root, setup = {}) {
  const letter = setup.paper === 'Letter';
  const land = setup.orient === 'landscape';
  const m = Math.round((setup.margin || 1) * 1440);
  const base = letter ? { width: 12240, height: 15840 } : { width: 11906, height: 16838 };
  const pageSize = land ? { width: base.height, height: base.width, orientation: D.PageOrientation.LANDSCAPE } : { ...base, orientation: D.PageOrientation.PORTRAIT };
  const contentTw = pageSize.width - 2 * m;
  const styleCache = new Map();
  const ctx = { ol: 0 };

  function textStyle(el) {
    if (styleCache.has(el)) return styleCache.get(el);
    const cs = getComputedStyle(el);
    const o = {
      font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() || 'Calibri',
      size: Math.max(2, Math.round(parseFloat(cs.fontSize) * 1.5)),
      bold: parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === 'bold',
      italics: cs.fontStyle === 'italic' || cs.fontStyle === 'oblique',
      color: hex(cs.color) || '000000',
    };
    let u = false, s = false, bg = null, sup = false, sub = false;
    for (let e = el; e; e = e.parentElement) {
      const c = getComputedStyle(e);
      if (e.tagName === 'SUP') sup = true;
      if (e.tagName === 'SUB') sub = true;
      const line = c.textDecorationLine || c.textDecoration || '';
      if (line.includes('underline')) u = true;
      if (line.includes('line-through')) s = true;
      if (!bg) bg = hex(c.backgroundColor);
      if (e === root || BLOCK_TAGS.has(e.tagName)) break;
    }
    if (u) o.underline = { type: D.UnderlineType.SINGLE };
    if (s) o.strike = true;
    if (sup) { o.superScript = true; o.size = Math.round(o.size / 0.83); }
    else if (sub) { o.subScript = true; o.size = Math.round(o.size / 0.83); }
    if (bg && bg !== 'FFFFFF') o.shading = { type: D.ShadingType.CLEAR, fill: bg, color: 'auto' };
    styleCache.set(el, o);
    return o;
  }

  function imageRun(img) {
    try {
      let type, data;
      const src = img.getAttribute('src') || '';
      const m = /^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/i.exec(src);
      if (m) { type = m[1].toLowerCase().replace('jpeg', 'jpg'); data = b64ToU8(m[2]); }
      else {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        type = 'png'; data = b64ToU8(c.toDataURL('image/png').split(',')[1]);
      }
      const r = img.getBoundingClientRect();
      let w = r.width || img.naturalWidth || 200, h = r.height || img.naturalHeight || 150;
      const max = (contentTw / 15);
      if (w > max) { h = h * (max / w); w = max; }
      return new D.ImageRun({ type, data, transformation: { width: Math.max(8, Math.round(w)), height: Math.max(8, Math.round(h)) } });
    } catch (e) { return null; }
  }

  function inline(node, runs) {
    if (node.nodeType === 3) {
      const text = node.nodeValue.replace(/​/g, '').replace(/ /g, ' ');
      if (!text) return;
      const st = textStyle(node.parentElement);
      const lines = text.split('\n');
      lines.forEach((ln, li) => {
        if (li > 0) runs.push(new D.TextRun({ ...st, break: 1, text: '' }));
        ln.split('\t').forEach((seg, si) => {
          if (si > 0) runs.push(new D.TextRun({ ...st, children: [new D.Tab()] }));
          if (seg) runs.push(new D.TextRun({ ...st, text: seg }));
        });
      });
      return;
    }
    if (node.nodeType !== 1) return;
    const t = node.tagName;
    if (t === 'BR') { if (node.nextSibling) runs.push(new D.TextRun({ break: 1 })); return; }
    if (t === 'IMG') { const r = imageRun(node); if (r) runs.push(r); return; }
    if (t === 'A' && node.getAttribute('href') && /^(https?:|mailto:)/i.test(node.getAttribute('href'))) {
      const kids = []; node.childNodes.forEach((c) => inline(c, kids));
      runs.push(new D.ExternalHyperlink({ link: node.getAttribute('href'), children: kids }));
      return;
    }
    if (BLOCK_TAGS.has(t)) { // block nested in inline context (e.g. list item with <p>)
      node.childNodes.forEach((c) => inline(c, runs));
      runs.push(new D.TextRun({ break: 1 }));
      return;
    }
    node.childNodes.forEach((c) => inline(c, runs));
  }

  function makeParagraph(nodes, el, extra = {}) {
    const runs = [];
    nodes.forEach((n) => inline(n, runs));
    // drop a trailing break added by nested blocks
    const cs = getComputedStyle(el);
    const opts = { children: runs, ...extra };
    const al = cs.textAlign;
    opts.alignment = al === 'center' ? D.AlignmentType.CENTER : (al === 'right' || al === 'end') ? D.AlignmentType.RIGHT : al === 'justify' ? D.AlignmentType.JUSTIFIED : D.AlignmentType.LEFT;
    if (HEADINGS[el.tagName]) opts.heading = HEADINGS[el.tagName];
    if (!extra.numbering) {
      const ml = parseFloat(cs.marginLeft) || 0, ti = parseFloat(cs.textIndent) || 0;
      if (ml > 0 || ti) opts.indent = { left: px2tw(ml), ...(ti > 0 ? { firstLine: px2tw(ti) } : ti < 0 ? { hanging: px2tw(-ti) } : {}) };
    }
    opts.spacing = { before: px2tw(parseFloat(cs.marginTop) || 0), after: px2tw(parseFloat(cs.marginBottom) || 0) };
    const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
    if (lh && fs) opts.spacing.line = Math.round(Math.min(3, Math.max(1, lh / fs)) * 240);
    return new D.Paragraph(opts);
  }

  const hasBlockChild = (el) => [...el.children].some((c) => BLOCK_TAGS.has(c.tagName));

  function convertChildren(parent, out, level) {
    let buf = [];
    const flush = () => {
      if (buf.length && buf.some((n) => n.nodeType === 1 || (n.nodeValue || '').trim() !== '')) out.push(makeParagraph(buf, parent));
      buf = [];
    };
    parent.childNodes.forEach((n) => {
      if (n.nodeType === 1 && BLOCK_TAGS.has(n.tagName)) { flush(); convertBlock(n, out, level); }
      else buf.push(n);
    });
    flush();
  }

  function listItem(li, ordered, inst, level, out) {
    const nodes = [...li.childNodes].filter((n) => !(n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')));
    const numbering = { reference: ordered ? 'num' : 'bul', level: Math.min(level, 5), ...(ordered ? { instance: inst } : {}) };
    out.push(makeParagraph(nodes, li, { numbering }));
    [...li.children].filter((c) => c.tagName === 'UL' || c.tagName === 'OL').forEach((nl) => convertBlock(nl, out, level + 1));
  }

  function convertTable(t) {
    const rows = [...t.rows];
    const cols = Math.max(1, ...rows.map((r) => [...r.cells].reduce((a, c) => a + (c.colSpan || 1), 0)));
    const cw = Math.floor(contentTw / cols);
    const bd = { style: D.BorderStyle.SINGLE, size: 4, color: '999999' };
    return new D.Table({
      width: { size: cw * cols, type: D.WidthType.DXA },
      columnWidths: Array(cols).fill(cw),
      rows: rows.map((r) => new D.TableRow({
        children: [...r.cells].map((c) => {
          const kids = [];
          convertChildren(c, kids, 0);
          if (!kids.length || kids[kids.length - 1] instanceof D.Table) kids.push(new D.Paragraph({}));
          const bg = hex(getComputedStyle(c).backgroundColor);
          return new D.TableCell({
            children: kids,
            width: { size: cw * (c.colSpan || 1), type: D.WidthType.DXA },
            columnSpan: c.colSpan > 1 ? c.colSpan : undefined,
            rowSpan: c.rowSpan > 1 ? c.rowSpan : undefined,
            borders: { top: bd, bottom: bd, left: bd, right: bd },
            ...(bg ? { shading: { type: D.ShadingType.CLEAR, fill: bg, color: 'auto' } } : {}),
          });
        }),
      })),
    });
  }

  function convertBlock(el, out, level) {
    const t = el.tagName;
    if (t === 'HR') {
      if (el.classList.contains('pagebreak')) out.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      else out.push(new D.Paragraph({ border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } } }));
    } else if (t === 'UL' || t === 'OL') {
      const inst = t === 'OL' ? ++ctx.ol : 0;
      [...el.children].forEach((li) => { if (li.tagName === 'LI') listItem(li, t === 'OL', inst, level, out); });
    } else if (t === 'LI') {
      listItem(el, false, 0, level, out);
    } else if (t === 'TABLE') {
      out.push(convertTable(el));
      const nx = el.nextElementSibling;
      if (!nx || nx.tagName === 'TABLE') out.push(new D.Paragraph({}));
    } else if (hasBlockChild(el)) {
      convertChildren(el, out, level);
    } else {
      out.push(makeParagraph([...el.childNodes], el));
    }
  }

  const out = [];
  convertChildren(root, out, 0);
  if (!out.length) out.push(new D.Paragraph({}));

  const levels = (fmts, text) => [0, 1, 2, 3, 4, 5].map((i) => ({
    level: i, format: fmts[i % fmts.length], text: text(i), alignment: D.AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } },
  }));
  const doc = new D.Document({
    creator: 'Leaf', title: setup.title || undefined,
    numbering: {
      config: [
        { reference: 'bul', levels: levels([D.LevelFormat.BULLET], (i) => ['•', '◦', '▪'][i % 3]) },
        { reference: 'num', levels: levels([D.LevelFormat.DECIMAL, D.LevelFormat.LOWER_LETTER, D.LevelFormat.LOWER_ROMAN], (i) => `%${i + 1}.`) },
      ],
    },
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: { page: { size: land ? { width: base.width, height: base.height, orientation: D.PageOrientation.LANDSCAPE } : pageSize, margin: { top: m, right: m, bottom: m, left: m } } },
      children: out,
    }],
  });
  return D.Packer.toBlob(doc);
}
