// BottomNav — fixed nav with the BX bottom-nav glass treatment.
// Layout matches .design-handoff/project/player.jsx (BottomNav).
// Apple HIG: bottom inset must clear the iPhone home indicator. We use
// max(24px, env(safe-area-inset-bottom)) so non-notch devices still get
// generous breathing room AND iPhones don't drop the labels behind the
// indicator. Each tab is also padded to 44pt min tap height.

import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Heim', icon: '⌂' },
  { to: '/tower', label: 'Turm', icon: '▲' },
  { to: '/lab', label: 'Lab', icon: '⚗' },
  { to: '/profil', label: 'Karte', icon: '◆' },
  { to: '/feed', label: 'Feed', icon: '≡' },
];

export function BottomNav() {
  return (
    <nav
      className="bx-bottomnav fixed bottom-0 left-0 right-0 grid"
      style={{
        gridTemplateColumns: 'repeat(5, 1fr)',
        paddingTop: 8,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          aria-label={t.label}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center bg-transparent ${
              isActive ? 'text-bx-yellow' : 'text-white/40'
            }`
          }
          style={{
            textDecoration: 'none',
            gap: 4,
            // 44pt min tap height per HIG. Visible content stays compact
            // (icon + label) but the hit area extends.
            minHeight: 48,
            padding: '4px 0',
          }}
        >
          <div style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</div>
          <div
            className="bx-mono uppercase"
            style={{ fontSize: 9, letterSpacing: '0.12em' }}
          >
            {t.label}
          </div>
        </NavLink>
      ))}
    </nav>
  );
}
