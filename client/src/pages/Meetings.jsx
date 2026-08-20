import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Empty, fmtDateTime } from '../components/ui.jsx';

const rsvpLabels = {
  uk: { yes: 'Беру участь', no: 'Не беру участі', maybe: 'Ще не визначився' },
  en: { yes: 'Going', no: 'Not going', maybe: 'Maybe' },
};

export default function Meetings() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [meetings, setMeetings] = useState(null);
  const [openVotes, setOpenVotes] = useState([]);
  const [err, setErr] = useState(null);

  const load = () => api('/api/meetings').then(setMeetings).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    api('/api/votes').then((vs) => setOpenVotes(vs.filter((v) => v.status === 'open'))).catch(() => {});
  }, []);

  const rsvp = async (id, answer) => {
    setErr(null);
    try {
      await api(`/api/meetings/${id}/rsvp`, { method: 'POST', body: { answer } });
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (!meetings) return <div className="py-16 text-center text-slate-400">…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('nav.meetings')}</h1>
      {user?.status !== 'member' && (
        <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-slate-800 dark:text-blue-300">
          {lang === 'uk'
            ? 'Перегляд відкритий для всіх. Підтвердити участь можуть верифіковані члени організації.'
            : 'Viewing is open to everyone. Only verified members can confirm attendance.'}
        </p>
      )}
      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}

      {openVotes.length > 0 && (
        <div className="mt-6 space-y-3">
          {openVotes.map((v) => (
            <div key={v.id} className="rounded-xl border-l-4 border-red-500 bg-white p-4 shadow-sm dark:bg-slate-800">
              <p className="font-bold text-red-500">🔴 {lang === 'uk' ? 'ІДЕТЬ ГОЛОСУВАННЯ' : 'VOTING OPEN'}</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{v.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{v.question}</p>
              <div className="mt-2 flex items-center gap-3">
                <Link to={`/votes/${v.id}`} className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  {lang === 'uk' ? 'Перейти до голосування' : 'Go to voting'} →
                </Link>
                {v.myVote && (
                  <span className="text-xs font-bold text-emerald-500">
                    {lang === 'uk' ? 'ви проголосували' : 'you voted'}: {v.myVote}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {meetings.length === 0 ? (
        <div className="mt-6"><Empty>{lang === 'uk' ? 'Засідань поки немає' : 'No meetings yet'}</Empty></div>
      ) : (
        <div className="mt-6 space-y-4">
          {meetings.map((m) => (
            <article key={m.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    <Link to={`/meetings/${m.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                      {m.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    🕒 {fmtDateTime(m.startsAt, lang)} · 📍 {m.location || '—'} · {m.format}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{m.description}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    👥 {rsvpLabels[lang].yes}: {m.counts.yes} · {rsvpLabels[lang].no}: {m.counts.no} · {rsvpLabels[lang].maybe}: {m.counts.maybe}
                    {m.votesCount > 0 ? ` · 🗳️ ${m.votesCount}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {['yes', 'maybe', 'no'].map((a) => (
                  <button
                    key={a}
                    onClick={() => rsvp(m.id, a)}
                    disabled={user?.status !== 'member'}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                      m.myRsvp === a
                        ? a === 'yes'
                          ? 'bg-emerald-500 text-white'
                          : a === 'no'
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-white'
                        : 'border border-slate-300 text-slate-600 hover:border-blue-400 dark:border-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {rsvpLabels[lang][a]}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
