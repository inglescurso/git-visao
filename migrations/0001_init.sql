CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_key TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    description TEXT DEFAULT '',
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    language TEXT DEFAULT '',
    topics_json TEXT DEFAULT '[]',
    last_commit_at TEXT DEFAULT '',
    category TEXT NOT NULL,
    template_type TEXT NOT NULL,
    hook_title TEXT NOT NULL,
    intro_text TEXT NOT NULL,
    warning_note TEXT DEFAULT '',
    features_json TEXT NOT NULL,
    scenario_title TEXT NOT NULL,
    scenario_intro TEXT NOT NULL,
    scenario_prompt TEXT NOT NULL,
    scenario_steps_json TEXT NOT NULL,
    scenario_outro TEXT DEFAULT '',
    killer_title TEXT NOT NULL,
    killer_text TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    punchline TEXT NOT NULL,
    whatsapp_text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_repositories_repo_key ON repositories(repo_key);
CREATE INDEX IF NOT EXISTS idx_repositories_category ON repositories(category);
CREATE INDEX IF NOT EXISTS idx_repositories_template_type ON repositories(template_type);
CREATE INDEX IF NOT EXISTS idx_repositories_stars ON repositories(stars DESC);
CREATE INDEX IF NOT EXISTS idx_repositories_created_at ON repositories(created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

