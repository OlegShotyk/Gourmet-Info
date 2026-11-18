/* ==========================================================================
   Гурман-Інфо — веб-аналітика Vercel Web Analytics (самостійна робота)
   Безкоштовна аналітика Vercel без cookie: рахує перегляди сторінок і джерела переходів,
   не зберігає IP-адреси й не потребує банера згоди. Скрипт віддає сам Vercel за адресою /_vercel/insights/script.js —
   він існує лише на продакшн-домені з увімкненою Analytics у панелі проєкту. Тому локально (localhost, file://)
   скрипт не підключається: на сервері розробки він дав би помилку 404 у консолі.
   ========================================================================== */

(() => {
  'use strict';
  if (location.hostname !== 'gourmet-info.vercel.app') return;

  // Черга подій до завантаження скрипта (офіційний фрагмент Vercel для статичних сайтів)
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

  const script = document.createElement('script');
  script.src = '/_vercel/insights/script.js';
  script.defer = true;
  document.head.append(script);
})();
