import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Btn, Alert, Card, Badge } from '../components/ui.jsx';

export default function VoteDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [v, setV] = useState(null);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => api('/api/votes/' + id).then(setV).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  if (err) return <div className="mx-auto max-w-3xl px-4 py-10"><Alert kind="error">{err}</Alert></div>;
  if (!v) return <div className="py-16 text-center text-slate-400">…</div>;

  const cast = async (option) => {
    setErr(null); setMsg(null);
    try {
      const res = await api(`/api/votes/${v.id}/cast`, { method: 'POST', body: { option } });
      setMsg(res.message);
      load();
    } catch (e) { setErr(e.message); }
  };

  const btnColor = (opt) =>
    opt === 'ЗА' ? 'bg-emerald-500 hover:bg-emerald-600'
      : opt === 'ПРОТИ' ? 'bg-red-500 hover:bg-red-600'
      : 'bg-amber-500 hover:bg-amber-600';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Btn to={v.meetingId ? `/meetings/${v.meetingId}` : '/meetings'} variant="ghost" className="mb-4">
        ← {v.meetingTitle || t('nav.meetings')}
      </Btn>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{v.title}</h1>
          {v.status === 'open' && <Badge color="green">🔴 {lang === 'uk' ? 'ЙДЕТЬ ГОЛОСУВАННЯ' : 'VOTING OPEN'}</Badge>}
          {v.status === 'closed' && <Badge color="slate">{lang === 'uk' ? 'Завершено' : 'Closed'}</Badge>}
          {v.status === 'draft' && <Badge color="blue">{lang === 'uk' ? 'Підготовка' : 'Draft'}</Badge>}
        </div>
        <p className="mt-3 text-lg text-slate-700 dark:text-slate-200">{v.question}</p>

        {v.status === 'open' && !v.myVote && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['ЗА', 'ПРОТИ', 'УТРИМАВСЯ'].map((opt) => (
              <button
                key={opt}
                onClick={() => cast(opt)}
                disabled={user?.status !== 'member'}
                className={`btn-press rounded-xl px-4 py-4 text-lg font-extrabold text-white transition disabled:opacity-40 ${btnColor(opt)}`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        {v.myVote && (
          <div className="mt-5">
            <Alert kind="success">
              {lang === 'uk' ? 'Ваш голос прийнято' : 'Your vote is accepted'}: <b>{v.myVote}</b>
              {v.status === 'open' && (lang === 'uk' ? ' · змінити голос не можна' : ' · the vote cannot be changed')}
            </Alert>
          </div>
        )}
        {v.status === 'open' && !v.myVote && user?.status !== 'member' && (
          <p className="mt-3 text-sm text-slate-400">
            {lang === 'uk' ? 'Голосувати можуть верифіковані члени організації' : 'Only verified members can vote'}
          </p>
        )}

        {(v.status === 'closed' || ['admin', 'deputy'].includes(user?.role)) && v.results && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              {lang === 'uk' ? 'Результати' : 'Results'}:
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {Object.entries(v.results.counts).map(([opt, n]) => (
                <span key={opt} className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-slate-800">
                  {opt}: <b>{n}</b>
                </span>
              ))}
              <span className="rounded-lg bg-white px-3 py-1.5 text-slate-400 shadow-sm dark:bg-slate-800">
                {lang === 'uk' ? 'Не проголосували' : 'Not voted'}: <b>{v.results.notVoted}</b>
              </span>
            </div>
            {v.results.named && (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="py-1">{lang === 'uk' ? 'Учасник' : 'Member'}</th>
                    <th className="py-1">{lang === 'uk' ? 'Голос' : 'Vote'}</th>
                  </tr>
                </thead>
                <tbody>
                  {v.results.named.map((b, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-1.5 text-slate-700 dark:text-slate-200">{b.name}</td>
                      <td className="py-1.5">
                        <b className={b.option === 'ЗА' ? 'text-emerald-500' : b.option === 'ПРОТИ' ? 'text-red-500' : 'text-amber-500'}>
                          {b.option}
                        </b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {msg && <Alert kind="success">{msg}</Alert>}
          {err && <Alert kind="error">{err}</Alert>}
        </div>
      </Card>
    </div>
  );
}
