import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const emptyDb = {
  users: [],
  news: [],
  events: [],
  registrations: [],
  volunteers: [],
  messages: [],
  subscribers: [],
  resetTokens: {},
  verifyTokens: {},
};

function load() {
  if (!fs.existsSync(DB_FILE)) return { ...emptyDb };
  try {
    return { ...emptyDb, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) };
  } catch {
    return { ...emptyDb };
  }
}

let db = load();
let saveTimer = null;

export function getDb() {
  return db;
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }, 50);
}

export const uid = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
