import { Link, NavLink, Outlet } from 'react-router-dom';

export function WerkstattLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <header className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Werkstatt</h1>
        <Link to="/admin/login" className="text-sm opacity-60">
          Logout
        </Link>
      </header>
      <nav className="flex gap-3 mb-6 border-b border-zinc-800 pb-2">
        <NavLink
          to="/werkstatt"
          end
          className={({ isActive }) => (isActive ? 'text-bx-yellow' : 'opacity-60')}
        >
          Spieler
        </NavLink>
        <NavLink
          to="/werkstatt/disputes"
          className={({ isActive }) => (isActive ? 'text-bx-yellow' : 'opacity-60')}
        >
          Disputes
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
