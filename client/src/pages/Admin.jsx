import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Field, TextArea, Select, Btn, Alert, Card, Empty, fmtDate, fmtDateTime, Badge, BarChart, Stars } from '../components/ui.jsx';
import { eventCats, newsCats } from '../i18n.js';

/* Завантаження файлу (експорт CSV) з авторизацією */
async function download(path, filename) {
  const res = await fetch(path, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Статистика з графіком ---------- */
function Stats() {
  const { lang } = useLang();
  const [stats, setStats] = useState(null);
  useEffect(() => { api('/api/admin/stats').then(setStats); }, []);
  if (!stats) return <p className="text-slate-400">…</p>;
  const items = [
    ['👥', lang === 'uk' ? 'Усього користувачів' : 'Users', stats.users],
    ['⏳', lang === 'uk' ? 'Очікують верифікації' : 'Pending', stats.pending],
    ['✅', lang === 'uk' ? 'Верифіковані члени' : 'Verified members', stats.verifiedMembers],
    ['🚫', lang === 'uk' ? 'Заблоковані' : 'Blocked', stats.blocked],
    ['📅', lang === 'uk' ? 'Засідання' : 'Meetings', stats.meetings],
    ['🗳️', lang === 'uk' ? 'Голосування' : 'Votes', stats.votes],
    ['📊', lang === 'uk' ? 'Опитування' : 'Surveys', stats.surveys],
    ['💬', lang === 'uk' ? 'Відгуки' : 'Reviews', stats.reviews],
    ['📰', lang === 'uk' ? 'Новини' : 'News', stats.news],
    ['🎪', lang === 'uk' ? 'Події' : 'Events', stats.events],
    ['💚', lang === 'uk' ? 'Волонтери' : 'Volunteers', stats.volunteers],
    ['✉️', lang === 'uk' ? 'Повідомлення' : 'Messages', stats.messages],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map(([emoji, label, value]) => (
          <Card key={label} className="text-center">
            <p className="text-2xl">{emoji}</p>
            <p className="mt-1 text-2xl font-extrabold text-blue-600 dark:text-blue-400">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </Card>
        ))}
      </div>
      {stats.months && (
        <Card>
          <h3 className="mb-3 font-bold text-slate-900 dark:text-white">
            {lang === 'uk' ? 'Нові користувачі за 6 місяців' : 'New users, last 6 months'}
          </h3>
          <BarChart data={stats.months.map((m) => ({ label: m.label, value: m.users }))} />
          <h3 className="mb-3 mt-6 font-bold text-slate-900 dark:text-white">
            {lang === 'uk' ? 'Голосів подано за 6 місяців' : 'Votes cast, last 6 months'}
          </h3>
          <BarChart data={stats.months.map((m) => ({ label: m.label, value: m.votesCast }))} />
        </Card>
      )}
    </div>
  );
}

/* ---------- Верифікація учасників ---------- */
function VerificationTab() {
  const { lang, t } = useLang();
  const [users, setUsers] = useState([]);
  const load = () => api('/api/admin/users').then(setUsers);
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    await api(`/api/admin/users/${id}/status`, { method: 'PUT', body: { status } });
    load();
  };

  const pending = users.filter((u) => u.status === 'pending');
  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <Empty>{lang === 'uk' ? 'Нових реєстрацій немає — усі верифіковані' : 'No pending registrations'}</Empty>
      ) : (
        pending.map((u) => (
          <Card key={u.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{u.name} {u.surname}</p>
                <p className="text-sm text-slate-400">{u.email} · {u.phone || '—'}</p>
                {u.about && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">«{u.about}»</p>}
                <p className="mt-1 text-xs text-slate-400">{lang === 'uk' ? 'Зареєстровано' : 'Registered'}: {fmtDate(u.createdAt, lang)}</p>
              </div>
              <div className="flex gap-2">
                <Btn onClick={() => setStatus(u.id, 'member')} variant="accent">
                  ✅ {lang === 'uk' ? 'Верифікувати' : 'Verify'}
                </Btn>
              </div>
            </div>
          </Card>
        ))
      )}
      <p className="text-sm text-slate-400">
        {lang === 'uk' ? 'Заблокувати або змінити роль можна у вкладці «Користувачі»' : 'Block or change roles in the Users tab'}
      </p>
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
  const setStatus = async (id, body) => {
    await api(`/api/admin/users/${id}/status`, { method: 'PUT', body });
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
            <p className="font-semibold text-slate-900 dark:text-white">
              {u.name} {u.surname} {u.role === 'admin' ? '⭐' : u.role === 'deputy' ? '📌' : ''}{' '}
              {u.status === 'member' ? <Badge color="green">{lang === 'uk' ? 'член' : 'member'}</Badge> : <Badge color="blue">{lang === 'uk' ? 'очікує' : 'pending'}</Badge>}
              {u.blocked && <Badge color="slate">{lang === 'uk' ? 'заблокований' : 'blocked'}</Badge>}
            </p>
            <p className="text-xs text-slate-400">{u.email} · {u.phone || '—'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {u.status !== 'member' && (
              <Btn onClick={() => setStatus(u.id, { status: 'member' })} variant="accent" className="!px-3 !py-1 text-xs">
                ✅
              </Btn>
            )}
            <Btn onClick={() => setStatus(u.id, { blocked: !u.blocked })} variant="outline" className="!px-3 !py-1 text-xs">
              {u.blocked ? '🔓' : '🚫'}
            </Btn>
            <select
              value={u.role}
              onChange={(e) => changeRole(u.id, e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="member">member</option>
              <option value="deputy">deputy</option>
              <option value="admin">admin</option>
            </select>
            <Btn onClick={() => remove(u.id)} variant="danger" className="!px-3 !py-1 text-xs">{t('delete')}</Btn>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Засідання (CRUD + порядок денний) ---------- */
function MeetingsTab() {
  const { t, lang } = useLang();
  const [meetings, setMeetings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState(null);
  const empty = { title: '', startsAt: '', location: '', format: 'очно', description: '', agenda: [] };
  const [form, setForm] = useState(empty);

  const load = () => api('/api/meetings').then(setMeetings);
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setAgenda = (i, k, v) => {
    const agenda = form.agenda.map((a, j) => (j === i ? { ...a, [k]: v } : a));
    setForm({ ...form, agenda });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const body = { ...form, startsAt: new Date(form.startsAt).toISOString() };
    try {
      if (editing === 'new') await api('/api/meetings', { method: 'POST', body });
      else await api(`/api/meetings/${editing}`, { method: 'PUT', body });
      setEditing(null);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const remove = async (id) => {
    if (!confirm(lang === 'uk' ? 'Видалити засідання разом із голосуваннями?' : 'Delete meeting and its votes?')) return;
    await api(`/api/meetings/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      {editing === null ? (
        <Btn onClick={() => { setEditing('new'); setForm(empty); }} variant="accent">+ {t('create')}</Btn>
      ) : (
        <Card>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === 'uk' ? 'Назва' : 'Title'} required value={form.title} onChange={set('title')} />
            <Field label={lang === 'uk' ? 'Дата і час' : 'Date & time'} type="datetime-local" required value={form.startsAt} onChange={set('startsAt')} />
            <Field label={lang === 'uk' ? 'Місце' : 'Location'} value={form.location} onChange={set('location')} />
            <Select label={lang === 'uk' ? 'Формат' : 'Format'}
              options={[['очно', lang === 'uk' ? 'очно' : 'in person'], ['онлайн', lang === 'uk' ? 'онлайн' : 'online'], ['змішаний', lang === 'uk' ? 'змішаний' : 'hybrid']]}
              value={form.format} onChange={set('format')} />
            <div className="sm:col-span-2">
              <TextArea label={lang === 'uk' ? 'Опис' : 'Description'} value={form.description} onChange={set('description')} />
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {lang === 'uk' ? 'Порядок денний' : 'Agenda'}
              </p>
              <div className="space-y-2">
                {form.agenda.map((a, i) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr,auto] dark:border-slate-700">
                    <div className="space-y-2">
                      <Field label={`${lang === 'uk' ? 'Питання' : 'Item'} №${i + 1}`} value={a.title || ''} onChange={(e) => setAgenda(i, 'title', e.target.value)} />
                      <Field label={lang === 'uk' ? 'Опис' : 'Description'} value={a.description || ''} onChange={(e) => setAgenda(i, 'description', e.target.value)} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label={lang === 'uk' ? 'Відповідальний' : 'Responsible'} value={a.responsible || ''} onChange={(e) => setAgenda(i, 'responsible', e.target.value)} />
                        <Select label={lang === 'uk' ? 'Статус' : 'Status'}
                          options={[['очікує', lang === 'uk' ? 'очікує' : 'pending'], ['показується', lang === 'uk' ? 'показується' : 'in progress'], ['закрито', lang === 'uk' ? 'закрито' : 'closed']]}
                          value={a.status || 'очікує'} onChange={(e) => setAgenda(i, 'status', e.target.value)} />
                      </div>
                    </div>
                    <Btn onClick={() => setForm({ ...form, agenda: form.agenda.filter((_, j) => j !== i) })} variant="danger" className="!px-3 self-start">✕</Btn>
                  </div>
                ))}
              </div>
              <Btn onClick={() => setForm({ ...form, agenda: [...form.agenda, { title: '', description: '', responsible: '', status: 'очікує' }] })} variant="outline" className="mt-2">
                + {lang === 'uk' ? 'додати питання' : 'add item'}
              </Btn>
            </div>
            {err && <div className="sm:col-span-2"><Alert kind="error">{err}</Alert></div>}
            <div className="flex gap-2 sm:col-span-2">
              <Btn type="submit">{t('save')}</Btn>
              <Btn onClick={() => setEditing(null)} variant="ghost">{t('cancel')}</Btn>
            </div>
          </form>
        </Card>
      )}

      {meetings.length === 0 ? <Empty>—</Empty> : (
        <ul className="space-y-2">
          {meetings.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{m.title}</p>
                <p className="text-xs text-slate-400">
                  {fmtDateTime(m.startsAt, lang)} · 📋 {m.agenda.length} · 👥 {m.counts.yes}
                </p>
              </div>
              <div className="flex gap-2">
                <Btn
                  onClick={() => {
                    setEditing(m.id);
                    setForm({
                      title: m.title,
                      startsAt: m.startsAt.slice(0, 16),
                      location: m.location,
                      format: m.format,
                      description: m.description,
                      agenda: m.agenda.map((a) => ({ title: a.title, description: a.description, responsible: a.responsible, status: a.status })),
                    });
                  }}
                  variant="outline" className="!px-3 !py-1 text-xs"
                >
                  {t('edit')}
                </Btn>
                <Btn onClick={() => remove(m.id)} variant="danger" className="!px-3 !py-1 text-xs">{t('delete')}</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Голосування ---------- */
function VotesTab() {
  const { t, lang } = useLang();
  const [votes, setVotes] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState(null);
  const empty = { title: '', question: '', meetingId: '' };
  const [form, setForm] = useState(empty);

  const load = () => api('/api/votes').then(setVotes);
  useEffect(() => {
    load();
    api('/api/meetings').then(setMeetings);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      await api('/api/votes', { method: 'POST', body: form });
      setEditing(null);
      setForm(empty);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const setStatus = async (id, status) => {
    await api(`/api/votes/${id}/status`, { method: 'PUT', body: { status } });
    load();
  };
  const remove = async (id) => {
    if (!confirm(lang === 'uk' ? 'Видалити голосування?' : 'Delete vote?')) return;
    await api(`/api/votes/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      {editing === null ? (
        <Btn onClick={() => { setEditing('new'); setForm(empty); }} variant="accent">+ {t('create')}</Btn>
      ) : (
        <Card>
          <form onSubmit={submit} className="space-y-3">
            <Field label={lang === 'uk' ? 'Назва' : 'Title'} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextArea label={lang === 'uk' ? 'Питання («Чи підтримуєте Ви…»)' : 'Question'} required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            <Select label={lang === 'uk' ? 'Засідання' : 'Meeting'}
              options={[['', '—'], ...meetings.map((m) => [m.id, m.title])]}
              value={form.meetingId} onChange={(e) => setForm({ ...form, meetingId: e.target.value })} />
            <p className="text-xs text-slate-400">
              {lang === 'uk' ? 'Варіанти: ЗА / ПРОТИ / УТРИМАВСЯ (стандартні)' : 'Options: FOR / AGAINST / ABSTAIN (standard)'}
            </p>
            {err && <Alert kind="error">{err}</Alert>}
            <div className="flex gap-2">
              <Btn type="submit">{t('create')}</Btn>
              <Btn onClick={() => setEditing(null)} variant="ghost">{t('cancel')}</Btn>
            </div>
          </form>
        </Card>
      )}

      {votes.length === 0 ? <Empty>—</Empty> : (
        <ul className="space-y-3">
          {votes.map((v) => (
            <li key={v.id} className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{v.title}</p>
                  <p className="text-xs text-slate-400">{v.question}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {v.meetingTitle && <>🗓️ {v.meetingTitle} · </>}🗳️ {v.ballotsCount}/{v.results.membersCount}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {v.status === 'draft' && (
                    <Btn onClick={() => setStatus(v.id, 'open')} variant="accent" className="!px-3 !py-1 text-xs">
                      ▶ {lang === 'uk' ? 'Розпочати' : 'Open'}
                    </Btn>
                  )}
                  {v.status === 'open' && (
                    <Btn onClick={() => setStatus(v.id, 'closed')} variant="danger" className="!px-3 !py-1 text-xs">
                      ⏹ {lang === 'uk' ? 'Завершити' : 'Close'}
                    </Btn>
                  )}
                  <Btn onClick={() => download(`/api/admin/export/votes/${v.id}`, `vote-${v.id}.csv`)} variant="outline" className="!px-3 !py-1 text-xs">
                    ⬇ CSV
                  </Btn>
                  <Btn onClick={() => remove(v.id)} variant="ghost" className="!px-3 !py-1 text-xs">🗑</Btn>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {v.status === 'open' && <Badge color="green">{lang === 'uk' ? 'ідеться голосування' : 'voting open'}</Badge>}
                {v.status === 'closed' && <Badge color="slate">{lang === 'uk' ? 'завершено' : 'closed'}</Badge>}
                {v.status === 'draft' && <Badge color="blue">{lang === 'uk' ? 'чернетка' : 'draft'}</Badge>}
                {Object.entries(v.results.counts).map(([opt, n]) => (
                  <span key={opt} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold dark:bg-slate-700">{opt}: {n}</span>
                ))}
                <span className="text-xs text-slate-400">
                  {lang === 'uk' ? 'не проголосували' : 'not voted'}: {v.results.notVoted}
                </span>
              </div>
              {v.results.named && v.results.named.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {lang === 'uk' ? 'Поіменний список' : 'Named list'}
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {v.results.named.map((b, i) => (
                      <li key={i} className="flex justify-between border-b border-slate-100 pb-1 dark:border-slate-700">
                        <span>{b.name}</span>
                        <b className={b.option === 'ЗА' ? 'text-emerald-500' : b.option === 'ПРОТИ' ? 'text-red-500' : 'text-amber-500'}>{b.option}</b>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Опитування ---------- */
function SurveysTab() {
  const { t, lang } = useLang();
  const [surveys, setSurveys] = useState([]);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState(null);
  const empty = { title: '', question: '', options: '' };
  const [form, setForm] = useState(empty);

  const load = () => api('/api/surveys').then(setSurveys);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const options = form.options.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await api('/api/surveys', { method: 'POST', body: { ...form, options } });
      setEditing(false);
      setForm(empty);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const remove = async (id) => {
    if (!confirm(lang === 'uk' ? 'Видалити опитування?' : 'Delete survey?')) return;
    await api(`/api/surveys/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      {!editing ? (
        <Btn onClick={() => setEditing(true)} variant="accent">+ {t('create')}</Btn>
      ) : (
        <Card>
          <form onSubmit={submit} className="space-y-3">
            <Field label={lang === 'uk' ? 'Назва' : 'Title'} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Field label={lang === 'uk' ? 'Питання' : 'Question'} required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            <Field label={lang === 'uk' ? 'Варіанти (через кому)' : 'Options (comma-separated)'} required value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder={lang === 'uk' ? 'Так, Ні, Важко відповісти' : 'Yes, No, Hard to say'} />
            {err && <Alert kind="error">{err}</Alert>}
            <div className="flex gap-2">
              <Btn type="submit">{t('create')}</Btn>
              <Btn onClick={() => setEditing(false)} variant="ghost">{t('cancel')}</Btn>
            </div>
          </form>
        </Card>
      )}

      {surveys.length === 0 ? <Empty>—</Empty> : (
        <ul className="space-y-3">
          {surveys.map((s) => (
            <li key={s.id} className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{s.title}</p>
                  <p className="text-xs text-slate-400">{s.question}</p>
                </div>
                <div className="flex gap-2">
                  <Btn onClick={() => download(`/api/admin/export/surveys/${s.id}`, `survey-${s.id}.csv`)} variant="outline" className="!px-3 !py-1 text-xs">⬇ CSV</Btn>
                  <Btn onClick={() => remove(s.id)} variant="ghost" className="!px-3 !py-1 text-xs">🗑</Btn>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {s.options.map((opt, i) => {
                  const total = s.results.total;
                  const pct = total ? Math.round((s.results.counts[i] / total) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="w-32 shrink-0 truncate text-slate-600 dark:text-slate-300">{opt}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 shrink-0 text-right font-bold text-slate-500">{pct}% ({s.results.counts[i]})</span>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Відгуки ---------- */
function ReviewsTab() {
  const { lang } = useLang();
  const [reviews, setReviews] = useState([]);
  useEffect(() => { api('/api/admin/reviews').then(setReviews); }, []);
  if (reviews.length === 0) return <Empty>{lang === 'uk' ? 'Відгуків поки немає' : 'No reviews yet'}</Empty>;
  return (
    <ul className="space-y-2">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900 dark:text-white">
              {lang === 'uk' ? 'Про' : 'About'}: {r.aboutName}
            </p>
            <Stars value={r.rating} />
          </div>
          <p className="mt-1 text-xs text-slate-400">{r.fromName} · {fmtDate(r.createdAt, lang)}</p>
          {r.text && <p className="mt-1 text-slate-600 dark:text-slate-300">{r.text}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Журнал дій ---------- */
function AuditTab() {
  const { lang } = useLang();
  const [logs, setLogs] = useState(null);
  useEffect(() => { api('/api/admin/audit').then(setLogs); }, []);
  if (!logs) return <p className="text-slate-400">…</p>;
  if (logs.length === 0) return <Empty>{lang === 'uk' ? 'Журнал порожній' : 'Audit log is empty'}</Empty>;
  return (
    <ul className="space-y-2">
      {logs.map((l) => (
        <li key={l.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
          <p className="text-slate-800 dark:text-slate-100">
            <b>{l.actorName}</b> — {l.action}
          </p>
          <p className="text-xs text-slate-400">{fmtDateTime(l.createdAt, lang)}</p>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Події (існуюча) ---------- */
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
        <Btn onClick={() => { setEditing('new'); setForm(empty); }} variant="accent">+ {t('create')}</Btn>
      ) : (
        <Card>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === 'uk' ? 'Назва' : 'Title'} required value={form.title} onChange={set('title')} />
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
                <Btn onClick={() => { setEditing(ev.id); setForm({ title: ev.title, description: ev.description, category: ev.category, startsAt: ev.startsAt.slice(0, 16), location: ev.location, capacity: ev.capacity }); }}
                  variant="outline" className="!px-3 !py-1 text-xs">{t('edit')}</Btn>
                <Btn onClick={() => remove(ev.id)} variant="danger" className="!px-3 !py-1 text-xs">{t('delete')}</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Новини (існуюча) ---------- */
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
            <Field label={lang === 'uk' ? 'Заголовок' : 'Title'} required value={form.title} onChange={set('title')} />
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
                <Btn onClick={() => { setEditing(n.id); setForm({ title: n.title, excerpt: n.excerpt, content: n.content, category: n.category, featured: n.featured, image: null }); }}
                  variant="outline" className="!px-3 !py-1 text-xs">{t('edit')}</Btn>
                <Btn onClick={() => remove(n.id)} variant="danger" className="!px-3 !py-1 text-xs">{t('delete')}</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Загальні списки ---------- */
function ListTab({ list }) {
  const { lang, t } = useLang();
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
  const tabs = lang === 'uk'
    ? [
        ['stats', '📊 Статистика'],
        ['verification', '⏳ Верифікація'],
        ['users', '👥 Користувачі'],
        ['meetings', '🗓️ Засідання'],
        ['votes', '🗳️ Голосування'],
        ['surveys', '📊 Опитування'],
        ['news', '📰 Новини'],
        ['events', '🎪 Події'],
        ['reviews', '💬 Відгуки'],
        ['volunteers', '💚 Волонтери'],
        ['messages', '✉️ Повідомлення'],
        ['subscribers', '📬 Підписники'],
        ['audit', '📜 Журнал дій'],
      ]
    : [
        ['stats', '📊 Stats'],
        ['verification', '⏳ Verification'],
        ['users', '👥 Users'],
        ['meetings', '🗓️ Meetings'],
        ['votes', '🗳️ Votes'],
        ['surveys', '📊 Surveys'],
        ['news', '📰 News'],
        ['events', '🎪 Events'],
        ['reviews', '💬 Reviews'],
        ['volunteers', '💚 Volunteers'],
        ['messages', '✉️ Messages'],
        ['subscribers', '📬 Subscribers'],
        ['audit', '📜 Audit log'],
      ];
  const active = 'border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {lang === 'uk' ? 'Панель адміністратора' : 'Admin panel'}
        </h1>
        <Btn onClick={() => download('/api/admin/export/users', 'members.csv')} variant="outline" className="text-xs">
          ⬇ {lang === 'uk' ? 'Експорт членів (CSV)' : 'Export members (CSV)'}
        </Btn>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm transition hover:text-blue-600 sm:px-4 ${tab === key ? active : 'text-slate-500 dark:text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'stats' && <Stats />}
        {tab === 'verification' && <VerificationTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'meetings' && <MeetingsTab />}
        {tab === 'votes' && <VotesTab />}
        {tab === 'surveys' && <SurveysTab />}
        {tab === 'news' && <NewsTab />}
        {tab === 'events' && <EventsTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'volunteers' && <ListTab list="volunteers" />}
        {tab === 'messages' && <ListTab list="messages" />}
        {tab === 'subscribers' && <ListTab list="subscribers" />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
