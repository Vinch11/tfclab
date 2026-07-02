// =============================================
// OCR Processing with Tesseract.js (lazy-loaded)
// =============================================

export interface OcrResult {
  textByPage: string[];
  confidence: number;
  processingTime: number;
}

/**
 * Perform OCR on an array of page images
 */
export async function performOcr(
  pageImages: string[],
  onProgress?: (progress: number, status: string) => void
): Promise<OcrResult> {
  const { default: Tesseract } = await import("tesseract.js");

  const startTime = Date.now();
  const textByPage: string[] = [];
  let totalConfidence = 0;
  
  for (let i = 0; i < pageImages.length; i++) {
    onProgress?.(
      Math.round((i / pageImages.length) * 100),
      `OCR page ${i + 1}/${pageImages.length}...`
    );
    
    try {
      const result = await Tesseract.recognize(pageImages[i], "fra+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const pageProgress = m.progress * 100;
            const overallProgress = Math.round(
              ((i + m.progress) / pageImages.length) * 100
            );
            onProgress?.(overallProgress, `OCR page ${i + 1}: ${Math.round(pageProgress)}%`);
          }
        },
      });
      
      textByPage.push(result.data.text);
      totalConfidence += result.data.confidence;
    } catch (error) {
      console.error(`OCR failed for page ${i + 1}:`, error);
      textByPage.push("");
    }
  }
  
  const processingTime = Date.now() - startTime;
  const avgConfidence = pageImages.length > 0 ? totalConfidence / pageImages.length : 0;
  
  return {
    textByPage,
    confidence: avgConfidence / 100, // Normalize to 0-1
    processingTime,
  };
}
