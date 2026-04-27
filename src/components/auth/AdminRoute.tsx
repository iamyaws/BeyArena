import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
