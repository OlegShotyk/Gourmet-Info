/* ==========================================================================
   Гурман-Інфо — каталог колекції з фільтрами (самостійна робота)
   Дані: data.json (js/data.js, fetch + async/await). Рендер карток — createElement + textContent:
   дані з файлу ніколи не виконуються як HTML.
   Фільтри: категорія (radio), рівень (select), пошук (рядок, до 40 символів), сортування.
   Стан фільтрів синхронізується з адресою сторінки (history.replaceState): ?kind=wines&level=premium
   відкриває ту саму добірку після оновлення сторінки або за надісланим посиланням.
   ========================================================================== */

(() => {
  'use strict';

  const form = document.querySelector('[data-catalog-filters]');
  const list = document.querySelector('[data-catalog-list]');
  const count = document.querySelector('[data-catalog-count]');
  if (!form || !list || !count || !window.GourmetData) return;

  const KINDS = ['all', 'cheeses', 'wines', 'pairs'];
  const SORTS = ['default', 'price-asc', 'price-desc', 'name'];
  const money = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
  const KIND_LABEL = { cheeses: 'Сир', wines: 'Вино', pairs: 'Перевірена пара' };
  const PARAM = { cheeses: 'cheese', wines: 'wine', pairs: 'pair' }; // ?cheese=brie — параметр калькулятора

  let items = [];
  let levels = {};

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Один плоский список із трьох розділів data.json; ціна пари — сир (100 г) + пляшка вина
  function flatten(data) {
    const out = [];
    Object.entries(data.cheeses).forEach(([id, c]) => out.push({ kind: 'cheeses', id, ...c, priceLabel: `${c.price} грн / 100 г`, sortPrice: c.price }));
    Object.entries(data.wines).forEach(([id, w]) => out.push({ kind: 'wines', id, ...w, priceLabel: `${money.format(w.price)} грн / пляшка`, sortPrice: w.price }));
    Object.entries(data.pairs).forEach(([id, p]) => {
      const c = data.cheeses[p.cheese];
      const w = data.wines[p.wine];
      out.push({
        kind: 'pairs', id, name: p.name, note: p.text, img: p.img, alt: p.alt, badge: p.badge,
        level: w.level, priceLabel: `сир ${c.price} грн / 100 г · вино ${money.format(w.price)} грн`, sortPrice: c.price + w.price,
      });
    });
    return out;
  }

  // Пошук без урахування регістру й апострофів різних видів (м’який / м'який)
  const norm = (s) => String(s).toLocaleLowerCase('uk').replace(/[’ʼ']/g, '\'').trim();

  function readFilters() {
    const fd = new FormData(form);
    const kind = KINDS.includes(fd.get('kind')) ? fd.get('kind') : 'all';
    const level = Object.hasOwn(levels, fd.get('level')) ? fd.get('level') : '';
    const sort = SORTS.includes(fd.get('sort')) ? fd.get('sort') : 'default';
    const q = String(fd.get('q') || '').slice(0, 40);
    return { kind, level, sort, q };
  }

  function writeURL(f) {
    const params = new URLSearchParams();
    if (f.kind !== 'all') params.set('kind', f.kind);
    if (f.level) params.set('level', f.level);
    if (f.q.trim()) params.set('q', f.q.trim());
    if (f.sort !== 'default') params.set('sort', f.sort);
    const query = params.toString();
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
  }

  function readURL() {
    const p = new URLSearchParams(location.search);
    const kind = form.querySelector(`input[name="kind"][value="${KINDS.includes(p.get('kind')) ? p.get('kind') : 'all'}"]`);
    if (kind) kind.checked = true;
    if (Object.hasOwn(levels, p.get('level'))) form.elements.level.value = p.get('level');
    if (SORTS.includes(p.get('sort'))) form.elements.sort.value = p.get('sort');
    form.elements.q.value = (p.get('q') || '').slice(0, 40);
  }

  function card(item) {
    const li = h('li');
    const article = h('article', 'flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-subtle transition-shadow duration-150 ease-standard hover:shadow-raised');
    const img = h('img', 'aspect-4/3 w-full object-cover');
    img.src = window.GourmetData.img(item.img, 600, 450);
    img.alt = item.alt || `${KIND_LABEL[item.kind]}: ${item.name}`;
    img.width = 600;
    img.height = 450;
    img.loading = 'lazy';
    img.decoding = 'async';
    const body = h('div', 'flex flex-1 flex-col gap-3 p-5');
    const meta = h('p', 'flex flex-wrap gap-2 text-caption font-semibold');
    meta.append(h('span', 'rounded-full bg-background-alt px-3 py-1 text-primary', KIND_LABEL[item.kind]));
    meta.append(h('span', 'rounded-full border border-border px-3 py-1 text-content-muted', item.badge || levels[item.level].name));
    const title = h('h3', 'font-heading text-h3 font-semibold', item.name);
    const note = h('p', 'text-sm text-content-muted', item.note);
    const price = h('p', 'mt-auto text-sm font-semibold tabular-nums text-primary', item.priceLabel);
    const link = h('a', 'inline-flex min-h-12 items-center justify-center rounded-lg border-1.5 border-primary px-5 text-sm font-semibold text-primary transition-colors duration-150 ease-standard hover:bg-primary hover:text-on-primary',
      item.kind === 'pairs' ? 'Розрахувати пару' : 'Додати в калькулятор');
    link.href = `planner.html?${PARAM[item.kind]}=${encodeURIComponent(item.id)}`;
    link.setAttribute('aria-label', `${link.textContent}: ${item.name}`);
    body.append(meta, title, note, price, link);
    article.append(img, body);
    li.append(article);
    return li;
  }

  const plural = (n) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'позиція';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'позиції';
    return 'позицій';
  };

  function render() {
    const f = readFilters();
    const q = norm(f.q);
    let shown = items.filter((i) => (f.kind === 'all' || i.kind === f.kind) && (!f.level || i.level === f.level) &&
      (!q || norm(`${i.name} ${i.note} ${i.badge || ''}`).includes(q)));
    if (f.sort === 'price-asc') shown = [...shown].sort((a, b) => a.sortPrice - b.sortPrice);
    if (f.sort === 'price-desc') shown = [...shown].sort((a, b) => b.sortPrice - a.sortPrice);
    if (f.sort === 'name') shown = [...shown].sort((a, b) => a.name.localeCompare(b.name, 'uk'));

    if (!shown.length) {
      const empty = h('li', 'flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-6 sm:col-span-2 lg:col-span-3');
      empty.append(h('p', 'font-semibold', 'Нічого не знайдено.'), h('p', 'text-sm text-content-muted', 'Спробуйте інше слово або скиньте фільтри.'));
      const reset = h('button', 'inline-flex min-h-12 cursor-pointer items-center rounded-lg border-1.5 border-primary px-5 text-sm font-semibold text-primary hover:bg-background-alt', 'Скинути фільтри');
      reset.type = 'button';
      reset.addEventListener('click', () => { form.reset(); render(); form.querySelector('input[name="kind"]').focus(); });
      empty.append(reset);
      list.replaceChildren(empty);
    } else {
      list.replaceChildren(...shown.map(card));
    }
    count.textContent = `Знайдено ${shown.length} ${plural(shown.length)} з ${items.length}.`;
    writeURL(f);
  }

  // Пошук — після паузи у введенні (не перебудовувати список на кожну літеру); решта — одразу
  let timer = 0;
  form.addEventListener('input', (e) => {
    clearTimeout(timer);
    if (e.target.name === 'q') timer = setTimeout(render, 200);
    else render();
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); render(); }); // Enter у полі пошуку

  async function start() {
    count.textContent = 'Завантажуємо каталог…';
    list.setAttribute('aria-busy', 'true');
    try {
      const data = await window.GourmetData.load();
      levels = data.levels;
      items = flatten(data);
      readURL();
      render();
    } catch {
      count.textContent = '';
      list.replaceChildren(h('li', 'sm:col-span-2 lg:col-span-3'));
      list.firstChild.append(window.GourmetData.errorBox('Не вдалося завантажити каталог. Перевірте з’єднання з інтернетом і спробуйте ще раз.', start));
    } finally {
      list.removeAttribute('aria-busy');
    }
  }
  start();
})();
