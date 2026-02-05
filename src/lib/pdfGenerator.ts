/**
 * PDF Generator Utility
 * Uses jsPDF + html2canvas for reliable cross-platform PDF generation
 * Especially important for iOS Safari compatibility
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PDFGeneratorOptions {
  filename: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter";
  scale?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Generate PDF from HTML string
 * Creates a temporary DOM element, renders it with html2canvas, then converts to PDF
 */
export async function generatePDFFromHTML(
  htmlContent: string,
  options: PDFGeneratorOptions
): Promise<Blob> {
  const {
    orientation = "portrait",
    format = "a4",
    scale = 2,
    onProgress,
  } = options;

  // Create temporary container
  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    background: white;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  document.body.appendChild(container);

  try {
    onProgress?.(10);

    // Wait for images to load
    const images = container.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );

    onProgress?.(30);

    // Render to canvas
    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    onProgress?.(60);

    // Calculate dimensions for A4
    const imgWidth = orientation === "portrait" ? 210 : 297;
    const pageHeight = orientation === "portrait" ? 297 : 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Handle multi-page content
    let heightLeft = imgHeight;
    let position = 0;
    let pageNum = 1;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      pageNum++;
    }

    onProgress?.(90);

    // Return as blob
    const pdfBlob = pdf.output("blob");

    onProgress?.(100);

    return pdfBlob;
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

/**
 * Download PDF blob as file
 * Works on all platforms including iOS Safari
 */
export async function downloadPDF(
  blob: Blob,
  filename: string
): Promise<boolean> {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS && navigator.share && navigator.canShare) {
    // iOS: Try native share with PDF file
    const file = new File([blob], filename, { type: "application/pdf" });
    const shareData = { files: [file] };

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return false; // User cancelled
        }
        // Fall through to blob URL method
      }
    }
  }

  // Universal fallback: create blob URL and trigger download
  const url = URL.createObjectURL(blob);

  if (isIOS) {
    // iOS fallback: open in new tab (Safari will display PDF inline)
    window.open(url, "_blank");
  } else {
    // Desktop/Android: direct download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

/**
 * Complete flow: generate and download PDF from HTML
 */
export async function exportHTMLToPDF(
  htmlContent: string,
  options: PDFGeneratorOptions
): Promise<boolean> {
  const blob = await generatePDFFromHTML(htmlContent, options);
  return downloadPDF(blob, options.filename);
}
