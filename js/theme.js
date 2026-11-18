/* ==========================================================================
   Гурман-Інфо — перемикач світлої / темної теми (самостійна робота)
   Tailwind CSS: darkMode: 'class' — утиліти dark:… спрацьовують, коли на <html> є клас .dark.

   1. Перший вибір теми робить маленький вбудований скрипт у <head> кожної сторінки ще ДО відмальовування
      (інакше сторінка на мить блимала б світлою темою — FOUC). Він же додає preload фонового фото
      першого екрана саме для активної теми.
   2. Цей файл: кнопка-перемикач (aria-pressed), збереження вибору в localStorage,
      колір рядка браузера (meta theme-color) і подія themechange для сторонніх віджетів (інформер погоди).
   Поки користувач сам не обрав тему, сайт слідує налаштуванню системи (prefers-color-scheme).
   ========================================================================== */

(() => {
  'use strict';

  const KEY = 'theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const COLORS = { light: '#6b1e2b', dark: '#180e11' };

  // localStorage може бути недоступним (приватний режим, заборонені cookie) — тоді тема просто не запам'ятовується
  const saved = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (value) => { try { localStorage.setItem(KEY, value); } catch { /* без збереження */ } };

  const isDark = () => root.classList.contains('dark');

  function apply(dark) {
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light'; // смуги прокрутки й системні поля — у тон теми
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? COLORS.dark : COLORS.light);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(dark));
      btn.title = dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему';
    });
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark } }));
  }

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dark = !isDark();
      save(dark ? 'dark' : 'light');
      apply(dark);
    });
  });

  // Зміна теми в системі (наприклад, автоматично ввечері) — лише якщо користувач не обирав тему вручну
  system.addEventListener('change', (e) => { if (!saved()) apply(e.matches); });

  apply(isDark()); // синхронізувати кнопки й meta з тим, що обрав скрипт у <head>
})();
