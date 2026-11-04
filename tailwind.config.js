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
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      /* Семантичні кольори: компоненти посилаються на роль, а не на HEX */
      colors: {
        primary: {
          DEFAULT: '#6b1e2b', // основні дії, посилання, активні стани
          hover: '#541722',
          pressed: '#44121b',
        },
        'on-primary': '#f5ede1', // текст на основному кольорі
        secondary: '#c98a2c', // акцентні заливки, не дрібний текст
        accent: '#7a8450', // маркери та великі акцентні елементи
        background: {
          DEFAULT: '#f5ede1', // основне тло
          alt: '#ede2d0', // вкладені та допоміжні області
        },
        surface: '#fbf7f0', // картки, поля, панелі
        border: '#e4d9c8', // структурні межі
        content: {
          DEFAULT: '#2b211c', // заголовки та основний текст
          muted: '#6b5d52', // другорядний текст і підказки
        },
      },

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
        subtle: '0 1px 2px rgb(43 33 28 / 0.06)',
        raised: '0 4px 12px rgb(43 33 28 / 0.08)',
        overlay: '0 12px 32px rgb(43 33 28 / 0.12)',
      },

      transitionTimingFunction: {
        standard: 'cubic-bezier(0.33, 1, 0.68, 1)', // ease-out-cubic
      },
    },
  },
};
