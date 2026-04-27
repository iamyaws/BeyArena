// BottomNav — fixed nav with the BX bottom-nav glass treatment.
// Layout matches .design-handoff/project/player.jsx (BottomNav).

import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Heim', icon: '⌂' },
  { to: '/tower', label: 'Turm', icon: '▲' },
  { to: '/profil', label: 'Karte', icon: '◆' },
  { to: '/feed', label: 'Feed', icon: '≡' },
];

export function BottomNav() {
  return (
    <nav
      className="bx-bottomnav fixed bottom-0 left-0 right-0 grid"
      style={{
        gridTemplateColumns: 'repeat(4, 1fr)',
        paddingTop: 8,
        paddingBottom: 24,
      }}
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center bg-transparent p-1 ${
              isActive ? 'text-bx-yellow' : 'text-white/40'
            }`
          }
          style={{ textDecoration: 'none', gap: 4 }}
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
