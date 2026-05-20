/* ============================================================
   MEHR PDP — custom bundle + subscribe selector
   - 3 tiers (Buy 1 / Buy 2 Get 1 Free / Buy 3 Get 2 Free)
   - One-time / Subscribe toggle (attaches existing selling plan)
   - Sets hidden quantity + selling_plan inputs for Dawn product-form
   - Optimistic cart-drawer open for instant perceived speed
   NOTE: the 'free bottle' price is delivered by a native Buy X Get Y
   automatic discount that is switched on at launch. Until then the
   cart total reflects full price; tier display shows launch pricing.
   ============================================================ */
(function () {
  'use strict';

  var PLAN_ID = '2401501231';      // Subscribe & save 10% (every month)
  var SUB_FACTOR = 0.9;            // 10% off on subscription
  var TIERS = { '1': { bottles: 1, pay: 1 }, '3': { bottles: 3, pay: 2 }, '5': { bottles: 5, pay: 3 } };

  function money(cents) {
    if (window.Shopify && window.Shopify.formatMoney) {
      try { return window.Shopify.formatMoney(Math.round(cents)); } catch (e) {}
    }
    return '$' + (Math.round(cents) / 100).toFixed(2);
  }

  /* ---- Optimistic cart drawer: open instantly on add, lift loader once
     the cart contents re-render (detected via MutationObserver, with a
     hard safety timeout so the loader can never get stuck). ---- */
  function initFastCart() {
    var cd = document.querySelector('cart-drawer');
    if (!cd || cd.dataset.mehrFast === '1') return;
    cd.dataset.mehrFast = '1';

    var safety = null;
    function stopLoading() {
      cd.classList.remove('mehr-cart-loading');
      if (safety) { clearTimeout(safety); safety = null; }
    }
    function startLoading() {
      cd.classList.add('mehr-cart-loading');
      if (safety) clearTimeout(safety);
      safety = setTimeout(stopLoading, 4000); // never hang
    }

    // When the drawer's contents change (Dawn re-renders the cart), drop the loader.
    var obs = new MutationObserver(function (muts) {
      if (!cd.classList.contains('mehr-cart-loading')) return;
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].type === 'childList' && (muts[i].addedNodes.length || muts[i].removedNodes.length)) {
          setTimeout(stopLoading, 50);
          return;
        }
      }
    });
    obs.observe(cd, { childList: true, subtree: true });

    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f || !f.matches || !f.matches('form[data-type="add-to-cart-form"]')) return;
      startLoading();
      try {
        if (typeof cd.open === 'function') { cd.open(); }
        else { cd.classList.add('animate', 'active'); }
      } catch (err) { cd.classList.add('animate', 'active'); }
    }, true);

    document.addEventListener('cart:refresh', stopLoading);
  }

  function initPdp(root) {
    if (!root || root.dataset.mehrBundleInit === 'true') return;
    var bundle = root.querySelector('.mehr-bundle');
    if (!bundle) return;
    root.dataset.mehrBundleInit = 'true';

    var form = root.querySelector('form[data-type="add-to-cart-form"]');
    var qtyInput = form && form.querySelector('.mehr-quantity-input');
    var planInput = form && form.querySelector('.mehr-selling-plan');
    var base = parseInt(bundle.getAttribute('data-base'), 10) || 0;
    var tiers = bundle.querySelectorAll('.mehr-tier');
    var modes = bundle.querySelectorAll('.mehr-bundle__mode');
    var priceEl = root.querySelector('.mehr-submit__price');

    var state = { mode: 'onetime', qty: '3' };

    function render() {
      var sub = state.mode === 'subscribe';
      tiers.forEach(function (t) {
        var key = t.getAttribute('data-qty');
        var tier = TIERS[key];
        if (!tier) return;
        var total = base * tier.pay * (sub ? SUB_FACTOR : 1);
        var per = total / tier.bottles;
        var wasPer = base;
        var save = (base * tier.bottles) - total;
        var nowEl = t.querySelector('.mehr-tier__now');
        var wasEl = t.querySelector('.mehr-tier__was');
        var saveEl = t.querySelector('.mehr-tier__save');
        if (nowEl) nowEl.textContent = money(per);
        if (wasEl) wasEl.textContent = (tier.pay === tier.bottles && !sub) ? '' : money(wasPer);
        if (saveEl) saveEl.textContent = save > 1 ? 'Save ' + money(save) : '';
        t.classList.toggle('is-active', key === state.qty);
        var radio = t.querySelector('.mehr-tier__radio');
        if (radio) radio.checked = (key === state.qty);
      });
      modes.forEach(function (m) { m.classList.toggle('is-active', m.getAttribute('data-mode') === state.mode); });
      var sel = TIERS[state.qty];
      if (qtyInput) qtyInput.value = sel ? sel.bottles : 1;
      if (planInput) planInput.value = sub ? PLAN_ID : '';
      if (priceEl && sel) priceEl.textContent = '— ' + money(base * sel.pay * (sub ? SUB_FACTOR : 1));
    }

    tiers.forEach(function (t) {
      t.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        e.preventDefault();
        state.qty = t.getAttribute('data-qty');
        render();
      });
      t.setAttribute('tabindex', '0');
      t.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.qty = t.getAttribute('data-qty'); render(); }
      });
    });
    modes.forEach(function (m) {
      m.addEventListener('click', function (e) { e.preventDefault(); state.mode = m.getAttribute('data-mode'); render(); });
    });

    render();
  }

  function boot() {
    initFastCart();
    document.querySelectorAll('.mehr-pdp').forEach(initPdp);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
  document.addEventListener('shopify:section:load', boot);
})();
