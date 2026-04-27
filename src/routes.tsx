import { Routes, Route } from 'react-router-dom';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { LogBattleFlow } from './pages/LogBattleFlow';
import { KidRoute } from './components/auth/KidRoute';
import { AdminRoute } from './components/auth/AdminRoute';

// Placeholders — full pages added in later tasks
const Home = () => <div className="p-6">Home — coming in Task 49</div>;
const Tower = () => <div className="p-6">Tower — Task 42</div>;
const Profile = () => <div className="p-6">Profile — Task 44</div>;
const Feed = () => <div className="p-6">Feed — Task 47</div>;
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
            <Tower />
          </KidRoute>
        }
      />
      <Route
        path="/profil"
        element={
          <KidRoute>
            <Profile />
          </KidRoute>
        }
      />
      <Route
        path="/feed"
        element={
          <KidRoute>
            <Feed />
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
