import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Field, TextArea, Select, Btn, Alert, Card, Empty, fmtDate } from '../components/ui.jsx';
import { eventCats, newsCats } from '../i18n.js';

/* ---------- Статистика ---------- */
function Stats() {
  const { lang } = useLang();
  const [stats, setStats] = useState(null);
  useEffect(() => { api('/api/admin/stats').then(setStats); }, []);
  if (!stats) return <p className="text-slate-400">…</p>;
  const items = [
    ['👥', lang === 'uk' ? 'Користувачі' : 'Users', stats.users],
    ['📰', lang === 'uk' ? 'Новини' : 'News', stats.news],
    ['📅', lang === 'uk' ? 'Події' : 'Events', stats.events],
    ['📅', lang === 'uk' ? 'Майбутні події' : 'Upcoming', stats.upcomingEvents],
    ['✅', lang === 'uk' ? 'Реєстрації' : 'Registrations', stats.registrations],
    ['💚', lang === 'uk' ? 'Волонтери' : 'Volunteers', stats.volunteers],
    ['✉️', lang === 'uk' ? 'Повідомлення' : 'Messages', stats.messages],
    ['📬', lang === 'uk' ? 'Підписники' : 'Subscribers', stats.subscribers],
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map(([emoji, label, value]) => (
        <Card key={label} className="text-center">
          <p className="text-2xl">{emoji}</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-600 dark:text-blue-400">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </Card>
      ))}
    </div>
  );
}

/* ---------- Події ---------- */
function EventsTab() {
  const { t, lang } = useLang();
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState(null);
  const empty = { title: '', description: '', category: 'workshop', startsAt: '', location: '', capacity: 0 };
  const [form, setForm] = useState(empty);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = () => api('/api/events').then(setEvents);
  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing('new'); setForm(empty); };
  const startEdit = (ev) => {
    setEditing(ev.id);
    setForm({
      title: ev.title, description: ev.description, category: ev.category,
      startsAt: ev.startsAt.slice(0, 16), location: ev.location, capacity: ev.capacity,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const body = { ...form, startsAt: new Date(form.startsAt).toISOString(), capacity: Number(form.capacity) };
    try {
      if (editing === 'new') await api('/api/events', { method: 'POST', body });
      else await api(`/api/events/${editing}`, { method: 'PUT', body });
      setEditing(null);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const remove = async (id) => {
    if (!confirm(lang === 'uk' ? 'Видалити подію?' : 'Delete event?')) return;
    await api(`/api/events/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      {editing === null ? (
        <Btn onClick={startCreate} variant="accent">+ {t('create')}</Btn>
      ) : (
        <Card>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label={t('name')} required value={form.title} onChange={set('title')} />
            <Select label={t('filter.category')} options={Object.entries(eventCats[lang])} value={form.category} onChange={set('category')} />
            <Field label={lang === 'uk' ? 'Дата початку' : 'Starts at'} type="datetime-local" required value={form.startsAt} onChange={set('startsAt')} />
            <Field label={lang === 'uk' ? 'Місце' : 'Location'} value={form.location} onChange={set('location')} />
            <Field label={lang === 'uk' ? 'Місць (0 = без обмежень)' : 'Capacity (0 = unlimited)'} type="number" min="0" value={form.capacity} onChange={set('capacity')} />
            <div className="sm:col-span-2">
              <TextArea label={lang === 'uk' ? 'Опис' : 'Description'} value={form.description} onChange={set('description')} />
            </div>
            {err && <div className="sm:col-span-2"><Alert kind="error">{err}</Alert></div>}
            <div className="flex gap-2 sm:col-span-2">
              <Btn type="submit">{t('save')}</Btn>
              <Btn onClick={() => setEditing(null)} variant="ghost">{t('cancel')}</Btn>
            </div>
          </form>
        </Card>
      )}

      {events.length === 0 ? <Empty>—</Empty> : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ev.title}</p>
                <p className="text-xs text-slate-400">
                  {fmtDate(ev.startsAt, lang)} · {eventCats[lang][ev.category]} · 👥 {ev.registeredCount}/{ev.capacity || '∞'}
                </p>
              </div>
              <div className="flex gap-2">
                <Btn onClick={() => startEdit(ev)} variant="outline" className="!px-3 !py-1 text-xs">{t('edit')}</Btn>
                <Btn onClick={() => remove(ev.id)} variant="danger" className="!px-3 !py-1 text-xs">{t('delete')}</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Новини ---------- */
function NewsTab() {
  const { t, lang } = useLang();
  const [news, setNews] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState(null);
  const empty = { title: '', excerpt: '', content: '', category: 'organization', featured: false, image: null };
  const [form, setForm] = useState(empty);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = () => api('/api/news').then(setNews);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) {
        if (k === 'image') { if (v) fd.append('image', v); }
        else fd.append(k, v);
      }
      if (editing === 'new') await api('/api/news', { method: 'POST', body: fd, isForm: true });
      else {
        if (!form.image) fd.delete('image');
        await api(`/api/news/${editing}`, { method: 'PUT', body: fd, isForm: true });
      }
      setEditing(null);
      setForm(empty);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const remove = async (id) => {
    if (!confirm(lang === 'uk' ? 'Видалити новину?' : 'Delete news?')) return;
    await api(`/api/news/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      {editing === null ? (
        <Btn onClick={() => { setEditing('new'); setForm(empty); }} variant="accent">+ {t('create')}</Btn>
      ) : (
        <Card>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label={t('name')} required value={form.title} onChange={set('title')} />
            <Select label={t('filter.category')} options={Object.entries(newsCats[lang])} value={form.category} onChange={set('category')} />
            <div className="sm:col-span-2">
              <Field label={lang === 'uk' ? 'Короткий опис' : 'Excerpt'} value={form.excerpt} onChange={set('excerpt')} />
            </div>
            <div className="sm:col-span-2">
              <TextArea label={lang === 'uk' ? 'Текст новини' : 'Content'} rows={6} value={form.content} onChange={set('content')} />
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                {lang === 'uk' ? 'Зображення' : 'Image'}
              </span>
              <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              {lang === 'uk' ? 'Популярна' : 'Featured'}
            </label>
            {err && <div className="sm:col-span-2"><Alert kind="error">{err}</Alert></div>}
            <div className="flex gap-2 sm:col-span-2">
              <Btn type="submit">{t('save')}</Btn>
              <Btn onClick={() => setEditing(null)} variant="ghost">{t('cancel')}</Btn>
            </div>
          </form>
        </Card>
      )}

      {news.length === 0 ? <Empty>—</Empty> : (
        <ul className="space-y-2">
          {news.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{n.title}</p>
                <p className="text-xs text-slate-400">{fmtDate(n.createdAt, lang)} · {newsCats[lang][n.category]}</p>
              </div>
              <div className="flex gap-2">
                <Btn
                  onClick={() => {
                    setEditing(n.id);
                    setForm({ title: n.title, excerpt: n.excerpt, content: n.content, category: n.category, featured: n.featured, image: null });
                  }}
                  variant="outline" className="!px-3 !py-1 text-xs"
                >
                  {t('edit')}
                </Btn>
                <Btn onClick={() => remove(n.id)} variant="danger" className="!px-3 !py-1 text-xs">{t('delete')}</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Користувачі ---------- */
function UsersTab() {
  const { t, lang } = useLang();
  const [users, setUsers] = useState([]);
  const load = () => api('/api/admin/users').then(setUsers);
  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    await api(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } });
    load();
  };
  const remove = async (id) => {
    if (!confirm(lang === 'uk' ? 'Видалити користувача?' : 'Delete user?')) return;
    try { await api(`/api/admin/users/${id}`, { method: 'DELETE' }); load(); }
    catch (ex) { alert(ex.message); }
  };

  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{u.name} {u.role === 'admin' ? '⭐' : ''}</p>
            <p className="text-xs text-slate-400">{u.email} · {u.verified ? '✅' : '⏳'}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={u.role}
              onChange={(e) => changeRole(u.id, e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <Btn onClick={() => remove(u.id)} variant="danger" className="!px-3 !py-1 text-xs">{t('delete')}</Btn>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Списки ---------- */
function ListTab({ list }) {
  const { lang } = useLang();
  const [items, setItems] = useState([]);
  useEffect(() => { api(`/api/admin/${list}`).then(setItems); }, [list]);

  const remove = async (id) => {
    await api(`/api/newsletter/${id}`, { method: 'DELETE' });
    setItems(items.filter((i) => i.id !== id));
  };

  if (items.length === 0) return <Empty>—</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
          <p className="font-semibold text-slate-900 dark:text-white">{i.name || i.email} {i.subject ? `— ${i.subject}` : ''}</p>
          <p className="text-xs text-slate-400">{i.email} · {i.phone || ''} · {fmtDate(i.createdAt, lang)}</p>
          {i.message && <p className="mt-1 text-slate-600 dark:text-slate-300">{i.message}</p>}
          {list === 'subscribers' && (
            <Btn onClick={() => remove(i.id)} variant="danger" className="mt-2 !px-3 !py-1 text-xs">✕</Btn>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Головна сторінка адміна ---------- */
export default function Admin() {
  const { lang } = useLang();
  const [tab, setTab] = useState('stats');
  const tabs = [
    ['stats', '📊', lang === 'uk' ? 'Статистика' : 'Stats'],
    ['events', '📅', lang === 'uk' ? 'Події' : 'Events'],
    ['news', '📰', lang === 'uk' ? 'Новини' : 'News'],
    ['users', '👥', lang === 'uk' ? 'Користувачі' : 'Users'],
    ['volunteers', '💚', lang === 'uk' ? 'Волонтери' : 'Volunteers'],
    ['messages', '✉️', lang === 'uk' ? 'Повідомлення' : 'Messages'],
    ['subscribers', '📬', lang === 'uk' ? 'Підписники' : 'Subscribers'],
  ];
  const active = 'border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {lang === 'uk' ? 'Панель адміністратора' : 'Admin panel'}
      </h1>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(([key, emoji, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm transition hover:text-blue-600 ${tab === key ? active : 'text-slate-500 dark:text-slate-400'}`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'stats' && <Stats />}
        {tab === 'events' && <EventsTab />}
        {tab === 'news' && <NewsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'volunteers' && <ListTab list="volunteers" />}
        {tab === 'messages' && <ListTab list="messages" />}
        {tab === 'subscribers' && <ListTab list="subscribers" />}
      </div>
    </div>
  );
}
