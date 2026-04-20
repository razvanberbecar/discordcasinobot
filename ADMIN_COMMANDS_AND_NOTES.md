# CoinCrown Admin Commands and Notes

## Owner Access
- Owner ID: `336936674510635010`
- Owner/admin commands are hidden from non-owner users (silently ignored).

## Public Economy Commands
- `!balance`
- `!daily` (24h cooldown, persistent)
- `!profile` (view your own profile, admins can add `<userId>` to view others)

## Public Game Commands (with shortcuts)
- Coinflip: `!coinflip <amount> <heads|tails>` or `!cf <amount> <heads|tails>`
- Slots: `!slots <bet> <paylines> [image|text]` or `!sl <bet> <paylines> [image|text]`
- Dice: `!dice <bet> <prediction>` or `!d <bet> <prediction>`
- Higher/Lower: `!higherlower <bet>` or `!hl <bet>`
- Mines: `!mines <bet> [mines]` or `!m <bet> [mines]`
- RTP: `!rtp` or `!rates`

## Owner/Admin Commands
### Balance/Admin Controls
- `!addbalance <coins> <userId>`
- `!removebalance <coins> <userId>`

### Deposit/Withdrawal/Wager Tracking
- `!adddeposit <usdAmount> <userId>`
  - Logs deposit and credits coins (`$1 = 1000 coins`).
- `!addwithdrawal <usdAmount> <userId>`
  - Logs total withdrawn amount.
- `!addwager <coinsAmount> <userId>`
  - Manual admin adjustment to eligible wagered coins.
- `!checkwithdraw <usdAmount> <userId>`
  - Evaluates withdrawal eligibility against current rules.
- `!profile [userId]`
  - Shows profile snapshot: balance, real balance, deposited, withdrawn, eligible wagered. (Public for self, admin for others)

## Current Withdrawal Rules (as implemented)
- Minimum withdrawal: `$20`
- First withdrawal unlock: total deposits >= `$5`
- Wager requirement: `1x` deposited amount
- Wagering is cumulative.
- Current policy allows withdrawing free-fund growth once requirements are met.

## Important Backend Logic
- `realBalanceCoins` tracks "real" funds (deposits and winnings derived from real-funded stakes).
- `totalWageredCoins` increases only from the real-funded portion of stakes.
- Free-only stake does not increase eligible wagering progress.

## Storage Files
- Balances: `src/data/balances.json`
- Daily cooldowns: `src/data/dailyClaims.json`
- User profiles: `src/data/profiles.json`
- Backups: `src/data/backups/`

## Dev Run Notes
- Use: `npm run dev`
- Current nodemon watch is limited to code files to avoid restarts on JSON DB writes.
- If commands ever respond twice, check for duplicate Node processes running the bot.

## Last Known Status
- `!hl` was switched to non-image mode to prevent image-render hangs.
- Dice and other image commands have safer fallback behavior.
- RTP command is hardcoded (display values, not real-time calculated).
