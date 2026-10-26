ALTER TABLE repositories ADD COLUMN license_spdx TEXT DEFAULT '';
ALTER TABLE repositories ADD COLUMN license_type TEXT DEFAULT 'unspecified';
ALTER TABLE repositories ADD COLUMN license_badge TEXT DEFAULT '';
ALTER TABLE repositories ADD COLUMN is_free INTEGER DEFAULT 1;
ALTER TABLE repositories ADD COLUMN cost_model TEXT DEFAULT 'unknown';
ALTER TABLE repositories ADD COLUMN cost_badge TEXT DEFAULT '';
ALTER TABLE repositories ADD COLUMN cost_notes TEXT DEFAULT '';
ALTER TABLE repositories ADD COLUMN deploy_difficulty TEXT DEFAULT 'medium';
ALTER TABLE repositories ADD COLUMN deploy_badge TEXT DEFAULT '';
ALTER TABLE repositories ADD COLUMN deploy_method TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_repositories_license_type ON repositories(license_type);
CREATE INDEX IF NOT EXISTS idx_repositories_cost_model ON repositories(cost_model);
CREATE INDEX IF NOT EXISTS idx_repositories_deploy_difficulty ON repositories(deploy_difficulty);
