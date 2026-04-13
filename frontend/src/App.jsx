import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ReservationsPage from './pages/ReservationsPage';
import NewReservationPage from './pages/NewReservationPage';
import RoomRackPage from './pages/RoomRackPage';
import RoomStatusPage from './pages/RoomStatusPage';
import CashDailyPage from './pages/CashDailyPage';
import CashGeneralPage from './pages/CashGeneralPage';
import ProfitLossPage from './pages/ProfitLossPage';
import ForecastPage from './pages/ForecastPage';
import RoomDefinitionsPage from './pages/RoomDefinitionsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

function PrivateRoutes({ user, onLogout }) {
  const [openingPage, setOpeningPage] = useState('Ana Ekran');
  const [hotelName, setHotelName] = useState('Lizbon Otel');

  const loadSettings = () => {
    if (!user) return;
    api.settings().then((settings) => {
      setOpeningPage(settings.opening_page);
      if (settings.hotel_name) setHotelName(settings.hotel_name);
    }).catch(() => {
      setOpeningPage('Ana Ekran');
    });
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout user={user} onLogout={onLogout} hotelName={hotelName}>
      <Routes>
        <Route path="/" element={openingPage === 'Room rack' ? <RoomRackPage /> : <DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/rezervasyonlar" element={<ReservationsPage />} />
        <Route path="/rezervasyonlar/yeni" element={<NewReservationPage />} />
        <Route path="/room-rack" element={<RoomRackPage />} />
        <Route path="/oda-durumu" element={<RoomStatusPage />} />
        <Route path="/kasa/gunluk" element={<CashDailyPage />} />
        <Route path="/kasa/genel" element={<CashGeneralPage />} />
        <Route path="/kasa/kar-zarar" element={<ProfitLossPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
        <Route path="/oda-tanimlari" element={<RoomDefinitionsPage />} />
        <Route path="/ayarlar" element={<SettingsPage onSettingsSaved={loadSettings} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    setUser(res.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  if (authLoading) {
    return <div className="login-shell"><div className="login-panel"><p>Oturum kontrol ediliyor...</p></div></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage isAuthenticated={!!user} onLogin={login} />} />
      <Route path="*" element={<PrivateRoutes user={user} onLogout={logout} />} />
    </Routes>
  );
}
