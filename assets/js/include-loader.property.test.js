/**
 * Property-based tests for include-loader.js — Task 2.2
 *
 * **Validates: Requirements 1.3, 6.1, 6.2, 6.3**
 *
 * Feature: shared-header-footer, Property 1: Active navigation link correctness
 *
 * Property: For any page filename and for any set of navigation links,
 * after setActiveNavLink() runs, exactly the <li> whose child <a> has an
 * href matching the current page filename should have the active class,
 * and all other <li> elements should not have the active class. When no
 * link matches the filename, no <li> should have the active class.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const loaderSource = fs.readFileSync(
  path.resolve(__dirname, 'include-loader.js'),
  'utf-8'
);

const jquerySource = fs.readFileSync(
  path.resolve(__dirname, '../../../node_modules/jquery/dist/jquery.js'),
  'utf-8'
);

/**
 * Arbitrary: generates a valid HTML filename (lowercase alpha + .html).
 * Produces names like "abc.html", "page.html", etc.
 */
const filenameArb = fc
  .stringMatching(/^[a-z]{1,12}$/)
  .map((s) => s + '.html');

/**
 * Arbitrary: generates a non-empty array of unique filenames to use as nav hrefs.
 */
const navLinksArb = fc
  .uniqueArray(filenameArb, { minLength: 1, maxLength: 10 })
  .filter((arr) => arr.length >= 1);

/**
 * Build a jsdom environment with a nav structure containing the given hrefs,
 * set the pathname, load jQuery + include-loader, and return helpers.
 */
function buildEnv(hrefs, pathname) {
  const lis = hrefs
    .map((href) => `<li><a href="${href}">${href}</a></li>`)
    .join('');

  const bodyHTML = `
    <div id="header-placeholder">
      <header>
        <nav id="m5000">
          <ul class="navContainer">${lis}</ul>
        </nav>
      </header>
    </div>
  `;

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>${bodyHTML}</body></html>`,
    {
      url: `http://localhost${pathname}`,
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    }
  );

  const { window } = dom;
  window.eval(jquerySource);
  window.eval(loaderSource);

  return { window, $: window.jQuery };
}

describe('Feature: shared-header-footer, Property 1: Active navigation link correctness', () => {
  it('exactly one <li> has active class when pathname matches a nav href', () => {
    fc.assert(
      fc.property(navLinksArb, (hrefs) => {
        // Pick a random href from the list to be the "current page"
        const matchIndex = Math.floor(Math.random() * hrefs.length);
        const currentFile = hrefs[matchIndex];
        const pathname = '/' + currentFile;

        const { $, window } = buildEnv(hrefs, pathname);
        window._includeLoader.setActiveNavLink();

        const items = $('nav#m5000 ul.navContainer > li');

        items.each(function (i) {
          const $li = $(this);
          const href = $li.children('a').attr('href');
          if (href === currentFile) {
            expect($li.hasClass('active')).toBe(true);
          } else {
            expect($li.hasClass('active')).toBe(false);
          }
        });

        // Exactly one <li> should be active
        const activeCount = items.filter('.active').length;
        expect(activeCount).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it('no <li> has active class when pathname does not match any nav href', () => {
    fc.assert(
      fc.property(navLinksArb, (hrefs) => {
        // Use a filename guaranteed not to be in the hrefs list
        const nonMatchingFile = 'zzz-no-match-' + hrefs.join('-') + '.html';
        const pathname = '/' + nonMatchingFile;

        const { $, window } = buildEnv(hrefs, pathname);
        window._includeLoader.setActiveNavLink();

        const items = $('nav#m5000 ul.navContainer > li');
        const activeCount = items.filter('.active').length;
        expect(activeCount).toBe(0);

        items.each(function () {
          expect($(this).hasClass('active')).toBe(false);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('defaults to index.html when pathname ends with /', () => {
    fc.assert(
      fc.property(navLinksArb, (hrefs) => {
        // Ensure index.html is in the list for this property
        const hrefsWithIndex = hrefs.includes('index.html')
          ? hrefs
          : ['index.html', ...hrefs];

        const { $, window } = buildEnv(hrefsWithIndex, '/');
        window._includeLoader.setActiveNavLink();

        const items = $('nav#m5000 ul.navContainer > li');

        items.each(function () {
          const $li = $(this);
          const href = $li.children('a').attr('href');
          if (href === 'index.html') {
            expect($li.hasClass('active')).toBe(true);
          } else {
            expect($li.hasClass('active')).toBe(false);
          }
        });
      }),
      { numRuns: 100 }
    );
  });

  it('removes pre-existing active class from non-matching items', () => {
    fc.assert(
      fc.property(navLinksArb, (hrefs) => {
        const matchIndex = Math.floor(Math.random() * hrefs.length);
        const currentFile = hrefs[matchIndex];
        const pathname = '/' + currentFile;

        const { $, window } = buildEnv(hrefs, pathname);

        // Pre-set active on ALL items to verify cleanup
        $('nav#m5000 ul.navContainer > li').addClass('active');

        window._includeLoader.setActiveNavLink();

        const items = $('nav#m5000 ul.navContainer > li');
        items.each(function () {
          const $li = $(this);
          const href = $li.children('a').attr('href');
          if (href === currentFile) {
            expect($li.hasClass('active')).toBe(true);
          } else {
            expect($li.hasClass('active')).toBe(false);
          }
        });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-based tests for include-loader.js — Task 2.3
 *
 * **Validates: Requirements 3.2**
 *
 * Feature: shared-header-footer, Property 2: Fragment injection completeness
 *
 * Property: For any page containing a placeholder element with a known selector,
 * after the Include_Loader runs successfully, the placeholder's innerHTML should
 * be non-empty and should equal the content of the corresponding fragment file.
 */
describe('Feature: shared-header-footer, Property 2: Fragment injection completeness', () => {
  /**
   * Arbitrary: generates random non-empty HTML content strings to simulate
   * fragment file responses. Produces simple but valid HTML snippets.
   */
  const htmlContentArb = fc
    .record({
      tag: fc.constantFrom('div', 'header', 'footer', 'section', 'nav', 'article'),
      id: fc.stringMatching(/^[a-z]{1,8}$/),
      className: fc.stringMatching(/^[a-z]{1,6}$/),
      text: fc.stringMatching(/^[A-Za-z0-9 ]{1,40}$/),
    })
    .map(({ tag, id, className, text }) =>
      `<${tag} id="${id}" class="${className}">${text}</${tag}>`
    );

  /**
   * Build a jsdom environment with a placeholder element, mock $.get() to
   * return the provided HTML content, call loadFragment, and return the
   * placeholder's innerHTML for assertion.
   */
  function buildFragmentEnv(placeholderSelector, fragmentHtml) {
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body><div id="fragment-target"></div></body></html>`,
      {
        url: 'http://localhost/index.html',
        runScripts: 'dangerously',
        pretendToBeVisual: true,
      }
    );

    const { window } = dom;

    // Load jQuery
    window.eval(jquerySource);

    // Mock $.get() to synchronously resolve with the provided HTML
    const origGet = window.jQuery.get;
    window.jQuery.get = function (url) {
      return {
        done: function (cb) {
          cb(fragmentHtml);
          return this;
        },
        fail: function () {
          return this;
        },
      };
    };

    // Load the include-loader (it will self-execute and also trigger $(document).ready)
    window.eval(loaderSource);

    return { window, $: window.jQuery };
  }

  it('placeholder innerHTML equals the fetched fragment content after loadFragment', () => {
    fc.assert(
      fc.property(htmlContentArb, (fragmentHtml) => {
        const { $, window } = buildFragmentEnv('#fragment-target', fragmentHtml);

        // Call loadFragment on the placeholder with our mock content
        let callbackCalled = false;
        window._includeLoader.loadFragment('#fragment-target', 'test-fragment.html', () => {
          callbackCalled = true;
        });

        // The placeholder innerHTML should equal the fragment content
        const placeholder = $('#fragment-target');
        expect(placeholder.html()).toBe(fragmentHtml);
        expect(placeholder.html()).not.toBe('');
        expect(callbackCalled).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('works with various placeholder selectors', () => {
    const selectorIdArb = fc.stringMatching(/^[a-z]{1,10}$/).map((s) => s + '-placeholder');

    fc.assert(
      fc.property(selectorIdArb, htmlContentArb, (selectorId, fragmentHtml) => {
        const dom = new JSDOM(
          `<!DOCTYPE html><html><body><div id="${selectorId}"></div></body></html>`,
          {
            url: 'http://localhost/index.html',
            runScripts: 'dangerously',
            pretendToBeVisual: true,
          }
        );

        const { window } = dom;
        window.eval(jquerySource);

        // Mock $.get()
        window.jQuery.get = function () {
          return {
            done: function (cb) {
              cb(fragmentHtml);
              return this;
            },
            fail: function () {
              return this;
            },
          };
        };

        window.eval(loaderSource);

        // Call loadFragment with the generated selector
        window._includeLoader.loadFragment('#' + selectorId, 'fragment.html', null);

        const placeholder = window.jQuery('#' + selectorId);
        expect(placeholder.html()).toBe(fragmentHtml);
        expect(placeholder.html()).not.toBe('');
      }),
      { numRuns: 100 }
    );
  });

  it('handles multi-element HTML fragments correctly', () => {
    const multiElementArb = fc
      .array(htmlContentArb, { minLength: 1, maxLength: 5 })
      .map((elements) => elements.join(''));

    fc.assert(
      fc.property(multiElementArb, (fragmentHtml) => {
        const { $, window } = buildFragmentEnv('#fragment-target', fragmentHtml);

        window._includeLoader.loadFragment('#fragment-target', 'multi-fragment.html', null);

        const placeholder = $('#fragment-target');
        expect(placeholder.html()).toBe(fragmentHtml);
        expect(placeholder.html()).not.toBe('');
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-based tests for include-loader.js — Task 5.1
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * Feature: shared-header-footer, Property 3: Migration structure correctness
 *
 * Property: For any migrated HTML page file, the file should contain a
 * #header-placeholder element, a #footer-placeholder element, and a <script>
 * tag referencing include-loader.js. The file should not contain inline
 * <header> or <footer> elements.
 */
describe('Feature: shared-header-footer, Property 3: Migration structure correctness', () => {
  const migratedPages = [
    'index.html',
    'contacto.html',
    'conserjeria.html',
    'facility-services.html',
    'piscinas.html',
    'limpieza.html',
    'jardineria.html',
    'aviso-legal.html',
    'gracias.html',
    'politica-de-cookies.html',
    'politica-de-privacidad.html',
  ];

  migratedPages.forEach((pageFile) => {
    it(`${pageFile} has correct migration structure`, () => {
      const pagePath = path.resolve(__dirname, '../../', pageFile);
      const pageContent = fs.readFileSync(pagePath, 'utf-8');

      const dom = new JSDOM(pageContent);
      const { document } = dom.window;

      // Assert: #header-placeholder exists
      const headerPlaceholder = document.querySelector('#header-placeholder');
      expect(headerPlaceholder).not.toBeNull();
      expect(headerPlaceholder).toBeDefined();

      // Assert: #footer-placeholder exists
      const footerPlaceholder = document.querySelector('#footer-placeholder');
      expect(footerPlaceholder).not.toBeNull();
      expect(footerPlaceholder).toBeDefined();

      // Assert: script tag referencing include-loader.js exists
      const scripts = Array.from(document.querySelectorAll('script'));
      const hasIncludeLoaderScript = scripts.some((script) =>
        script.src.includes('include-loader.js')
      );
      expect(hasIncludeLoaderScript).toBe(true);

      // Assert: no inline <header> elements (outside of placeholders)
      // We need to check that <header> elements only exist inside placeholders
      const headers = Array.from(document.querySelectorAll('header'));
      headers.forEach((header) => {
        // If a header exists, it should be inside a placeholder
        const isInsidePlaceholder =
          header.closest('#header-placeholder') !== null ||
          header.closest('#footer-placeholder') !== null;
        expect(isInsidePlaceholder).toBe(true);
      });

      // Assert: no inline <footer> elements (outside of placeholders)
      const footers = Array.from(document.querySelectorAll('footer'));
      footers.forEach((footer) => {
        // If a footer exists, it should be inside a placeholder
        const isInsidePlaceholder =
          footer.closest('#header-placeholder') !== null ||
          footer.closest('#footer-placeholder') !== null;
        expect(isInsidePlaceholder).toBe(true);
      });
    });
  });

  it('all 11 migrated pages are tested', () => {
    // Meta-test to ensure we're testing all required pages
    expect(migratedPages.length).toBe(11);
  });
});
