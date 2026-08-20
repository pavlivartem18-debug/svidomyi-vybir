import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Якщо MONGODB_URI не задано (локальна розробка) — працюємо як раніше, із файлом.
const MONGO_URI = process.env.MONGODB_URI || null;

const emptyDb = {
  users: [],
  news: [],
  events: [],
  registrations: [],
  volunteers: [],
  messages: [],
  subscribers: [],
  meetings: [],
  votes: [],
  surveys: [],
  documents: [],
  surveyResponses: [],
  reviews: [],
  notifications: [],
  auditLogs: [],
  comments: [],
  partners: [],
  jobs: [],
  loginLogs: [],
  pushSubscriptions: [],
  backups: [],
  settings: {
    gaId: '',
    telegramToken: '',
    telegramBotName: '',
    commentModeration: false,
    donationDetails: '',
  },
  resetTokens: {},
  verifyTokens: {},
  failedLogins: {},
};

let db = { ...emptyDb };
let col = null; // колекція MongoDB
let saveTimer = null;

export function getDb() {
  return db;
}

function loadFile() {
  if (!fs.existsSync(DB_FILE)) return;
  try {
    db = { ...emptyDb, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) };
  } catch {
    /* пошкоджений файл — починаємо з порожньої бази */
  }
}

export async function initDb() {
  if (!MONGO_URI) {
    loadFile();
    console.log('База даних: локальний файл (MONGODB_URI не задано)');
    return;
  }
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  col = client.db('svidomyi_vybir').collection('state');
  // кожен розділ бази (users, news, ...) зберігається одним документом { _id, data }
  const docs = await col.find({}).toArray();
  for (const doc of docs) db[doc._id] = doc.data;
  console.log('База даних: MongoDB підключено');
}

function persist() {
  if (!MONGO_URI) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return;
  }
  for (const key of Object.keys(db)) {
    col.updateOne({ _id: key }, { $set: { data: db[key] } }, { upsert: true }).catch((e) =>
      console.error('Помилка запису в MongoDB:', e.message)
    );
  }
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 200);
}

export const uid = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
