/**
 * Include Loader — fetches shared header/footer fragments and injects them
 * into placeholder elements. Runs on DOM ready via jQuery.
 */
(function () {
  // Wait for jQuery to be loaded by loader4886.js
  function waitForJQuery(callback, maxWait) {
    var startTime = Date.now();
    var checkInterval = setInterval(function() {
      if (typeof jQuery !== 'undefined') {
        clearInterval(checkInterval);
        console.log('include-loader.js: jQuery detected, initializing');
        callback();
      } else if (Date.now() - startTime > maxWait) {
        clearInterval(checkInterval);
        console.error('include-loader.js: jQuery not available after ' + maxWait + 'ms. Aborting.');
      }
    }, 50);
  }

  waitForJQuery(function() {
    initIncludeLoader();
  }, 10000);

  function initIncludeLoader() {

  /**
   * Fetch an HTML fragment and inject it into the element matching `selector`.
   * @param {string} selector - CSS selector for the placeholder element
   * @param {string} url - Relative path to the fragment HTML file
   * @param {Function|null} callback - Optional function called after injection
   */
  function loadFragment(selector, url, callback) {
    console.log('include-loader.js: loadFragment called with selector:', selector, 'url:', url);
    var $el = $(selector);
    console.log('include-loader.js: Found', $el.length, 'element(s) matching', selector);
    if (!$el.length) {
      console.warn('include-loader.js: No element found for selector:', selector);
      return;
    }

    console.log('include-loader.js: Fetching', url);
    $.get(url)
      .done(function (html) {
        console.log('include-loader.js: Successfully loaded', url, '- length:', html.length);
        $el.html(html);
        console.log('include-loader.js: Injected HTML into', selector);
        if (typeof callback === 'function') {
          console.log('include-loader.js: Calling callback for', url);
          callback();
        }
      })
      .fail(function (jqXHR) {
        console.error(
          'include-loader.js: Failed to load ' + url + ' (status: ' + jqXHR.status + ')'
        );
      });
  }

  /**
   * Set the `active` class on the nav <li> whose <a> href matches the
   * current page filename. Defaults to index.html when the path ends with `/`.
   */
  function setActiveNavLink() {
    var pathname = window.location.pathname;
    var filename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';
    console.log('include-loader.js: setActiveNavLink - pathname:', pathname, 'filename:', filename);

    $('nav#m5000 ul.navContainer > li').each(function () {
      var $li = $(this);
      var href = $li.children('a').attr('href');
      if (href === filename) {
        console.log('include-loader.js: Setting active class on link with href:', href);
        $li.addClass('active');
      } else {
        $li.removeClass('active');
      }
    });
  }

  /**
   * Re-initialize the fixed-header behaviour after the <header> element
   * has been injected into the DOM.
   */
  function reinitHeaderFixed() {
    console.log('include-loader.js: reinitHeaderFixed called');
    if (typeof _monoFixedHeader !== 'undefined') {
      console.log('include-loader.js: _monoFixedHeader found, reinitializing');
      _monoFixedHeader.$header = $('header');
      _monoFixedHeader.$nextEl = $('header').next();
      _monoFixedHeader.init();
    } else {
      console.log('include-loader.js: _monoFixedHeader not available');
    }
  }

  // Expose for testing
  window._includeLoader = {
    loadFragment: loadFragment,
    setActiveNavLink: setActiveNavLink,
    reinitHeaderFixed: reinitHeaderFixed
  };

  // Run on DOM ready
  $(document).ready(function () {
    console.log('include-loader.js: DOM ready, starting fragment loading');
    console.log('include-loader.js: jQuery version:', $.fn.jquery);
    
    loadFragment('#header-placeholder', 'header.html', function () {
      setActiveNavLink();
      reinitHeaderFixed();
    });

    loadFragment('#footer-placeholder', 'footer.html', null);
  });
  
  } // end initIncludeLoader
})();
