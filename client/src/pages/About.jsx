import { useLang } from '../context.jsx';
import { Section, Card } from '../components/ui.jsx';

const team = [
  { name: 'Олена Ковальчук', roleUk: 'Голова організації', roleEn: 'Chairperson', emoji: '👩‍💼', color: 'bg-blue-500' },
  { name: 'Андрій Шевченко', roleUk: 'Координатор волонтерів', roleEn: 'Volunteer Coordinator', emoji: '🧑‍🌾', color: 'bg-emerald-500' },
  { name: 'Марія Бондаренко', roleUk: 'Освітні програми', roleEn: 'Education Programs', emoji: '👩‍🏫', color: 'bg-indigo-500' },
  { name: 'Тарас Мельник', roleUk: 'Еко-проєкти', roleEn: 'Eco Projects', emoji: '🧑‍🔬', color: 'bg-teal-500' },
];

export default function About() {
  const { t, lang } = useLang();
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
            <Card key={m.name} className="text-center">
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl ${m.color}`}>
                {m.emoji}
              </div>
              <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{m.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{lang === 'uk' ? m.roleUk : m.roleEn}</p>
            </Card>
          ))}
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
