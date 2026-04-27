import { Routes, Route } from 'react-router-dom';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { LogBattleFlow } from './pages/LogBattleFlow';
import { TowerPage } from './pages/TowerPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { FeedPage } from './pages/FeedPage';
import { HomePage } from './pages/HomePage';
import { QrLoginPage } from './pages/QrLoginPage';
import { KidRoute } from './components/auth/KidRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { WerkstattLayout } from './pages/werkstatt/WerkstattLayout';
import { KidsListPage } from './pages/werkstatt/KidsListPage';
import { CreateKidPage } from './pages/werkstatt/CreateKidPage';
import { KidDetailPage } from './pages/werkstatt/KidDetailPage';
import { DisputesPage } from './pages/werkstatt/DisputesPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <KidRoute>
            <HomePage />
          </KidRoute>
        }
      />
      <Route
        path="/tower"
        element={
          <KidRoute>
            <TowerPage />
          </KidRoute>
        }
      />
      <Route
        path="/profil"
        element={
          <KidRoute>
            <ProfilePage />
          </KidRoute>
        }
      />
      <Route
        path="/profil/:id"
        element={
          <KidRoute>
            <PublicProfilePage />
          </KidRoute>
        }
      />
      <Route
        path="/feed"
        element={
          <KidRoute>
            <FeedPage />
          </KidRoute>
        }
      />
      <Route
        path="/log"
        element={
          <KidRoute>
            <LogBattleFlow />
          </KidRoute>
        }
      />
      <Route path="/q/:token" element={<QrLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/werkstatt"
        element={
          <AdminRoute>
            <WerkstattLayout />
          </AdminRoute>
        }
      >
        <Route index element={<KidsListPage />} />
        <Route path="new" element={<CreateKidPage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path=":id" element={<KidDetailPage />} />
      </Route>
    </Routes>
  );
}
