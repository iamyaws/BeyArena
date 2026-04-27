import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export async function generateToken(): Promise<{ token: string; tokenHash: string }> {
  const buf = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return { token, tokenHash };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function buildQrCardPdf(displayName: string, qrUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([252, 360]); // ~2.5x3.5 inch trading card
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 0, width: 252, height: 360, color: rgb(0, 0, 0) });
  page.drawText('THE X TRACKER', { x: 20, y: 340, size: 8, font, color: rgb(1, 1, 1) });
  page.drawText(displayName.toUpperCase(), {
    x: 20,
    y: 320,
    size: 22,
    font,
    color: rgb(1, 0.86, 0.28),
  });
  // QR code as PNG data URL (browser-friendly path; node-qrcode's toBuffer is Node-only)
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 200,
    margin: 1,
    color: { dark: '#FFFFFF', light: '#00000000' },
  });
  const qrBytes = dataUrlToBytes(qrDataUrl);
  const qrImg = await pdf.embedPng(qrBytes);
  page.drawImage(qrImg, { x: 26, y: 50, width: 200, height: 200 });
  page.drawText('Scan zum Login', { x: 80, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6) });
  return pdf.save();
}
