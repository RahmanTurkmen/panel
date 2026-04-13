import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import fs from 'node:fs';
import path from 'node:path';

const { hashSync } = bcrypt;

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'apartotel.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE NOT NULL,
  floor TEXT NOT NULL,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Temiz'
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rez_no INTEGER NOT NULL,
  guest_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  nights INTEGER NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  board_type TEXT NOT NULL DEFAULT 'Sadece oda',
  agency TEXT DEFAULT '',
  payment_type TEXT DEFAULT 'Pesin',
  payment_date TEXT DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  color TEXT DEFAULT '#69db7c',
  checkin_done INTEGER NOT NULL DEFAULT 0,
  checkout_done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_date TEXT NOT NULL,
  tx_time TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  room_number TEXT DEFAULT '',
  payment_channel TEXT NOT NULL,
  description TEXT DEFAULT '',
  staff TEXT DEFAULT 'Hasan Tuncer',
  reservation_id INTEGER,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_label TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  opening_page TEXT NOT NULL DEFAULT 'Room rack',
  checkin_time TEXT NOT NULL DEFAULT '14:00',
  checkout_time TEXT NOT NULL DEFAULT '11:00',
  previous_days INTEGER NOT NULL DEFAULT 1,
  next_days INTEGER NOT NULL DEFAULT 15,
  occupied_color TEXT NOT NULL DEFAULT '#99e27d',
  free_color TEXT NOT NULL DEFAULT '#ffffff'
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
);
`);

function addColumnIfMissing(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

addColumnIfMissing('reservations', 'adults', 'INTEGER NOT NULL DEFAULT 1');
addColumnIfMissing('reservations', 'children', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('reservations', 'board_type', "TEXT NOT NULL DEFAULT 'Sadece oda'");
addColumnIfMissing('reservations', 'payment_date', "TEXT DEFAULT ''");
addColumnIfMissing('reservations', 'paid_amount', 'REAL NOT NULL DEFAULT 0');
addColumnIfMissing('reservations', 'checkout_done', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('cash_transactions', 'reservation_id', 'INTEGER');
addColumnIfMissing('cash_transactions', 'source_type', "TEXT NOT NULL DEFAULT 'manual'");
addColumnIfMissing('cash_transactions', 'source_label', "TEXT DEFAULT ''");
addColumnIfMissing('settings', 'hotel_name', "TEXT NOT NULL DEFAULT 'Lizbon Otel'");

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_transactions_reservation_payment
ON cash_transactions(reservation_id, source_type)
WHERE reservation_id IS NOT NULL AND source_type = 'reservation_payment';
`);

const roomCount = db.prepare('SELECT COUNT(*) AS total FROM rooms').get().total;
if (roomCount === 0) {
  const seedRooms = [
    
  ];

  const stmt = db.prepare('INSERT INTO rooms (number, floor, room_type, status) VALUES (?, ?, ?, ?)');
  const insertMany = db.transaction((rows) => rows.forEach((r) => stmt.run(...r)));
  insertMany(seedRooms);
}

const reservationCount = db.prepare('SELECT COUNT(*) AS total FROM reservations').get().total;
const seedReservationDemo = process.env.SEED_RESERVATION_DEMO === 'true';
if (reservationCount === 0 && seedReservationDemo) {
  const now = dayjs('2023-02-18');
  const seedReservations = [
    
  ];

  const stmt = db.prepare(`
    INSERT INTO reservations
    (rez_no, guest_name, room_number, check_in, check_out, nights, agency, payment_type, amount, note, color, checkin_done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((rows) => rows.forEach((r) => stmt.run(...r)));
  insertMany(seedReservations);
}

const cashCount = db.prepare('SELECT COUNT(*) AS total FROM cash_transactions').get().total;
if (cashCount === 0) {
  const seedCash = [
   
  ];
  const stmt = db.prepare(`
    INSERT INTO cash_transactions
    (tx_date, tx_time, type, amount, room_number, payment_channel, description, staff)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((rows) => rows.forEach((r) => stmt.run(...r)));
  insertMany(seedCash);
}

db.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run();

const adminUsername = process.env.ADMIN_USERNAME || 'superadmin';
const adminPassword = process.env.ADMIN_PASSWORD || 'ApartOtel!Admin2026#';
const adminFullName = process.env.ADMIN_FULL_NAME || 'System Administrator';
const adminPasswordHash = hashSync(adminPassword, 12);
const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1').get('admin');

if (existingAdmin) {
  db.prepare(
    `UPDATE users
     SET username = ?, password = ?, full_name = ?, role = ?
     WHERE id = ?`
  ).run(adminUsername, adminPasswordHash, adminFullName, 'admin', existingAdmin.id);
} else {
  db.prepare(
    `INSERT INTO users (username, password, full_name, role)
     VALUES (?, ?, ?, ?)`
  ).run(adminUsername, adminPasswordHash, adminFullName, 'admin');
}

export default db;
