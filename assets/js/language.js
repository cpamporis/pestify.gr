// Language Manager for Pestify
const PestifyLang = {
  currentLang: 'en',
  translations: {},
  observers: [],
  
  // Initialize the language system
  async init() {
    // Get saved language or browser language
    const savedLang = localStorage.getItem('pestify_lang');
    const browserLang = navigator.language.split('-')[0];
    const defaultLang = savedLang || (browserLang === 'el' ? 'gr' : 'en');
    
    this.currentLang = defaultLang;
    
    // Load translations
    await this.loadTranslations(this.currentLang);
    
    // Update UI
    this.updatePageContent();
    
    // Setup language switcher
    this.setupSwitcher();
    
    // Update HTML lang attribute
    document.documentElement.lang = this.currentLang === 'gr' ? 'el' : 'en';
  },
  
  // Load translations for a language
  async loadTranslations(lang) {
    try {
      const response = await fetch(`/assets/lang/${lang}.json`);
      this.translations = await response.json();
    } catch (error) {
      console.error('Failed to load translations:', error);
      // Fallback to English
      if (lang !== 'en') {
        const enResponse = await fetch('/assets/lang/en.json');
        this.translations = await enResponse.json();
      }
    }
  },
  
  // Switch language
  async switchLang(lang) {
    if (lang === this.currentLang) return;
    
    this.currentLang = lang;
    localStorage.setItem('pestify_lang', lang);
    document.documentElement.lang = lang === 'gr' ? 'el' : 'en';
    
    await this.loadTranslations(lang);
    this.updatePageContent();
    
    // Notify observers
    this.observers.forEach(cb => cb(lang));
  },
  
  // Get translation for a key (dot notation)
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    // Replace parameters
    if (typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (match, p1) => params[p1] || match);
    }
    
    return value;
  },
  
  // Update all translatable content
  updatePageContent() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation && typeof translation === 'string') {
        
        // Handle HTML content if specified
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = translation;
        } else {
          el.textContent = translation;
        }
      }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      if (translation && typeof translation === 'string') {
        el.placeholder = translation;
      }
    });
    
    // Update meta tags
    document.querySelectorAll('meta[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr') || 'content';
      const translation = this.t(key);
      if (translation && typeof translation === 'string') {
        el.setAttribute(attr, translation);
      }
    });
  },
  
  // Setup language switcher buttons
  setupSwitcher() {
    const enBtn = document.querySelector('[data-lang="en"]');
    const grBtn = document.querySelector('[data-lang="gr"]');
    
    if (enBtn && grBtn) {
      // Highlight current language
      this.updateSwitcherActive();
      
      enBtn.addEventListener('click', () => this.switchLang('en'));
      grBtn.addEventListener('click', () => this.switchLang('gr'));
    }
  },
  
  updateSwitcherActive() {
    const enBtn = document.querySelector('[data-lang="en"]');
    const grBtn = document.querySelector('[data-lang="gr"]');
    
    if (enBtn && grBtn) {
      enBtn.classList.toggle('active', this.currentLang === 'en');
      grBtn.classList.toggle('active', this.currentLang === 'gr');
    }
  },
  
  // Observer pattern for components that need to react to language changes
  observe(callback) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(cb => cb !== callback);
    };
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => PestifyLang.init());