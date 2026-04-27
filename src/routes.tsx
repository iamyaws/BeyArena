import { Routes, Route } from 'react-router-dom';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { LogBattleFlow } from './pages/LogBattleFlow';
import { TowerPage } from './pages/TowerPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { FeedPage } from './pages/FeedPage';
import { KidRoute } from './components/auth/KidRoute';
import { AdminRoute } from './components/auth/AdminRoute';

// Placeholders — full pages added in later tasks
const Home = () => <div className="p-6">Home — coming in Task 49</div>;
const QrLogin = () => <div className="p-6">QR Login — Task 23</div>;
const Werkstatt = () => <div className="p-6">Werkstatt — Task 52</div>;

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <KidRoute>
            <Home />
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
      <Route path="/q/:token" element={<QrLogin />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/werkstatt/*"
        element={
          <AdminRoute>
            <Werkstatt />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
