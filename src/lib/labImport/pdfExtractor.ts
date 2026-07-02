// =============================================
// PDF Text Extraction with pdfjs-dist (lazy-loaded)
// =============================================

export interface PdfExtractionResult {
  textByPage: string[];
  totalPages: number;
  isScanned: boolean;
  totalCharacters: number;
}

let _pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function getPdfJs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.version}/pdf.worker.min.mjs`;
      return mod;
    });
  }
  return _pdfjsPromise;
}

/**
 * Extract text from PDF file using pdfjs-dist
 */
export async function extractTextFromPdf(file: File): Promise<PdfExtractionResult> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const textByPage: string[] = [];
  let totalCharacters = 0;
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Concatenate text items with proper spacing
    let pageText = "";
    let lastY: number | null = null;
    
    for (const item of textContent.items) {
      if ("str" in item) {
        const textItem = item as { str: string; transform: number[] };
        const currentY = textItem.transform[5];
        
        // Add newline if Y position changed significantly
        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          pageText += "\n";
        } else if (pageText.length > 0 && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
          pageText += " ";
        }
        
        pageText += textItem.str;
        lastY = currentY;
      }
    }
    
    textByPage.push(pageText.trim());
    totalCharacters += pageText.length;
  }
  
  // Consider PDF as scanned if total text is less than 200 characters
  const isScanned = totalCharacters < 200;
  
  return {
    textByPage,
    totalPages: pdf.numPages,
    isScanned,
    totalCharacters,
  };
}

/**
 * Convert PDF page to image for OCR
 */
export async function pdfPageToImage(file: File, pageNum: number): Promise<string> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNum);
  
  const scale = 2.0; // Higher scale for better OCR
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  
  if (!context) {
    throw new Error("Could not create canvas context");
  }
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;
  
  return canvas.toDataURL("image/png");
}

/**
 * Get all pages as images for OCR processing
 */
export async function getAllPagesAsImages(file: File): Promise<string[]> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const images: string[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const imageData = await pdfPageToImage(file, pageNum);
    images.push(imageData);
  }
  
  return images;
}
