const db = require('./db');

// --- BALANCES ---
async function getBalance(userId) {
  return db.getBalance(userId);
}

async function getWallet(userId) {
  return db.getWallet(userId);
}

async function setBalance(userId, amount) {
  db.setBalance(userId, amount);
}

async function placeBet(userId, amount) {
  const wallet = db.getWallet(userId);
  if (wallet.total < amount) return { ok: false, balance: wallet.total };
  
  const fakeRatio = wallet.total > 0 ? wallet.fakecoins / wallet.total : 0;
  const f_bet = Math.round(amount * fakeRatio);
  const r_bet = amount - f_bet;
  
  const newFake = wallet.fakecoins - f_bet;
  const newReal = wallet.realcoins - r_bet;
  const newWagered = wallet.wagered + r_bet;
  
  db.setWallet(userId, newFake, newReal, newWagered);
  
  return { ok: true, balance: newFake + newReal, bet: amount, f_bet, r_bet, userId };
}

async function settleBet(userId, betContext, payout) {
  if (!betContext || !betContext.ok) return;
  const wallet = db.getWallet(userId);
  
  if (payout > 0) {
    const f_payout = Math.round(payout * (betContext.f_bet / betContext.bet));
    const r_payout = payout - f_payout;
    db.setWallet(userId, wallet.fakecoins + f_payout, wallet.realcoins + r_payout, wallet.wagered);
  }
}

// --- ADMIN & WITHDRAWALS ---
async function addDepositUsd(userId, amountUsd) {
  const coins = amountUsd * 1000;
  const wallet = db.getWallet(userId);
  db.setWallet(userId, wallet.fakecoins, wallet.realcoins + coins, wallet.wagered);
  
  const profile = db.getProfile(userId);
  profile.totalDepositedUsd = (profile.totalDepositedUsd || 0) + amountUsd;
  db.setProfile(userId, profile);
  
  return { ...profile, realBalanceCoins: wallet.realcoins + coins, totalWageredCoins: wallet.wagered };
}

async function addWithdrawalUsd(userId, amountUsd) {
  const diffCoins = amountUsd * 1000;
  const wallet = db.getWallet(userId);
  
  if (wallet.total >= diffCoins) {
    const fakeRatio = wallet.total > 0 ? wallet.fakecoins / wallet.total : 0;
    const f_deduct = Math.round(diffCoins * fakeRatio);
    const r_deduct = diffCoins - f_deduct;
    db.setWallet(userId, Math.max(0, wallet.fakecoins - f_deduct), Math.max(0, wallet.realcoins - r_deduct), wallet.wagered);
  } else {
    db.setWallet(userId, 0, 0, wallet.wagered);
  }

  const profile = db.getProfile(userId);
  profile.totalWithdrawnUsd = (profile.totalWithdrawnUsd || 0) + amountUsd;
  db.setProfile(userId, profile);
  
  return profile;
}

async function addWageredCoins(userId, amount) {
  const wallet = db.getWallet(userId);
  db.setWallet(userId, wallet.fakecoins, wallet.realcoins, wallet.wagered + amount);
  const profile = db.getProfile(userId);
  return { ...profile, totalWageredCoins: wallet.wagered + amount };
}

async function getWithdrawalEligibility(userId, amountUsd) {
  const wallet = db.getWallet(userId);
  const profile = db.getProfile(userId);
  
  const reqCoins = amountUsd * 1000;
  const deposited = profile.totalDepositedUsd || 0;
  
  const minOk = amountUsd >= 20;
  const depositOk = deposited >= 5;
  const requiredWageredCoins = deposited * 1000;
  const wagerOk = wallet.wagered >= requiredWageredCoins;
  const balanceOk = wallet.total >= reqCoins;
  
  return {
    eligible: minOk && depositOk && wagerOk && balanceOk,
    checks: { minOk, depositOk, wagerOk, balanceOk },
    current: {
      balanceCoins: wallet.total,
      requestedCoins: reqCoins,
      requiredWageredCoins
    }
  };
}

// --- DAILY CLAIMS ---
async function getLastClaim(userId) {
  return db.getLastClaim(userId);
}

async function setLastClaim(userId, timestamp) {
  db.setLastClaim(userId, timestamp);
}

// --- PROFILES ---
async function getProfile(userId) {
  const profile = db.getProfile(userId);
  const wallet = db.getWallet(userId);
  return {
    ...profile,
    realBalanceCoins: wallet.realcoins,
    totalWageredCoins: wallet.wagered
  };
}

async function setProfile(userId, profileObj) {
  db.setProfile(userId, profileObj);
}

// --- LOAD/SAVE (no-ops for DB) ---
async function loadBalances() {}
async function loadDailyClaims() {}
async function loadProfiles() {}

const getLastDailyClaim = getLastClaim;
const setLastDailyClaim = setLastClaim;

module.exports = {
  getBalance,
  getWallet,
  setBalance,
  placeBet,
  settleBet,
  getLastClaim,
  setLastClaim,
  getLastDailyClaim,
  setLastDailyClaim,
  getProfile,
  setProfile,
  addDepositUsd,
  addWithdrawalUsd,
  addWageredCoins,
  getWithdrawalEligibility,
  loadBalances,
  loadDailyClaims,
  loadProfiles
};