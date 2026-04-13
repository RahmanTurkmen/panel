import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import morgan from 'morgan';
import dayjs from 'dayjs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import db from './db.js';

const { compareSync } = bcrypt;

const app = express();
const port = process.env.PORT || 8080;
const sessionTtlMs = Number(process.env.SESSION_TTL_MINUTES || 480) * 60 * 1000;
const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'apartotel.sid';
const secureCookie = process.env.COOKIE_SECURE === 'true';

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

const sessions = new Map();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Cok fazla giris denemesi. Lutfen daha sonra tekrar deneyin.' }
});

function buildUserPayload(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role
  };
}

function createSession(user) {
  const sessionId = randomUUID();
  sessions.set(sessionId, {
    ...buildUserPayload(user),
    expiresAt: Date.now() + sessionTtlMs
  });
  return sessionId;
}

function getSession(req) {
  const cookieSessionId = req.cookies?.[sessionCookieName];
  const authHeader = req.headers.authorization || '';
  const bearerSessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const sessionId = cookieSessionId || bearerSessionId;
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return { sessionId, session };
}

function serializeReservation(row) {
  if (!row) {
    return null;
  }

  const amount = Number(row.amount || 0);
  const paidAmount = Number(row.paid_amount || 0);
  const paymentDate = row.payment_date ? dayjs(row.payment_date).format('YYYY-MM-DD') : '';

  return {
    ...row,
    amount,
    paid_amount: paidAmount,
    payment_date: paymentDate,
    balance_due: Math.max(0, amount - paidAmount),
    checkin_done: Boolean(row.checkin_done),
    checkout_done: Boolean(row.checkout_done),
    adults: Number(row.adults || 1),
    children: Number(row.children || 0)
  };
}

function findReservationConflict(roomNumber, checkIn, checkOut, excludeId = null) {
  if (excludeId) {
    return db
      .prepare(
        `SELECT guest_name, check_in, check_out
         FROM reservations
         WHERE room_number = ?
           AND id != ?
           AND datetime(check_in) < datetime(?)
           AND datetime(check_out) > datetime(?)
         ORDER BY datetime(check_in)
         LIMIT 1`
      )
      .get(roomNumber, excludeId, checkOut, checkIn);
  }

  return db
    .prepare(
      `SELECT guest_name, check_in, check_out
       FROM reservations
       WHERE room_number = ?
         AND datetime(check_in) < datetime(?)
         AND datetime(check_out) > datetime(?)
       ORDER BY datetime(check_in)
       LIMIT 1`
    )
    .get(roomNumber, checkOut, checkIn);
}

function normalizePaymentChannel(value) {
  const normalized = String(value || 'Pesin').trim();

  if (!normalized) {
    return 'Pesin';
  }

  if (normalized === 'Nakit') {
    return 'Pesin';
  }

  return normalized;
}

function getPaymentDate(rawValue, fallbackDate = dayjs().format('YYYY-MM-DD')) {
  const value = String(rawValue || '').trim();

  if (value && dayjs(value).isValid()) {
    return dayjs(value).format('YYYY-MM-DD');
  }

  if (fallbackDate && dayjs(fallbackDate).isValid()) {
    return dayjs(fallbackDate).format('YYYY-MM-DD');
  }

  return dayjs().format('YYYY-MM-DD');
}

function buildReservationPaymentDescription(reservation) {
  return `Rezervasyon odemesi #${reservation.rez_no} - ${reservation.guest_name}`;
}

function syncReservationPaymentTransaction(reservation, actorName = 'Sistem') {
  const paidAmount = Number(reservation.paid_amount || 0);
  const paymentChannel = normalizePaymentChannel(reservation.payment_type);
  const paymentDate = getPaymentDate(reservation.payment_date, reservation.check_in);
  const existing = db
    .prepare("SELECT * FROM cash_transactions WHERE reservation_id = ? AND source_type = 'reservation_payment'")
    .get(reservation.id);

  if (paidAmount <= 0) {
    if (existing) {
      db.prepare('DELETE FROM cash_transactions WHERE id = ?').run(existing.id);
    }
    return;
  }

  const txTime = existing?.tx_time || dayjs().format('HH:mm');
  const description = buildReservationPaymentDescription(reservation);
  const staff = existing?.staff || actorName;
  const sourceLabel = `Rezervasyon #${reservation.rez_no}`;

  if (existing) {
    db.prepare(
      `UPDATE cash_transactions
       SET tx_date = ?, tx_time = ?, type = ?, amount = ?, room_number = ?, payment_channel = ?, description = ?, staff = ?, source_label = ?
       WHERE id = ?`
    ).run(
      paymentDate,
      txTime,
      'income',
      paidAmount,
      reservation.room_number,
      paymentChannel,
      description,
      staff,
      sourceLabel,
      existing.id
    );
    return;
  }

  db.prepare(
    `INSERT INTO cash_transactions
     (tx_date, tx_time, type, amount, room_number, payment_channel, description, staff, reservation_id, source_type, source_label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    paymentDate,
    txTime,
    'income',
    paidAmount,
    reservation.room_number,
    paymentChannel,
    description,
    actorName,
    reservation.id,
    'reservation_payment',
    sourceLabel
  );
}

function deleteReservationPaymentTransaction(reservationId) {
  db.prepare("DELETE FROM cash_transactions WHERE reservation_id = ? AND source_type = 'reservation_payment'").run(reservationId);
}

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  }
}, 30 * 60 * 1000).unref();

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Kullanici adi ve sifre zorunlu.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim());

  if (!user || !compareSync(password, user.password)) {
    return res.status(401).json({ message: 'Kullanici adi veya sifre hatali.' });
  }

  const sessionId = createSession(user);

  res.cookie(sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    maxAge: sessionTtlMs,
    path: '/'
  });

  return res.json({
    user: buildUserPayload(user)
  });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/auth/login' || req.path === '/auth/me' || (req.path === '/settings' && req.method === 'GET')) {
    return next();
  }

  const authState = getSession(req);

  if (!authState) {
    return res.status(401).json({ message: 'Oturum suresi doldu. Tekrar giris yapin.' });
  }

  authState.session.expiresAt = Date.now() + sessionTtlMs;
  req.user = authState.session;
  req.sessionId = authState.sessionId;
  return next();
});

app.get('/api/auth/me', (req, res) => {
  const authState = getSession(req);

  if (!authState) {
    return res.json({ user: null });
  }

  authState.session.expiresAt = Date.now() + sessionTtlMs;
  return res.json({ user: buildUserPayload(authState.session) });
});

app.post('/api/auth/logout', (req, res) => {
  if (req.sessionId) {
    sessions.delete(req.sessionId);
  }

  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    path: '/'
  });

  res.status(204).send();
});

app.get('/api/rooms', (_, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY CAST(number AS INTEGER)').all();
  res.json(rooms);
});

app.post('/api/rooms', (req, res) => {
  const { number, floor, room_type, status = 'Temiz' } = req.body;

  if (!number || !floor || !room_type) {
    return res.status(400).json({ message: 'Oda numarasi, kat ve oda tipi zorunlu.' });
  }

  const existing = db.prepare('SELECT id FROM rooms WHERE number = ?').get(number);
  if (existing) {
    return res.status(409).json({ message: 'Bu oda numarasi zaten mevcut.' });
  }

  const info = db.prepare('INSERT INTO rooms (number, floor, room_type, status) VALUES (?, ?, ?, ?)').run(number, floor, room_type, status);
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(room);
});

app.put('/api/rooms/:id', (req, res) => {
  const roomId = Number(req.params.id);
  const { number, floor, room_type, status } = req.body;
  const current = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);

  if (!current) {
    return res.status(404).json({ message: 'Oda bulunamadi.' });
  }

  if (!number || !floor || !room_type || !status) {
    return res.status(400).json({ message: 'Tum alanlar zorunlu.' });
  }

  const duplicate = db.prepare('SELECT id FROM rooms WHERE number = ? AND id != ?').get(number, roomId);
  if (duplicate) {
    return res.status(409).json({ message: 'Bu oda numarasi zaten mevcut.' });
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE rooms SET number = ?, floor = ?, room_type = ?, status = ? WHERE id = ?').run(number, floor, room_type, status, roomId);

    if (current.number !== number) {
      db.prepare('UPDATE reservations SET room_number = ? WHERE room_number = ?').run(number, current.number);
      db.prepare('UPDATE cash_transactions SET room_number = ? WHERE room_number = ?').run(number, current.number);
    }
  });

  tx();

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  return res.json(room);
});

app.delete('/api/rooms/:id', (req, res) => {
  const roomId = Number(req.params.id);
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);

  if (!room) {
    return res.status(404).json({ message: 'Oda bulunamadi.' });
  }

  const reservationCount = db.prepare('SELECT COUNT(*) AS total FROM reservations WHERE room_number = ?').get(room.number).total;
  if (reservationCount > 0) {
    return res.status(409).json({ message: 'Bu odaya ait rezervasyonlar oldugu icin silinemez.' });
  }

  db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
  return res.status(204).send();
});

app.patch('/api/rooms/:roomNumber/status', (req, res) => {
  const { roomNumber } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ message: 'status zorunlu' });
  }
  db.prepare('UPDATE rooms SET status = ? WHERE number = ?').run(status, roomNumber);
  const room = db.prepare('SELECT * FROM rooms WHERE number = ?').get(roomNumber);
  res.json(room);
});

app.get('/api/reservations', (req, res) => {
  const from = req.query.from || dayjs().startOf('month').format('YYYY-MM-DD');
  const to = req.query.to || dayjs().endOf('month').format('YYYY-MM-DD');

  const rows = db
    .prepare(
      `SELECT * FROM reservations
       WHERE date(check_out) >= date(?) AND date(check_in) <= date(?)
       ORDER BY datetime(check_in)`
    )
    .all(from, to);

  res.json(rows.map(serializeReservation));
});

app.post('/api/reservations', (req, res) => {
  const {
    guest_name,
    room_number,
    check_in,
    check_out,
    adults = 1,
    children = 0,
    board_type = 'Sadece oda',
    agency = '',
    payment_type = 'Pesin',
    payment_date,
    amount = 0,
    paid_amount = 0,
    note = '',
    color = '#69db7c'
  } = req.body;

  if (!guest_name || !room_number || !check_in || !check_out) {
    return res.status(400).json({ message: 'Eksik alan var.' });
  }

  const roomExists = db.prepare('SELECT id FROM rooms WHERE number = ?').get(room_number);
  if (!roomExists) {
    return res.status(400).json({ message: 'Secilen oda mevcut degil.' });
  }

  const checkInDate = dayjs(check_in);
  const checkOutDate = dayjs(check_out);
  if (!checkInDate.isValid() || !checkOutDate.isValid()) {
    return res.status(400).json({ message: 'Giris/Cikis tarihi gecersiz.' });
  }

  if (!checkOutDate.isAfter(checkInDate)) {
    return res.status(400).json({ message: 'Cikis tarihi giris tarihinden sonra olmalidir.' });
  }

  const numericAmount = Number(amount);
  const numericPaidAmount = Number(paid_amount || 0);
  const numericAdults = Math.max(1, Number(adults || 1));
  const numericChildren = Math.max(0, Number(children || 0));
  const normalizedPaymentType = normalizePaymentChannel(payment_type);
  const normalizedPaymentDate = getPaymentDate(payment_date, check_in);

  if (Number.isNaN(numericAmount) || numericAmount < 0) {
    return res.status(400).json({ message: 'Toplam tutar gecersiz.' });
  }

  if (Number.isNaN(numericPaidAmount) || numericPaidAmount < 0 || numericPaidAmount > numericAmount) {
    return res.status(400).json({ message: 'Odenen tutar gecersiz.' });
  }

  const conflict = findReservationConflict(room_number, check_in, check_out);

  if (conflict) {
    return res.status(409).json({
      message: `Bu oda bu tarihlerde dolu. Cakisan rezervasyon: ${conflict.guest_name} (${conflict.check_in} - ${conflict.check_out}).`
    });
  }

  const nights = Math.max(1, dayjs(check_out).diff(dayjs(check_in), 'day'));
  const rezNo = Math.floor(Math.random() * 90000) + 10000;

  const info = db.transaction(() => {
    const insertInfo = db
      .prepare(
        `INSERT INTO reservations
        (rez_no, guest_name, room_number, check_in, check_out, nights, adults, children, board_type, agency, payment_type, payment_date, amount, paid_amount, note, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        rezNo,
        guest_name,
        room_number,
        check_in,
        check_out,
        nights,
        numericAdults,
        numericChildren,
        board_type,
        agency,
        normalizedPaymentType,
        normalizedPaymentDate,
        numericAmount,
        numericPaidAmount,
        note,
        color
      );

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(insertInfo.lastInsertRowid);
    syncReservationPaymentTransaction(reservation, req.user?.full_name || 'Sistem');
    return insertInfo;
  })();

  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(serializeReservation(row));
});

app.put('/api/reservations/:id', (req, res) => {
  const reservationId = Number(req.params.id);

  if (Number.isNaN(reservationId)) {
    return res.status(400).json({ message: 'Gecersiz rezervasyon id.' });
  }

  const current = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
  if (!current) {
    return res.status(404).json({ message: 'Rezervasyon bulunamadi.' });
  }

  const {
    guest_name,
    room_number,
    check_in,
    check_out,
    adults = 1,
    children = 0,
    board_type = 'Sadece oda',
    agency = '',
    payment_type = 'Pesin',
    payment_date,
    amount = 0,
    paid_amount = 0,
    note = '',
    color = '#69db7c',
    checkin_done = false,
    checkout_done = false
  } = req.body;

  if (!guest_name || !room_number || !check_in || !check_out) {
    return res.status(400).json({ message: 'Eksik alan var.' });
  }

  const roomExists = db.prepare('SELECT id FROM rooms WHERE number = ?').get(room_number);
  if (!roomExists) {
    return res.status(400).json({ message: 'Secilen oda mevcut degil.' });
  }

  const checkInDate = dayjs(check_in);
  const checkOutDate = dayjs(check_out);
  if (!checkInDate.isValid() || !checkOutDate.isValid()) {
    return res.status(400).json({ message: 'Giris/Cikis tarihi gecersiz.' });
  }

  if (!checkOutDate.isAfter(checkInDate)) {
    return res.status(400).json({ message: 'Cikis tarihi giris tarihinden sonra olmalidir.' });
  }

  const numericAmount = Number(amount);
  const numericPaidAmount = Number(paid_amount || 0);
  const numericAdults = Math.max(1, Number(adults || 1));
  const numericChildren = Math.max(0, Number(children || 0));
  const normalizedPaymentType = normalizePaymentChannel(payment_type);
  const normalizedPaymentDate = getPaymentDate(payment_date, check_in);
  const nextCheckinDone = checkin_done ? 1 : 0;
  const nextCheckoutDone = checkout_done ? 1 : 0;

  if (Number.isNaN(numericAmount) || numericAmount < 0) {
    return res.status(400).json({ message: 'Toplam tutar gecersiz.' });
  }

  if (Number.isNaN(numericPaidAmount) || numericPaidAmount < 0 || numericPaidAmount > numericAmount) {
    return res.status(400).json({ message: 'Odenen tutar gecersiz.' });
  }

  if (nextCheckoutDone && !nextCheckinDone) {
    return res.status(400).json({ message: 'Check-out icin once check-in tamamlanmali.' });
  }

  const conflict = findReservationConflict(room_number, check_in, check_out, reservationId);

  if (conflict) {
    return res.status(409).json({
      message: `Bu oda bu tarihlerde dolu. Cakisan rezervasyon: ${conflict.guest_name} (${conflict.check_in} - ${conflict.check_out}).`
    });
  }

  const nights = Math.max(1, checkOutDate.diff(checkInDate, 'day'));

  db.transaction(() => {
    db.prepare(
      `UPDATE reservations
       SET guest_name = ?, room_number = ?, check_in = ?, check_out = ?, nights = ?, adults = ?, children = ?, board_type = ?, agency = ?, payment_type = ?, payment_date = ?, amount = ?, paid_amount = ?, note = ?, color = ?, checkin_done = ?, checkout_done = ?
       WHERE id = ?`
    ).run(
      guest_name,
      room_number,
      check_in,
      check_out,
      nights,
      numericAdults,
      numericChildren,
      board_type,
      agency,
      normalizedPaymentType,
      normalizedPaymentDate,
      numericAmount,
      numericPaidAmount,
      note,
      color,
      nextCheckinDone,
      nextCheckoutDone,
      reservationId
    );

    const updatedReservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    syncReservationPaymentTransaction(updatedReservation, req.user?.full_name || 'Sistem');
  })();

  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
  return res.json(serializeReservation(row));
});

app.patch('/api/reservations/:id/checkin', (req, res) => {
  const reservationId = Number(req.params.id);
  const { checkin_done } = req.body;

  if (Number.isNaN(reservationId)) {
    return res.status(400).json({ message: 'Gecersiz rezervasyon id.' });
  }

  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);

  if (!reservation) {
    return res.status(404).json({ message: 'Rezervasyon bulunamadi.' });
  }

  db.prepare('UPDATE reservations SET checkin_done = ?, checkout_done = ? WHERE id = ?').run(
    checkin_done ? 1 : 0,
    checkin_done ? reservation.checkout_done : 0,
    reservationId
  );

  const updated = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
  return res.json(serializeReservation(updated));
});

app.patch('/api/reservations/:id/checkout', (req, res) => {
  const reservationId = Number(req.params.id);
  const { checkout_done } = req.body;

  if (Number.isNaN(reservationId)) {
    return res.status(400).json({ message: 'Gecersiz rezervasyon id.' });
  }

  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
  if (!reservation) {
    return res.status(404).json({ message: 'Rezervasyon bulunamadi.' });
  }

  if (checkout_done && !reservation.checkin_done) {
    return res.status(400).json({ message: 'Check-out icin once check-in yapilmis olmali.' });
  }

  db.prepare('UPDATE reservations SET checkout_done = ? WHERE id = ?').run(checkout_done ? 1 : 0, reservationId);
  const updated = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
  return res.json(serializeReservation(updated));
});

app.delete('/api/reservations/:id', (req, res) => {
  const reservationId = Number(req.params.id);

  if (Number.isNaN(reservationId)) {
    return res.status(400).json({ message: 'Gecersiz rezervasyon id.' });
  }

  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
  if (!reservation) {
    return res.status(404).json({ message: 'Rezervasyon bulunamadi.' });
  }

  db.transaction(() => {
    deleteReservationPaymentTransaction(reservationId);
    db.prepare('DELETE FROM reservations WHERE id = ?').run(reservationId);
  })();
  return res.status(204).send();
});

app.get('/api/dashboard', (req, res) => {
  const date = req.query.date || dayjs().format('YYYY-MM-DD');
  const now = dayjs();

  const activeReservations = db
    .prepare(
      `SELECT *
       FROM reservations
       WHERE date(check_in) <= date(?) AND date(check_out) > date(?) AND checkout_done = 0
       ORDER BY datetime(check_in)`
    )
    .all(date, date)
    .map(serializeReservation);

  const dailyReservationRevenue = activeReservations.reduce((sum, reservation) => {
    const nights = Math.max(1, Number(reservation.nights || 1));
    return sum + Number(reservation.amount || 0) / nights;
  }, 0);

  const dailyRevenueByChannelMap = new Map();
  activeReservations.forEach((reservation) => {
    const channel = normalizePaymentChannel(reservation.payment_type);
    const nights = Math.max(1, Number(reservation.nights || 1));
    const dailyAmount = Number(reservation.amount || 0) / nights;
    dailyRevenueByChannelMap.set(channel, (dailyRevenueByChannelMap.get(channel) || 0) + dailyAmount);
  });

  const dailyRevenueByChannel = Array.from(dailyRevenueByChannelMap.entries()).map(([payment_channel, total]) => ({
    payment_channel,
    total
  }));

  const incomes = db
    .prepare(
      `SELECT
         CASE WHEN payment_channel IN ('Pesin', 'Nakit') THEN 'Pesin' ELSE payment_channel END AS payment_channel,
         SUM(amount) AS total
       FROM cash_transactions
       WHERE tx_date = ? AND type = ?
       GROUP BY CASE WHEN payment_channel IN ('Pesin', 'Nakit') THEN 'Pesin' ELSE payment_channel END`
    )
    .all(date, 'income');
  const expenses = db
    .prepare('SELECT * FROM cash_transactions WHERE tx_date = ? AND type = ? ORDER BY tx_time')
    .all(date, 'expense');

  const roomStats = db
    .prepare(
      `SELECT COUNT(DISTINCT r.number) AS occupied
       FROM rooms r
       JOIN reservations rez ON rez.room_number = r.number
       WHERE date(rez.check_in) <= date(?) AND date(rez.check_out) > date(?) AND rez.checkout_done = 0`
    )
    .get(date, date);

  const totalRooms = db.prepare('SELECT COUNT(*) AS total FROM rooms').get().total;
  const occupied = Math.min(totalRooms, roomStats.occupied || 0);
  const free = Math.max(0, totalRooms - occupied);
  const dirty = db.prepare('SELECT COUNT(*) AS total FROM rooms WHERE status = ?').get('Kirli').total;
  const broken = db.prepare('SELECT COUNT(*) AS total FROM rooms WHERE status = ?').get('Arizali').total;

  const pendingCheckins = db
    .prepare(
      `SELECT id, rez_no, guest_name, room_number, check_in, check_out
       FROM reservations
       WHERE date(check_in) = date(?) AND checkin_done = 0
       ORDER BY datetime(check_in)`
    )
    .all(date)
    .map((row) => ({
      ...row,
      is_due: dayjs(row.check_in).isBefore(now) || dayjs(row.check_in).isSame(now)
    }));

  const pendingCheckouts = db
    .prepare(
      `SELECT *
       FROM reservations
       WHERE date(check_out) = date(?) AND checkin_done = 1 AND checkout_done = 0
       ORDER BY datetime(check_out)`
    )
    .all(date)
    .map(serializeReservation);

  const receivableTotal =
    db
      .prepare(
        `SELECT COALESCE(SUM(MAX(amount - paid_amount, 0)), 0) AS total
         FROM reservations
         WHERE checkout_done = 0`
      )
      .get().total || 0;

  res.json({
    activeReservations: activeReservations.length,
    dailyReservationRevenue,
    dailyRevenueByChannel,
    incomes,
    expenses,
    pendingCheckins,
    pendingCheckouts,
    receivables: {
      total: Number(receivableTotal || 0)
    },
    room: {
      total: totalRooms,
      occupied,
      free,
      dirty,
      broken
    }
  });
});

app.get('/api/cash/daily', (req, res) => {
  const date = req.query.date || dayjs().format('YYYY-MM-DD');
  const income = db.prepare('SELECT * FROM cash_transactions WHERE tx_date = ? AND type = ? ORDER BY tx_time').all(date, 'income');
  const expense = db.prepare('SELECT * FROM cash_transactions WHERE tx_date = ? AND type = ? ORDER BY tx_time').all(date, 'expense');
  res.json({ date, income, expense });
});

app.post('/api/cash/transactions', (req, res) => {
  const {
    tx_date,
    tx_time,
    type,
    amount,
    room_number = '',
    payment_channel,
    description = '',
    staff = 'Hasan Tuncer'
  } = req.body;

  if (!tx_date || !tx_time || !type || !payment_channel) {
    return res.status(400).json({ message: 'Tarih, saat, tip ve odeme kanali zorunlu.' });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'Tip income veya expense olmalidir.' });
  }

  const numericAmount = Number(amount);
  const normalizedPaymentChannel = normalizePaymentChannel(payment_channel);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Tutar 0 dan buyuk olmali.' });
  }

  const info = db
    .prepare(
      `INSERT INTO cash_transactions
       (tx_date, tx_time, type, amount, room_number, payment_channel, description, staff)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(tx_date, tx_time, type, numericAmount, room_number, normalizedPaymentChannel, description, staff);

  const row = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(row);
});

app.put('/api/cash/transactions/:id', (req, res) => {
  const txId = Number(req.params.id);
  const {
    tx_date,
    tx_time,
    type,
    amount,
    room_number = '',
    payment_channel,
    description = '',
    staff = 'Hasan Tuncer'
  } = req.body;

  if (Number.isNaN(txId)) {
    return res.status(400).json({ message: 'Gecersiz islem id.' });
  }

  const existing = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(txId);
  if (!existing) {
    return res.status(404).json({ message: 'Islem bulunamadi.' });
  }

  if (existing.source_type === 'reservation_payment') {
    return res.status(409).json({ message: 'Bu gelir rezervasyondan otomatik olustu. Degisiklik icin rezervasyonu duzenleyin.' });
  }

  if (!tx_date || !tx_time || !type || !payment_channel) {
    return res.status(400).json({ message: 'Tarih, saat, tip ve odeme kanali zorunlu.' });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'Tip income veya expense olmalidir.' });
  }

  const numericAmount = Number(amount);
  const normalizedPaymentChannel = normalizePaymentChannel(payment_channel);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Tutar 0 dan buyuk olmali.' });
  }

  db.prepare(
    `UPDATE cash_transactions
     SET tx_date = ?, tx_time = ?, type = ?, amount = ?, room_number = ?, payment_channel = ?, description = ?, staff = ?
     WHERE id = ?`
  ).run(tx_date, tx_time, type, numericAmount, room_number, normalizedPaymentChannel, description, staff, txId);

  const row = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(txId);
  return res.json(row);
});

app.delete('/api/cash/transactions/:id', (req, res) => {
  const txId = Number(req.params.id);

  if (Number.isNaN(txId)) {
    return res.status(400).json({ message: 'Gecersiz islem id.' });
  }

  const existing = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(txId);
  if (!existing) {
    return res.status(404).json({ message: 'Islem bulunamadi.' });
  }

  if (existing.source_type === 'reservation_payment') {
    return res.status(409).json({ message: 'Bu gelir rezervasyondan otomatik olustu. Silmek icin rezervasyonu guncelleyin.' });
  }

  db.prepare('DELETE FROM cash_transactions WHERE id = ?').run(txId);
  return res.status(204).send();
});

app.get('/api/cash/general', (req, res) => {
  const start = req.query.start || dayjs().startOf('month').format('YYYY-MM-DD');
  const end = req.query.end || dayjs().endOf('month').format('YYYY-MM-DD');
  const rows = db
    .prepare(
      `SELECT
        tx_date,
        SUM(CASE WHEN type = 'income' AND payment_channel IN ('Pesin', 'Nakit') THEN amount ELSE 0 END) AS pesin,
        SUM(CASE WHEN type = 'income' AND payment_channel = 'Kredi karti' THEN amount ELSE 0 END) AS kredi,
        SUM(CASE WHEN type = 'income' AND payment_channel = 'Havale' THEN amount ELSE 0 END) AS havale,
        SUM(CASE WHEN type = 'income' AND payment_channel = 'Online' THEN amount ELSE 0 END) AS online,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS gider
      FROM cash_transactions
      WHERE date(tx_date) BETWEEN date(?) AND date(?)
      GROUP BY tx_date
      ORDER BY tx_date`
    )
    .all(start, end);
  res.json(rows);
});

app.get('/api/profit-loss', (req, res) => {
  const start = req.query.start || dayjs().startOf('month').format('YYYY-MM-DD');
  const end = req.query.end || dayjs().endOf('month').format('YYYY-MM-DD');
  const rows = db
    .prepare(
      `SELECT
         tx_date AS tarih,
         SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS gelir,
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS gider
       FROM cash_transactions
       WHERE date(tx_date) BETWEEN date(?) AND date(?)
       GROUP BY tx_date
       ORDER BY tx_date`
    )
    .all(start, end)
    .map((row) => {
      const kar = row.gelir - row.gider;
      const yuzde = row.gelir === 0 ? 0 : (kar / row.gelir) * 100;
      return { ...row, kar, yuzde };
    });

  res.json(rows);
});

app.get('/api/forecast', (req, res) => {
  const month = req.query.month || dayjs().format('YYYY-MM');
  const daysInMonth = dayjs(`${month}-01`).daysInMonth();
  const totalRooms = db.prepare('SELECT COUNT(*) AS total FROM rooms').get().total;
  const rows = [];

  for (let i = 1; i <= daysInMonth; i += 1) {
    const date = dayjs(`${month}-${String(i).padStart(2, '0')}`).format('YYYY-MM-DD');
    const occupied =
      db
        .prepare(
          `SELECT COUNT(DISTINCT r.number) AS total
           FROM rooms r
           JOIN reservations rez ON rez.room_number = r.number
            WHERE date(rez.check_in) <= date(?) AND date(rez.check_out) > date(?) AND rez.checkout_done = 0`
        )
        .get(date, date).total || 0;

    const safeOccupied = Math.min(totalRooms, occupied);

    rows.push({
      date,
      room: totalRooms,
      occupied: safeOccupied,
      free: Math.max(0, totalRooms - safeOccupied)
    });
  }

  res.json(rows);
});

app.get('/api/room-rack', (req, res) => {
  const start = req.query.start || dayjs().format('YYYY-MM-DD');
  const days = Number(req.query.days || 10);
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY CAST(number AS INTEGER)').all();
  const reservations = db.prepare('SELECT * FROM reservations').all();

  const columns = Array.from({ length: days }, (_, i) => dayjs(start).add(i, 'day').format('YYYY-MM-DD'));

  res.json({ rooms, reservations, columns });
});

app.get('/api/settings', (_, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const {
    opening_page,
    checkin_time,
    checkout_time,
    previous_days,
    next_days,
    occupied_color,
    free_color,
    hotel_name
  } = req.body;

  db.prepare(
    `UPDATE settings
     SET opening_page = ?, checkin_time = ?, checkout_time = ?, previous_days = ?, next_days = ?, occupied_color = ?, free_color = ?, hotel_name = ?
     WHERE id = 1`
  ).run(opening_page, checkin_time, checkout_time, previous_days, next_days, occupied_color, free_color, hotel_name);

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

app.use(express.static('public'));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  return res.sendFile('index.html', { root: 'public' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
