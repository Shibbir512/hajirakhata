import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * A4 dimensions in mm for jsPDF
 */
const A4_WIDTH_MM = 297; // landscape
const A4_HEIGHT_MM = 210;
const A4_WIDTH_MM_P = 210; // portrait
const A4_HEIGHT_MM_P = 297;

/**
 * Generates a PDF from a DOM container by capturing each .a4-page or .a4-marksheet
 * child as a separate high-resolution PNG and composing them into individual PDF pages.
 * 
 * KEY PRINCIPLES:
 * - Each PDF page comes from exactly one DOM element (no giant canvas slicing)
 * - Blank/empty pages are detected and excluded
 * - PNG format used for crisp text (no JPEG)
 * - document.fonts.ready is awaited before capture
 * - Controlled scale for sharp Bengali glyphs
 * 
 * @param elementId The ID of the container element holding .a4-page elements
 * @param orientation 'p' for portrait, 'l' for landscape
 * @returns Blob of the generated PDF
 */
export const generatePdfFromDom = async (
  elementId: string,
  orientation: "p" | "l" = "p",
): Promise<Blob> => {
  const container = document.getElementById(elementId);
  if (!container) {
    throw new Error("Element not found for PDF generation");
  }

  // STEP 1: Ensure all fonts are loaded before capture
  if (document.fonts) {
    await document.fonts.ready;
  }

  // Small delay for DOM layout finalization
  await new Promise((resolve) => setTimeout(resolve, 200));

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = orientation === "l" ? A4_WIDTH_MM : A4_WIDTH_MM_P;
  const pdfHeight = orientation === "l" ? A4_HEIGHT_MM : A4_HEIGHT_MM_P;

  // STEP 2: Find all individual page elements
  const pages = Array.from(
    container.querySelectorAll(".a4-page, .a4-marksheet")
  ) as HTMLElement[];

  if (pages.length === 0) {
    throw new Error("No .a4-page or .a4-marksheet elements found in container");
  }

  // STEP 3: Capture each page individually
  const captureScale = 3; // High-res for crisp Bengali text
  let pdfPageIndex = 0;

  for (let i = 0; i < pages.length; i++) {
    const pageEl = pages[i];

    // Skip pages marked as having no data
    if (pageEl.dataset.hasData === "false") {
      continue;
    }

    const canvas = await html2canvas(pageEl, {
      scale: captureScale,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: pageEl.offsetWidth,
      height: pageEl.offsetHeight,
      // Ensure the element is fully captured including overflow
      windowWidth: pageEl.offsetWidth,
      windowHeight: pageEl.offsetHeight,
    });

    // STEP 4: Add page to PDF
    if (pdfPageIndex > 0) {
      pdf.addPage();
    }

    const imgData = canvas.toDataURL("image/png", 1.0);
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    pdfPageIndex++;
  }

  if (pdfPageIndex === 0) {
    throw new Error("No pages with content were generated");
  }

  return pdf.output("blob");
};

/**
 * Generates a PDF blob and triggers download via saveAs.
 */
export const downloadPdf = async (
  elementId: string,
  orientation: "p" | "l",
  filename: string,
): Promise<void> => {
  const blob = await generatePdfFromDom(elementId, orientation);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
