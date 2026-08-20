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
  for (const u of getDb().users) if (u.status === 'member' && !u.blocked) notifyUser(u.id, text, link);
};

app.post('/api/auth/register', upload.single('avatar'), async (req, res) => {
  const { name, surname = '', email, password, phone = '', about = '', interests = [] } = req.body || {};
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

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = getDb().users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !compare(password || '', user.password)) return bad(res, 'Невірний email або пароль');
  if (user.blocked) return bad(res, 'Ваш акаунт заблоковано адміністратором', 403);
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', auth(), (req, res) => res.json(publicUser(req.user)));

app.put('/api/auth/me', auth(), upload.single('avatar'), (req, res) => {
  const { name, surname, phone, about, interests, currentPassword, newPassword } = req.body || {};
  const user = req.user;
  if (name) user.name = name;
  if (surname !== undefined) user.surname = surname;
  if (phone !== undefined) user.phone = phone;
  if (about !== undefined) user.about = about;
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
    app.listen(PORT, () => console.log(`API сервер запущено: http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('Не вдалося підключити базу даних:', e.message);
    process.exit(1);
  });
