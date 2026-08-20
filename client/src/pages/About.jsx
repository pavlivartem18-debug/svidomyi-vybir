import { useLang } from '../context.jsx';
import { Section, Card } from '../components/ui.jsx';
import { useSeo } from '../seo.js';

export const SOCIALS = {
  instagram: 'https://www.instagram.com/svidomyi_vybir/',
  facebook: 'https://www.facebook.com/share/1HF1zxmYbK/',
  founderInstagram: 'https://www.instagram.com/agre.sir/',
};

const team = [
  { name: 'Влад Корженевський', roleUk: 'Засновник та голова обʼєднання', roleEn: 'Founder & Head', emoji: '🦸', color: 'grad-accent-br', instagram: SOCIALS.founderInstagram, featured: true },
  { name: 'Координатор волонтерів', roleUk: 'Волонтерський напрям', roleEn: 'Volunteers', emoji: '🧑‍🌾', color: 'bg-emerald-500', join: true },
  { name: 'Освітні програми', roleUk: 'Навчання та воркшопи', roleEn: 'Education', emoji: '👩‍🏫', color: 'bg-indigo-500', join: true },
  { name: 'Еко-проєкти', roleUk: 'Екологічні акції', roleEn: 'Eco Projects', emoji: '🧑‍🔬', color: 'bg-teal-500', join: true },
];

export default function About() {
  const { t, lang } = useLang();
  useSeo(t('nav.about'), 'Молодіжне обʼєднання «Свідомий Вибір» — українська молодь в дії. Засновник Влад Корженевський.');
  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-emerald-500 py-14 text-center text-white">
        <h1 className="text-3xl font-extrabold">{t('nav.about')}</h1>
      </div>

      <Section title={t('about.mission')}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <p className="text-3xl">🎯</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{t('about.mission')}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('about.missionText')}</p>
          </Card>
          <Card>
            <p className="text-3xl">🌟</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{t('about.vision')}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('about.visionText')}</p>
          </Card>
        </div>
      </Section>

      <Section title={t('about.team')} subtitle={lang === 'uk' ? 'Люди, які роблять усе це можливим' : 'The people who make it all possible'}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m) => (
            <Card key={m.name} className={`hover-lift text-center ${m.featured ? 'ring-2 ring-amber-400/70' : ''}`}>
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl text-white shadow-lg ${m.color}`}>
                {m.emoji}
              </div>
              <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{m.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{lang === 'uk' ? m.roleUk : m.roleEn}</p>
              {m.instagram && (
                <a
                  href={m.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 px-3 py-1 text-xs font-bold text-white"
                >
                  📷 Instagram
                </a>
              )}
              {m.join && (
                <a href="/volunteer" className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">
                  {lang === 'uk' ? 'Твоє місце тут →' : 'Your place here →'}
                </a>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <Section title={lang === 'uk' ? 'Ми в соцмережах' : 'Follow us'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={SOCIALS.instagram}
            target="_blank"
            rel="noreferrer"
            className="hover-lift flex items-center gap-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 p-5 text-white shadow-lg"
          >
            <img src="/icons/logo.png" alt="" className="h-16 w-16 rounded-2xl border-2 border-white/60 object-cover shadow-lg" />
            <div>
              <p className="text-lg font-extrabold">@svidomyi_vybir</p>
              <p className="text-sm text-white/85">{lang === 'uk' ? 'Instagram обʼєднання — 1200+ підписників' : 'Our Instagram — 1200+ followers'}</p>
            </div>
          </a>
          <a
            href={SOCIALS.facebook}
            target="_blank"
            rel="noreferrer"
            className="hover-lift flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-5 text-white shadow-lg"
          >
            <span className="text-4xl">📘</span>
            <div>
              <p className="text-lg font-extrabold">Facebook</p>
              <p className="text-sm text-white/85">{lang === 'uk' ? 'Сторінка обʼєднання — новини та події' : 'Our page — news and events'}</p>
            </div>
          </a>
        </div>
      </Section>

      <Section title={lang === 'uk' ? 'Наші цінності' : 'Our values'}>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['🤝', lang === 'uk' ? 'Відкритість' : 'Openness', lang === 'uk' ? 'Наші звіти й рішення відкриті для всіх.' : 'Our reports and decisions are open to everyone.'],
            ['💚', lang === 'uk' ? 'Дбайливість' : 'Care', lang === 'uk' ? 'Про людей, місто і довкілля.' : 'For people, the city and the environment.'],
            ['🚀', lang === 'uk' ? 'Дія' : 'Action', lang === 'uk' ? 'Слова перетворюємо на проєкти.' : 'We turn words into projects.'],
          ].map(([emoji, title, text]) => (
            <Card key={title}>
              <p className="text-2xl">{emoji}</p>
              <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
