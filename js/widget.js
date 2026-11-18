/* ==========================================================================
   Гурман-Інфо — конструктор і калькулятор сирної тарілки (ЛР №11)
   Vanilla JS, без бібліотек. Користувач обирає кількість гостей, формат вечора,
   конкретні сири й вина (меню з фото, поділені на рівні Класика / Крафт / Преміум)
   або готову «перевірену пару» з секції «Колекція»; кожен сир — фіксована порція на гостя (за форматом),
   кожне вино — 1 пляшка на 3 гостей; віджет рахує вагу кожного сорту,
   кількість пляшок і орієнтовну вартість. Перерахунок миттєвий: події input і change.

   Захисне програмування (Defensive Programming):
   1. Введення: у поле гостей потрапляють лише цифри — крапку, кому, слеш, «e», «-», пробіл
      і літери відсікає фільтр (beforeinput — при наборі, input — при вставці й автозаповненні), maxlength="2".
   2. Перевірка до розрахунку: кожне значення з DOM — «брудне» (порожнє поле, 0, > 50,
      підмінені в DevTools сири / вина / пари / формат, жодного сиру, понад 5 сортів).
      Невалідний стан не рахується: замість суми — «—» і зрозуміле повідомлення біля поля.
   3. Вивід лише через textContent / createElement — дані ніколи не виконуються як HTML.

   Каталог (CATALOG) — єдине джерело цін: data.json (самостійна робота, async/await). Пункти меню будуються з нього,
   у HTML цін сирів і вин немає. Поки файл завантажується — підказка «Завантажуємо…», помилка мережі — повідомлення й кнопка повтору.
   Параметри адреси (з інших сторінок): ?pair=, ?cheese=, ?wine=, ?preset=, ?open=, ?topic=.
   Ізоляція: IIFE + 'use strict', жодних глобальних змінних; елементи шукаються всередині
   кореня [data-widget="cheese-board"] за data-cb, тому на сторінці може бути кілька віджетів.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- 1. Бізнес-правила та каталог (заморожені — не змінити з консолі) ---------- */
  const deepFreeze = (o) => { Object.values(o).forEach((v) => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };

  const RULES = deepFreeze({
    guests: { min: 1, max: 50, initial: 1, maxDigits: 2 },
    // грамів КОЖНОГО сорту на гостя: кожна позиція має власну порцію, тому додавання сиру чи вина
    // ніколи не зменшує суму (раніше загальна вага ділилась між сортами — дешевий сорт «витісняв» дорогий)
    formats: { aperitif: 30, tasting: 40, dinner: 50 },
    defaultFormat: 'tasting',
    cheeses: { max: 5 }, // скільки сортів можна покласти на тарілку (мінімум — 1)
    wines: { max: 4, guestsPerBottle: 3 }, // 1 пляшка КОЖНОГО обраного вина на 3 гостей
    extrasPerGuest: 45,
    sommelierFee: 1200,
    defaultCheeses: ['brie', 'gouda'],
  });

  const IMG = (id, size) => `https://images.unsplash.com/${id}?w=${size}&h=${size}&fit=crop&auto=format&q=60`;

  // Самостійна робота: каталог (рівні, 9 сирів, 8 вин, 6 перевірених пар) — у data.json, завантажується fetch
  // (js/data.js) перед запуском віджета і «заморожується»: ціни не змінити з консолі. Формат — як у ЛР №11.
  let CATALOG = null;

  const MESSAGES = deepFreeze({
    empty: `Вкажіть кількість гостей від ${RULES.guests.min} до ${RULES.guests.max}.`,
    notNumber: 'Кількість гостей — лише ціле число цифрами, наприклад 6.',
    tooSmall: `Потрібен щонайменше ${RULES.guests.min} гість.`,
    tooBig: `Калькулятор розрахований до ${RULES.guests.max} гостей — для більшої компанії напишіть нам у формі нижче.`,
    digitsOnly: 'Лише ціле число: крапки, коми, дроби, пробіли й літери не вводяться.',
    noCheese: 'Оберіть хоча б один сир для тарілки.',
    fixGuests: 'Виправте кількість гостей — і розрахунок оновиться.',
    fixCheese: 'Додайте хоча б один сир — і розрахунок оновиться.',
  });

  // Ті самі класи стану помилки, що й у формі зворотного зв'язку (ЛР №9) — єдина дизайн-система
  const ERROR_CLASSES = ['border-red-500', 'hover:border-red-500', 'focus-visible:border-red-500', 'focus-visible:ring-red-500/20'];

  const money = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
  const kilos = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 });
  const has = (dict, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(dict, key);

  /* ---------- 2. Чисті функції: перевірка і розрахунок (без DOM — легко тестувати з Console) ---------- */

  /**
   * Перевіряє кількість гостей. Приймає лише рядок з цифр (без крапок, ком, знаків, пробілів).
   * @returns {{ ok: true, value: number } | { ok: false, error: string }}
   */
  function parseGuests(raw) {
    const text = String(raw ?? '').trim();
    if (text === '') return { ok: false, error: MESSAGES.empty };
    if (!/^\d+$/.test(text)) return { ok: false, error: MESSAGES.notNumber }; // 2.5, 2,5, 5/2, -5, 1e3, abc
    const n = Number(text);
    if (!Number.isSafeInteger(n) || n > RULES.guests.max) return { ok: false, error: MESSAGES.tooBig };
    if (n < RULES.guests.min) return { ok: false, error: MESSAGES.tooSmall }; // 0, 00
    return { ok: true, value: n };
  }

  /** Залишає лише відомі ідентифікатори з каталогу, без повторів і не більше max */
  const cleanIds = (ids, dict, max) => [...new Set(ids)].filter((id) => has(dict, id)).slice(0, max);

  // Скільки сортів радимо для компанії (підказка, на ціну не впливає)
  const recommendedVarieties = (g) => (g <= 2 ? 2 : g <= 6 ? 3 : g <= 12 ? 4 : 5);

  /**
   * Розрахунок тарілки. Усі суми — цілі гривні, вага — цілі грами.
   * @param {{ guests: number, format: string, cheeses: string[], wines: string[], extras: boolean, sommelier: boolean }} s
   */
  function calculate(s) {
    // Кожен сорт — власна порція: гості × грамів сорту за форматом (не залежить від кількості інших сортів)
    const portion = s.guests * RULES.formats[s.format];
    const cheeseLines = s.cheeses.map((id) => {
      const c = CATALOG.cheeses[id];
      return { id, name: c.name, img: c.img, grams: portion, sum: Math.round((portion * c.price) / 100) };
    });
    const grams = portion * cheeseLines.length;
    // Кожне вино — власна кількість пляшок: 1 на 3 гостей (не ділиться з іншими винами)
    const perWine = Math.ceil(s.guests / RULES.wines.guestsPerBottle);
    const wineLines = s.wines.map((id) => {
      const w = CATALOG.wines[id];
      return { id, name: w.name, img: w.img, bottles: perWine, sum: perWine * w.price };
    });
    const bottles = perWine * wineLines.length;
    const cheese = cheeseLines.reduce((a, l) => a + l.sum, 0);
    const wine = wineLines.reduce((a, l) => a + l.sum, 0);
    const extras = s.extras ? s.guests * RULES.extrasPerGuest : 0;
    const sommelier = s.sommelier ? RULES.sommelierFee : 0;
    const total = cheese + wine + extras + sommelier;

    // Остання лінія захисту (fail-safe): не показувати NaN / Infinity / від'ємну суму
    if (!cheeseLines.length || ![grams, cheese, wine, extras, total].every((x) => Number.isFinite(x) && x >= 0)) {
      throw new RangeError('Некоректний результат розрахунку: ' + JSON.stringify(s));
    }
    return { grams, cheeseLines, wineLines, bottles, cheese, wine, extras, sommelier, total, perGuest: Math.round(total / s.guests) };
  }

  /* ---------- 3. Форматування для виводу ---------- */
  // Нерозривний пробіл (\u00a0): сума й «грн» не розриваються між рядками (Intl уже ставить його між тисячами)
  const uah = (n) => `${money.format(n)}\u00a0грн`;
  const weight = (g) => (g < 1000 ? `${money.format(g)}\u00a0г` : `${kilos.format(g / 1000)}\u00a0кг`);
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const guestsWord = (n) => `${n} ${plural(n, 'гість', 'гості', 'гостей')}`;
  const bottlesWord = (n) => `${n} ${plural(n, 'пляшка', 'пляшки', 'пляшок')}`;
  const shortList = (names, empty) => (!names.length ? empty : names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`);

  // Помічники DOM: елементи створюються через createElement, текст — лише textContent
  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  // Усі фото віджета ліниві: секція нижче першого екрана, а фото меню вантажаться лише при його відкритті
  function thumb(id, size, cls, lazy = true) {
    const img = h('img', cls);
    img.src = IMG(id, size * 2);
    img.alt = '';
    img.width = size;
    img.height = size;
    if (lazy) img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }
  const CLOSE_ICON = '<svg class="h-4 w-4 fill-current" viewBox="0 0 384 512" aria-hidden="true" focusable="false"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>';

  let instances = 0;

  /* ---------- 4. Екземпляр віджета ---------- */
  function initCheeseBoard(root) {
    const uid = ++instances;
    const $ = (name) => root.querySelector(`[data-cb="${name}"]`);
    const el = {
      guests: $('guests'), guestsError: $('guests-error'), minus: $('minus'), plus: $('plus'),
      formatPicker: $('format-picker'), formatSummary: $('format-summary'),
      pairPicker: $('pair-picker'), pairOptions: $('pair-options'), pairSummary: $('pair-summary'), pairThumbs: $('pair-thumbs'),
      cheesePicker: $('cheese-picker'), cheeseOptions: $('cheese-options'), cheeseSummary: $('cheese-summary'), cheeseThumbs: $('cheese-thumbs'),
      cheeseHint: $('cheese-hint'), cheeseError: $('cheese-error'),
      winePicker: $('wine-picker'), wineOptions: $('wine-options'), wineSummary: $('wine-summary'), wineThumbs: $('wine-thumbs'),
      boardList: $('board-list'), extras: $('extras'), sommelier: $('sommelier'),
      total: $('total'), perGuest: $('per-guest'), cheese: $('cheese'), bottles: $('bottles'),
      extrasSum: $('extras-sum'), sommelierSum: $('sommelier-sum'), cta: $('cta'),
    };

    // Відсутній DOM-елемент — не TypeError, а безпечна деградація: без поля гостей,
    // меню сирів або блоку суми рахувати нічого; без решти елементів віджет працює далі
    if (!el.guests || !el.total || !el.cheeseOptions) {
      console.warn('[cheese-board] Віджет не запущено: у розмітці немає поля гостей, меню сирів або блоку результату.');
      return null;
    }
    const missing = Object.keys(el).filter((k) => !el[k]);
    if (missing.length) console.warn('[cheese-board] Немає елементів (використано значення за замовчуванням):', missing.join(', '));

    const setText = (node, text) => { if (node) node.textContent = text; };
    const isOn = (box) => Boolean(box && box.checked);
    const summaryOf = (d) => d && d.querySelector('summary');
    let last = null; // останній коректний розрахунок (для «Обговорити з сомельє»)
    let frame = 0;
    let notice = ''; // підказка фільтра введення («лише ціле число»)
    let noticeTimer = 0;

    /* --- 4.1. Побудова меню з каталогу: групи-рівні, фото, назва, опис, ціна --- */
    function buildGroupedOptions(container, kind) {
      const dict = CATALOG[kind];
      Object.entries(CATALOG.levels).forEach(([levelId, level]) => {
        const group = h('fieldset');
        const legend = h('legend', 'picker-level', level.name);
        legend.append(h('span', '', kind === 'cheeses' ? level.cheese : level.wine));
        group.append(legend);
        Object.entries(dict).filter(([, item]) => item.level === levelId).forEach(([id, item]) => {
          const label = h('label', 'picker-option');
          const input = h('input');
          input.type = 'checkbox';
          input.name = `${kind}-${uid}`;
          input.value = id;
          input.dataset.cb = kind === 'cheeses' ? 'cheese' : 'wine';
          const text = h('span', 'flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center');
          const info = h('span', 'min-w-0');
          info.append(h('span', 'picker-name', item.name), h('span', 'picker-note', item.note));
          text.append(info, h('span', 'picker-price', kind === 'cheeses' ? `${item.price}\u00a0грн / 100\u00a0г` : uah(item.price)));
          label.append(input, thumb(item.img, 56, '', true), text);
          group.append(label);
        });
        container.append(group);
      });
      const footer = h('div', 'picker-footer');
      const status = h('span', 'hidden sm:inline'); // на телефоні лічильник є в підказці під меню
      status.dataset.cb = `${kind}-count`;
      const actions = h('span', 'ml-auto flex items-center gap-2');
      const clear = h('button', 'picker-clear', kind === 'cheeses' ? 'Очистити' : 'Без вина');
      clear.type = 'button';
      clear.dataset.pickerClear = kind === 'cheeses' ? 'cheese' : 'wine';
      const done = h('button', 'picker-done', 'Готово');
      done.type = 'button';
      done.dataset.pickerDone = '';
      actions.append(clear, done);
      footer.append(status, actions);
      container.append(footer);
    }

    function buildPairOptions(container) {
      const add = (id, name, note, img) => {
        const label = h('label', 'picker-option picker-option--pair');
        const input = h('input');
        input.type = 'radio';
        input.name = `pair-${uid}`;
        input.value = id;
        input.dataset.cb = 'pair';
        const text = h('span', 'min-w-0');
        text.append(h('span', 'picker-name', name), h('span', 'picker-note', note));
        label.append(input);
        if (img) {
          const pic = thumb(img, 56, '', true);
          pic.width = 80; // фото пари — 4:3, як у слайдері «Колекція»
          pic.src = `https://images.unsplash.com/${img}?w=160&h=112&fit=crop&auto=format&q=60`;
          label.append(pic);
        }
        label.append(text);
        container.append(label);
      };
      add('custom', 'Власний вибір', 'Сири й вина — з меню нижче');
      Object.entries(CATALOG.pairs).forEach(([id, p]) => {
        add(id, p.name, `${p.badge} · сир ${CATALOG.cheeses[p.cheese].price}\u00a0грн / 100\u00a0г, вино ${uah(CATALOG.wines[p.wine].price)}`, p.img);
      });
    }

    if (el.pairOptions) buildPairOptions(el.pairOptions);
    buildGroupedOptions(el.cheeseOptions, 'cheeses');
    if (el.wineOptions) buildGroupedOptions(el.wineOptions, 'wines');

    const boxes = (kind) => [...root.querySelectorAll(`input[data-cb="${kind}"]`)];
    const checkedIds = (kind) => boxes(kind).filter((b) => b.checked).map((b) => b.value);
    const setChecked = (kind, ids) => boxes(kind).forEach((b) => { b.checked = ids.includes(b.value); });
    setChecked('cheese', RULES.defaultCheeses);
    boxes('format').forEach((r) => { r.name = `format-${uid}`; }); // кожен екземпляр — своя група radio
    const formatRadio = () => boxes('format').find((r) => r.checked);
    const setFormat = (v) => boxes('format').forEach((r) => { r.checked = r.value === v; });

    /* --- 4.2. Читання та перевірка стану --- */
    function readState() {
      const guests = parseGuests(el.guests.value);
      // radio / checkbox могли підмінити через DevTools — беремо лише відомі значення каталогу
      const checkedFormat = formatRadio();
      const format = has(RULES.formats, checkedFormat && checkedFormat.value) ? checkedFormat.value : RULES.defaultFormat;
      if (!checkedFormat || format !== checkedFormat.value) {
        console.warn('[cheese-board] Невідомий формат:', checkedFormat ? checkedFormat.value : '(не обрано)', '→', format);
        setFormat(format);
      }
      const rawCheeses = checkedIds('cheese');
      const rawWines = checkedIds('wine');
      const cheeses = cleanIds(rawCheeses, CATALOG.cheeses, RULES.cheeses.max);
      const wines = cleanIds(rawWines, CATALOG.wines, RULES.wines.max);
      if (cheeses.length !== rawCheeses.length || wines.length !== rawWines.length) {
        console.warn('[cheese-board] Відкинуто невідомі або зайві позиції:', rawCheeses.concat(rawWines).filter((id) => !cheeses.includes(id) && !wines.includes(id)).join(', '));
        setChecked('cheese', cheeses);
        setChecked('wine', wines);
      }
      return { guests, format, cheeses, wines, extras: isOn(el.extras), sommelier: isOn(el.sommelier) };
    }

    // Стан помилки: червона рамка (Tailwind), текст під полем, aria-invalid
    function setError(control, box, message, invalid = Boolean(message)) {
      if (control) {
        ERROR_CLASSES.forEach((c) => control.classList.toggle(c, invalid));
        if (invalid) control.setAttribute('aria-invalid', 'true');
        else control.removeAttribute('aria-invalid');
      }
      setText(box, message);
      if (box) box.classList.toggle('hidden', !message);
    }

    function updateSteppers(n) {
      if (el.minus) el.minus.disabled = Number.isFinite(n) && n <= RULES.guests.min;
      if (el.plus) el.plus.disabled = Number.isFinite(n) && n >= RULES.guests.max;
      if (Number.isFinite(n)) el.guests.setAttribute('aria-valuenow', String(n));
      else el.guests.removeAttribute('aria-valuenow');
    }

    /* --- 4.3. Відображення: меню, конструктор, результат --- */
    function renderPickers(s) {
      // формат: у закритому полі — лише назва; опис порції видно в розкритому меню
      const fr = formatRadio();
      setText(el.formatSummary, fr ? fr.closest('label').querySelector('.picker-name').textContent : '');
      // сири
      setText(el.cheeseSummary, shortList(s.cheeses.map((id) => CATALOG.cheeses[id].name), 'Оберіть сири'));
      el.cheeseThumbs?.replaceChildren(...s.cheeses.slice(0, 3).map((id) => thumb(CATALOG.cheeses[id].img, 32)));
      const full = s.cheeses.length >= RULES.cheeses.max;
      boxes('cheese').forEach((b) => { b.disabled = full && !b.checked; });
      setText($('cheeses-count'), `Обрано ${s.cheeses.length} з ${RULES.cheeses.max}`);
      if (s.guests.ok) {
        const g = s.guests.value;
        const r = recommendedVarieties(g);
        setText(el.cheeseHint, `Обрано ${s.cheeses.length} з ${RULES.cheeses.max}. Для ${g} ${plural(g, 'гостя', 'гостей', 'гостей')} радимо ${r} ${plural(r, 'сорт', 'сорти', 'сортів')}.` +
          (full ? ' Досягнуто максимуму.' : ''));
      }
      // вина
      setText(el.wineSummary, shortList(s.wines.map((id) => CATALOG.wines[id].name), 'Без вина'));
      el.wineThumbs?.replaceChildren(...s.wines.slice(0, 3).map((id) => thumb(CATALOG.wines[id].img, 32)));
      const wfull = s.wines.length >= RULES.wines.max;
      boxes('wine').forEach((b) => { b.disabled = wfull && !b.checked; });
      setText($('wines-count'), s.wines.length ? `Обрано ${s.wines.length} з ${RULES.wines.max}` : 'Вино не обрано');
      // перевірена пара «вмикається», якщо на тарілці рівно її сир і її вино
      const pairId = Object.keys(CATALOG.pairs).find((id) => {
        const p = CATALOG.pairs[id];
        return s.cheeses.length === 1 && s.wines.length === 1 && s.cheeses[0] === p.cheese && s.wines[0] === p.wine;
      }) || 'custom';
      boxes('pair').forEach((r) => { r.checked = r.value === pairId; });
      const pair = CATALOG.pairs[pairId];
      setText(el.pairSummary, pair ? pair.name : 'Власний вибір');
      el.pairThumbs?.replaceChildren(...(pair ? [thumb(pair.img, 32)] : []));
    }

    // Візуальний конструктор: картки «що на тарілці» з вагою, ціною й кнопкою «прибрати»
    function renderBoard(r, s) {
      if (!el.boardList) return;
      const items = [];
      const item = (kind, id, name, img, detail) => {
        const li = h('li', 'board-item');
        const text = h('span', 'min-w-0');
        text.append(h('span', 'block truncate font-semibold', name), h('span', 'block text-sm tabular-nums text-content-muted', detail));
        const btn = h('button', 'board-remove');
        btn.type = 'button';
        btn.setAttribute('aria-label', `Прибрати: ${name}`);
        btn.dataset.remove = `${kind}:${id}`;
        btn.innerHTML = CLOSE_ICON; // статична іконка з коду, не дані користувача
        li.append(thumb(img, 48), text, btn);
        items.push(li);
      };
      if (r) {
        r.cheeseLines.forEach((l) => item('cheese', l.id, l.name, l.img, `${weight(l.grams)} · ${uah(l.sum)}`));
        r.wineLines.forEach((l) => item('wine', l.id, l.name, l.img, `${bottlesWord(l.bottles)} · ${uah(l.sum)}`));
      } else {
        // без коректного розрахунку — лише склад, без ваги й цін
        s.cheeses.forEach((id) => item('cheese', id, CATALOG.cheeses[id].name, CATALOG.cheeses[id].img, 'сир'));
        s.wines.forEach((id) => item('wine', id, CATALOG.wines[id].name, CATALOG.wines[id].img, 'вино'));
      }
      if (!items.length) items.push(h('li', 'text-sm text-content-muted sm:col-span-2', 'Поки порожньо — оберіть сири в меню вище або перевірену пару.'));
      el.boardList.replaceChildren(...items);
    }

    function showEmpty(hint) {
      last = null;
      el.total.textContent = '—';
      setText(el.perGuest, hint);
      [el.cheese, el.bottles, el.extrasSum, el.sommelierSum].forEach((d) => setText(d, '—'));
      el.cta?.setAttribute('aria-disabled', 'true');
    }

    function render() {
      frame = 0;
      // кнопки −/+, стрілки, пресети й нормалізація змінюють value без події input — запам'ятати як коректне
      if (/^\d{0,2}$/.test(el.guests.value)) lastGood = el.guests.value;
      const s = readState();
      // поле гостей: помилка — червона рамка; підказка фільтра — лише текст, поле лишається валідним
      if (!s.guests.ok) setError(el.guests, el.guestsError, notice || s.guests.error, true);
      else setError(el.guests, el.guestsError, notice, false);
      setError(summaryOf(el.cheesePicker), el.cheeseError, s.cheeses.length ? '' : MESSAGES.noCheese);
      updateSteppers(s.guests.ok ? s.guests.value : NaN);
      renderPickers(s);

      if (!s.guests.ok || !s.cheeses.length) {
        // Невалідний стан: жодних NaN, Infinity чи від'ємних сум — прочерки й пояснення
        renderBoard(null, s);
        showEmpty(!s.guests.ok ? MESSAGES.fixGuests : MESSAGES.fixCheese);
        return;
      }

      let r;
      try {
        r = calculate({ ...s, guests: s.guests.value });
      } catch (err) {
        console.error('[cheese-board]', err); // для розробника; користувач бачить зрозумілий текст
        renderBoard(null, s);
        showEmpty('Не вдалося розрахувати. Оновіть сторінку або напишіть нам.');
        return;
      }

      last = { ...s, guests: s.guests.value, result: r };
      renderBoard(r, s);
      el.total.textContent = uah(r.total);
      setText(el.perGuest, `≈ ${uah(r.perGuest)} на гостя · ${guestsWord(s.guests.value)}`);
      setText(el.cheese, `${weight(r.grams)} · ${s.cheeses.length} ${plural(s.cheeses.length, 'сорт', 'сорти', 'сортів')} · ${uah(r.cheese)}`);
      setText(el.bottles, r.bottles ? `${bottlesWord(r.bottles)} · ${uah(r.wine)}` : 'без вина');
      setText(el.extrasSum, r.extras ? uah(r.extras) : 'без супроводу');
      setText(el.sommelierSum, r.sommelier ? uah(r.sommelier) : 'без сомельє');
      el.cta?.removeAttribute('aria-disabled');
    }

    // Швидке введення (утримання клавіші, десятки подій поспіль) → один перерахунок на кадр
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };

    /* --- 4.4. Поле гостей: лише цифри --- */
    function showNotice() {
      notice = MESSAGES.digitsOnly;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { notice = ''; schedule(); }, 4000);
      schedule();
    }
    function clearNotice() { if (notice) { notice = ''; clearTimeout(noticeTimer); } }

    // Будь-який символ, крім цифри, не потрапляє в поле: крапка, кома, слеш, «e», «-», «+», пробіл, літери
    el.guests.addEventListener('beforeinput', (e) => {
      if (e.data && /\D/.test(e.data)) { e.preventDefault(); showNotice(); }
    });
    // Вставлення, перетягування, автозаповнення, клавіатури без beforeinput, зміна value скриптом:
    // значення з будь-яким нецифровим символом не приймається — повертається попереднє («2.5» не стане «25», «3.7» — «37»).
    // Саму вставку не блокуємо (paste без preventDefault): це вимога доступності й аудит Lighthouse «paste-preventing-inputs»
    let lastGood = /^\d{0,2}$/.test(el.guests.value) ? el.guests.value : String(RULES.guests.initial);
    el.guests.addEventListener('input', () => {
      const v = el.guests.value;
      if (/^\d*$/.test(v)) lastGood = v.slice(0, RULES.guests.maxDigits);
      else showNotice();
      if (el.guests.value !== lastGood) el.guests.value = lastGood;
      schedule(); // підказка лишається 4 с: пояснює, чому символ не ввівся
    });
    // Нормалізація після завершення введення: «07» → «7»
    el.guests.addEventListener('change', () => {
      const p = parseGuests(el.guests.value);
      if (p.ok && el.guests.value !== String(p.value)) el.guests.value = String(p.value);
      schedule();
    });

    function step(delta) {
      const p = parseGuests(el.guests.value);
      const base = p.ok ? p.value : RULES.guests.initial - delta; // з невалідного стану — до початкового значення
      const next = Math.min(RULES.guests.max, Math.max(RULES.guests.min, base + delta));
      el.guests.value = String(next); // арифметика над числом: '6' + 1 не перетвориться на '61'
      clearNotice();
      render();
      return next !== base; // false — уперлися в межу 1 або 50
    }
    // Роль spinbutton: стрілки ↑ ↓ змінюють значення, як у звичайному числовому полі
    el.guests.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp' ? 1 : -1); }
    });

    // Кнопки −/+: клік — крок 1; утримання — повтор із прискоренням (затримка 400 мс, далі 150 → 50 мс)
    function holdToRepeat(button, delta) {
      if (!button) return;
      let timer = 0;
      let count = 0;
      const stop = () => { clearTimeout(timer); timer = 0; };
      const tick = () => {
        if (!step(delta) || button.disabled) { stop(); return; } // межа — зупинка
        count += 1;
        timer = setTimeout(tick, count < 5 ? 150 : count < 15 ? 90 : 50);
      };
      button.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || button.disabled) return;
        e.preventDefault(); // без виділення тексту й «довгого натискання» на телефоні; фокус ставимо вручну
        button.focus({ preventScroll: true });
        button.setPointerCapture?.(e.pointerId);
        stop();
        count = 0;
        if (step(delta)) timer = setTimeout(tick, 400);
      });
      ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach((type) => button.addEventListener(type, stop));
      button.addEventListener('contextmenu', (e) => e.preventDefault());
      // Клавіатура (Enter / Space): click з detail = 0; утримання Enter повторюється автоповтором клавіатури
      button.addEventListener('click', (e) => { if (e.detail === 0) step(delta); });
    }
    holdToRepeat(el.minus, -1);
    holdToRepeat(el.plus, 1);

    /* --- 4.5. Меню вибору, конструктор, опції --- */
    [el.extras, el.sommelier].forEach((c) => c?.addEventListener('change', schedule));
    root.addEventListener('change', (e) => {
      const cb = e.target && e.target.dataset ? e.target.dataset.cb : '';
      if (cb === 'cheese' || cb === 'wine') schedule();
      if (cb === 'format') { // один вибір — меню закривається, фокус повертається на поле
        render();
        if (el.formatPicker) { el.formatPicker.open = false; summaryOf(el.formatPicker).focus(); }
      }
      if (cb === 'pair') {
        const p = CATALOG.pairs[e.target.value];
        // перевірена пара замінює склад тарілки на її сир і вино; «Власний вибір» нічого не стирає
        if (p) { setChecked('cheese', [p.cheese]); setChecked('wine', [p.wine]); }
        render();
        if (p && el.pairPicker) { el.pairPicker.open = false; summaryOf(el.pairPicker).focus(); }
      }
    });
    root.addEventListener('click', (e) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const remove = t.closest('[data-remove]');
      if (remove) {
        const [kind, id] = remove.dataset.remove.split(':');
        boxes(kind).forEach((b) => { if (b.value === id) b.checked = false; });
        render();
        // фокус не губиться: на наступну картку або на меню відповідного виду
        const next = el.boardList && el.boardList.querySelector('[data-remove]');
        (next || summaryOf(kind === 'cheese' ? el.cheesePicker : el.winePicker))?.focus();
        return;
      }
      const clear = t.closest('[data-picker-clear]');
      if (clear) { setChecked(clear.dataset.pickerClear, []); render(); return; }
      if (t.closest('[data-picker-done]')) {
        const d = t.closest('details');
        if (d) { d.open = false; summaryOf(d).focus(); }
      }
    });

    // Меню: одночасно відкрите лише одне; закриття клавішею Esc і кліком поза меню
    const pickers = [el.formatPicker, el.pairPicker, el.cheesePicker, el.winePicker].filter(Boolean);
    pickers.forEach((d) => {
      d.addEventListener('toggle', () => { if (d.open) pickers.forEach((o) => { if (o !== d) o.open = false; }); });
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && d.open) { e.preventDefault(); d.open = false; summaryOf(d).focus(); }
      });
    });
    document.addEventListener('click', (e) => {
      pickers.forEach((d) => { if (d.open && !d.contains(e.target)) d.open = false; });
    });

    // Enter у полі не надсилає форму (інакше сторінка перезавантажиться)
    root.querySelector('form')?.addEventListener('submit', (e) => { e.preventDefault(); el.guests.dispatchEvent(new Event('change')); });

    /* --- 4.6. «Обговорити з сомельє»: розрахунок → форма зворотного зв'язку (ЛР №9) --- */
    el.cta?.addEventListener('click', (e) => {
      if (!last) {
        e.preventDefault();
        (parseGuests(el.guests.value).ok ? summaryOf(el.cheesePicker) : el.guests)?.focus();
        return;
      }
      const fmt = (el.formatSummary ? el.formatSummary.textContent : 'Дегустація').toLowerCase();
      const cheeses = last.result.cheeseLines.map((l) => `${l.name} ${weight(l.grams)}`).join(', ');
      const wines = last.result.wineLines.map((l) => `${l.name} × ${l.bottles}`).join(', ') || 'без вина';
      const opts = [last.extras && 'супровід', last.sommelier && 'сомельє'].filter(Boolean).join(', ');
      const text = `Сирна тарілка: ${guestsWord(last.guests)}, ${fmt}. Сири: ${cheeses}. Вино: ${wines}.` +
        (opts ? ` Додатково: ${opts}.` : '') + ` Розрахунок калькулятора: ${uah(last.result.total)}.`;
      const form = document.getElementById('feedbackForm');
      const topic = form && form.querySelector('#topic');
      const message = form && form.querySelector('#message');
      if (!topic || !message) {
        // Самостійна робота: форма — на іншій сторінці (contact.html). Склад тарілки передається через sessionStorage
        // (лише в межах цієї вкладки, без сервера); js/validation.js підставить його в поле «Повідомлення»
        try { sessionStorage.setItem('gourmet-board', text); } catch { /* без передачі — звичайний перехід */ }
        return;
      }
      if (!topic.value) topic.value = 'tasting'; // тему, обрану кнопкою «Обрати формат», не перезаписуємо
      message.value = text;
      // лічильник символів і стан полів оновлюють власні обробники форми
      topic.dispatchEvent(new Event('change', { bubbles: true }));
      message.dispatchEvent(new Event('input', { bubbles: true }));
    });

    /* --- 4.7. Пресети з інших секцій («Обрати формат», «Підібрати пару») --- */
    function applyPreset(name) {
      const presets = {
        consult: () => { if (el.sommelier) el.sommelier.checked = true; }, // персональна консультація — з сомельє
        company: () => { // дегустація для компанії
          setFormat('tasting');
          const p = parseGuests(el.guests.value);
          if (!p.ok || p.value < 10) el.guests.value = '10';
        },
        menu: () => setFormat('dinner'), // підбір до меню — сирна вечеря
      };
      if (has(presets, name)) { presets[name](); clearNotice(); render(); }
    }
    function openPicker(name) {
      const d = { format: el.formatPicker, pair: el.pairPicker, cheese: el.cheesePicker, wine: el.winePicker }[name];
      if (!d) return;
      d.open = true;
      summaryOf(d).focus({ preventScroll: true });
    }

    /* --- 4.8. Параметри адреси: перехід з інших сторінок (каталог, «Обрати формат», «Підібрати пару») --- */
    function applyFromURL(params) {
      const pair = params.get('pair');
      const cheese = params.get('cheese');
      const wine = params.get('wine');
      if (has(CATALOG.pairs, pair)) {
        setChecked('cheese', [CATALOG.pairs[pair].cheese]);
        setChecked('wine', [CATALOG.pairs[pair].wine]);
      }
      // окремий сир / вино додається до тарілки за замовчуванням (не більше дозволеної кількості)
      if (has(CATALOG.cheeses, cheese)) setChecked('cheese', cleanIds([...checkedIds('cheese'), cheese].reverse(), CATALOG.cheeses, RULES.cheeses.max));
      if (has(CATALOG.wines, wine)) setChecked('wine', cleanIds([...checkedIds('wine'), wine], CATALOG.wines, RULES.wines.max));
      const preset = params.get('preset');
      if (preset) applyPreset(preset); // невідомий пресет ігнорується всередині applyPreset
      // тема для форми контактів — у посиланні «Обговорити з сомельє»
      const topic = params.get('topic');
      if (el.cta && /^[a-z]{3,20}$/.test(topic || '')) el.cta.href = `contact.html?topic=${topic}#feedbackForm`;
      render();
      if (pair || cheese || wine) root.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (params.get('open')) setTimeout(() => openPicker(params.get('open')), 300);
    }

    render();
    // Інтерфейс екземпляра — на корені віджета, без глобальних змінних (зручно для QA через Console)
    return { calculate, parseGuests, rules: RULES, catalog: CATALOG, applyPreset, openPicker, applyFromURL, get state() { return last; } };
  }

  /* ---------- 5. Запуск: спершу каталог з data.json, потім кожен віджет на сторінці ---------- */
  async function start() {
    const roots = [...document.querySelectorAll('[data-widget="cheese-board"]')];
    if (!roots.length) return;
    try {
      if (!window.GourmetData) throw new Error('js/data.js не підключено');
      CATALOG = deepFreeze(structuredClone(await window.GourmetData.load()));
    } catch {
      // Без каталогу рахувати нічого: замість порожніх меню — пояснення й повтор запиту
      roots.forEach((root) => {
        const box = window.GourmetData
          ? window.GourmetData.errorBox('Не вдалося завантажити каталог сирів і вин, тому калькулятор недоступний. Перевірте з’єднання з інтернетом.', () => { box.remove(); start(); })
          : document.createTextNode('Калькулятор тимчасово недоступний.');
        root.prepend(box);
        root.querySelector('[data-cb="loading"]')?.remove();
      });
      return;
    }
    roots.forEach((root) => {
      if (root.cheeseBoard) return; // повторне підключення скрипту не створює дублікатів обробників
      root.querySelectorAll('[role="alert"]').forEach((n) => n.remove());
      const api = initCheeseBoard(root);
      if (api) {
        Object.defineProperty(root, 'cheeseBoard', { value: Object.freeze(api) });
        api.applyFromURL(new URLSearchParams(location.search));
      }
    });
    if (document.documentElement.dataset.plannerLinks) return; // один делегований обробник на сторінку
    document.documentElement.dataset.plannerLinks = 'on';

    // Посилання з data-planner-preset / data-planner-open у межах сторінки калькулятора налаштовують його без переходу
    document.addEventListener('click', (e) => {
      const link = e.target instanceof Element ? e.target.closest('[data-planner-preset], [data-planner-open]') : null;
      if (!link) return;
      const api = document.querySelector('[data-widget="cheese-board"]')?.cheeseBoard;
      if (!api) return;
      if (link.dataset.plannerPreset) api.applyPreset(link.dataset.plannerPreset);
      if (link.dataset.plannerOpen) setTimeout(() => api.openPicker(link.dataset.plannerOpen), 500);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
