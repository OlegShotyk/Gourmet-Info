// Сторонні вбудовування вантажаться лише тоді, коли вони потрібні:
// - відео YouTube — після натискання на превʼю (фасад);
// - карта Google Maps та інформер погоди — коли блок наближається до області перегляду.
// До цього сторінка не завантажує їхні скрипти й не отримує сторонніх cookie.
{
  document.querySelectorAll('[data-youtube]').forEach((button) => {
    button.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${button.dataset.youtube}?autoplay=1`;
      iframe.title = button.dataset.title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      button.replaceWith(iframe);
      iframe.focus();
    });
  });

  const load = (el) => {
    if (el.dataset.lazySrc) el.src = el.dataset.lazySrc;
    if (el.dataset.lazyScript) {
      const script = document.createElement('script');
      script.src = el.dataset.lazyScript;
      script.async = true;
      if (el.dataset.scriptId) script.id = el.dataset.scriptId;
      document.body.append(script);
    }
  };

  const targets = document.querySelectorAll('[data-lazy-src], [data-lazy-script]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        load(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '300px 0px' });
    targets.forEach((el) => observer.observe(el));
  } else {
    targets.forEach(load);
  }
}
