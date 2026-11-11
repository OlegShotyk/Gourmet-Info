/* ==========================================================================
   Гурман-Інфо — калькулятор сирної тарілки (ЛР №11)
   Vanilla JS, без бібліотек. Розраховує кількість сиру, вина й орієнтовну вартість
   за 5 параметрами: гості (number), формат вечора (select), рівень сирів (radio),
   вино / супровід / сомельє (checkbox). Перерахунок миттєвий: події input і change.

   Захисне програмування (Defensive Programming), три рівні:
   1. HTML5: min="1" max="50" step="1" required у полі гостей.
   2. JS: кожне значення з DOM вважається «брудним» — перевірка до розрахунку
      (порожнє поле, не число, NaN, Infinity, 0, від'ємні, > 50, дробові, підмінені select / radio).
      Невалідний стан не рахується: замість суми — «—» і зрозуміле повідомлення під полем.
   3. Вивід лише через textContent — введені чи підмінені дані ніколи не виконуються як HTML.

   Ізоляція: IIFE + 'use strict', жодних глобальних змінних. Елементи шукаються всередині
   кореня [data-widget="cheese-board"] за data-cb, тому на сторінці може бути кілька віджетів.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- 1. Бізнес-правила (єдине джерело чисел; Object.freeze — не змінити з консолі) ---------- */
  const RULES = Object.freeze({
    guests: Object.freeze({ min: 1, max: 50, fallback: 6 }),
    // грамів сиру на гостя
    formats: Object.freeze({ aperitif: 60, tasting: 100, dinner: 150 }),
    defaultFormat: 'tasting',
    // ціна сиру, грн за 100 г
    tiers: Object.freeze({ classic: 90, craft: 140, premium: 220 }),
    defaultTier: 'craft',
    wine: Object.freeze({ guestsPerBottle: 3, bottlePrice: 450 }),
    extrasPerGuest: 45,
    sommelierFee: 1200,
  });

  const MESSAGES = Object.freeze({
    empty: `Вкажіть кількість гостей від ${RULES.guests.min} до ${RULES.guests.max}.`,
    notNumber: 'Введіть кількість гостей цифрами, наприклад 6.',
    tooSmall: `Потрібен щонайменше ${RULES.guests.min} гість.`,
    tooBig: `Калькулятор розрахований до ${RULES.guests.max} гостей — для більшої компанії напишіть нам у формі нижче.`,
    fixHint: 'Виправте кількість гостей — і розрахунок оновиться.',
  });

  // Ті самі класи стану помилки, що й у формі зворотного зв'язку (ЛР №9) — єдина дизайн-система
  const ERROR_CLASSES = ['border-red-500', 'hover:border-red-500', 'focus-visible:border-red-500', 'focus-visible:ring-red-500/20'];

  const money = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
  const kilos = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 });

  /* ---------- 2. Чисті функції: перевірка і розрахунок (без DOM — легко тестувати) ---------- */

  /**
   * Перевіряє кількість гостей.
   * @param {string} raw — значення поля (рядок, будь-що)
   * @param {boolean} badInput — браузер не зміг розібрати введене як число (validity.badInput)
   * @returns {{ ok: true, value: number, rounded: boolean } | { ok: false, error: string }}
   */
  function parseGuests(raw, badInput = false) {
    if (badInput) return { ok: false, error: MESSAGES.notNumber };
    const text = String(raw ?? '').trim().replace(',', '.');
    if (text === '') return { ok: false, error: MESSAGES.empty };
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text)) return { ok: false, error: MESSAGES.notNumber };

    const n = Number(text);
    if (!Number.isFinite(n)) return { ok: false, error: MESSAGES.tooBig }; // 1e309 → Infinity
    if (n > RULES.guests.max) return { ok: false, error: MESSAGES.tooBig };

    // Гості — цілі люди: 2.5 → 3 (нормалізація), але лише якщо після округлення значення в межах
    const value = Math.round(n);
    if (value < RULES.guests.min) return { ok: false, error: MESSAGES.tooSmall }; // 0, -5, 0.3
    return { ok: true, value, rounded: value !== n };
  }

  /** Повертає значення, лише якщо воно є ключем довідника, інакше — значення за замовчуванням */
  const pick = (dict, key, fallback) => (Object.prototype.hasOwnProperty.call(dict, key) ? key : fallback);

  // Скільки сортів сиру радимо на тарілці
  const varietiesFor = (guests) => (guests <= 4 ? 3 : guests <= 12 ? 4 : guests <= 24 ? 5 : 6);

  /**
   * Розрахунок тарілки. Усі суми — цілі гривні.
   * @param {{ guests: number, format: string, tier: string, wine: boolean, extras: boolean, sommelier: boolean }} s
   */
  function calculate(s) {
    const grams = s.guests * RULES.formats[s.format];
    const cheese = Math.round((grams * RULES.tiers[s.tier]) / 100);
    const bottles = s.wine ? Math.ceil(s.guests / RULES.wine.guestsPerBottle) : 0;
    const wine = bottles * RULES.wine.bottlePrice;
    const extras = s.extras ? s.guests * RULES.extrasPerGuest : 0;
    const sommelier = s.sommelier ? RULES.sommelierFee : 0;
    const total = cheese + wine + extras + sommelier;

    // Остання лінія захисту (fail-safe): якщо щось пішло не так — не показувати NaN / від'ємну суму
    if (![grams, cheese, wine, extras, total].every((x) => Number.isFinite(x) && x >= 0)) {
      throw new RangeError('Некоректний результат розрахунку: ' + JSON.stringify(s));
    }
    return { grams, varieties: varietiesFor(s.guests), cheese, bottles, wine, extras, sommelier, total, perGuest: Math.round(total / s.guests) };
  }

  /* ---------- 3. Форматування для виводу ---------- */
  const uah = (n) => `${money.format(n)} грн`;
  const weight = (g) => (g < 1000 ? `${money.format(g)} г` : `${kilos.format(g / 1000)} кг`);
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

  /* ---------- 4. Екземпляр віджета ---------- */
  function initCheeseBoard(root) {
    const $ = (name) => root.querySelector(`[data-cb="${name}"]`);
    const el = {
      guests: $('guests'), guestsError: $('guests-error'), minus: $('minus'), plus: $('plus'),
      format: $('format'), tiers: [...root.querySelectorAll('[data-cb="tier"]')],
      wine: $('wine'), extras: $('extras'), sommelier: $('sommelier'),
      total: $('total'), perGuest: $('per-guest'), cheese: $('cheese'), bottles: $('bottles'),
      extrasSum: $('extras-sum'), sommelierSum: $('sommelier-sum'), cta: $('cta'),
    };

    // Відсутній DOM-елемент — не TypeError, а безпечна деградація:
    // без поля гостей чи блоку суми рахувати нічого (віджет не запускається),
    // без будь-якого іншого елемента — він вважається вимкненим / за замовчуванням
    if (!el.guests || !el.total) {
      console.warn('[cheese-board] Віджет не запущено: у розмітці немає поля гостей або блоку результату.');
      return null;
    }
    const missing = Object.keys(el).filter((k) => !el[k] || (k === 'tiers' && el[k].length === 0));
    if (missing.length) console.warn('[cheese-board] Немає елементів (використано значення за замовчуванням):', missing.join(', '));

    const setText = (node, text) => { if (node) node.textContent = text; }; // лише textContent, ніколи innerHTML
    const isOn = (box) => Boolean(box && box.checked);

    let last = null; // останній коректний розрахунок (для кнопки «Обговорити з сомельє»)
    let frame = 0;

    function readState() {
      const guests = parseGuests(el.guests.value, el.guests.validity.badInput);
      // select / radio могли підмінити через DevTools — беремо лише відомі значення
      const format = pick(RULES.formats, el.format && el.format.value, RULES.defaultFormat);
      if (el.format && format !== el.format.value) {
        console.warn('[cheese-board] Невідомий формат:', el.format.value, '→', format);
        el.format.value = format;
      }
      const checked = el.tiers.find((r) => r.checked);
      const tier = pick(RULES.tiers, checked && checked.value, RULES.defaultTier);
      if (!checked || tier !== checked.value) {
        const fallback = el.tiers.find((r) => r.value === tier);
        if (fallback) fallback.checked = true;
      }
      return { guests, format, tier, wine: isOn(el.wine), extras: isOn(el.extras), sommelier: isOn(el.sommelier) };
    }

    // Стан помилки поля: червона рамка (Tailwind), текст під полем, aria-invalid
    function setGuestsError(message) {
      ERROR_CLASSES.forEach((c) => el.guests.classList.toggle(c, Boolean(message)));
      setText(el.guestsError, message);
      if (el.guestsError) el.guestsError.classList.toggle('hidden', !message);
      if (message) el.guests.setAttribute('aria-invalid', 'true');
      else el.guests.removeAttribute('aria-invalid');
    }

    function updateSteppers(n) {
      if (el.minus) el.minus.disabled = Number.isFinite(n) && n <= RULES.guests.min;
      if (el.plus) el.plus.disabled = Number.isFinite(n) && n >= RULES.guests.max;
    }

    function showEmpty(hint) {
      last = null;
      el.total.textContent = '—';
      setText(el.perGuest, hint);
      [el.cheese, el.bottles, el.extrasSum, el.sommelierSum].forEach((d) => setText(d, '—'));
      if (el.cta) el.cta.setAttribute('aria-disabled', 'true');
    }

    function render() {
      frame = 0;
      const s = readState();

      if (!s.guests.ok) {
        // Невалідне введення: жодних NaN, Infinity чи від'ємних сум — прочерки й пояснення
        setGuestsError(s.guests.error);
        updateSteppers(NaN);
        showEmpty(MESSAGES.fixHint);
        return;
      }

      setGuestsError('');
      updateSteppers(s.guests.value);
      let r;
      try {
        r = calculate({ ...s, guests: s.guests.value });
      } catch (err) {
        console.error('[cheese-board]', err); // для розробника; користувач бачить зрозумілий текст
        showEmpty('Не вдалося розрахувати. Оновіть сторінку або напишіть нам.');
        return;
      }

      last = { ...s, guests: s.guests.value, result: r };
      const g = s.guests.value;
      el.total.textContent = uah(r.total);
      setText(el.perGuest, `≈ ${uah(r.perGuest)} на гостя · ${g} ${plural(g, 'гість', 'гості', 'гостей')}` +
        (s.guests.rounded ? ' (округлено до цілого)' : ''));
      setText(el.cheese, `${weight(r.grams)} · ${r.varieties} ${plural(r.varieties, 'сорт', 'сорти', 'сортів')} · ${uah(r.cheese)}`);
      setText(el.bottles, r.bottles ? `${r.bottles} ${plural(r.bottles, 'пляшка', 'пляшки', 'пляшок')} · ${uah(r.wine)}` : 'без вина');
      setText(el.extrasSum, r.extras ? uah(r.extras) : 'без супроводу');
      setText(el.sommelierSum, r.sommelier ? uah(r.sommelier) : 'без сомельє');
      if (el.cta) el.cta.removeAttribute('aria-disabled');
    }

    // Швидке введення (утримання клавіші, автоповтор, десятки подій поспіль) → один перерахунок на кадр
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };

    // Нормалізація поля після завершення введення (change = Enter / втрата фокусу): «2.5» → «3», «007» → «7»
    function normalizeGuests() {
      const p = parseGuests(el.guests.value, el.guests.validity.badInput);
      if (p.ok && el.guests.value !== String(p.value)) el.guests.value = String(p.value);
      schedule();
    }

    function step(delta) {
      const p = parseGuests(el.guests.value, el.guests.validity.badInput);
      // З невалідного стану кнопки повертають до значення за замовчуванням
      const base = p.ok ? p.value : RULES.guests.fallback - delta;
      const next = Math.min(RULES.guests.max, Math.max(RULES.guests.min, base + delta));
      el.guests.value = String(next); // арифметика над числом: '6' + 1 не перетвориться на '61'
      render();
    }

    // У полі гостей не потрібні e, E, + і - (браузер дозволяє їх у type="number")
    el.guests.addEventListener('keydown', (e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); });
    el.guests.addEventListener('input', schedule);
    el.guests.addEventListener('change', normalizeGuests);
    el.minus?.addEventListener('click', () => step(-1));
    el.plus?.addEventListener('click', () => step(1));
    [el.format, el.wine, el.extras, el.sommelier, ...el.tiers].forEach((c) => c?.addEventListener('change', schedule));
    // Enter у полі не надсилає форму (інакше сторінка перезавантажиться) — лише нормалізує значення
    root.querySelector('form')?.addEventListener('submit', (e) => { e.preventDefault(); normalizeGuests(); });

    // «Обговорити з сомельє»: підставляє розрахунок у форму зворотного зв'язку (ЛР №9), якщо вона є
    el.cta?.addEventListener('click', (e) => {
      if (!last) { e.preventDefault(); el.guests.focus(); return; }
      const form = document.getElementById('feedbackForm');
      const topic = form && form.querySelector('#topic');
      const message = form && form.querySelector('#message');
      if (!topic || !message) return; // форми немає — звичайний перехід за посиланням
      const fmt = el.format ? el.format.options[el.format.selectedIndex].text.split(' — ')[0].toLowerCase() : 'дегустація';
      const tierName = { classic: 'Класика', craft: 'Крафт', premium: 'Преміум' }[last.tier];
      const extras = [last.wine && 'вино', last.extras && 'супровід', last.sommelier && 'сомельє'].filter(Boolean).join(', ') || 'без доповнень';
      topic.value = 'tasting';
      message.value = `Сирна тарілка: ${last.guests} ${plural(last.guests, 'гість', 'гості', 'гостей')}, ${fmt}, ` +
        `рівень «${tierName}», ${extras}. Розрахунок калькулятора: ${uah(last.result.total)}.`;
      // Лічильник символів і стан полів оновлюють власні обробники форми
      topic.dispatchEvent(new Event('change', { bubbles: true }));
      message.dispatchEvent(new Event('input', { bubbles: true }));
    });

    render();
    // Інтерфейс екземпляра — на корені віджета, без глобальних змінних (зручно для QA через Console)
    return { calculate, parseGuests, rules: RULES, get state() { return last; } };
  }

  /* ---------- 5. Запуск для кожного віджета на сторінці ---------- */
  function start() {
    document.querySelectorAll('[data-widget="cheese-board"]').forEach((root) => {
      if (root.cheeseBoard) return; // повторне підключення скрипту не створює дублікатів обробників
      const api = initCheeseBoard(root);
      if (api) Object.defineProperty(root, 'cheeseBoard', { value: Object.freeze(api) });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
