// ProfilePage — kid's own trading-card profile.
// Visual structure ported from .design-handoff/project/player.jsx
// (PlayerScreen). Three tabs: Karte (Stärken+Sticker), Sammlung (Beys),
// Kämpfe (recent battles). Bey detail opens as a bottom sheet.
//
// Real data:
//   - useCurrentKid() for the hero
//   - useFeed('mine') for battle history + win/loss counts
//   - useAllKids() for the climb hint ("Mila ist 3 Etagen über dir")
//   - useKidBeys() + useAllBeys() for the collection grid (locked + owned)

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentKid, useAllKids } from '../hooks/useKid';
import { useFeed } from '../hooks/useBattles';
import { useAllBeys, useKidBeys } from '../hooks/useBeys';
import { useSession } from '../stores/session';
import { Avatar } from '../components/ui/Avatar';
import { StatBar } from '../components/ui/StatBar';
import { PlayerCard } from '../components/profile/PlayerCard';
import { Bey } from '../components/bey/Bey';
import { beyVisualFromDb } from '../components/bey/beyVisual';
import type { Bey as DbBey, Battle } from '../lib/types';

type Tab = 'karte' | 'sammlung' | 'kämpfe';

export function ProfilePage() {
  const { kid: session } = useSession();
  const { data: kid } = useCurrentKid();
  const { data: kids = [] } = useAllKids();
  const { data: battles = [] } = useFeed('mine');
  const { data: ownedBeys = [] } = useKidBeys(session?.id);
  const { data: allBeys = [] } = useAllBeys();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('karte');
  const [openBeyId, setOpenBeyId] = useState<string | null>(null);

  // Streak heuristic (mirrors HomePage): walk recent confirmed battles.
  const streak = useMemo(() => {
    if (!session) return 0;
    let s = 0;
    for (const b of battles) {
      if (b.status !== 'confirmed') continue;
      if (b.winner_kid_id === session.id) s++;
      else if (b.loser_kid_id === session.id) break;
    }
    return s;
  }, [battles, session]);

  if (!kid || !session) return null;

  const wins = battles.filter(
    (b) => b.status === 'confirmed' && b.winner_kid_id === session.id,
  ).length;
  const losses = battles.filter(
    (b) => b.status === 'confirmed' && b.loser_kid_id === session.id,
  ).length;

  const aboveMe = kids.filter((k) => k.floor > kid.floor).sort((a, b) => a.floor - b.floor);
  const next = aboveMe[0];

  // Collection: union of catalog + owned, marking ownership. Owned beys come
  // from kid_beys; everything else in the catalog renders locked. v1 fallback:
  // if kid_beys is empty for this kid, treat the first 3 catalog beys as
  // "starter" so the page isn't all locks. TODO: replace with real acquisition
  // once the trading flow lands.
  const ownedIds = new Set(ownedBeys.map((b) => b.id));
  const fallbackOwned = ownedIds.size === 0 ? allBeys.slice(0, 3) : [];
  const fallbackOwnedIds = new Set(fallbackOwned.map((b) => b.id));
  const collection = allBeys.map((b) => ({
    bey: b,
    owned: ownedIds.has(b.id) || fallbackOwnedIds.has(b.id),
  }));
  const ownedCount = collection.filter((c) => c.owned).length;
  const openBey = collection.find((c) => c.bey.id === openBeyId)?.bey ?? null;

  const tone = kid.card_color_hex ?? '#DC2626';

  return (
    <div
      className="bx min-h-screen w-full relative"
      style={{
        background: `radial-gradient(120% 60% at 50% 0%, ${tone}26 0%, var(--bx-ink) 50%)`,
        paddingBottom: 100,
      }}
    >
      {/* Top bar */}
      <div
        className="sticky z-10 flex items-center justify-between"
        style={{
          top: 0,
          padding: '12px 18px',
          background:
            'linear-gradient(to bottom, rgba(7,7,10,0.9), rgba(7,7,10,0))',
        }}
      >
        <div className="bx-eyebrow">Meine Karte</div>
        <button
          onClick={() => nav('/')}
          aria-label="Schließen"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Hero card */}
      <div className="px-[18px] pt-1">
        <PlayerCard
          kid={kid}
          wins={wins}
          losses={losses}
          streak={streak}
        />
      </div>

      {/* Climb hint */}
      {next && (
        <div className="px-[18px] pt-3.5">
          <div
            className="bx-card flex items-center gap-3"
            style={{
              padding: 12,
              borderColor: 'rgba(37,99,235,0.4)',
              background: 'linear-gradient(90deg, rgba(37,99,235,0.16), transparent)',
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(37,99,235,0.2)',
                color: 'var(--bx-cobalt)',
              }}
            >
              👁
            </div>
            <div className="flex-1" style={{ fontSize: 13, lineHeight: 1.35 }}>
              <strong>{next.display_name}</strong> ist nur noch{' '}
              <span style={{ color: 'var(--bx-yellow)', fontWeight: 700 }}>
                {next.floor - kid.floor} Etage
                {next.floor - kid.floor === 1 ? '' : 'n'}
              </span>{' '}
              über dir.
            </div>
            <div className="bx-mono" style={{ fontSize: 9, color: 'var(--bx-mute)' }}>
              ↑
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-[18px] pt-5">
        <div
          className="flex"
          style={{
            gap: 4,
            padding: 4,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
          }}
        >
          {(
            [
              { id: 'karte', label: 'KARTE' },
              { id: 'sammlung', label: 'SAMMLUNG' },
              { id: 'kämpfe', label: 'KÄMPFE' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 8,
                border: 'none',
                fontFamily: 'Saira Stencil One, sans-serif',
                fontSize: 12,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                background: tab === t.id ? 'var(--bx-yellow)' : 'transparent',
                color: tab === t.id ? '#07070A' : 'rgba(255,255,255,0.6)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: Karte (back of trading card — Stärken + Sticker) */}
      {tab === 'karte' && (
        <div className="px-[18px] pt-3.5">
          <div className="bx-card" style={{ padding: 16 }}>
            <div className="bx-eyebrow mb-2">Stärken</div>
            <StatBar label="ANGRF" value={9} color="#DC2626" />
            <div style={{ height: 6 }} />
            <StatBar label="VERT" value={6} color="#2563EB" />
            <div style={{ height: 6 }} />
            <StatBar label="AUSDR" value={7} color="#10B981" />
            <div style={{ height: 6 }} />
            <StatBar label="GLÜCK" value={8} color="#FDE047" />
          </div>

          <div className="bx-card" style={{ padding: 16, marginTop: 12 }}>
            <div className="bx-eyebrow" style={{ marginBottom: 10 }}>
              Sticker
            </div>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {[
                { e: '🔥', l: 'Heißer Lauf' },
                { e: '⚡', l: 'Blitzstart' },
                { e: '🛡', l: 'Mauer' },
                { e: '🎯', l: 'Treffsicher' },
                ...(kid.floor >= 90 ? [{ e: '👑', l: 'Etage 90+' }] : []),
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex items-center"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    fontSize: 11,
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{s.e}</span>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Sammlung */}
      {tab === 'sammlung' && (
        <div className="px-[18px] pt-3.5">
          <div className="flex justify-between items-center mb-2.5">
            <div className="bx-eyebrow">
              Meine Beys · {ownedCount}/{collection.length}
            </div>
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}
          >
            {collection.map(({ bey, owned }) => (
              <button
                key={bey.id}
                onClick={() => owned && setOpenBeyId(bey.id)}
                style={{
                  background: owned ? '#13141b' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${owned ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  cursor: owned ? 'pointer' : 'default',
                  opacity: owned ? 1 : 0.35,
                  position: 'relative',
                }}
              >
                {owned ? (
                  <Bey bey={beyVisualFromDb(bey)} size={56} />
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      border: '1px dashed rgba(255,255,255,0.15)',
                      fontSize: 18,
                      color: 'var(--bx-mute-2)',
                    }}
                  >
                    🔒
                  </div>
                )}
                <div
                  style={{ fontSize: 11, fontWeight: 600, textAlign: 'center' }}
                >
                  {bey.name_en}
                </div>
                <div
                  className="bx-mono"
                  style={{ fontSize: 8, color: 'var(--bx-mute-2)' }}
                >
                  {bey.product_code ?? '—'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Kämpfe */}
      {tab === 'kämpfe' && (
        <BattlesList battles={battles} myKidId={session.id} kids={kids} />
      )}

      {/* Bey detail sheet */}
      {openBey && (
        <BeyDetailSheet bey={openBey} onClose={() => setOpenBeyId(null)} />
      )}

      {/* FAB: log a battle */}
      <button
        onClick={() => nav('/log')}
        aria-label="Schlacht eintragen"
        className="absolute"
        style={{
          right: 18,
          bottom: 86,
          width: 56,
          height: 56,
          borderRadius: 18,
          background: 'var(--bx-yellow)',
          color: '#07070A',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 12px 32px -8px rgba(253,224,71,0.6)',
          fontSize: 26,
          fontFamily: 'Saira Stencil One, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⚔
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Battles list (Kämpfe tab) — extracted so the file stays readable.
// ───────────────────────────────────────────────────────────────
function BattlesList({
  battles,
  myKidId,
  kids,
}: {
  battles: Battle[];
  myKidId: string;
  kids: Array<{ id: string; display_name: string; card_color_hex: string | null }>;
}) {
  if (battles.length === 0) {
    return (
      <div
        className="px-[18px] pt-3.5 text-center"
        style={{ color: 'var(--bx-mute)', fontSize: 13, padding: 30 }}
      >
        Noch keine Kämpfe.
      </div>
    );
  }
  return (
    <div className="px-[18px] pt-3.5">
      {battles.map((b) => {
        const oppId = b.winner_kid_id === myKidId ? b.loser_kid_id : b.winner_kid_id;
        const opp = kids.find((k) => k.id === oppId);
        const won = b.winner_kid_id === myKidId;
        const myScore = won ? b.winner_score : b.loser_score;
        const oppScore = won ? b.loser_score : b.winner_score;
        if (!opp) return null;
        return (
          <div
            key={b.id}
            className="bx-card flex items-center gap-3 mb-2"
            style={{
              padding: 12,
              borderLeft: `3px solid ${won ? '#22c55e' : '#DC2626'}`,
            }}
          >
            <Avatar kid={opp} size={36} />
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {won ? 'Gewonnen vs.' : 'Verloren gegen'} {opp.display_name}
              </div>
              <div
                className="bx-mono"
                style={{ fontSize: 10, color: 'var(--bx-mute-2)', marginTop: 2 }}
              >
                {b.status === 'pending'
                  ? 'Wartet…'
                  : b.status === 'voided'
                    ? 'Strittig'
                    : 'Bestätigt'}
              </div>
            </div>
            <div
              className="bx-display"
              style={{ fontSize: 22, color: won ? '#fff' : 'var(--bx-mute)' }}
            >
              {myScore}–{oppScore}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Bey detail sheet — full-width bottom sheet that slides up.
// ───────────────────────────────────────────────────────────────
function BeyDetailSheet({ bey, onClose }: { bey: DbBey; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full"
        style={{
          background: '#13141b',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px 24px 0 0',
          padding: 24,
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 999,
            margin: '0 auto 16px',
          }}
        />
        <div className="flex items-center" style={{ gap: 14 }}>
          <Bey bey={beyVisualFromDb(bey)} size={72} spin />
          <div className="flex-1">
            <div
              className="bx-mono"
              style={{ fontSize: 9, color: 'var(--bx-mute)' }}
            >
              {bey.product_code ?? '—'}
              {bey.type ? ` · ${bey.type.toUpperCase()}` : ''}
            </div>
            <div
              className="bx-display"
              style={{ fontSize: 24, marginTop: 2 }}
            >
              {bey.name_en.toUpperCase()}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <StatBar label="ATK" value={bey.stat_attack ?? 0} color="#DC2626" />
          <div style={{ height: 6 }} />
          <StatBar label="VERT" value={bey.stat_defense ?? 0} color="#2563EB" />
          <div style={{ height: 6 }} />
          <StatBar label="STAM" value={bey.stat_stamina ?? 0} color="#10B981" />
          <div style={{ height: 6 }} />
          <StatBar
            label="BURST"
            value={bey.stat_burst_resistance ?? 0}
            color="#FDE047"
          />
        </div>
        <button
          onClick={onClose}
          className="bx-btn bx-btn-ghost"
          style={{ width: '100%', marginTop: 16 }}
        >
          schließen
        </button>
      </div>
    </div>
  );
}
