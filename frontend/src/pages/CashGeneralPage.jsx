import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '../api';

export default function CashGeneralPage() {
  const [rows, setRows] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  const loadRows = () => {
    Promise.all([api.cashGeneral(startDate, endDate), api.reservations(startDate, endDate)]).then(([cashRows, reservationRows]) => {
      setRows(cashRows);
      setReservations(reservationRows);
    });
  };

  useEffect(() => {
    loadRows();
  }, [startDate, endDate]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    pesin: acc.pesin + row.pesin,
    kredi: acc.kredi + row.kredi,
    havale: acc.havale + row.havale,
    online: acc.online + row.online,
    gider: acc.gider + row.gider
  }), { pesin: 0, kredi: 0, havale: 0, online: 0, gider: 0 }), [rows]);
  const totalReceivable = useMemo(() => reservations.reduce((sum, row) => sum + Number(row.balance_due || 0), 0), [reservations]);

  const totalIncome = totals.havale + totals.kredi + totals.online + totals.pesin;
  const net = totalIncome - totals.gider;

  return (
    <div className="panel">
      <h2>Genel Kasa</h2>
      <div className="toolbar">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="button" className="btn blue" onClick={loadRows}>Filtrele</button>
      </div>

      <div className="summary-cards">
        <div className="summary-card blue"><span>Toplam gelir</span><strong>{totalIncome.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card red"><span>Toplam gider</span><strong>{totals.gider.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card green"><span>Net kasa</span><strong>{net.toLocaleString('tr-TR')} TL</strong></div>
        <div className="summary-card orange"><span>Bekleyen tahsilat</span><strong>{totalReceivable.toLocaleString('tr-TR')} TL</strong></div>
      </div>

      <table>
        <thead><tr><th>Gün/Tarih</th><th>Havale</th><th>Kredi kartı</th><th>Online</th><th>Peşin</th><th>Gider</th><th>Toplam</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const total = row.havale + row.kredi + row.online + row.pesin;
            return <tr key={row.tx_date}><td>{row.tx_date}</td><td>{row.havale} TL</td><td>{row.kredi} TL</td><td>{row.online} TL</td><td>{row.pesin} TL</td><td>{row.gider} TL</td><td>{total} TL</td></tr>;
          })}
        </tbody>
      </table>
      <div className="summary-line">Gelir: {totalIncome.toLocaleString('tr-TR')} TL | Gider: {totals.gider.toLocaleString('tr-TR')} TL | Net: {net.toLocaleString('tr-TR')} TL</div>
    </div>
  );
}
