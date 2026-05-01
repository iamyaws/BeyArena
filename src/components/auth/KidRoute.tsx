import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Kid-only route guard. Unauth'd visitors land on /q (the QR scan idle state) so
// they can scan their card. They are NOT redirected to /admin/login — kids don't
// have an admin login. Admins reach their gate via the dedicated /admin/login URL.
export function KidRoute({ children }: { children: React.ReactNode }) {
  const { kid } = useAuth();
  if (!kid) return <Navigate to="/q" replace />;
  return <>{children}</>;
}
