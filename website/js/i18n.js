(() => {
  'use strict';

  const STORAGE_KEY = 'zmn-site-lang';
  const DEFAULT_LANG = 'en';

  const SUPPORTED = [
    { code: 'en',    label: 'English' },
    { code: 'fr',    label: 'Français' },
    { code: 'de',    label: 'Deutsch' },
    { code: 'es',    label: 'Español' },
    { code: 'it',    label: 'Italiano' },
    { code: 'pt',    label: 'Português' },
    { code: 'pt_BR', label: 'Português (Brasil)' },
    { code: 'nl',    label: 'Nederlands' },
    { code: 'pl',    label: 'Polski' },
    { code: 'ru',    label: 'Русский' },
    { code: 'ja',    label: '日本語' },
    { code: 'ko',    label: '한국어' },
    { code: 'zh_CN', label: '简体中文' },
    { code: 'sr',    label: 'Српски' },
    { code: 'tr',    label: 'Türkçe' },
  ];

  const cache = {};
  let currentLang = DEFAULT_LANG;
  let currentData = null;

  function resolveLang(code) {
    if (!code) return DEFAULT_LANG;
    const normalized = code.replace('-', '_');
    if (SUPPORTED.some((l) => l.code === normalized)) return normalized;
    const base = normalized.split('_')[0];
    const match = SUPPORTED.find((l) => l.code === base || l.code.startsWith(`${base}_`));
    return match?.code ?? DEFAULT_LANG;
  }

  function detectLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return resolveLang(stored);
    const params = new URLSearchParams(window.location.search);
    if (params.get('lang')) return resolveLang(params.get('lang'));
    const nav = navigator.languages ?? [navigator.language];
    for (const lang of nav) {
      const resolved = resolveLang(lang);
      if (resolved !== DEFAULT_LANG || lang.startsWith('en')) return resolved;
    }
    return DEFAULT_LANG;
  }

  function get(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  function t(key, fallback = '') {
    const val = get(currentData, key);
    if (val !== undefined && val !== '') return val;
    const enVal = get(cache[DEFAULT_LANG], key);
    return enVal !== undefined ? enVal : fallback;
  }

  async function loadLocale(lang) {
    if (cache[lang]) return cache[lang];
    const res = await fetch(`locales/${lang}.json`);
    if (!res.ok) throw new Error(`Locale ${lang} not found`);
    const data = await res.json();
    cache[lang] = data;
    return data;
  }

  function applyText() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = t(key);
    });

    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      const spec = el.getAttribute('data-i18n-attr');
      if (!spec) return;
      spec.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
  }

  function formatDate(iso) {
    const locale = currentLang === 'pt_BR' ? 'pt-BR' : currentLang === 'zh_CN' ? 'zh-CN' : currentLang.replace('_', '-');
    try {
      return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function renderVersions() {
    const list = document.getElementById('version-list');
    const items = currentData?.versions?.items;
    if (!list || !items) return;
    list.innerHTML = items.map((v) => {
      const major = v.major ? ' version-item--major' : '';
      return `<li class="version-item${major}">
        <div class="version-header">
          <span class="version-tag">${v.tag}</span>
          <span class="version-date">${formatDate(v.date)}</span>
        </div>
        <p class="version-desc">${v.desc}</p>
      </li>`;
    }).join('');
  }

  function updateMeta() {
    document.documentElement.lang = currentLang === 'pt_BR' ? 'pt-BR' : currentLang === 'zh_CN' ? 'zh-CN' : currentLang.replace('_', '-');
    document.title = t('meta.title');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));
  }

  function buildLangSelector() {
    const select = document.getElementById('lang-select');
    if (!select) return;
    select.innerHTML = SUPPORTED.map((l) =>
      `<option value="${l.code}"${l.code === currentLang ? ' selected' : ''}>${l.label}</option>`
    ).join('');
    select.addEventListener('change', () => {
      setLanguage(select.value);
    });
  }

  async function setLanguage(lang) {
    const resolved = resolveLang(lang);
    try {
      currentData = await loadLocale(resolved);
      currentLang = resolved;
    } catch {
      currentData = await loadLocale(DEFAULT_LANG);
      currentLang = DEFAULT_LANG;
    }
    localStorage.setItem(STORAGE_KEY, currentLang);
    updateMeta();
    applyText();
    renderVersions();
    const select = document.getElementById('lang-select');
    if (select) select.value = currentLang;
    document.dispatchEvent(new CustomEvent('zmn:langchange', { detail: { lang: currentLang } }));
  }

  async function initI18n() {
    buildLangSelector();
    await setLanguage(detectLang());
  }

  window.ZMN_I18N = { initI18n, setLanguage, t, get currentLang() { return currentLang; } };
})();
