/* ==========================================================================
   Гурман-Інфо — клієнтська валідація форми зворотного зв'язку (ЛР №9)
   Vanilla JS, без бібліотек.

   UX-правило: поля перевіряються при натисканні «Надіслати» (submit).
   Виняток — телефон: код +380 / +38 дописується автоматично, а коли введено достатньо
   символів, поле одразу перевіряється на літери, пробіли й інші сторонні символи.
   Поки користувач виправляє поле з помилкою, червоний стан знімається (clearError),
   а повторна перевірка відбувається під час наступного натискання «Надіслати».

   Реального надсилання на сервер немає: після успішної перевірки
   форма очищується і показується модальне вікно «Демонстрація успішного надсилання».
   ========================================================================== */

(() => {
  /* ---------- 1. Регулярні вирази та обмеження ----------
     Обов'язкові: ім'я, емейл, телефон, тема, згода. Повідомлення — необов'язкове. */

  // Ім'я: літери української/латинської абеток; між частинами — пробіл, апостроф або дефіс
  // (Ірина, Анна-Марія, Мар'яна, Олег Шотик). Цифри, емоджі й HTML-символи не проходять.
  const REGEX_NAME = /^[A-Za-zА-ЩЬЮЯҐЄІЇа-щьюяґєії]+(?:[ '’ʼ-][A-Za-zА-ЩЬЮЯҐЄІЇа-щьюяґєії]+)*$/u;

  // Емейл: локальна частина @ домен . зона з 2+ літер; дві крапки поспіль заборонені
  const REGEX_EMAIL = /^(?!.*\.\.)[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

  // Телефон: строго +380 і ще 9 цифр, без пробілів, дужок і дефісів
  const REGEX_PHONE = /^\+380\d{9}$/;

  const NAME_MIN = 2;
  const NAME_MAX = 50;
  const MESSAGE_MIN = 10;
  const MESSAGE_MAX = 1000;
  // Телефон: з якої довжини введення перевіряти сторонні символи (найкоротший повний запис — 9 цифр без коду)
  const PHONE_CHECK_LENGTH = 9;

  /* ---------- 2. Елементи форми ---------- */

  const form = document.getElementById('feedbackForm');
  if (!form) return;

  const fields = {
    username: document.getElementById('username'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    topic: document.getElementById('topic'),
    message: document.getElementById('message'),
    agreement: document.getElementById('agreement'),
  };
  const submitBtn = document.getElementById('submitBtn');
  const status = document.getElementById('formStatus');
  const phoneFix = document.getElementById('phoneFix');
  const counter = document.getElementById('messageCounter');

  // Класи станів (Tailwind). Повні назви класів у коді, щоб Tailwind CLI їх знайшов і скомпілював
  const ERROR_CLASSES = ['border-red-500', 'hover:border-red-500', 'focus-visible:border-red-500', 'focus-visible:ring-red-500/20'];
  const SUCCESS_CLASSES = ['border-green-600', 'hover:border-green-600', 'focus-visible:border-green-600', 'focus-visible:ring-green-600/20'];

  /* ---------- 3. Функції керування UI-станами ---------- */

  const errorEl = (field) => document.getElementById(field.id + 'Error');
  const successIcon = (field) => field.parentElement.querySelector('.form-success-icon');

  // Error: червона рамка, текст під полем, aria-invalid="true"
  function showError(field, message) {
    const box = errorEl(field);
    if (field.type !== 'checkbox') {
      field.classList.remove(...SUCCESS_CLASSES);
      field.classList.add(...ERROR_CLASSES);
    } else {
      field.classList.add('outline', 'outline-2', 'outline-red-500');
    }
    successIcon(field)?.classList.add('hidden');
    box.textContent = message; // textContent: введений користувачем текст ніколи не виконується як HTML
    box.classList.remove('hidden');
    field.setAttribute('aria-invalid', 'true');
  }

  // Success: зелена рамка та галочка, повідомлення приховане, aria-invalid="false"
  function showSuccess(field) {
    clearError(field);
    if (field.type !== 'checkbox') field.classList.add(...SUCCESS_CLASSES);
    successIcon(field)?.classList.remove('hidden');
    field.setAttribute('aria-invalid', 'false');
  }

  // Normal: прибрати і помилку, і успіх
  function clearError(field) {
    const box = errorEl(field);
    field.classList.remove(...ERROR_CLASSES, ...SUCCESS_CLASSES, 'outline', 'outline-2', 'outline-red-500');
    successIcon(field)?.classList.add('hidden');
    box.textContent = '';
    box.classList.add('hidden');
    field.removeAttribute('aria-invalid');
  }

  /* ---------- 4. Функції валідації (повертають текст помилки або '') ---------- */

  function validateName() {
    const value = fields.username.value.trim();
    if (value === '') return 'Введіть ваше ім’я.';
    if (value.length < NAME_MIN) return `Ім’я має містити щонайменше ${NAME_MIN} літери.`;
    if (value.length > NAME_MAX) return `Ім’я не може бути довшим за ${NAME_MAX} символів.`;
    if (!REGEX_NAME.test(value)) return 'Використовуйте лише літери, пробіл, апостроф або дефіс.';
    return '';
  }

  function validateEmail() {
    const value = fields.email.value.trim();
    if (value === '') return 'Введіть електронну пошту.';
    if (!REGEX_EMAIL.test(value)) return 'Введіть коректну адресу, наприклад user@gmail.com.';
    return '';
  }

  function validatePhone() {
    const value = fields.phone.value.trim();
    if (value === '') return 'Введіть номер телефону.';
    const problem = phoneCharsProblem(value);
    if (problem) return problem;
    if (!REGEX_PHONE.test(value)) return 'Номер має бути у форматі +380XXXXXXXXX (12 цифр після «+»).';
    return '';
  }

  // Сторонні символи та зайві цифри: повертає зрозумілий опис проблеми або ''
  function phoneCharsProblem(value) {
    const found = [];
    if (/\p{L}/u.test(value)) found.push('літери');
    if (/\s/.test(value)) found.push('пробіли');
    if (/[^\p{L}\s\d+]/u.test(value) || /.\+/.test(value)) found.push('інші символи (дужки, дефіси тощо)');
    if (found.length) return `Номер містить недопустимі символи: ${found.join(', ')}. Залиште лише цифри та «+» на початку.`;
    if (/^\+380\d{10,}$/.test(value)) return 'Забагато цифр: після +380 має бути рівно 9 цифр.';
    if (/^\+(?!380)/.test(value) && value.length >= PHONE_CHECK_LENGTH) return 'Номер має починатися з +380.';
    return '';
  }

  function validateTopic() {
    return fields.topic.value === '' ? 'Оберіть тему звернення.' : '';
  }

  // Повідомлення необов'язкове: порожнє поле (або лише пробіли) проходить перевірку,
  // а введений текст має бути змістовним — щонайменше 10 символів
  function validateMessage() {
    const length = fields.message.value.trim().length;
    if (length === 0) return '';
    if (length < MESSAGE_MIN) return `Повідомлення закоротке: ${length} з ${MESSAGE_MIN} символів.`;
    if (length > MESSAGE_MAX) return `Повідомлення задовге: максимум ${MESSAGE_MAX} символів.`;
    return '';
  }

  function validateAgreement() {
    return fields.agreement.checked ? '' : 'Потрібна згода на обробку персональних даних.';
  }

  const validators = [
    [fields.username, validateName],
    [fields.email, validateEmail],
    [fields.phone, validatePhone],
    [fields.topic, validateTopic],
    [fields.message, validateMessage],
    [fields.agreement, validateAgreement],
  ];

  /* ---------- 5. Телефон: підказка-виправлення (Edge Cases) ----------
     Якщо номер очевидно правильний, але в іншому записі (0501234567, 380501234567,
     +38 (050) 123-45-67), пропонуємо кнопку «Підставити +380…». Введення без згоди
     користувача не змінюється, а правило RegEx лишається суворим. */

  function suggestPhone(raw) {
    const digits = raw.replace(/[\s()-]/g, '');
    if (/^0\d{9}$/.test(digits)) return '+38' + digits;
    if (/^380\d{9}$/.test(digits)) return '+' + digits;
    if (REGEX_PHONE.test(digits)) return digits;
    return '';
  }

  function updatePhoneFix(hasError) {
    const suggestion = hasError ? suggestPhone(fields.phone.value.trim()) : '';
    phoneFix.classList.toggle('hidden', !suggestion);
    phoneFix.textContent = suggestion ? `Підставити ${suggestion}` : '';
    phoneFix.dataset.value = suggestion;
  }

  phoneFix.addEventListener('click', () => {
    fields.phone.value = phoneFix.dataset.value;
    clearError(fields.phone);
    updatePhoneFix(false);
    fields.phone.focus();
  });

  /* ---------- 6. Телефон під час введення: автодоповнення коду та перевірка символів ----------
     Коли введено достатньо цифр, код країни дописується автоматично:
       501234567    (9 цифр, без 0)  → +380501234567
       0501234567   (10 цифр, з 0)   → +38 + 0501234567
       380501234567 (12 цифр)        → + 380501234567
     9 цифр, що починаються з 38, не доповнюються: так починається й номер 380…, який ще набирають
     (кодів операторів на 38 в Україні немає).
     Щойно довжина введення досягає PHONE_CHECK_LENGTH, поле перевіряється на літери, пробіли
     та інші сторонні символи; повний правильний номер одразу позначається як успішний. */

  function autoPrefixPhone(value) {
    if (/^0\d{9}$/.test(value)) return '+38' + value;
    if (/^380\d{9}$/.test(value)) return '+' + value;
    if (/^[1-9]\d{8}$/.test(value) && !value.startsWith('38')) return '+380' + value;
    return '';
  }

  fields.phone.addEventListener('input', (event) => {
    const phone = fields.phone;
    updatePhoneFix(false);

    // Під час видалення нічого не дописуємо — інакше користувач не зміг би стерти код
    if (!event.inputType || !event.inputType.startsWith('delete')) {
      const completed = autoPrefixPhone(phone.value);
      if (completed) {
        phone.value = completed;
        phone.setSelectionRange(completed.length, completed.length);
        status.textContent = `Номер доповнено кодом країни: ${completed}`; // озвучення для читачів екрана
      }
    }

    const value = phone.value;
    if (value.length < PHONE_CHECK_LENGTH) {
      if (phone.hasAttribute('aria-invalid')) clearError(phone); // ще набирає — без нагадувань
      return;
    }
    const problem = phoneCharsProblem(value);
    if (problem) { showError(phone, problem); updatePhoneFix(true); }
    else if (REGEX_PHONE.test(value)) showSuccess(phone);
    else if (phone.hasAttribute('aria-invalid')) clearError(phone);
  });

  /* ---------- 7. Інші поля під час введення — лише зняти червоний стан ---------- */

  for (const field of Object.values(fields)) {
    if (field === fields.phone) continue;
    const event = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(event, () => {
      if (field.getAttribute('aria-invalid') === 'true') clearError(field);
    });
  }

  // Лічильник символів повідомлення — підказка, а не перевірка
  const updateCounter = () => { counter.textContent = `${fields.message.value.length} / ${MESSAGE_MAX}`; };
  fields.message.addEventListener('input', updateCounter);

  /* ---------- 8. Модальне вікно ---------- */

  const modal = document.getElementById('successModal');
  const modalTitle = document.getElementById('successTitle');
  const closeBtn = modal.querySelector('[data-modal-close]');
  // Усе, що на сторінці поза модальним вікном (посилання «Перейти до вмісту», header, main, footer)
  const background = [...document.body.children].filter((el) => el !== modal && el.tagName !== 'SCRIPT');
  let lastFocused = null;

  function openModal(name) {
    lastFocused = submitBtn; // після закриття фокус повертається на кнопку «Надіслати»
    modalTitle.textContent = `Дякуємо, ${name}!`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    background.forEach((el) => { el.inert = true; }); // фон недоступний для миші, Tab і читачів екрана
    document.documentElement.classList.add('overflow-hidden'); // сторінка під вікном не прокручується
    closeBtn.focus();
    document.addEventListener('keydown', onModalKeydown);
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    background.forEach((el) => { el.inert = false; });
    document.documentElement.classList.remove('overflow-hidden');
    document.removeEventListener('keydown', onModalKeydown);
    lastFocused.focus();
  }

  function onModalKeydown(event) {
    if (event.key === 'Escape') closeModal();
    // У вікні одна кнопка — Tab / Shift+Tab тримають фокус на ній (focus trap)
    if (event.key === 'Tab') { event.preventDefault(); closeBtn.focus(); }
  }

  closeBtn.addEventListener('click', closeModal);
  // Оверлей — окремий елемент поруч із карткою, тож клік по картці сюди не потрапляє
  modal.querySelector('[data-modal-overlay]').addEventListener('click', closeModal);

  /* ---------- 9. Submit: перевірка всіх полів ---------- */

  let isSubmitting = false;

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // без бекенду сторінка не перезавантажується і дані нікуди не йдуть
    if (isSubmitting) return; // захист від швидкого повторного натискання

    const invalid = [];
    for (const [field, validate] of validators) {
      const message = validate();
      if (message) { showError(field, message); invalid.push(field); }
      else if (field === fields.message && field.value.trim() === '') clearError(field); // порожнє необов'язкове поле — нейтральний стан
      else showSuccess(field);
    }
    updatePhoneFix(invalid.includes(fields.phone));

    if (invalid.length > 0) {
      status.textContent = `Форму не надіслано: перевірте поля (${invalid.length}).`;
      invalid[0].focus(); // фокус на перше поле з помилкою — читач екрана озвучить його помилку
      return;
    }

    // Імітація надсилання: коротка пауза, стан кнопки, очищення форми, модальне вікно
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Надсилання…';
    const name = fields.username.value.trim();

    setTimeout(() => {
      form.reset();
      Object.values(fields).forEach(clearError);
      updateCounter();
      status.textContent = 'Форма успішно пройшла перевірку.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Надіслати';
      isSubmitting = false;
      openModal(name);
    }, 600);
  });
})();
