import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '../api';

function buildInitialForm(settings) {
  const checkinTime = settings?.checkin_time || '14:00';
  const checkoutTime = settings?.checkout_time || '11:00';

  return {
    guest_name: '',
    room_number: '',
    check_in: `${dayjs().format('YYYY-MM-DD')} ${checkinTime}`,
    check_out: `${dayjs().add(1, 'day').format('YYYY-MM-DD')} ${checkoutTime}`,
    adults: '',
    children: '',
    board_type: 'Sadece oda',
    payment_type: 'Pesin',
    payment_date: dayjs().format('YYYY-MM-DD'),
    amount: '',
    paid_amount: '',
    color: settings?.occupied_color || '#69db7c',
    agency: '',
    note: ''
  };
}

export default function NewReservationPage() {
  const [rooms, setRooms] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(() => buildInitialForm());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.rooms().then(setRooms);
    api.settings().then((res) => {
      setSettings(res);
      setForm(buildInitialForm(res));
    });
  }, []);

  const balanceDue = useMemo(() => Math.max(0, Number(form.amount || 0) - Number(form.paid_amount || 0)), [form.amount, form.paid_amount]);

  const selectedRoom = rooms.find((r) => r.number === form.room_number);
  const isRoomBlocked = selectedRoom && (selectedRoom.status === 'Kirli' || selectedRoom.status === 'Arizali');
  const blockedLabel = selectedRoom?.status === 'Arizali' ? 'Arızalı' : selectedRoom?.status === 'Kirli' ? 'Kirli' : '';

  const changeDate = (field, value) => {
    const defaultTime = field === 'check_in' ? settings?.checkin_time || '14:00' : settings?.checkout_time || '11:00';
    setForm({ ...form, [field]: `${value} ${defaultTime}` });
  };

  const onSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    try {
      await api.createReservation({
        ...form,
        adults: Number(form.adults || 1),
        children: Number(form.children || 0),
        amount: Number(form.amount || 0),
        paid_amount: Number(form.paid_amount || 0)
      });
      setMessage('Rezervasyon kaydedildi.');
      setForm(buildInitialForm(settings));
    } catch (saveError) {
      setError(saveError.message || 'Rezervasyon kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <h2>Rezervasyon bilgileri</h2>
      <form onSubmit={onSave} className="grid two-col">
        <div className="card">
          <label>Giriş</label>
          <input value={dayjs(form.check_in).format('YYYY-MM-DD')} onChange={(e) => changeDate('check_in', e.target.value)} type="date" />
          <label>Çıkış</label>
          <input value={dayjs(form.check_out).format('YYYY-MM-DD')} onChange={(e) => changeDate('check_out', e.target.value)} type="date" />
          <label>Oda</label>
          <select value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })}>
            <option value="">Seçiniz</option>
            {rooms.map((r) => {
              const blocked = r.status === 'Kirli' || r.status === 'Arizali';
              const statusLabel = r.status === 'Arizali' ? 'Arızalı' : r.status;
              return (
                <option key={r.id} value={r.number}>
                  {r.number} - {r.room_type}{blocked ? ` - ⚠ ${statusLabel}` : ''}
                </option>
              );
            })}
          </select>
          {isRoomBlocked && (
            <div className="room-blocked-warning">
              <span className="room-blocked-icon">⚠</span>
              <span>Bu oda şu anda <strong>{blockedLabel}</strong> durumunda. Rezervasyon oluşturulamaz.</span>
            </div>
          )}
          <label>Yetişkin sayısı</label>
          <input type="number" min="1" value={form.adults} placeholder="0" onChange={(e) => setForm({ ...form, adults: e.target.value })} />
          <label>Çocuk sayısı</label>
          <input type="number" min="0" value={form.children} placeholder="0" onChange={(e) => setForm({ ...form, children: e.target.value })} />
          <label>Konaklama türü</label>
          <select value={form.board_type} onChange={(e) => setForm({ ...form, board_type: e.target.value })}>
            <option value="Sadece oda">Sadece oda</option>
            <option value="Oda + Kahvaltı">Oda + Kahvaltı</option>
            <option value="Yarım pansiyon">Yarım pansiyon</option>
          </select>
          <label>Acente / kanal</label>
          <input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} placeholder="Booking, Expedia, telefon..." />
          <label>Not/Açıklama</label>
          <textarea rows={4} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="card">
          <label>Ad soyad</label>
          <input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
          <label>Rezervasyon tutarı</label>
          <input type="number" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <label>Ödenen tutar</label>
          <input type="number" min="0" value={form.paid_amount} placeholder="0" onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />
          <label>Ödeme tipi</label>
          <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
            <option value="Pesin">Peşin</option><option value="Kredi karti">Kredi kartı</option><option value="Havale">Havale</option><option value="Online">Online</option>
          </select>
          <label>Ödeme tarihi</label>
          <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          <label>Renk</label>
          <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <div className="summary-line">Kalan ödeme: {balanceDue.toLocaleString('tr-TR')} TL</div>
          <div className="form-actions">
            <button className="btn blue" type="submit" disabled={saving || isRoomBlocked}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
          {message ? <div className="inline-success">{message}</div> : null}
          {error ? <div className="inline-error">{error}</div> : null}
        </div>
      </form>
    </div>
  );
}
