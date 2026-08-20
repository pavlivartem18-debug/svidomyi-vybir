import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Card } from '../components/ui.jsx';
import { useSeo } from '../seo.js';

export default function Donate() {
  const { lang } = useLang();
  const [details, setDetails] = useState('');
  useSeo(lang === 'uk' ? 'Підтримати нас' : 'Support us', 'Підтримка молодіжного обʼєднання «Свідомий Вибір»');

  useEffect(() => {
    api('/api/settings').then((s) => setDetails(s.donationDetails || '')).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 p-8 text-center text-white">
        <h1 className="text-3xl font-extrabold">💚 {lang === 'uk' ? 'Підтримати «Свідомий Вибір»' : 'Support us'}</h1>
        <p className="mx-auto mt-3 max-w-lg text-emerald-50">
          {lang === 'uk'
            ? 'Ваш внесок допомагає проводити безкоштовні воркшопи, еко-акції та освітні програми для молоді.'
            : 'Your contribution helps us run free workshops, eco-actions and educational programs for youth.'}
        </p>
      </div>

      <Card className="mt-6">
        <h3 className="font-bold text-slate-900 dark:text-white">
          {lang === 'uk' ? 'Реквізити для підтримки' : 'Donation details'}
        </h3>
        {details ? (
          <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {details}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            {lang === 'uk'
              ? 'Реквізити будуть додані найближчим часом (адміністратор заповнює їх у панелі керування).'
              : 'Details will be added soon (administrator fills them in the admin panel).'}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          {lang === 'uk'
            ? 'Організація відчуває відповідальність перед донорами: звіти про витрати публікуються в новинах.'
            : 'We publish spending reports in our news.'}
        </p>
      </Card>

      <Card className="mt-4">
        <h3 className="font-bold text-slate-900 dark:text-white">
          {lang === 'uk' ? 'Або допоможіть справою' : 'Or help as a volunteer'}
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {lang === 'uk' ? 'Ми завжди раді волонтерам — це безцінніше за гроші!' : 'Volunteers are always welcome!'}
        </p>
        <a href="/volunteer" className="mt-3 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
          {lang === 'uk' ? 'Стати волонтером 💚' : 'Become a volunteer 💚'}
        </a>
      </Card>
    </div>
  );
}
