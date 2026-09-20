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
('usr_b2xpc2JlbEBnbWFpbC5jb20', 'olisbel@gmail.com', 'olisbel', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', NULL, 'Lead Platform Developer & Administrator', '19921108626Op@', '2026-08-12T08:02:42.929Z'),
('usr_YWRtaW5Ad2ViY3JhZnQuY29t', 'admin@webcraft.com', 'admin', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', NULL, 'System Admin Account', 'password123', '2026-08-14T20:46:23.839Z'),
('usr_bGh1ZHlxdWlhbGFAZ21haWwuY29t', 'lhudyquiala@gmail.com', 'Ludmila Domingos Quiala', 'member', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', NULL, 'Operations & Lead Specialist', 'ludmila2026', '2026-09-17T12:36:50.033Z'),
('usr_Y2VzYXJmYXRpbWF0YTY2QGdtYWlsLmNvbQ', 'cesarfatimata66@gmail.com', 'Silvana Camara ', 'member', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', NULL, 'Template & Outreach Specialist', 'silvana2026', '2026-08-17T19:15:05.888Z'),
('usr_dG5jb25zdWx0b3JpYTE5QGdtYWlsLmNvbQ', 'tnconsultoria19@gmail.com', 'TN Consultoria', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', NULL, 'System Administrator', 'admin2026', '2026-08-12T08:00:00.000Z');
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
      const createBound = (mappedArgs: any[] = []) => ({
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
      });

      return {
        ...createBound([]),
        bind: (...args: any[]) => {
          const mappedArgs = args.map(arg => {
            if (typeof arg === 'boolean') return arg ? 1 : 0;
            if (arg !== null && typeof arg === 'object') return JSON.stringify(arg);
            return arg;
          });
          return createBound(mappedArgs);
        }
      };
    },
    batch: async (statements: any[]) => {
      const results: any[] = [];
      for (const statement of statements) {
        if (typeof statement.all === 'function') {
          const res = await statement.all();
          results.push(res);
        } else if (typeof statement.run === 'function') {
          const res = await statement.run();
          results.push(res);
        } else {
          results.push({ results: [] });
        }
      }
      return results;
    }
  };
}
