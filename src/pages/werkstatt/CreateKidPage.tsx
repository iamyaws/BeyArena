import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateToken, buildQrCardPdf } from '../../lib/qr-card';

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
        .select('id, display_name')
        .single();
      if (insertError) throw insertError;
      if (!data) throw new Error('Insert returned no data');

      const qrUrl = `${window.location.origin}/q/${token}`;
      const pdfBytes = await buildQrCardPdf(data.display_name, qrUrl);
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
