CREATE TABLE IF NOT EXISTS subscriptions (
 user_id TEXT PRIMARY KEY, revision TEXT NOT NULL, subscription TEXT NOT NULL,
 preferences TEXT NOT NULL, scheduled_until TEXT NOT NULL, last_test TEXT
);
CREATE TABLE IF NOT EXISTS jobs (
 user_id TEXT NOT NULL REFERENCES subscriptions(user_id) ON DELETE CASCADE,
 id TEXT NOT NULL, revision TEXT NOT NULL, due_at TEXT NOT NULL,
 title TEXT NOT NULL, body TEXT NOT NULL, sound INTEGER NOT NULL, vibrate INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', lease TEXT,
 PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS jobs_due ON jobs(status,due_at);
