-- Tables for the "poshservices" D1 database (binding USERS): accounts, saved journeys and feedback.
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, created INTEGER NOT NULL, last_seen INTEGER NOT NULL, data TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS auth_tokens (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL, back TEXT);
CREATE TABLE IF NOT EXISTS auth_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_attempts_key ON auth_attempts (key, ts);
CREATE TABLE IF NOT EXISTS user_sessions (hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS user_sessions_user ON user_sessions (user_id);
CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, kind TEXT NOT NULL, message TEXT, page TEXT, service TEXT, email TEXT, device TEXT, issue_url TEXT, ipkey TEXT);
CREATE INDEX IF NOT EXISTS feedback_ts ON feedback (ts);
