import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '../api';

export default function RoomRackPage() {
  const [settings, setSettings] = useState(null);
  const [anchorDate, setAnchorDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState({ rooms: [], reservations: [], columns: [] });

  const loadRack = (currentSettings, currentDate) => {
    const previousDays = currentSettings?.previous_days ?? 1;
    const nextDays = currentSettings?.next_days ?? 10;
    const start = dayjs(currentDate).subtract(previousDays, 'day').format('YYYY-MM-DD');
    const totalDays = previousDays + nextDays + 1;
    api.roomRack(start, totalDays).then(setData);
  };

  useEffect(() => {
    api.settings().then((res) => {
      setSettings(res);
      loadRack(res, anchorDate);
    });
  }, []);

  useEffect(() => {
    if (settings) {
      loadRack(settings, anchorDate);
    }
  }, [settings, anchorDate]);

  return (
    <div className="panel">
      <h2>Room rack</h2>
      <div className="toolbar compact-toolbar">
        <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
        <button type="button" className="btn" onClick={() => setAnchorDate(dayjs(anchorDate).subtract(7, 'day').format('YYYY-MM-DD'))}>- 7 gün</button>
        <button type="button" className="btn blue" onClick={() => setAnchorDate(dayjs().format('YYYY-MM-DD'))}>Bugün</button>
        <button type="button" className="btn" onClick={() => setAnchorDate(dayjs(anchorDate).add(7, 'day').format('YYYY-MM-DD'))}>+ 7 gün</button>
      </div>
      <div className="rack-grid" style={{ gridTemplateColumns: `80px repeat(${data.columns.length}, 1fr)` }}>
        <div className="rack-head empty" />
        {data.columns.map((d) => <div key={d} className="rack-head">{dayjs(d).format('D MMM')}</div>)}

        {data.rooms.map((room) => (
          <div key={`room-row-${room.number}`} className="rack-row-fragment" style={{ display: 'contents' }}>
            <div className="rack-room">{room.number}</div>
            {data.columns.map((day) => {
              const res = data.reservations.find((r) => r.room_number === room.number && day >= r.check_in.slice(0, 10) && day < r.check_out.slice(0, 10));
              return (
                <div
                  key={`${room.number}-${day}`}
                  className="rack-cell"
                  style={{ background: res ? (res.color || settings?.occupied_color || '#99e27d') : (settings?.free_color || '#ffffff') }}
                >
                  {res ? `${res.guest_name} (${res.rez_no})` : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="summary-line">
        Dolu odalar rezervasyon rengi ile, boş odalar ise ayarlardaki boş oda rengi ile gösterilir. Görünen dönem: {data.columns[0]} - {data.columns[data.columns.length - 1]}.
      </div>
    </div>
  );
}
