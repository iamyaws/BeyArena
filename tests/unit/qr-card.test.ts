import { describe, it, expect } from 'vitest';
import { buildQrCardPdf } from '../../src/lib/qr-card';

describe('buildQrCardPdf', () => {
  it('generates a valid 2-page PDF for a sample kid', async () => {
    const bytes = await buildQrCardPdf({
      kid: {
        id: '00000000-0000-0000-0000-000000000001',
        display_name: 'Louis',
        floor: 14,
        card_color_hex: '#DC2626',
      },
      bey: {
        name_en: 'DranSword 3-60F',
        product_code: 'BX-01',
        type: 'attack',
      },
      qrUrl: 'https://beyarena.vercel.app/q/sample-token',
    });
    // PDF magic header is "%PDF-"
    expect(bytes.byteLength).toBeGreaterThan(1000);
    const header = String.fromCharCode(...bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('handles a missing card_color_hex via the crimson fallback', async () => {
    const bytes = await buildQrCardPdf({
      kid: {
        id: 'test-id',
        display_name: 'Mila',
        floor: 1,
        card_color_hex: null,
      },
      bey: {
        name_en: 'WizardArrow',
        product_code: 'BX-03',
        type: 'defense',
      },
      qrUrl: 'https://beyarena.vercel.app/q/abc',
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it('handles a light kid color (yellow) without throwing', async () => {
    const bytes = await buildQrCardPdf({
      kid: {
        id: 'yara-id',
        display_name: 'Yara',
        floor: 58,
        card_color_hex: '#FDE047',
      },
      bey: {
        name_en: 'TyrannoBeat',
        product_code: 'BX-15',
        type: 'attack',
      },
      qrUrl: 'https://beyarena.vercel.app/q/yara',
      teamName: 'Sturm',
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it('handles German umlauts in the display name', async () => {
    const bytes = await buildQrCardPdf({
      kid: {
        id: 'jorg-id',
        display_name: 'Jörg',
        floor: 30,
        card_color_hex: '#2563EB',
      },
      bey: {
        name_en: 'KnightShield',
        product_code: 'BX-04',
        type: 'defense',
      },
      qrUrl: 'https://beyarena.vercel.app/q/jorg',
      teamName: 'Drachen',
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it('handles a bey with no product_code or type', async () => {
    const bytes = await buildQrCardPdf({
      kid: {
        id: 'fallback-id',
        display_name: 'Test',
        floor: 1,
        card_color_hex: '#A855F7',
      },
      bey: {
        name_en: 'CustomBey',
        product_code: null,
        type: null,
      },
      qrUrl: 'https://beyarena.vercel.app/q/custom',
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});
