const schema = [
`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,displayName TEXT NOT NULL,role TEXT NOT NULL,status TEXT NOT NULL,avatarUrl TEXT,phone TEXT,bio TEXT,storedPassword TEXT,createdAt TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY,name TEXT NOT NULL,contactPerson TEXT,phone TEXT,email TEXT,description TEXT,category TEXT,industry TEXT,city TEXT,province TEXT,country TEXT,address TEXT,website TEXT,existingWebsiteStatus TEXT,googleBusinessUrl TEXT,sourceUrl TEXT,sourceId TEXT,notes TEXT,source TEXT NOT NULL,createdMethod TEXT,stage TEXT NOT NULL,priority TEXT NOT NULL,quality TEXT NOT NULL,createdBy TEXT NOT NULL,createdByName TEXT,ownerId TEXT NOT NULL,ownerName TEXT,templateUrl TEXT,previewUrl TEXT,workingUrl TEXT,githubUrl TEXT,productionNotes TEXT,deletedAt TEXT,projectDomainName TEXT,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,chatgptPackageJson TEXT,lastActivityAt TEXT,lastOutreachAt TEXT,lastOutreachChannel TEXT,outreachCount INTEGER DEFAULT 0,linkCreatorId TEXT,linkCreatorName TEXT,linkCreatedAt TEXT,messageSenderId TEXT,messageSenderName TEXT,messageSentAt TEXT,linkBonusAwarded INTEGER DEFAULT 0,messageBonusAwarded INTEGER DEFAULT 0,isDealClosed INTEGER DEFAULT 0,closedAt TEXT,clientPrice REAL,currency TEXT)`,
`CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY,leadId TEXT NOT NULL,type TEXT NOT NULL,value TEXT NOT NULL,normalizedValue TEXT NOT NULL,contactPerson TEXT,position TEXT,createdAt TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY,leadId TEXT NOT NULL,channel TEXT NOT NULL,detailValue TEXT,createdAt TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY,leadId TEXT NOT NULL,leadName TEXT,leadStage TEXT,taskTypeId TEXT NOT NULL,taskTypeKey TEXT NOT NULL,taskTypeName TEXT NOT NULL,status TEXT NOT NULL,createdBy TEXT NOT NULL,createdByName TEXT,assignedTo TEXT,assignedToName TEXT,rateValue REAL NOT NULL,dueDate TEXT,startedAt TEXT,completedAt TEXT,blockReason TEXT,notes TEXT,version INTEGER DEFAULT 1,createdAt TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS taskTypes (id TEXT PRIMARY KEY,key TEXT UNIQUE NOT NULL,name TEXT NOT NULL,description TEXT,defaultRate REAL NOT NULL,active INTEGER DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS outreachAttempts (id TEXT PRIMARY KEY,leadId TEXT NOT NULL,channel TEXT NOT NULL,actionType TEXT,targetRecipient TEXT,sentBy TEXT NOT NULL,sentByName TEXT,sentAt TEXT NOT NULL,messageUsed TEXT,status TEXT NOT NULL,responseType TEXT,responseNotes TEXT,nextAction TEXT,followUpDate TEXT)`,
`CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY,leadId TEXT NOT NULL,objectKey TEXT NOT NULL,url TEXT NOT NULL,filename TEXT NOT NULL,mimeType TEXT NOT NULL,fileSize INTEGER NOT NULL,uploadedBy TEXT NOT NULL,uploadedByName TEXT,isPrimary INTEGER DEFAULT 0,caption TEXT,createdAt TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY,leadId TEXT NOT NULL,objectKey TEXT NOT NULL,url TEXT NOT NULL,filename TEXT NOT NULL,mimeType TEXT NOT NULL,fileSize INTEGER NOT NULL,uploadedBy TEXT NOT NULL,uploadedByName TEXT,documentType TEXT,description TEXT,createdAt TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS stageHistory (id TEXT PRIMARY KEY,leadId TEXT NOT NULL,previousStage TEXT NOT NULL,newStage TEXT NOT NULL,changedBy TEXT NOT NULL,changedByName TEXT,reason TEXT,createdAt TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS leadNotes (id TEXT PRIMARY KEY,leadId TEXT NOT NULL,authorId TEXT NOT NULL,authorName TEXT,content TEXT NOT NULL,createdAt TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY,userId TEXT NOT NULL,userName TEXT,action TEXT NOT NULL,entityType TEXT NOT NULL,entityId TEXT NOT NULL,entityName TEXT,metadataJson TEXT,timestamp TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS financialRecords (id TEXT PRIMARY KEY,userId TEXT NOT NULL,userName TEXT NOT NULL,leadId TEXT NOT NULL,leadName TEXT NOT NULL,action TEXT NOT NULL,amount REAL NOT NULL,currency TEXT NOT NULL,timestamp TEXT NOT NULL,earningType TEXT NOT NULL,status TEXT NOT NULL,notes TEXT,overriddenBy TEXT,overriddenAt TEXT,originalAmount REAL,isReversed INTEGER DEFAULT 0)`
];

const requiredColumns: Record<string, string[]> = {
  users: ['id','email','displayName','role','status','avatarUrl','phone','bio','storedPassword','createdAt'],
  leads: ['id','name','contactPerson','phone','email','description','category','industry','city','province','country','address','website','existingWebsiteStatus','googleBusinessUrl','sourceUrl','sourceId','notes','source','createdMethod','stage','priority','quality','createdBy','createdByName','ownerId','ownerName','templateUrl','previewUrl','workingUrl','githubUrl','productionNotes','deletedAt','projectDomainName','createdAt','updatedAt','chatgptPackageJson','lastActivityAt','lastOutreachAt','lastOutreachChannel','outreachCount','linkCreatorId','linkCreatorName','linkCreatedAt','messageSenderId','messageSenderName','messageSentAt','linkBonusAwarded','messageBonusAwarded','isDealClosed','closedAt','clientPrice','currency'],
  contacts: ['id','leadId','type','value','normalizedValue','contactPerson','position','createdAt'],
  channels: ['id','leadId','channel','detailValue','createdAt'],
  tasks: ['id','leadId','leadName','leadStage','taskTypeId','taskTypeKey','taskTypeName','status','createdBy','createdByName','assignedTo','assignedToName','rateValue','dueDate','startedAt','completedAt','blockReason','notes','version','createdAt'],
  taskTypes: ['id','key','name','description','defaultRate','active'],
  outreachAttempts: ['id','leadId','channel','actionType','targetRecipient','sentBy','sentByName','sentAt','messageUsed','status','responseType','responseNotes','nextAction','followUpDate'],
  images: ['id','leadId','objectKey','url','filename','mimeType','fileSize','uploadedBy','uploadedByName','isPrimary','caption','createdAt'],
  documents: ['id','leadId','objectKey','url','filename','mimeType','fileSize','uploadedBy','uploadedByName','documentType','description','createdAt'],
  stageHistory: ['id','leadId','previousStage','newStage','changedBy','changedByName','reason','createdAt'],
  leadNotes: ['id','leadId','authorId','authorName','content','createdAt'],
  activities: ['id','userId','userName','action','entityType','entityId','entityName','metadataJson','timestamp'],
  financialRecords: ['id','userId','userName','leadId','leadName','action','amount','currency','timestamp','earningType','status','notes','overriddenBy','overriddenAt','originalAmount','isReversed']
};

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_leads_deleted_updated ON leads(deletedAt, updatedAt)',
  'CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(ownerId)',
  'CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(createdBy)',
  'CREATE INDEX IF NOT EXISTS idx_contacts_lead_created ON contacts(leadId, createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_channels_lead_created ON channels(leadId, createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_lead_created ON tasks(leadId, createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status_assigned ON tasks(status, assignedTo, createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_outreach_lead_sent ON outreachAttempts(leadId, sentAt)',
  'CREATE INDEX IF NOT EXISTS idx_notes_lead_created ON leadNotes(leadId, createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_images_lead_created ON images(leadId, createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entityType, entityId, timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_financial_user_timestamp ON financialRecords(userId, timestamp)'
];

export async function ensureD1Schema(db: any) {
  for (const sql of schema) {
    const table = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
    await db.prepare(sql).run();

    if (table && requiredColumns[table]) {
      try {
        const result = await db.prepare(`PRAGMA table_info(${table})`).all();
        const existing = new Set((result.results || []).map((row: any) => row.name));
        for (const column of requiredColumns[table]) {
          if (!existing.has(column)) {
            try {
              await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`).run();
            } catch (alterErr) {
              // Ignore if already added concurrently
            }
          }
        }
      } catch (checkErr) {
        console.warn(`Schema column check warning for ${table}:`, checkErr);
      }
    }
  }

  for (const sql of indexes) {
    try {
      await db.prepare(sql).run();
    } catch (idxErr) {
      // Index may already exist
    }
  }

  // Seed default task types and users
  await seedD1Defaults(db);
}

export const DEFAULT_USERS = [
  {
    id: 'usr_bGh1ZHlxdWlhbGFAZ21haWwuY29t',
    email: 'lhudyquiala@gmail.com',
    displayName: 'Ludmila Domingos Quiala',
    role: 'member',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: '+27 71 131 2594',
    bio: 'Operations & Lead Specialist',
    storedPassword: 'ludmila2026',
    createdAt: '2026-09-17T12:36:50.033Z'
  },
  {
    id: 'usr_Y2VzYXJmYXRpbWF0YTY2QGdtYWlsLmNvbQ',
    email: 'cesarfatimata66@gmail.com',
    displayName: 'Silvana Camara ',
    role: 'member',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: null,
    bio: 'Template & Outreach Specialist',
    storedPassword: 'silvana2026',
    createdAt: '2026-08-17T19:15:05.888Z'
  },
  {
    id: 'usr_dG5jb25zdWx0b3JpYTE5QGdtYWlsLmNvbQ',
    email: 'tnconsultoria19@gmail.com',
    displayName: 'TN Consultoria',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: null,
    bio: 'System Administrator',
    storedPassword: 'admin2026',
    createdAt: '2026-08-12T08:00:00.000Z'
  },
  {
    id: 'usr_YWRtaW5Ad2ViY3JhZnQuY29t',
    email: 'admin@webcraft.com',
    displayName: 'admin',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: null,
    bio: 'System Admin Account',
    storedPassword: 'password123',
    createdAt: '2026-08-14T20:46:23.839Z'
  },
  {
    id: 'usr_b2xpc2JlbEBnbWFpbC5jb20',
    email: 'olisbel@gmail.com',
    displayName: 'olisbel',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: null,
    bio: 'Lead Platform Developer & Administrator',
    storedPassword: '19921108626Op@',
    createdAt: '2026-08-12T08:02:42.929Z'
  }
];

export const DEFAULT_TASK_TYPES = [
  { id: 'tt-1', key: 'capture', name: 'Lead Research & Capture', description: 'Discovering business & recording verified contacts/images', defaultRate: 0, active: 1 },
  { id: 'tt-2', key: 'template', name: 'Template Prototype Creation', description: 'Designing interactive website mockup for business preview', defaultRate: 1.0, active: 1 },
  { id: 'tt-3', key: 'outreach', name: 'Initial Business Outreach', description: 'Reaching out via WhatsApp/Social DM/Email with mockup', defaultRate: 0.5, active: 1 },
  { id: 'tt-4', key: 'followup', name: 'Client Negotiation & Follow-Up', description: 'Handling responses, answering queries, securing interest', defaultRate: 0, active: 1 },
  { id: 'tt-5', key: 'qualification', name: 'Qualification & Discovery Call', description: 'Validating client budget & website requirements', defaultRate: 0, active: 1 },
  { id: 'tt-6', key: 'onboarding', name: 'Client Contract & Deposit Onboarding', description: 'Finalizing pricing agreement and collecting brand assets', defaultRate: 0, active: 1 },
  { id: 'tt-7', key: 'production', name: 'Final Website Launch & Deployment', description: 'Building domain deployment and custom features', defaultRate: 0, active: 1 }
];

export async function seedD1Defaults(db: any) {
  // 1. Task Types
  for (const tt of DEFAULT_TASK_TYPES) {
    try {
      await db.prepare(`
        INSERT OR IGNORE INTO taskTypes (id, key, name, description, defaultRate, active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(tt.id, tt.key, tt.name, tt.description, tt.defaultRate, tt.active).run();
    } catch (e) {
      // Ignore
    }
  }

  // 2. Users with explicit credentials
  for (const u of DEFAULT_USERS) {
    try {
      await db.prepare(`
        INSERT OR IGNORE INTO users (id, email, displayName, role, status, avatarUrl, phone, bio, storedPassword, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        u.id,
        u.email,
        u.displayName,
        u.role,
        u.status,
        u.avatarUrl,
        u.phone,
        u.bio,
        u.storedPassword,
        u.createdAt
      ).run();

      // Ensure credentials and role are always updated
      await db.prepare(`
        UPDATE users
        SET storedPassword = ?, role = ?, status = 'active'
        WHERE LOWER(email) = ? OR id = ?
      `).bind(u.storedPassword, u.role, u.email.toLowerCase(), u.id).run();
    } catch (e) {
      console.warn(`Error seeding user ${u.email}:`, e);
    }
  }
}
