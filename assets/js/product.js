/* =========================================================
   商品詳情頁 product.html
   依 ?id= 顯示商品；無參數或找不到時退回第一項。
   ========================================================= */
(function () {
  'use strict';
  var GG = window.GG;
  if (!GG) return;
  var $ = function (s) { return document.querySelector(s); };

  /* 取得目前商品 */
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var item = (id && GG.find(id)) || GG.catalog()[0];

  /* ---- 填入商品資訊 ---- */
  document.title = item.name + '｜Gothel\'s Garden';
  $('#crumbName').textContent = item.name;
  var img = $('#pdpImg');
  img.src = 'assets/img/' + item.img + '.jpg';
  img.alt = item.alt;
  $('#pdpCat').textContent = item.cat;
  $('#pdpCatText').textContent = item.cat + '｜手作烘焙';
  $('#pdpName').textContent = item.name;
  $('#pdpPrice').textContent = GG.money(item.price);
  $('#pdpUnit').textContent = item.unit + '　新鮮現做';
  $('#pdpDesc').textContent = item.desc;

  /* ---- 數量選擇器 ---- */
  var val = $('#qtyVal');
  function clampQty() {
    var n = parseInt(val.value, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 99) n = 99;
    val.value = n;
    $('#qtyMinus').disabled = (n <= 1);
    return n;
  }
  $('#qtyMinus').addEventListener('click', function () { val.value = clampQty() - 1; clampQty(); });
  $('#qtyPlus').addEventListener('click', function () { val.value = clampQty() + 1; clampQty(); });
  val.addEventListener('change', clampQty);
  val.addEventListener('input', function () { if (val.value !== '') clampQty(); });
  clampQty();

  /* ---- 加入購物車 ---- */
  $('#addBtn').addEventListener('click', function () {
    var n = clampQty();
    GG.addItem(item.id, n);
    if (window.ggToast) window.ggToast('已加入購物車：' + item.name + ' ×' + n);
  });

  /* ---- 其他商品 ---- */
  var HEART = '';
  function card(p) {
    return [
      '<li class="card">',
        '<a class="card__media" href="product.html?id=' + p.id + '" aria-label="查看 ' + p.name + '">',
          '<img src="assets/img/' + p.img + '.jpg" alt="' + p.alt + '" width="900" height="900" loading="lazy" decoding="async">',
          '<span class="card__add" data-add="' + p.id + '">加入購物車</span>',
        '</a>',
        '<div class="card__row"><div>',
          '<h3 class="card__name">' + p.name + '</h3>',
          '<p class="card__price"><span>$</span>' + p.price + '</p>',
        '</div></div>',
        '<span class="card__sold">' + p.unit + '</span>',
      '</li>'
    ].join('');
  }
  var more = GG.catalog().filter(function (p) { return p.id !== item.id; }).slice(0, 3);
  $('#moreGrid').innerHTML = more.map(card).join('');

  /* 「加入購物車」委派 */
  $('#moreGrid').addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (!add) return;
    e.preventDefault();
    var pid = add.getAttribute('data-add');
    var p = GG.find(pid);
    GG.addItem(pid, 1);
    if (window.ggToast) window.ggToast('已加入購物車：' + (p ? p.name : '商品'));
  });
})();
