import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

const emptyForm = {
  number: '',
  floor: '1.kat',
  room_type: 'Aile',
  status: 'Temiz'
};

const formatStatus = (value) => (value === 'Arizali' ? 'Arızalı' : value);

export default function RoomDefinitionsPage() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRooms = () => {
    api.rooms().then(setRooms);
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      if (editingId) {
        await api.updateRoom(editingId, form);
        setMessage('Oda bilgisi güncellendi.');
      } else {
        await api.createRoom(form);
        setMessage('Yeni oda eklendi.');
      }

      resetForm();
      loadRooms();
    } catch (submitError) {
      setError('Kayıt sırasında hata oluştu. Oda numarasını kontrol edin.');
    }
  };

  const startEdit = (room) => {
    setForm({
      number: room.number,
      floor: room.floor,
      room_type: room.room_type,
      status: room.status
    });
    setEditingId(room.id);
    setMessage('');
    setError('');
  };

  const removeRoom = async (room) => {
    setMessage('');
    setError('');

    try {
      await api.deleteRoom(room.id);
      if (editingId === room.id) {
        resetForm();
      }
      setMessage(`Oda ${room.number} silindi.`);
      loadRooms();
    } catch (deleteError) {
      setError('Bu oda silinemedi. Odaya bağlı rezervasyon olabilir.');
    }
  };

  return (
    <div className="panel">
      <h2>Oda tanımları</h2>
      <div className="grid two-col room-admin-grid">
        <div className="card">
          <h3>{editingId ? 'Oda düzenle' : 'Yeni oda ekle'}</h3>
          <form onSubmit={submit}>
            <label>Oda adı/No</label>
            <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />

            <label>Kat/Grup</label>
            <input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />

            <label>Oda tipi</label>
            <select value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })}>
              <option>Aile</option>
              <option>İki kişi</option>
              <option>1 DUBLE</option>
              <option>2 SINGLE</option>
            </select>

            <label>Durum</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Temiz">Temiz</option>
              <option value="Kirli">Kirli</option>
              <option value="Arizali">Arızalı</option>
            </select>

            <div className="form-actions">
              <button className="btn blue" type="submit">{editingId ? 'Güncelle' : 'Kaydet'}</button>
              {editingId ? <button className="btn" type="button" onClick={resetForm}>İptal</button> : null}
            </div>
          </form>
          {message ? <div className="inline-success">{message}</div> : null}
          {error ? <div className="inline-error">{error}</div> : null}
        </div>

        <div className="card room-stats-card">
          <h3>Oda özeti</h3>
          <div className="status-grid">
            <div><span>Toplam oda</span><b>{rooms.length}</b></div>
            <div><span>Temiz</span><b>{rooms.filter((room) => room.status === 'Temiz').length}</b></div>
            <div className="warn"><span>Kirli</span><b>{rooms.filter((room) => room.status === 'Kirli').length}</b></div>
            <div className="danger"><span>Arızalı</span><b>{rooms.filter((room) => room.status === 'Arizali').length}</b></div>
          </div>
        </div>
      </div>

      <p>Toplam {rooms.length} kayıt listelenmiştir.</p>
      <table>
        <thead><tr><th>Sıra</th><th>Oda adı/No</th><th>Kat/Grup</th><th>Durum</th><th>Oda tipi</th><th>Detay</th></tr></thead>
        <tbody>
          {rooms.map((r, i) => (
            <tr key={r.id} className={r.status === 'Kirli' ? 'row-alert' : r.status === 'Arizali' ? 'row-repair' : r.status === 'Temiz' ? 'row-clean' : ''}>
              <td>{i + 1}</td><td>{r.number}</td><td>{r.floor}</td><td>{formatStatus(r.status)}</td><td>{r.room_type}</td>
              <td>
                <button className="btn small blue" type="button" onClick={() => startEdit(r)}>Düzelt</button>{' '}
                <button className="btn small red" type="button" onClick={() => setDeleteTarget(r)}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={!!deleteTarget}
        title="Oda Sil"
        onClose={() => setDeleteTarget(null)}
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setDeleteTarget(null)}>İptal</button>
            <button
              type="button"
              className="btn red"
              onClick={async () => {
                if (deleteTarget) {
                  await removeRoom(deleteTarget);
                }
                setDeleteTarget(null);
              }}
            >
              Sil
            </button>
          </>
        )}
      >
        <p>Oda {deleteTarget?.number} silinecek. Bu işlem geri alınamaz.</p>
      </Modal>
    </div>
  );
}
