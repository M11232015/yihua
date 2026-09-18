/* =========================================================
   星花格紋描線裝飾 deco.js
   - 每次進入頁面播放一次；不監聽 scroll/resize，故不重播。
   - 若有品牌開場 Loading（html.is-intro），待其結束後再啟動。
   - prefers-reduced-motion：直接顯示完整靜態紋樣（不描線）。
   - 初始化失敗或未執行時：CSS 預設為完整實線圓，圖案完整可見。
   - 描線以每個 <path> 的 getTotalLength() 設定 dash，沿實際路徑生長；
     搭配 vector-effect:non-scaling-stroke 維持線寬。
   - 開發環境顯示「重播描線」鈕；卸載時清除計時器。
   ========================================================= */
(function () {
  'use strict';

  var decos = Array.prototype.slice.call(document.querySelectorAll('[data-deco]'));
  if (!decos.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [];

  function isDev() {
    var h = location.hostname;
    return location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '' || h === '[::1]';
  }

  function num(v, fallback) { var n = parseFloat(v); return isNaN(n) ? fallback : n; }

  function config(el) {
    var cs = getComputedStyle(el);
    return {
      draw: num(cs.getPropertyValue('--deco-draw'), 1050),
      ease: (cs.getPropertyValue('--deco-ease') || '').trim() || 'cubic-bezier(.25,.8,.35,1)'
    };
  }

  function stars(el) { return Array.prototype.slice.call(el.querySelectorAll('.deco-star')); }

  function delayOf(path) { return num(getComputedStyle(path).getPropertyValue('--d'), 0); }

  /* 全部描線完成所需時間 = 最大延遲 + 一組描線時間 */
  function totalTime(el, cfg) {
    var max = 0;
    stars(el).forEach(function (p) { var d = delayOf(p); if (d > max) max = d; });
    return max + cfg.draw;
  }

  function resetStatic(el) {
    stars(el).forEach(function (p) {
      p.style.transition = 'none';
      p.style.strokeDasharray = '';
      p.style.strokeDashoffset = '';
    });
  }

  function play(el) {
    el.classList.remove('is-done');

    if (reduce) { el.classList.add('is-done'); return; }   /* 靜態完整呈現 */

    var cfg = config(el);
    var list = stars(el);

    /* 先把每條路徑設為「未描」狀態 */
    list.forEach(function (p) {
      var len;
      try { len = p.getTotalLength(); } catch (e) { len = 0; }
      if (!len) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; return; }
      p.style.transition = 'none';
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });

    /* 強制回流後，逐一以延遲過場描出 */
    void el.offsetWidth;

    list.forEach(function (p) {
      if (!p.style.strokeDasharray) return;
      var delay = delayOf(p);
      p.style.transition = 'stroke-dashoffset ' + cfg.draw + 'ms ' + cfg.ease + ' ' + delay + 'ms';
      p.style.strokeDashoffset = '0';
    });

    var t = setTimeout(function () { el.classList.add('is-done'); }, totalTime(el, cfg) + 80);
    timers.push(t);
  }

  function setupReplay(el) {
    if (isDev()) el.classList.add('is-dev');
    var btn = el.querySelector('.deco-lattice__replay');
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', function () { resetStatic(el); play(el); });
    }
  }

  function begin() {
    decos.forEach(function (el) { setupReplay(el); play(el); });
  }

  function start() {
    var root = document.documentElement;
    /* 若品牌開場遮罩仍在，待其結束（is-intro 移除）後再啟動 */
    if (root.classList.contains('is-intro') && 'MutationObserver' in window) {
      var obs = new MutationObserver(function () {
        if (!root.classList.contains('is-intro')) { obs.disconnect(); begin(); }
      });
      obs.observe(root, { attributes: true, attributeFilter: ['class'] });
      timers.push(setTimeout(function () { obs.disconnect(); begin(); }, 6000));  /* 保險 */
    } else {
      begin();
    }
  }

  /* 卸載時清除計時器，避免殘留 */
  function cleanup() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers.length = 0; }
  window.addEventListener('pagehide', cleanup);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
