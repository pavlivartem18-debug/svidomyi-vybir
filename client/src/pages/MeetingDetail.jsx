import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Btn, Alert, Card, Badge, fmtDateTime, Empty } from '../components/ui.jsx';

export default function MeetingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [m, setM] = useState(null);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => api('/api/meetings/' + id).then(setM).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  if (err) return <div className="mx-auto max-w-3xl px-4 py-10"><Alert kind="error">{err}</Alert></div>;
  if (!m) return <div className="py-16 text-center text-slate-400">…</div>;

  const rsvp = async (answer) => {
    setErr(null); setMsg(null);
    try {
      await api(`/api/meetings/${m.id}/rsvp`, { method: 'POST', body: { answer } });
      setMsg(lang === 'uk' ? 'Відповідь збережено' : 'Saved');
      load();
    } catch (e) { setErr(e.message); }
  };

  const cast = async (voteId, option) => {
    setErr(null); setMsg(null);
    try {
      const res = await api(`/api/votes/${voteId}/cast`, { method: 'POST', body: { option } });
      setMsg(res.message);
      load();
    } catch (e) { setErr(e.message); }
  };

  const voteBtn = (opt) =>
    opt === 'ЗА'
      ? 'bg-emerald-500 hover:bg-emerald-600'
      : opt === 'ПРОТИ'
        ? 'bg-red-500 hover:bg-red-600'
        : 'bg-amber-500 hover:bg-amber-600';

  const statusColor = (s) => (s === 'open' ? 'green' : s === 'closed' ? 'slate' : 'blue');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Btn to="/meetings" variant="ghost" className="mb-4">← {t('nav.meetings')}</Btn>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{m.title}</h1>
      <p className="mt-2 text-sm text-slate-400">
        🕒 {fmtDateTime(m.startsAt, lang)} · 📍 {m.location || '—'} · {m.format}
      </p>
      <p className="mt-3 text-slate-600 dark:text-slate-300">{m.description}</p>

      {/* Участь */}
      <Card className="mt-6">
        <p className="mb-3 font-semibold text-slate-900 dark:text-white">
          {lang === 'uk' ? 'Ваша участь' : 'Your attendance'}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ['yes', lang === 'uk' ? '✅ Беру участь' : '✅ Going'],
            ['maybe', lang === 'uk' ? '🤔 Ще не визначився' : '🤔 Maybe'],
            ['no', lang === 'uk' ? '❌ Не беру участі' : '❌ Not going'],
          ].map(([a, label]) => (
            <button
              key={a}
              onClick={() => rsvp(a)}
              disabled={user?.status !== 'member'}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${
                m.myRsvp === a ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-600 hover:border-blue-400 dark:border-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {user?.status !== 'member' && (
          <p className="mt-2 text-xs text-slate-400">
            {lang === 'uk' ? 'Доступно верифікованим членам організації' : 'Available to verified members'}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          {lang === 'uk' ? 'Учасників' : 'Participants'}: {m.counts.yes} ·{' '}
          {lang === 'uk' ? 'не визначились' : 'maybe'}: {m.counts.maybe} ·{' '}
          {lang === 'uk' ? 'не беруть участі' : 'not going'}: {m.counts.no}
        </p>
      </Card>

      {/* Порядок денний */}
      <h2 className="mt-8 text-lg font-bold text-slate-900 dark:text-white">
        {lang === 'uk' ? 'Порядок денний' : 'Agenda'}
      </h2>
      {(!m.agenda || m.agenda.length === 0) ? (
        <div className="mt-3"><Empty>{lang === 'uk' ? 'Пункти порядку денного ще не додано' : 'No agenda items yet'}</Empty></div>
      ) : (
        <ol className="mt-3 space-y-3">
          {m.agenda.map((a) => (
            <li key={a.id}>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {lang === 'uk' ? 'Питання' : 'Item'} №{a.number}. {a.title}
                  </h3>
                  <Badge color="blue">{a.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{a.description}</p>
                {a.responsible && (
                  <p className="mt-1 text-xs text-slate-400">
                    {lang === 'uk' ? 'Відповідальний' : 'Responsible'}: {a.responsible}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}

      {/* Голосування засідання */}
      <h2 className="mt-8 text-lg font-bold text-slate-900 dark:text-white">
        {lang === 'uk' ? 'Голосування' : 'Voting'}
      </h2>
      {m.votes.length === 0 ? (
        <div className="mt-3"><Empty>{lang === 'uk' ? 'Голосувань поки немає' : 'No votes yet'}</Empty></div>
      ) : (
        <div className="mt-3 space-y-4">
          {m.votes.map((v) => (
            <Card key={v.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">{v.title}</h3>
                <Badge color={statusColor(v.status)}>
                  {v.status === 'open' ? (lang === 'uk' ? '🔴 ЙДЕТЬ ГОЛОСУВАННЯ' : '🔴 VOTING OPEN')
                    : v.status === 'closed' ? (lang === 'uk' ? 'Завершено' : 'Closed')
                    : (lang === 'uk' ? 'Підготовка' : 'Draft')}
                </Badge>
              </div>
              <p className="mt-2 text-slate-700 dark:text-slate-200">{v.question}</p>

              {/* Кнопки голосування */}
              {v.status === 'open' && !v.myVote && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {['ЗА', 'ПРОТИ', 'УТРИМАВСЯ'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => cast(v.id, opt)}
                      disabled={user?.status !== 'member'}
                      className={`rounded-xl px-4 py-3 text-base font-extrabold text-white transition disabled:opacity-40 ${voteBtn(opt)}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {v.myVote && (
                <Alert kind="success">
                  {lang === 'uk' ? 'Ваш голос прийнято' : 'Your vote is accepted'}: <b>{v.myVote}</b>
                  {v.status === 'open' && (lang === 'uk' ? ' · змінити голос не можна' : ' · the vote cannot be changed')}
                </Alert>
              )}
              {v.status === 'open' && !v.myVote && user?.status !== 'member' && (
                <p className="mt-2 text-xs text-slate-400">
                  {lang === 'uk' ? 'Голосувати можуть верифіковані члени організації' : 'Only verified members can vote'}
                </p>
              )}

              {/* Результати */}
              {(v.status === 'closed' || ['admin', 'deputy'].includes(user?.role)) && v.results && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
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
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {msg && <Alert kind="success">{msg}</Alert>}
        {err && <Alert kind="error">{err}</Alert>}
      </div>
    </div>
  );
}
