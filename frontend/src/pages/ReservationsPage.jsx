import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '../api';
import Modal from '../components/Modal';

function buildEditForm(row) {
  if (!row) {
    return null;
  }

  return {
    guest_name: row.guest_name,
    room_number: row.room_number,
    check_in: row.check_in,
    check_out: row.check_out,
    adults: row.adults || 1,
    children: row.children || 0,
    board_type: row.board_type || 'Sadece oda',
    agency: row.agency || '',
    payment_type: row.payment_type || 'Pesin',
    payment_date: row.payment_date || dayjs().format('YYYY-MM-DD'),
    amount: row.amount || 0,
    paid_amount: row.paid_amount || 0,
    note: row.note || '',
    color: row.color || '#69db7c',
    checkin_done: !!row.checkin_done,
    checkout_done: !!row.checkout_done
  };
}

export default function ReservationsPage() {
  const [rows, setRows] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [settings, setSettings] = useState(null);
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [query, setQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const loadReservations = () => {
    api.reservations(fromDate, toDate).then(setRows);
  };

  useEffect(() => {
    loadReservations();
  }, [fromDate, toDate]);

  useEffect(() => {
    api.rooms().then(setRooms);
    api.settings().then(setSettings);
  }, []);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const haystack = `${row.rez_no} ${row.guest_name} ${row.room_number} ${row.agency || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [rows, query]);

  const totals = useMemo(() => filteredRows.reduce((acc, row) => ({
    amount: acc.amount + Number(row.amount || 0),
    paid: acc.paid + Number(row.paid_amount || 0),
    due: acc.due + Number(row.balance_due || 0)
  }), { amount: 0, paid: 0, due: 0 }), [filteredRows]);

  const openEditModal = (row) => {
    setEditTarget(row);
    setEditForm(buildEditForm(row));
    setMessage('');
    setError('');
  };

  const changeReservationDate = (field, value) => {
    if (!editForm) {
      return;
    }

    const defaultTime = field === 'check_in' ? settings?.checkin_time || '14:00' : settings?.checkout_time || '11:00';
    setEditForm({ ...editForm, [field]: `${value} ${defaultTime}` });
  };

  const toggleCheckin = async (row) => {
    setActionLoadingId(row.id);
    setMessage('');
    setError('');
    try {
      await api.updateReservationCheckin(row.id, !row.checkin_done);
      setMessage(!row.checkin_done ? 'Check-in tamamlandı.' : 'Check-in geri alındı.');
      loadReservations();
    } catch (actionError) {
      setError(actionError.message || 'İşlem başarısız oldu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleCheckout = async (row) => {
    setActionLoadingId(row.id);
    setMessage('');
    setError('');
    try {
      await api.updateReservationCheckout(row.id, !row.checkout_done);
      setMessage(!row.checkout_done ? 'Check-out tamamlandı.' : 'Check-out geri alındı.');
      loadReservations();
    } catch (actionError) {
      setError(actionError.message || 'İşlem başarısız oldu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const saveReservation = async () => {
    if (!editTarget || !editForm) {
      return;
    }

    setEditSaving(true);
    setMessage('');
    setError('');
    try {
      await api.updateReservation(editTarget.id, editForm);
      setMessage('Rezervasyon güncellendi.');
      setEditTarget(null);
      setEditForm(null);
      loadReservations();
    } catch (saveError) {
      setError(saveError.message || 'Rezervasyon güncellenemedi.');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteReservation = async (row) => {
    setActionLoadingId(row.id);
    setMessage('');
    setError('');
    try {
      await api.deleteReservation(row.id);
      setMessage('Rezervasyon silindi.');
      loadReservations();
    } catch (actionError) {
      setError(actionError.message || 'Silme işlemi başarısız oldu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="panel">
      <h2>Rezervasyonlar</h2>
      <div className="toolbar">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button type="button" className="btn blue" onClick={loadReservations}>Filtrele</button>
        <input
          className="toolbar-search"
          placeholder="Misafir, oda, acente veya rezervasyon no ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}
      <p>Toplam {filteredRows.length} kayıt listelenmiştir.</p>
      <div className="summary-cards">
        <div className="summary-card blue"><span>Rezervasyon toplamı</span><strong>{totals.amount.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card green"><span>Tahsil edilen</span><strong>{totals.paid.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card orange"><span>Kalan alacak</span><strong>{totals.due.toLocaleString('tr-TR')} TL</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Rez. no</th>
            <th>Misafir</th>
            <th>Oda</th>
            <th>Giriş</th>
            <th>Çıkış</th>
            <th>Durum</th>
            <th>Ödeme</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => {
            const balanceDue = Math.max(0, Number(row.balance_due || 0));
            return (
              <tr key={row.id}>
                <td>{row.rez_no}</td>
                <td>
                  <strong>{row.guest_name}</strong>
                  <br />
                  <span>{row.adults} yetişkin / {row.children} çocuk</span>
                </td>
                <td>
                  {row.room_number}
                  <br />
                  <span>{row.board_type || 'Sadece oda'}</span>
                </td>
                <td>{dayjs(row.check_in).format('DD.MM.YYYY HH:mm')}</td>
                <td>{dayjs(row.check_out).format('DD.MM.YYYY HH:mm')}</td>
                <td>
                  <div className="table-actions">
                    <span className={`badge ${row.checkin_done ? 'good' : 'neutral'}`}>{row.checkin_done ? 'Check-in yapıldı' : 'Check-in bekliyor'}</span>
                    <span className={`badge ${row.checkout_done ? 'good' : 'neutral'}`}>{row.checkout_done ? 'Check-out yapıldı' : 'Check-out bekliyor'}</span>
                  </div>
                </td>
                <td>
                  <strong>{Number(row.amount || 0).toLocaleString('tr-TR')} TL</strong>
                  <br />
                  <span>Ödenen: {Number(row.paid_amount || 0).toLocaleString('tr-TR')} TL</span>
                  <br />
                  <span>Kalan: {balanceDue.toLocaleString('tr-TR')} TL</span>
                  <br />
                  <span>{row.payment_type} / {row.payment_date ? dayjs(row.payment_date).format('DD.MM.YYYY') : '-'}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn small blue" type="button" onClick={() => openEditModal(row)}>Düzenle</button>
                    <button
                      className="btn small cyan"
                      type="button"
                      disabled={actionLoadingId === row.id}
                      onClick={() => toggleCheckin(row)}
                    >
                      {row.checkin_done ? 'Check-in geri al' : 'Check-in yap'}
                    </button>
                    <button
                      className="btn small"
                      type="button"
                      disabled={actionLoadingId === row.id || (!row.checkin_done && !row.checkout_done)}
                      onClick={() => toggleCheckout(row)}
                    >
                      {row.checkout_done ? 'Check-out geri al' : 'Check-out yap'}
                    </button>
                    <button
                      className="btn small red"
                      type="button"
                      disabled={actionLoadingId === row.id}
                      onClick={() => setDeleteTarget(row)}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        open={!!editTarget && !!editForm}
        title={`Rezervasyon Düzenle${editTarget ? ` #${editTarget.rez_no}` : ''}`}
        size="wide"
        onClose={() => {
          setEditTarget(null);
          setEditForm(null);
        }}
        actions={(
          <>
            <button type="button" className="btn" onClick={() => {
              setEditTarget(null);
              setEditForm(null);
            }}>İptal</button>
            <button type="button" className="btn blue" onClick={saveReservation} disabled={editSaving}>
              {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </>
        )}
      >
        {editForm ? (
          <div className="grid two-col">
            <div>
              <label>Misafir adı</label>
              <input value={editForm.guest_name} onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })} />
              <label>Oda</label>
              <select value={editForm.room_number} onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}>
                <option value="">Seçiniz</option>
                {rooms.map((room) => <option key={room.id} value={room.number}>{room.number} - {room.room_type}</option>)}
              </select>
              <label>Giriş</label>
              <input type="date" value={dayjs(editForm.check_in).format('YYYY-MM-DD')} onChange={(e) => changeReservationDate('check_in', e.target.value)} />
              <label>Çıkış</label>
              <input type="date" value={dayjs(editForm.check_out).format('YYYY-MM-DD')} onChange={(e) => changeReservationDate('check_out', e.target.value)} />
              <label>Yetişkin</label>
              <input type="number" min="1" value={editForm.adults} onChange={(e) => setEditForm({ ...editForm, adults: Number(e.target.value) })} />
              <label>Çocuk</label>
              <input type="number" min="0" value={editForm.children} onChange={(e) => setEditForm({ ...editForm, children: Number(e.target.value) })} />
            </div>
            <div>
              <label>Konaklama türü</label>
              <select value={editForm.board_type} onChange={(e) => setEditForm({ ...editForm, board_type: e.target.value })}>
                <option value="Sadece oda">Sadece oda</option>
                <option value="Oda + Kahvaltı">Oda + Kahvaltı</option>
                <option value="Yarım pansiyon">Yarım pansiyon</option>
              </select>
              <label>Acente / kanal</label>
              <input value={editForm.agency} onChange={(e) => setEditForm({ ...editForm, agency: e.target.value })} />
              <label>Toplam tutar</label>
              <input type="number" min="0" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })} />
              <label>Ödenen tutar</label>
              <input type="number" min="0" value={editForm.paid_amount} onChange={(e) => setEditForm({ ...editForm, paid_amount: Number(e.target.value) })} />
              <label>Ödeme tipi</label>
              <select value={editForm.payment_type} onChange={(e) => setEditForm({ ...editForm, payment_type: e.target.value })}>
                <option value="Pesin">Peşin</option>
                <option value="Kredi karti">Kredi kartı</option>
                <option value="Havale">Havale</option>
                <option value="Online">Online</option>
              </select>
              <label>Ödeme tarihi</label>
              <input type="date" value={editForm.payment_date} onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })} />
              <label>Renk</label>
              <input type="color" value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label>Not</label>
              <textarea rows={4} value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
              <div className="summary-line">Kalan ödeme: {Math.max(0, Number(editForm.amount || 0) - Number(editForm.paid_amount || 0)).toLocaleString('tr-TR')} TL</div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Rezervasyon Sil"
        onClose={() => setDeleteTarget(null)}
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setDeleteTarget(null)}>İptal</button>
            <button
              type="button"
              className="btn red"
              onClick={async () => {
                if (deleteTarget) {
                  await deleteReservation(deleteTarget);
                }
                setDeleteTarget(null);
              }}
            >
              Sil
            </button>
          </>
        )}
      >
        <p>Rezervasyon {deleteTarget?.rez_no} kalıcı olarak silinecek. Onaylıyor musunuz?</p>
      </Modal>
    </div>
  );
}
