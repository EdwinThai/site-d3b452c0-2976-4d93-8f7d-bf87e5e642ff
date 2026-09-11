/* ============================================================
   ELLESSE — script.js
   Scroll animations, mobile nav, open status, contact form
   ============================================================ */

(function () {
  'use strict';

  /* ---- HEADER SCROLL SHADOW ---- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- MOBILE NAV TOGGLE ---- */
  var navToggle = document.getElementById('nav-toggle');
  var mainNav   = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('nav-open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? 'Stäng meny' : 'Öppna meny');
    });

    /* Close nav when a link is clicked */
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('nav-open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Öppna meny');
      });
    });
  }

  /* ---- SCROLL FADE-IN (IntersectionObserver) ---- */
  var fadeEls = document.querySelectorAll('.fade-in-element');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    fadeEls.forEach(function (el) { observer.observe(el); });
  } else {
    /* Fallback for very old browsers */
    fadeEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- OPEN / CLOSED STATUS ---- */
  /*
   * Hours (verified):
   * Mon 09-18, Tue 09-18, Wed closed, Thu 09-18, Fri 09-16,
   * Sat closed, Sun closed
   */
  var schedule = {
    1: { open: 9, close: 18 },
    2: { open: 9, close: 18 },
    3: null,
    4: { open: 9, close: 18 },
    5: { open: 9, close: 16 },
    6: null,
    0: null
  };

  function updateOpenStatus() {
    var statusEl = document.getElementById('open-status');
    if (!statusEl) return;

    var now   = new Date();
    var day   = now.getDay();   // 0=Sun … 6=Sat
    var hour  = now.getHours();
    var min   = now.getMinutes();
    var decH  = hour + min / 60;

    var todayHours = schedule[day];
    var isOpen = todayHours && decH >= todayHours.open && decH < todayHours.close;

    var dot  = '<span class="status-dot" aria-hidden="true"></span>';
    if (isOpen) {
      statusEl.innerHTML = dot + 'Öppet nu – stänger kl. ' + todayHours.close + ':00';
      statusEl.classList.add('is-open');
      statusEl.classList.remove('is-closed');
    } else {
      /* Find next opening */
      var days   = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
      var nextMsg = '';
      for (var i = 1; i <= 7; i++) {
        var nextDay = (day + i) % 7;
        if (schedule[nextDay]) {
          nextMsg = ' – öppnar ' + days[nextDay] + ' kl. ' + schedule[nextDay].open + ':00';
          break;
        }
      }
      statusEl.innerHTML = dot + 'Stängt just nu' + nextMsg;
      statusEl.classList.add('is-closed');
      statusEl.classList.remove('is-open');
    }
  }

  updateOpenStatus();
  setInterval(updateOpenStatus, 60000);

  /* ---- MOBILE FLIP CARD — tap toggle ---- */
  if (window.matchMedia('(max-width: 600px)').matches) {
    document.querySelectorAll('.flip-card').forEach(function (card) {
      /* On mobile, CSS disables the 3D flip; cards are stacked. No extra JS needed. */
    });
  }

  /* ---- CONTACT FORM — mailto fallback ---- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name    = (document.getElementById('cf-name').value    || '').trim();
      var email   = (document.getElementById('cf-email').value   || '').trim();
      var message = (document.getElementById('cf-message').value || '').trim();

      if (!name || !email || !message) {
        alert('Fyll i alla fält innan du skickar.');
        return;
      }

      var subject = encodeURIComponent('Meddelande via ellesse.se – ' + name);
      var body    = encodeURIComponent(
        'Från: ' + name + '\n' +
        'E-post: ' + email + '\n\n' +
        message
      );
      window.location.href = 'mailto:julieto1977@gmail.com?subject=' + subject + '&body=' + body;
    });
  }

})();