// src/components/nav/BottomNav.tsx
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Heim', icon: '🏠' },
  { to: '/tower', label: 'Tower', icon: '🗼' },
  { to: '/profil', label: 'Karte', icon: '🃏' },
  { to: '/feed', label: 'Feed', icon: '📜' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 grid grid-cols-4">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `p-2 text-center text-xs ${isActive ? 'text-bx-yellow' : 'opacity-50'}`
          }
        >
          <div className="text-lg">{t.icon}</div>
          <div>{t.label}</div>
        </NavLink>
      ))}
    </nav>
  );
}
