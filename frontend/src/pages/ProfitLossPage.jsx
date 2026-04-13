import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '../api';

export default function ProfitLossPage() {
  const [rows, setRows] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  const loadRows = () => {
    Promise.all([api.profitLoss(startDate, endDate), api.reservations(startDate, endDate)]).then(([profitRows, reservationRows]) => {
      setRows(profitRows);
      setReservations(reservationRows);
    });
  };

  useEffect(() => {
    loadRows();
  }, [startDate, endDate]);

  const totals = rows.reduce(
    (acc, row) => ({
      gelir: acc.gelir + row.gelir,
      gider: acc.gider + row.gider,
      kar: acc.kar + row.kar
    }),
    { gelir: 0, gider: 0, kar: 0 }
  );
  const totalReceivable = reservations.reduce((sum, row) => sum + Number(row.balance_due || 0), 0);

  return (
    <div className="panel">
      <h2>Kar-zarar</h2>
      <div className="toolbar">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="button" className="btn blue" onClick={loadRows}>Filtrele</button>
      </div>

      <div className="summary-cards">
        <div className="summary-card blue"><span>Toplam gelir</span><strong>{totals.gelir.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card red"><span>Toplam gider</span><strong>{totals.gider.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card green"><span>Toplam kar/zarar</span><strong>{totals.kar.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card orange"><span>Bekleyen tahsilat</span><strong>{totalReceivable.toLocaleString('tr-TR')} TL</strong></div>
      </div>

      <table>
        <thead><tr><th>Tarih</th><th>Gelir</th><th>Gider</th><th>Kar/zarar</th><th>Yüzde</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.tarih}>
              <td>{row.tarih}</td>
              <td>{row.gelir.toLocaleString('tr-TR')} TL</td>
              <td>{row.gider.toLocaleString('tr-TR')} TL</td>
              <td>{row.kar.toLocaleString('tr-TR')} TL</td>
              <td><span className={row.yuzde >= 0 ? 'badge good' : 'badge bad'}>% {row.yuzde.toFixed(2)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="summary-line">Toplam gelir: {totals.gelir.toLocaleString('tr-TR')} TL | Toplam gider: {totals.gider.toLocaleString('tr-TR')} TL | Net: {totals.kar.toLocaleString('tr-TR')} TL</div>
    </div>
  );
}
