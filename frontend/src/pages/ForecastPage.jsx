import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../api';

export default function ForecastPage() {
  const [rows, setRows] = useState([]);
  const [month] = useState(dayjs().format('YYYY-MM'));

  useEffect(() => {
    api.forecast(month).then(setRows);
  }, [month]);

  const total = useMemo(() => rows.length, [rows]);

  return (
    <div className="panel">
      <h2>Forecast</h2>
      <div className="card">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows.map((r) => ({ ...r, label: dayjs(r.date).format('MMM D') }))}>
            <XAxis dataKey="label" angle={-45} textAnchor="end" height={70} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="occupied" fill="#2f80ed" name="Dolu oda" />
            <Bar dataKey="free" fill="#13c784" name="Boş oda" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p>Toplam {total} kayıt listelenmiştir.</p>
      <table>
        <thead><tr><th>Gün/Tarih</th><th>Oda</th><th>Dolu</th><th>Boş</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.date}><td>{dayjs(r.date).format('D MMMM YYYY dddd')}</td><td>{r.room}</td><td>{r.occupied}</td><td>{r.free}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
