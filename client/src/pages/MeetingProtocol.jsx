import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Alert } from '../components/ui.jsx';

export default function MeetingProtocol() {
  const { id } = useParams();
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api(`/api/meetings/${id}/protocol`).then(setData).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="mx-auto max-w-3xl px-4 py-10"><Alert kind="error">{err}</Alert></div>;
  if (!data) return <div className="py-16 text-center text-slate-400">…</div>;

  const { meeting: m, present, absent, votes } = data;
  const fmt = (iso) =>
    new Date(iso).toLocaleString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Панель керування друку — на папір не потрапляє */}
      <div className="mx-auto max-w-3xl px-4 py-6 print:hidden">
        <Link to={`/meetings/${id}`} className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
          ← {lang === 'uk' ? 'до засідання' : 'back to meeting'}
        </Link>
        <button
          onClick={() => window.print()}
          className="ml-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          🖨 {lang === 'uk' ? 'Друкувати / Зберегти PDF' : 'Print / Save PDF'}
        </button>
        <p className="mt-2 text-xs text-slate-400">
          {lang === 'uk'
            ? 'У вікні друку оберіть «Зберегти як PDF» — отримаєте офіційний протокол.'
            : 'In the print dialog choose “Save as PDF”.'}
        </p>
      </div>

      <div className="mx-auto max-w-3xl bg-white px-8 py-10 text-black print:px-0">
        <p className="text-center text-sm font-semibold uppercase tracking-wide">
          Молодіжне обʼєднання «Свідомий Вибір»
        </p>
        <h1 className="mt-4 text-center text-xl font-bold">ПРОТОКОЛ</h1>
        <p className="mt-1 text-center text-sm">{m.title}</p>
        <p className="mt-2 text-center text-xs text-gray-600">
          {fmt(m.startsAt)} · {m.location || '—'} · формат: {m.format}
        </p>

        <h2 className="mt-6 font-bold">Присутні ({present.length}):</h2>
        <ol className="mt-1 list-decimal pl-6 text-sm">
          {present.length === 0 ? <li>—</li> : present.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
        <h2 className="mt-4 font-bold">Відсутні ({absent.length}):</h2>
        <p className="mt-1 text-sm">{absent.length ? absent.join(', ') : '—'}</p>

        <h2 className="mt-6 font-bold">Порядок денний та рішення:</h2>
        {m.agenda.map((a) => (
          <div key={a.id} className="mt-3 text-sm">
            <p className="font-semibold">{a.number}. {a.title}</p>
            <p className="text-gray-700">{a.description}</p>
            <p className="text-xs text-gray-500">{lang === 'uk' ? 'Відповідальний' : 'Responsible'}: {a.responsible || '—'} · {lang === 'uk' ? 'статус' : 'status'}: {a.status}</p>
          </div>
        ))}

        {votes.length > 0 && (
          <>
            <h2 className="mt-6 font-bold">Результати поіменних голосувань:</h2>
            {votes.map((v, i) => (
              <div key={i} className="mt-3 text-sm">
                <p className="font-semibold">«{v.title}»</p>
                <p className="text-gray-700">{v.question}</p>
                <p className="mt-1">
                  {Object.entries(v.counts).map(([o, n]) => `${o} — ${n}`).join(' · ')}
                  {` · ${lang === 'uk' ? 'утримались від голосування решта' : 'rest abstained'}`}
                </p>
                <table className="mt-1 w-full border-collapse text-xs">
                  <tbody>
                    {v.named.map((b, j) => (
                      <tr key={j} className="border-t border-gray-300">
                        <td className="py-0.5">{b.name}</td>
                        <td className="py-0.5 font-bold">{b.option}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}

        <div className="mt-10 flex justify-between text-sm">
          <div>
            <p>Головуючий: ________________</p>
          </div>
          <div>
            <p>Секретар: ________________</p>
          </div>
        </div>
        <p className="mt-8 text-right text-xs text-gray-500">
          {lang === 'uk' ? 'Згенеровано автоматично' : 'Generated automatically'}: {fmt(data.generatedAt)}
        </p>
      </div>
    </div>
  );
}
