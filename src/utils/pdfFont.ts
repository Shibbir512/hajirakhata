import { jsPDF } from "jspdf";

let cachedFontBase64: string | null = null;

export const addBengaliFont = async (doc: jsPDF): Promise<boolean> => {
  try {
    if (!cachedFontBase64) {
      // Fetch Tiro Bangla font from Google Fonts repository
      const response = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/tirobangla/TiroBangla-Regular.ttf');
      if (!response.ok) throw new Error("Failed to fetch font");
      
      const buffer = await response.arrayBuffer();
      
      // Convert ArrayBuffer to Base64
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      cachedFontBase64 = window.btoa(binary);
    }
    
    doc.addFileToVFS('TiroBangla.ttf', cachedFontBase64);
    doc.addFont('TiroBangla.ttf', 'TiroBangla', 'normal');
    return true;
  } catch (error) {
    console.error("Error loading Bengali font:", error);
    return false;
  }
};
