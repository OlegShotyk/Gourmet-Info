/* ==========================================================================
   Гурман-Інфо — клієнтська валідація форми зворотного зв'язку (ЛР №9)
   Vanilla JS, без бібліотек.

   UX-правило: поля перевіряються при натисканні «Надіслати» (submit).
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
    box.textContent = '⚠ ' + message; // textContent: введений користувачем текст ніколи не виконується як HTML
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
    if (!REGEX_PHONE.test(value)) return 'Номер має бути у форматі +380XXXXXXXXX (12 цифр після «+»).';
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

  /* ---------- 6. Під час введення — лише зняти червоний стан ---------- */

  for (const field of Object.values(fields)) {
    const event = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(event, () => {
      if (field.getAttribute('aria-invalid') === 'true') clearError(field);
      if (field === fields.phone) updatePhoneFix(false);
    });
  }

  // Лічильник символів повідомлення — підказка, а не перевірка
  const updateCounter = () => { counter.textContent = `${fields.message.value.length} / ${MESSAGE_MAX}`; };
  fields.message.addEventListener('input', updateCounter);

  /* ---------- 7. Модальне вікно ---------- */

  const modal = document.getElementById('successModal');
  const modalTitle = document.getElementById('successTitle');
  const closeBtn = modal.querySelector('[data-modal-close]');
  const background = document.querySelectorAll('body > header, body > main, body > footer');
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

  /* ---------- 8. Submit: перевірка всіх полів ---------- */

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
