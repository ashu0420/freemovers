import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type UserType = 'customer' | 'driver';

export type UserRecord = {
  id: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
  phone_number: string;
  phone_verified: 0 | 1;
  preferred_locale: 'en' | 'ja';
  preferred_notification_channel: 'line' | 'whatsapp' | 'sms';
  line_user_id: string | null;
  operating_regions_json: string;
};

export type MoveItem = { name: string; quantity: number };

export type MoveRecord = {
  id: number;
  customer_id: number;
  driver_id?: number | null;
  pickup_address: string;
  pickup_postal_code: string | null;
  dropoff_address: string;
  dropoff_postal_code: string | null;
  move_date: string;
  country_code: string;
  service_area: string;
  payment_preference: string;
  items: MoveItem[];
  estimated_earnings: number;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
};

let db: ReturnType<typeof Database> | null = null;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 32;
const PASSWORD_ITERATIONS = 120_000;

function getDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'freemovers.sqlite');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      user_type TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      phone_verified INTEGER NOT NULL DEFAULT 0,
      preferred_locale TEXT NOT NULL DEFAULT 'ja',
      preferred_notification_channel TEXT NOT NULL DEFAULT 'line',
      line_user_id TEXT,
      operating_regions_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      driver_id INTEGER,
      pickup_address TEXT NOT NULL,
      pickup_postal_code TEXT,
      dropoff_address TEXT NOT NULL,
      dropoff_postal_code TEXT,
      move_date TEXT NOT NULL,
      country_code TEXT NOT NULL DEFAULT 'JP',
      service_area TEXT NOT NULL DEFAULT 'tokyo',
      payment_preference TEXT NOT NULL DEFAULT 'card',
      items_json TEXT NOT NULL,
      estimated_earnings REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      move_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      quoted_rate REAL NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(move_id, driver_id),
      FOREIGN KEY (move_id) REFERENCES moves(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      move_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read_at TEXT,
      FOREIGN KEY (driver_id) REFERENCES users(id),
      FOREIGN KEY (move_id) REFERENCES moves(id)
    );
  `);

  const columns = db
    .prepare(`PRAGMA table_info(moves)`)
    .all() as { name: string }[];
  const columnNames = new Set(columns.map((col) => col.name));
  if (!columnNames.has('driver_id')) {
    db.exec(`ALTER TABLE moves ADD COLUMN driver_id INTEGER`);
  }
  if (!columnNames.has('estimated_earnings')) {
    db.exec(`ALTER TABLE moves ADD COLUMN estimated_earnings REAL NOT NULL DEFAULT 0`);
  }
  if (!columnNames.has('pickup_postal_code')) {
    db.exec(`ALTER TABLE moves ADD COLUMN pickup_postal_code TEXT`);
  }
  if (!columnNames.has('dropoff_postal_code')) {
    db.exec(`ALTER TABLE moves ADD COLUMN dropoff_postal_code TEXT`);
  }
  if (!columnNames.has('country_code')) {
    db.exec(`ALTER TABLE moves ADD COLUMN country_code TEXT NOT NULL DEFAULT 'JP'`);
  }
  if (!columnNames.has('service_area')) {
    db.exec(`ALTER TABLE moves ADD COLUMN service_area TEXT NOT NULL DEFAULT 'tokyo'`);
  }
  if (!columnNames.has('payment_preference')) {
    db.exec(`ALTER TABLE moves ADD COLUMN payment_preference TEXT NOT NULL DEFAULT 'card'`);
  }

  const userColumns = db
    .prepare(`PRAGMA table_info(users)`)
    .all() as { name: string }[];
  const userColumnNames = new Set(userColumns.map((col) => col.name));
  if (!userColumnNames.has('preferred_locale')) {
    db.exec(`ALTER TABLE users ADD COLUMN preferred_locale TEXT NOT NULL DEFAULT 'ja'`);
  }
  if (!userColumnNames.has('phone_verified')) {
    db.exec(`ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0`);
  }
  if (!userColumnNames.has('preferred_notification_channel')) {
    db.exec(`ALTER TABLE users ADD COLUMN preferred_notification_channel TEXT NOT NULL DEFAULT 'line'`);
  }
  if (!userColumnNames.has('line_user_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN line_user_id TEXT`);
  }
  if (!userColumnNames.has('operating_regions_json')) {
    db.exec(`ALTER TABLE users ADD COLUMN operating_regions_json TEXT NOT NULL DEFAULT '[]'`);
  }

  return db;
}

export function createUser(user: Omit<UserRecord, 'id'>): UserRecord {
  const database = getDb();
  const hashedPassword = hashPassword(user.password);
  const stmt = database.prepare(`
    INSERT INTO users (
      email,
      password,
      first_name,
      last_name,
      user_type,
      phone_number,
      phone_verified,
      preferred_locale,
      preferred_notification_channel,
      line_user_id,
      operating_regions_json
    )
    VALUES (
      @email,
      @password,
      @first_name,
      @last_name,
      @user_type,
      @phone_number,
      @phone_verified,
      @preferred_locale,
      @preferred_notification_channel,
      @line_user_id,
      @operating_regions_json
    )
  `);
  const result = stmt.run({
    ...user,
    password: hashedPassword,
  });

  return {
    id: Number(result.lastInsertRowid),
    ...user,
    password: hashedPassword,
  };
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const database = getDb();
  return database
    .prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`)
    .get(email) as UserRecord | undefined;
}

export function findUserByPhone(phone: string): UserRecord[] {
  const database = getDb();
  return database
    .prepare(`SELECT * FROM users WHERE phone_number = ?`)
    .all(phone) as UserRecord[];
}

export function findUserById(id: number): UserRecord | undefined {
  const database = getDb();
  return database
    .prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`)
    .get(id) as UserRecord | undefined;
}

export function parseOperatingRegions(input: string | null | undefined) {
  if (!input) return [] as string[];
  try {
    const parsed = JSON.parse(input) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [] as string[];
  }
}

export function updateUser(
  id: number,
  updates: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    preferred_locale?: 'en' | 'ja';
    preferred_notification_channel?: 'line' | 'whatsapp' | 'sms';
    line_user_id?: string | null;
    operating_regions?: string[];
  }
) {
  const database = getDb();
  const existing = findUserById(id);
  if (!existing) return false;

  const next = {
    first_name: updates.first_name ?? existing.first_name,
    last_name: updates.last_name ?? existing.last_name,
    phone_number: updates.phone_number ?? existing.phone_number,
    preferred_locale: updates.preferred_locale ?? existing.preferred_locale,
    preferred_notification_channel:
      updates.preferred_notification_channel ?? existing.preferred_notification_channel,
    line_user_id: updates.line_user_id !== undefined ? updates.line_user_id : existing.line_user_id,
    operating_regions_json:
      updates.operating_regions !== undefined
        ? JSON.stringify(updates.operating_regions)
        : existing.operating_regions_json,
    phone_verified:
      updates.phone_number && updates.phone_number !== existing.phone_number
        ? 0
        : existing.phone_verified,
  };

  database
    .prepare(
      `UPDATE users
       SET first_name = ?,
           last_name = ?,
           phone_number = ?,
           preferred_locale = ?,
           preferred_notification_channel = ?,
           line_user_id = ?,
           operating_regions_json = ?,
           phone_verified = ?
       WHERE id = ?`
    )
    .run(
      next.first_name,
      next.last_name,
      next.phone_number,
      next.preferred_locale,
      next.preferred_notification_channel,
      next.line_user_id,
      next.operating_regions_json,
      next.phone_verified,
      id
    );
  return true;
}

export function markUsersPhoneVerified(phone: string) {
  const database = getDb();
  const result = database
    .prepare(`UPDATE users SET phone_verified = 1 WHERE phone_number = ?`)
    .run(phone);
  return result.changes;
}

export function findUserByCredentials(
  email: string,
  password: string,
  userType: UserType
): UserRecord | undefined {
  const database = getDb();
  const user = database
    .prepare(
      `SELECT * FROM users WHERE email = ? AND user_type = ? LIMIT 1`
    )
    .get(email, userType) as UserRecord | undefined;

  if (!user) return undefined;
  if (!verifyPassword(password, user.password)) return undefined;
  return user;
}

export function createMove(payload: Omit<MoveRecord, 'id' | 'created_at'>) {
  const database = getDb();
  const created_at = new Date().toISOString();
  const stmt = database.prepare(`
    INSERT INTO moves
      (
        customer_id,
        driver_id,
        pickup_address,
        pickup_postal_code,
        dropoff_address,
        dropoff_postal_code,
        move_date,
        country_code,
        service_area,
        payment_preference,
        items_json,
        estimated_earnings,
        status,
        created_at
      )
    VALUES
      (
        @customer_id,
        @driver_id,
        @pickup_address,
        @pickup_postal_code,
        @dropoff_address,
        @dropoff_postal_code,
        @move_date,
        @country_code,
        @service_area,
        @payment_preference,
        @items_json,
        @estimated_earnings,
        @status,
        @created_at
      )
  `);
  const result = stmt.run({
    customer_id: payload.customer_id,
    driver_id: payload.driver_id ?? null,
    pickup_address: payload.pickup_address,
    pickup_postal_code: payload.pickup_postal_code ?? null,
    dropoff_address: payload.dropoff_address,
    dropoff_postal_code: payload.dropoff_postal_code ?? null,
    move_date: payload.move_date,
    country_code: payload.country_code,
    service_area: payload.service_area,
    payment_preference: payload.payment_preference,
    items_json: JSON.stringify(payload.items),
    estimated_earnings: payload.estimated_earnings,
    status: payload.status,
    created_at,
  });

  return {
    id: Number(result.lastInsertRowid),
    ...payload,
    created_at,
  } satisfies MoveRecord;
}

export function listMovesByCustomer(customerId: number): MoveRecord[] {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT * FROM moves WHERE customer_id = ? ORDER BY created_at DESC`
    )
    .all(customerId) as {
    id: number;
    customer_id: number;
    driver_id: number | null;
    pickup_address: string;
    pickup_postal_code: string | null;
    dropoff_address: string;
    dropoff_postal_code: string | null;
    move_date: string;
    country_code: string;
    service_area: string;
    payment_preference: string;
    items_json: string;
    estimated_earnings: number;
    status: MoveRecord['status'];
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    driver_id: row.driver_id,
    pickup_address: row.pickup_address,
    pickup_postal_code: row.pickup_postal_code,
    dropoff_address: row.dropoff_address,
    dropoff_postal_code: row.dropoff_postal_code,
    move_date: row.move_date,
    country_code: row.country_code,
    service_area: row.service_area,
    payment_preference: row.payment_preference,
    items: JSON.parse(row.items_json) as MoveItem[],
    estimated_earnings: row.estimated_earnings ?? 0,
    status: row.status,
    created_at: row.created_at,
  }));
}

export function countUpcomingMoves(customerId: number) {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT COUNT(*) as count FROM moves WHERE customer_id = ? AND status IN ('scheduled','in_progress')`
    )
    .get(customerId) as { count: number };
  return row?.count ?? 0;
}

export function reassignMovesToCustomer(fromCustomerId: number, toCustomerId: number) {
  const database = getDb();
  const result = database
    .prepare(`UPDATE moves SET customer_id = ? WHERE customer_id = ?`)
    .run(toCustomerId, fromCustomerId);
  return result.changes;
}

export function listAvailableMoves(serviceAreas?: string[]): MoveRecord[] {
  const database = getDb();
  const query =
    serviceAreas && serviceAreas.length > 0
      ? `SELECT * FROM moves
         WHERE driver_id IS NULL
           AND status = 'pending'
           AND service_area IN (${serviceAreas.map(() => '?').join(',')})
         ORDER BY created_at DESC`
      : `SELECT * FROM moves WHERE driver_id IS NULL AND status = 'pending' ORDER BY created_at DESC`;
  const rows = database
    .prepare(query)
    .all(...(serviceAreas ?? [])) as {
    id: number;
    customer_id: number;
    driver_id: number | null;
    pickup_address: string;
    pickup_postal_code: string | null;
    dropoff_address: string;
    dropoff_postal_code: string | null;
    move_date: string;
    country_code: string;
    service_area: string;
    payment_preference: string;
    items_json: string;
    estimated_earnings: number;
    status: MoveRecord['status'];
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    driver_id: row.driver_id,
    pickup_address: row.pickup_address,
    pickup_postal_code: row.pickup_postal_code,
    dropoff_address: row.dropoff_address,
    dropoff_postal_code: row.dropoff_postal_code,
    move_date: row.move_date,
    country_code: row.country_code,
    service_area: row.service_area,
    payment_preference: row.payment_preference,
    items: JSON.parse(row.items_json) as MoveItem[],
    estimated_earnings: row.estimated_earnings ?? 0,
    status: row.status,
    created_at: row.created_at,
  }));
}

export function listMovesForDriver(driverId: number): MoveRecord[] {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT * FROM moves WHERE driver_id = ? AND status IN ('pending','scheduled','in_progress') ORDER BY move_date ASC`
    )
    .all(driverId) as {
    id: number;
    customer_id: number;
    driver_id: number | null;
    pickup_address: string;
    pickup_postal_code: string | null;
    dropoff_address: string;
    dropoff_postal_code: string | null;
    move_date: string;
    country_code: string;
    service_area: string;
    payment_preference: string;
    items_json: string;
    estimated_earnings: number;
    status: MoveRecord['status'];
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    driver_id: row.driver_id,
    pickup_address: row.pickup_address,
    pickup_postal_code: row.pickup_postal_code,
    dropoff_address: row.dropoff_address,
    dropoff_postal_code: row.dropoff_postal_code,
    move_date: row.move_date,
    country_code: row.country_code,
    service_area: row.service_area,
    payment_preference: row.payment_preference,
    items: JSON.parse(row.items_json) as MoveItem[],
    estimated_earnings: row.estimated_earnings ?? 0,
    status: row.status,
    created_at: row.created_at,
  }));
}

export function listRecentMovesForDriver(driverId: number): MoveRecord[] {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT * FROM moves WHERE driver_id = ? AND status = 'completed' ORDER BY created_at DESC`
    )
    .all(driverId) as {
    id: number;
    customer_id: number;
    driver_id: number | null;
    pickup_address: string;
    pickup_postal_code: string | null;
    dropoff_address: string;
    dropoff_postal_code: string | null;
    move_date: string;
    country_code: string;
    service_area: string;
    payment_preference: string;
    items_json: string;
    estimated_earnings: number;
    status: MoveRecord['status'];
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    driver_id: row.driver_id,
    pickup_address: row.pickup_address,
    pickup_postal_code: row.pickup_postal_code,
    dropoff_address: row.dropoff_address,
    dropoff_postal_code: row.dropoff_postal_code,
    move_date: row.move_date,
    country_code: row.country_code,
    service_area: row.service_area,
    payment_preference: row.payment_preference,
    items: JSON.parse(row.items_json) as MoveItem[],
    estimated_earnings: row.estimated_earnings ?? 0,
    status: row.status,
    created_at: row.created_at,
  }));
}

export function assignMoveToDriver(moveId: number, driverId: number, quotedRate: number) {
  const database = getDb();
  const result = database
    .prepare(
      `UPDATE moves SET driver_id = ?, estimated_earnings = ?, status = 'scheduled' WHERE id = ? AND driver_id IS NULL`
    )
    .run(driverId, quotedRate, moveId);
  return result.changes > 0;
}

export function updateMoveStatus(moveId: number, status: MoveRecord['status']) {
  const database = getDb();
  const result = database
    .prepare(`UPDATE moves SET status = ? WHERE id = ?`)
    .run(status, moveId);
  return result.changes > 0;
}

export function createOrUpdateQuote(moveId: number, driverId: number, quotedRate: number) {
  const database = getDb();
  const created_at = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO quotes (move_id, driver_id, quoted_rate, created_at)
       VALUES (@move_id, @driver_id, @quoted_rate, @created_at)
       ON CONFLICT(move_id, driver_id) DO UPDATE SET quoted_rate = excluded.quoted_rate`
    )
    .run({
      move_id: moveId,
      driver_id: driverId,
      quoted_rate: quotedRate,
      created_at,
    });
}

export function listQuotesForMove(moveId: number) {
  const database = getDb();
  return database
    .prepare(
      `SELECT move_id, driver_id, quoted_rate, created_at FROM quotes WHERE move_id = ? ORDER BY created_at DESC`
    )
    .all(moveId) as { move_id: number; driver_id: number; quoted_rate: number; created_at: string }[];
}

export function listQuotesByDriver(driverId: number) {
  const database = getDb();
  return database
    .prepare(
      `SELECT move_id, quoted_rate, created_at FROM quotes WHERE driver_id = ? ORDER BY created_at DESC`
    )
    .all(driverId) as { move_id: number; quoted_rate: number; created_at: string }[];
}

export function acceptQuote(moveId: number, driverId: number) {
  const database = getDb();
  const quote = database
    .prepare(`SELECT quoted_rate FROM quotes WHERE move_id = ? AND driver_id = ?`)
    .get(moveId, driverId) as { quoted_rate: number } | undefined;

  if (!quote) return false;

  const result = database
    .prepare(
      `UPDATE moves SET driver_id = ?, estimated_earnings = ?, status = 'scheduled' WHERE id = ?`
    )
    .run(driverId, quote.quoted_rate, moveId);
  return result.changes > 0;
}

export function createNotification(params: {
  driverId: number;
  moveId: number;
  type: string;
  message: string;
}) {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO notifications (driver_id, move_id, type, message, created_at)
       VALUES (@driver_id, @move_id, @type, @message, @created_at)`
    )
    .run({
      driver_id: params.driverId,
      move_id: params.moveId,
      type: params.type,
      message: params.message,
      created_at: new Date().toISOString(),
    });
}

export function listNotificationsForDriver(driverId: number) {
  const database = getDb();
  return database
    .prepare(
      `SELECT id, driver_id, move_id, type, message, created_at, read_at
       FROM notifications WHERE driver_id = ? ORDER BY created_at DESC`
    )
    .all(driverId) as {
    id: number;
    driver_id: number;
    move_id: number;
    type: string;
    message: string;
    created_at: string;
    read_at: string | null;
  }[];
}

export function getMoveById(moveId: number): MoveRecord | undefined {
  const database = getDb();
  const row = database
    .prepare(`SELECT * FROM moves WHERE id = ?`)
    .get(moveId) as {
    id: number;
    customer_id: number;
    driver_id: number | null;
    pickup_address: string;
    pickup_postal_code: string | null;
    dropoff_address: string;
    dropoff_postal_code: string | null;
    move_date: string;
    country_code: string;
    service_area: string;
    payment_preference: string;
    items_json: string;
    estimated_earnings: number;
    status: MoveRecord['status'];
    created_at: string;
  } | undefined;

  if (!row) return undefined;
  return {
    id: row.id,
    customer_id: row.customer_id,
    driver_id: row.driver_id,
    pickup_address: row.pickup_address,
    pickup_postal_code: row.pickup_postal_code,
    dropoff_address: row.dropoff_address,
    dropoff_postal_code: row.dropoff_postal_code,
    move_date: row.move_date,
    country_code: row.country_code,
    service_area: row.service_area,
    payment_preference: row.payment_preference,
    items: JSON.parse(row.items_json) as MoveItem[],
    estimated_earnings: row.estimated_earnings ?? 0,
    status: row.status,
    created_at: row.created_at,
  };
}

export function driverStats(driverId: number) {
  const database = getDb();
  const totalRow = database
    .prepare(
      `SELECT COALESCE(SUM(estimated_earnings),0) as total FROM moves WHERE driver_id = ? AND status = 'completed'`
    )
    .get(driverId) as { total: number };
  const completedRow = database
    .prepare(
      `SELECT COUNT(*) as count FROM moves WHERE driver_id = ? AND status = 'completed'`
    )
    .get(driverId) as { count: number };
  const activeRow = database
    .prepare(
      `SELECT COUNT(*) as count FROM moves WHERE driver_id = ? AND status IN ('scheduled','in_progress')`
    )
    .get(driverId) as { count: number };

  return {
    totalEarnings: totalRow?.total ?? 0,
    jobsCompleted: completedRow?.count ?? 0,
    rating: 0,
    activeJobs: activeRow?.count ?? 0,
  };
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES);
  const derived = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_BYTES, 'sha256');
  return `${PASSWORD_ITERATIONS}:${salt.toString('hex')}:${derived.toString('hex')}`;
}

function verifyPassword(password: string, stored: string) {
  const [iterText, saltHex, hashHex] = stored.split(':');
  if (!iterText || !saltHex || !hashHex) return false;
  const iterations = Number(iterText);
  if (!Number.isFinite(iterations)) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const derived = crypto.pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_BYTES, 'sha256');
  return crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), derived);
}
