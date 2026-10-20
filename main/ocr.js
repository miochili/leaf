const path = require('path');
const fs = require('fs');

let workerPromise = null;
let workerKey = '';
const LANGS = ['eng', 'deu', 'fra', 'ita'];

async function getWorker(langs, dataDir) {
  const key = langs.join('+');
  if (workerPromise && workerKey === key) return workerPromise;
  if (workerPromise) { try { (await workerPromise).terminate(); } catch (e) { /* ignore */ } }
  const { createWorker } = require('tesseract.js');
  const cachePath = path.join(dataDir, 'ocr-cache');
  fs.mkdirSync(cachePath, { recursive: true });
  workerKey = key;
  workerPromise = createWorker(langs, 1, {
    langPath: path.join(__dirname, '..', 'resources', 'ocr'),
    cachePath,
    gzip: true,
  });
  return workerPromise;
}

async function recognize(png, langs, dataDir) {
  // English last: accented languages read English words fine, but not the other way round (für → fiir).
  const list = (Array.isArray(langs) ? langs : []).filter((l) => LANGS.includes(l)).sort((a, b) => (a === 'eng') - (b === 'eng'));
  const worker = await getWorker(list.length ? list : ['eng'], dataDir);
  const { data } = await worker.recognize(png, {}, { blocks: true, text: false });
  const lines = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) {
    lines.push({
      x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1,
      rowHeight: l.rowAttributes ? l.rowAttributes.rowHeight : 0,
      words: (l.words || []).map((w) => ({ text: w.text, conf: w.confidence, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 })),
    });
  }
  return { lines };
}

function shutdown() { if (workerPromise) workerPromise.then((w) => w.terminate()).catch(() => {}); workerPromise = null; }

module.exports = { recognize, shutdown };
