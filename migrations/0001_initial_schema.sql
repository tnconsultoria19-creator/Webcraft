-- Cloudflare D1 Schema Migration for WebCraft Studio

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  industry TEXT,
  city TEXT,
  province TEXT,
  country TEXT,
  address TEXT,
  website TEXT,
  existing_website_status TEXT,
  google_business_url TEXT,
  source_url TEXT,
  source_id TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  stage TEXT NOT NULL DEFAULT 'new_lead',
  priority TEXT NOT NULL DEFAULT 'medium',
  estimated_value REAL DEFAULT 0,
  assigned_to TEXT,
  template_url TEXT,
  preview_url TEXT,
  working_url TEXT,
  project_domain_name TEXT,
  chatgpt_package TEXT,
  outreach_count INTEGER DEFAULT 0,
  owner_id TEXT,
  owner_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  task_type_key TEXT NOT NULL,
  title TEXT NOT NULL,
  rate REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  assigned_to TEXT,
  assigned_at TEXT,
  completed_at TEXT,
  blocked_at TEXT,
  block_reason TEXT,
  notes TEXT,
  template_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS financial_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  task_id TEXT,
  lead_id TEXT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  metadata TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_by TEXT NOT NULL,
  message_used TEXT,
  status TEXT NOT NULL,
  response_type TEXT,
  response_notes TEXT,
  next_action TEXT,
  follow_up_date TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  caption TEXT,
  is_primary INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Initial seed data for admin settings and default user
INSERT OR IGNORE INTO admin_settings (key, value) VALUES 
('lead_sources', '["Google Maps", "Direct Prospecting", "Social Media", "Referral", "ChatGPT Sales Bot"]'),
('task_rates', '{"link_creation": 150, "website_design": 450, "outreach": 100, "client_close": 500}');
