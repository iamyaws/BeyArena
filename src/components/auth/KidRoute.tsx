import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function KidRoute({ children }: { children: React.ReactNode }) {
  const { kid } = useAuth();
  if (!kid) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
