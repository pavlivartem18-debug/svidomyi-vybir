import bcrypt from 'bcryptjs';
import { getDb, save, uid } from './db.js';

const daysFromNow = (n, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export function seedIfEmpty() {
  const db = getDb();
  if (db.users.length > 0) return;

  const admin = {
    id: uid('u-'),
    name: 'Адміністратор',
    surname: '',
    email: 'admin@org.ua',
    password: bcrypt.hashSync('Admin123!', 10),
    phone: '+380 50 000 0001',
    interests: ['ecology', 'education'],
    role: 'admin',
    status: 'member',
    blocked: false,
    about: '',
    avatar: '',
    verified: true,
    createdAt: new Date().toISOString(),
  };
  const deputy = {
    id: uid('u-'),
    name: 'Заступник',
    surname: '',
    email: 'deputy@org.ua',
    password: bcrypt.hashSync('Deputy123!', 10),
    phone: '+380 50 000 0003',
    interests: ['education'],
    role: 'deputy',
    status: 'member',
    blocked: false,
    about: '',
    avatar: '',
    verified: true,
    createdAt: new Date().toISOString(),
  };
  const member = {
    id: uid('u-'),
    name: 'Демо Користувач',
    surname: '',
    email: 'demo@org.ua',
    password: bcrypt.hashSync('Demo1234!', 10),
    phone: '+380 50 000 0002',
    interests: ['volunteering', 'culture'],
    role: 'member',
    status: 'member',
    blocked: false,
    about: 'Прихильник екоініціатив та молодіжних проєктів.',
    avatar: '',
    verified: true,
    createdAt: new Date().toISOString(),
  };
  db.users.push(admin, deputy, member);

  db.news.push(
    {
      id: uid('n-'),
      title: 'Ми посадили 500 дерев у парку «Нивки»',
      excerpt: 'Разом із 80 волонтерами ми озеленили три алеї парку та встановили нові лавки.',
      content:
        'У минулу суботу відбулася наймасштабніша волонтерська акція цього року. 80 волонтерів протягом шести годин посадили 500 дерев: клени, липи та дуби. Дякуємо кожному, хто долучився!\n\nНаступна акція запланована на осінь — стежте за анонсами в календарі подій.',
      category: 'ecology',
      image: '',
      authorId: admin.id,
      authorName: admin.name,
      featured: true,
      createdAt: daysFromNow(-3, 12),
    },
    {
      id: uid('n-'),
      title: 'Безкоштовні курси цифрової грамотності для літніх людей',
      excerpt: 'З 1 вересня стартує нова група курсів. Реєстрація відкрита для всіх бажаючих.',
      content:
        'Протягом восьми тижнів учасники навчаться користуватися смартфоном, відеозвʼязком, державними онлайн-сервісами та безпечно поводитися в інтернеті. Заняття проходять двічі на тиждень у нашому офісі.\n\nКількість місць обмежена — 20 учасників. Зареєструватися можна за телефоном або через форму волонтера.',
      category: 'education',
      image: '',
      authorId: admin.id,
      authorName: admin.name,
      featured: true,
      createdAt: daysFromNow(-6, 10),
    },
    {
      id: uid('n-'),
      title: 'Підсумки благодійного ярмарку: 120 000 грн на підтримку притулку',
      excerpt: 'Дякуємо всім відвідувачам і партнерам! Кошти підуть на реконструкцію приміщення притулку.',
      content:
        'Ярмарок зібрав понад 600 відвідувачів. Волонтери організували 15 майстер-класів для дітей, кавовий corner та благодійний аукціон. Усі зібрані кошти — 120 000 грн — передані міському притулку для тварин.',
      category: 'charity',
      image: '',
      authorId: admin.id,
      authorName: admin.name,
      featured: false,
      createdAt: daysFromNow(-12, 15),
    },
    {
      id: uid('n-'),
      title: 'Організація отримала грант на розвиток молодіжних просторів',
      excerpt: 'Протягом року ми відкриємо два хаби для навчання та зустрічей молоді.',
      content:
        'Грантовий комітет підтримав нашу програму «Молодіжні хаби». У межах програми ми створимо простори з бібліотекою, коворкінгом та безкоштовними лекціями. Відкриття першого хабу заплановане на грудень.',
      category: 'organization',
      image: '',
      authorId: admin.id,
      authorName: admin.name,
      featured: false,
      createdAt: daysFromNow(-20, 9),
    }
  );

  db.events.push(
    {
      id: uid('e-'),
      title: 'Воркшоп: еко-торбинки своїми руками',
      description:
        'Навчимося шити багаторазові торбинки зі старого текстилю. Усі матеріали надаємо, досвід не потрібен. Тривалість — 3 години.',
      category: 'workshop',
      startsAt: daysFromNow(4, 17),
      location: 'Офіс організації, вул. Хрещатик 22, кім. 3',
      image: '',
      capacity: 25,
      createdAt: daysFromNow(-10, 9),
    },
    {
      id: uid('e-'),
      title: 'Семінар: грантова підтримка громадських ініціатив',
      description:
        'Експерти розкажуть, як підготувати успішну заявку, знайди партнерів та звітувати перед донорами. Q&A у кінці.',
      category: 'seminar',
      startsAt: daysFromNow(9, 18),
      location: 'Онлайн (Zoom)',
      image: '',
      capacity: 100,
      createdAt: daysFromNow(-8, 9),
    },
    {
      id: uid('e-'),
      title: 'Волонтерська акція: прибирання берега річки',
      description:
        'Разом приберемо 2 км берегової лінії та розділимо сміття для переробки. Перчатки й пакети видаємо на місці.',
      category: 'volunteering',
      startsAt: daysFromNow(14, 10),
      location: 'Зустріч: набережна, біля моста',
      image: '',
      capacity: 60,
      createdAt: daysFromNow(-7, 9),
    },
    {
      id: uid('e-'),
      title: 'Заходи для дітей: літній табір читання',
      description:
        'Тиждень ігор, читання та творчих майстерень для дітей 7–12 років. Харчування включено.',
      category: 'workshop',
      startsAt: daysFromNow(21, 9),
      location: 'Молодіжний хаб, вул. Лесі Українки 5',
      image: '',
      capacity: 40,
      createdAt: daysFromNow(-5, 9),
    },
    {
      id: uid('e-'),
      title: 'Загальні збори членів організації',
      description:
        'Підсумки року, обрання нової ради, планування наступного сезону. Приймаємо пропозиції до порядку денного.',
      category: 'meeting',
      startsAt: daysFromNow(28, 19),
      location: 'Офіс організації, вул. Хрещатик 22',
      image: '',
      capacity: 0,
      createdAt: daysFromNow(-4, 9),
    }
  );

  db.subscribers.push({ id: uid('s-'), email: 'friend@example.com', createdAt: new Date().toISOString() });

  const meetingId = uid('m-');
  db.meetings.push({
    id: meetingId,
    title: 'Загальні збори організації',
    startsAt: daysFromNow(7, 18),
    location: 'Офіс організації, вул. Хрещатик 22',
    format: 'очно',
    description: 'Підсумки сезону, планування нових проєктів та голосування щодо програми діяльності.',
    agenda: [
      {
        id: uid('a-'),
        number: 1,
        title: 'Звіт про діяльність за рік',
        description: 'Голова презентує підсумки діяльності та фінансовий звіт.',
        responsible: admin.name,
        status: 'показується',
      },
      {
        id: uid('a-'),
        number: 2,
        title: 'Затвердження плану діяльності на новий сезон',
        description: 'Обговорення та поіменне голосування щодо нового плану діяльності.',
        responsible: deputy.name,
        status: 'очікує',
      },
    ],
    rsvps: [{ userId: member.id, answer: 'yes', at: daysFromNow(-1, 12) }],
    createdAt: daysFromNow(-14, 10),
  });

  db.votes.push({
    id: uid('v-'),
    title: 'Затвердження положення про волонтерську програму',
    question: 'Чи підтримуєте Ви затвердження нового положення про волонтерську програму?',
    meetingId,
    agendaNumber: 1,
    options: ['ЗА', 'ПРОТИ', 'УТРИМАВСЯ'],
    status: 'closed',
    ballots: [
      { userId: admin.id, userName: admin.name + ' ' + admin.surname, option: 'ЗА', at: daysFromNow(-2, 18) },
      { userId: member.id, userName: member.name + ' ' + member.surname, option: 'ЗА', at: daysFromNow(-2, 18) },
      { userId: deputy.id, userName: deputy.name + ' ' + deputy.surname, option: 'УТРИМАВСЯ', at: daysFromNow(-2, 18) },
    ],
    createdAt: daysFromNow(-2, 18),
    closedAt: daysFromNow(-2, 19),
  });

  db.surveys.push({
    id: uid('sur-'),
    title: 'Опитування: теми наступних воркшопів',
    question: 'Яку тему воркшопу обрати наступною?',
    options: ['Еко-торбинки', 'Грантрайтинг', 'Медіаграмотність'],
    status: 'open',
    createdAt: daysFromNow(-1, 10),
  });
  db.surveyResponses.push(
    { id: uid('sr-'), surveyId: db.surveys[0].id, userId: admin.id, optionIndex: 1, at: daysFromNow(-1, 12) },
    { id: uid('sr-'), surveyId: db.surveys[0].id, userId: member.id, optionIndex: 0, at: daysFromNow(-1, 13) }
  );

  db.reviews.push({
    id: uid('rev-'),
    aboutUserId: member.id,
    fromUserId: admin.id,
    fromName: admin.name,
    rating: 5,
    text: 'Дуже активний учасник, завжди допомагає з організацією подій!',
    createdAt: daysFromNow(-5, 15),
  });

  db.notifications.push({
    id: uid('nt-'),
    userId: member.id,
    text: 'Створено нове засідання: «Загальні збори організації»',
    link: '/meetings',
    read: false,
    createdAt: daysFromNow(-14, 10),
  });

  db.auditLogs.push({
    id: uid('log-'),
    actorName: admin.name,
    action: 'Створив засідання «Загальні збори організації»',
    createdAt: daysFromNow(-14, 10),
  });

  save();
  console.log('Seed-дані створено. Адмін: admin@org.ua / Admin123! | заступник: deputy@org.ua / Deputy123! | demo@org.ua / Demo1234!');
}
