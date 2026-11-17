import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { generatePdfFromDom } from "./pdfGenerator";

/**
 * Generates an A4 Portrait PDF from a certificate DOM wrapper using native browser
 * SVG foreignObject rendering (via html-to-image) so Arabic cursive ligatures,
 * harakat diacritics, and Bengali conjuncts render identically to the live preview.
 * Falls back cleanly to html2canvas-based generatePdfFromDom if needed.
 */
export const generateCertificatePdfBlob = async (
  containerId: string
): Promise<Blob> => {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error("Certificate container not found");
  }

  const pageEl =
    (container.querySelector(".a4-page") as HTMLElement | null) || container;

  if (document.fonts) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => setTimeout(resolve, 180));

  try {
    const imgData = await toPng(pageEl, {
      pixelRatio: 3,
      backgroundColor: "#ffffff",
      width: pageEl.offsetWidth || 794,
      height: pageEl.offsetHeight || 1123,
      cacheBust: false,
      style: {
        margin: "0",
        transform: "none",
      },
    });

    const pdf = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    return pdf.output("blob");
  } catch (primaryErr) {
    console.warn(
      "html-to-image certificate capture failed, falling back to generatePdfFromDom:",
      primaryErr
    );
    return await generatePdfFromDom(containerId, "p");
  }
};
