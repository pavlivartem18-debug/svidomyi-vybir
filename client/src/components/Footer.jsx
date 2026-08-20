import { Link } from 'react-router-dom';
import { useLang } from '../context.jsx';

export default function Footer() {
  const { t, lang } = useLang();
  return (
    <footer className="mt-10 border-t border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950">
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-lg font-extrabold text-blue-600 dark:text-blue-400">
            {lang === 'uk' ? 'Свідомий Вибір' : 'Svidomyi Vybir'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('footer.text')}</p>
          <div className="mt-3 flex gap-3 text-sm">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-blue-600">Facebook</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-blue-600">Instagram</a>
            <a href="https://t.me" target="_blank" rel="noreferrer" className="hover:text-blue-600">Telegram</a>
          </div>
        </div>
        <div>
          <p className="mb-2 font-semibold">{t('footer.nav')}</p>
          <ul className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
            <li><Link className="hover:text-blue-600" to="/about">{t('nav.about')}</Link></li>
            <li><Link className="hover:text-blue-600" to="/events">{t('nav.events')}</Link></li>
            <li><Link className="hover:text-blue-600" to="/news">{t('nav.news')}</Link></li>
            <li><Link className="hover:text-blue-600" to="/volunteer">{t('nav.volunteer')}</Link></li>
            <li><Link className="hover:text-blue-600" to="/jobs">{lang === 'uk' ? 'Вакансії' : 'Jobs'}</Link></li>
            <li><Link className="hover:text-blue-600" to="/partners">{lang === 'uk' ? 'Партнери' : 'Partners'}</Link></li>
            <li><Link className="hover:text-blue-600" to="/donate">{lang === 'uk' ? '💚 Підтримати' : '💚 Donate'}</Link></li>
            <li><Link className="hover:text-blue-600" to="/privacy">{lang === 'uk' ? 'Політика конфіденційності' : 'Privacy policy'}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-semibold">{t('footer.contact')}</p>
          <ul className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
            <li>info@sv-vybir.org.ua</li>
            <li>+380 50 000 0000</li>
            <li>{lang === 'uk' ? 'вул. Хрещатик 22, Київ' : '22 Khreshchatyk St, Kyiv'}</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        © {new Date().getFullYear()} {lang === 'uk' ? 'Молодіжне обʼєднання «Свідомий Вибір»' : 'Svidomyi Vybir Youth Association'}
      </p>
    </footer>
  );
}
