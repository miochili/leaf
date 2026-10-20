import mammoth from 'mammoth/mammoth.browser.js';

export async function importDocx(bytes) {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const r = await mammoth.convertToHtml({ arrayBuffer: ab }, {
    styleMap: [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='Intense Quote'] => blockquote:fresh",
      'u => u',
      'strike => s',
    ],
  });
  return r.value || '<p><br></p>';
}
