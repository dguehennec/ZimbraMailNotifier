(() => {
  'use strict';

  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section[id]');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const backToTop = document.getElementById('back-to-top');

  function setActiveNav(id) {
    navItems.forEach((item) => {
      item.classList.toggle('active', item.getAttribute('href') === `#${id}`);
    });
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      closeSidebar();
      const id = item.getAttribute('href')?.slice(1);
      if (id) setActiveNav(id);
    });
  });

  menuToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 860 && sidebar?.classList.contains('open')) {
      const target = e.target;
      if (target instanceof Node && !sidebar.contains(target) && target !== menuToggle) {
        closeSidebar();
      }
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.id) {
          setActiveNav(entry.target.id);
        }
      });
    },
    { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));

  window.addEventListener('scroll', () => {
    backToTop?.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('DOMContentLoaded', () => {
    window.ZMN_I18N?.initI18n();
  });
})();
