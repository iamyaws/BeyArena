import { Routes, Route } from 'react-router-dom';

// Placeholders — full pages added in later tasks
const Home = () => <div className="p-6">Home — coming in Task 49</div>;
const Tower = () => <div className="p-6">Tower — Task 42</div>;
const Profile = () => <div className="p-6">Profile — Task 44</div>;
const Feed = () => <div className="p-6">Feed — Task 47</div>;
const LogBattle = () => <div className="p-6">Log — Task 31</div>;
const QrLogin = () => <div className="p-6">QR Login — Task 23</div>;
const AdminLogin = () => <div className="p-6">Admin Login — Task 21</div>;
const Werkstatt = () => <div className="p-6">Werkstatt — Task 52</div>;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tower" element={<Tower />} />
      <Route path="/profil" element={<Profile />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/log" element={<LogBattle />} />
      <Route path="/q/:token" element={<QrLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/werkstatt/*" element={<Werkstatt />} />
    </Routes>
  );
}
