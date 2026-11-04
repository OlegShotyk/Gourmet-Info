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

    button.addEventListener('click', () => {
      if (video.paused) video.play();
      else video.pause();
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
  }
}
