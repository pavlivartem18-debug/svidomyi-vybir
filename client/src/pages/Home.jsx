import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Btn, Field, Alert, CountUp, Tilt } from '../components/ui.jsx';
import { NewsCard, EventCard } from '../components/Cards.jsx';
import Reveal from '../components/Reveal.jsx';
import { useSeo } from '../seo.js';

const SkeletonCard = () => (
  <div className="skeleton h-52 w-full sm:h-56" aria-hidden="true" />
);

export default function Home() {
  const { t, lang } = useLang();
  const [news, setNews] = useState(null);
  const [events, setEvents] = useState(null);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const floatersRef = useRef(null);
  useSeo(lang === 'uk' ? 'Головна' : 'Home', 'Молодіжне обʼєднання «Свідомий Вибір»: новини, події, засідання, поіменні голосування, волонтерство');

  useEffect(() => {
    api('/api/news').then((list) => setNews(list.slice(0, 3)));
    api('/api/events').then((list) => {
      const now = new Date().toISOString();
      setEvents(list.filter((e) => e.startsAt >= now).slice(0, 3));
    });
  }, []);

  // легкий паралакс: декоративні емодзі ледве рухаються за курсором
  const heroMove = (e) => {
    const el = floatersRef.current;
    if (!el) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 26;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const heroLeave = () => {
    if (floatersRef.current) floatersRef.current.style.transform = '';
  };

  const subscribe = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const res = await api('/api/newsletter/subscribe', { method: 'POST', body: { email } });
      setMsg(res.message);
      setEmail('');
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <>
      {/* Герой */}
      <section onMouseMove={heroMove} onMouseLeave={heroLeave} className="animated-gradient grad-accent-br relative overflow-hidden text-white">
        <div ref={floatersRef} className="pointer-events-none absolute inset-0 transition-transform duration-500 ease-out" aria-hidden="true">
          <span className="anim-float absolute left-[8%] top-[20%] text-5xl opacity-30" style={{ animationDelay: '0s' }}>🌱</span>
          <span className="anim-float absolute right-[10%] top-[24%] text-5xl opacity-30" style={{ animationDelay: '1.2s' }}>🗳️</span>
          <span className="anim-float absolute left-[16%] bottom-[18%] text-4xl opacity-25" style={{ animationDelay: '2.1s' }}>🤝</span>
          <span className="anim-float absolute right-[18%] bottom-[22%] text-4xl opacity-25" style={{ animationDelay: '0.7s' }}>📚</span>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="anim-fade-up mx-auto mb-5 w-fit rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur" style={{ animationDelay: '0s' }}>
            {lang === 'uk' ? '✊ Молодь, що змінює світ' : '✊ Youth changing the world'}
          </p>
          <h1 className="anim-fade-up mx-auto max-w-3xl text-4xl font-extrabold leading-tight drop-shadow-md sm:text-6xl" style={{ animationDelay: '0.1s' }}>
            {t('hero.title')}
          </h1>
          <p className="anim-fade-up mx-auto mt-5 max-w-2xl text-lg text-blue-50 sm:text-xl" style={{ animationDelay: '0.25s' }}>
            {t('hero.subtitle')}
          </p>
          <div className="anim-fade-up mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: '0.4s' }}>
            <Btn to="/volunteer" variant="accent" className="px-7 py-3.5 text-base">{t('hero.cta')}</Btn>
            <Btn to="/events" variant="outline" className="!border-white/80 !text-white hover:!bg-white/15 px-7 py-3.5 text-base">
              {t('hero.events')}
            </Btn>
          </div>
        </div>
        {/* хвилеподібний перехід до контенту */}
        <svg className="relative block w-full text-white dark:text-slate-900" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 C240,80 480,0 720,30 C960,60 1200,20 1440,45 L1440,70 L0,70 Z" fill="currentColor" />
        </svg>
      </section>

      {/* Статистика: 3D-нахил + накручувані лічильники */}
      <section className="mx-auto -mt-2 max-w-6xl px-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {[
            ['👥', 500, '+', t('members'), 'from-blue-500 to-indigo-500', 'shadow-soft-blue'],
            ['🎪', events ? events.length + 10 : 12, '', t('eventsCount'), 'from-emerald-500 to-teal-500', 'shadow-soft-green'],
            ['📰', news ? news.length + 20 : 24, '', t('newsCount'), 'from-violet-500 to-fuchsia-500', 'shadow-soft-blue'],
          ].map(([emoji, num, suffix, label, gradient, shadow], i) => (
            <Tilt key={i} className="anim-pop" >
              <div className={`rounded-2xl bg-gradient-to-br ${gradient} ${shadow} p-5 text-center text-white sm:p-7`}>
                <p className="text-2xl sm:text-3xl">{emoji}</p>
                <p className="mt-1 text-3xl font-extrabold drop-shadow-sm sm:text-4xl">
                  <CountUp value={num} suffix={suffix} />
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/80 sm:text-xs">{label}</p>
              </div>
            </Tilt>
          ))}
        </div>
      </section>

      {/* Майбутні події */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-gradient-flow text-2xl font-bold sm:text-3xl">{t('home.events')}</h2>
            <Btn to="/events" variant="ghost">{t('details')} →</Btn>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {events === null
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
            : events.map((e, i) => (
                <Reveal key={e.id} delay={i * 120}>
                  <EventCard event={e} compact />
                </Reveal>
              ))}
        </div>
      </section>

      {/* Новини */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-gradient-flow text-2xl font-bold sm:text-3xl">{t('home.news')}</h2>
            <Btn to="/news" variant="ghost">{t('readMore')} →</Btn>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {news === null
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
            : news.map((n, i) => (
                <Reveal key={n.id} delay={i * 120}>
                  <NewsCard news={n} />
                </Reveal>
              ))}
        </div>
      </section>

      {/* Про організацію */}
      <section className="bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('home.about')}</h2>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                {lang === 'uk'
                  ? 'Молодіжне обʼєднання «Свідомий Вибір» працює з 2015 року. Ми організовуємо освітні програми, еко-акції та волонтерські проєкти, проводимо засідання з поіменним голосуванням. За цей час до наших ініціатив долучилися понад 3 000 людей.'
                  : 'Svidomyi Vybir Youth Association has been operating since 2015. We run educational programs, eco-actions, volunteer projects and meetings with named voting. Over 3,000 people have joined our initiatives.'}
              </p>
              <Btn to="/about" variant="outline" className="mt-4">{t('nav.about')}</Btn>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-3">
            {['🌱', '📚', '🤝', '💚'].map((emoji, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className="hover-lift flex h-24 items-center justify-center rounded-xl bg-white text-4xl shadow-sm dark:bg-slate-800">
                  <span className="anim-float" style={{ animationDelay: `${i * 0.6}s` }}>{emoji}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Розсилка */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="animated-gradient grad-accent-bg rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold">{t('home.newsletter')}</h2>
          <p className="mt-1 text-sm text-blue-100">{t('home.newsletterText')}</p>
          <form onSubmit={subscribe} className="mx-auto mt-4 flex max-w-md gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
            />
            <Btn type="submit" variant="accent" className="shrink-0">{t('subscribe')}</Btn>
          </form>
          {msg && <Alert kind="success">{msg}</Alert>}
          {err && <Alert kind="error">{err}</Alert>}
        </div>
      </section>
    </>
  );
}
