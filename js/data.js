/* ==========================================================================
   Гурман-Інфо — завантаження Mock-даних (самостійна робота)
   Каталог сирів, вин і перевірених пар винесено з коду в окремий файл data.json.
   Його читають три модулі: слайдер на головній (js/plugins.js), каталог колекції (js/catalog.js)
   і калькулятор (js/widget.js). Запит один на сторінку: проміс кешується.

   Чому асинхронно: fetch() не блокує основний потік — сторінка відмальовується й реагує
   на дії користувача, поки дані йдуть мережею. Помилки (немає мережі, 404, зіпсований JSON,
   неповна структура) не ламають сторінку: модуль показує зрозуміле повідомлення й кнопку «Спробувати ще раз».
   ========================================================================== */

window.GourmetData = (() => {
  'use strict';

  const URL = 'data.json';
  const TIMEOUT = 8000; // мс: повільна мережа не повинна «підвішувати» інтерфейс назавжди
  let pending = null;

  // Структура, без якої каталог не має сенсу; кожна пара посилається на наявні сир і вино
  function check(data) {
    const isDict = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;
    if (!data || !['levels', 'cheeses', 'wines', 'pairs'].every((k) => isDict(data[k]))) {
      throw new TypeError('data.json: немає розділів levels / cheeses / wines / pairs');
    }
    const items = [...Object.values(data.cheeses), ...Object.values(data.wines)];
    if (!items.every((i) => typeof i.name === 'string' && Number.isFinite(i.price) && i.price > 0 && Object.hasOwn(data.levels, i.level))) {
      throw new TypeError('data.json: позиція без назви, ціни або з невідомим рівнем');
    }
    if (!Object.values(data.pairs).every((p) => Object.hasOwn(data.cheeses, p.cheese) && Object.hasOwn(data.wines, p.wine))) {
      throw new TypeError('data.json: пара посилається на неіснуючий сир або вино');
    }
    return data;
  }

  async function request() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const response = await fetch(URL, { headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return check(await response.json());
    } finally {
      clearTimeout(timer);
    }
  }

  /** Дані каталогу (кешований проміс). Після помилки наступний виклик повторює запит. */
  function load() {
    if (!pending) {
      pending = request().catch((error) => {
        pending = null;
        console.error('[data.json]', error); // для розробника; користувач бачить повідомлення модуля
        throw error;
      });
    }
    return pending;
  }

  // Фото з Unsplash (Unsplash License) — розмір під місце на сторінці
  const img = (id, w, h = w) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=60`;

  /** Блок помилки з кнопкою повтору (текст — лише через textContent) */
  function errorBox(message, retry) {
    const box = document.createElement('div');
    box.className = 'flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-5 text-sm';
    box.setAttribute('role', 'alert');
    const p = document.createElement('p');
    p.textContent = message;
    box.append(p);
    if (retry) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inline-flex min-h-12 cursor-pointer items-center rounded-lg border-1.5 border-primary px-5 font-semibold text-primary hover:bg-background-alt';
      btn.textContent = 'Спробувати ще раз';
      btn.addEventListener('click', retry, { once: true });
      box.append(btn);
    }
    return box;
  }

  return Object.freeze({ load, img, errorBox });
})();
