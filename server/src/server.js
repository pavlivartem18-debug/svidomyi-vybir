import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb, save, uid } from './db.js';
import { signToken, auth, adminOnly, publicUser } from './auth.js';
import { sendEmail, makeVerifyToken, makeResetToken, hash, compare } from './mailer.js';
import { seedIfEmpty } from './seed.js';

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

seedIfEmpty();

// Базове посилання для email-посилань (верифікація, скидання пароля):
// використовуємо origin запиту, щоб посилання працювали і через тунель.
const linkBase = (req) => req.headers.origin || 'http://localhost:4000';

const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

/* ---------------- AUTH ---------------- */

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, interests = [] } = req.body || {};
  if (!name || !email || !password) return bad(res, "Ім'я, email і пароль — обов'язкові");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 'Некоректний email');
  if (password.length < 8) return bad(res, 'Пароль має містити щонайменше 8 символів');
  const db = getDb();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    return bad(res, 'Користувач з таким email вже існує');

  const user = {
    id: uid('u-'),
    name,
    email: email.toLowerCase(),
    password: await hash(password),
    phone: phone || '',
    interests,
    role: 'member',
    verified: false,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  save();

  const token = makeVerifyToken(user.id);
  const verifyUrl = `${linkBase(req)}/verify-email/${token}`;
  sendEmail(user.email, 'Підтвердження email', `Перейдіть за посиланням: ${verifyUrl}`);
  res.status(201).json({ message: 'Зареєстровано. Підтвердіть email.', verifyUrl });
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
  if (!user.verified) return bad(res, 'Спочатку підтвердіть email — перевірте пошту', 403);
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', auth(), (req, res) => res.json(publicUser(req.user)));

app.put('/api/auth/me', auth(), (req, res) => {
  const { name, phone, interests, currentPassword, newPassword } = req.body || {};
  const user = req.user;
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (Array.isArray(interests)) user.interests = interests;

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
  res.json({
    users: db.users.length,
    news: db.news.length,
    events: db.events.length,
    upcomingEvents: db.events.filter((e) => e.startsAt >= now).length,
    registrations: db.registrations.length,
    volunteers: db.volunteers.length,
    messages: db.messages.length,
    subscribers: db.subscribers.length,
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

/* ---------------- СТАТИКА (зібраний фронтенд) ---------------- */

const DIST = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

/* ---------------- START ---------------- */

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Помилка сервера' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API сервер запущено: http://localhost:${PORT}`));
