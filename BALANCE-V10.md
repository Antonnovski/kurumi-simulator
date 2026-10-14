# V0.10 validation

Four JPY-quoted instruments share one account and gross margin budget. Orders and positions retain their instrument; all markets advance every simulated minute. Each market currently has its own synthetic random process rather than a calibrated cross-currency correlation model. Only USD/JPY carries the scheduled third-round extreme event; other instruments retain ordinary random news shocks.

Optional sprint rounds settle at 120 simulated minutes. Seeded missions require positive return, limited drawdown, at least one entry, no liquidation and no loan default. Scores are bounded game feedback, not cash rewards. Unrealized/realized net returns deduct outstanding debt. Free rounds remain open-ended.

All-in reserves approximately 15% of free margin before execution cost allowance. It does not prevent manual additional leverage. Scheduled USD/JPY crash jumps are 0.3–0.65%, bull jumps 0.2–0.4%; subsequent drift decays and has a 30% chance of reversing after 20 minutes. No quote depends on player P&L or position direction. Returns are not capped.

`node scripts/balance-v10.mjs`: 3,000 seeded third-round 120-minute simulations, 1,000 per strategy, four currencies, buy and sell directions. Hold-only strategies; no re-entry, rescue loan or manual additions. Percent returns:

| Strategy | Min | P05 | Median | P95 | Max | Forced | Insolvent |
|---|---:|---:|---:|---:|---:|---:|---:|
| 10K units | -1.37 | -0.71 | -0.03 | 0.71 | 1.43 | 0% | 0% |
| All-in | -31.19 | -14.79 | -0.88 | 15.54 | 32.32 | 0% | 0% |
| Four pairs, 40K each | -10.96 | -5.48 | -0.29 | 4.79 | 8.44 | 0% | 0% |

These samples assess opening and holding through a short round; they do not guarantee bounds for repeated trading, all seeds, old highly leveraged positions or long free rounds. Liquidation is separately tested under insufficient combined equity.

70 automated tests pass, including cross-instrument pricing, order triggers, margin rejection, portfolio liquidation, storage migration, deterministic continuation, timed settlement, and debt-excluded scoring.
