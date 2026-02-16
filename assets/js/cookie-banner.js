(function() {
  'use strict';

  var STORAGE_KEY = 'auno_cookie_consent';
  var consent = null;

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
  }

  function saveConsent(obj) {
    obj.timestamp = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    consent = obj;
  }

  function applyConsent(obj) {
    var marketingEls = document.querySelectorAll('.cookieconsent-optin-marketing');
    var blockedEls = document.querySelectorAll('.auno-map-blocked');

    if (obj && obj.marketing) {
      // Show marketing content (maps)
      for (var i = 0; i < marketingEls.length; i++) {
        marketingEls[i].style.display = '';
      }
      for (var j = 0; j < blockedEls.length; j++) {
        blockedEls[j].style.display = 'none';
      }
    } else {
      // Hide marketing content, show blocked message
      for (var i = 0; i < marketingEls.length; i++) {
        marketingEls[i].style.display = 'none';
      }
      for (var j = 0; j < blockedEls.length; j++) {
        blockedEls[j].style.display = '';
      }
    }
  }

  function hideBanner() {
    var banner = document.getElementById('auno-cookie-banner');
    if (banner) banner.style.display = 'none';
  }

  function showSettings() {
    document.getElementById('auno-cookie-main').style.display = 'none';
    document.getElementById('auno-cookie-settings').style.display = 'block';
  }

  function showMain() {
    document.getElementById('auno-cookie-main').style.display = 'block';
    document.getElementById('auno-cookie-settings').style.display = 'none';
  }

  function acceptAll() {
    var obj = { necessary: true, analytics: true, marketing: true };
    saveConsent(obj);
    applyConsent(obj);
    hideBanner();
  }

  function rejectAll() {
    var obj = { necessary: true, analytics: false, marketing: false };
    saveConsent(obj);
    applyConsent(obj);
    hideBanner();
  }

  function saveSettings() {
    var analytics = document.getElementById('auno-cookie-analytics').checked;
    var marketing = document.getElementById('auno-cookie-marketing').checked;
    var obj = { necessary: true, analytics: analytics, marketing: marketing };
    saveConsent(obj);
    applyConsent(obj);
    hideBanner();
  }

  function createBanner() {
    // Banner
    var banner = document.createElement('div');
    banner.id = 'auno-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Configuración de cookies');

    // Main view
    var main = document.createElement('div');
    main.id = 'auno-cookie-main';
    main.innerHTML =
      '<h3>Utilizamos cookies</h3>' +
      '<p>Usamos cookies propias y de terceros para mejorar tu experiencia de navegación, ' +
      'analizar el tráfico del sitio y personalizar contenido. Puedes aceptar todas las cookies, ' +
      'rechazar las no esenciales o configurar tus preferencias. ' +
      '<a href="politica-de-cookies.html">Más información</a></p>' +
      '<div class="auno-cookie-buttons">' +
        '<button id="auno-cookie-accept" class="auno-cb-btn auno-cb-accept">Aceptar todas</button>' +
        '<button id="auno-cookie-reject" class="auno-cb-btn auno-cb-reject">Rechazar no esenciales</button>' +
        '<button id="auno-cookie-config" class="auno-cb-btn auno-cb-config">Configurar</button>' +
      '</div>';

    // Settings view
    var settings = document.createElement('div');
    settings.id = 'auno-cookie-settings';
    settings.style.display = 'none';
    settings.innerHTML =
      '<h3>Configurar cookies</h3>' +
      '<div class="auno-cookie-option">' +
        '<label><input type="checkbox" checked disabled /> <strong>Necesarias</strong></label>' +
        '<p>Imprescindibles para el funcionamiento del sitio web. No se pueden desactivar.</p>' +
      '</div>' +
      '<div class="auno-cookie-option">' +
        '<label><input type="checkbox" id="auno-cookie-analytics" /> <strong>Analíticas</strong></label>' +
        '<p>Nos permiten medir el tráfico y analizar tu comportamiento para mejorar el servicio.</p>' +
      '</div>' +
      '<div class="auno-cookie-option">' +
        '<label><input type="checkbox" id="auno-cookie-marketing" /> <strong>Marketing</strong></label>' +
        '<p>Utilizadas para mostrar contenido personalizado, como mapas integrados.</p>' +
      '</div>' +
      '<div class="auno-cookie-buttons">' +
        '<button id="auno-cookie-save" class="auno-cb-btn auno-cb-accept">Guardar preferencias</button>' +
        '<button id="auno-cookie-back" class="auno-cb-btn auno-cb-config">Volver</button>' +
      '</div>';

    banner.appendChild(main);
    banner.appendChild(settings);
    document.body.appendChild(banner);

    // Events
    document.getElementById('auno-cookie-accept').addEventListener('click', acceptAll);
    document.getElementById('auno-cookie-reject').addEventListener('click', rejectAll);
    document.getElementById('auno-cookie-config').addEventListener('click', showSettings);
    document.getElementById('auno-cookie-save').addEventListener('click', saveSettings);
    document.getElementById('auno-cookie-back').addEventListener('click', showMain);
  }

  // Init
  consent = getConsent();
  if (consent) {
    applyConsent(consent);
  } else {
    // No consent yet — hide marketing content until they decide
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        applyConsent({ marketing: false });
        createBanner();
      });
    } else {
      applyConsent({ marketing: false });
      createBanner();
    }
  }
})();
