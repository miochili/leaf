const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('leaf', {
  openDialog: () => ipcRenderer.invoke('file:open-dialog'),
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  save: (opts) => ipcRenderer.invoke('file:save', opts),
  exportPdf: (opts) => ipcRenderer.invoke('file:export-pdf', opts),
  showInFolder: (p) => ipcRenderer.invoke('shell:show', p),
  openPath: (p) => ipcRenderer.invoke('shell:open', p),
  openExternal: (u) => ipcRenderer.invoke('shell:external', u),
  recent: {
    get: () => ipcRenderer.invoke('recent:get'),
    add: (item) => ipcRenderer.invoke('recent:add', item),
    remove: (p) => ipcRenderer.invoke('recent:remove', p),
    clear: () => ipcRenderer.invoke('recent:clear'),
  },
  draft: {
    save: (d) => ipcRenderer.invoke('draft:save', d),
    load: () => ipcRenderer.invoke('draft:load'),
    clear: () => ipcRenderer.invoke('draft:clear'),
  },
  settings: { get: () => ipcRenderer.invoke('settings:get'), set: (s) => ipcRenderer.invoke('settings:set', s) },
  pathForFile: (f) => { try { return webUtils.getPathForFile(f); } catch (e) { return ''; } },
  ocr: (png, langs) => ipcRenderer.invoke('ocr:run', png, langs),
  info: () => ipcRenderer.invoke('app:info'),
  setDirty: (d, name) => ipcRenderer.send('app:dirty', d, name),
  setTitle: (t) => ipcRenderer.send('app:title', t),
  setTheme: (dark) => ipcRenderer.send('app:theme', dark),
  closeNow: () => ipcRenderer.send('app:close-now'),
  onOpenPath: (cb) => ipcRenderer.on('open-path', (_e, p) => cb(p)),
  onSaveThenClose: (cb) => ipcRenderer.on('save-then-close', () => cb()),
});
