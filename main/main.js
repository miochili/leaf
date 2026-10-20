const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const ocr = require('./ocr');

app.setAppUserModelId('app.leaf.editor');
const isMac = process.platform === 'darwin';
const DATA = () => app.getPath('userData');
const jsonPath = (n) => path.join(DATA(), n);
const readJson = (n, fb) => { try { return JSON.parse(fs.readFileSync(jsonPath(n), 'utf8')); } catch (e) { return fb; } };
const writeJson = (n, v) => { try { fs.mkdirSync(DATA(), { recursive: true }); fs.writeFileSync(jsonPath(n), JSON.stringify(v)); } catch (e) { /* ignore */ } };
const OPENABLE = /\.(pdf|docx)$/i;

let win = null;
let pendingFile = null;
let dirty = false;
let forceClose = false;
let docName = 'Untitled document';

function fileArg(argv) { return argv.slice(1).find((a) => OPENABLE.test(a) && fs.existsSync(a)); }
function sendOpen(file) {
  if (!file) return;
  if (!win || win.webContents.isLoading()) { pendingFile = file; return; }
  win.webContents.send('open-path', file);
  if (win.isMinimized()) win.restore();
  win.focus();
}

const LIGHT = { color: '#f7f8f6', symbolColor: '#1b2420' };
const DARK = { color: '#161a19', symbolColor: '#e4eae7' };

function createWindow() {
  const st = readJson('window.json', {});
  const area = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(st.width || 1440, area.width), height: Math.min(st.height || 920, area.height),
    x: st.x, y: st.y, minWidth: 960, minHeight: 620,
    title: 'Leaf', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f1211' : '#eceee9',
    icon: path.join(__dirname, '..', 'assets', 'icon-512.png'),
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: isMac ? undefined : { ...(nativeTheme.shouldUseDarkColors ? DARK : LIGHT), height: 44 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, spellcheck: true },
  });
  if (st.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => { if (pendingFile) { const f = pendingFile; pendingFile = null; sendOpen(f); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:|^mailto:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:|^mailto:/i.test(url)) shell.openExternal(url); } });

  // right-click: spelling suggestions + clipboard
  win.webContents.on('context-menu', (_e, p) => {
    const items = [];
    if (p.misspelledWord) {
      for (const s of p.dictionarySuggestions.slice(0, 6)) items.push({ label: s, click: () => win.webContents.replaceMisspelling(s) });
      if (!p.dictionarySuggestions.length) items.push({ label: 'No suggestions', enabled: false });
      items.push({ label: 'Add to dictionary', click: () => win.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord) }, { type: 'separator' });
    }
    if (p.isEditable) {
      items.push({ role: 'cut', enabled: p.editFlags.canCut }, { role: 'copy', enabled: p.editFlags.canCopy }, { role: 'paste', enabled: p.editFlags.canPaste },
        { label: 'Paste as plain text', enabled: p.editFlags.canPaste, click: () => win.webContents.pasteAndMatchStyle() },
        { type: 'separator' }, { role: 'selectAll' });
    } else if (p.selectionText) items.push({ role: 'copy' });
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });

  const saveState = () => { if (!win) return; const b = win.getNormalBounds(); writeJson('window.json', { ...b, maximized: win.isMaximized() }); };
  win.on('resize', saveState); win.on('move', saveState);
  win.on('close', (e) => {
    saveState();
    if (!dirty || forceClose) return;
    e.preventDefault();
    const r = dialog.showMessageBoxSync(win, {
      type: 'question', buttons: ['Save', 'Don’t save', 'Cancel'], defaultId: 0, cancelId: 2, noLink: true,
      title: 'Leaf', message: `Save changes to “${docName}”?`, detail: 'Your changes will be lost if you don’t save them.',
    });
    if (r === 0) win.webContents.send('save-then-close');
    else if (r === 1) { try { fs.unlinkSync(jsonPath('draft.json')); } catch (err) { /* ignore */ } forceClose = true; win.close(); }
  });
  win.on('closed', () => { win = null; });
}

/* ---------- files ---------- */
const readFile = (p) => ({ path: p, name: path.basename(p), data: new Uint8Array(fs.readFileSync(p)) });
ipcMain.handle('file:open-dialog', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Open', properties: ['openFile'],
    filters: [{ name: 'PDF and Word documents', extensions: ['pdf', 'docx'] }, { name: 'PDF', extensions: ['pdf'] }, { name: 'Word document', extensions: ['docx'] }],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return readFile(r.filePaths[0]);
});
ipcMain.handle('file:read', (_e, p) => { try { return readFile(p); } catch (e) { return { error: e.code === 'ENOENT' ? 'missing' : String(e.message || e) }; } });

const FILTERS = { docx: { name: 'Word document', extensions: ['docx'] }, pdf: { name: 'PDF', extensions: ['pdf'] }, html: { name: 'Web page', extensions: ['html'] }, txt: { name: 'Plain text', extensions: ['txt'] } };
async function askSavePath(defaultName, ext, current) {
  const r = await dialog.showSaveDialog(win, {
    title: ext === 'docx' ? 'Save' : 'Export', defaultPath: current || path.join(app.getPath('documents'), `${defaultName}.${ext}`), filters: [FILTERS[ext]],
  });
  return r.canceled ? null : r.filePath;
}
ipcMain.handle('file:save', async (_e, { path: p, defaultName, ext, data, saveAs }) => {
  let target = p;
  if (!target || saveAs) target = await askSavePath(defaultName, ext, p);
  if (!target) return null;
  try { fs.writeFileSync(target, Buffer.from(data)); }
  catch (e) { return { error: e.code === 'EBUSY' || e.code === 'EPERM' ? 'busy' : String(e.message || e) }; }
  return { path: target, name: path.basename(target) };
});
ipcMain.handle('file:export-pdf', async (_e, { defaultName, paper, landscape }) => {
  const target = await askSavePath(defaultName, 'pdf');
  if (!target) return null;
  const data = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, pageSize: paper === 'Letter' ? 'Letter' : 'A4', landscape: !!landscape });
  try { fs.writeFileSync(target, data); } catch (e) { return { error: e.code === 'EBUSY' || e.code === 'EPERM' ? 'busy' : String(e.message || e) }; }
  return { path: target, name: path.basename(target) };
});
ipcMain.handle('shell:show', (_e, p) => shell.showItemInFolder(p));
ipcMain.handle('shell:open', (_e, p) => shell.openPath(p));
ipcMain.handle('shell:external', (_e, u) => { if (/^https?:|^mailto:/i.test(u)) shell.openExternal(u); });

/* ---------- recent files ---------- */
ipcMain.handle('recent:get', () => readJson('recent.json', []).map((r) => ({ ...r, exists: fs.existsSync(r.path) })));
ipcMain.handle('recent:add', (_e, item) => {
  const list = readJson('recent.json', []).filter((r) => r.path.toLowerCase() !== item.path.toLowerCase());
  const old = readJson('recent.json', []).find((r) => r.path.toLowerCase() === item.path.toLowerCase());
  list.unshift({ ...old, ...item, thumb: item.thumb || (old && old.thumb) || null, opened: Date.now() });
  writeJson('recent.json', list.slice(0, 16));
  if (!isMac) app.addRecentDocument(item.path);
});
ipcMain.handle('recent:remove', (_e, p) => writeJson('recent.json', readJson('recent.json', []).filter((r) => r.path !== p)));
ipcMain.handle('recent:clear', () => { writeJson('recent.json', []); app.clearRecentDocuments(); });

/* ---------- drafts ---------- */
ipcMain.handle('draft:save', (_e, d) => writeJson('draft.json', d));
ipcMain.handle('draft:load', () => readJson('draft.json', null));
ipcMain.handle('draft:clear', () => { try { fs.unlinkSync(jsonPath('draft.json')); } catch (e) { /* ignore */ } });

/* ---------- settings ---------- */
ipcMain.handle('settings:get', () => readJson('settings.json', {}));
ipcMain.handle('settings:set', (_e, s) => writeJson('settings.json', { ...readJson('settings.json', {}), ...s }));

/* ---------- OCR ---------- */
ipcMain.handle('ocr:run', (_e, png, langs) => ocr.recognize(Buffer.from(png), langs, DATA()));

/* ---------- window ---------- */
ipcMain.on('app:dirty', (_e, d, name) => { dirty = !!d; if (name) docName = name; if (win) win.setDocumentEdited(!!d); });
ipcMain.on('app:title', (_e, t) => { if (win) win.setTitle(t); });
ipcMain.on('app:theme', (_e, dark) => { if (win && !isMac) { try { win.setTitleBarOverlay(dark ? DARK : LIGHT); } catch (e) { /* ignore */ } } win && win.setBackgroundColor(dark ? '#0f1211' : '#eceee9'); });
ipcMain.on('app:close-now', () => { forceClose = true; if (win) win.close(); });
ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform }));

/* ---------- lifecycle ---------- */
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_e, argv) => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } sendOpen(fileArg(argv)); });
  app.on('open-file', (e, f) => { e.preventDefault(); sendOpen(f); });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(isMac ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
    pendingFile = fileArg(process.argv) || pendingFile;
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { ocr.shutdown(); if (!isMac) app.quit(); });
}
