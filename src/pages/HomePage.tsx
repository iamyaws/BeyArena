// HomePage — kid's daily dashboard.
// Greeting + ELO/Etage/Streak triple-stat + big yellow CTA + mini-feed +
// motivator "X ist N Etagen über dir" hint. Restyled to match the design's
// arcade-tournament vibe (.design-handoff/project/player.jsx hero card).

import { Link } from 'react-router-dom';
import { useCurrentKid, useAllKids } from '../hooks/useKid';
import { useFeed } from '../hooks/useBattles';
import { Avatar } from '../components/ui/Avatar';

export function HomePage() {
  const { data: kid, isLoading, error } = useCurrentKid();
  const { data: kids = [] } = useAllKids();
  const { data: feed = [] } = useFeed('all');

  // While the kid query is pending we can't render the dashboard. Show a
  // small Lade… placeholder rather than a blank screen — the kid hook is
  // gated on a session that hydrates synchronously from localStorage so this
  // is usually a quick flash, but a network hiccup or schema mismatch can
  // otherwise leave HomePage rendering nothing.
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
            Wir konnten dich nicht finden. Frag Marc nach einer neuen Karte.
          </p>
        </div>
      </div>
    );
  }

  const aboveMe = kids.filter((k) => k.elo > kid.elo).sort((a, b) => a.elo - b.elo);
  const next = aboveMe[0];
  const gap = next ? next.floor - kid.floor : 0;

  // Streak: count consecutive recent confirmed battles where this kid was the winner,
  // walking backwards through the feed. Cheap heuristic that works well enough for
  // a "today" dashboard hint without a dedicated stat in the schema.
  let streak = 0;
  for (const b of feed) {
    if (b.status !== 'confirmed') continue;
    if (b.winner_kid_id === kid.id) streak++;
    else if (b.loser_kid_id === kid.id) {
      streak = -streak === 0 ? -1 : streak;
      break;
    }
  }

  const tone = kid.card_color_hex ?? '#DC2626';

  return (
    <div
      className="bx min-h-screen w-full"
      style={{
        background: `radial-gradient(120% 60% at 50% 0%, ${tone}26 0%, var(--bx-ink) 50%)`,
        paddingBottom: 24,
      }}
    >
      {/* Top bar — eyebrow */}
      <div className="px-5 pt-4 flex items-center justify-between">
        <div className="bx-eyebrow">Heute · Saison 04</div>
        <Link
          to="/profil"
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Avatar kid={kid} size={26} />
        </Link>
      </div>

      {/* Hero greeting */}
      <div className="px-5 pt-3">
        <div
          className="bx-display"
          style={{ fontSize: 44, lineHeight: 0.9, letterSpacing: '0.01em' }}
        >
          HI {kid.display_name.toUpperCase()}
          <span style={{ color: 'var(--bx-yellow)' }}>!</span>
        </div>
        {kid.tagline && (
          <div
            className="bx-mono italic"
            style={{
              marginTop: 8,
              fontSize: 12,
              letterSpacing: '0.04em',
              color: 'var(--bx-yellow)',
            }}
          >
            &quot;{kid.tagline}&quot;
          </div>
        )}
      </div>

      {/* Triple stats */}
      <div className="px-5 pt-5">
        <div
          className="grid grid-cols-3 overflow-hidden"
          style={{
            gap: 1,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10,
          }}
        >
          {[
            { label: 'ETAGE', value: String(kid.floor) },
            { label: 'ELO', value: String(kid.elo) },
            {
              label: 'STREAK',
              value: streak > 0 ? `+${streak}` : streak === 0 ? '—' : String(streak),
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{ background: '#0c0d12', padding: '12px 8px', textAlign: 'center' }}
            >
              <div className="bx-display" style={{ fontSize: 24 }}>
                {s.value}
              </div>
              <div className="bx-eyebrow" style={{ marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary CTA */}
      <div className="px-5 pt-5">
        <Link
          to="/log"
          className="bx-btn bx-btn-yellow"
          style={{ width: '100%', fontSize: 18, padding: '18px' }}
        >
          ⚔ Was war heute?
        </Link>
      </div>

      {/* Climb hint — motivator card */}
      {next && (
        <div className="px-5 pt-4">
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
                {gap} Etage{gap === 1 ? '' : 'n'}
              </span>{' '}
              über dir.
            </div>
            <div
              className="bx-mono"
              style={{ fontSize: 9, color: 'var(--bx-mute)' }}
            >
              ↑
            </div>
          </div>
        </div>
      )}

      {/* Mini feed */}
      <div className="px-5 pt-5">
        <div className="bx-eyebrow mb-2">Was geht ab?</div>
        {feed.length === 0 && (
          <div
            className="bx-card text-center"
            style={{ padding: 20, color: 'var(--bx-mute)', fontSize: 13 }}
          >
            Noch nichts heute. Trag deine erste Schlacht ein.
          </div>
        )}
        {feed.slice(0, 3).map((b) => (
          <Link
            key={b.id}
            to="/feed"
            className="bx-card flex items-center gap-3 mb-2"
            style={{ padding: 12 }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background:
                  b.status === 'confirmed'
                    ? 'rgba(34,197,94,0.16)'
                    : b.status === 'pending'
                      ? 'rgba(253,224,71,0.16)'
                      : 'rgba(220,38,38,0.16)',
                color:
                  b.status === 'confirmed'
                    ? '#22c55e'
                    : b.status === 'pending'
                      ? 'var(--bx-yellow)'
                      : 'var(--bx-crimson)',
                fontSize: 14,
              }}
            >
              {b.status === 'confirmed' ? '✓' : b.status === 'pending' ? '⏳' : '🚩'}
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Schlacht{' '}
                {b.status === 'confirmed'
                  ? 'bestätigt'
                  : b.status === 'pending'
                    ? 'wartet'
                    : 'gestrichen'}
              </div>
              <div
                className="bx-mono"
                style={{ fontSize: 10, color: 'var(--bx-mute-2)', marginTop: 2 }}
              >
                {b.winner_score}-{b.loser_score}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
