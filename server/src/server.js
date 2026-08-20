import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb, save, uid } from './db.js';
import { signToken, auth, adminOnly, staffOnly, memberOnly, publicUser } from './auth.js';
import { sendEmail, makeVerifyToken, makeResetToken, hash, compare } from './mailer.js';
import { seedIfEmpty } from './seed.js';
import { initDb } from './db.js';
import { generateSecret, verifyTotp, otpauthUrl } from './totp.js';
import webpush from 'web-push';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, uid('img-') + path.extname(file.originalname).toLowerCase()),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Лише зображення')),
});

// Документи для розділу «Завантаження»: PDF, Office, зображення, архіви — до 20 МБ
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'text/plain',
  'text/csv',
  /^image\//,
];
const docUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    DOC_TYPES.some((t) => (t instanceof RegExp ? t.test(file.mimetype) : t === file.mimetype))
      ? cb(null, true)
      : cb(new Error('Непідтримуваний тип файлу')),
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Базове посилання для email-посилань (верифікація, скидання пароля):
// використовуємо origin запиту, щоб посилання працювали і на проді, і локально
const linkBase = (req) => req.headers.origin || 'http://localhost:4000';

const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

/* ---------------- AUTH ---------------- */

// Журнал адміністративних дій
function audit(actorName, action) {
  getDb().auditLogs.push({
    id: uid('log-'),
    actorName,
    action,
    createdAt: new Date().toISOString(),
  });
  save();
}

function notifyUser(userId, text, link) {
  getDb().notifications.push({
    id: uid('nt-'),
    userId,
    text,
    link: link || '/dashboard',
    read: false,
    createdAt: new Date().toISOString(),
  });
}

const notifyAdmins = (text, link) => {
  for (const u of getDb().users) if (u.role === 'admin') notifyUser(u.id, text, link);
};

const notifyMembers = (text, link) => {
  for (const u of getDb().users) if (u.status === 'member' && !u.blocked) notifyUserAll(u.id, text, link);
};

app.post('/api/auth/register', upload.single('avatar'), async (req, res) => {
  const { name, surname = '', email, password, phone = '', about = '', birthday = '', interests = [] } = req.body || {};
  if (!name || !email || !password) return bad(res, "Ім'я, email і пароль — обов'язкові");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 'Некоректний email');
  if (password.length < 8) return bad(res, 'Пароль має містити щонайменше 8 символів');
  const db = getDb();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    return bad(res, 'Користувач з таким email вже існує');

  const user = {
    id: uid('u-'),
    name,
    surname,
    email: email.toLowerCase(),
    password: await hash(password),
    phone,
    about,
    interests: Array.isArray(interests) ? interests : String(interests).split(',').filter(Boolean),
    role: 'member',
    status: 'pending', // очікує верифікації адміністратором
    blocked: false,
    avatar: req.file ? `/uploads/${req.file.filename}` : '',
    verified: true,
    createdAt: new Date().toISOString(),
  };
  user.birthday = birthday || ''; // день народження (РРРР-ММ-ДД) — для вітань і каталогу
  db.users.push(user);
  save();

  notifyAdmins(`Нова реєстрація: ${name} ${surname} (${email}) — очікує верифікації`, '/admin');
  sendEmail(user.email, 'Вітаемо в «Свідомому Виборі»!', 'Ваш обліковий запис створено.');
  res.status(201).json({ message: 'Обліковий запис створено.' });
});

app.get('/api/auth/verify/:token', (req, res) => {
  const db = getDb();
  const userId = db.verifyTokens[req.params.token];
  const user = db.users.find((u) => u.id === userId);
  if (!user) return bad(res, 'Посилання недійсне', 400);
  user.verified = true;
  delete db.verifyTokens[req.params.token];
  save();
  res.json({ message: 'Email підтверджено. Тепер можна увійти.' });
});

const logLogin = (user, email, ok, req) => {
  getDb().loginLogs.unshift({
    id: uid('log-'),
    userId: user?.id || null,
    email: email || '',
    name: user ? user.name : '',
    ok,
    ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '',
    userAgent: (req.headers['user-agent'] || '').slice(0, 200),
    at: new Date().toISOString(),
  });
  getDb().loginLogs = getDb().loginLogs.slice(0, 500); // журнал входів — останні 500
  save();
};

app.post('/api/auth/login', (req, res) => {
  const { email, password, totpCode } = req.body || {};
  const db = getDb();
  const key = (email || '').toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === key);

  // захист від підбору: 5 невдалих спроб → 15 хвилин блокування
  const fails = db.failedLogins[key] || { count: 0, until: 0 };
  if (Date.now() < fails.until)
    return bad(res, `Забагато невдалих спроб. Спробуйте через ${Math.ceil((fails.until - Date.now()) / 60000)} хв.`, 429);
  if (fails.count >= 5) {
    fails.count = 0;
    fails.until = 0;
  }

  if (!user || !compare(password || '', user.password)) {
    fails.count += 1;
    if (fails.count >= 5) {
      fails.until = Date.now() + 15 * 60 * 1000;
      fails.count = 0;
    }
    db.failedLogins[key] = fails;
    save();
    logLogin(user, key, false, req);
    return bad(res, 'Невірний email або пароль');
  }
  if (user.blocked) return bad(res, 'Ваш акаунт заблоковано адміністратором', 403);

  // 2FA для адміністратора
  if (user.twoFactorEnabled) {
    if (!totpCode) return res.status(401).json({ twoFactorRequired: true, error: 'Введіть код з застосунку-автентифікатора' });
    if (!verifyTotp(user.twoFactorSecret, totpCode)) {
      logLogin(user, key, false, req);
      return bad(res, 'Невірний код двофакторної автентифікації', 401);
    }
  }

  delete db.failedLogins[key];
  save();
  logLogin(user, key, true, req);
  res.json({ token: signToken(user), user: publicUser(user) });
});

/* --- 2FA (TOTP) --- */

app.post('/api/auth/2fa/start', auth(), (req, res) => {
  const secret = generateSecret();
  req.user.twoFactorPending = secret;
  save();
  res.json({ secret, otpauthUrl: otpauthUrl(secret) });
});

app.post('/api/auth/2fa/confirm', auth(), (req, res) => {
  const { code } = req.body || {};
  if (!req.user.twoFactorPending) return bad(res, 'Спочатку згенеруйте секрет');
  if (!verifyTotp(req.user.twoFactorPending, code)) return bad(res, 'Код невірний');
  req.user.twoFactorEnabled = true;
  req.user.twoFactorSecret = req.user.twoFactorPending;
  delete req.user.twoFactorPending;
  save();
  audit(req.user.name, 'Увімкнув двофакторну автентифікацію');
  res.json({ message: 'Двофакторну автентифікацію увімкнено' });
});

app.post('/api/auth/2fa/disable', auth(), (req, res) => {
  req.user.twoFactorEnabled = false;
  delete req.user.twoFactorSecret;
  delete req.user.twoFactorPending;
  save();
  audit(req.user.name, 'Вимкнув двофакторну автентифікацію');
  res.json({ message: 'Двофакторну автентифікацію вимкнено' });
});

app.get('/api/auth/me', auth(), (req, res) => res.json(publicUser(req.user)));

app.put('/api/auth/me', auth(), upload.single('avatar'), (req, res) => {
  const { name, surname, phone, about, birthday, interests, currentPassword, newPassword } = req.body || {};
  const user = req.user;
  if (name) user.name = name;
  if (surname !== undefined) user.surname = surname;
  if (phone !== undefined) user.phone = phone;
  if (about !== undefined) user.about = about;
  if (birthday !== undefined) user.birthday = birthday;
  if (Array.isArray(interests)) user.interests = interests;
  if (req.file) user.avatar = `/uploads/${req.file.filename}`;

  if (newPassword) {
    if (!currentPassword || !compare(currentPassword, user.password))
      return bad(res, 'Поточний пароль невірний');
    if (newPassword.length < 8) return bad(res, 'Новий пароль має містити щонайменше 8 символів');
    user.password = hash(newPassword);
  }
  save();
  res.json(publicUser(user));
});

app.post('/api/auth/forgot', (req, res) => {
  const user = getDb().users.find((u) => u.email.toLowerCase() === (req.body.email || '').toLowerCase());
  if (!user) return res.json({ message: 'Якщо email існує, лист надіслано' });
  const token = makeResetToken(user.id);
  const resetUrl = `${linkBase(req)}/reset-password/${token}`;
  sendEmail(user.email, 'Скидання пароля', `Перейдіть за посиланням: ${resetUrl}`);
  res.json({ message: 'Якщо email існує, лист надіслано', resetUrl });
});

app.post('/api/auth/reset/:token', (req, res) => {
  const db = getDb();
  const userId = db.resetTokens[req.params.token];
  const user = db.users.find((u) => u.id === userId);
  if (!user) return bad(res, 'Посилання недійсне або прострочене');
  const { password } = req.body || {};
  if (!password || password.length < 8) return bad(res, 'Пароль має містити щонайменше 8 символів');
  user.password = hash(password);
  delete db.resetTokens[req.params.token];
  save();
  res.json({ message: 'Пароль змінено. Увійдіть з новим паролем.' });
});

/* ---------------- NEWS ---------------- */

app.get('/api/news', (req, res) => {
  const { search = '', category = '' } = req.query;
  let list = [...getDb().news];
  if (search)
    list = list.filter((n) =>
      (n.title + ' ' + n.excerpt + ' ' + n.content).toLowerCase().includes(search.toLowerCase())
    );
  if (category) list = list.filter((n) => n.category === category);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

app.get('/api/news/:id', (req, res) => {
  const item = getDb().news.find((n) => n.id === req.params.id);
  if (!item) return bad(res, 'Новину не знайдено', 404);
  res.json(item);
});

const notifySubscribers = (title) => {
  for (const s of getDb().subscribers)
    sendEmail(s.email, 'Нова новина на сайті', `Опубліковано: «${title}»`);
};

app.post('/api/news', auth(), adminOnly, upload.single('image'), (req, res) => {
  const { title, excerpt = '', content = '', category = 'organization', featured = false } = req.body || {};
  if (!title) return bad(res, 'Заголовок обовʼязковий');
  const item = {
    id: uid('n-'),
    title,
    excerpt,
    content,
    category,
    image: req.file ? `/uploads/${req.file.filename}` : '',
    authorId: req.user.id,
    authorName: req.user.name,
    featured: featured === 'true' || featured === true,
    createdAt: new Date().toISOString(),
  };
  getDb().news.push(item);
  save();
  notifySubscribers(title);
  res.status(201).json(item);
});

app.put('/api/news/:id', auth(), adminOnly, upload.single('image'), (req, res) => {
  const item = getDb().news.find((n) => n.id === req.params.id);
  if (!item) return bad(res, 'Новину не знайдено', 404);
  const { title, excerpt, content, category, featured } = req.body || {};
  if (title) item.title = title;
  if (excerpt !== undefined) item.excerpt = excerpt;
  if (content !== undefined) item.content = content;
  if (category) item.category = category;
  if (featured !== undefined) item.featured = featured === 'true' || featured === true;
  if (req.file) item.image = `/uploads/${req.file.filename}`;
  save();
  res.json(item);
});

app.delete('/api/news/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  db.news = db.news.filter((n) => n.id !== req.params.id);
  save();
  res.json({ message: 'Видалено' });
});

/* ---------------- EVENTS ---------------- */

app.get('/api/events', (req, res) => {
  const { category = '', from = '', to = '' } = req.query;
  let list = [...getDb().events];
  if (category) list = list.filter((e) => e.category === category);
  if (from) list = list.filter((e) => e.startsAt >= from);
  if (to) list = list.filter((e) => e.startsAt <= to);
  list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const regs = getDb().registrations;
  res.json(
    list.map((e) => ({
      ...e,
      registeredCount: regs.filter((r) => r.eventId === e.id).length,
    }))
  );
});

app.get('/api/events/:id', auth(false), (req, res) => {
  const db = getDb();
  const item = db.events.find((e) => e.id === req.params.id);
  if (!item) return bad(res, 'Подію не знайдено', 404);
  const registeredCount = db.registrations.filter((r) => r.eventId === item.id).length;
  const registered = !!req.user && db.registrations.some((r) => r.eventId === item.id && r.userId === req.user.id);
  res.json({ ...item, registeredCount, registered });
});

app.post('/api/events', auth(), adminOnly, (req, res) => {
  const { title, description = '', category = 'other', startsAt, location = '', capacity = 0 } = req.body || {};
  if (!title || !startsAt) return bad(res, 'Назва і дата початку обовʼязкові');
  const item = { id: uid('e-'), title, description, category, startsAt, location, capacity: Number(capacity) || 0, image: '', createdAt: new Date().toISOString() };
  getDb().events.push(item);
  save();
  res.status(201).json(item);
});

app.put('/api/events/:id', auth(), adminOnly, (req, res) => {
  const item = getDb().events.find((e) => e.id === req.params.id);
  if (!item) return bad(res, 'Подію не знайдено', 404);
  const fields = ['title', 'description', 'category', 'startsAt', 'location'];
  for (const f of fields) if (req.body[f] !== undefined) item[f] = req.body[f];
  if (req.body.capacity !== undefined) item.capacity = Number(req.body.capacity) || 0;
  save();
  res.json(item);
});

app.delete('/api/events/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  db.events = db.events.filter((e) => e.id !== req.params.id);
  db.registrations = db.registrations.filter((r) => r.eventId !== req.params.id);
  save();
  res.json({ message: 'Видалено' });
});

app.post('/api/events/:id/register', auth(), (req, res) => {
  const db = getDb();
  const item = db.events.find((e) => e.id === req.params.id);
  if (!item) return bad(res, 'Подію не знайдено', 404);
  if (db.registrations.some((r) => r.eventId === item.id && r.userId === req.user.id))
    return bad(res, 'Ви вже зареєстровані на цю подію');
  if (item.capacity > 0) {
    const count = db.registrations.filter((r) => r.eventId === item.id).length;
    if (count >= item.capacity) return bad(res, 'Місця закінчилися');
  }
  db.registrations.push({ id: uid('reg-'), eventId: item.id, userId: req.user.id, createdAt: new Date().toISOString() });
  save();
  sendEmail(req.user.email, 'Реєстрація на подію', `Ви зареєструвалися на «${item.title}»`);
  res.status(201).json({ message: 'Зареєстровано' });
});

app.delete('/api/events/:id/register', auth(), (req, res) => {
  const db = getDb();
  db.registrations = db.registrations.filter(
    (r) => !(r.eventId === req.params.id && r.userId === req.user.id)
  );
  save();
  res.json({ message: 'Реєстрацію скасовано' });
});

/* ---------------- DASHBOARD ---------------- */

app.get('/api/dashboard', auth(), (req, res) => {
  const db = getDb();
  const regs = db.registrations
    .filter((r) => r.userId === req.user.id)
    .map((r) => ({ ...r, event: db.events.find((e) => e.id === r.eventId) }))
    .filter((r) => r.event)
    .sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
  const subscribed = db.subscribers.some((s) => s.email === req.user.email);
  res.json({ registrations: regs, subscribed });
});

/* ---------------- FORMS ---------------- */

app.post('/api/volunteer', (req, res) => {
  const { name, email, phone = '', areas = [], message = '' } = req.body || {};
  if (!name || !email) return bad(res, "Ім'я та email обовʼязкові");
  getDb().volunteers.push({ id: uid('vol-'), name, email, phone, areas, message, createdAt: new Date().toISOString() });
  save();
  sendEmail(email, 'Заявка волонтера отримана', 'Дякуємо! Ми звʼяжемося з вами протягом 3 днів.');
  res.status(201).json({ message: 'Заявку надіслано. Дякуємо!' });
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject = '', message = '' } = req.body || {};
  if (!name || !email || !message) return bad(res, "Ім'я, email і повідомлення обовʼязкові");
  getDb().messages.push({ id: uid('msg-'), name, email, subject, message, createdAt: new Date().toISOString() });
  save();
  res.status(201).json({ message: 'Повідомлення надіслано' });
});

app.post('/api/newsletter/subscribe', (req, res) => {
  const email = (req.body.email || '').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 'Некоректний email');
  const db = getDb();
  if (db.subscribers.some((s) => s.email === email)) return res.json({ message: 'Ви вже підписані' });
  db.subscribers.push({ id: uid('sub-'), email, createdAt: new Date().toISOString() });
  save();
  res.status(201).json({ message: 'Підписку оформлено' });
});

/* ---------------- ADMIN ---------------- */

app.get('/api/admin/stats', auth(), adminOnly, (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  const members = db.users.filter((u) => u.status === 'member' && !u.blocked);
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : 0);
  // реєстрації за останні 6 місяців — для графіка
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: d.toLocaleDateString('uk-UA', { month: 'short' }),
      users: db.users.filter((u) => u.createdAt.startsWith(key)).length,
      votesCast: db.votes.flatMap((v) => v.ballots).filter((b) => b.at.startsWith(key)).length,
    });
  }
  res.json({
    users: db.users.length,
    pending: db.users.filter((u) => u.status === 'pending').length,
    verifiedMembers: members.length,
    blocked: db.users.filter((u) => u.blocked).length,
    news: db.news.length,
    events: db.events.length,
    upcomingEvents: db.events.filter((e) => e.startsAt >= now).length,
    registrations: db.registrations.length,
    volunteers: db.volunteers.length,
    messages: db.messages.length,
    subscribers: db.subscribers.length,
    meetings: db.meetings.length,
    votes: db.votes.length,
    openVotes: db.votes.filter((v) => v.status === 'open').length,
    surveys: db.surveys.length,
    reviews: db.reviews.length,
    months,
  });
});

app.get('/api/admin/users', auth(), adminOnly, (req, res) =>
  res.json(getDb().users.map(publicUser))
);

app.put('/api/admin/users/:id/role', auth(), adminOnly, (req, res) => {
  const user = getDb().users.find((u) => u.id === req.params.id);
  if (!user) return bad(res, 'Користувача не знайдено', 404);
  if (!['admin', 'member'].includes(req.body.role)) return bad(res, 'Невірна роль');
  user.role = req.body.role;
  save();
  res.json(publicUser(user));
});

app.delete('/api/admin/users/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  if (req.params.id === req.user.id) return bad(res, 'Не можна видалити себе');
  db.users = db.users.filter((u) => u.id !== req.params.id);
  save();
  res.json({ message: 'Видалено' });
});

app.get('/api/admin/:list', auth(), adminOnly, (req, res) => {
  const allowed = ['volunteers', 'messages', 'subscribers'];
  if (!allowed.includes(req.params.list)) return bad(res, 'Невірний список', 404);
  res.json(getDb()[req.params.list]);
});

app.delete('/api/newsletter/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  db.subscribers = db.subscribers.filter((s) => s.id !== req.params.id);
  save();
  res.json({ message: 'Видалено' });
});

/* ---------------- РЕЙТИНГ АКТИВНОСТІ ---------------- */
// Формула: 40% участь у засіданнях + 40% участь у голосуваннях + 20% опитування.
// Рейтинг рахується на сервері — користувач не може його змінити.
app.get('/api/me/rating', auth(), (req, res) => {
  const db = getDb();
  const membersCount = db.users.filter((u) => u.status === 'member' && !u.blocked).length || 1;
  const meetings = db.meetings.length;
  const votes = db.votes.filter((v) => v.status === 'closed' || v.status === 'open').length;
  const surveys = db.surveys.filter((s) => s.status === 'open').length;

  const myMeetings = db.meetings.filter((m) =>
    m.rsvps.some((r) => r.userId === req.user.id && r.answer === 'yes')
  ).length;
  const myVotes = db.votes.filter((v) =>
    v.ballots.some((b) => b.userId === req.user.id)
  ).length;
  const mySurveys = db.surveyResponses.filter((s) => s.userId === req.user.id).length;

  const pct = (mine, total) => (total === 0 ? 100 : Math.round((mine / total) * 100));
  const rating = Math.round(
    0.4 * pct(myMeetings, meetings) + 0.4 * pct(myVotes, votes) + 0.2 * pct(mySurveys, surveys)
  );

  const myReviews = db.reviews.filter((r) => r.aboutUserId === req.user.id);
  const avgReview = myReviews.length
    ? (myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1)
    : null;

  res.json({
    rating,
    details: {
      meetings: { mine: myMeetings, total: meetings, pct: pct(myMeetings, meetings) },
      votes: { mine: myVotes, total: votes, pct: pct(myVotes, votes) },
      surveys: { mine: mySurveys, total: surveys, pct: pct(mySurveys, surveys) },
      reviewsCount: myReviews.length,
      avgReview,
      membersCount,
    },
  });
});

/* ---------------- СПОВІЩЕННЯ ---------------- */

app.get('/api/notifications', auth(), (req, res) => {
  const list = getDb()
    .notifications.filter((n) => n.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);
  res.json(list);
});

app.post('/api/notifications/read-all', auth(), (req, res) => {
  for (const n of getDb().notifications) if (n.userId === req.user.id) n.read = true;
  save();
  res.json({ message: 'Прочитано' });
});

/* ---------------- ЗАСІДАННЯ ---------------- */

const meetingCounts = (m, db) => ({
  yes: m.rsvps.filter((r) => r.answer === 'yes').length,
  no: m.rsvps.filter((r) => r.answer === 'no').length,
  maybe: m.rsvps.filter((r) => r.answer === 'maybe').length,
});

app.get('/api/meetings', auth(), (req, res) => {
  const db = getDb();
  const list = [...db.meetings]
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((m) => ({
      ...m,
      counts: meetingCounts(m, db),
      myRsvp: m.rsvps.find((r) => r.userId === req.user.id)?.answer || null,
      votesCount: db.votes.filter((v) => v.meetingId === m.id).length,
    }));
  res.json(list);
});

app.get('/api/meetings/:id', auth(), (req, res) => {
  const db = getDb();
  const m = db.meetings.find((x) => x.id === req.params.id);
  if (!m) return bad(res, 'Засідання не знайдено', 404);
  const votes = db.votes
    .filter((v) => v.meetingId === m.id)
    .map((v) => ({
      id: v.id,
      title: v.title,
      status: v.status,
      myVote: v.ballots.find((b) => b.userId === req.user.id)?.option || null,
      results: voteResults(v, db, req.user),
    }));
  const participants = m.rsvps.map((r) => ({
    answer: r.answer,
    at: r.at,
    user: db.users.find((u) => u.id === r.userId)
      ? { id: r.userId, name: db.users.find((u) => u.id === r.userId).name, surname: db.users.find((u) => u.id === r.userId).surname || '' }
      : null,
  })).filter((p) => p.user);
  res.json({ ...m, counts: meetingCounts(m, db), myRsvp: m.rsvps.find((r) => r.userId === req.user.id)?.answer || null, votes, participants });
});

app.post('/api/meetings', auth(), adminOnly, (req, res) => {
  const { title, startsAt, location = '', format = 'очно', description = '', agenda = [] } = req.body || {};
  if (!title || !startsAt) return bad(res, 'Назва і дата засідання обовʼязкові');
  const m = {
    id: uid('m-'),
    title,
    startsAt,
    location,
    format,
    description,
    agenda: agenda.map((a, i) => ({ id: uid('a-'), number: i + 1, ...a, status: a.status || 'очікує' })),
    rsvps: [],
    createdAt: new Date().toISOString(),
  };
  getDb().meetings.push(m);
  save();
  audit(req.user.name, `Створив засідання «${title}»`);
  notifyMembers(`Створено нове засідання: «${title}»`, '/meetings');
  res.status(201).json(m);
});

app.put('/api/meetings/:id', auth(), adminOnly, (req, res) => {
  const m = getDb().meetings.find((x) => x.id === req.params.id);
  if (!m) return bad(res, 'Засідання не знайдено', 404);
  const { title, startsAt, location, format, description, agenda } = req.body || {};
  if (title) m.title = title;
  if (startsAt) m.startsAt = startsAt;
  if (location !== undefined) m.location = location;
  if (format) m.format = format;
  if (description !== undefined) m.description = description;
  if (Array.isArray(agenda))
    m.agenda = agenda.map((a, i) => {
      const old = m.agenda.find((x) => x.id === a.id);
      return { id: old?.id || uid('a-'), number: i + 1, ...a, status: a.status || old?.status || 'очікує' };
    });
  save();
  audit(req.user.name, `Відредагував засідання «${m.title}»`);
  res.json(m);
});

app.delete('/api/meetings/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  const m = db.meetings.find((x) => x.id === req.params.id);
  db.meetings = db.meetings.filter((x) => x.id !== req.params.id);
  db.votes = db.votes.filter((v) => v.meetingId !== req.params.id);
  save();
  if (m) audit(req.user.name, `Видалив засідання «${m.title}»`);
  res.json({ message: 'Видалено' });
});

app.post('/api/meetings/:id/rsvp', auth(), memberOnly, (req, res) => {
  const m = getDb().meetings.find((x) => x.id === req.params.id);
  if (!m) return bad(res, 'Засідання не знайдено', 404);
  const { answer } = req.body || {};
  if (!['yes', 'no', 'maybe'].includes(answer)) return bad(res, 'Невірна відповідь');
  m.rsvps = m.rsvps.filter((r) => r.userId !== req.user.id);
  m.rsvps.push({ userId: req.user.id, answer, at: new Date().toISOString() });
  save();
  res.json({ message: 'Збережено' });
});

/* ---------------- ПОІМЕННІ ГОЛОСУВАННЯ ---------------- */

const voteResults = (v, db, requester) => {
  const counts = {};
  for (const opt of v.options) counts[opt] = 0;
  for (const b of v.ballots) counts[b.option] = (counts[b.option] || 0) + 1;
  const membersCount = db.users.filter((u) => u.status === 'member' && !u.blocked).length;
  const named = v.ballots.map((b) => ({ name: b.userName, option: b.option, at: b.at }));
  const isOpen = v.status === 'open';
  // поіменна таблиця відкрита адміну завжди, членам — лише після завершення голосування
  const canSeeNamed = requester && (requester.role === 'admin' || requester.role === 'deputy' || !isOpen);
  return {
    counts,
    membersCount,
    notVoted: Math.max(0, membersCount - v.ballots.length),
    named: canSeeNamed ? named : null,
  };
};

app.get('/api/votes', auth(), (req, res) => {
  const db = getDb();
  const list = [...db.votes]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((v) => ({
      id: v.id,
      title: v.title,
      question: v.question,
      meetingId: v.meetingId,
      meetingTitle: db.meetings.find((m) => m.id === v.meetingId)?.title || '',
      status: v.status,
      createdAt: v.createdAt,
      myVote: v.ballots.find((b) => b.userId === req.user.id)?.option || null,
      ballotsCount: v.ballots.length,
      results: voteResults(v, db, req.user),
    }));
  res.json(list);
});

app.get('/api/votes/:id', auth(), (req, res) => {
  const db = getDb();
  const v = db.votes.find((x) => x.id === req.params.id);
  if (!v) return bad(res, 'Голосування не знайдено', 404);
  res.json({
    id: v.id,
    title: v.title,
    question: v.question,
    meetingId: v.meetingId,
    meetingTitle: db.meetings.find((m) => m.id === v.meetingId)?.title || '',
    status: v.status,
    createdAt: v.createdAt,
    myVote: v.ballots.find((b) => b.userId === req.user.id)?.option || null,
    results: voteResults(v, db, req.user),
  });
});

app.post('/api/votes', auth(), adminOnly, (req, res) => {
  const { title, question, meetingId = '', agendaNumber = 0, options } = req.body || {};
  if (!title || !question) return bad(res, 'Назва і питання обовʼязкові');
  const v = {
    id: uid('v-'),
    title,
    question,
    meetingId,
    agendaNumber: Number(agendaNumber) || 0,
    options: Array.isArray(options) && options.length ? options : ['ЗА', 'ПРОТИ', 'УТРИМАВСЯ'],
    status: 'draft',
    ballots: [],
    createdAt: new Date().toISOString(),
  };
  getDb().votes.push(v);
  save();
  audit(req.user.name, `Створив голосування «${title}»`);
  res.status(201).json(v);
});

app.put('/api/votes/:id/status', auth(), adminOnly, (req, res) => {
  const v = getDb().votes.find((x) => x.id === req.params.id);
  if (!v) return bad(res, 'Голосування не знайдено', 404);
  const { status } = req.body || {};
  if (!['draft', 'open', 'closed'].includes(status)) return bad(res, 'Невірний статус');
  v.status = status;
  if (status === 'closed') v.closedAt = new Date().toISOString();
  save();
  audit(req.user.name, `${status === 'open' ? 'Розпочав' : status === 'closed' ? 'Завершив' : 'Скасував'} голосування «${v.title}»`);
  if (status === 'open') notifyMembers(`Розпочалося голосування: «${v.title}»`, `/meetings/${v.meetingId}`);
  if (status === 'closed') notifyMembers(`Завершено голосування: «${v.title}»`, '/dashboard');
  res.json(v);
});

app.delete('/api/votes/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  const v = db.votes.find((x) => x.id === req.params.id);
  db.votes = db.votes.filter((x) => x.id !== req.params.id);
  save();
  if (v) audit(req.user.name, `Видалив голосування «${v.title}»`);
  res.json({ message: 'Видалено' });
});

// Голосування: один голос на користувача, змінити не можна
app.post('/api/votes/:id/cast', auth(), memberOnly, (req, res) => {
  const db = getDb();
  const v = db.votes.find((x) => x.id === req.params.id);
  if (!v) return bad(res, 'Голосування не знайдено', 404);
  if (v.status !== 'open') return bad(res, 'Голосування не є активним', 403);
  if (v.ballots.some((b) => b.userId === req.user.id))
    return bad(res, 'Ви вже проголосували. Змінити голос не можна.', 403);
  const { option } = req.body || {};
  if (!v.options.includes(option)) return bad(res, 'Невірний варіант голосування');
  v.ballots.push({
    userId: req.user.id,
    userName: `${req.user.name} ${req.user.surname || ''}`.trim(),
    option,
    at: new Date().toISOString(),
  });
  save();
  audit(req.user.name, `Проголосував «${option}» у голосуванні «${v.title}»`);
  res.json({ message: 'Ваш голос прийнято' });
});

/* ---------------- ОПИТУВАННЯ ---------------- */

const surveyResults = (s, db) => {
  const total = db.surveyResponses.filter((r) => r.surveyId === s.id).length;
  const counts = s.options.map(
    (_, i) => db.surveyResponses.filter((r) => r.surveyId === s.id && r.optionIndex === i).length
  );
  return { total, counts };
};

app.get('/api/surveys', auth(), (req, res) => {
  const db = getDb();
  const list = [...db.surveys]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((s) => ({
      ...s,
      myResponse: db.surveyResponses.find((r) => r.surveyId === s.id && r.userId === req.user.id)?.optionIndex ?? null,
      results: surveyResults(s, db),
    }));
  res.json(list);
});

app.post('/api/surveys', auth(), staffOnly, (req, res) => {
  const { title, question, options = [] } = req.body || {};
  if (!title || !question || options.length < 2) return bad(res, 'Потрібні назва, питання і щонайменше 2 варіанти');
  const s = {
    id: uid('sur-'),
    title,
    question,
    options,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  getDb().surveys.push(s);
  save();
  audit(req.user.name, `Створив опитування «${title}»`);
  notifyMembers(`Нове опитування: «${title}»`, '/surveys');
  res.status(201).json(s);
});

app.delete('/api/surveys/:id', auth(), staffOnly, (req, res) => {
  const db = getDb();
  const s = db.surveys.find((x) => x.id === req.params.id);
  db.surveys = db.surveys.filter((x) => x.id !== req.params.id);
  db.surveyResponses = db.surveyResponses.filter((r) => r.surveyId !== req.params.id);
  save();
  if (s) audit(req.user.name, `Видалив опитування «${s.title}»`);
  res.json({ message: 'Видалено' });
});

app.post('/api/surveys/:id/respond', auth(), memberOnly, (req, res) => {
  const db = getDb();
  const s = db.surveys.find((x) => x.id === req.params.id);
  if (!s || s.status !== 'open') return bad(res, 'Опитування не знайдено або закрите', 404);
  if (db.surveyResponses.some((r) => r.surveyId === s.id && r.userId === req.user.id))
    return bad(res, 'Ви вже відповіли на це опитування', 403);
  const { optionIndex } = req.body || {};
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= s.options.length)
    return bad(res, 'Невірний варіант');
  db.surveyResponses.push({ id: uid('sr-'), surveyId: s.id, userId: req.user.id, optionIndex, at: new Date().toISOString() });
  save();
  res.json({ message: 'Відповідь прийнято' });
});

/* ---------------- ВІДГУКИ ---------------- */

app.get('/api/members', auth(), (req, res) => {
  const db = getDb();
  res.json(
    db.users
      .filter((u) => u.status === 'member' && !u.blocked && u.id !== req.user.id)
      .map((u) => ({ id: u.id, name: u.name, surname: u.surname || '' }))
  );
});

app.get('/api/reviews/about/:userId', auth(), (req, res) => {
  const list = getDb()
    .reviews.filter((r) => r.aboutUserId === req.params.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

app.post('/api/reviews', auth(), memberOnly, (req, res) => {
  const db = getDb();
  const { aboutUserId, rating, text = '' } = req.body || {};
  const target = db.users.find((u) => u.id === aboutUserId);
  if (!target) return bad(res, 'Користувача не знайдено', 404);
  if (target.id === req.user.id) return bad(res, 'Не можна залишити відгук про себе');
  if (db.reviews.some((r) => r.aboutUserId === target.id && r.fromUserId === req.user.id))
    return bad(res, 'Ви вже залишали відгук про цього учасника', 403);
  const r = Math.round(Number(rating));
  if (!(r >= 1 && r <= 5)) return bad(res, 'Оцінка має бути від 1 до 5');
  db.reviews.push({
    id: uid('rev-'),
    aboutUserId: target.id,
    fromUserId: req.user.id,
    fromName: req.user.name,
    rating: r,
    text,
    createdAt: new Date().toISOString(),
  });
  save();
  notifyUser(target.id, `${req.user.name} залишив про вас відгук`, '/dashboard');
  res.status(201).json({ message: 'Відгук додано' });
});

/* ---------------- АДМІН: ВЕРИФІКАЦІЯ, ЖУРНАЛ, ЕКСПОРТ ---------------- */

app.put('/api/admin/users/:id/status', auth(), adminOnly, (req, res) => {
  const db = getDb();
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return bad(res, 'Користувача не знайдено', 404);
  const { status, blocked } = req.body || {};
  if (status && ['pending', 'member'].includes(status)) {
    const was = u.status;
    u.status = status;
    audit(req.user.name, `Змінив статус ${u.name} (${u.email}): ${was} → ${status}`);
    if (status === 'member') notifyUser(u.id, 'Вас верифіковано — тепер доступні голосування та опитування', '/dashboard');
  }
  if (blocked !== undefined) {
    u.blocked = !!blocked;
    audit(req.user.name, `${u.blocked ? 'Заблокував' : 'Розблокував'} користувача ${u.name} (${u.email})`);
  }
  save();
  res.json(publicUser(u));
});

app.get('/api/admin/audit', auth(), adminOnly, (req, res) => {
  res.json([...getDb().auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100));
});

app.get('/api/admin/reviews', auth(), adminOnly, (req, res) => {
  const db = getDb();
  res.json(
    db.reviews.map((r) => {
      const u = db.users.find((x) => x.id === r.aboutUserId);
      const fullName = u ? `${u.name} ${u.surname || ''}`.trim() : '';
      return { ...r, aboutName: fullName || (u ? u.email : '—') };
    })
  );
});

const csv = (rows) => '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

app.get('/api/admin/export/users', auth(), adminOnly, (req, res) => {
  const rows = [['Імʼя', 'Прізвище', 'Email', 'Телефон', 'Роль', 'Статус', 'Зареєстровано']];
  for (const u of getDb().users)
    rows.push([u.name, u.surname, u.email, u.phone, u.role, u.status, u.createdAt]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=members.csv');
  res.send(csv(rows));
});

app.get('/api/admin/export/votes/:id', auth(), adminOnly, (req, res) => {
  const v = getDb().votes.find((x) => x.id === req.params.id);
  if (!v) return bad(res, 'Голосування не знайдено', 404);
  const rows = [['Учасник', 'Голос', 'Час']];
  for (const b of v.ballots) rows.push([b.userName, b.option, b.at]);
  rows.push([], ['ЗА', 'ПРОТИ', 'УТРИМАЛИСЯ/інше'].map((_, i) => ''));
  const counts = voteResults(v, getDb(), req.user).counts;
  rows.push([Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(', ')]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=vote-${v.id}.csv`);
  res.send(csv(rows));
});

app.get('/api/admin/export/surveys/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  const s = db.surveys.find((x) => x.id === req.params.id);
  if (!s) return bad(res, 'Опитування не знайдено', 404);
  const res_ = surveyResults(s, db);
  const rows = [['Питання', s.question], ['Варіант', 'Голосів', 'Відсоток']];
  s.options.forEach((opt, i) => {
    const pct = res_.total ? Math.round((res_.counts[i] / res_.total) * 100) : 0;
    rows.push([opt, res_.counts[i], pct + '%']);
  });
  rows.push(['Разом', res_.total]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=survey-${s.id}.csv`);
  res.send(csv(rows));
});

/* ---------------- ЗАВАНТАЖЕННЯ (ДОКУМЕНТИ) ---------------- */

const fileIcon = (mimetype, filename = '') => {
  if (/^image\//.test(mimetype)) return '🖼️';
  if (mimetype === 'application/pdf' || /\.pdf$/i.test(filename)) return '📕';
  if (/word|document/i.test(mimetype) || /\.docx?$/i.test(filename)) return '📘';
  if (/sheet|excel/i.test(mimetype) || /\.xlsx?$/i.test(filename)) return '📗';
  if (/presentation|powerpoint/i.test(mimetype) || /\.pptx?$/i.test(filename)) return '📙';
  if (/zip/.test(mimetype) || /\.zip$/i.test(filename)) return '🗜️';
  return '📄';
};

app.get('/api/documents', (req, res) => {
  const db = getDb();
  const list = [...db.documents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => ({ ...d, icon: fileIcon(d.mimetype, d.filename) }));
  res.json(list);
});

app.post('/api/documents', auth(), staffOnly, docUpload.single('file'), (req, res) => {
  const { title, description = '' } = req.body || {};
  if (!title) return bad(res, 'Назва обовʼязкова');
  if (!req.file) return bad(res, 'Файл не надіслано');
  const item = {
    id: uid('doc-'),
    title,
    description,
    filename: req.file.originalname,
    path: `/uploads/${req.file.filename}`,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user.name,
    createdAt: new Date().toISOString(),
  };
  getDb().documents.push(item);
  save();
  audit(req.user.name, `Завантажив документ «${title}»`);
  notifyMembers(`Новий документ у розділі «Завантаження»: «${title}»`, '/downloads');
  res.status(201).json(item);
});

app.delete('/api/documents/:id', auth(), staffOnly, (req, res) => {
  const db = getDb();
  const item = db.documents.find((d) => d.id === req.params.id);
  db.documents = db.documents.filter((d) => d.id !== req.params.id);
  save();
  if (item) audit(req.user.name, `Видалив документ «${item.title}»`);
  res.json({ message: 'Видалено' });
});

/* ---------------- ДОСЯГНЕННЯ, ДОШКА ПОШАНИ, КВЕСТ ---------------- */

const ratingOf = (userId, db) => {
  const meetings = db.meetings.length;
  const votes = db.votes.filter((v) => v.status !== 'draft').length;
  const surveys = db.surveys.filter((s) => s.status === 'open').length;
  const myMeetings = db.meetings.filter((m) => m.rsvps.some((r) => r.userId === userId && r.answer === 'yes')).length;
  const myVotes = db.votes.filter((v) => v.ballots.some((b) => b.userId === userId)).length;
  const mySurveys = db.surveyResponses.filter((s) => s.userId === userId).length;
  const pct = (mine, total) => (total === 0 ? 100 : Math.round((mine / total) * 100));
  return Math.round(0.4 * pct(myMeetings, meetings) + 0.4 * pct(myVotes, votes) + 0.2 * pct(mySurveys, surveys));
};

app.get('/api/me/achievements', auth(), (req, res) => {
  const db = getDb();
  const me = req.user.id;
  const myMeetings = db.meetings.filter((m) => m.rsvps.some((r) => r.userId === me && r.answer === 'yes')).length;
  const myVotes = db.votes.filter((v) => v.ballots.some((b) => b.userId === me)).length;
  const mySurveys = db.surveyResponses.filter((s) => s.userId === me).length;
  const myReviewsGiven = db.reviews.filter((r) => r.fromUserId === me).length;
  const myEvents = db.registrations.filter((r) => r.userId === me).length;
  const subscribed = db.subscribers.some((s) => s.email === req.user.email);
  const profileFilled = !!(req.user.about && req.user.avatar);
  const isMember = req.user.status === 'member';

  const all = [
    { code: 'member', icon: '🏅', title: 'Член організації', desc: 'Верифікований адміністратором', done: isMember },
    { code: 'profile', icon: '🪪', title: 'Ідеальний профіль', desc: 'Фото + опис про себе', done: profileFilled },
    { code: 'subscribe', icon: '📬', title: 'В курсі подій', desc: 'Підписка на розсилку', done: subscribed },
    { code: 'first_meeting', icon: '🌱', title: 'Перше засідання', desc: 'Підтвердив участь', done: myMeetings >= 1, progress: [Math.min(myMeetings, 1), 1] },
    { code: 'first_vote', icon: '🗳️', title: 'Перший голос', desc: 'Проголосував у голосуванні', done: myVotes >= 1, progress: [Math.min(myVotes, 1), 1] },
    { code: 'events5', icon: '🎪', title: 'Постійний учасник', desc: '5 публічних подій', done: myEvents >= 5, progress: [Math.min(myEvents, 5), 5] },
    { code: 'votes10', icon: '🔟', title: '10 голосувань', desc: 'Активний виборець', done: myVotes >= 10, progress: [Math.min(myVotes, 10), 10] },
    { code: 'surveys5', icon: '📊', title: 'Голос народу', desc: '5 опитувань', done: mySurveys >= 5, progress: [Math.min(mySurveys, 5), 5] },
    { code: 'reviewer', icon: '💬', title: 'Справедливий суддя', desc: 'Залишив відгук колезі', done: myReviewsGiven >= 1 },
  ];
  // квест новачка
  const quest = {
    done: profileFilled && subscribed && myMeetings >= 1,
    steps: [
      { title: 'Заповни профіль (фото + опис)', done: profileFilled },
      { title: 'Підпишися на розсилку', done: subscribed },
      { title: 'Зареєструйся на засідання', done: myMeetings >= 1 },
    ],
  };
  res.json({ achievements: all, quest, unlocked: all.filter((a) => a.done).length, total: all.length });
});

app.get('/api/honor-board', (req, res) => {
  const db = getDb();
  const members = db.users
    .filter((u) => u.status === 'member' && !u.blocked)
    .map((u) => ({
      id: u.id,
      name: u.name,
      surname: u.surname || '',
      avatar: u.avatar || '',
      rating: ratingOf(u.id, db),
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);
  res.json(members);
});

app.get('/api/birthdays', auth(), (req, res) => {
  const db = getDb();
  const now = new Date();
  const soon = [];
  for (const u of db.users.filter((x) => x.status === 'member' && !x.blocked && x.birthday)) {
    const b = new Date(u.birthday);
    let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
    const inDays = Math.round((next - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    if (inDays <= 14) soon.push({ name: `${u.name} ${u.surname || ''}`.trim(), date: next.toISOString(), inDays, isToday: inDays === 0 });
  }
  soon.sort((a, b) => a.inDays - b.inDays);
  res.json(soon);
});

/* ---------------- КАТАЛОГ ЧЛЕНІВ ---------------- */

app.get('/api/member-directory', auth(), (req, res) => {
  const db = getDb();
  res.json(
    db.users
      .filter((u) => u.status === 'member' && !u.blocked)
      .map((u) => ({
        id: u.id,
        name: u.name,
        surname: u.surname || '',
        avatar: u.avatar || '',
        about: u.about || '',
        interests: u.interests || [],
        birthday: u.birthday || '',
        joined: u.createdAt,
        rating: ratingOf(u.id, db),
        role: u.role,
      }))
      .sort((a, b) => b.rating - a.rating)
  );
});

/* ---------------- КОМЕНТАРІ ДО НОВИН ---------------- */

app.get('/api/news/:id/comments', (req, res) => {
  const list = getDb()
    .comments.filter((c) => c.newsId === req.params.id && c.status === 'approved')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

app.post('/api/news/:id/comments', auth(), (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return bad(res, 'Текст коментаря порожній');
  if (text.length > 1000) return bad(res, 'Коментар задовгий (максимум 1000 символів)');
  const moderated = !!getDb().settings.commentModeration;
  const item = {
    id: uid('c-'),
    newsId: req.params.id,
    userId: req.user.id,
    userName: `${req.user.name} ${req.user.surname || ''}`.trim(),
    userAvatar: req.user.avatar || '',
    text,
    status: moderated ? 'pending' : 'approved',
    createdAt: new Date().toISOString(),
  };
  getDb().comments.push(item);
  save();
  res.status(201).json(item);
});

app.delete('/api/admin/comments/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  db.comments = db.comments.filter((c) => c.id !== req.params.id);
  save();
  res.json({ message: 'Видалено' });
});

app.put('/api/admin/comments/:id/approve', auth(), adminOnly, (req, res) => {
  const c = getDb().comments.find((x) => x.id === req.params.id);
  if (!c) return bad(res, 'Коментар не знайдено', 404);
  c.status = 'approved';
  save();
  res.json(c);
});

app.get('/api/admin/comments', auth(), adminOnly, (req, res) => {
  res.json([...getDb().comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200));
});

/* ---------------- ПАРТНЕРИ ---------------- */

app.get('/api/partners', (req, res) => {
  res.json(getDb().partners || []);
});

app.post('/api/partners', auth(), adminOnly, upload.single('logo'), (req, res) => {
  const { name, url = '', description = '' } = req.body || {};
  if (!name) return bad(res, 'Назва обовʼязкова');
  const item = { id: uid('p-'), name, url, description, logo: req.file ? `/uploads/${req.file.filename}` : '' };
  getDb().partners.push(item);
  save();
  res.status(201).json(item);
});

app.delete('/api/partners/:id', auth(), adminOnly, (req, res) => {
  const db = getDb();
  db.partners = db.partners.filter((p) => p.id !== req.params.id);
  save();
  res.json({ message: 'Видалено' });
});

/* ---------------- ВАКАНСІЇ ---------------- */

app.get('/api/jobs', (req, res) => {
  res.json((getDb().jobs || []).filter((j) => j.active !== false));
});

app.post('/api/jobs', auth(), staffOnly, (req, res) => {
  const { title, description = '', requirements = '', contact = '' } = req.body || {};
  if (!title) return bad(res, 'Назва обовʼязкова');
  const item = { id: uid('j-'), title, description, requirements, contact, active: true, createdAt: new Date().toISOString() };
  getDb().jobs.push(item);
  save();
  res.status(201).json(item);
});

app.put('/api/jobs/:id', auth(), staffOnly, (req, res) => {
  const j = getDb().jobs.find((x) => x.id === req.params.id);
  if (!j) return bad(res, 'Вакансію не знайдено', 404);
  for (const f of ['title', 'description', 'requirements', 'contact', 'active'])
    if (req.body[f] !== undefined) j[f] = req.body[f];
  save();
  res.json(j);
});

app.delete('/api/jobs/:id', auth(), staffOnly, (req, res) => {
  const db = getDb();
  db.jobs = db.jobs.filter((x) => x.id !== req.params.id);
  save();
  res.json({ message: 'Видалено' });
});

/* ---------------- ФОТОГАЛЕРЕЇ ПОДІЙ ---------------- */

app.post('/api/events/:id/photos', auth(), staffOnly, upload.array('photos', 10), (req, res) => {
  const ev = getDb().events.find((e) => e.id === req.params.id);
  if (!ev) return bad(res, 'Подію не знайдено', 404);
  ev.photos = [...(ev.photos || []), ...req.files.map((f) => `/uploads/${f.filename}`)];
  save();
  res.status(201).json(ev.photos);
});

app.delete('/api/events/:id/photos', auth(), staffOnly, (req, res) => {
  const ev = getDb().events.find((e) => e.id === req.params.id);
  if (!ev) return bad(res, 'Подію не знайдено', 404);
  const { photo } = req.body || {};
  ev.photos = (ev.photos || []).filter((p) => p !== photo);
  save();
  res.json(ev.photos);
});

/* ---------------- ПРОТОКОЛ ЗАСІДАННЯ (для друку/PDF) ---------------- */

app.get('/api/meetings/:id/protocol', auth(), adminOnly, (req, res) => {
  const db = getDb();
  const m = db.meetings.find((x) => x.id === req.params.id);
  if (!m) return bad(res, 'Засідання не знайдено', 404);
  const present = m.rsvps
    .filter((r) => r.answer !== 'no')
    .map((r) => {
      const u = db.users.find((x) => x.id === r.userId);
      return u ? `${u.name} ${u.surname || ''}`.trim() : null;
    })
    .filter(Boolean);
  const absent = db.users
    .filter((u) => u.status === 'member' && !u.blocked && !present.some((p) => p.startsWith(u.name)))
    .map((u) => `${u.name} ${u.surname || ''}`.trim());
  const votes = db.votes
    .filter((v) => v.meetingId === m.id)
    .map((v) => {
      const counts = {};
      for (const b of v.ballots) counts[b.option] = (counts[b.option] || 0) + 1;
      return {
        title: v.title,
        question: v.question,
        counts,
        named: v.ballots.map((b) => ({ name: b.userName, option: b.option, at: b.at })),
        status: v.status,
      };
    });
  res.json({
    meeting: { title: m.title, startsAt: m.startsAt, location: m.location, format: m.format, agenda: m.agenda },
    present,
    absent,
    votes,
    generatedAt: new Date().toISOString(),
  });
});

/* ---------------- НАЛАШТУВАННЯ (GA, донати, модерація) ---------------- */

app.get('/api/settings', (req, res) => {
  const s = getDb().settings;
  res.json({ gaId: s.gaId, commentModeration: s.commentModeration, donationDetails: s.donationDetails, telegramBotName: s.telegramBotName, telegramLinked: !!s.telegramToken });
});

app.put('/api/admin/settings', auth(), adminOnly, (req, res) => {
  const s = getDb().settings;
  for (const f of ['gaId', 'commentModeration', 'donationDetails'])
    if (req.body[f] !== undefined) s[f] = req.body[f];
  save();
  audit(req.user.name, 'Оновив налаштування сайту');
  res.json(s);
});

/* ---------------- TELEGRAM-БОТ ---------------- */

let tgPolling = null;

async function tgApi(method, body) {
  const token = getDb().settings.telegramToken;
  if (!token) throw new Error('Telegram не підключено');
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

app.post('/api/admin/telegram/token', auth(), adminOnly, async (req, res) => {
  const { token } = req.body || {};
  if (!token) return bad(res, 'Вкажіть токен бота');
  const info = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json());
  if (!info.ok) return bad(res, 'Токен невірний');
  const s = getDb().settings;
  s.telegramToken = token;
  s.telegramBotName = info.result.username;
  save();
  startTelegramPolling();
  audit(req.user.name, 'Підключив Telegram-бота @' + info.result.username);
  res.json({ botName: info.result.username });
});

app.get('/me/telegram-link', auth(), (req, res) => {
  const s = getDb().settings;
  res.json({ botName: s.telegramBotName, code: req.user.id.slice(-6).toUpperCase() });
});

async function startTelegramPolling() {
  const s = getDb().settings;
  if (!s.telegramToken || tgPolling) return;
  let offset = 0;
  tgPolling = setInterval(async () => {
    try {
      const updates = await tgApi('getUpdates', { offset, timeout: 0, limit: 10 });
      if (!updates.ok) return;
      for (const u of updates.result || []) {
        offset = u.update_id + 1;
        const msg = u.message;
        if (!msg || !msg.text) continue;
        const code = msg.text.replace('/start', '').trim().toUpperCase();
        const user = getDb().users.find((x) => x.id.slice(-6).toUpperCase() === code);
        if (user) {
          user.telegramChatId = msg.chat.id;
          save();
          await tgApi('sendMessage', {
            chat_id: msg.chat.id,
            text: `✅ Готово, ${user.name}! Тепер ви отримуватимете сповіщення «Свідомого Вибору» тут.`,
          });
        }
      }
    } catch { /* мережа — ігноруємо */ }
  }, 5000);
}

async function sendTelegram(userId, text) {
  const user = getDb().users.find((u) => u.id === userId);
  if (!user?.telegramChatId) return;
  try {
    await tgApi('sendMessage', { chat_id: user.telegramChatId, text });
  } catch { /* ігноруємо помилки доставки */ }
}

/* ---------------- PUSH-СПОВІЩЕННЯ (веб) ---------------- */

let pushKeys = null;

async function ensurePushKeys() {
  const s = getDb().settings;
  if (s.pushPublic && s.pushPrivate) {
    pushKeys = { publicKey: s.pushPublic, privateKey: s.pushPrivate };
    return;
  }
  const keys = webpush.generateVAPIDKeys();
  s.pushPublic = keys.publicKey;
  s.pushPrivate = keys.private;
  save();
  pushKeys = keys;
}

app.get('/api/push/key', async (req, res) => {
  await ensurePushKeys();
  res.json({ publicKey: pushKeys.publicKey });
});

app.post('/api/push/subscribe', auth(), async (req, res) => {
  await ensurePushKeys();
  const sub = req.body;
  const db = getDb();
  db.pushSubscriptions = db.pushSubscriptions.filter((s) => s.userId !== req.user.id || s.sub.endpoint !== sub.endpoint);
  db.pushSubscriptions.push({ userId: req.user.id, sub });
  save();
  res.json({ message: 'Підписано' });
});

app.post('/api/push/unsubscribe', auth(), (req, res) => {
  const db = getDb();
  db.pushSubscriptions = db.pushSubscriptions.filter((s) => !(s.userId === req.user.id && s.sub.endpoint === req.body.endpoint));
  save();
  res.json({ message: 'Відписано' });
});

async function sendPush(userId, title, body) {
  if (!pushKeys) await ensurePushKeys();
  webpush.setVapidDetails('mailto:info@sv-vybir.org.ua', pushKeys.publicKey, pushKeys.privateKey);
  const subs = getDb().pushSubscriptions.filter((s) => s.userId === userId);
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.sub, JSON.stringify({ title, body }));
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        // підписка застаріла
        const db = getDb();
        db.pushSubscriptions = db.pushSubscriptions.filter((x) => x !== s);
        save();
      }
    }
  }
}

/* сповіщення тепер йдуть одразу в три канали: сайт + Telegram + push */
const notifyUserAll = (userId, text, link) => {
  notifyUser(userId, text, link);
  sendTelegram(userId, text);
  sendPush(userId, 'Свідомий Вибір', text);
};

/* ---------------- БЕКАПИ ---------------- */

function makeBackup() {
  const db = getDb();
  const snapshot = {};
  for (const k of Object.keys(db)) if (!['failedLogins', 'backups'].includes(k)) snapshot[k] = db[k];
  const day = new Date().toISOString().slice(0, 10);
  db.backups = (db.backups || []).filter((b) => b.day !== day);
  db.backups.push({ id: uid('bk-'), day, data: snapshot });
  db.backups = db.backups.slice(-7); // тримаємо останні 7 днів
  save();
}

// щогодинна перевірка: настав новий день → бекап
setInterval(() => {
  const db = getDb();
  const day = new Date().toISOString().slice(0, 10);
  if (!db.backups.some((b) => b.day === day)) makeBackup();
}, 60 * 60 * 1000);
setTimeout(() => makeBackup(), 30 * 1000); // перший бекап при старті

app.get('/api/admin/backups', auth(), adminOnly, (req, res) => {
  res.json((getDb().backups || []).map((b) => ({ id: b.id, day: b.day, size: JSON.stringify(b.data).length })).reverse());
});

app.get('/api/admin/backups/:id/download', auth(), adminOnly, (req, res) => {
  const b = getDb().backups.find((x) => x.id === req.params.id);
  if (!b) return bad(res, 'Бекап не знайдено', 404);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=backup-${b.day}.json`);
  res.send(JSON.stringify(b.data, null, 2));
});

app.post('/api/admin/backup-now', auth(), adminOnly, (req, res) => {
  makeBackup();
  audit(req.user.name, 'Створив резервну копію');
  res.json({ message: 'Бекап створено' });
});

/* ---------------- ІМПОРТ УЧАСНИКІВ З CSV ---------------- */

app.post('/api/admin/import-users', auth(), adminOnly, (req, res) => {
  const { csv } = req.body || {};
  if (!csv) return bad(res, 'Відсутні дані CSV');
  const db = getDb();
  const created = [];
  const skipped = [];
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const [name, surname, email, phone, birthday] = line.split(/[,;]/).map((s) => (s || '').trim());
    if (!name || !email) { skipped.push(line); continue; }
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) { skipped.push(email); continue; }
    const password = 'SV' + Math.random().toString(36).slice(2, 10);
    const user = {
      id: uid('u-'),
      name, surname: surname || '', email: email.toLowerCase(),
      password: hash(password), phone: phone || '', about: '', birthday: birthday || '',
      interests: [], role: 'member', status: 'member', blocked: false, avatar: '',
      verified: true, createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    created.push({ email, password });
  }
  save();
  audit(req.user.name, `Імпортував ${created.length} учасників з CSV`);
  res.json({ created, skipped, createdCount: created.length });
});

/* ---------------- ЖУРНАЛ ВХОДІВ ---------------- */

app.get('/api/admin/login-logs', auth(), adminOnly, (req, res) => {
  res.json(getDb().loginLogs.slice(0, 100));
});

/* ---------------- ТИЖНЕВИЙ ДАЙДЖЕСТ ---------------- */

app.post('/api/admin/digest', auth(), adminOnly, async (req, res) => {
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const news = db.news.filter((n) => n.createdAt >= weekAgo).map((n) => `📰 ${n.title}`);
  const meetings = db.meetings.filter((m) => m.createdAt >= weekAgo).map((m) => `🗓️ ${m.title}`);
  const events = db.events.filter((e) => e.startsAt >= new Date().toISOString()).slice(0, 3).map((e) => `🎪 ${e.title}`);
  const lines = ['📅 Тижневий дайджест «Свідомого Вибору»', '', ...news, ...meetings, ...events].filter(Boolean).join('\n');
  for (const u of db.users.filter((x) => x.status === 'member' && !x.blocked)) notifyUserAll(u.id, lines, '/dashboard');
  audit(req.user.name, 'Надіслав тижневий дайджест');
  res.json({ message: `Дайджест надіслано (${lines.split('\n').length - 1} позицій)` });
});

/* ---------------- SEO: SITEMAP + ROBOTS ---------------- */

app.get('/sitemap.xml', (req, res) => {
  const base = `https://${req.headers.host || 'svidomyi-vybir.onrender.com'}`;
  const pages = ['', '/about', '/events', '/news', '/downloads', '/volunteer', '/contact', '/jobs', '/partners', '/donate'];
  const db = getDb();
  const newsUrls = db.news.map((n) => `/news/${n.id}`);
  const eventUrls = db.events.map((e) => `/events/${e.id}`);
  const body = [...pages, ...newsUrls, ...eventUrls]
    .map((p) => `<url><loc>${base}${p}</loc></url>`)
    .join('');
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  const base = `https://${req.headers.host || 'svidomyi-vybir.onrender.com'}`;
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
});

/* ---------------- СТАТИКА (зібраний фронтенд) ---------------- */

const DIST = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  // файли зі збитковими іменами можна кешувати назавжди
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: '1y', immutable: true }));
  // index: false — щоб "/" обробився нижче, з заголовком no-cache
  app.use(express.static(DIST, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    // головна сторінка ніколи не кешується, щоб браузер завжди брав свіжий сайт
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

/* ---------------- START ---------------- */

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Помилка сервера' });
});

const PORT = process.env.PORT || 4000;

// спершу підключаємо базу даних, потім сідаємо початкові дані і запускаємо сервер
initDb()
  .then(() => {
    seedIfEmpty();
    startTelegramPolling(); // якщо токен бота збережений
    app.listen(PORT, () => console.log(`API сервер запущено: http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('Не вдалося підключити базу даних:', e.message);
    process.exit(1);
  });
