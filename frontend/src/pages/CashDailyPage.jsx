import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '../api';
import Modal from '../components/Modal';

const initialForm = {
  id: null,
  type: 'income',
  tx_time: '12:00',
  amount: '',
  room_number: '',
  payment_channel: 'Pesin',
  description: '',
  staff: 'Administrator'
};

export default function CashDailyPage() {
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState({ income: [], expense: [], date: today });
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadDaily = () => {
    api.cashDaily(selectedDate).then(setData);
  };

  useEffect(() => {
    loadDaily();
  }, [selectedDate]);

  const totalIncome = useMemo(() => data.income.reduce((a, b) => a + b.amount, 0), [data]);
  const totalExpense = useMemo(() => data.expense.reduce((a, b) => a + b.amount, 0), [data]);
  const netTotal = totalIncome - totalExpense;

  const resetForm = () => {
    setForm(initialForm);
  };

  const startEdit = (tx) => {
    if (tx.source_type === 'reservation_payment') {
      setError('Bu gelir rezervasyondan otomatik oluştu. Düzenlemek için rezervasyonu güncelleyin.');
      setMessage('');
      return;
    }

    setForm({
      id: tx.id,
      type: tx.type,
      tx_time: tx.tx_time,
      amount: tx.amount,
      room_number: tx.room_number || '',
      payment_channel: tx.payment_channel || 'Pesin',
      description: tx.description || '',
      staff: tx.staff || 'Administrator'
    });
    setMessage('');
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload = {
      tx_date: selectedDate,
      tx_time: form.tx_time,
      type: form.type,
      amount: Number(form.amount || 0),
      room_number: form.room_number,
      payment_channel: form.payment_channel,
      description: form.description,
      staff: form.staff
    };

    try {
      if (form.id) {
        await api.updateCashTransaction(form.id, payload);
        setMessage('İşlem güncellendi.');
      } else {
        await api.createCashTransaction(payload);
        setMessage('Yeni işlem eklendi.');
      }
      resetForm();
      loadDaily();
    } catch (submitError) {
      setError(submitError.message || 'Kayıt işlemi başarısız oldu.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    setMessage('');
    setError('');
    try {
      await api.deleteCashTransaction(id);
      if (form.id === id) {
        resetForm();
      }
      setMessage('İşlem silindi.');
      loadDaily();
    } catch (deleteError) {
      setError(deleteError.message || 'Silme işlemi başarısız oldu.');
    }
  };

  return (
    <div className="panel">
      <h2>Günlük kasa - {data.date}</h2>
      <div className="toolbar compact-toolbar">
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>

      <div className="card">
        <h3>{form.id ? 'İşlem düzenle' : 'Yeni gelir / gider ekle'}</h3>
        <form onSubmit={onSubmit} className="grid two-col">
          <div>
            <label>Tip</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="income">Gelir</option>
              <option value="expense">Gider</option>
            </select>

            <label>Saat</label>
            <input type="time" value={form.tx_time} onChange={(e) => setForm({ ...form, tx_time: e.target.value })} />

            <label>Tutar</label>
            <input type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />

            <label>Oda</label>
            <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="Örn: 105" />
          </div>

          <div>
            <label>Ödeme kanalı</label>
            <select value={form.payment_channel} onChange={(e) => setForm({ ...form, payment_channel: e.target.value })}>
              <option value="Pesin">Peşin</option>
              <option value="Kredi karti">Kredi kartı</option>
              <option value="Havale">Havale</option>
              <option value="Online">Online</option>
              <option value="Nakit">Nakit</option>
            </select>

            <label>Açıklama</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <label>Personel</label>
            <input value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />

            <div className="form-actions">
              <button className="btn blue" type="submit" disabled={saving}>{form.id ? 'Güncelle' : 'Kaydet'}</button>
              <button className="btn" type="button" onClick={resetForm}>Temizle</button>
            </div>
          </div>
        </form>

        {message ? <div className="inline-success">{message}</div> : null}
        {error ? <div className="inline-error">{error}</div> : null}
      </div>

      <div className="summary-cards">
        <div className="summary-card blue"><span>Toplam gelir</span><strong>{totalIncome.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card red"><span>Toplam gider</span><strong>{totalExpense.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card green"><span>Kasa bakiyesi</span><strong>{netTotal.toLocaleString('tr-TR')} TL</strong></div>
      </div>
      <div className="grid two-col">
        <div className="card">
          <h3>Gelirler</h3>
          <table>
            <thead><tr><th>Saat</th><th>Tutar</th><th>Ödeme tipi</th><th>Oda</th><th>Açıklama</th><th>İşlem</th></tr></thead>
            <tbody>
              {data.income.map((i) => (
                <tr key={i.id}>
                  <td>{i.tx_time}</td>
                  <td>{i.amount} TL</td>
                  <td>{i.payment_channel}</td>
                  <td>{i.room_number}</td>
                  <td>
                    {i.description}
                    {i.source_type === 'reservation_payment' ? <><br /><span className="badge neutral">{i.source_label || 'Rezervasyon tahsilatı'}</span></> : null}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn small cyan" type="button" disabled={i.source_type === 'reservation_payment'} onClick={() => startEdit(i)}>Düzelt</button>
                      <button className="btn small red" type="button" disabled={i.source_type === 'reservation_payment'} onClick={() => setDeleteTarget(i.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Giderler</h3>
          <table>
            <thead><tr><th>Saat</th><th>Adı</th><th>Tutar</th><th>İşlem</th></tr></thead>
            <tbody>
              {data.expense.map((i) => (
                <tr key={i.id}>
                  <td>{i.tx_time}</td>
                  <td>{i.description}</td>
                  <td>{i.amount} TL</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn small cyan" type="button" onClick={() => startEdit(i)}>Düzelt</button>
                      <button className="btn small red" type="button" onClick={() => setDeleteTarget(i.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="summary-line">{totalIncome.toLocaleString('tr-TR')} - {totalExpense.toLocaleString('tr-TR')} = {(totalIncome - totalExpense).toLocaleString('tr-TR')} TL</div>

      <Modal
        open={!!deleteTarget}
        title="İşlem Sil"
        onClose={() => setDeleteTarget(null)}
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setDeleteTarget(null)}>İptal</button>
            <button
              type="button"
              className="btn red"
              onClick={async () => {
                if (deleteTarget) {
                  await onDelete(deleteTarget);
                }
                setDeleteTarget(null);
              }}
            >
              Sil
            </button>
          </>
        )}
      >
        <p>Bu kasa işlemi kalıcı olarak silinecek. Devam etmek istiyor musunuz?</p>
      </Modal>
    </div>
  );
}
