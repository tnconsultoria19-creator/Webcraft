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
    if (table && requiredColumns[table]) {
      const result = await db.prepare(`PRAGMA table_info(${table})`).all();
      const existing = new Set((result.results || []).map((row: any) => row.name));
      const compatible = requiredColumns[table].every((column) => existing.has(column));
      if (!compatible && existing.size > 0) {
        await db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
      }
    }
    await db.prepare(sql).run();
  }

  for (const sql of indexes) {
    await db.prepare(sql).run();
  }
}
