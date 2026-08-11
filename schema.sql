-- SGS Test Platform — D1 Schema (v2)

-- App configurations (managed from dashboard)
CREATE TABLE IF NOT EXISTS app_configs (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  environment TEXT    NOT NULL DEFAULT 'production',
  page_url    TEXT,
  worker_url  TEXT,
  api_routes  TEXT,           
  auth_config TEXT,           
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS test_runs (
  id           TEXT    PRIMARY KEY,
  app_id       TEXT    REFERENCES app_configs(id) ON DELETE SET NULL,
  app_name     TEXT    NOT NULL,
  environment  TEXT    NOT NULL DEFAULT 'production',
  triggered_by TEXT,
  git_sha      TEXT,
  git_branch   TEXT,
  started_at   INTEGER NOT NULL,
  completed_at INTEGER,
  total        INTEGER DEFAULT 0,
  passed       INTEGER DEFAULT 0,
  failed       INTEGER DEFAULT 0,
  status       TEXT    NOT NULL DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS test_results (
  id          TEXT    PRIMARY KEY,
  run_id      TEXT    NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  test_name   TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  status      TEXT    NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  message     TEXT,
  error       TEXT,
  url         TEXT,
  executed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_results_run_id  ON test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_app_id     ON test_runs(app_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_app_name   ON test_runs(app_name);
CREATE INDEX IF NOT EXISTS idx_test_runs_started_at ON test_runs(started_at DESC);
