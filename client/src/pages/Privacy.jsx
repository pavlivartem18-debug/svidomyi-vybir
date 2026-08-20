import { useLang } from '../context.jsx';
import { useSeo } from '../seo.js';

const S = {
  uk: {
    h1: 'Політика конфіденційності',
    updated: 'Останнє оновлення: серпень 2026',
    sections: [
      ['1. Загальні положення', 'Молодіжне обʼєднання «Свідомий Вибір» (далі — Організація) поважає право користувачів сайту на захист персональних даних та діє відповідно до Закону України «Про захист персональних даних» і Загального регламенту ЄС з захисту даних (GDPR).'],
      ['2. Які дані ми збираємо', 'При реєстрації: імʼя, прізвище, email, номер телефону, дата народження (за бажанням), фотографія та опис «про себе» (за бажанням). При користуванні платформою: дані про участь у подіях, засіданнях, голосуваннях та опитуваннях; технічні дані входу (час, IP-адреса, тип браузера).'],
      ['3. Навіщо ми це використовуємо', 'Виключно для роботи платформи Організації: надання доступу до кабінету, обліку членства, організації засідань і голосувань, статистики активності та внутрішніх сповіщень. Ми не продаємо і не передаємо дані третім особам.'],
      ['4. Хто бачить дані', 'Публічну частину профілю (імʼя, фото, опис) бачать інші верифіковані члени Організації в каталозі. Пошту і телефон бачить лише адміністрація. Поіменні результати голосувань бачать члени Організації після завершення голосування.'],
      ['5. Зберігання і захист', 'Дані зберігаються в хмарній базі даних з обмеженим доступом. Паролі зберігаються лише у вигляді незворотного хешу. Доступ адміністратора захищений двофакторною автентифікацією.'],
      ['6. Права користувача', 'Ви маєте право: переглянути свої дані, виправити їх у профілі, вимагати видалення акаунта (зверніться на info@sv-vybir.org.ua), відписатися від сповіщень у будь-який момент.'],
      ['7. Файли cookie', 'Сайт використовує виключно технічні cookie для зберігання сесії авторизації та налаштувань (тема, мова). Аналітичні інструменти (за наявності) працюють в анонімному режимі.'],
      ['8. Контакти', 'Питання щодо обробки персональних даних: info@sv-vybir.org.ua'],
    ],
  },
  en: {
    h1: 'Privacy Policy',
    updated: 'Last updated: August 2026',
    sections: [
      ['1. General', 'Svidomyi Vybir Youth Association respects your data protection rights under Ukrainian law and the GDPR.'],
      ['2. Data we collect', 'On registration: name, surname, email, phone, optional birthday, photo and bio. During use: participation in events, meetings, votes and surveys; technical login data (time, IP, browser).'],
      ['3. Purpose', 'Solely to operate the platform: access to your dashboard, membership tracking, meetings and voting, activity statistics and internal notifications. We never sell your data.'],
      ['4. Visibility', 'Public profile parts (name, photo, bio) are visible to verified members in the directory. Email and phone are visible to administration only. Named voting results are visible to members after voting closes.'],
      ['5. Storage & security', 'Data is stored in a cloud database with restricted access. Passwords are stored as irreversible hashes. Admin access is protected by two-factor authentication.'],
      ['6. Your rights', 'You may view and edit your data in your profile, request account deletion (info@sv-vybir.org.ua), and unsubscribe from notifications at any time.'],
      ['7. Cookies', 'Only technical cookies for session, theme and language. Analytics (if enabled) is anonymous.'],
      ['8. Contacts', 'Data protection questions: info@sv-vybir.org.ua'],
    ],
  },
};

export default function Privacy() {
  const { lang } = useLang();
  const t = S[lang] || S.uk;
  useSeo(t.h1, 'Політика конфіденційності');
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t.h1}</h1>
      <p className="mt-1 text-xs text-slate-400">{t.updated}</p>
      <div className="mt-6 space-y-5">
        {t.sections.map(([title, text]) => (
          <section key={title}>
            <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
