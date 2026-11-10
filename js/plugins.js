/* ==========================================================================
   Гурман-Інфо — ініціалізація JS-плагінів, підключених через CDN (ЛР №10)
   Swiper.js 11 — слайдер «Колекція пар», Fancybox v5 — галерея дегустацій,
   Typed.js 2 — ефект друку в Hero. Усі три — Vanilla JS, без jQuery.

   Скрипт підключено з defer після CDN-бібліотек, тому на момент DOMContentLoaded
   глобальні Swiper, Fancybox і Typed уже визначені. Якщо CDN недоступний,
   сторінка не ламається: слайди лишаються стрічкою з прокручуванням, фото — звичайними посиланнями.
   ========================================================================== */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    initPairsSwiper();
    initGallery();
    initTyped();
  });

  /* ---------- Swiper.js: об'єкт конфігурації слайдера ---------- */
  function initPairsSwiper() {
    if (typeof window.Swiper !== 'function') return;

    const swiper = new Swiper('.pairs-swiper', {
      loop: true,
      speed: 600, // тривалість анімації переходу, мс
      slidesPerView: 1,
      spaceBetween: 16,
      grabCursor: true,
      // Автопрогортання кожні 4 с, пауза при наведенні; вимкнено, якщо користувач просить менше руху
      autoplay: reduceMotion ? false : { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true },
      pagination: { el: '.pairs-pagination', clickable: true },
      navigation: { nextEl: '.pairs-next', prevEl: '.pairs-prev' },
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: {
        prevSlideMessage: 'Попередня пара',
        nextSlideMessage: 'Наступна пара',
        paginationBulletMessage: 'Перейти до пари {{index}}',
        slideLabelMessage: 'Пара {{index}} з {{slidesLength}}',
      },
      // Адаптивність: mobile-first, ключ — мінімальна ширина вікна
      breakpoints: {
        768: { slidesPerView: 2, spaceBetween: 24 },
        1024: { slidesPerView: 3, spaceBetween: 32 },
      },
    });

    // Кнопка «Пауза / Відтворити» — рух, що триває понад 5 с, користувач має змогу зупинити (WCAG 2.2.2)
    const toggle = document.querySelector('[data-autoplay-toggle]');
    if (!toggle) return;
    if (reduceMotion || !swiper.autoplay) { toggle.hidden = true; return; }

    toggle.addEventListener('click', () => {
      const paused = toggle.getAttribute('aria-pressed') === 'true';
      if (paused) swiper.autoplay.start();
      else swiper.autoplay.stop();
      toggle.setAttribute('aria-pressed', String(!paused));
      toggle.querySelector('[data-label]').textContent = paused ? 'Пауза' : 'Відтворити';
      toggle.querySelector('[data-icon="pause"]').classList.toggle('hidden', !paused);
      toggle.querySelector('[data-icon="play"]').classList.toggle('hidden', paused);
    });
  }

  /* ---------- Fancybox v5: прив'язка до data-атрибута ---------- */
  function initGallery() {
    if (!window.Fancybox) return;

    Fancybox.bind('[data-fancybox="tasting-gallery"]', {
      Carousel: { transition: reduceMotion ? false : 'fade' }, // плавне згасання між фото
      Images: { zoom: true, Panzoom: { maxScale: 3 } }, // наближення до 3× (колесо, щипок, подвійний тап)
      Thumbs: { type: 'classic' }, // стрічка мініатюр
      Toolbar: { display: { left: ['infobar'], middle: [], right: ['zoomIn', 'zoomOut', 'slideshow', 'fullscreen', 'close'] } },
      l10n: {
        CLOSE: 'Закрити', NEXT: 'Далі', PREV: 'Назад', MODAL: 'Закрити клавішею Esc',
        ZOOMIN: 'Наблизити', ZOOMOUT: 'Віддалити', TOGGLE_SLIDESHOW: 'Слайд-шоу', TOGGLE_FULLSCREEN: 'На весь екран',
        ERROR: 'Не вдалося завантажити фото', IMAGE_ERROR: 'Фото не знайдено',
      },
    });
  }

  /* ---------- Typed.js: ефект друку в Hero ---------- */
  function initTyped() {
    const el = document.querySelector('[data-typed]');
    // Без бібліотеки або з prefers-reduced-motion лишається статичний текст у розмітці
    if (!el || typeof window.Typed !== 'function' || reduceMotion) return;

    new Typed(el, {
      strings: ['витриманої гауди.', 'пармезану.', 'вершкового брі.', 'рокфору.'],
      typeSpeed: 55, // мс на символ
      backSpeed: 30, // швидкість стирання
      backDelay: 1800, // пауза перед стиранням
      startDelay: 600,
      loop: true,
      smartBackspace: true, // стирає лише те, що відрізняється від наступного рядка
    });
  }
})();
