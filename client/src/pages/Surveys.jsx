import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Card, Alert, Empty, Btn, fmtDate } from '../components/ui.jsx';

export default function Surveys() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [surveys, setSurveys] = useState(null);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => api('/api/surveys').then(setSurveys).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const respond = async (id, optionIndex) => {
    setErr(null); setMsg(null);
    try {
      const res = await api(`/api/surveys/${id}/respond`, { method: 'POST', body: { optionIndex } });
      setMsg(res.message);
      load();
    } catch (e) { setErr(e.message); }
  };

  if (!surveys) return <div className="py-16 text-center text-slate-400">…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('nav.surveys')}</h1>
      {user?.status !== 'member' && (
        <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-slate-800 dark:text-blue-300">
          {lang === 'uk'
            ? 'Опитування доступні верифікованим членам організації.'
            : 'Surveys are available to verified organization members.'}
        </p>
      )}
      {msg && <div className="mt-3"><Alert kind="success">{msg}</Alert></div>}
      {err && <div className="mt-3"><Alert kind="error">{err}</Alert></div>}

      {surveys.length === 0 ? (
        <div className="mt-6"><Empty>{lang === 'uk' ? 'Опитувань поки немає' : 'No surveys yet'}</Empty></div>
      ) : (
        <div className="mt-6 space-y-4">
          {surveys.map((s) => {
            const total = s.results.total;
            const answered = s.myResponse !== null;
            const canSeeResults = answered || ['admin', 'deputy'].includes(user?.role);
            return (
              <Card key={s.id}>
                <h2 className="font-bold text-slate-900 dark:text-white">{s.title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.question}</p>
                <p className="mt-1 text-xs text-slate-400">{fmtDate(s.createdAt, lang)}</p>

                {!answered ? (
                  <div className="mt-4 space-y-2">
                    {s.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => respond(s.id, i)}
                        disabled={user?.status !== 'member'}
                        className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Alert kind="success">
                    {lang === 'uk' ? 'Ви відповіли' : 'You answered'}: <b>{s.options[s.myResponse]}</b>
                  </Alert>
                )}

                {canSeeResults && (
                  <div className="mt-4 space-y-2">
                    {s.options.map((opt, i) => {
                      const pct = total ? Math.round((s.results.counts[i] / total) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-32 shrink-0 truncate text-slate-600 dark:text-slate-300">{opt}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div className="bar-grow h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-14 shrink-0 text-right text-xs font-bold text-slate-500">
                            {pct}% ({s.results.counts[i]})
                          </span>
                        </div>
                      );
                    })}
                    <p className="text-xs text-slate-400">
                      {lang === 'uk' ? 'Усього відповідей' : 'Total answers'}: {total}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {['admin', 'deputy'].includes(user?.role) && (
        <p className="mt-6 text-sm text-slate-400">
          {lang === 'uk' ? 'Створити опитування можна в панелі адміністратора.' : 'Create surveys from the admin panel.'}{' '}
          <Btn to="/admin" variant="ghost">{t('nav.admin')} →</Btn>
        </p>
      )}
    </div>
  );
}
