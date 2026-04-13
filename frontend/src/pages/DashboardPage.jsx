import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { api } from '../api';

export default function DashboardPage() {
  const [date] = useState(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState(null);

  useEffect(() => {
    api.dashboard(date).then(setData);
  }, [date]);

  const totalIncome = useMemo(() => (data?.incomes || []).reduce((a, b) => a + b.total, 0), [data]);
  const reservationRevenue = Number(data?.dailyReservationRevenue || 0);
  const totalExpense = useMemo(() => (data?.expenses || []).reduce((a, b) => a + b.amount, 0), [data]);
  const totalDue = useMemo(() => Number(data?.receivables?.total || 0), [data]);
  const activeReservationCount = Number(data?.activeReservations || 0);
  const revenueChartData = data?.dailyRevenueByChannel || [];
  const pendingCheckins = data?.pendingCheckins || [];
  const pendingCheckouts = data?.pendingCheckouts || [];
  const cards = [
    { label: 'Günlük gelir', value: `${reservationRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`, tone: 'blue', to: '/rezervasyonlar' },
    { label: 'Boş oda', value: data?.room.free ?? 0, tone: 'green', to: '/room-rack' },
    { label: 'Kirli oda', value: data?.room.dirty ?? 0, tone: 'red', to: '/oda-durumu' },
    { label: 'Tahsil edilecek', value: `${totalDue.toLocaleString('tr-TR')} TL`, tone: 'orange', to: '/rezervasyonlar' }
  ];

  return (
    <div className="panel">
      <div className="page-title-row">
        <div>
          <h2>Ana ekran</h2>
          <p className="page-subtitle">{dayjs(date).format('D MMMM YYYY dddd')} için günlük genel durum</p>
        </div>
      </div>
      {!data ? (
        <p>Yükleniyor...</p>
      ) : (
        <>
          <div className="summary-cards">
            {cards.map((card) => (
              <Link key={card.label} to={card.to} className={`summary-card ${card.tone}`}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </Link>
            ))}
          </div>

          {pendingCheckins.length > 0 ? (
            <div className="inline-error">
              <strong>Check-in uyarısı:</strong> Bugün {pendingCheckins.length} rezervasyon kontrol bekliyor. Lütfen rezervasyonları doğrulayın.
              <ul>
                {pendingCheckins.map((item) => (
                  <li key={item.id}>
                    {item.is_due ? 'Acil' : 'Planlı'} - Oda {item.room_number} - {item.guest_name} - {dayjs(item.check_in).format('HH:mm')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pendingCheckouts.length > 0 ? (
            <div className="inline-success">
              <strong>Check-out listesi:</strong> Bugün {pendingCheckouts.length} rezervasyon çıkış bekliyor.
            </div>
          ) : null}

          <div className="grid two-col">
          <div className="card">
            <h3>Günlük gelir</h3>
            <p className="big">{reservationRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</p>
            <p className="page-subtitle">Bugün konaklayan {activeReservationCount} rezervasyonun günlük gelir toplamı</p>
            <div className="chart-wrap">
              {revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={revenueChartData} dataKey="total" nameKey="payment_channel" innerRadius={55} outerRadius={84}>
                      {revenueChartData.map((entry, index) => (
                        <Cell key={entry.payment_channel} fill={['#2f80ed', '#f5a524', '#f87171', '#2ecc71'][index % 4]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">Bugün için grafik verisi yok.</div>
              )}
            </div>
            <ul className="legend-list">
              <li>Bugün tahsil edilen: {totalIncome.toLocaleString('tr-TR')} TL</li>
              <li>Bugün tahsil edilecek: {totalDue.toLocaleString('tr-TR')} TL</li>
              {revenueChartData.map((i) => (
                <li key={i.payment_channel}>{i.payment_channel}: {i.total.toLocaleString('tr-TR')} TL</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3>Oda durumu</h3>
            <div className="status-grid">
              <div><span>Toplam oda</span><b>{data.room.total}</b></div>
              <div><span>Dolu oda</span><b>{data.room.occupied}</b></div>
              <div><span>Boş oda</span><b>{data.room.free}</b></div>
              <div className="warn"><span>Kirli oda</span><b>{data.room.dirty}</b></div>
              <div className="danger"><span>Arızalı oda</span><b>{data.room.broken}</b></div>
            </div>
          </div>

          <div className="card col-span-2">
            <h3>Günlük gider: {totalExpense.toLocaleString('tr-TR')} TL</h3>
            <table>
              <thead><tr><th>Saat</th><th>Adı</th><th>Miktar</th><th>Tutar</th></tr></thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id}><td>{e.tx_time}</td><td>{e.description}</td><td>1 adet</td><td>{e.amount.toLocaleString('tr-TR')} TL</td></tr>
                ))}
              </tbody>
            </table>
            <div className="summary-line">{reservationRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} - {totalExpense.toLocaleString('tr-TR')} = {(reservationRevenue - totalExpense).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
