# Leaf

Open a PDF or Word file, edit it like any document, and save it as Word or PDF. Leaf is a Windows desktop app that runs completely offline: no account, no internet connection, and your files never leave your computer.

## Download

Open the [download](download) folder, save all five files into one folder, and double-click **Join Leaf Setup.bat**. It rebuilds the installer and starts it. It installs for your user account, so you don't need administrator rights.

Windows may show "Windows protected your PC" because the app isn't code-signed. Click **More info**, then **Run anyway**.

## What it does

- **Opens PDF and Word (.docx) files** and turns them into an editable document. Headings, paragraphs, lists, pictures and tables are rebuilt, and two-column pages are read in the right order.
- **Reads scanned PDFs** with built-in text recognition in English, German, French and Italian. Words it's unsure about are highlighted so you can check them.
- **Compare** shows the original PDF next to your edit, with page thumbnails that follow as you scroll.
- **Edit like in Word**: a ribbon with fonts, sizes, colours, alignment, lists, styles, tables, pictures, links, page breaks, orientation and margins.
- **Save** as Word (.docx), or export as PDF, web page or plain text. Recent files appear on the start screen, and unsaved work is recovered if the app closes unexpectedly.
- Light and dark mode, and "Open with → Leaf" for PDF and Word files.

## Build from source

You need Node.js 20 or newer.

```
npm install
npm run build        # bundles the interface into renderer/index.html
npm start            # runs the app
npm run dist:win     # builds the Windows app into release/
```

The project is laid out as follows:

- `main/` is the desktop shell: the window, file dialogs, recent files and offline OCR.
- `src/` is the interface: PDF import, Word import and export, and the editor.
- `resources/ocr/` holds the text-recognition language models.
- `build/` holds the icons, the installer script (`leaf.nsi`) and the packaging hooks.

Built with Electron, pdf.js, docx, mammoth and tesseract.js.
