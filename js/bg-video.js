// Фонове відео секції «Послуги»: кнопка «Пауза / Відтворити».
// Підпис і іконка оновлюються за подіями самого відео, тож стан завжди відповідає дійсності.
// Код у власному блоці: звичайні <script> ділять глобальну область з menu.js.
{
  const video = document.querySelector('[data-bg-video]');
  const button = document.querySelector('[data-video-toggle]');

  if (video && button) {
    const label = button.querySelector('[data-label]');
    const iconPause = button.querySelector('[data-icon="pause"]');
    const iconPlay = button.querySelector('[data-icon="play"]');

    const sync = () => {
      const paused = video.paused;
      label.textContent = paused ? 'Відтворити відео' : 'Пауза відео';
      iconPause.hidden = paused;
      iconPlay.hidden = !paused;
    };

    // ЛР №12 — відео (822 КБ, ~70 % ваги сторінки) завантажується лише тоді, коли секція «Послуги»
    // наближається до екрана, а не під час першого відмальовування. Атрибута autoplay більше немає:
    // відтворення запускає скрипт; за prefers-reduced-motion відео не завантажується зовсім (воно приховане CSS).
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      video.querySelectorAll('source[data-src]').forEach((source) => { source.src = source.dataset.src; });
      video.load();
      video.play().catch(() => {}); // браузер може заборонити автовідтворення (режим економії) — лишається постер
    };

    button.addEventListener('click', () => {
      if (!loaded) { load(); return; }
      if (video.paused) video.play();
      else video.pause();
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();

    if (!reduceMotion) {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) { observer.disconnect(); load(); }
        }, { rootMargin: '200px 0px' });
        observer.observe(video);
      } else {
        load();
      }
    }
  }
}
