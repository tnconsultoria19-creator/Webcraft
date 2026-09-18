import path from 'path';
import fs from 'fs';

let localDb: any = null;

// Clean SQL Schema to construct tables matching our rich structures
const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  displayName TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  avatarUrl TEXT,
  phone TEXT,
  bio TEXT,
  storedPassword TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contactPerson TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  category TEXT,
  industry TEXT,
  city TEXT,
  province TEXT,
  country TEXT,
  address TEXT,
  website TEXT,
  existingWebsiteStatus TEXT,
  googleBusinessUrl TEXT,
  sourceUrl TEXT,
  sourceId TEXT,
  notes TEXT,
  source TEXT NOT NULL,
  createdMethod TEXT,
  stage TEXT NOT NULL,
  priority TEXT NOT NULL,
  quality TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  createdByName TEXT,
  ownerId TEXT NOT NULL,
  ownerName TEXT,
  templateUrl TEXT,
  previewUrl TEXT,
  workingUrl TEXT,
  githubUrl TEXT,
  productionNotes TEXT,
  deletedAt TEXT,
  projectDomainName TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  chatgptPackageJson TEXT,
  lastActivityAt TEXT,
  lastOutreachAt TEXT,
  lastOutreachChannel TEXT,
  outreachCount INTEGER DEFAULT 0,
  linkCreatorId TEXT,
  linkCreatorName TEXT,
  linkCreatedAt TEXT,
  messageSenderId TEXT,
  messageSenderName TEXT,
  messageSentAt TEXT,
  linkBonusAwarded INTEGER DEFAULT 0,
  messageBonusAwarded INTEGER DEFAULT 0,
  isDealClosed INTEGER DEFAULT 0,
  closedAt TEXT,
  clientPrice REAL,
  currency TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  normalizedValue TEXT NOT NULL,
  contactPerson TEXT,
  position TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  channel TEXT NOT NULL,
  detailValue TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  leadName TEXT,
  leadStage TEXT,
  taskTypeId TEXT NOT NULL,
  taskTypeKey TEXT NOT NULL,
  taskTypeName TEXT NOT NULL,
  status TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  createdByName TEXT,
  assignedTo TEXT,
  assignedToName TEXT,
  rateValue REAL NOT NULL,
  dueDate TEXT,
  startedAt TEXT,
  completedAt TEXT,
  blockReason TEXT,
  notes TEXT,
  version INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS taskTypes (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  defaultRate REAL NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS outreachAttempts (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  channel TEXT NOT NULL,
  actionType TEXT,
  targetRecipient TEXT,
  sentBy TEXT NOT NULL,
  sentByName TEXT,
  sentAt TEXT NOT NULL,
  messageUsed TEXT,
  status TEXT NOT NULL,
  responseType TEXT,
  responseNotes TEXT,
  nextAction TEXT,
  followUpDate TEXT,
  FOREIGN KEY(leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  objectKey TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  uploadedBy TEXT NOT NULL,
  uploadedByName TEXT,
  isPrimary INTEGER DEFAULT 0,
  caption TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stageHistory (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  previousStage TEXT NOT NULL,
  newStage TEXT NOT NULL,
  changedBy TEXT NOT NULL,
  changedByName TEXT,
  reason TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leadNotes (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  authorName TEXT,
  content TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  userName TEXT,
  action TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  entityName TEXT,
  metadataJson TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financialRecords (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  leadId TEXT NOT NULL,
  leadName TEXT NOT NULL,
  action TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  earningType TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  overriddenBy TEXT,
  overriddenAt TEXT,
  originalAmount REAL,
  isReversed INTEGER DEFAULT 0,
  FOREIGN KEY(leadId) REFERENCES leads(id) ON DELETE CASCADE
);
`;

const seedSql = `
INSERT OR IGNORE INTO taskTypes (id, key, name, description, defaultRate, active) VALUES
('tt-1', 'capture', 'Lead Research & Capture', 'Discovering business & recording verified contacts/images', 0, 1),
('tt-2', 'template', 'Template Prototype Creation', 'Designing interactive website mockup for business preview', 1.0, 1),
('tt-3', 'outreach', 'Initial Business Outreach', 'Reaching out via WhatsApp/Social DM/Email with mockup', 0.5, 1),
('tt-4', 'followup', 'Client Negotiation & Follow-Up', 'Handling responses, answering queries, securing interest', 0, 1),
('tt-5', 'qualification', 'Qualification & Discovery Call', 'Validating client budget & website requirements', 0, 1),
('tt-6', 'onboarding', 'Client Contract & Deposit Onboarding', 'Finalizing pricing agreement and collecting brand assets', 0, 1),
('tt-7', 'production', 'Final Website Launch & Deployment', 'Building domain deployment and custom features', 0, 1);

INSERT OR IGNORE INTO users (id, email, displayName, role, status, avatarUrl, phone, bio, storedPassword, createdAt) VALUES
('usr_olisbel_gmail_com', 'olisbel@gmail.com', 'Olisbel', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', '+244900000000', 'Lead Platform Developer', '19921108626Op@', '2026-08-01T08:00:00.000Z'),
('usr_admin_webcraft_com', 'admin@webcraft.com', 'Alex Admin (Manager)', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', '+27821112233', 'Operations Director & Platform Admin', 'password123', '2026-08-01T08:00:00.000Z'),
('usr_john_webcraft_com', 'john@webcraft.com', 'John Developer', 'member', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', '+27834445566', 'Senior Template Creator', 'password123', '2026-08-01T09:00:00.000Z'),
('usr_sarah_webcraft_com', 'sarah@webcraft.com', 'Sarah Lead Finder', 'member', 'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', '+27847778899', 'Lead Prospector', 'password123', '2026-08-02T10:00:00.000Z');

INSERT OR IGNORE INTO leads (id, name, description, category, industry, city, province, country, address, website, existingWebsiteStatus, googleBusinessUrl, notes, source, stage, priority, quality, createdBy, createdByName, ownerId, ownerName, templateUrl, previewUrl, createdAt, updatedAt) VALUES
('LEAD-000001', 'Apex Plumbing & Drainage', '24/7 Residential and commercial emergency plumbing services in Cape Town Northern Suburbs.', 'Home Services', 'Plumbing', 'Cape Town', 'Western Cape', 'South Africa', '14 Durban Road, Bellville', '', 'None', 'https://maps.google.com/?cid=12345678', 'Owner interested in urgent website for emergency weekend call-outs.', 'Gumtree', 'ready_for_outreach', 'high', 'verified', 'usr_sarah_webcraft_com', 'Sarah Lead Finder', 'usr_john_webcraft_com', 'John Developer', 'https://apex-plumbing-mockup.webcraft.preview', 'https://apex-plumbing-mockup.webcraft.preview', '2026-08-10T08:15:00.000Z', '2026-08-11T11:20:00.000Z'),
('LEAD-000002', 'Bella Vista Bistro', 'Authentic Italian wood-fired pizza and pasta restaurant with outdoor garden seating.', 'Hospitality', 'Restaurants', 'Stellenbosch', 'Western Cape', 'South Africa', '42 Church Street', 'https://bellavistabistro.co.za', 'Outdated / Not Mobile Friendly', '', 'Current website built in 2014, broken menu PDF, needs online reservation button.', 'Instagram', 'interested', 'urgent', 'verified', 'usr_sarah_webcraft_com', 'Sarah Lead Finder', 'usr_john_webcraft_com', 'John Developer', 'https://bella-vista-preview.webcraft.preview', '', '2026-08-09T09:30:00.000Z', '2026-08-11T14:05:00.000Z');

INSERT OR IGNORE INTO contacts (id, leadId, type, value, normalizedValue, contactPerson, position, createdAt) VALUES
('c-1', 'LEAD-000001', 'primary_phone', '+27 65 123 4567', '651234567', 'Jacob Apex', 'Owner', '2026-08-10T08:15:00.000Z'),
('c-2', 'LEAD-000001', 'whatsapp', '+27651234567', '651234567', 'Jacob Apex', 'Owner', '2026-08-10T08:15:00.000Z'),
('c-3', 'LEAD-000001', 'email', 'info@apexplumbing.co.za', 'info@apexplumbing.co.za', '', '', '2026-08-10T08:15:00.000Z'),
('c-4', 'LEAD-000002', 'primary_phone', '+27 21 883 9922', '218839922', 'Marco Rossi', 'Head Chef / Owner', '2026-08-09T09:30:00.000Z');

INSERT OR IGNORE INTO tasks (id, leadId, leadName, leadStage, taskTypeId, taskTypeKey, taskTypeName, status, createdBy, createdByName, assignedTo, assignedToName, rateValue, version, createdAt) VALUES
('task-1', 'LEAD-000001', 'Apex Plumbing & Drainage', 'ready_for_outreach', 'tt-1', 'capture', 'Lead Research & Capture', 'completed', 'usr_sarah_webcraft_com', 'Sarah Lead Finder', 'usr_sarah_webcraft_com', 'Sarah Lead Finder', 0.0, 1, '2026-08-10T08:15:00.000Z'),
('task-2', 'LEAD-000001', 'Apex Plumbing & Drainage', 'ready_for_outreach', 'tt-2', 'template', 'Template Prototype Creation', 'completed', 'usr_sarah_webcraft_com', 'Sarah Lead Finder', 'usr_john_webcraft_com', 'John Developer', 1.0, 1, '2026-08-10T09:00:00.000Z'),
('task-3', 'LEAD-000001', 'Apex Plumbing & Drainage', 'ready_for_outreach', 'tt-3', 'outreach', 'Initial Business Outreach', 'available', 'usr_john_webcraft_com', 'John Developer', NULL, NULL, 0.5, 1, '2026-08-10T11:20:00.000Z');
`;

async function getLocalDatabase() {
  if (localDb) return localDb;

  const { DatabaseSync } = await import('node:sqlite');
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'webcraft.db');
  localDb = new DatabaseSync(dbPath);

  // Run schema queries
  localDb.exec(schemaSql);
  // Run seed queries
  localDb.exec(seedSql);

  return localDb;
}

export async function getDb(env?: any) {
  // If env contains a real Cloudflare D1 Binding
  if (env && env.DB) {
    return env.DB;
  }

  // Fallback to local Node SQLite DB for Dev environment
  const dbInstance = await getLocalDatabase();

  return {
    prepare: (sql: string) => {
      const stmt = dbInstance.prepare(sql);
      return {
        bind: (...args: any[]) => {
          const mappedArgs = args.map(arg => {
            if (typeof arg === 'boolean') return arg ? 1 : 0;
            if (arg !== null && typeof arg === 'object') return JSON.stringify(arg);
            return arg;
          });
          return {
            all: async () => {
              const results = stmt.all(...mappedArgs);
              return { results };
            },
            run: async () => {
              stmt.run(...mappedArgs);
              return { success: true };
            },
            first: async (colName?: string) => {
              const res = stmt.get(...mappedArgs);
              if (!res) return null;
              if (colName) return res[colName];
              return res;
            }
          };
        }
      };
    }
  };
}
