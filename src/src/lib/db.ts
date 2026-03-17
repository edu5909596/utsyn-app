import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'utsyn.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS open_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(day_of_week)
    );

    CREATE TABLE IF NOT EXISTS special_closures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      reason_no TEXT DEFAULT '',
      reason_en TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      guests_count INTEGER NOT NULL CHECK(guests_count BETWEEN 1 AND 60),
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      comment TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
      confirmation_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tables_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(confirmation_code);
  `);

  // Seed default settings if empty
  const settingsCount = database.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      ['site_name', 'Restaurant Utsyn'],
      ['hero_title_no', 'Velkommen til Restaurant Utsyn'],
      ['hero_title_en', 'Welcome to Restaurant Utsyn'],
      ['hero_subtitle_no', 'Nyt utsikten og maten på Tangen VGS'],
      ['hero_subtitle_en', 'Enjoy the view and food at Tangen VGS'],
      ['about_text_no', 'Restaurant Utsyn er en opplæringsrestaurant ved Tangen videregående skole. Her serverer elevene mat av høy kvalitet i en hyggelig atmosfære med fantastisk utsikt.'],
      ['about_text_en', 'Restaurant Utsyn is a training restaurant at Tangen Upper Secondary School. Here, the students serve high-quality food in a pleasant atmosphere with a fantastic view.'],
      ['price_main', '135'],
      ['price_dessert', '35'],
      ['currency', 'kr'],
      ['address', 'Tangen 21, 1. etg'],
      ['phone', ''],
      ['email', ''],
      ['max_capacity', '60'],
      ['booking_cutoff_minutes', '45'],
      ['time_slot_interval', '15'],
      ['sms_webhook_url', ''],
    ];

    const insert = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const insertMany = database.transaction((settings: string[][]) => {
      for (const [key, value] of settings) {
        insert.run(key, value);
      }
    });
    insertMany(defaultSettings);
  }

  // Seed default open days if empty
  const daysCount = database.prepare('SELECT COUNT(*) as count FROM open_days').get() as { count: number };
  if (daysCount.count === 0) {
    const defaultDays = [
      [0, '00:00', '00:00', 0], // Sunday - closed
      [1, '00:00', '00:00', 0], // Monday - closed
      [2, '00:00', '00:00', 0], // Tuesday - closed
      [3, '00:00', '00:00', 0], // Wednesday - closed
      [4, '12:00', '14:00', 1], // Thursday - open
      [5, '11:00', '13:00', 1], // Friday - open
      [6, '00:00', '00:00', 0], // Saturday - closed
    ];

    const insertDay = database.prepare('INSERT OR IGNORE INTO open_days (day_of_week, open_time, close_time, is_active) VALUES (?, ?, ?, ?)');
    const insertDays = database.transaction((days: (string | number)[][]) => {
      for (const [dow, open, close, active] of days) {
        insertDay.run(dow, open, close, active);
      }
    });
    insertDays(defaultDays);
  }
}

export default getDb;
