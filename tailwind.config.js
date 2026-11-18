/* ==========================================================================
   Gourmet-Info — тема Tailwind CSS (дизайн-система з Figma, ЛР №4)
   Компілюється Tailwind CLI у css/tailwind.css: npm run build:css

   Що взято зі стандартної шкали Tailwind без змін:
   - відступи 4/8/12/16/24/32/48/64 px → 1 / 2 / 3 / 4 / 6 / 8 / 12 / 16;
   - радіуси 8 px (кнопки, поля) → rounded-lg, 12 px (картки) → rounded-xl;
   - текст 14/20 → text-sm, 16/24 → text-base, 24/32 → text-2xl;
   - брейкпоінти: планшет 768 px → md, десктоп 1024 px → lg;
   - висота кнопок 48 px → h-12 / min-h-12, зона дотику 44 px → min-h-11.

   Нижче — лише значення, яких у стандартній шкалі немає.
   ========================================================================== */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Самостійна робота: 5 сторінок; тема перемикається класом .dark на <html> (js/theme.js)
  darkMode: 'class',
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      /* Семантичні кольори: компоненти посилаються на роль, а не на HEX.
         Самостійна робота: значення — CSS-змінні (src/input.css) у форматі «R G B». У світлій темі вони дорівнюють
         кольорам дизайн-системи з ЛР №4, у темній (.dark) — темно-бордова палітра. Тому класи bg-surface, text-content
         тощо перемикаються самі, а утиліти dark:… потрібні лише там, де темна тема відрізняється не кольором
         (фонові фото, логотип, карта, іконки теми). <alpha-value> зберігає модифікатори прозорості (bg-background/85). */
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)', // основні дії, посилання, активні стани
          hover: 'rgb(var(--c-primary-hover) / <alpha-value>)',
          pressed: 'rgb(var(--c-primary-pressed) / <alpha-value>)',
        },
        'on-primary': 'rgb(var(--c-on-primary) / <alpha-value>)', // текст на основному кольорі
        wine: 'rgb(var(--c-wine) / <alpha-value>)', // великі бордові панелі (форма, результат калькулятора)
        'on-wine': 'rgb(var(--c-on-wine) / <alpha-value>)', // текст на бордових панелях
        secondary: '#c98a2c', // акцентні заливки, не дрібний текст
        accent: '#7a8450', // маркери та великі акцентні елементи
        background: {
          DEFAULT: 'rgb(var(--c-background) / <alpha-value>)', // основне тло
          alt: 'rgb(var(--c-background-alt) / <alpha-value>)', // вкладені та допоміжні області
        },
        surface: 'rgb(var(--c-surface) / <alpha-value>)', // картки, поля, панелі
        border: 'rgb(var(--c-border) / <alpha-value>)', // структурні межі
        content: {
          DEFAULT: 'rgb(var(--c-content) / <alpha-value>)', // заголовки та основний текст
          muted: 'rgb(var(--c-content-muted) / <alpha-value>)', // другорядний текст і підказки
        },
      },

      /* Самостійна робота — фонові фото сторінок (Unsplash, оброблені: кадрування, тонування, AVIF/WebP).
         Для кожної сторінки 4 варіанти: світла / темна тема × телефон (960 px) / десктоп (1920 px).
         Використання: bg-home-light lg:bg-home-light-lg dark:bg-home-dark lg:dark:bg-home-dark-lg —
         браузер завантажує лише те фото, правило якого спрацювало. */
      backgroundImage: Object.fromEntries(
        ['home', 'collection', 'planner', 'about', 'contact', 'cta'].flatMap((page) =>
          ['light', 'dark'].flatMap((theme) =>
            [['', 960], ['-lg', 1920]].map(([suffix, size]) => {
              const f = `../assets/images/bg/${page}-${theme}-${size}`;
              return [`${page}-${theme}${suffix}`, `image-set(url("${f}.avif") type("image/avif"), url("${f}.webp") type("image/webp"))`];
            }),
          ),
        ),
      ),

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        heading: ['Fraunces', 'Georgia', '"Times New Roman"', 'serif'],
      },

      /* Типографічна шкала: [розмір, міжрядковий інтервал].
         Мобільне значення — без суфікса, десктопне — з суфіксом -lg */
      fontSize: {
        caption: ['0.75rem', '1.125rem'], // 12/18
        h3: ['1.375rem', '1.75rem'], // 22/28 (десктоп — text-2xl)
        h2: ['1.75rem', '2.25rem'], // 28/36
        'h2-lg': ['2rem', '2.5rem'], // 32/40
        h1: ['2rem', '2.5rem'], // 32/40
        'h1-lg': ['2.75rem', '3.25rem'], // 44/52
      },

      letterSpacing: {
        caps: '0.04em', // позначки великими літерами
      },

      spacing: {
        15: '3.75rem', // 60 px — логотип на мобільному
        19: '4.75rem', // 76 px — логотип на десктопі
      },

      maxWidth: {
        container: '75rem', // 1200 px разом з полями
        form: '30rem', // 480 px — форма запиту за специфікацією
      },

      aspectRatio: {
        '4/3': '4 / 3', // велика ілюстрація на сторінці «Про нас»
      },

      borderWidth: {
        1.5: '1.5px', // межа елементів дії (Ghost-кнопка)
      },

      borderRadius: {
        panel: '1.25rem', // 20 px — великі панелі, ілюстрації
      },

      /* «Quiet depth»: стримані тіні кольору тексту */
      boxShadow: {
        subtle: '0 1px 2px rgb(var(--c-shadow) / 0.06)',
        raised: '0 4px 12px rgb(var(--c-shadow) / 0.08)',
        overlay: '0 12px 32px rgb(var(--c-shadow) / 0.12)',
      },

      transitionTimingFunction: {
        standard: 'cubic-bezier(0.33, 1, 0.68, 1)', // ease-out-cubic
      },
    },
  },
};
