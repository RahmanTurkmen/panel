import { Link, useLocation } from 'react-router-dom';

const menuGroups = [
  {
    title: 'ANA EKRAN',
    items: [
      { label: 'Genel bakış', path: '/dashboard' }
    ]
  },
  {
    title: 'ÖN BÜRO',
    items: [
      { label: 'Rezervasyonlar', path: '/rezervasyonlar' },
      { label: 'Yeni rezervasyon', path: '/rezervasyonlar/yeni' },
      { label: 'Room rack', path: '/room-rack' },
      { label: 'Oda durumu', path: '/oda-durumu' }
    ]
  },
  {
    title: 'KASA',
    items: [
      { label: 'Günlük kasa', path: '/kasa/gunluk' },
      { label: 'Genel kasa', path: '/kasa/genel' },
      { label: 'Kar zarar', path: '/kasa/kar-zarar' }
    ]
  },
  {
    title: 'RAPORLAMA',
    items: [
      { label: 'Forecast', path: '/forecast' },
      { label: 'Oda tanımları', path: '/oda-tanimlari' },
      { label: 'Ayarlar', path: '/ayarlar' }
    ]
  }
];

const quickLinks = [
  { label: 'Yeni giriş', cls: 'green', to: '/rezervasyonlar/yeni' },
  { label: 'Rezervasyonlar', cls: 'pink', to: '/rezervasyonlar' },
  { label: 'Room Rack', cls: 'orange', to: '/room-rack' },
  { label: 'Oda durumu', cls: 'cyan', to: '/oda-durumu' },
  { label: 'Günlük kasa', cls: 'red', to: '/kasa/gunluk' },
  { label: 'Kar zarar', cls: 'dark', to: '/kasa/kar-zarar' }
];

export default function Layout({ children, user, onLogout, hotelName = 'Lizbon Otel' }) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="hotel-badge hotel-badge-large">
          <strong>{hotelName}</strong>
          <span>Apart otel yönetimi</span>
        </div>
        <nav>
          {menuGroups.map((group) => (
            <div key={group.title} className="nav-group">
              <div className="nav-group-title">{group.title}</div>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="quick-actions">
            {quickLinks.map((link) => (
              <Link key={link.label} to={link.to} className={`quick-btn ${link.cls}`}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="user-box">
            <div className="user-box-meta">
              <strong>{hotelName}</strong>
              <span>{user?.full_name || 'KULLANICI'}</span>
            </div>
            <button className="btn small red" onClick={onLogout}>Çıkış</button>
          </div>
        </header>
        <section className="page-wrapper">{children}</section>
        <div className="ghost-credit">copyright <a href="https://rturkmen.fr" target="_blank" rel="noopener noreferrer">@Ramo</a></div>
      </main>
    </div>
  );
}
