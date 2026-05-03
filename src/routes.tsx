import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { LogBattleFlow } from './pages/LogBattleFlow';
import { TowerPage } from './pages/TowerPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { FeedPage } from './pages/FeedPage';
import { HomePage } from './pages/HomePage';
import { LabTab } from './components/lab/LabTab';
import { QrLoginPage } from './pages/QrLoginPage';
import { KidRoute } from './components/auth/KidRoute';
import { AdminRoute } from './components/auth/AdminRoute';

// Werkstatt admin routes are lazy-loaded so kids don't download the
// pdf-lib + qrcode payload that only admins use.
const WerkstattLayout = lazy(() =>
  import('./pages/werkstatt/WerkstattLayout').then((m) => ({ default: m.WerkstattLayout })),
);
const KidsListPage = lazy(() =>
  import('./pages/werkstatt/KidsListPage').then((m) => ({ default: m.KidsListPage })),
);
const CreateKidPage = lazy(() =>
  import('./pages/werkstatt/CreateKidPage').then((m) => ({ default: m.CreateKidPage })),
);
const KidDetailPage = lazy(() =>
  import('./pages/werkstatt/KidDetailPage').then((m) => ({ default: m.KidDetailPage })),
);
const DisputesPage = lazy(() =>
  import('./pages/werkstatt/DisputesPage').then((m) => ({ default: m.DisputesPage })),
);

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
        path="/lab"
        element={
          <KidRoute>
            <LabTab />
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
      {/* Both routes render the same component; QrLoginPage detects token absence
          via useParams() and shows the "Karte hier hin" idle state when missing.
          Without the /q variant, KidRoute's redirect-to-/q would land on a blank
          page. */}
      <Route path="/q" element={<QrLoginPage />} />
      <Route path="/q/:token" element={<QrLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/werkstatt"
        element={
          <AdminRoute>
            <Suspense fallback={<div className="p-6">Lade...</div>}>
              <WerkstattLayout />
            </Suspense>
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
