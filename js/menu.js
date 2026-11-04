// Мобільне меню: кнопка-гамбургер відкриває й закриває панель навігації.
// Стан передається через aria-expanded і атрибут hidden — без зайвих класів.
// Код у власному блоці: звичайні <script> ділять глобальну область з іншими скриптами сторінки.
{
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById(toggle?.getAttribute('aria-controls'));

  if (toggle && menu) {
    const iconOpen = toggle.querySelector('[data-icon="open"]');
    const iconClose = toggle.querySelector('[data-icon="close"]');

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
      menu.hidden = !open;
      iconOpen.hidden = open;
      iconClose.hidden = !open;
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Перехід за якірним посиланням закриває меню, щоб секцію було видно
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a[href^="#"]')) setOpen(false);
    });

    // Escape закриває меню й повертає фокус на кнопку
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });

    // На планшеті й десктопі (md, ≥ 768px) меню не потрібне: закриваємо його
    window.matchMedia('(min-width: 48rem)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }
}
