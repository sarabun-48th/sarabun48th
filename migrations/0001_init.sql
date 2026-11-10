-- One table for both forms: tool feedback and new-feature / new-site suggestions.
CREATE TABLE IF NOT EXISTS submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL CHECK (type IN ('feedback', 'suggestion')),
  tool       TEXT,                                        -- feedback: tool id (e.g. 'ge2026', 'general')
  kind       TEXT CHECK (kind IN ('feature', 'new_site')),  -- suggestion: what is being suggested
  message    TEXT NOT NULL,                               -- feedback text or suggested idea
  name       TEXT,
  contact    TEXT,
  user_agent TEXT,
  country    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (type = 'feedback'   OR tool IS NULL),
  CHECK (type = 'suggestion' OR kind IS NULL),
  CHECK (type = 'feedback'   OR kind IS NOT NULL),
  CHECK (type = 'suggestion' OR tool IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_tool ON submissions(tool, created_at);
