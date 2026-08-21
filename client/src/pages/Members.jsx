import { useEffect, useState } from 'react';
import { api, imgUrl } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Card, Empty, Badge } from '../components/ui.jsx';
import { useSeo } from '../seo.js';

export default function Members() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [members, setMembers] = useState(null);
  const [birthdays, setBirthdays] = useState([]);
  const [search, setSearch] = useState('');
  useSeo(lang === 'uk' ? 'Каталог членів' : 'Member directory', 'Члени молодіжного обʼєднання «Свідомий Вибір»');

  useEffect(() => {
    api('/api/member-directory').then(setMembers).catch(() => setMembers([]));
    api('/api/birthdays').then(setBirthdays).catch(() => {});
  }, []);

  if (!members) return <div className="py-16 text-center text-slate-400">…</div>;

  const filtered = members.filter((m) =>
    `${m.name} ${m.surname}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {lang === 'uk' ? 'Каталог членів організації' : 'Member directory'}
      </h1>

      {birthdays.length > 0 && (
        <Card className="mt-4 border-l-4 !border-l-pink-400">
          <p className="font-bold text-pink-500">🎂 {lang === 'uk' ? 'Найближчі дні народження' : 'Upcoming birthdays'}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {birthdays.map((b, i) => (
              <li key={i}>
                {b.isToday ? '🎉' : '🎂'} <b>{b.name}</b> —{' '}
                {b.isToday
                  ? (lang === 'uk' ? 'сьогодні!' : 'today!')
                  : new Date(b.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`🔍 ${lang === 'uk' ? 'Пошук за імʼям...' : 'Search by name...'}`}
        className="mt-6 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
      />

      {filtered.length === 0 ? (
        <div className="mt-6"><Empty>{lang === 'uk' ? 'Нікого не знайдено' : 'Nobody found'}</Empty></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Card key={m.id}>
              <div className="flex items-center gap-3">
                {m.avatar ? (
                  <img src={imgUrl(m.avatar)} alt="" loading="lazy" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl dark:bg-slate-700">
                    {m.name?.[0] || '👤'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900 dark:text-white">{m.name} {m.surname}</p>
                  <p className="text-xs text-slate-400">
                    {lang === 'uk' ? 'рейтинг' : 'rating'}: {m.rating}/100 {m.role === 'admin' ? '· ⭐' : m.role === 'deputy' ? '· 📌' : ''}
                  </p>
                </div>
              </div>
              {m.about && <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">«{m.about}»</p>}
              {m.interests?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.interests.slice(0, 3).map((i) => (
                    <Badge key={i} color="blue">{i}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
