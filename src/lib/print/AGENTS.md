# Print / export rules

- On iPhone/iPad, `openPrintableHTML` builds a real PDF file on-device (`iosPdfExport.ts`, html2canvas + jsPDF) and offers it via the native share sheet, falling back to the inline overlay only on failure. Why: Safari print is unreliable on iOS (blank tab in installed app, broken pagination in iframes).

- PDF iOS (iosPdfExport.ts) : paginer en décalant le contenu (body relative, top = -y), jamais via l option scrollY de html2canvas. Why : scrollY est ignoré sur Safari iOS réel → toutes les pages identiques.
