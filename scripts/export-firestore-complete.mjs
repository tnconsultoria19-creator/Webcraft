import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const projectId = process.env.FIREBASE_PROJECT_ID || 'argon-burner-n8gvj';
const databaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-webcraftstudiowo-5bf1cba5-60da-4bb7-8377-f3c23295aaf2';
const outDir = path.resolve(process.argv[2] || path.join(process.env.HOME || '.', 'webcraft-firestore-complete'));

function getAccessToken() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
}

const accessToken = getAccessToken();
if (!accessToken) throw new Error('No Google access token was returned by gcloud.');

function toValue(v) {
  if (v == null) return null;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('bytesValue' in v) return v.bytesValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(toValue);
  if ('mapValue' in v) return Object.fromEntries(
    Object.entries(v.mapValue.fields || {}).map(([k, value]) => [k, toValue(value)])
  );
  return null;
}

function documentToPlain(doc) {
  return {
    name: doc.name,
    id: doc.name.split('/').pop(),
    fields: Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, toValue(v)])),
    createTime: doc.createTime || null,
    updateTime: doc.updateTime || null
  };
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 2000)}`);
  }
  return text ? JSON.parse(text) : {};
}

function safeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
const rootParent = `projects/${projectId}/databases/${databaseId}/documents`;

fs.mkdirSync(outDir, { recursive: true });

const manifest = {
  exportedAt: new Date().toISOString(),
  projectId,
  databaseId,
  collections: []
};

async function listCollectionIds(parent, pageToken) {
  const url = `${base}:listCollectionIds`;
  const body = { parent, pageSize: 300 };
  if (pageToken) body.pageToken = pageToken;
  return requestJson(url, { method: 'POST', body: JSON.stringify(body) });
}

async function listDocuments(collectionPath, pageToken) {
  const params = new URLSearchParams({ pageSize: '300' });
  if (pageToken) params.set('pageToken', pageToken);
  return requestJson(`${base}/${collectionPath}?${params.toString()}`);
}

async function exportCollection(collectionPath, parentDocumentName = null) {
  const allDocs = [];
  let pageToken = undefined;

  do {
    const data = await listDocuments(collectionPath, pageToken);
    allDocs.push(...(data.documents || []).map(documentToPlain));
    pageToken = data.nextPageToken;
  } while (pageToken);

  const relativeName = collectionPath.replaceAll('/', '__');
  const fileName = safeFileName(`${relativeName}.json`);
  const filePath = path.join(outDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify({
    collectionPath,
    parentDocumentName,
    documents: allDocs
  }, null, 2));

  manifest.collections.push({
    collectionPath,
    parentDocumentName,
    documentCount: allDocs.length,
    file: fileName
  });

  console.log(`Exported ${collectionPath}: ${allDocs.length} document(s)`);

  // Walk every document for nested subcollections as well.
  for (const doc of allDocs) {
    const childParent = doc.name;
    let childToken = undefined;
    do {
      const childCollections = await listCollectionIds(childParent, childToken);
      for (const childId of childCollections.collectionIds || []) {
        await exportCollection(
          childParent.replace(`projects/${projectId}/databases/${databaseId}/documents/`, '') + `/${childId}`,
          childParent
        );
      }
      childToken = childCollections.nextPageToken;
    } while (childToken);
  }
}

let rootToken = undefined;
do {
  const root = await listCollectionIds(rootParent, rootToken);
  for (const collectionId of root.collectionIds || []) {
    await exportCollection(collectionId);
  }
  rootToken = root.nextPageToken;
} while (rootToken);

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

const totals = manifest.collections.reduce(
  (acc, item) => {
    acc.collections += 1;
    acc.documents += item.documentCount;
    return acc;
  },
  { collections: 0, documents: 0 }
);

console.log('');
console.log(`Complete Firestore export finished: ${outDir}`);
console.log(`Collections: ${totals.collections} | Documents: ${totals.documents}`);
console.log('The manifest.json file lists every collection/subcollection found.');
