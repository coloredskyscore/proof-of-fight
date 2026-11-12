-- Buy the Dip server (worker/src/index.js): D1 tables.
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,      -- short id in race links (?dip&r=<id>), from a hash of the run
  mode TEXT NOT NULL,       -- btc, sol, ... or daily
  seed TEXT NOT NULL,       -- the date for daily, empty for chains
  score INTEGER NOT NULL,
  day INTEGER NOT NULL,
  code TEXT NOT NULL,       -- the recorded run (encode() in js/dip-core.js)
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board TEXT NOT NULL,      -- btc, sol, ... or daily-YYYY-MM-DD
  initials TEXT NOT NULL,
  score INTEGER NOT NULL,
  day INTEGER NOT NULL,
  run TEXT NOT NULL,        -- runs.id, so the leaders can be raced as ghosts
  ip TEXT NOT NULL,         -- hashed, only for the rate limit
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_board ON scores (board, score DESC);
CREATE INDEX IF NOT EXISTS scores_ip ON scores (ip, created);
CREATE UNIQUE INDEX IF NOT EXISTS scores_run ON scores (board, run);  -- the same run only once per board
