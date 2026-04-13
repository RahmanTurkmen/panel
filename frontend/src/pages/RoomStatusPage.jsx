import { useEffect, useState } from 'react';
import { api } from '../api';

const statuses = [
  { value: 'Temiz', label: 'Temiz' },
  { value: 'Kirli', label: 'Kirli' },
  { value: 'Arizali', label: 'Arızalı' }
];

const formatStatus = (value) => (value === 'Arizali' ? 'Arızalı' : value);

export default function RoomStatusPage() {
  const [rooms, setRooms] = useState([]);

  const load = () => api.rooms().then(setRooms);

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (number, status) => {
    await api.roomStatus(number, status);
    load();
  };

  return (
    <div className="panel">
      <h2>Oda durumları / Temizlik</h2>
      <table>
        <thead><tr><th>Adı</th><th>Tip</th><th>Durum</th><th>Güncelle</th></tr></thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className={room.status === 'Kirli' ? 'row-alert' : room.status === 'Arizali' ? 'row-repair' : room.status === 'Temiz' ? 'row-clean' : ''}>
              <td>{room.number}</td>
              <td>{room.room_type}</td>
              <td>{formatStatus(room.status)}</td>
              <td>
                <div className="radio-group">
                  {statuses.map((status) => (
                    <label key={status.value}>
                      <input
                        type="radio"
                        checked={room.status === status.value}
                        onChange={() => updateStatus(room.number, status.value)}
                      />
                      {status.label}
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
