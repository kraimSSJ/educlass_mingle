import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import Pomodoro from './pages/Pomodoro';
import Notes from './pages/Notes';
import Rooms from './pages/Rooms';
import RoomPage from './pages/RoomPage';
import Social from './pages/Social';
import Profile from './pages/Profile';

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 px-3 py-4 pb-24 sm:px-5 md:p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/modules/:moduleId" element={<ModulePage />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:roomId" element={<RoomPage />} />
          <Route path="/social" element={<Social />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
