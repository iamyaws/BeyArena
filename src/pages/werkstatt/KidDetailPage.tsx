import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useKidById } from '../../hooks/useKid';
import { supabase } from '../../lib/supabase';
import { generateToken, buildQrCardPdf, type CardBey } from '../../lib/qr-card';

const FALLBACK_BEY: CardBey = {
  name_en: 'DranSword 3-60F',
  product_code: 'BX-01',
  type: 'attack',
};

function useTotalBattles(kidId: string | null) {
  return useQuery({
    queryKey: ['kid', kidId, 'total-battles'],
    queryFn: async () => {
      if (!kidId) return 0;
      const { count, error } = await supabase
        .from('battles')
        .select('id', { count: 'exact', head: true })
        .or(`winner_kid_id.eq.${kidId},loser_kid_id.eq.${kidId}`)
        .eq('status', 'confirmed');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!kidId,
  });
}

/**
 * Look up the kid's primary bey via kid_beys → beys. Falls back to the seed
 * default (DranSword BX-01) if no nickname/primary entry exists yet — matches
 * the CreateKidPage seed behaviour.
 */
async function fetchPrimaryBey(kidId: string): Promise<CardBey> {
  const { data: kidBey } = await supabase
    .from('kid_beys')
    .select('bey_id')
    .eq('kid_id', kidId)
    .order('acquired_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (kidBey?.bey_id) {
    const { data: bey } = await supabase
      .from('beys')
      .select('name_en, product_code, type')
      .eq('id', kidBey.bey_id)
      .maybeSingle();
    if (bey) {
      return { name_en: bey.name_en, product_code: bey.product_code, type: bey.type };
    }
  }

  // Fall back to BX-01 from the seed library
  const { data: seed } = await supabase
    .from('beys')
    .select('name_en, product_code, type')
    .eq('product_code', 'BX-01')
    .maybeSingle();
  if (seed) {
    return { name_en: seed.name_en, product_code: seed.product_code, type: seed.type };
  }
  return FALLBACK_BEY;
}

export function KidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: kid, isLoading, error: queryError } = useKidById(id ?? null);
  const { data: totalBattles = 0 } = useTotalBattles(id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function regenerate() {
    if (!kid) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const { token, tokenHash } = await generateToken();
      const { error: updateError } = await supabase
        .from('kids')
        .update({ token_hash: tokenHash })
        .eq('id', kid.id);
      if (updateError) throw updateError;

      const qrUrl = `${window.location.origin}/q/${token}`;
      const bey = await fetchPrimaryBey(kid.id);
      const pdfBytes = await buildQrCardPdf({
        kid: {
          id: kid.id,
          display_name: kid.display_name,
          floor: kid.floor,
          card_color_hex: kid.card_color_hex,
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
      a.download = `karte-${kid.display_name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; hint?: string };
      const msg =
        e?.message ?? (typeof err === 'string' ? err : JSON.stringify(err));
      const code = e?.code ? ` (${e.code})` : '';
      const looksLikeJwtExpired =
        /jwt|expired|invalid.*token/i.test(msg) || e?.code === 'PGRST301';
      setError(
        looksLikeJwtExpired
          ? 'Session abgelaufen. Bitte neu einloggen.'
          : `${msg}${code}`,
      );
      // eslint-disable-next-line no-console
      console.error('Token regenerate failed:', err);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <div className="text-sm opacity-50">Lade...</div>;
  }
  if (queryError) {
    const msg = queryError instanceof Error ? queryError.message : 'Fehler beim Laden';
    return <div className="text-sm text-red-400">{msg}</div>;
  }
  if (!kid) {
    return (
      <div className="space-y-3">
        <div className="text-sm opacity-50">Spieler nicht gefunden.</div>
        <Link to="/werkstatt" className="text-bx-yellow text-sm">
          ← Zurück
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/werkstatt" className="text-bx-yellow text-sm">
        ← Zurück
      </Link>
      <h2 className="text-lg font-bold">{kid.display_name}</h2>
      <dl className="grid grid-cols-3 gap-3 bg-zinc-900 p-3 rounded">
        <div>
          <dt className="text-xs opacity-50">Etage</dt>
          <dd className="text-lg font-bold">{kid.floor}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-50">ELO</dt>
          <dd className="text-lg font-bold">{kid.elo}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-50">Battles</dt>
          <dd className="text-lg font-bold">{totalBattles}</dd>
        </div>
      </dl>
      <div className="space-y-2">
        <button
          onClick={regenerate}
          disabled={busy}
          className="w-full p-3 bg-bx-yellow text-black font-bold rounded disabled:opacity-30"
        >
          {busy ? 'Erstelle...' : 'Karte neu generieren + drucken'}
        </button>
        <p className="text-xs opacity-50">
          Erstellt einen neuen Token. Der alte Token wird ungültig.
        </p>
      </div>
      {success && (
        <div className="text-sm text-green-400">
          Neue Karte erstellt und heruntergeladen.
        </div>
      )}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
