import { build } from 'esbuild';
import fs from 'node:fs';

const workerText = {
  name: 'worker-as-text',
  setup(b) { b.onLoad({ filter: /pdf\.worker\.min\.mjs$/ }, (a) => ({ contents: fs.readFileSync(a.path, 'utf8'), loader: 'text' })); },
};
const r = await build({
  entryPoints: ['src/app.js'], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'chrome120',
  minify: true, legalComments: 'none', plugins: [workerText], logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"', global: 'window' },
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const b64 = (p) => fs.readFileSync(p).toString('base64');
const fonts = [
  ['Figtree', 'normal', 'node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2', '300 900'],
  ['Source Serif 4', 'normal', 'node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2', '200 900'],
].map(([f, s, p, w]) => `@font-face{font-family:"${f}";font-style:${s};font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${b64(p)}) format("woff2")}`).join('\n');
const html = fs.readFileSync('src/index.html', 'utf8').replace('/*FONTS*/', () => fonts).replace('<script>/*APP_JS*/</script>', () => `<script>${js}</script>`);
fs.mkdirSync('renderer', { recursive: true });
fs.writeFileSync('renderer/index.html', html);
console.log('renderer built', (html.length / 1048576).toFixed(2), 'MB');
