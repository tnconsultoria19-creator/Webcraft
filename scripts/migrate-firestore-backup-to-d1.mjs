import fs from 'node:fs';
import path from 'node:path';

const backupDir = process.argv[2] || path.resolve(process.env.HOME || '.', 'webcraft-migration-backup');
const outFile = process.argv[3] || path.join(backupDir, 'webcraft-d1-migration.sql');

function read(name) {
  const file = path.join(backupDir, name);
  if (!fs.existsSync(file)) throw new Error(`Missing backup file: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function value(v) {
  if (v == null) return null;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue ? 1 : 0;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('bytesValue' in v) return v.bytesValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(value);
  if ('mapValue' in v) return mapValue(v.mapValue.fields || {});
  return null;
}

function mapValue(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, value(v)]));
}

function docs(file) {
  return (read(file).documents || []).map(d => ({
    id: d.name.split('/').pop(),
    ...mapValue(d.fields || {})
  }));
}

function sqlString(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return "'" + String(v).replaceAll("'", "''") + "'";
}

function jsonString(v) {
  return v == null ? null : JSON.stringify(v);
}

function insert(table, columns, row) {
  return `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => sqlString(row[c] ?? null)).join(', ')});`;
}

const users = docs('users.json');
const leads = docs('leads.json');
const tasks = docs('tasks.json');
const activities = docs('activities.json');

const lines = [
  'PRAGMA foreign_keys=OFF;',
  'BEGIN TRANSACTION;',
  '-- WebCraft Studio Firestore -> Cloudflare D1 migration',
  '-- Generated from the complete Firestore backup files.'
];

for (const u of users) {
  lines.push(insert('users',
    ['id','email','displayName','role','status','avatarUrl','phone','bio','storedPassword','createdAt'],
    {
      id:u.id, email:u.email, displayName:u.displayName || u.email?.split('@')[0] || 'User',
      role:u.role || 'member', status:u.status || 'active', avatarUrl:u.avatarUrl || null,
      phone:u.phone || null, bio:u.bio || null, storedPassword:u.storedPassword || null,
      createdAt:u.createdAt || new Date().toISOString()
    }
  ));
}

for (const l of leads) {
  lines.push(insert('leads',
    ['id','name','contactPerson','phone','email','description','category','industry','city','province','country','address','website','existingWebsiteStatus','googleBusinessUrl','sourceUrl','sourceId','notes','source','createdMethod','stage','priority','quality','createdBy','createdByName','ownerId','ownerName','templateUrl','previewUrl','workingUrl','githubUrl','productionNotes','deletedAt','projectDomainName','createdAt','updatedAt','chatgptPackageJson','lastActivityAt','lastOutreachAt','lastOutreachChannel','outreachCount','linkCreatorId','linkCreatorName','linkCreatedAt','messageSenderId','messageSenderName','messageSentAt','linkBonusAwarded','messageBonusAwarded','isDealClosed','closedAt','clientPrice','currency'],
    {
      id:l.id, name:l.name || 'Unnamed Lead', contactPerson:l.contactPerson || null, phone:l.phone || null, email:l.email || null,
      description:l.description || null, category:l.category || null, industry:l.industry || null, city:l.city || null,
      province:l.province || null, country:l.country || null, address:l.address || null, website:l.website || null,
      existingWebsiteStatus:l.existingWebsiteStatus || null, googleBusinessUrl:l.googleBusinessUrl || null,
      sourceUrl:l.sourceUrl || null, sourceId:l.sourceId || null, notes:l.notes || null, source:l.source || 'Other',
      createdMethod:l.createdMethod || null, stage:l.stage || 'captured', priority:l.priority || 'normal',
      quality:l.quality || 'verified', createdBy:l.createdBy || '', createdByName:l.createdByName || null,
      ownerId:l.ownerId || l.createdBy || '', ownerName:l.ownerName || l.createdByName || null,
      templateUrl:l.templateUrl || null, previewUrl:l.previewUrl || null, workingUrl:l.workingUrl || null,
      githubUrl:l.githubUrl || null, productionNotes:l.productionNotes || null, deletedAt:l.deletedAt || null,
      projectDomainName:l.projectDomainName || l.chatgptPackage?.projectDomainName || null,
      createdAt:l.createdAt || null, updatedAt:l.updatedAt || l.createdAt || null,
      chatgptPackageJson:jsonString(l.chatgptPackage) || (l.chatgptPackageJson || null),
      lastActivityAt:l.lastActivityAt || null, lastOutreachAt:l.lastOutreachAt || null,
      lastOutreachChannel:l.lastOutreachChannel || null, outreachCount:l.outreachCount || 0,
      linkCreatorId:l.linkCreatorId || null, linkCreatorName:l.linkCreatorName || null, linkCreatedAt:l.linkCreatedAt || null,
      messageSenderId:l.messageSenderId || null, messageSenderName:l.messageSenderName || null, messageSentAt:l.messageSentAt || null,
      linkBonusAwarded:l.linkBonusAwarded || 0, messageBonusAwarded:l.messageBonusAwarded || 0,
      isDealClosed:l.isDealClosed || 0, closedAt:l.closedAt || null, clientPrice:l.clientPrice || null, currency:l.currency || null
    }
  ));

  for (const c of (l.contacts || [])) {
    lines.push(insert('contacts',
      ['id','leadId','type','value','normalizedValue','contactPerson','position','createdAt'],
      {
        id:c.id, leadId:l.id, type:c.type || 'other', value:c.value || '', normalizedValue:c.normalizedValue || '',
        contactPerson:c.contactPerson || '', position:c.position || '', createdAt:c.createdAt || l.createdAt || new Date().toISOString()
      }
    ));
  }

  for (const ch of (l.channels || [])) {
    lines.push(insert('channels',
      ['id','leadId','channel','detailValue','createdAt'],
      { id:ch.id, leadId:l.id, channel:ch.channel || '', detailValue:ch.detailValue || null, createdAt:ch.createdAt || l.createdAt || new Date().toISOString() }
    ));
  }
}

for (const t of tasks) {
  lines.push(insert('tasks',
    ['id','leadId','leadName','leadStage','taskTypeId','taskTypeKey','taskTypeName','status','createdBy','createdByName','assignedTo','assignedToName','rateValue','dueDate','startedAt','completedAt','blockReason','notes','version','createdAt'],
    {
      id:t.id, leadId:t.leadId || '', leadName:t.leadName || null, leadStage:t.leadStage || null,
      taskTypeId:t.taskTypeId || 'tt-1', taskTypeKey:t.taskTypeKey || 'capture', taskTypeName:t.taskTypeName || 'Task',
      status:t.status || 'available', createdBy:t.createdBy || '', createdByName:t.createdByName || null,
      assignedTo:t.assignedTo || null, assignedToName:t.assignedToName || null, rateValue:t.rateValue || 0,
      dueDate:t.dueDate || null, startedAt:t.startedAt || null, completedAt:t.completedAt || null,
      blockReason:t.blockReason || null, notes:t.notes || null, version:t.version || 1, createdAt:t.createdAt || new Date().toISOString()
    }
  ));
}

for (const a of activities) {
  lines.push(insert('activities',
    ['id','userId','userName','action','entityType','entityId','entityName','metadataJson','timestamp'],
    {
      id:a.id, userId:a.userId || '', userName:a.userName || null, action:a.action || 'unknown',
      entityType:a.entityType || 'unknown', entityId:a.entityId || '', entityName:a.entityName || null,
      metadataJson:a.metadata ? JSON.stringify(a.metadata) : null, timestamp:a.timestamp || new Date().toISOString()
    }
  ));
}

lines.push('COMMIT;','PRAGMA foreign_keys=ON;');
fs.writeFileSync(outFile, lines.join('\\n') + '\\n');
console.log(`Generated ${outFile}`);
console.log(`Users: ${users.length} | Leads: ${leads.length} | Tasks: ${tasks.length} | Activities: ${activities.length}`);
