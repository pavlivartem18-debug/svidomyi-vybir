import { useEffect, useState } from 'react';
import { api, imgUrl } from '../api.js';
import { useLang } from '../context.jsx';
import { Card, Empty } from '../components/ui.jsx';
import { useSeo } from '../seo.js';

export default function Partners() {
  const { lang } = useLang();
  const [partners, setPartners] = useState(null);
  useSeo(lang === 'uk' ? 'Наші партнери' : 'Our partners', 'Партнери молодіжного обʼєднання «Свідомий Вибір»');

  useEffect(() => { api('/api/partners').then(setPartners).catch(() => setPartners([])); }, []);

  if (!partners) return <div className="py-16 text-center text-slate-400">…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {lang === 'uk' ? 'Наші партнери' : 'Our partners'}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {lang === 'uk'
          ? 'Дякуємо організаціям, які підтримують «Свідомий Вибір»!'
          : 'Thank you to the organizations supporting us!'}
      </p>

      {partners.length === 0 ? (
        <div className="mt-6">
          <Empty>{lang === 'uk' ? 'Список партнерів оновлюється' : 'Partner list is coming soon'}</Empty>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <Card key={p.id} className="text-center">
              {p.logo && (
                <img src={imgUrl(p.logo)} alt={p.name} className="mx-auto h-16 rounded-lg object-contain" />
              )}
              <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{p.name}</h3>
              {p.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.description}</p>}
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  {lang === 'uk' ? 'Сайт партнера →' : 'Visit website →'}
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
