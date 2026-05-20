/* ============================================================
   MEHR PDP — Purchase option handler
   ============================================================
   - Listens to .mehr-option radio clicks
   - Updates hidden quantity input (Buy Once=1, Subscribe=1, Bundle=3)
   - Toggles visual selected state
   - Updates submit button price display
   - Dawn's product-form.js handles the actual AJAX add-to-cart

   Subscribe option: Kaching's app block (rendered above the options)
   injects its own selling_plan input into the form when the user
   selects a plan there. We don't need to handle subscriptions here —
   we just need to make sure the quantity is correct.
   ============================================================ */

(function () {
  'use strict';

  function initMehrPdp(root) {
    if (!root || root.dataset.mehrInit === 'true') return;
    root.dataset.mehrInit = 'true';

    var form = root.querySelector('form[data-type="add-to-cart-form"]');
    if (!form) return;

    var quantityInput = form.querySelector('.mehr-quantity-input');
    var options = root.querySelectorAll('.mehr-option');
    var submitButton = root.querySelector('.mehr-submit');
    var priceNow = root.querySelector('.mehr-submit__price-now');
    var priceWas = root.querySelector('.mehr-submit__price-was');

    if (!options.length || !quantityInput) return;

    // Format money using Shopify's locale-aware money format if available
    function formatMoney(cents) {
      if (window.Shopify && window.Shopify.formatMoney) {
        return window.Shopify.formatMoney(cents);
      }
      // fallback: simple symbol prefix based on the page
      var amount = (cents / 100).toFixed(2);
      var symbol = '';
      var sampleEl = root.querySelector('.mehr-option__price');
      if (sampleEl) {
        var match = sampleEl.textContent.match(/[£$€¥₹]/);
        if (match) symbol = match[0];
      }
      return symbol + amount;
    }

    // Read variant price from a global product JSON if Dawn exposes it,
    // otherwise read from data attributes on the form
    function getVariantPrice() {
      var variantIdInput = form.querySelector('input[name="id"]');
      if (!variantIdInput) return null;

      // Try Dawn's variant data
      var selected = root.querySelector('[data-selected-variant]');
      if (selected) {
        try {
          var data = JSON.parse(selected.textContent);
          return { price: data.price, compare: data.compare_at_price };
        } catch (e) {}
      }
      return null;
    }

    function selectOption(option) {
      // Update visual state
      options.forEach(function (opt) {
        opt.classList.remove('mehr-option--selected');
        var radio = opt.querySelector('.mehr-option__radio');
        if (radio) radio.checked = false;
      });
      option.classList.add('mehr-option--selected');
      var radio = option.querySelector('.mehr-option__radio');
      if (radio) radio.checked = true;

      // Update quantity
      var qty = parseInt(option.dataset.quantity, 10) || 1;
      quantityInput.value = qty;

      // Update submit button price display
      updateSubmitPrice(option, qty);
    }

    function updateSubmitPrice(option, qty) {
      if (!priceNow) return;

      var variantPrice = getVariantPrice();
      if (!variantPrice) return;

      var unitPrice = variantPrice.price;
      var unitCompare = variantPrice.compare;

      var totalNow = unitPrice * qty;
      var totalWas = unitCompare ? (unitCompare * qty) : null;

      // For bundle, also show the calculated discount (assumes Kaching applies it)
      // We just display unit × qty here; the actual discount happens at cart level
      priceNow.textContent = '— ' + formatMoney(totalNow);
      if (priceWas && totalWas && totalWas > totalNow) {
        priceWas.textContent = formatMoney(totalWas);
      } else if (priceWas) {
        priceWas.textContent = '';
      }
    }

    // Wire up click handlers
    options.forEach(function (option) {
      option.addEventListener('click', function (e) {
        // Allow clicking anywhere on the option, but ignore clicks on links inside
        if (e.target.closest('a')) return;
        e.preventDefault();
        selectOption(option);
      });

      // Keyboard support
      option.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectOption(option);
        }
      });
      option.tabIndex = 0;
      option.setAttribute('role', 'radio');
    });

    // Initialize: select the option that is checked by default (or first)
    var defaultOption = root.querySelector('.mehr-option--selected') || options[0];
    if (defaultOption) {
      selectOption(defaultOption);
    }

    // Listen for variant changes (Dawn's variant-selects custom element dispatches this)
    document.addEventListener('change', function (e) {
      if (e.target.closest('variant-selects')) {
        setTimeout(function () {
          var current = root.querySelector('.mehr-option--selected') || options[0];
          if (current) updateSubmitPrice(current, parseInt(current.dataset.quantity, 10) || 1);
        }, 50);
      }
    });
  }

  // Initialize all MEHR PDP sections on the page
  function init() {
    document.querySelectorAll('.mehr-pdp').forEach(initMehrPdp);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init when Shopify theme editor re-renders the section
  document.addEventListener('shopify:section:load', function (e) {
    if (e.target.querySelector('.mehr-pdp')) {
      initMehrPdp(e.target.querySelector('.mehr-pdp'));
    }
  });
})();
