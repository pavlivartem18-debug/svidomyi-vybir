import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imgUrl } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Field, TextArea, Btn, Alert, Card, fmtDateTime, Empty, Badge, Tabs, Stars } from '../components/ui.jsx';
import { interestCats } from '../i18n.js';

/* ---------- Огляд ---------- */
function Overview() {
  const { user, updateProfile } = useAuth();
  const { lang, t } = useLang();
  const [rating, setRating] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    api('/api/me/rating').then(setRating).catch(() => {});
    api('/api/meetings').then(setMeetings).catch(() => {});
    api('/api/votes').then(setVotes).catch(() => {});
  }, []);

  const upcoming = meetings.filter((m) => m.startsAt >= new Date().toISOString());
  const activeVote = votes.find((v) => v.status === 'open');
  const myVoteHistory = votes.filter((v) => v.myVote);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {lang === 'uk' ? 'Рейтинг активності' : 'Activity rating'}
          </p>
          <p className="mt-1 text-4xl font-extrabold text-blue-600 dark:text-blue-400">
            {rating ? rating.rating : '…'}<span className="text-lg text-slate-400">/100</span>
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {lang === 'uk' ? 'Статус' : 'Status'}
          </p>
          <p className="mt-2">
            {user.status === 'member'
              ? <Badge color="green">{lang === 'uk' ? '✅ Верифікований член' : '✅ Verified member'}</Badge>
              : <Badge color="blue">{lang === 'uk' ? '⏳ Очікує верифікації' : '⏳ Pending verification'}</Badge>}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {lang === 'uk' ? 'Мої голоси' : 'My votes'}
          </p>
          <p className="mt-1 text-4xl font-extrabold text-emerald-500">{myVoteHistory.length}</p>
        </Card>
      </div>

      {activeVote && (
        <Card className="border-l-4 !border-l-red-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-red-500">🔴 {lang === 'uk' ? 'АКТИВНЕ ГОЛОСУВАННЯ' : 'ACTIVE VOTE'}</p>
            {activeVote.myVote
              ? <Badge color="green">{lang === 'uk' ? 'Ви проголосували' : 'You voted'}: {activeVote.myVote}</Badge>
              : <Badge color="blue">{lang === 'uk' ? 'Ви ще не голосували' : 'Not voted yet'}</Badge>}
          </div>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">{activeVote.title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{activeVote.question}</p>
          <Btn to={`/votes/${activeVote.id}`} variant="accent" className="mt-3">
            {lang === 'uk' ? 'Перейти до голосування' : 'Go to voting'} →
          </Btn>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-bold text-slate-900 dark:text-white">
            {lang === 'uk' ? 'Найближчі засідання' : 'Upcoming meetings'}
          </h3>
          {upcoming.length === 0 ? (
            <Empty>{lang === 'uk' ? 'Запланованих засідань немає' : 'No upcoming meetings'}</Empty>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 3).map((m) => (
                <li key={m.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <Link to={`/meetings/${m.id}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                    {m.title}
                  </Link>
                  <p className="text-xs text-slate-400">🕒 {fmtDateTime(m.startsAt, lang)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-bold text-slate-900 dark:text-white">
            {lang === 'uk' ? 'Моя активність' : 'My activity'}
          </h3>
          {rating ? (
            <div className="space-y-3">
              {[
                [lang === 'uk' ? 'Участь у засіданнях' : 'Meetings', rating.details.meetings],
                [lang === 'uk' ? 'Участь у голосуваннях' : 'Voting', rating.details.votes],
                [lang === 'uk' ? 'Участь в опитуваннях' : 'Surveys', rating.details.surveys],
              ].map(([label, d]) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-500">{d.pct}% ({d.mine}/{d.total})</span>
                </div>
              ))}
              {rating.details.avgReview && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {lang === 'uk' ? 'Середня оцінка відгуків' : 'Average review score'}:{' '}
                  <Stars value={Math.round(Number(rating.details.avgReview))} /> ({rating.details.avgReview}/5)
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-400">…</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------- Профіль ---------- */
function Profile() {
  const { user, applyUser } = useAuth();
  const { lang, t } = useLang();
  const [form, setForm] = useState({
    name: user.name, surname: user.surname || '', phone: user.phone || '', about: user.about || '', birthday: user.birthday || '',
  });
  const [interests, setInterests] = useState(user.interests || []);
  const [avatar, setAvatar] = useState(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (key) => setInterests((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) fd.append(k, v);
      fd.append('interests', JSON.stringify(interests));
      if (pw.newPassword) {
        fd.append('currentPassword', pw.currentPassword);
        fd.append('newPassword', pw.newPassword);
      }
      if (avatar) fd.append('avatar', avatar);
      const updated = await api('/api/auth/me', { method: 'PUT', body: fd, isForm: true });
      applyUser(updated);
      setPw({ currentPassword: '', newPassword: '' });
      setMsg(lang === 'uk' ? 'Профіль оновлено' : 'Profile updated');
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img src={imgUrl(user.avatar)} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl dark:bg-slate-700">
              {user.name?.[0] || '👤'}
            </div>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
              {lang === 'uk' ? 'Нова фотографія' : 'New photo'}
            </span>
            <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('name')} value={form.name} onChange={set('name')} />
          <Field label={lang === 'uk' ? 'Прізвище' : 'Surname'} value={form.surname} onChange={set('surname')} />
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{t('email')}</span>
          <input disabled value={user.email}
            className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400 dark:border-slate-700 dark:bg-slate-900" />
        </label>
        <Field label={t('phone')} value={form.phone} onChange={set('phone')} />
        <Field
          label={lang === 'uk' ? 'Дата народження (для вітань 🎂)' : 'Birthday (for greetings 🎂)'}
          type="date"
          value={form.birthday}
          onChange={set('birthday')}
        />
        <TextArea label={lang === 'uk' ? 'Про себе' : 'About me'} value={form.about} onChange={set('about')} />

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('interests')}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(interestCats[lang]).map(([key, label]) => (
              <button type="button" key={key} onClick={() => toggle(key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  interests.includes(key) ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <summary className="cursor-pointer text-sm font-medium">
            {lang === 'uk' ? 'Змінити пароль' : 'Change password'}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label={lang === 'uk' ? 'Поточний пароль' : 'Current password'} type="password"
              value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            <Field label={lang === 'uk' ? 'Новий пароль' : 'New password'} type="password" minLength={8}
              value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </div>
        </details>

        {msg && <Alert kind="success">{msg}</Alert>}
        {err && <Alert kind="error">{err}</Alert>}
        <Btn type="submit">{t('save')}</Btn>
      </form>
    </Card>
  );
}

/* ---------- Мої голосування ---------- */
function MyVotes() {
  const { lang } = useLang();
  const [votes, setVotes] = useState(null);
  useEffect(() => { api('/api/votes').then(setVotes).catch(() => {}); }, []);
  if (!votes) return <p className="text-slate-400">…</p>;
  const mine = votes.filter((v) => v.myVote);
  if (mine.length === 0)
    return <Empty>{lang === 'uk' ? 'Ви ще не голосували' : 'You have not voted yet'}</Empty>;
  return (
    <ul className="space-y-2">
      {mine.map((v) => (
        <li key={v.id} className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 dark:text-white">{v.title}</p>
            <b className={v.myVote === 'ЗА' ? 'text-emerald-500' : v.myVote === 'ПРОТИ' ? 'text-red-500' : 'text-amber-500'}>
              {v.myVote}
            </b>
          </div>
          <p className="mt-1 text-xs text-slate-400">{v.question}</p>
          <p className="mt-1 text-xs text-slate-400">
            {v.meetingTitle && <>🗓️ {v.meetingTitle} · </>}
            {lang === 'uk' ? 'статус' : 'status'}: {v.status === 'open' ? (lang === 'uk' ? 'іде голосування' : 'open') : v.status === 'closed' ? (lang === 'uk' ? 'завершено' : 'closed') : v.status}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Відгуки ---------- */
function Reviews() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [received, setReceived] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ aboutUserId: '', rating: 5, text: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => api(`/api/reviews/about/${user.id}`).then(setReceived).catch(() => {});
  useEffect(() => {
    load();
    api('/api/members').then(setMembers).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const res = await api('/api/reviews', { method: 'POST', body: form });
      setMsg(res.message);
      setForm({ aboutUserId: '', rating: 5, text: '' });
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const canReview = user.status === 'member';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 font-bold text-slate-900 dark:text-white">
          {lang === 'uk' ? 'Відгуки про мене' : 'Reviews about me'}
        </h3>
        {!received ? (
          <p className="text-slate-400">…</p>
        ) : received.length === 0 ? (
          <Empty>{lang === 'uk' ? 'Відгуків поки немає' : 'No reviews yet'}</Empty>
        ) : (
          <ul className="space-y-3">
            {received.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{r.fromName}</span>
                  <Stars value={r.rating} />
                </div>
                {r.text && <p className="mt-1 text-slate-500 dark:text-slate-400">{r.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 font-bold text-slate-900 dark:text-white">
          {lang === 'uk' ? 'Залишити відгук' : 'Leave a review'}
        </h3>
        {!canReview ? (
          <p className="text-sm text-slate-400">
            {lang === 'uk' ? 'Доступно верифікованим членам організації' : 'Available to verified members'}
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                {lang === 'uk' ? 'Про кого' : 'About whom'}
              </span>
              <select required value={form.aboutUserId}
                onChange={(e) => setForm({ ...form, aboutUserId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                <option value="">— {lang === 'uk' ? 'оберіть учасника' : 'choose a member'} —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} {m.surname}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                {lang === 'uk' ? 'Оцінка' : 'Rating'}
              </span>
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
              </select>
            </label>
            <TextArea label={lang === 'uk' ? 'Текст відгуку' : 'Review text'} value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })} />
            {msg && <Alert kind="success">{msg}</Alert>}
            {err && <Alert kind="error">{err}</Alert>}
            <Btn type="submit" variant="accent">{lang === 'uk' ? 'Надіслати відгук' : 'Submit review'}</Btn>
          </form>
        )}
      </Card>
    </div>
  );
}

/* ---------- Досягнення та квест ---------- */
function Achievements() {
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [tg, setTg] = useState(null);
  const [pushOn, setPushOn] = useState(Notification?.permission === 'granted');

  useEffect(() => {
    api('/api/me/achievements').then(setData).catch(() => {});
    api('/me/telegram-link').then(setTg).catch(() => {});
  }, []);

  const enablePush = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      const { publicKey } = await api('/api/push/key');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      await api('/api/push/subscribe', { method: 'POST', body: sub.toJSON() });
      setPushOn(true);
    } catch { /* браузер може не підтримувати */ }
  };

  if (!data) return <p className="text-slate-400">…</p>;

  return (
    <div className="space-y-6">
      {tg?.botName && (
        <Card>
          <h3 className="font-bold text-slate-900 dark:text-white">🔔 {lang === 'uk' ? 'Сповіщення' : 'Notifications'}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {lang === 'uk' ? 'Обирайте, як отримувати сповіщення організації:' : 'Choose how to receive notifications:'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={`https://t.me/${tg.botName}?start=${tg.code}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
            >
              ✈️ Telegram
            </a>
            {!pushOn ? (
              <button onClick={enablePush} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                📱 {lang === 'uk' ? 'Push на телефон' : 'Phone push'}
              </button>
            ) : (
              <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 dark:bg-slate-700 dark:text-emerald-300">
                ✅ Push {lang === 'uk' ? 'увімкнено' : 'enabled'}
              </span>
            )}
          </div>
        </Card>
      )}

      {!data.quest.done && (
        <Card className="border-l-4 !border-l-amber-400">
          <h3 className="font-bold text-amber-500">
            🚀 {lang === 'uk' ? 'Квест новачка: стань частиною команди!' : 'Newcomer quest'}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.quest.steps.map((s, i) => (
              <li key={i} className={s.done ? 'text-emerald-500 line-through' : 'text-slate-600 dark:text-slate-300'}>
                {s.done ? '✅' : '⬜'} {s.title}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">
          🏆 {lang === 'uk' ? 'Досягнення' : 'Achievements'}
        </h3>
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {data.unlocked}/{data.total}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.achievements.map((a) => (
          <div
            key={a.code}
            className={`rounded-xl border p-4 text-center transition ${
              a.done
                ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-slate-800'
                : 'border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <p className={`text-3xl ${a.done ? '' : 'grayscale'}`}>{a.icon}</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{a.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
            {a.progress && !a.done && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${(a.progress[0] / a.progress[1]) * 100}%` }} />
              </div>
            )}
            {a.done && <p className="mt-1 text-[10px] font-bold uppercase text-amber-500">✓ {lang === 'uk' ? 'отримано' : 'unlocked'}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Головна сторінка кабінету ---------- */
export default function Dashboard() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [tab, setTab] = useState('overview');

  const tabs = lang === 'uk'
    ? [['overview', '📋 Огляд'], ['profile', '👤 Профіль'], ['achievements', '🏆 Досягнення'], ['meetings', '🗓️ Засідання'], ['votes', '🗳️ Голосування'], ['events', '🎪 Події'], ['reviews', '💬 Відгуки']]
    : [['overview', '📋 Overview'], ['profile', '👤 Profile'], ['achievements', '🏆 Achievements'], ['meetings', '🗓️ Meetings'], ['votes', '🗳️ Votes'], ['events', '🎪 Events'], ['reviews', '💬 Reviews']];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {lang === 'uk' ? 'Вітаємо' : 'Welcome'}, {user.name}!{' '}
        <Badge color={user.role === 'admin' ? 'green' : 'blue'}>{user.role}</Badge>
      </h1>
      <div className="mt-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
        {tab === 'overview' && <Overview />}
        {tab === 'profile' && <Profile />}
        {tab === 'achievements' && <Achievements />}
        {tab === 'meetings' && <MeetingsEmbed />}
        {tab === 'votes' && <MyVotes />}
        {tab === 'events' && <MyEvents />}
        {tab === 'reviews' && <Reviews />}
      </div>
    </div>
  );
}

/* Вкладка засідань усередині кабінету — легкий список з моєю відповіддю */
function MeetingsEmbed() {
  const { lang } = useLang();
  const [meetings, setMeetings] = useState(null);
  useEffect(() => { api('/api/meetings').then(setMeetings).catch(() => {}); }, []);
  if (!meetings) return <p className="text-slate-400">…</p>;
  if (meetings.length === 0) return <Empty>{lang === 'uk' ? 'Засідань поки немає' : 'No meetings yet'}</Empty>;
  const labels = { yes: '✅', maybe: '🤔', no: '❌', null: '—' };
  return (
    <ul className="space-y-2">
      {meetings.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
          <div>
            <Link to={`/meetings/${m.id}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              {m.title}
            </Link>
            <p className="text-xs text-slate-400">🕒 {fmtDateTime(m.startsAt, lang)}</p>
          </div>
          <span className="text-lg">{labels[m.myRsvp]}</span>
        </li>
      ))}
    </ul>
  );
}

/* Вкладка публічних подій — мої реєстрації + скасування */
function MyEvents() {
  const { lang, t } = useLang();
  const [dash, setDash] = useState(null);
  const load = () => api('/api/dashboard').then(setDash).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!dash) return <p className="text-slate-400">…</p>;
  if (dash.registrations.length === 0)
    return (
      <div>
        <Empty>{lang === 'uk' ? 'Ви ще не зареєструвалися на події' : 'No event registrations yet'}</Empty>
        <Btn to="/events" variant="accent" className="mt-3">{lang === 'uk' ? 'Знайти подію' : 'Find an event'} →</Btn>
      </div>
    );
  return (
    <ul className="space-y-2">
      {dash.registrations.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
          <div>
            <Link to={`/events/${r.event.id}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              {r.event.title}
            </Link>
            <p className="text-xs text-slate-400">🕒 {fmtDateTime(r.event.startsAt, lang)}</p>
          </div>
          <Btn
            onClick={async () => { await api(`/api/events/${r.eventId}/register`, { method: 'DELETE' }); load(); }}
            variant="danger" className="!px-3 !py-1 text-xs"
          >
            {t('cancelRegistration')}
          </Btn>
        </li>
      ))}
    </ul>
  );
}
