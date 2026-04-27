import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateToken, buildQrCardPdf, type CardBey } from '../../lib/qr-card';

// Hard fallback if the seed bey row is missing — the front of the card always
// needs *something* to draw. DranSword (BX-01) is the canonical starter bey.
const FALLBACK_BEY: CardBey = {
  name_en: 'DranSword 3-60F',
  product_code: 'BX-01',
  type: 'attack',
};

async function fetchDefaultBey(): Promise<CardBey> {
  const { data } = await supabase
    .from('beys')
    .select('name_en, product_code, type')
    .eq('product_code', 'BX-01')
    .maybeSingle();
  if (data) {
    return {
      name_en: data.name_en,
      product_code: data.product_code,
      type: data.type,
    };
  }
  return FALLBACK_BEY;
}

export function CreateKidPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { token, tokenHash } = await generateToken();
      const { data, error: insertError } = await supabase
        .from('kids')
        .insert({
          display_name: name,
          token_hash: tokenHash,
        })
        .select('id, display_name, floor, card_color_hex')
        .single();
      if (insertError) throw insertError;
      if (!data) throw new Error('Insert returned no data');

      const qrUrl = `${window.location.origin}/q/${token}`;
      const bey = await fetchDefaultBey();
      const pdfBytes = await buildQrCardPdf({
        kid: {
          id: data.id,
          display_name: data.display_name,
          floor: data.floor,
          card_color_hex: data.card_color_hex,
        },
        bey,
        qrUrl,
      });
      // pdf-lib returns Uint8Array; copy into a fresh ArrayBuffer-backed view for Blob (TS 5.6+ strict).
      const pdfBuffer = pdfBytes.slice().buffer;
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `karte-${data.display_name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      nav('/werkstatt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Neuer Spieler</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Display name"
        className="w-full p-2 bg-zinc-800 rounded"
      />
      <button
        onClick={create}
        disabled={!name || busy}
        className="p-3 bg-bx-yellow text-black font-bold rounded disabled:opacity-30"
      >
        Anlegen + Karte drucken
      </button>
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
