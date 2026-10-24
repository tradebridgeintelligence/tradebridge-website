(() => {
  'use strict';
  // Option A: public-information / email-only candidate.
  // Navigation only. No web form, API, storage, analytics, Turnstile, or outbound fetch.
  const menu = document.querySelector('#primary-menu');
  const toggle = document.querySelector('#menu-toggle');
  if (!menu || !toggle) return;

  const close = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) close();
  });
})();
