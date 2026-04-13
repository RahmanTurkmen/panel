import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';

export default function LoginPage({ isAuthenticated, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hotelName, setHotelName] = useState('Lizbon Otel');

  useEffect(() => {
    api.settings().then((s) => { if (s?.hotel_name) setHotelName(s.hotel_name); }).catch(() => {});
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (loginError) {
      setError(loginError.message || 'Kullanıcı adı veya şifre geçersiz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-layout">
          <div className="login-side">
            <div className="login-brand">{hotelName}</div>
            <h1>Apart Otel Programı</h1>
            <p className="login-subtitle">ön büro, kasa ve raporlama yönetimi</p>
            <div className="login-security-note">Kurumsal erişim paneli - sadece yetkili kullanıcılar için.</div>
            <ul className="login-highlights">
              <li>Güvenli oturum ve rol tabanlı erişim</li>
              <li>Room rack, rezervasyon ve kasa ekranları</li>
              <li>Gerçek zamanlı oda durum takibi</li>
            </ul>
            <div className="login-meta-grid">
              <div className="login-meta-item">
                <span>Modül</span>
                <strong>Front Office</strong>
              </div>
              <div className="login-meta-item">
                <span>Altyapı</span>
                <strong>Bulut Senkron</strong>
              </div>
            </div>
          </div>

          <div className="login-form-wrap">

            <form onSubmit={submit}>
              <label>Kullanıcı adı</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Kullanıcı adınız" />

              <label>Şifre</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Şifreniz" />

              {error ? <div className="login-error">{error}</div> : null}

              <button type="submit" className="btn login-btn" disabled={loading}>
                {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
              </button>
            </form>
            <p className="login-footer-note">Tüm işlemler güvenlik kayıtlarına otomatik olarak işlenir.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
