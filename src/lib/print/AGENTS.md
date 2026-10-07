# Print / export rules

- On iPhone/iPad, `openPrintableHTML` builds a real PDF file on-device (`iosPdfExport.ts`, html2canvas + jsPDF) and offers it via the native share sheet, falling back to the inline overlay only on failure. Why: Safari print is unreliable on iOS (blank tab in installed app, broken pagination in iframes).
