// db.js - SQLite database layer for CoinCrown
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/coincrown.sqlite'));

// --- MIGRATION: balance -> fakecoins/realcoins/wagered ---
try {
  let hasOldBalance = false;
  try {
    const tableInfo = db.prepare("PRAGMA table_info(balances)").all();
    hasOldBalance = tableInfo.some(col => col.name === 'balance');
  } catch (e) {
    // table doesn't exist yet, ignore
  }

  if (hasOldBalance) {
    db.exec(`
      ALTER TABLE balances RENAME TO balances_old;
      CREATE TABLE balances (
        userId TEXT PRIMARY KEY,
        fakecoins INTEGER NOT NULL DEFAULT 0,
        realcoins INTEGER NOT NULL DEFAULT 0,
        wagered INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO balances (userId, fakecoins, realcoins, wagered)
      SELECT userId, balance, 0, 0 FROM balances_old;
      DROP TABLE balances_old;
    `);
  }
} catch (e) {
  console.error("DB Migration Error:", e);
}

// Create tables if they don't exist
db.exec(`
CREATE TABLE IF NOT EXISTS balances (
  userId TEXT PRIMARY KEY,
  fakecoins INTEGER NOT NULL DEFAULT 0,
  realcoins INTEGER NOT NULL DEFAULT 0,
  wagered INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_claims (
  userId TEXT PRIMARY KEY,
  lastClaim INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  userId TEXT PRIMARY KEY,
  profile TEXT NOT NULL
);
`);

// --- BALANCES ---
function getWallet(userId) {
  let row = db.prepare('SELECT fakecoins, realcoins, wagered FROM balances WHERE userId = ?').get(userId);
  if (!row) {
    // New user starter bankroll: 2000 fakecoins
    db.prepare('INSERT INTO balances (userId, fakecoins, realcoins, wagered) VALUES (?, ?, ?, ?)').run(userId, 2000, 0, 0);
    row = { fakecoins: 2000, realcoins: 0, wagered: 0 };
  }
  return {
    fakecoins: row.fakecoins,
    realcoins: row.realcoins,
    wagered: row.wagered,
    total: row.fakecoins + row.realcoins
  };
}

function getBalance(userId) {
  return getWallet(userId).total;
}

function setWallet(userId, fakecoins, realcoins, wagered) {
  // Ensure row exists first
  getWallet(userId); 
  db.prepare('UPDATE balances SET fakecoins = ?, realcoins = ?, wagered = ? WHERE userId = ?').run(
    Math.round(fakecoins), 
    Math.round(realcoins), 
    Math.round(wagered), 
    userId
  );
}

function setBalance(userId, amount) {
  const wallet = getWallet(userId);
  const diff = amount - wallet.total;
  // If setting balance manually (like admin !addbalance), apply difference to fakecoins
  setWallet(userId, Math.max(0, wallet.fakecoins + diff), wallet.realcoins, wallet.wagered);
}

// --- DAILY CLAIMS ---
function getLastClaim(userId) {
  const row = db.prepare('SELECT lastClaim FROM daily_claims WHERE userId = ?').get(userId);
  return row ? row.lastClaim : 0;
}

function setLastClaim(userId, timestamp) {
  db.prepare('INSERT INTO daily_claims (userId, lastClaim) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET lastClaim = excluded.lastClaim').run(userId, timestamp);
}

// --- PROFILES ---
function getProfile(userId) {
  const row = db.prepare('SELECT profile FROM profiles WHERE userId = ?').get(userId);
  return row ? JSON.parse(row.profile) : { totalDepositedUsd: 0, totalWithdrawnUsd: 0 };
}

function setProfile(userId, profileObj) {
  db.prepare('INSERT INTO profiles (userId, profile) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET profile = excluded.profile').run(userId, JSON.stringify(profileObj));
}

// --- LEADERBOARDS ---
function getTopRichest(limit = 10) {
  return db.prepare('SELECT userId, (fakecoins + realcoins) AS total FROM balances ORDER BY total DESC LIMIT ?').all(limit);
}

function getTopWagered(limit = 10) {
  return db.prepare('SELECT userId, wagered FROM balances ORDER BY wagered DESC LIMIT ?').all(limit);
}

module.exports = {
  getWallet,
  getBalance,
  setWallet,
  setBalance,
  getLastClaim,
  setLastClaim,
  getProfile,
  setProfile,
  getTopRichest,
  getTopWagered,
  db 
};
