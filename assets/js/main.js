/* =========================================================
   Gothel's Garden — 首頁互動
   ========================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------
     商品資料
     ------------------------------------------------------ */
  const SUBSCRIPTIONS = [
    { id: 'sub-01', name: '每週麵包箱',   price: 230, sold: 128, img: 'p-04', alt: '每週配送的鄉村酸種麵包' },
    { id: 'sub-02', name: '經典可頌計畫', price: 380, sold: 96,  img: 'p-01', alt: '層層酥脆的法式可頌' },
    { id: 'sub-03', name: '週末早午餐組', price: 460, sold: 74,  img: 'p-05', alt: '搭配奶油甜點的早午餐組合' }
  ];

  /* 設計稿的 SHOP 區為 2 列共 6 張 */
  const PRODUCTS = [
    { id: 'p-03', name: '原味貝果',     price: 65,  sold: 312, img: 'p-03', alt: '疊放整齊的原味貝果' },
    { id: 'p-06', name: '黑芝麻餐包',   price: 45,  sold: 402, img: 'p-06', alt: '撒上黑芝麻的小餐包' },
    { id: 'p-07', name: '北海道生吐司', price: 260, sold: 156, img: 'p-07', alt: '切開的北海道生吐司' },
    { id: 'p-08', name: '綜合甜甜圈',   price: 180, sold: 240, img: 'p-08', alt: '各種口味的手作甜甜圈' },
    { id: 'p-09', name: '湯種厚片吐司', price: 120, sold: 198, img: 'p-09', alt: '柔軟的湯種厚片吐司' },
    { id: 'p-10', name: '裸麥雜糧麵包', price: 195, sold: 64,  img: 'p-10', alt: '裸麥雜糧麵包與麥穗' }
  ];

  const FAV_KEY = 'gg.favourites';
  const CART_KEY = 'gg.cart';

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* 私密瀏覽等情況忽略 */ }
  }

  let favourites = readStore(FAV_KEY, []);
  let cartCount  = readStore(CART_KEY, 10);

  /* ------------------------------------------------------
     小提示
     ------------------------------------------------------ */
  const toastEl = $('#toast');
  let toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }

  /* ------------------------------------------------------
     商品卡
     ------------------------------------------------------ */
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4S3.8 15.3 3.8 9.6A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8.2 2c0 5.7-8.2 10.8-8.2 10.8z"/></svg>';

  function cardMarkup(item) {
    const faved = favourites.indexOf(item.id) !== -1;
    return [
      '<li class="card reveal" data-id="' + item.id + '">',
        '<a class="card__media" href="#" aria-label="查看 ' + item.name + '">',
          '<img src="assets/img/' + item.img + '.jpg" alt="' + item.alt + '" width="900" height="900" loading="lazy" decoding="async">',
          '<span class="card__add" data-add>加入購物車</span>',
        '</a>',
        '<div class="card__row">',
          '<div>',
            '<h3 class="card__name">' + item.name + '</h3>',
            '<p class="card__price"><span>$</span>' + item.price + '</p>',
          '</div>',
          '<button class="card__fav" type="button" data-fav',
            ' aria-pressed="' + faved + '"',
            ' aria-label="收藏 ' + item.name + '">' + HEART + '</button>',
        '</div>',
        '<span class="card__sold">已售出 ' + item.sold + '</span>',
      '</li>'
    ].join('');
  }

  function renderGrid(el, items) {
    if (el) el.innerHTML = items.map(cardMarkup).join('');
  }

  renderGrid($('#subscriptionGrid'), SUBSCRIPTIONS);
  renderGrid($('#shopGrid'), PRODUCTS);

  /* 收藏 / 加入購物車（事件委派） */
  document.addEventListener('click', function (e) {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      const card = favBtn.closest('.card');
      const id = card && card.dataset.id;
      if (!id) return;
      const idx = favourites.indexOf(id);
      const next = idx === -1;
      if (next) favourites.push(id); else favourites.splice(idx, 1);
      writeStore(FAV_KEY, favourites);
      favBtn.setAttribute('aria-pressed', String(next));
      toast(next ? '已加入收藏' : '已從收藏移除');
      return;
    }

    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      e.preventDefault();
      const name = $('.card__name', addBtn.closest('.card'));
      cartCount += 1;
      writeStore(CART_KEY, cartCount);
      const counter = $('#cartCount');
      if (counter) counter.textContent = String(cartCount);
      toast('已加入購物車：' + (name ? name.textContent : '商品'));
      return;
    }

    /* 佔位連結不跳頁 */
    const link = e.target.closest('a[href="#"]');
    if (link) e.preventDefault();
  });

  const counterEl = $('#cartCount');
  if (counterEl) counterEl.textContent = String(cartCount);

  /* ------------------------------------------------------
     頁首：捲動狀態 / 行動選單 / 搜尋
     ------------------------------------------------------ */
  const header = $('#siteHeader');
  let ticking = false;
  let stuck = false;

  /* 兩段式門檻（遲滯）：向下超過 STICK_ON 才縮起，向上低於 STICK_OFF 才展開。
     單一門檻會在臨界點被細微捲動反覆切換，導致頁首不斷抽動。 */
  const STICK_ON = 120;
  const STICK_OFF = 40;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      const y = window.scrollY;
      if (!stuck && y > STICK_ON) stuck = true;
      else if (stuck && y < STICK_OFF) stuck = false;
      if (header) header.classList.toggle('is-stuck', stuck);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navToggle = $('#navToggle');
  const mainNav = $('#mainNav');

  function setNav(open) {
    if (!navToggle || !mainNav) return;
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    mainNav.classList.toggle('is-open', open);
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (mainNav) {
    mainNav.addEventListener('click', function (e) {
      if (e.target.closest('a') && window.matchMedia('(max-width:1024px)').matches) setNav(false);
    });
  }

  const searchToggle = $('#searchToggle');
  const searchPanel = $('#searchPanel');

  if (searchToggle && searchPanel) {
    searchToggle.addEventListener('click', function () {
      const open = searchToggle.getAttribute('aria-expanded') !== 'true';
      searchToggle.setAttribute('aria-expanded', String(open));
      searchPanel.hidden = !open;
      if (open) { const i = $('#searchInput'); if (i) i.focus(); }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    setNav(false);
    if (searchToggle && searchPanel && !searchPanel.hidden) {
      searchToggle.setAttribute('aria-expanded', 'false');
      searchPanel.hidden = true;
    }
  });

  /* ------------------------------------------------------
     電子報訂閱
     ------------------------------------------------------ */
  const newsForm = $('#newsForm');
  if (newsForm) {
    const input = $('#newsEmail');
    const msg = $('#newsMsg');
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    newsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const value = input.value.trim();
      const ok = EMAIL.test(value);

      input.classList.toggle('is-error', !ok);
      msg.classList.toggle('is-error', !ok);
      msg.textContent = ok
        ? '訂閱成功，出爐通知將寄到 ' + value
        : '請輸入正確的電子信箱格式';

      if (ok) { newsForm.reset(); input.classList.remove('is-error'); }
      else input.focus();
    });
  }

  /* ------------------------------------------------------
     捲動進場
     ------------------------------------------------------ */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    $$('.reveal').forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        const delay = Math.min(i, 5) * 80;
        setTimeout(() => entry.target.classList.add('is-in'), delay);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    $$('.reveal').forEach(el => io.observe(el));
  }
})();
