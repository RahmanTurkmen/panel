import { useEffect, useState } from 'react';
import { api } from '../api';

export default function SettingsPage({ onSettingsSaved }) {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.settings().then(setForm);
  }, []);

  if (!form) return <div className="panel">Yükleniyor...</div>;

  const save = async () => {
    const saved = await api.saveSettings(form);
    setForm(saved);
    setMessage('Ayarlar kaydedildi.');
    if (onSettingsSaved) onSettingsSaved();
  };

  return (
    <div className="panel">
      <h2>Ayarlar</h2>
      <div className="card settings-card">
        <h3>Otel bilgileri</h3>
        <div className="settings-grid">
          <label>Otel adı</label>
          <input type="text" value={form.hotel_name || ''} onChange={(e) => setForm({ ...form, hotel_name: e.target.value })} />
        </div>
      </div>
      <div className="card settings-card">
        <h3>Rezervasyon ayarları</h3>
        <div className="settings-grid">
          <label>Room Rack önceki gün sayısı</label>
          <input type="number" value={form.previous_days} onChange={(e) => setForm({ ...form, previous_days: Number(e.target.value) })} />
          <label>Room Rack sonraki gün sayısı</label>
          <input type="number" value={form.next_days} onChange={(e) => setForm({ ...form, next_days: Number(e.target.value) })} />
          <label>Açılış sayfası</label>
          <select value={form.opening_page} onChange={(e) => setForm({ ...form, opening_page: e.target.value })}><option>Room rack</option><option>Ana Ekran</option></select>
          <label>Check-IN saati</label>
          <input type="time" value={form.checkin_time} onChange={(e) => setForm({ ...form, checkin_time: e.target.value })} />
          <label>Check-OUT saati</label>
          <input type="time" value={form.checkout_time} onChange={(e) => setForm({ ...form, checkout_time: e.target.value })} />
          <label>Room rack dolu oda rengi</label>
          <input type="color" value={form.occupied_color} onChange={(e) => setForm({ ...form, occupied_color: e.target.value })} />
          <label>Room rack boş oda rengi</label>
          <input type="color" value={form.free_color} onChange={(e) => setForm({ ...form, free_color: e.target.value })} />
        </div>
        <button className="btn blue" onClick={save}>Kaydet</button>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}
