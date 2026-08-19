import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Select, Empty } from '../components/ui.jsx';
import { NewsCard } from '../components/Cards.jsx';
import { newsCats } from '../i18n.js';

export default function News() {
  const { t, lang } = useLang();
  const [news, setNews] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    setLoading(true);
    api('/api/news?' + params.toString())
      .then(setNews)
      .finally(() => setLoading(false));
  }, [search, category]);

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-emerald-500 py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold">{t('nav.news')}</h1>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`🔍 ${t('search')}...`}
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <div className="w-44">
            <Select options={[['', t('filter.all')], ...Object.entries(newsCats[lang])]} value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <Empty>…</Empty>
        ) : news.length === 0 ? (
          <Empty>{lang === 'uk' ? 'Новин не знайдено' : 'No news found'}</Empty>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => <NewsCard key={n.id} news={n} />)}
          </div>
        )}
      </div>
    </>
  );
}
