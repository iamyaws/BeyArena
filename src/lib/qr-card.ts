import { PDFDocument, PDFFont, PDFPage, degrees, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

// ─────────────────────────────────────────────────────────────
// Token generation (unchanged)
// ─────────────────────────────────────────────────────────────
export async function generateToken(): Promise<{ token: string; tokenHash: string }> {
  const buf = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return { token, tokenHash };
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────
export type CardKid = {
  id: string;
  display_name: string;
  floor: number;
  card_color_hex: string | null;
};

export type CardBey = {
  name_en: string;
  product_code: string | null;
  type: 'attack' | 'defense' | 'stamina' | 'balance' | null;
};

export type CardInput = {
  kid: CardKid;
  bey: CardBey;
  qrUrl: string;
  /** Optional team name shown on the front. Falls back to "BEYARENA" if absent. */
  teamName?: string | null;
};

// A6 paper size: 105×148mm. pdf-lib units are pt (72/inch ≈ 2.834646/mm),
// so 105mm ≈ 297.64pt and 148mm ≈ 419.53pt. Round to whole pt.
const CARD_W = 298; // A6 width: 105mm × 72/25.4 ≈ 297.64pt
const CARD_H = 420; // A6 height: 148mm × 72/25.4 ≈ 419.53pt
// Layout was originally authored against a 252×360 frame (~CR80 trading card).
// Multiply every absolute pt value (positions, font sizes, paddings, art sizes)
// by SCALE so the design grows proportionally with the card.
const SCALE = CARD_W / 252;

// ─────────────────────────────────────────────────────────────
// Color helpers
// ─────────────────────────────────────────────────────────────
type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return {
    r: ((num >> 16) & 0xff) / 255,
    g: ((num >> 8) & 0xff) / 255,
    b: (num & 0xff) / 255,
  };
}

function hexToColor(hex: string) {
  const { r, g, b } = parseHex(hex);
  return rgb(r, g, b);
}

/** Perceived luminance — close to CSS contrast. < 0.6 ≈ "dark color". */
function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLightHex(hex: string): boolean {
  return luminance(parseHex(hex)) > 0.6;
}

function darken({ r, g, b }: Rgb, amount: number): Rgb {
  return {
    r: Math.max(0, r * (1 - amount)),
    g: Math.max(0, g * (1 - amount)),
    b: Math.max(0, b * (1 - amount)),
  };
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

// ─────────────────────────────────────────────────────────────
// Drawing helpers — pdf-lib uses bottom-up Y. Design specs Y from top.
// We translate via (CARD_H - y) helpers.
// ─────────────────────────────────────────────────────────────
type Fonts = {
  stencil: PDFFont; // Saira Stencil One substitute → HelveticaBold
  body: PDFFont; // Inter substitute → Helvetica
  bodyBold: PDFFont;
  mono: PDFFont; // JetBrains Mono substitute → Courier
  monoBold: PDFFont;
};

/**
 * Approximate a radial-gradient tint by stacking several large semi-transparent
 * circles. Crude, but closer to the design than a flat panel.
 */
function drawRadialTint(
  page: PDFPage,
  cx: number,
  cy: number,
  radius: number,
  hex: string,
  startOpacity: number,
) {
  const color = hexToColor(hex);
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t = i / steps; // 0 → outermost, 1 → center
    const r = radius * (1 - t * 0.85);
    const opacity = startOpacity * (1 - t) ** 1.4 + startOpacity * 0.15;
    page.drawCircle({
      x: cx,
      y: cy,
      size: r,
      color,
      opacity,
    });
  }
}

/**
 * 8-blade Beyblade-style spinning top, drawn entirely with pdf-lib primitives.
 * (cx, cy) in PDF coordinates (bottom-up).
 */
function drawBey(
  page: PDFPage,
  cx: number,
  cy: number,
  size: number,
  color1Hex: string,
  color2Hex: string,
) {
  const c1 = parseHex(color1Hex);
  const c2 = parseHex(color2Hex);
  const c1Color = rgb(c1.r, c1.g, c1.b);
  const c2Color = rgb(c2.r, c2.g, c2.b);
  const c1Dark = darken(c1, 0.55);

  // Outer disc — radial gradient approximated as solid + dark ring + inner highlight
  page.drawCircle({ x: cx, y: cy, size: size * 0.48, color: rgb(c1Dark.r, c1Dark.g, c1Dark.b) });
  page.drawCircle({ x: cx, y: cy, size: size * 0.42, color: c1Color, opacity: 0.85 });

  // 8 blades — drawn as kite-shaped polygons via SVG path, rotated.
  // Blade reference shape mirrors design polygon "50,2 58,28 50,46 42,28"
  // centered on a 100×100 frame; we scale to `size`.
  const blade = 'M 0 -48 L 8 -22 L 0 -4 L -8 -22 Z';
  const scale = size / 100;
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  angles.forEach((a, i) => {
    page.drawSvgPath(blade, {
      x: cx,
      y: cy,
      scale,
      rotate: degrees(a),
      color: c2Color,
      opacity: i % 2 ? 0.95 : 0.7,
    });
  });

  // Inner disc with subtle dark border + colored fill
  page.drawCircle({
    x: cx,
    y: cy,
    size: size * 0.27,
    color: c1Color,
    borderColor: rgb(0, 0, 0),
    borderOpacity: 0.4,
    borderWidth: 1.2 * (size / 170),
  });

  // Hub
  page.drawCircle({ x: cx, y: cy, size: size * 0.1, color: rgb(0.05, 0.05, 0.07) });

  // Center jewel — small diamond in c2
  const jewel = 'M 0 -6 L 6 0 L 0 6 L -6 0 Z';
  page.drawSvgPath(jewel, {
    x: cx,
    y: cy,
    scale: scale * 1.05,
    color: c2Color,
  });
}

/** Color triangle in the top-right corner, design's serial pennant. */
function drawCornerPennant(page: PDFPage, hex: string) {
  // Triangle as SVG path. PDF coord origin at top-right corner of card.
  // Height/leg of 44px — same as design. We anchor at top-right (CARD_W, CARD_H).
  const leg = 44 * SCALE;
  const path = `M 0 0 L 0 -${leg} L -${leg} 0 Z`;
  page.drawSvgPath(path, {
    x: CARD_W,
    y: CARD_H,
    color: hexToColor(hex),
  });
}

/**
 * Speed lines — 6 mostly-horizontal lines that suggest motion across the card,
 * skipping the diagonal banner zone.
 */
function drawSpeedLines(page: PDFPage) {
  const ys = [0.78, 0.7, 0.6, 0.46, 0.3, 0.2];
  ys.forEach((t, i) => {
    const y = CARD_H * t;
    page.drawLine({
      start: { x: 0, y },
      end: { x: CARD_W, y: y - CARD_H * 0.04 },
      thickness: 0.5 * SCALE,
      color: rgb(1, 1, 1),
      opacity: 0.06 + (i % 3) * 0.04,
    });
  });
}

/**
 * Diagonal banner: kid-color background panel + kid name text.
 * Approximates the design's `transform: skewY(-2deg)` via a rectangle drawn
 * with a small rotation and a similarly-rotated text baseline. We share the
 * same rotation anchor for rect + text, so both pivot together cleanly.
 */
function drawNameBanner(
  page: PDFPage,
  fonts: Fonts,
  name: string,
  toneHex: string,
  isLight: boolean,
) {
  void isLight; // banner text is always near-black per design
  const tone = hexToColor(toneHex);
  // Banner band — oversized so the rotation never exposes the card corners.
  const bannerYBase = 88 * SCALE; // distance from bottom (mirrors design `bottom: 88`)
  const bannerH = 38 * SCALE;
  const bannerW = CARD_W + 24 * SCALE;
  const angleDeg = 2.2;
  const anchorX = -12 * SCALE;
  const anchorY = bannerYBase;

  page.drawRectangle({
    x: anchorX,
    y: anchorY,
    width: bannerW,
    height: bannerH,
    color: tone,
    rotate: degrees(angleDeg),
  });

  // Place text in the rectangle's local frame (anchor = rect origin), then
  // rotate around the same anchor so it follows the banner exactly.
  const upper = name.toUpperCase();
  const fontSize = 26 * SCALE;
  const textW = fonts.stencil.widthOfTextAtSize(upper, fontSize);
  const localX = bannerW / 2 - textW / 2; // horizontally centered within the banner
  const localY = 11 * SCALE; // baseline lift inside the band
  const rad = (angleDeg * Math.PI) / 180;
  // Apply rotation matrix: (localX, localY) rotated around (anchorX, anchorY).
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tx = anchorX + localX * cos - localY * sin;
  const ty = anchorY + localX * sin + localY * cos;
  page.drawText(upper, {
    x: tx,
    y: ty,
    size: fontSize,
    font: fonts.stencil,
    color: rgb(0.04, 0.04, 0.06),
    rotate: degrees(angleDeg),
  });
}

/** Top band: BEYARENA wordmark + SPIELERKARTE eyebrow + ETG floor pill. */
function drawTopBand(
  page: PDFPage,
  fonts: Fonts,
  toneHex: string,
  txtIsDark: boolean,
  floor: number,
) {
  const txt = txtIsDark ? rgb(0.04, 0.04, 0.06) : rgb(1, 1, 1);
  const subtleOpacity = txtIsDark ? 0.55 : 0.85;
  page.drawText('BEYARENA', {
    x: 12 * SCALE,
    y: CARD_H - 24 * SCALE,
    size: 13 * SCALE,
    font: fonts.stencil,
    color: txt,
    opacity: subtleOpacity,
  });
  page.drawText('SPIELERKARTE  S04', {
    x: 12 * SCALE,
    y: CARD_H - 35 * SCALE,
    size: 6.5 * SCALE,
    font: fonts.mono,
    color: txt,
    opacity: 0.55,
  });

  // ETG floor pill — top-right
  const pillLabel = `ETG ${floor}`;
  const pillFontSize = 11 * SCALE;
  const pillTextWidth = fonts.stencil.widthOfTextAtSize(pillLabel, pillFontSize);
  const pillW = pillTextWidth + 14 * SCALE;
  const pillH = 18 * SCALE;
  const pillX = CARD_W - 12 * SCALE - pillW;
  const pillY = CARD_H - 12 * SCALE - pillH;
  // pill background contrasts the card color: dark on light cards, light on dark cards
  const pillBg = txtIsDark ? rgb(1, 1, 1) : rgb(0, 0, 0);
  const pillBgOpacity = txtIsDark ? 0.85 : 0.55;
  const pillTextColor = txtIsDark ? rgb(0.04, 0.04, 0.06) : rgb(1, 1, 1);
  // ignore tone here — it'd reduce contrast against the same-tone background
  void toneHex;
  page.drawRectangle({
    x: pillX,
    y: pillY,
    width: pillW,
    height: pillH,
    color: pillBg,
    opacity: pillBgOpacity,
  });
  page.drawText(pillLabel, {
    x: pillX + 7 * SCALE,
    y: pillY + 5 * SCALE,
    size: pillFontSize,
    font: fonts.stencil,
    color: pillTextColor,
  });
}

/** Bottom info row: Mein Bey on the left, Team on the right. */
function drawBottomInfoRow(
  page: PDFPage,
  fonts: Fonts,
  bey: CardBey,
  teamName: string,
  txtIsDark: boolean,
) {
  const txt = txtIsDark ? rgb(0.04, 0.04, 0.06) : rgb(1, 1, 1);

  page.drawText('MEIN BEY', {
    x: 14 * SCALE,
    y: 38 * SCALE,
    size: 6.5 * SCALE,
    font: fonts.mono,
    color: txt,
    opacity: 0.6,
  });
  page.drawText(bey.name_en.toUpperCase(), {
    x: 14 * SCALE,
    y: 22 * SCALE,
    size: 12 * SCALE,
    font: fonts.stencil,
    color: txt,
  });
  const codeLine = `${bey.product_code ?? '-'}  ${(bey.type ?? '-').toUpperCase()}`;
  page.drawText(codeLine, {
    x: 14 * SCALE,
    y: 12 * SCALE,
    size: 7.5 * SCALE,
    font: fonts.mono,
    color: txt,
    opacity: 0.6,
  });

  // Right-aligned: Team
  const teamUpper = teamName.toUpperCase();
  const teamLabel = 'TEAM';
  const teamLabelWidth = fonts.mono.widthOfTextAtSize(teamLabel, 6.5 * SCALE);
  const teamWidth = fonts.stencil.widthOfTextAtSize(teamUpper, 12 * SCALE);
  page.drawText(teamLabel, {
    x: CARD_W - 14 * SCALE - teamLabelWidth,
    y: 38 * SCALE,
    size: 6.5 * SCALE,
    font: fonts.mono,
    color: txt,
    opacity: 0.6,
  });
  page.drawText(teamUpper, {
    x: CARD_W - 14 * SCALE - teamWidth,
    y: 22 * SCALE,
    size: 12 * SCALE,
    font: fonts.stencil,
    color: txt,
  });
}

/** Pick a color1/color2 pair for the bey illustration. */
function beyArtColors(toneHex: string, beyType: CardBey['type']): { c1: string; c2: string } {
  // Mirrors the design data: most beys pair their primary with yellow,
  // attack-style beys pair red/yellow. We default to the kid color as c1
  // and a contrasty c2 from the design palette.
  const palette: Record<string, string> = {
    attack: '#FDE047',
    defense: '#FDE047',
    stamina: '#06B6D4',
    balance: '#DC2626',
  };
  const fallback = '#FDE047';
  const c2 = beyType ? palette[beyType] ?? fallback : fallback;
  // If the kid tone *is* the c2 palette pick, fall back to a complementary tone
  // so the disc and blades stay visually distinct.
  const c2Final = c2.toLowerCase() === toneHex.toLowerCase() ? '#DC2626' : c2;
  return { c1: toneHex, c2: c2Final };
}

// ─────────────────────────────────────────────────────────────
// FRONT
// ─────────────────────────────────────────────────────────────
async function drawFront(
  page: PDFPage,
  fonts: Fonts,
  input: CardInput,
  resolvedTone: string,
  teamName: string,
) {
  const isLight = isLightHex(resolvedTone);
  const txtIsDark = isLight; // dark text on light card colors

  // Base background: dark gradient #0d0d12 → #1a0c08 (top → bottom).
  // pdf-lib doesn't do gradients natively; approximate as a solid base + a
  // few stacked rectangles of decreasing opacity for a crude top→bottom warmth.
  page.drawRectangle({
    x: 0,
    y: 0,
    width: CARD_W,
    height: CARD_H,
    color: rgb(0.05, 0.05, 0.07),
  });
  // Warm bottom band
  for (let i = 0; i < 6; i++) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: CARD_W,
      height: CARD_H * (0.4 - i * 0.06),
      color: rgb(0.1, 0.05, 0.03),
      opacity: 0.16,
    });
  }

  // Top radial tint in kid color (centered above the top edge)
  drawRadialTint(page, CARD_W / 2, CARD_H + 20 * SCALE, CARD_W * 0.85, resolvedTone, 0.55);
  // Bottom radial tint in kid color
  drawRadialTint(page, CARD_W / 2, -10 * SCALE, CARD_W * 0.7, resolvedTone, 0.4);

  // Speed lines (subtle motion overlay)
  drawSpeedLines(page);

  // Bey art — center, upper-third
  const beyColors = beyArtColors(resolvedTone, input.bey.type);
  drawBey(page, CARD_W / 2, CARD_H - 150 * SCALE, 170 * SCALE, beyColors.c1, beyColors.c2);

  // Diagonal name banner
  drawNameBanner(page, fonts, input.kid.display_name, resolvedTone, isLight);

  // Top band (wordmark + ETG pill)
  drawTopBand(page, fonts, resolvedTone, txtIsDark, input.kid.floor);

  // Bottom info row
  drawBottomInfoRow(page, fonts, input.bey, teamName, txtIsDark);

  // Top-right corner pennant in kid color
  drawCornerPennant(page, resolvedTone);
}

// ─────────────────────────────────────────────────────────────
// BACK
// ─────────────────────────────────────────────────────────────
async function drawBack(
  pdf: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  input: CardInput,
  resolvedTone: string,
) {
  const tone = hexToColor(resolvedTone);
  const isLight = isLightHex(resolvedTone);
  const bandText = isLight ? rgb(0.04, 0.04, 0.06) : rgb(1, 1, 1);
  const ink = rgb(0.04, 0.04, 0.06);

  // Cream paper background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: CARD_W,
    height: CARD_H,
    color: rgb(0.98, 0.98, 0.965),
  });

  // Top color band (50px from top in design space → from y = CARD_H-50 to CARD_H)
  const bandH = 50 * SCALE;
  page.drawRectangle({
    x: 0,
    y: CARD_H - bandH,
    width: CARD_W,
    height: bandH,
    color: tone,
  });
  page.drawText('BEYARENA', {
    x: 14 * SCALE,
    y: CARD_H - 30 * SCALE,
    size: 14 * SCALE,
    font: fonts.stencil,
    color: bandText,
  });
  const right = 'SPIELERKARTE';
  const rightW = fonts.monoBold.widthOfTextAtSize(right, 9 * SCALE);
  page.drawText(right, {
    x: CARD_W - 14 * SCALE - rightW,
    y: CARD_H - 28 * SCALE,
    size: 9 * SCALE,
    font: fonts.monoBold,
    color: bandText,
  });

  // Notch indicator just below the band
  const notchW = 46 * SCALE;
  const notchH = 4 * SCALE;
  page.drawRectangle({
    x: (CARD_W - notchW) / 2,
    y: CARD_H - bandH - notchH,
    width: notchW,
    height: notchH,
    color: tone,
  });

  // Kid name (stencil, 18pt, dark)
  const name = input.kid.display_name.toUpperCase();
  const nameSize = 18 * SCALE;
  const nameW = fonts.stencil.widthOfTextAtSize(name, nameSize);
  page.drawText(name, {
    x: (CARD_W - nameW) / 2,
    y: CARD_H - bandH - 32 * SCALE,
    size: nameSize,
    font: fonts.stencil,
    color: ink,
  });

  // QR code box: white card with 2px black border + 4px offset shadow.
  const qrInner = 130 * SCALE;
  const qrPad = 10 * SCALE;
  const boxSize = qrInner + qrPad * 2;
  const boxX = (CARD_W - boxSize) / 2;
  // box vertical position: below name, leaving room for caption + footer
  const boxY = 90 * SCALE;

  // Offset shadow
  page.drawRectangle({
    x: boxX + 4 * SCALE,
    y: boxY - 4 * SCALE,
    width: boxSize,
    height: boxSize,
    color: rgb(0.04, 0.04, 0.06),
  });
  // Border (drawn as a slightly larger black rect underneath, then white inset)
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxSize,
    height: boxSize,
    color: rgb(0.04, 0.04, 0.06),
  });
  page.drawRectangle({
    x: boxX + 2 * SCALE,
    y: boxY + 2 * SCALE,
    width: boxSize - 4 * SCALE,
    height: boxSize - 4 * SCALE,
    color: rgb(1, 1, 1),
  });

  // Embed QR code (high contrast, large render → scales down crisply)
  const qrDataUrl = await QRCode.toDataURL(input.qrUrl, {
    width: 600,
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  const qrBytes = dataUrlToBytes(qrDataUrl);
  const qrImg = await pdf.embedPng(qrBytes);
  page.drawImage(qrImg, {
    x: boxX + qrPad,
    y: boxY + qrPad,
    width: qrInner,
    height: qrInner,
  });

  // "↑ vors Handy halten ↑" eyebrow
  const caption = '^ VORS HANDY HALTEN ^';
  const captionW = fonts.mono.widthOfTextAtSize(caption, 8 * SCALE);
  page.drawText(caption, {
    x: (CARD_W - captionW) / 2,
    y: boxY - 18 * SCALE,
    size: 8 * SCALE,
    font: fonts.mono,
    color: ink,
    opacity: 0.6,
  });

  // Footer: instructions left, serial right
  const lostLine1 = 'Verloren? Mama oder Papa fragt';
  const lostLine2 = 'Marc - du bekommst eine neue.';
  page.drawText(lostLine1, {
    x: 14 * SCALE,
    y: 36 * SCALE,
    size: 7.5 * SCALE,
    font: fonts.body,
    color: rgb(0.23, 0.23, 0.25),
  });
  page.drawText(lostLine2, {
    x: 14 * SCALE,
    y: 26 * SCALE,
    size: 7.5 * SCALE,
    font: fonts.body,
    color: rgb(0.23, 0.23, 0.25),
  });

  // Serial right-aligned
  const serialLabel = 'NR.';
  const serialLabelSize = 7 * SCALE;
  const serialLabelW = fonts.mono.widthOfTextAtSize(serialLabel, serialLabelSize);
  page.drawText(serialLabel, {
    x: CARD_W - 14 * SCALE - serialLabelW,
    y: 36 * SCALE,
    size: serialLabelSize,
    font: fonts.mono,
    color: ink,
    opacity: 0.5,
  });
  // Serial number derived from the kid id (first 4 hex chars uppercased)
  const idShort = (input.kid.id || '').replace(/-/g, '').slice(0, 4).toUpperCase().padStart(4, '0');
  const serial = `${idShort}-S04`;
  const serialSize = 9 * SCALE;
  const serialW = fonts.monoBold.widthOfTextAtSize(serial, serialSize);
  page.drawText(serial, {
    x: CARD_W - 14 * SCALE - serialW,
    y: 24 * SCALE,
    size: serialSize,
    font: fonts.monoBold,
    color: ink,
  });
}

// ─────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────
export async function buildQrCardPdf(input: CardInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    stencil: await pdf.embedFont(StandardFonts.HelveticaBold),
    body: await pdf.embedFont(StandardFonts.Helvetica),
    bodyBold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.Courier),
    monoBold: await pdf.embedFont(StandardFonts.CourierBold),
  };

  const resolvedTone = input.kid.card_color_hex ?? '#DC2626';
  const teamName = (input.teamName ?? '').trim() || 'BEYARENA';

  const front = pdf.addPage([CARD_W, CARD_H]);
  await drawFront(front, fonts, input, resolvedTone, teamName);

  const back = pdf.addPage([CARD_W, CARD_H]);
  await drawBack(pdf, back, fonts, input, resolvedTone);

  return pdf.save();
}
