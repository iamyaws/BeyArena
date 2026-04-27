// PublicProfilePage — read-only profile of another kid (e.g. tapped from
// the Tower). Same hero card as ProfilePage, but the Sticker tab is hidden
// (per spec §8.3) and there's no climb hint or close button.

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useKidById } from '../hooks/useKid';
import { useFeed } from '../hooks/useBattles';
import { useAllBeys, useKidBeys } from '../hooks/useBeys';
import { Avatar } from '../components/ui/Avatar';
import { StatBar } from '../components/ui/StatBar';
import { PlayerCard } from '../components/profile/PlayerCard';
import { Bey } from '../components/bey/Bey';
import { beyVisualFromDb } from '../components/bey/beyVisual';

type Tab = 'karte' | 'sammlung' | 'kämpfe';

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: kid, isLoading, error } = useKidById(id ?? null);
  const { data: battles = [] } = useFeed('all');
  const { data: ownedBeys = [] } = useKidBeys(id ?? null);
  const { data: allBeys = [] } = useAllBeys();
  const [tab, setTab] = useState<Tab>('karte');

  const myBattles = useMemo(
    () => battles.filter((b) => b.winner_kid_id === id || b.loser_kid_id === id),
    [battles, id],
  );

  if (!id) return null;
  if (isLoading) {
    return (
      <div
        className="bx min-h-screen w-full flex items-center justify-center"
        style={{ background: 'var(--bx-ink)' }}
      >
        <div
          className="bx-mono"
          style={{
            color: 'var(--bx-mute)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontSize: 11,
          }}
        >
          Lade…
        </div>
      </div>
    );
  }
  if (error || !kid) {
    return (
      <div
        className="bx min-h-screen w-full flex items-center justify-center"
        style={{ background: 'var(--bx-ink)', padding: 32 }}
      >
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div className="bx-display" style={{ fontSize: 28, color: 'var(--bx-crimson)' }}>
            Ohh nein.
          </div>
          <p
            className="bx-mono"
            style={{ marginTop: 12, fontSize: 12, color: 'var(--bx-mute)' }}
          >
            Spieler nicht gefunden.
          </p>
        </div>
      </div>
    );
  }

  const wins = myBattles.filter(
    (b) => b.status === 'confirmed' && b.winner_kid_id === id,
  ).length;
  const losses = myBattles.filter(
    (b) => b.status === 'confirmed' && b.loser_kid_id === id,
  ).length;

  const ownedIds = new Set(ownedBeys.map((b) => b.id));
  const fallbackOwned = ownedIds.size === 0 ? allBeys.slice(0, 3) : [];
  const fallbackOwnedIds = new Set(fallbackOwned.map((b) => b.id));
  const collection = allBeys.map((b) => ({
    bey: b,
    owned: ownedIds.has(b.id) || fallbackOwnedIds.has(b.id),
  }));
  const ownedCount = collection.filter((c) => c.owned).length;

  const tone = kid.card_color_hex ?? '#DC2626';

  return (
    <div
      className="bx min-h-screen w-full"
      style={{
        background: `radial-gradient(120% 60% at 50% 0%, ${tone}26 0%, var(--bx-ink) 50%)`,
        paddingBottom: 24,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '12px 18px' }}
      >
        <div className="bx-eyebrow">Spieler-Karte</div>
      </div>

      <div className="px-[18px] pt-1">
        <PlayerCard kid={kid} wins={wins} losses={losses} />
      </div>

      {/* Tabs — Sammlung + Kämpfe only (Sticker hidden per spec) */}
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

      {/* TAB: Karte (Stärken only — sticker tray hidden on public profiles) */}
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
        </div>
      )}

      {/* TAB: Sammlung */}
      {tab === 'sammlung' && (
        <div className="px-[18px] pt-3.5">
          <div className="flex justify-between items-center mb-2.5">
            <div className="bx-eyebrow">
              Beys · {ownedCount}/{collection.length}
            </div>
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}
          >
            {collection.map(({ bey, owned }) => (
              <div
                key={bey.id}
                style={{
                  background: owned ? '#13141b' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${owned ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Kämpfe */}
      {tab === 'kämpfe' && (
        <div className="px-[18px] pt-3.5">
          {myBattles.length === 0 && (
            <div
              className="text-center"
              style={{ color: 'var(--bx-mute)', fontSize: 13, padding: 30 }}
            >
              Noch keine Kämpfe.
            </div>
          )}
          {myBattles.map((b) => {
            const won = b.winner_kid_id === id;
            const myScore = won ? b.winner_score : b.loser_score;
            const oppScore = won ? b.loser_score : b.winner_score;
            return (
              <div
                key={b.id}
                className="bx-card flex items-center gap-3 mb-2"
                style={{
                  padding: 12,
                  borderLeft: `3px solid ${won ? '#22c55e' : '#DC2626'}`,
                }}
              >
                <Avatar kid={kid} size={36} />
                <div className="flex-1">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {won ? 'Gewonnen' : 'Verloren'}
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
      )}
    </div>
  );
}
