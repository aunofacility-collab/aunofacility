/**
 * Unit tests for include-loader.js — Task 2.1 verification
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
 * Helper: set up a jsdom window with jQuery loaded natively,
 * run the loader script, and return { window, $ }.
 */
function setupEnv(options = {}) {
  const {
    bodyHTML = '<div id="header-placeholder"></div><div id="footer-placeholder"></div>',
    pathname = '/index.html',
    hasMonoFixedHeader = false,
  } = options;

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>${bodyHTML}</body></html>`,
    {
      url: `http://localhost${pathname}`,
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    }
  );

  const { window } = dom;

  // Load jQuery natively inside jsdom
  window.eval(jquerySource);

  if (hasMonoFixedHeader) {
    window._monoFixedHeader = {
      $header: null,
      $nextEl: null,
      init: vi.fn(),
    };
  }

  // Execute the loader script in the jsdom context
  window.eval(loaderSource);

  const $ = window.jQuery;

  return { window, $, dom };
}

describe('include-loader.js', () => {
  describe('loadFragment', () => {
    it('should inject HTML into the target element on success', () => {
      const { window, $ } = setupEnv();
      const loader = window._includeLoader;

      const mockHtml = '<header><h1>Test Header</h1></header>';

      // Override $.get on the window's jQuery
      window.jQuery.get = vi.fn().mockReturnValue({
        done: function (cb) {
          cb(mockHtml);
          return this;
        },
        fail: function () {
          return this;
        },
      });

      const callback = vi.fn();
      loader.loadFragment('#header-placeholder', 'header.html', callback);

      expect($('#header-placeholder').html()).toBe(mockHtml);
      expect(callback).toHaveBeenCalledOnce();
    });

    it('should call console.error on fetch failure', () => {
      const { window, $ } = setupEnv();
      const loader = window._includeLoader;

      const errorSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {});

      window.jQuery.get = vi.fn().mockReturnValue({
        done: function () {
          return this;
        },
        fail: function (cb) {
          cb({ status: 404 });
          return this;
        },
      });

      loader.loadFragment('#header-placeholder', 'header.html', null);

      expect(errorSpy).toHaveBeenCalledOnce();
      expect(errorSpy.mock.calls[0][0]).toContain('header.html');
      expect(errorSpy.mock.calls[0][0]).toContain('404');
      expect($('#header-placeholder').html()).toBe('');
    });

    it('should do nothing if selector matches no element', () => {
      const { window } = setupEnv();
      const loader = window._includeLoader;

      window.jQuery.get = vi.fn();
      loader.loadFragment('#nonexistent', 'header.html', null);

      expect(window.jQuery.get).not.toHaveBeenCalled();
    });
  });

  describe('setActiveNavLink', () => {
    const navHTML = `
      <div id="header-placeholder">
        <header>
          <nav id="m5000">
            <ul class="navContainer">
              <li><a href="index.html">INICIO</a></li>
              <li><a href="piscinas.html">PISCINAS</a></li>
              <li><a href="contacto.html">Contacto</a></li>
            </ul>
          </nav>
        </header>
      </div>
    `;

    it('should add active class to the matching nav li', () => {
      const { window, $ } = setupEnv({
        bodyHTML: navHTML,
        pathname: '/piscinas.html',
      });

      window._includeLoader.setActiveNavLink();

      const items = $('nav#m5000 ul.navContainer > li');
      expect(items.eq(0).hasClass('active')).toBe(false);
      expect(items.eq(1).hasClass('active')).toBe(true);
      expect(items.eq(2).hasClass('active')).toBe(false);
    });

    it('should default to index.html when path ends with /', () => {
      const { window, $ } = setupEnv({
        bodyHTML: navHTML,
        pathname: '/',
      });

      window._includeLoader.setActiveNavLink();

      const items = $('nav#m5000 ul.navContainer > li');
      expect(items.eq(0).hasClass('active')).toBe(true);
      expect(items.eq(1).hasClass('active')).toBe(false);
    });

    it('should leave all items inactive when no match', () => {
      const { window, $ } = setupEnv({
        bodyHTML: navHTML,
        pathname: '/unknown-page.html',
      });

      window._includeLoader.setActiveNavLink();

      const items = $('nav#m5000 ul.navContainer > li');
      items.each(function () {
        expect($(this).hasClass('active')).toBe(false);
      });
    });

    it('should remove active from previously active items', () => {
      const { window, $ } = setupEnv({
        bodyHTML: navHTML,
        pathname: '/contacto.html',
      });

      // Pre-set active on wrong item
      $('nav#m5000 ul.navContainer > li').eq(0).addClass('active');

      window._includeLoader.setActiveNavLink();

      const items = $('nav#m5000 ul.navContainer > li');
      expect(items.eq(0).hasClass('active')).toBe(false);
      expect(items.eq(2).hasClass('active')).toBe(true);
    });
  });

  describe('reinitHeaderFixed', () => {
    it('should call _monoFixedHeader.init() when available', () => {
      const { window } = setupEnv({
        bodyHTML: '<header></header>',
        hasMonoFixedHeader: true,
      });

      window._includeLoader.reinitHeaderFixed();

      expect(window._monoFixedHeader.init).toHaveBeenCalled();
    });

    it('should not throw when _monoFixedHeader is undefined', () => {
      const { window } = setupEnv({
        bodyHTML: '<header></header>',
        hasMonoFixedHeader: false,
      });

      expect(() => window._includeLoader.reinitHeaderFixed()).not.toThrow();
    });
  });

  describe('jQuery guard', () => {
    it('should log warning and exit if jQuery is not available', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost/index.html',
        runScripts: 'dangerously',
      });

      const warnSpy = vi.spyOn(dom.window.console, 'warn').mockImplementation(() => {});

      // Run loader without jQuery
      dom.window.eval(loaderSource);

      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toContain('jQuery');
      expect(dom.window._includeLoader).toBeUndefined();
    });
  });
});
