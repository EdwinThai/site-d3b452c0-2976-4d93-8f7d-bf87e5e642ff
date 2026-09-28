/*
 * AIOS site-kit — see site-kit.css for what this pairs with. Loaded as-is
 * on every generated site; never written or modified by the model. Fully
 * self-contained, degrades safely (skips straight to the end state) when
 * IntersectionObserver is unavailable or the visitor has requested reduced
 * motion.
 */
(function () {
  "use strict";

  var STAR_PATH = "M12 2.4l2.79 6.24 6.8.62-5.16 4.55 1.54 6.67L12 16.98l-6 3.5 1.54-6.67-5.16-4.55 6.8-.62L12 2.4z";

  function renderStars() {
    document.querySelectorAll(".stars[data-rating]").forEach(function (el) {
      var r = parseFloat(el.getAttribute("data-rating")) || 0;
      for (var i = 0; i < 5; i++) {
        var pct = Math.max(0, Math.min(1, r - i)) * 100;
        var s = document.createElement("span");
        s.style.cssText = "position:relative;display:inline-block;width:1.1em;height:1.1em";
        if (pct >= 99.5) {
          s.innerHTML = '<svg class="star-fill" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%"><path d="' + STAR_PATH + '"/></svg>';
        } else if (pct <= 0.5) {
          s.innerHTML = '<svg class="star-empty" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%"><path d="' + STAR_PATH + '"/></svg>';
        } else {
          // The fill layer MUST have its own position:absolute box (not an
          // inline/static span) — clip-path clips against the element's
          // OWN rendered box, and a span with no in-flow content otherwise
          // collapses to 0x0, clipping the whole star away instead of just
          // trimming it. Found and fixed 2026-08-26.
          s.innerHTML =
            '<svg class="star-empty" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%"><path d="' + STAR_PATH + '"/></svg>' +
            '<span style="position:absolute;inset:0;overflow:hidden;clip-path:inset(0 ' + (100 - pct) + '% 0 0)"><svg class="star-fill" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%"><path d="' + STAR_PATH + '"/></svg></span>';
        }
        el.appendChild(s);
      }
    });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count-to"));
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 1000);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Real bug found 2026-09-16: unlike wireReveal() right below, this never
  // checked prefers-reduced-motion — only whether IntersectionObserver
  // exists at all (true in every real browser), so the count-up animation
  // ran unconditionally for every visitor, accessibility preference or
  // not. Found because it made a screenshot taken with reduced-motion
  // forced show a nonsense mid-animation number instead of the real value.
  function wireCountUp() {
    var els = document.querySelectorAll("[data-count-to]");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach(function (el) {
        var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
        el.textContent = parseFloat(el.getAttribute("data-count-to")).toFixed(dec);
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  function wireReveal() {
    var els = document.querySelectorAll(".reveal");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { io.observe(el); });
  }

  /**
   * Flow lines — the site's ambient "something is alive here" element,
   * added 2026-09-16 to replace the old blurred-gradient hero background
   * (explicitly rejected as "mossy colors blending together" — see the
   * luxury-clean/sharp-edges design bar). Deliberately built as a
   * site-kit component, NOT hand-authored SVG paths in the model's own
   * output: a fixed, once-debugged path generator + parallax mechanic
   * that every site shares, with the actual SHAPE/COLOR/SPEED seeded per
   * company (from data-seed, typically the company id) so sites never
   * look identical to each other despite sharing the same underlying
   * code — same "shared mechanism, per-company variation" pattern as
   * websiteAgent.ts's accentHueNudge. Zero extra model/API cost: this is
   * a static asset shipped with every site, same as the fonts.
   *
   * Markup contract: an empty `<svg class="flow-lines" data-seed="...">`
   * placed INSIDE `.hero`/`.name-pin-inner` (not elsewhere on the page —
   * see websiteAgent.ts's siteKitBlock) — this function populates it
   * entirely; nothing else should touch it. Scoped to the hero on purpose
   * (2026-09-16): a full-page version used to sit behind every section's
   * body text and read as noise competing with copy that needs reading;
   * keeping it to the one deliberate hero moment (alongside the
   * name-write scroll-pin) both fixes that and concentrates the "alive"
   * feeling where the page already draws the eye.
   */
  function seededRandom(seedStr) {
    var h = 0;
    for (var i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    return function () {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 4294967296;
    };
  }

  // Parses #rgb/#rrggbb (the only forms this codebase's palettes ever use)
  // and rotates hue by ~50° for a complementary-but-related second color —
  // only used when the model's own CSS never declared --accent-2 at all
  // (a real second verified brand color, when one exists, always wins;
  // see websiteAgent.ts's accentTwoBlock).
  function complementaryColor(hex, hueShiftDeg) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
    if (!m) return null;
    var h6 = m[1].length === 3 ? m[1].split("").map(function (c) { return c + c; }).join("") : m[1];
    var r = parseInt(h6.slice(0, 2), 16) / 255, g = parseInt(h6.slice(2, 4), 16) / 255, b = parseInt(h6.slice(4, 6), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min, hue = 0, s = 0;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    hue = (hue + hueShiftDeg) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m2 = l - c / 2, rr, gg, bb;
    if (hue < 60) { rr = c; gg = x; bb = 0; } else if (hue < 120) { rr = x; gg = c; bb = 0; }
    else if (hue < 180) { rr = 0; gg = c; bb = x; } else if (hue < 240) { rr = 0; gg = x; bb = c; }
    else if (hue < 300) { rr = x; gg = 0; bb = c; } else { rr = c; gg = 0; bb = x; }
    var toHex = function (v) { return Math.round((v + m2) * 255).toString(16).padStart(2, "0"); };
    return "#" + toHex(rr) + toHex(gg) + toHex(bb);
  }

  // Catmull-Rom -> cubic Bezier: the ONLY way to thread a smooth curve
  // through a list of points with continuous tangents at every joint. The
  // previous version used one Q (quadratic) segment per point-pair with
  // the control point pinned to the PREVIOUS point's y — that has no
  // continuity across joints at all, which is exactly what read as
  // "buggy"/kinked corners instead of one soft, calm flowing line. This
  // is what real "flowing" curves need — never go back to a naive
  // point-to-point Q/L chain for this.
  function smoothPathFromPoints(points) {
    if (points.length < 2) return "";
    var d = "M" + points[0][0].toFixed(1) + "," + points[0][1].toFixed(1);
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += " C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + c2x.toFixed(1) + "," + c2y.toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d;
  }

  // A small family of restrained motifs, not just one sine-ish wave — the
  // seed picks between them so the pipeline keeps producing genuinely
  // different compositions within the same calm, structured "flow lines"
  // category rather than the same shape with different numbers plugged
  // in. Every motif still resolves to a plain point list handed to
  // smoothPathFromPoints() above, so they're all equally smooth.
  var FLOW_MOTIFS = [
    // Gentle rolling wave — gradual, few undulations, generous spacing.
    function wave(rand, baseY, amp) {
      var pts = [], x = -150;
      while (x < 1430) {
        pts.push([x, baseY + (rand() - 0.5) * amp]);
        x += 340 + rand() * 200;
      }
      return pts;
    },
    // One long, single bow across the whole width — the calmest motif,
    // just three points, curves through a single gentle apex.
    function arc(rand, baseY, amp) {
      var dir = rand() < 0.5 ? 1 : -1;
      return [
        [-150, baseY + amp * 0.4 * dir],
        [300, baseY - amp * 0.5 * dir],
        [640, baseY],
        [980, baseY + amp * 0.5 * dir],
        [1430, baseY - amp * 0.4 * dir],
      ];
    },
    // Barely-there diagonal drift with one soft bulge — the most minimal
    // motif, reads almost as a straight line at a gentle angle.
    function drift(rand, baseY, amp) {
      var tilt = (rand() - 0.5) * 90;
      return [
        [-150, baseY - tilt],
        [500, baseY - tilt * 0.3 + (rand() - 0.5) * amp * 0.6],
        [1430, baseY + tilt],
      ];
    },
  ];

  function buildFlowLine(rand, baseY, amp) {
    var motif = FLOW_MOTIFS[Math.floor(rand() * FLOW_MOTIFS.length)];
    return smoothPathFromPoints(motif(rand, baseY, amp));
  }

  function wireFlowLines() {
    var svg = document.querySelector(".flow-lines");
    if (!svg) return;
    // The model's markup is deliberately just the bare empty tag (see
    // websiteAgent.ts's siteKitBlock) — this owns the coordinate space
    // buildWavePath()'s numbers (x from -100..1400, y from 0..800) assume.
    svg.setAttribute("viewBox", "0 0 1280 800");
    svg.setAttribute("preserveAspectRatio", "none");
    var rand = seededRandom(svg.getAttribute("data-seed") || document.title || "aios");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --accent-2 fallback: only computed/applied when the model's own CSS
    // never set it (a real second verified brand color always takes
    // priority — see the comment above complementaryColor()).
    var rootStyle = getComputedStyle(document.documentElement);
    if (!rootStyle.getPropertyValue("--accent-2").trim()) {
      var accentHex = rootStyle.getPropertyValue("--accent").trim();
      var computed = complementaryColor(accentHex, 130 + rand() * 40);
      if (computed) document.documentElement.style.setProperty("--accent-2", computed);
    }

    var lineCount = 2 + Math.round(rand()); // 2 or 3
    var palette = ["var(--accent)", "var(--accent-2)", "var(--ink)"];
    var baseOpacity = [0.55, 0.5, 0.12];
    var svgNS = "http://www.w3.org/2000/svg";
    // sway: a bounded, per-line { amplitude, wavelength, phase } — NOT a
    // rate multiplied by raw scrollY. A flat rate*scrollY accumulates
    // forever on a long page (found 2026-09-16: lines visibly drifted
    // further and further from their drawn position, looking "off" the
    // longer you scrolled). Feeding scrollY through sin() instead keeps
    // every line oscillating within +/-amplitude px, forever, no matter
    // how far down the page you go — a calm continuous sway driven BY
    // scrolling, never a cumulative drift.
    var sway = [];
    for (var i = 0; i < lineCount; i++) {
      var baseY = 120 + (i * 680) / Math.max(1, lineCount - 1) + (rand() - 0.5) * 120;
      var amp = 60 + rand() * 90;
      var path = document.createElementNS(svgNS, "path");
      path.setAttribute("class", "flow-line");
      path.setAttribute("d", buildFlowLine(rand, baseY, amp));
      path.style.stroke = palette[i % palette.length];
      path.style.opacity = String(baseOpacity[i % baseOpacity.length] * (0.85 + rand() * 0.3));
      path.style.strokeWidth = (2 + rand() * 1.2).toFixed(1);
      svg.appendChild(path);
      sway.push({
        amplitude: 8 + rand() * 10, // px — small and cozy, never a big shift
        wavelength: 900 + rand() * 700, // px of scroll per full back-and-forth cycle
        phase: rand() * Math.PI * 2,
      });
    }

    if (reduceMotion) return; // static lines only, no scroll/mouse-driven transforms
    var lines = svg.querySelectorAll(".flow-line");
    var ticking = false;
    function update() {
      var y = window.scrollY || 0;
      lines.forEach(function (el, i) {
        var s = sway[i];
        var offset = Math.sin((y / s.wavelength) * Math.PI * 2 + s.phase) * s.amplitude;
        el.style.transform = "translateY(" + offset.toFixed(1) + "px)";
      });
      ticking = false;
    }
    update(); // paint the resting sway position immediately, don't wait for the first scroll event
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    document.addEventListener("mousemove", function (e) {
      var relX = (e.clientX / window.innerWidth - 0.5) * 10;
      lines.forEach(function (el, i) { el.style.marginLeft = (relX * (i % 2 === 0 ? 1 : -1)) + "px"; });
    });
  }

  /**
   * Signature mark — a small decorative squiggle for OTHER sections (first
   * use: under the star rating in social proof) that deliberately reuses
   * flow-lines' own smoothPathFromPoints() + a seed DERIVED FROM THE SAME
   * company seed (just a different suffix) rather than an independent
   * random source. That's the whole mechanism for "different sections
   * feel like they belong together without an AI judgment call": every
   * section pulls its shape/color from the same per-company seed family,
   * so they're never actually independent — same idea the user and Edwin
   * described (a library of per-section 'wow' moments that get puzzled
   * together to fit each other), done by shared seeding + a shared visual
   * vocabulary (thin crisp accent-colored lines) rather than by asking a
   * model to judge which combination matches.
   */
  function paintSignatureMark(svg, seedSuffix) {
    svg.setAttribute("viewBox", "0 0 200 30");
    svg.setAttribute("preserveAspectRatio", "none");
    var rand = seededRandom((svg.getAttribute("data-seed") || document.title || "aios") + seedSuffix);
    var pts = [
      [-10, 15 + (rand() - 0.5) * 4],
      [65, 15 + (rand() - 0.5) * 16],
      [135, 15 + (rand() - 0.5) * 16],
      [210, 15 + (rand() - 0.5) * 4],
    ];
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "flow-line");
    path.setAttribute("d", smoothPathFromPoints(pts));
    path.style.stroke = "var(--accent)";
    path.style.opacity = "0.65";
    path.style.strokeWidth = "2.5";
    svg.appendChild(path);
  }

  // The seed every auto-injected mark below shares (so they read as the
  // same signature as the hero's flow-lines) — reads the SAME data-seed
  // the model already put on .flow-lines rather than needing its own.
  function pageSeed() {
    var flow = document.querySelector(".flow-lines[data-seed]");
    return (flow && flow.getAttribute("data-seed")) || document.title || "aios";
  }

  function makeSignatureMarkSvg(seedSuffix) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "signature-mark");
    svg.setAttribute("data-seed", pageSeed());
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    paintSignatureMark(svg, seedSuffix);
    return svg;
  }

  /**
   * Auto-injected signature marks (2026-09-17) — no markup change needed
   * anywhere, in the model's prompt OR on any already-generated site: this
   * runs on every page load and adds the same small squiggle used under
   * the star rating to two more "peak" moments, entirely from site-kit.js
   * itself. Applies retroactively to every existing site the instant this
   * file is redeployed — no rebuild, no AI edit, no per-company patch.
   *
   * 1. Under the booking confirmation checkmark (.bd-success) — the LAST
   *    thing a visitor who just booked sees. Peak-end rule: the ending of
   *    an experience weighs as heavily in memory as its peak (the hero),
   *    so a fully static checkmark there was leaving that moment
   *    unfinished relative to the rest of the site.
   * 2. Under each price-list category heading (.menu-group h3) — extends
   *    the same signature family further down the page instead of it only
   *    appearing near reviews, same "shared seed = feels like one system"
   *    mechanism as everywhere else this exists.
   */
  function wireSignatureMark() {
    document.querySelectorAll(".signature-mark").forEach(function (svg) {
      paintSignatureMark(svg, "-mark");
    });

    document.querySelectorAll(".bd-success").forEach(function (host, i) {
      if (host.querySelector(".signature-mark")) return;
      var check = host.querySelector(".check");
      var mark = makeSignatureMarkSvg("-confirm-" + i);
      mark.style.margin = "0 auto 0.6rem";
      if (check && check.parentNode) check.insertAdjacentElement("afterend", mark);
      else host.insertBefore(mark, host.firstChild);
    });

    document.querySelectorAll(".menu-group h3").forEach(function (h3, i) {
      var group = h3.closest(".menu-group") || h3.parentNode;
      if (group.querySelector(".signature-mark")) return;
      var mark = makeSignatureMarkSvg("-menu-" + i);
      h3.insertAdjacentElement("afterend", mark);
    });
  }

  function wireNameWrite() {
    var pin = document.querySelector(".name-pin");
    if (!pin) return;
    // Text mode (.name-write) and image/logo mode (.name-write-img .color)
    // are mutually exclusive — a page uses one or the other. See
    // websiteAgent.ts's siteKitBlock() for when each applies.
    var text = document.querySelector(".name-write");
    var img = document.querySelector(".name-write-img .color");
    var target = text || img;
    if (!target) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (text) text.style.setProperty("--fill", "100%");
      else img.style.clipPath = "inset(0 0% 0 0)";
      return;
    }
    // Purely scroll-position-driven (not time-based) so it's scrubbable —
    // scroll back up and it un-writes itself — and stays perfectly in sync
    // with .name-pin's own CSS height (100svh + 180px): once scrollY
    // passes 180, the fill is done AND the sticky pin releases at the same
    // instant, so scrolling never continues into the next section before
    // the name has finished writing in.
    //
    // Eased (quadratic ease-out, not cubic), not linear: a linear mapping
    // makes the very first bit of scrolling produce a fill percentage too
    // small to be visibly different from 0%, which reads as a dead zone
    // before anything happens — front-loading the curve fixes that. But
    // cubic front-loads AGGRESSIVELY: it reads as ~97% filled by 70% of
    // the scroll budget, so the pin stays locked for a further stretch
    // that LOOKS finished but still refuses to scroll — a second, opposite
    // dead zone (real user report on Ellesse, 2026-09-09; a first attempt
    // at fixing this by shortening the budget alone — 480px to 300px —
    // wasn't enough on its own). Quadratic front-loads more gently (~91%
    // filled at 70% of budget) so "looks done" and "actually released"
    // stay closer together, and the shorter 180px budget shrinks whatever
    // gap remains to a distance under one normal scroll gesture.
    window.addEventListener(
      "scroll",
      function () {
        var linear = Math.min(1, window.scrollY / 180);
        var eased = 1 - Math.pow(1 - linear, 2);
        if (text) {
          text.style.setProperty("--fill", eased * 100 + "%");
        } else {
          img.style.clipPath = "inset(0 " + (100 - eased * 100) + "% 0 0)";
        }
      },
      { passive: true }
    );
  }

  // Booking calendar + third-party widget handoff mockup. Each
  // `.booking-day` block carries a `data-day-label` (e.g. "Tisdag 26/8")
  // and contains `.slot-btn` buttons for that day; clicking an enabled one
  // opens the single shared #bdBackdrop modal (see site-kit.css) with that
  // day+time filled in. Purely illustrative — no request is ever sent
  // anywhere, nothing persists past a reload.
  function wireBooking() {
    var backdrop = document.getElementById("bdBackdrop");
    // A page using a REAL booking flow (the legacy always-visible
    // #bookingCal, or the newer per-service #bookingWidget — see below) owns
    // the SAME #bdBackdrop modal for real — this mockup wiring must not
    // also attach to it, or a click on "Bekräfta bokning" would both
    // actually POST the booking AND get its success text overwritten by
    // this function's fake confirm handler.
    if (!backdrop || document.getElementById("bookingCal") || document.getElementById("bookingWidget")) return;
    var slotLine = document.getElementById("bdSlotLine");
    var nameInput = document.getElementById("bdName");
    var phoneInput = document.getElementById("bdPhone");
    var closeBtn = document.getElementById("bdClose");
    var confirmBtn = document.getElementById("bdConfirm");
    var successLine = document.getElementById("bdSuccessLine");
    var selectedBtn = null;
    var selectedLabel = null;

    function open(label) {
      backdrop.classList.remove("is-done");
      if (slotLine) slotLine.textContent = label;
      if (nameInput) nameInput.value = "";
      if (phoneInput) phoneInput.value = "";
      backdrop.classList.add("is-open");
    }
    function close() {
      backdrop.classList.remove("is-open");
      if (selectedBtn) { selectedBtn.classList.remove("is-selected"); selectedBtn = null; }
    }

    document.querySelectorAll(".booking-day").forEach(function (day) {
      var dayLabel = day.getAttribute("data-day-label") || "";
      day.querySelectorAll(".slot-btn:not(:disabled)").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (selectedBtn) selectedBtn.classList.remove("is-selected");
          btn.classList.add("is-selected");
          selectedBtn = btn;
          selectedLabel = (dayLabel + " kl. " + btn.textContent).trim();
          open(selectedLabel);
        });
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    closeOnOutsideClick(backdrop, close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && backdrop.classList.contains("is-open")) close();
    });
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (successLine) successLine.textContent = "Bokat: " + selectedLabel;
        backdrop.classList.add("is-done");
      });
    }
  }

  // Toggles .is-scrolled on the page's own `.site-header` once the visitor
  // has scrolled past a small threshold — this is what lets the header be
  // `position: fixed` + transparent at the very top (required for
  // .name-pin, see site-kit.css) while still becoming a solid, readable
  // bar once real content has scrolled underneath it. No-ops if the page
  // has no `.site-header`.
  function wireHeaderScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // ============================================================
  // Shared date/week helpers used by BOTH booking UIs below (the legacy
  // always-visible calendar and the newer per-service popup) — kept in one
  // place so a fix to "how a week range is computed" can't accidentally
  // apply to one and not the other.
  // ============================================================
  var WEEKDAY_SHORT = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
  var MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  var MONTHS_LONG = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  function startOfWeek(offset) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var day = d.getDay();
    var mondayDiff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + mondayDiff + offset * 7);
    return d;
  }

  function fmtRange(monday) {
    var sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    if (monday.getMonth() === sunday.getMonth()) {
      return monday.getDate() + "–" + sunday.getDate() + " " + MONTHS_SHORT[monday.getMonth()];
    }
    return monday.getDate() + " " + MONTHS_SHORT[monday.getMonth()] + " – " + sunday.getDate() + " " + MONTHS_SHORT[sunday.getMonth()];
  }

  function isoWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  /** "Vecka 40" as the headline with the date range under it; the year is
   * added once the week reaches into next year. */
  function setRangeLabel(el, monday) {
    if (!el) return;
    el.innerHTML = "";
    var num = document.createElement("span");
    num.className = "wk-num";
    num.textContent = "Vecka " + isoWeekNumber(monday);
    var sub = document.createElement("span");
    sub.className = "wk-sub";
    var sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sub.textContent = fmtRange(monday) + (sunday.getFullYear() !== new Date().getFullYear() ? " " + sunday.getFullYear() : "");
    el.appendChild(num);
    el.appendChild(sub);
  }

  /**
   * Demo mode (2026-09-17) — the booking UI's default state, and the whole
   * reason it is: a generated site is shown to a PROSPECT (or just previewed
   * by the agency) long before it's the business's real, live, "actually
   * bookable" website — at that stage there is no publicly-reachable
   * backend for a real visitor's browser to hit (see the bookingApiBase()
   * comment in websiteAgent.ts), and more importantly there SHOULDN'T be
   * one yet: nothing should actually get booked from a demo. Real feedback:
   * a prospect clicking "Boka" on the public demo link just hit a dead
   * network call and got nowhere, looking completely broken — and even
   * once the network problem is fixed, a demo silently creating REAL
   * booking rows would be its own bug.
   *
   * So every generated site defaults to demo mode (fully client-side,
   * zero network calls, nothing persisted) UNLESS the booking root element
   * carries `data-live="true"` — a deliberate, human, later flip (set once
   * the business is actually operating for real, e.g. via the portal) that
   * this file otherwise never sets on its own. Demo mode is not a
   * degraded/error state — it's the same interaction, same choreography,
   * same two example staff (Anna, Sebastian — the same pair
   * tutorialVideo.ts already uses, so the tutorial and the live demo site
   * always tell the same story) — just answered locally instead of over
   * the network.
   */
  var DEMO_STAFF = [
    { id: "demo-staff-anna", name: "Anna", title: "Personal" },
    { id: "demo-staff-sebastian", name: "Sebastian", title: "Personal" },
  ];

  // A handful of plausible, always-available weekday slots — deterministic,
  // never fabricated as "verified real availability" (the UI around this
  // never claims otherwise while in demo mode), just enough to make the
  // flow feel real. Closed Sundays (matches the vast majority of the
  // businesses this system serves) so the grid still shows a realistic
  // shape, not "open every day forever".
  // Demo bookings, kept per browser tab so a booked time and every slot
  // overlapping its duration disappear from the grid like real ones would
  // (the grid re-renders every 8s and on reopen, so disabling the clicked
  // button alone is lost). Same half-open [start, start+duration) overlap
  // rule as the server's computeAvailableSlots.
  var DEMO_BOOKED_KEY = "aiosDemoBookings";
  var demoBookings = [];
  try { demoBookings = JSON.parse(sessionStorage.getItem(DEMO_BOOKED_KEY) || "[]") || []; } catch (e) { demoBookings = []; }
  function hmToMin(hm) { var p = hm.split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function markDemoBooked(dateStr, time, staffId, durationMinutes) {
    demoBookings.push({ date: dateStr, start: hmToMin(time), minutes: durationMinutes || 30, staff: staffId || "" });
    try { sessionStorage.setItem(DEMO_BOOKED_KEY, JSON.stringify(demoBookings)); } catch (e) {}
  }
  function overlapsDemoBooking(dateStr, startMin, durationMinutes, staffId) {
    var endMin = startMin + (durationMinutes || 30);
    return demoBookings.some(function (b) {
      return b.date === dateStr && b.staff === (staffId || "") && startMin < b.start + b.minutes && b.start < endMin;
    });
  }

  function demoSlotsForDate(dateStr, staffId, durationMinutes) {
    var d = new Date(dateStr + "T00:00:00");
    if (d.getDay() === 0) return [];
    var all = ["10:00", "11:30", "13:00", "14:30", "16:00"].filter(function (t) {
      return !overlapsDemoBooking(dateStr, hmToMin(t), durationMinutes, staffId);
    });
    if (dateStr !== isoDate(new Date())) return all;
    var now = new Date();
    var nowMinutes = now.getHours() * 60 + now.getMinutes();
    return all.filter(function (t) {
      var hm = t.split(":");
      return parseInt(hm[0], 10) * 60 + parseInt(hm[1], 10) > nowMinutes + 30;
    });
  }

  /**
   * Renders 7 day-columns of slot buttons into `grid`, given a `perDay`
   * map ({dateStr: [times]}, already duration-aware from the availability
   * API — see config/availability.ts's computeAvailableSlots). `onPick(dateStr,
   * time, btn)` fires when an enabled slot is clicked. Shared by the legacy
   * calendar and the popup so a fix to how "today"/"fullbokat"/disabled
   * slots render only has to happen in one place.
   */
  function renderAvailabilityGrid(grid, days, perDay, onPick, closedDays) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var totalOpenSlots = 0;

    grid.innerHTML = "";
    days.forEach(function (d) {
      var dateStr = isoDate(d);
      var col = document.createElement("div");
      col.className = "booking-cal-day" + (dateStr === isoDate(today) ? " is-today" : "");

      var head = document.createElement("div");
      head.className = "booking-cal-day-head";
      head.innerHTML = "<span class=\"wd\">" + WEEKDAY_SHORT[d.getDay()] + "</span><span class=\"dt\">" + d.getDate() + "</span>";
      col.appendChild(head);

      var slotsWrap = document.createElement("div");
      slotsWrap.className = "booking-cal-slots";
      var slots = perDay[dateStr] || [];
      var isPast = d < today;

      if (slots.length === 0) {
        var full = document.createElement("span");
        full.className = "booking-cal-closed";
        var closedLabel = closedDays && closedDays[dateStr];
        full.textContent = closedLabel ? (typeof closedLabel === "string" ? closedLabel : "Stängt") : "Fullbokat";
        slotsWrap.appendChild(full);
      } else {
        slots.forEach(function (time) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "slot-btn";
          btn.textContent = time;
          if (isPast) {
            btn.disabled = true;
          } else {
            totalOpenSlots++;
            btn.addEventListener("click", function () { onPick(dateStr, time, btn); });
          }
          slotsWrap.appendChild(btn);
        });
      }
      col.appendChild(slotsWrap);
      grid.appendChild(col);
    });
    return totalOpenSlots;
  }

  /**
   * The single shared #bdBackdrop confirmation modal (name/phone + submit)
   * — used by whichever booking UI is present on the page. Created once in
   * init() and handed to both, so there is exactly one click handler on
   * #bdConfirm ever, regardless of which booking UI(s) exist on a given
   * page. Returns null if the page has no #bdBackdrop at all.
   */
  /** Closes an overlay only when the press both started and ended on the
   * backdrop itself; a press that starts inside the dialog and is released
   * outside it (e.g. a slightly dragged click) no longer closes it. */
  function closeOnOutsideClick(backdropEl, close) {
    var pressedOnBackdrop = false;
    backdropEl.addEventListener("pointerdown", function (e) { pressedOnBackdrop = e.target === backdropEl; });
    backdropEl.addEventListener("click", function (e) {
      if (e.target === backdropEl && pressedOnBackdrop) close();
      pressedOnBackdrop = false;
    });
  }

  /** Swedish numbers (07x…, 08…, +46…/0046…) or any international +number.
   * Same rule as the server's check in bookings.ts. */
  function isValidPhone(raw) {
    var s = String(raw || "").replace(/[\s\-().\/]/g, "");
    if (/^\+46/.test(s)) s = "0" + s.slice(3).replace(/^0/, "");
    else if (/^0046/.test(s)) s = "0" + s.slice(4).replace(/^0/, "");
    return /^0\d{7,9}$/.test(s) || /^\+\d{7,15}$/.test(s);
  }

  /**
   * Phone field with a fixed "+46" in front: the visitor types the rest and
   * it's grouped as they go (70 123 45 67, or 8 658 33 08 for Stockholm).
   * A typed/pasted leading 0, +46 or 0046 is absorbed. Starting with "+"
   * and another country code switches to a plain international field.
   */
  function wirePhoneInput(input) {
    var wrap = document.createElement("div");
    wrap.className = "bd-phone-wrap";
    var prefix = document.createElement("span");
    prefix.className = "bd-phone-prefix";
    prefix.textContent = "+46";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(prefix);
    wrap.appendChild(input);
    input.setAttribute("autocomplete", "tel");
    input.setAttribute("inputmode", "tel");
    input.placeholder = "70 123 45 67";

    function national(v) {
      var s = v.replace(/[^\d+]/g, "");
      if (s.indexOf("+46") === 0) s = s.slice(3);
      else if (s.indexOf("0046") === 0) s = s.slice(4);
      return s.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
    }
    function group(d) {
      var parts = d.charAt(0) === "8"
        ? [d.slice(0, 1), d.slice(1, 4), d.slice(4, 6), d.slice(6, 9)]
        : [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)];
      return parts.filter(Boolean).join(" ");
    }

    input.addEventListener("input", function () {
      var v = input.value;
      var t = v.trim();
      if (t === "+" || t === "+4") { wrap.classList.remove("is-intl"); return; }
      if (t.charAt(0) === "+" && t.indexOf("+46") !== 0) { wrap.classList.add("is-intl"); return; }
      wrap.classList.remove("is-intl");
      var caret = input.selectionStart == null ? v.length : input.selectionStart;
      var digitsBefore = national(v.slice(0, caret)).length;
      var formatted = group(national(v));
      input.value = formatted;
      var pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBefore) { if (/\d/.test(formatted.charAt(pos))) seen++; pos++; }
      try { input.setSelectionRange(pos, pos); } catch (e) {}
    });

    return {
      value: function () {
        return wrap.classList.contains("is-intl") ? input.value.replace(/[^\d+]/g, "") : "+46" + national(input.value);
      },
      reset: function () { input.value = ""; wrap.classList.remove("is-intl"); },
    };
  }

  function createConfirmModal(apiBase, companyId, isLive) {
    var backdrop = document.getElementById("bdBackdrop");
    if (!backdrop) return null;
    var slotLine = document.getElementById("bdSlotLine");
    var nameInput = document.getElementById("bdName");
    var phoneInput = document.getElementById("bdPhone");
    var closeBtn = document.getElementById("bdClose");
    var confirmBtn = document.getElementById("bdConfirm");
    var successLine = document.getElementById("bdSuccessLine");
    var pending = null; // { label, dateStr, timeLabel, staffId, serviceIds, serviceLabel, durationMinutes, btn, onDone }

    // Sites built before first/last name were split only have one "Namn"
    // field (#bdName): relabel it Förnamn and add Efternamn right after it.
    var lastNameInput = document.getElementById("bdLastName");
    if (nameInput && !lastNameInput) {
      var nameLabel = document.querySelector('label[for="bdName"]');
      if (nameLabel) nameLabel.textContent = "Förnamn";
      var lastField = document.createElement("div");
      lastField.className = "bd-field";
      var lastLabel = document.createElement("label");
      lastLabel.setAttribute("for", "bdLastName");
      lastLabel.textContent = "Efternamn";
      lastNameInput = document.createElement("input");
      lastNameInput.id = "bdLastName";
      lastNameInput.type = "text";
      lastField.appendChild(lastLabel);
      lastField.appendChild(lastNameInput);
      var nameField = nameInput.closest(".bd-field") || nameInput;
      nameField.parentNode.insertBefore(lastField, nameField.nextSibling);
    }
    if (nameInput) nameInput.setAttribute("autocomplete", "given-name");
    if (lastNameInput) lastNameInput.setAttribute("autocomplete", "family-name");
    var phone = phoneInput ? wirePhoneInput(phoneInput) : null;
    var formError = document.getElementById("bdError");
    if (!formError && confirmBtn) {
      formError = document.createElement("p");
      formError.id = "bdError";
      formError.className = "bd-error";
      formError.setAttribute("role", "alert");
      formError.hidden = true;
      confirmBtn.parentNode.insertBefore(formError, confirmBtn);
    }

    function showFormError(message, input) {
      [nameInput, lastNameInput, phoneInput].forEach(function (i) { if (i) i.removeAttribute("aria-invalid"); });
      if (!formError) return;
      formError.textContent = message || "";
      formError.hidden = !message;
      if (input) { input.setAttribute("aria-invalid", "true"); input.focus(); }
    }

    function validateForm() {
      var first = nameInput ? nameInput.value.trim() : "";
      var last = lastNameInput ? lastNameInput.value.trim() : "";
      if (!/\p{L}/u.test(first)) return { message: "Fyll i ditt förnamn.", input: nameInput };
      if (!/\p{L}/u.test(last)) return { message: "Fyll i ditt efternamn.", input: lastNameInput };
      if (!isValidPhone(phone ? phone.value() : "")) return { message: "Fyll i ett giltigt telefonnummer, t.ex. 70 123 45 67.", input: phoneInput };
      return null;
    }

    function isOpen() { return backdrop.classList.contains("is-open"); }

    function open(details) {
      pending = details;
      backdrop.classList.remove("is-done");
      if (slotLine) slotLine.textContent = details.label;
      if (nameInput) nameInput.value = "";
      if (lastNameInput) lastNameInput.value = "";
      if (phone) phone.reset();
      showFormError("");
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Bekräfta bokning"; }
      backdrop.classList.add("is-open");
    }
    function close() { backdrop.classList.remove("is-open"); }

    if (closeBtn) closeBtn.addEventListener("click", close);
    closeOnOutsideClick(backdrop, close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) close(); });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (!pending) return;
        var invalid = validateForm();
        if (invalid) { showFormError(invalid.message, invalid.input); return; }
        showFormError("");
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Bokar…";
        if (!isLive) {
          // Demo mode — see the comment above demoSlotsForDate(). Same
          // pacing as the real path (a brief "Bokar…" beat) but nothing is
          // ever sent anywhere or persisted.
          setTimeout(function () {
            markDemoBooked(pending.dateStr, pending.timeLabel, pending.staffId, pending.durationMinutes);
            backdrop.classList.add("is-done");
            if (successLine) successLine.textContent = "Bokat: " + pending.label;
            if (pending.btn) pending.btn.disabled = true;
            if (pending.onDone) pending.onDone(true);
          }, 500);
          return;
        }
        fetch(apiBase + "/bookings/" + companyId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingDate: pending.dateStr,
            timeLabel: pending.timeLabel,
            staffId: pending.staffId || undefined,
            serviceIds: pending.serviceIds && pending.serviceIds.length ? pending.serviceIds : undefined,
            serviceLabel: pending.serviceLabel || undefined,
            durationMinutes: pending.durationMinutes || undefined,
            customerName: (nameInput ? nameInput.value.trim() : "") + " " + (lastNameInput ? lastNameInput.value.trim() : ""),
            customerPhone: phone ? phone.value() : "",
          }),
        })
          .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, status: r.status, body: body }; }); })
          .then(function (res) {
            if (res.status === 400) {
              confirmBtn.disabled = false;
              confirmBtn.textContent = "Bekräfta bokning";
              showFormError(res.body.error || "Kontrollera uppgifterna och försök igen.");
              return;
            }
            backdrop.classList.add("is-done");
            if (res.ok) {
              if (successLine) successLine.textContent = "Bokat: " + pending.label;
              if (pending.btn) pending.btn.disabled = true;
            } else {
              if (successLine) successLine.textContent = res.body.error || "Kunde inte boka den tiden.";
            }
            if (pending.onDone) pending.onDone(res.ok);
          })
          .catch(function () {
            backdrop.classList.remove("is-open");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Bekräfta bokning";
            if (successLine) successLine.textContent = "Kunde inte nå bokningssystemet just nu.";
          });
      });
    }

    return { open: open, isOpen: isOpen };
  }

  // ============================================================
  // Rolling booking calendar (2026-09-09) — replaces the old per-site
  // hardcoded BOOKING_DAYS approach (specific dates written once by the
  // model at generation time, which silently go stale and once caused a
  // real weekday-mislabeling bug). This version is driven by a RECURRING
  // WEEKLY schedule (which weekdays/hours the business is open — real,
  // verified data, never fabricated) and computes actual calendar dates
  // itself, every time the page loads — so it never goes out of date, and
  // "next/previous week" is just a small offset, not new fictional data.
  //
  // LEGACY as of 2026-09-10 — a newly generated site uses the per-service
  // #bookingWidget below instead (opened from a "Boka" button on each price-
  // list item, not an always-visible week grid). This function is kept
  // only so an already-generated site with the old always-visible
  // #bookingCal markup keeps working unmodified until it's regenerated.
  //
  // Expected markup (see websiteAgent.ts's siteKitBlock()):
  //   <section id="bookingCal" data-company-id="..." data-api-base="...">
  //     <script type="application/json" id="bookingSchedule">
  //       {"slotMinutes":30,"weekly":{"1":{"open":"10:00","close":"18:00"},...,"0":null}}
  //     </script>
  //     <div class="booking-cal-head">
  //       <button class="booking-cal-nav" data-dir="-1">‹</button>
  //       <span class="booking-cal-range" id="bookingCalRange"></span>
  //       <button class="booking-cal-nav" data-dir="1">›</button>
  //     </div>
  //     <div class="booking-cal-grid" id="bookingCalGrid"></div>
  //   </section>
  //   ...plus the same #bdBackdrop confirmation modal (bdSlotLine/bdName/
  //   bdPhone/bdConfirm/bdClose/bdSuccessLine).
  //
  // `weekly` keys are JS's own getDay() convention: 0=Sön ... 6=Lör, value
  // either null (closed) or {open,close} in "HH:MM".
  function wireBookingCalendar(confirmModal) {
    var root = document.getElementById("bookingCal");
    if (!root || !confirmModal) return;
    var scheduleEl = document.getElementById("bookingSchedule");
    if (!scheduleEl) return;

    var schedule;
    try { schedule = JSON.parse(scheduleEl.textContent); } catch (e) { return; }
    var companyId = root.getAttribute("data-company-id");
    var apiBase = root.getAttribute("data-api-base") || "";
    var slotMinutes = schedule.slotMinutes || 30;
    var weekly = schedule.weekly || {};

    var grid = document.getElementById("bookingCalGrid");
    var rangeLabel = document.getElementById("bookingCalRange");
    var navBtns = root.querySelectorAll(".booking-cal-nav");
    var weekOffset = 0;

    // Staff/service pickers — OPTIONAL markup. A page built before multi-
    // staff/duration-aware scheduling existed (or one that only ever needs
    // a single default resource) simply won't have these elements, and
    // everything below falls back to the original fixed-slotMinutes grid
    // exactly as before.
    var serviceSelect = document.getElementById("bookingServiceSelect");
    var staffSelect = document.getElementById("bookingStaffSelect");
    var nextAvailEl = document.getElementById("bookingCalNextAvail");
    var services = [];
    var selectedStaffId = null;

    function selectedDurationMinutes() {
      if (!serviceSelect || !serviceSelect.value) return slotMinutes;
      var svc = services.filter(function (s) { return s.id === serviceSelect.value; })[0];
      return svc ? svc.duration_minutes : slotMinutes;
    }
    function selectedServiceIds() {
      return serviceSelect && serviceSelect.value ? [serviceSelect.value] : [];
    }

    function loadStaffAndServices() {
      var tasks = [];
      if (staffSelect) {
        tasks.push(
          fetch(apiBase + "/bookings/" + companyId + "/staff")
            .then(function (r) { return r.json(); })
            .then(function (rows) {
              staffSelect.innerHTML = "";
              (rows || []).forEach(function (s) {
                var opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = s.name + (s.title ? " — " + s.title : "");
                staffSelect.appendChild(opt);
              });
              selectedStaffId = rows && rows[0] ? rows[0].id : null;
              staffSelect.style.display = rows && rows.length > 1 ? "" : "none";
              staffSelect.addEventListener("change", function () { selectedStaffId = staffSelect.value; render(); });
            })
            .catch(function () {})
        );
      }
      if (serviceSelect) {
        tasks.push(
          fetch(apiBase + "/bookings/" + companyId + "/services")
            .then(function (r) { return r.json(); })
            .then(function (rows) {
              services = rows || [];
              serviceSelect.innerHTML = "";
              services.forEach(function (s) {
                var opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = s.name + " (" + s.duration_minutes + " min, " + s.price_label + ")";
                serviceSelect.appendChild(opt);
              });
              serviceSelect.style.display = services.length > 0 ? "" : "none";
              serviceSelect.addEventListener("change", render);
            })
            .catch(function () {})
        );
      }
      return Promise.all(tasks);
    }

    function slotsForDay(dayOfWeek) {
      var hours = weekly[String(dayOfWeek)];
      if (!hours) return [];
      var openParts = hours.open.split(":").map(Number);
      var closeParts = hours.close.split(":").map(Number);
      var startMin = openParts[0] * 60 + openParts[1];
      var endMin = closeParts[0] * 60 + closeParts[1];
      var out = [];
      for (var t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
        out.push(pad2(Math.floor(t / 60)) + ":" + pad2(t % 60));
      }
      return out;
    }

    function onPick(dateStr, timeLabel, btn) {
      var d = new Date(dateStr + "T00:00:00");
      confirmModal.open({
        label: WEEKDAY_SHORT[d.getDay()] + " " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()] + ", kl. " + timeLabel,
        dateStr: dateStr,
        timeLabel: timeLabel,
        staffId: selectedStaffId,
        serviceIds: selectedServiceIds(),
        btn: btn,
        onDone: function (ok) { if (!ok) render(); }, // someone else just took it — refresh so the grid reflects reality
      });
    }

    function renderGridLegacy(days, taken) {
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      grid.innerHTML = "";
      days.forEach(function (d) {
        var dateStr = isoDate(d);
        var col = document.createElement("div");
        col.className = "booking-cal-day" + (dateStr === isoDate(today) ? " is-today" : "");
        var head = document.createElement("div");
        head.className = "booking-cal-day-head";
        head.innerHTML = "<span class=\"wd\">" + WEEKDAY_SHORT[d.getDay()] + "</span><span class=\"dt\">" + d.getDate() + "</span>";
        col.appendChild(head);
        var slotsWrap = document.createElement("div");
        slotsWrap.className = "booking-cal-slots";
        var slots = slotsForDay(d.getDay());
        var isPast = d < today;
        var dayIsOpen = !!weekly[String(d.getDay())];
        if (slots.length === 0 && !dayIsOpen) {
          var closed = document.createElement("span");
          closed.className = "booking-cal-closed";
          closed.textContent = "Stängt";
          slotsWrap.appendChild(closed);
        } else {
          slots.forEach(function (time) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "slot-btn";
            btn.textContent = time;
            if (isPast || (taken && taken[dateStr + "|" + time])) {
              btn.disabled = true;
            } else {
              btn.addEventListener("click", function () { onPick(dateStr, time, btn); });
            }
            slotsWrap.appendChild(btn);
          });
        }
        col.appendChild(slotsWrap);
        grid.appendChild(col);
      });
    }

    function showNextAvailable(fromDateStr) {
      if (!nextAvailEl) return;
      nextAvailEl.style.display = "";
      nextAvailEl.innerHTML = "";
      var link = document.createElement("button");
      link.type = "button";
      link.className = "chip-link-btn";
      link.textContent = "Visa nästa lediga tid";
      link.addEventListener("click", function () {
        var staffParam = selectedStaffId ? "&staffId=" + selectedStaffId : "";
        fetch(apiBase + "/bookings/" + companyId + "/next-available?durationMinutes=" + selectedDurationMinutes() + "&from=" + fromDateStr + staffParam)
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (next) {
            if (!next) { nextAvailEl.textContent = "Ingen ledig tid hittades den närmaste tiden."; return; }
            var target = new Date(next.date + "T00:00:00");
            var monday = startOfWeek(0);
            weekOffset = Math.round((target - monday) / (7 * 24 * 60 * 60 * 1000));
            render();
          });
      });
      nextAvailEl.appendChild(link);
    }

    function render() {
      var monday = startOfWeek(weekOffset);
      setRangeLabel(rangeLabel, monday);
      var days = [];
      for (var i = 0; i < 7; i++) {
        var d = new Date(monday);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
      if (nextAvailEl) nextAvailEl.style.display = "none";
      grid.classList.add("is-loading");

      if (staffSelect && selectedStaffId) {
        var duration = selectedDurationMinutes();
        Promise.all(
          days.map(function (d) {
            var dateStr = isoDate(d);
            return fetch(apiBase + "/bookings/" + companyId + "/availability?staffId=" + selectedStaffId + "&date=" + dateStr + "&durationMinutes=" + duration)
              .then(function (r) { return r.json(); })
              .then(function (res) { return { dateStr: dateStr, slots: res.slots || [], closed: !!res.closed }; })
              .catch(function () { return { dateStr: dateStr, slots: [] }; });
          })
        ).then(function (results) {
          var perDay = {};
          var closedDays = {};
          results.forEach(function (r) { perDay[r.dateStr] = r.slots; if (r.closed) closedDays[r.dateStr] = true; });
          var openCount = renderAvailabilityGrid(grid, days, perDay, onPick, closedDays);
          grid.classList.remove("is-loading");
          if (openCount === 0) showNextAvailable(isoDate(days[6]));
        });
        return;
      }

      // Legacy mode — unchanged from before multi-staff/services existed.
      fetch(apiBase + "/bookings/" + companyId + "?from=" + isoDate(days[0]) + "&to=" + isoDate(days[6]))
        .then(function (r) { return r.json(); })
        .then(function (existing) {
          var taken = {};
          (existing || []).forEach(function (b) { taken[b.booking_date + "|" + b.time_label] = true; });
          renderGridLegacy(days, taken);
        })
        .catch(function () { renderGridLegacy(days, {}); })
        .then(function () { grid.classList.remove("is-loading"); });
    }

    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        weekOffset += parseInt(btn.getAttribute("data-dir"), 10) || 0;
        if (weekOffset < 0) weekOffset = 0; // never navigate into the past
        render();
      });
    });

    // Auto-refresh: a booking made/moved elsewhere (the portal's "boka
    // om"/manual-entry, or another visitor) never pushes to an already-open
    // page — without this, a slot that just became taken stays clickable-
    // looking here until someone reloads. Paused while the confirmation
    // modal is open so a mid-booking visitor's screen doesn't shift under
    // them. `focus` alongside `visibilitychange` — visibilitychange only
    // fires when the tab is actually hidden/minimized, not when switching
    // between two side-by-side windows that stay technically "visible".
    setInterval(function () { if (!confirmModal.isOpen()) render(); }, 8000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && !confirmModal.isOpen()) render();
    });
    window.addEventListener("focus", function () { if (!confirmModal.isOpen()) render(); });

    loadStaffAndServices().then(render);
  }

  // ============================================================
  // Step-by-step booking flow (2026-09-27), modeled on Voady: the site's
  // price list stays as it is, and "Boka" on a service opens this popup,
  // which asks one question per step (hair length/type, stylist, time,
  // contact details) with a back arrow, a progress bar and a summary that
  // follows along. It builds its own markup inside #bookingWidget's
  // .booking-widget-modal, so already-generated sites pick it up on their
  // next publish without their HTML changing.
  //
  // #bookingWidget attributes: data-company-id, data-api-base,
  // data-live="true" (real bookings; otherwise demo mode, see DEMO_STAFF),
  // data-hair-step="false" (no hair questions, e.g. massage or nails).
  // Which questions a service gets is decided by SERVICE_PROFILES below.
  // Price-list buttons: <button class="price-item-book-btn"
  //   data-service-name="Herrklippning" data-duration-minutes="30">Boka</button>
  // (the price is read from the nearest .price-item's .price-item-amount).
  // ============================================================
  // Same limit as the server's BOOKING_HORIZON_DAYS (config/availability.ts), about 6 months.
  var BOOKING_HORIZON_DAYS = 183;
  var HAIR_LENGTHS = ["Kort", "Mellan", "Långt", "Extra långt"];
  var HAIR_TYPES = ["Tunt", "Normalt", "Tjockt"];
  // The ponytail rule of thumb stylists use; shown under each thickness.
  var HAIR_TYPE_UNSURE = "Vet inte";
  // Two self-tests a visitor can do right away: the hair-tie test stylists
  // use (wraps around a ponytail), and scalp visibility for short hair.
  var HAIR_TYPE_HELP = [
    ["Snodden går 3 varv eller fler", "Hårbotten syns lätt"],
    ["Snodden går 2 varv", "Hårbotten syns lite i benan"],
    ["Snodden går 1 varv", "Hårbotten syns knappt"],
  ];

  /** A ponytail held by a hair tie wrapped 3 (thin), 2 or 1 (thick) times;
   * the bundle widens with thickness. */
  function thicknessIcon(level) {
    var wraps = [3, 2, 1][level];
    var count = [3, 6, 10][level];
    var top = [1.6, 2.8, 4.2][level];
    var bottom = [4.5, 9, 14][level];
    var tieTop = 5;
    var bandH = 2.2;
    var gap = 0.9;
    var strandTop = tieTop + wraps * (bandH + gap);
    var bands = "";
    for (var w = 0; w < wraps; w++) {
      bands += '<rect x="' + (20 - top - 1.6).toFixed(1) + '" y="' + (tieTop + w * (bandH + gap)).toFixed(1) +
        '" width="' + (2 * top + 3.2).toFixed(1) + '" height="' + bandH + '" rx="1.1"/>';
    }
    var strands = "";
    for (var i = 0; i < count; i++) {
      var t = count === 1 ? 0.5 : i / (count - 1);
      var x1 = (20 - top + 2 * top * t).toFixed(1);
      var x2 = (20 - bottom + 2 * bottom * t).toFixed(1);
      strands += '<path d="M' + x1 + " " + strandTop + "C" + x1 + " " + (strandTop + 9) + " " + x2 + " 25 " + x2 + ' 36"/>';
    }
    return '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true">' +
      '<g stroke-width="1.25">' + strands + '</g><g fill="currentColor" stroke="none">' + bands + "</g></svg>";
  }

  // What each length means on the body, shown under the figure.
  var HAIR_LENGTH_HELP = ["Ovanför axlarna", "Nuddar axlarna", "Nedanför axlarna, till bröstet", "Till mitten av ryggen eller längre"];

  /** Front view of head, neck, shoulders and torso with the hair filled in:
   * a short crop that stays on the head (0), hair ending just above the
   * shoulders (1), a little below them (2) or at mid-back (3). A dashed line
   * beside the body marks where the hair ends so the four compare at a
   * glance. */
  function hairIcon(lengthIndex) {
    function n(v) { return (Math.round(v * 10) / 10).toString(); }
    var endY, hair, lOut, rOut;
    if (lengthIndex === 0) {
      // Short crop: a cap on top of the head down to the temples, nothing hanging.
      endY = 23; lOut = 23.2; rOut = 40.8;
      hair = "M23.2 23C21.8 5.5 42.2 5.5 40.8 23L39.6 23C39.6 17.5 36 16.5 32 16.5C28 16.5 24.4 17.5 24.4 23Z";
    } else {
      endY = [0, 37, 52, 80][lengthIndex];
      var flare = [0, 1.5, 3, 5][lengthIndex];
      var width = [0, 4.5, 6, 7][lengthIndex];
      rOut = 41.5 + flare; lOut = 22.5 - flare;
      var rIn = rOut - width, lIn = lOut + width;
      var midY = n((25 + endY) / 2);
      // Outer edges bow out slightly so the lengths read as hair, not stripes.
      hair = "M22.5 25C21.5 5 42.5 5 41.5 25" +
        "Q" + n(rOut + 1.2) + " " + midY + " " + n(rOut) + " " + endY + "Q" + n(rOut - width / 2) + " " + (endY + 2.5) + " " + n(rIn) + " " + endY +
        "L39.5 25C38 16 26 16 24.5 25" +
        "L" + n(lIn) + " " + endY + "Q" + n(lOut + width / 2) + " " + (endY + 2.5) + " " + n(lOut) + " " + endY +
        "Q" + n(lOut - 1.2) + " " + midY + " 22.5 25Z";
    }
    return '<svg viewBox="0 0 64 96" width="52" height="78" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<g class="bf-body-outline" stroke="currentColor" stroke-width="1.3">' +
      '<ellipse cx="32" cy="22" rx="8.5" ry="10.5"/><path d="M28.5 31.5V37M35.5 31.5V37"/>' +
      '<path d="M28.5 37C20 38 11 39.5 9.5 47V72M35.5 37C44 38 53 39.5 54.5 47V72"/>' +
      // The torso fades out downwards so the eye stays on head and shoulders.
      '<path d="M9.5 72V84M54.5 72V84" stroke-opacity="0.55"/><path d="M9.5 84V95M54.5 84V95" stroke-opacity="0.22"/></g>' +
      '<path class="bf-hair" d="' + hair + '"/>' +
      '<path class="bf-hair-guide" d="M2 ' + endY + "H" + n(lOut - 2) + "M" + n(rOut + 2) + " " + endY + 'H62" stroke-width="1.3" stroke-dasharray="2 2.5"/>' +
      "</svg>";
  }
  // Questions the booking flow can ask before the stylist step. `label` is
  // the heading, `note` the short label saved on the booking for the stylist.
  // Each question gets its own step; `title` (or else `label`) heads it.
  var QUESTIONS = {
    hairLength: { label: "Hårlängd", title: "Hur långt är ditt hår?", note: "Hårlängd" },
    hairThickness: { label: "Hårets tjocklek", title: "Hur tjockt är ditt hår?", note: "Tjocklek" },
    colorHistory: {
      label: "Har håret färgats de senaste 6 månaderna?", note: "Färgat senaste 6 mån",
      options: ["Nej", "Ja, hemma", "Ja, i salong"],
      hint: "Tidigare färg påverkar vilken behandling och hur lång tid som behövs.",
    },
    firstColor: {
      label: "Är det första gången du färgar håret hos oss?", note: "Första färgningen hos oss",
      options: ["Ja", "Nej"],
      hint: "Första gången kan vi behöva göra ett allergitest några dagar innan.",
    },
    currentExtensions: {
      label: "Har du extensions i håret idag?", note: "Har extensions idag",
      options: ["Nej", "Ja"],
    },
    wantedLength: {
      label: "Hur långt vill du ha håret?", note: "Önskad längd",
      options: ["Axellångt", "Bröstlångt", "Midjelångt"],
    },
    occasion: {
      label: "Vad är tillfället?", note: "Tillfälle", optional: true,
      options: ["Bröllop", "Fest", "Annat"],
    },
  };
  // Which questions a service gets, matched on its name (first match wins).
  // Quick men's/kids'/beard/fringe services skip the questions entirely.
  var SERVICE_PROFILES = [
    { match: /färg|farg|slinga|slingor|balayage|toning|blekning|highlight|ombre|nyans/i,
      questions: ["hairLength", "hairThickness", "colorHistory", "firstColor"],
      message: "T.ex. vilken färg eller nyans du vill ha" },
    { match: /extension|löshår|loshar|hårförläng|harforlang/i,
      questions: ["hairLength", "hairThickness", "currentExtensions", "wantedLength"],
      message: "T.ex. vilken färg eller sorts extensions du tänkt dig" },
    { match: /uppsättning|uppsattning|bröllop|brollop|brud|fest|styling|föning|foning|locka/i,
      questions: ["hairLength", "occasion"],
      message: "T.ex. tid för vigseln eller en bild på frisyren du vill ha" },
    { match: /herr|barn|maskin|skägg|skagg|rakning|lugg|snagg|fade|barber|trimning/i,
      questions: [] },
    { match: /./, questions: ["hairLength", "hairThickness"] },
  ];
  function profileFor(serviceName) {
    for (var i = 0; i < SERVICE_PROFILES.length; i++) {
      if (SERVICE_PROFILES[i].match.test(serviceName)) return SERVICE_PROFILES[i];
    }
    return { questions: [] };
  }

  var ANYONE_ICON = '<svg viewBox="0 0 40 40" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="20" cy="14" r="5"/><path d="M11 31c1-5.5 4.5-8 9-8s8 2.5 9 8"/><circle cx="9" cy="17" r="3.5"/><path d="M3 30c.6-3.8 2.8-5.6 6-5.8"/>' +
    '<circle cx="31" cy="17" r="3.5"/><path d="M37 30c-.6-3.8-2.8-5.6-6-5.8"/></svg>';
  var BACK_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';

  function mk(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/);
    if (parts.length > 1) return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    var one = parts[0] || "?";
    return one.charAt(0).toUpperCase() + one.charAt(1).toLowerCase();
  }
  function fmtSlot(dateStr, time) {
    var d = new Date(dateStr + "T00:00:00");
    return WEEKDAY_SHORT[d.getDay()] + " " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()] + " kl. " + time;
  }

  function wireBookingFlow() {
    var popup = document.getElementById("bookingWidget");
    var modal = popup ? popup.querySelector(".booking-widget-modal") : null;
    var bookBtns = document.querySelectorAll(".price-item-book-btn");
    if (!popup || !modal || bookBtns.length === 0) return;

    var companyId = popup.getAttribute("data-company-id");
    var apiBase = popup.getAttribute("data-api-base") || "";
    var isLive = popup.getAttribute("data-live") === "true";
    var useHairStep = popup.getAttribute("data-hair-step") !== "false";

    // ---- static frame ----
    modal.innerHTML = "";
    modal.classList.add("bf");
    var head = mk("div", "bf-head");
    var backBtn = mk("button", "bf-back");
    backBtn.type = "button";
    backBtn.setAttribute("aria-label", "Tillbaka");
    backBtn.innerHTML = BACK_ICON;
    var title = mk("h2", "bf-title");
    title.tabIndex = -1;
    var closeBtn = mk("button", "bf-close", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Stäng");
    head.appendChild(backBtn);
    head.appendChild(title);
    head.appendChild(closeBtn);
    var progress = mk("div", "bf-progress");
    var progressFill = mk("span");
    progress.appendChild(progressFill);
    var summary = mk("div", "bf-summary");
    var body = mk("div", "bf-body");
    var foot = mk("div", "bf-foot");
    var nextBtn = mk("button", "bf-next");
    nextBtn.type = "button";
    foot.appendChild(nextBtn);
    [head, progress, summary, body, foot].forEach(function (n) { modal.appendChild(n); });

    // ---- state ----
    var state = null;
    var steps = [];
    var stepIndex = 0;
    var staffList = null; // null = not loaded yet
    var refreshTimer = null;
    var dismissPicker = null; // set while the time step's week picker is open

    function loadStaff() {
      if (staffList) return Promise.resolve(staffList);
      if (!isLive) { staffList = DEMO_STAFF; return Promise.resolve(staffList); }
      return fetch(apiBase + "/bookings/" + companyId + "/staff")
        .then(function (r) { return r.json(); })
        .then(function (rows) { staffList = Array.isArray(rows) ? rows : []; return staffList; })
        .catch(function () { return null; });
    }

    function staffName(id) {
      var s = (staffList || []).filter(function (x) { return x.id === id; })[0];
      return s ? s.name : "";
    }

    function renderSummary() {
      summary.innerHTML = "";
      var svc = mk("div", "bf-summary-service");
      svc.appendChild(mk("strong", null, state.service.name));
      var meta = [state.service.durationMinutes + " min"];
      if (state.service.priceLabel) meta.push(state.service.priceLabel);
      svc.appendChild(mk("span", null, meta.join(" · ")));
      summary.appendChild(svc);
      var picks = [];
      var a = state.answers;
      if (a.hairLength) picks.push("Hår: " + a.hairLength.toLowerCase() + (a.hairThickness ? ", " + (a.hairThickness === HAIR_TYPE_UNSURE ? "tjocklek okänd" : a.hairThickness.toLowerCase()) : ""));
      if (state.staff) picks.push(state.staff === "any" ? "Vem som helst" : state.staff.name);
      if (state.slot) picks.push(fmtSlot(state.slot.dateStr, state.slot.time));
      // Always two lines (an empty one to start with), so the first answer
      // doesn't push the options down mid-click.
      summary.appendChild(mk("div", "bf-summary-picks", picks.length ? picks.join(" · ") : " "));
    }

    function setFooter(label, enabled, onClick) {
      foot.hidden = !label;
      if (!label) return;
      nextBtn.textContent = label;
      nextBtn.disabled = !enabled;
      nextBtn.onclick = onClick;
    }

    function goTo(index) {
      stepIndex = Math.max(0, Math.min(index, steps.length - 1));
      var step = steps[stepIndex];
      backBtn.style.visibility = stepIndex === 0 || step === "done" ? "hidden" : "visible";
      progressFill.style.width = Math.round(((stepIndex + 1) / steps.length) * 100) + "%";
      body.innerHTML = "";
      body.scrollTop = 0;
      dismissPicker = null;
      renderSummary();
      if (step.indexOf("q:") === 0) renderQuestionStep(step.slice(2));
      else if (step === "staff") renderStaffStep();
      else if (step === "time") renderTimeStep();
      else if (step === "details") renderDetailsStep();
      else renderDoneStep();
      try { title.focus({ preventScroll: true }); } catch (e) {}
    }
    function next() { goTo(stepIndex + 1); }

    // ---- steps: one question per step for this service ----
    // Picking an answer marks it and moves on to the next step by itself;
    // the back arrow returns with the earlier choice still marked.
    function tileGroup(qid, hint, options, iconFor, descriptions, extraClass) {
      var group = mk("section", "bf-group");
      if (hint) group.appendChild(mk("p", "bf-hint", hint));
      var tiles = mk("div", "bf-tiles bf-tiles-" + options.length + (descriptions ? " bf-with-desc" : "") +
        (iconFor ? "" : " bf-tiles-plain") + (extraClass ? " " + extraClass : ""));
      options.forEach(function (opt, i) {
        var tile = mk("button", "bf-tile");
        tile.type = "button";
        if (iconFor) {
          var icon = mk("span", "bf-tile-icon");
          icon.innerHTML = iconFor(i);
          tile.appendChild(icon);
        }
        var text = mk("span", "bf-tile-text");
        text.appendChild(mk("span", "bf-tile-label", opt));
        if (descriptions) {
          [].concat(descriptions[i]).forEach(function (line) { text.appendChild(mk("span", "bf-tile-desc", line)); });
        }
        tile.appendChild(text);
        answerButton(group, tile, qid, opt);
        tiles.appendChild(tile);
      });
      group.appendChild(tiles);
      return group;
    }
    function answerButton(group, btn, qid, value) {
      btn.setAttribute("aria-pressed", String(state.answers[qid] === value));
      btn.addEventListener("click", function () {
        state.answers[qid] = value;
        group.querySelectorAll("button[aria-pressed]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        renderSummary();
        updateQuestionFooter(qid);
        // A short pause so the visitor sees what they picked before the next step.
        var at = stepIndex;
        setTimeout(function () { if (stepIndex === at && steps[at] === "q:" + qid) next(); }, 280);
      });
    }
    function updateQuestionFooter(qid) {
      var answered = !!state.answers[qid];
      var optional = !!QUESTIONS[qid].optional;
      setFooter(answered || !optional ? "Gå vidare" : "Hoppa över", answered || optional, next);
    }

    function renderQuestionStep(qid) {
      var q = QUESTIONS[qid];
      var qs = state.profile.questions;
      title.textContent = (q.title || q.label) + (q.optional ? " (valfritt)" : "");
      if (qs.length > 1) body.appendChild(mk("p", "bf-step-count", "Fråga " + (qs.indexOf(qid) + 1) + " av " + qs.length));
      if (qid === "hairLength") {
        body.appendChild(tileGroup(qid, "Tvekar du mellan två längder? Välj den längre.", HAIR_LENGTHS,
          hairIcon, HAIR_LENGTH_HELP, "bf-tiles-length"));
      } else if (qid === "hairThickness") {
        var group = tileGroup(qid,
          "Testa så här: sätt upp håret i en hästsvans och räkna hur många varv en vanlig hårsnodd går runt. Har du kort hår, titta på hur mycket av hårbotten som syns.",
          HAIR_TYPES, thicknessIcon, HAIR_TYPE_HELP);
        var unsure = mk("button", "bf-unsure", "Jag vet inte, frisören kollar när jag kommer");
        unsure.type = "button";
        answerButton(group, unsure, qid, HAIR_TYPE_UNSURE);
        group.appendChild(unsure);
        body.appendChild(group);
      } else if (qid === "wantedLength") {
        // Axellångt / Bröstlångt / Midjelångt use the same figures as lengths 1-3.
        body.appendChild(tileGroup(qid, q.hint, q.options, function (i) { return hairIcon(i + 1); }, null, "bf-tiles-length"));
      } else {
        body.appendChild(tileGroup(qid, q.hint, q.options, null, null));
      }
      updateQuestionFooter(qid);
    }

    // ---- step: stylist ----
    function renderStaffStep() {
      title.textContent = "Välj frisör";
      setFooter(null);
      var holder = mk("div", "bf-tiles bf-staff");
      body.appendChild(holder);
      holder.appendChild(mk("p", "bf-hint", "Hämtar personal…"));
      loadStaff().then(function (list) {
        if (steps[stepIndex] !== "staff") return;
        holder.innerHTML = "";
        if (!list) { holder.appendChild(mk("p", "bf-hint", "Kunde inte nå bokningssystemet just nu. Försök igen om en stund.")); return; }
        if (list.length === 0) { holder.appendChild(mk("p", "bf-hint", "Onlinebokningen öppnar inom kort. Hör av dig direkt till oss så hjälper vi dig hitta en tid.")); return; }
        function staffTile(label, sub, avatarNode, value) {
          var tile = mk("button", "bf-tile bf-staff-tile");
          tile.type = "button";
          tile.setAttribute("aria-pressed", String(state.staff === value || (state.staff && value && state.staff.id === value.id)));
          tile.appendChild(avatarNode);
          tile.appendChild(mk("span", "bf-tile-label", label));
          if (sub) tile.appendChild(mk("span", "bf-tile-sub", sub));
          tile.addEventListener("click", function () {
            state.staff = value;
            state.slot = null;
            state.weekOffset = 0;
            state.weekPicked = false;
            next();
          });
          return tile;
        }
        if (list.length > 1) {
          var anyAvatar = mk("span", "bf-avatar is-any");
          anyAvatar.innerHTML = ANYONE_ICON;
          holder.appendChild(staffTile("Vem som helst", "Första lediga tid", anyAvatar, "any"));
        }
        list.forEach(function (s) {
          holder.appendChild(staffTile(s.name, s.title || "", mk("span", "bf-avatar", initials(s.name)), s));
        });
      });
    }

    // ---- step: time ----
    function candidateStaff() {
      return state.staff === "any" ? (staffList || []) : [state.staff];
    }
    function weekOffsetOf(dateStr) {
      return Math.max(0, Math.round((new Date(dateStr + "T00:00:00") - startOfWeek(0)) / (7 * 24 * 60 * 60 * 1000)));
    }
    function firstFreeWeek() {
      var duration = state.service.durationMinutes;
      if (!isLive) {
        var d = new Date();
        for (var i = 0; i < 14; i++) {
          var dateStr = isoDate(d);
          if (candidateStaff().some(function (p) { return demoSlotsForDate(dateStr, p.id, duration).length > 0; })) return Promise.resolve(weekOffsetOf(dateStr));
          d.setDate(d.getDate() + 1);
        }
        return Promise.resolve(0);
      }
      var staffParam = state.staff === "any" ? "" : "&staffId=" + state.staff.id;
      return fetch(apiBase + "/bookings/" + companyId + "/next-available?durationMinutes=" + duration + staffParam)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (n) { return n && n.date ? weekOffsetOf(n.date) : 0; })
        .catch(function () { return 0; });
    }

    function renderTimeStep() {
      title.textContent = "Välj tid";
      setFooter(null);
      var calHead = mk("div", "booking-cal-head");
      var prev = mk("button", "booking-cal-nav", "‹");
      prev.type = "button";
      prev.setAttribute("aria-label", "Föregående vecka");
      // The week label is a button that opens a month/week picker below it.
      var range = mk("button", "booking-cal-range bf-range-btn");
      range.type = "button";
      range.setAttribute("aria-haspopup", "true");
      range.setAttribute("aria-expanded", "false");
      range.title = "Välj vecka";
      var nxt = mk("button", "booking-cal-nav", "›");
      nxt.type = "button";
      nxt.setAttribute("aria-label", "Nästa vecka");
      calHead.appendChild(prev);
      calHead.appendChild(range);
      calHead.appendChild(nxt);
      // Floats over the calendar (positioned from the head) instead of pushing it down.
      var picker = mk("div", "bf-weekpick");
      picker.hidden = true;
      picker.setAttribute("role", "dialog");
      picker.setAttribute("aria-label", "Välj vecka");
      calHead.appendChild(picker);
      var grid = mk("div", "booking-cal-grid");
      var note = mk("p", "booking-cal-next-available");
      note.hidden = true;
      body.appendChild(calHead);
      body.appendChild(grid);
      body.appendChild(note);
      prev.addEventListener("click", function () { if (state.weekOffset > 0) { state.weekOffset--; closePicker(); loadWeek(); } });
      nxt.addEventListener("click", function () { state.weekOffset++; closePicker(); loadWeek(); });
      range.addEventListener("click", function () {
        if (!picker.hidden) { closePicker(); return; }
        var monday = startOfWeek(state.weekOffset);
        renderPicker(new Date(monday.getFullYear(), monday.getMonth(), 1));
        picker.hidden = false;
        range.setAttribute("aria-expanded", "true");
        dismissPicker = closePicker;
      });

      function lastBookableDate() {
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + BOOKING_HORIZON_DAYS);
        return d;
      }
      function closePicker() {
        picker.hidden = true;
        range.setAttribute("aria-expanded", "false");
        dismissPicker = null;
      }
      // Month chips (this month up to the booking limit) above a calendar
      // where each row is one week: pick a month, then a week.
      function renderPicker(viewMonth) {
        picker.innerHTML = "";
        var thisWeek = startOfWeek(0);
        var selected = startOfWeek(state.weekOffset);
        var last = lastBookableDate();
        var months = mk("div", "bf-wp-months");
        var m = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        while (m <= last) {
          (function (month) {
            var chip = mk("button", "bf-wp-month", MONTHS_LONG[month.getMonth()].slice(0, 3));
            chip.type = "button";
            chip.setAttribute("aria-pressed", String(month.getTime() === viewMonth.getTime()));
            chip.setAttribute("aria-label", MONTHS_LONG[month.getMonth()] + " " + month.getFullYear());
            if (month.getFullYear() !== new Date().getFullYear()) chip.appendChild(mk("small", null, String(month.getFullYear())));
            chip.addEventListener("click", function () { renderPicker(month); });
            months.appendChild(chip);
          })(new Date(m));
          m.setMonth(m.getMonth() + 1);
        }
        picker.appendChild(months);
        picker.appendChild(mk("p", "bf-wp-title", MONTHS_LONG[viewMonth.getMonth()] + " " + viewMonth.getFullYear()));
        var head = mk("div", "bf-wp-row bf-wp-row-head");
        ["v.", "Må", "Ti", "On", "To", "Fr", "Lö", "Sö"].forEach(function (t) { head.appendChild(mk("span", null, t)); });
        picker.appendChild(head);
        var lastOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
        var start = new Date(viewMonth);
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
        while (start <= lastOfMonth) {
          (function (monday) {
            var offset = Math.round((monday - thisWeek) / (7 * 24 * 60 * 60 * 1000));
            var row = mk("button", "bf-wp-row" + (monday.getTime() === selected.getTime() ? " is-selected" : ""));
            row.type = "button";
            row.disabled = offset < 0 || monday > last;
            row.setAttribute("aria-label", "Vecka " + isoWeekNumber(monday) + ", " + fmtRange(monday));
            row.appendChild(mk("span", "bf-wp-wk", String(isoWeekNumber(monday))));
            for (var i = 0; i < 7; i++) {
              var day = new Date(monday);
              day.setDate(day.getDate() + i);
              row.appendChild(mk("span", day.getMonth() !== viewMonth.getMonth() ? "is-out" : null, String(day.getDate())));
            }
            row.addEventListener("click", function () {
              state.weekOffset = offset;
              closePicker();
              loadWeek();
            });
            picker.appendChild(row);
          })(new Date(start));
          start.setDate(start.getDate() + 7);
        }
      }

      function loadWeek() {
        var monday = startOfWeek(state.weekOffset);
        setRangeLabel(range, monday);
        prev.disabled = state.weekOffset <= 0;
        var lastBookable = isoDate(lastBookableDate());
        var nextMonday = new Date(monday);
        nextMonday.setDate(nextMonday.getDate() + 7);
        nxt.disabled = isoDate(nextMonday) > lastBookable;
        var days = [];
        for (var i = 0; i < 7; i++) { var d = new Date(monday); d.setDate(d.getDate() + i); days.push(d); }
        grid.classList.add("is-loading");
        note.hidden = true;
        var people = candidateStaff();
        var duration = state.service.durationMinutes;
        var jobs = [];
        days.forEach(function (d) {
          people.forEach(function (p) {
            var dateStr = isoDate(d);
            if (dateStr > lastBookable) {
              jobs.push(Promise.resolve({ dateStr: dateStr, staffId: p.id, slots: [], closed: false, tooFarAhead: true }));
              return;
            }
            if (!isLive) {
              jobs.push(Promise.resolve({ dateStr: dateStr, staffId: p.id, slots: demoSlotsForDate(dateStr, p.id, duration), closed: d.getDay() === 0 }));
              return;
            }
            jobs.push(fetch(apiBase + "/bookings/" + companyId + "/availability?staffId=" + p.id + "&date=" + dateStr + "&durationMinutes=" + duration)
              .then(function (r) { return r.json(); })
              .then(function (res) { return { dateStr: dateStr, staffId: p.id, slots: res.slots || [], closed: !!res.closed, timeOff: !!res.timeOff }; })
              .catch(function () { return { dateStr: dateStr, staffId: p.id, slots: [], closed: false }; }));
          });
        });
        Promise.all(jobs).then(function (results) {
          if (steps[stepIndex] !== "time") return;
          var perDay = {};
          var whoHas = {};
          var closedCount = {};
          var offCount = {};
          var tooFar = {};
          results.forEach(function (r) {
            perDay[r.dateStr] = perDay[r.dateStr] || [];
            if (r.closed) closedCount[r.dateStr] = (closedCount[r.dateStr] || 0) + 1;
            if (r.timeOff) offCount[r.dateStr] = (offCount[r.dateStr] || 0) + 1;
            if (r.tooFarAhead) tooFar[r.dateStr] = true;
            r.slots.forEach(function (t) {
              var key = r.dateStr + "|" + t;
              if (!whoHas[key]) { whoHas[key] = []; perDay[r.dateStr].push(t); }
              whoHas[key].push(r.staffId);
            });
          });
          var closedDays = {};
          Object.keys(perDay).forEach(function (k) {
            perDay[k].sort();
            // Everyone closed: "Stängt". Nobody available because someone is
            // on time off (sick, vacation): "Ej tillgänglig", never "Fullbokat".
            var closedN = closedCount[k] || 0;
            var offN = offCount[k] || 0;
            if (closedN === people.length) closedDays[k] = true;
            else if (offN > 0 && closedN + offN === people.length) closedDays[k] = "Ej tillgänglig";
            if (tooFar[k]) closedDays[k] = "Ej bokningsbar än";
          });
          var open = renderAvailabilityGrid(grid, days, perDay, function (dateStr, time) {
            state.slot = { dateStr: dateStr, time: time, staffId: whoHas[dateStr + "|" + time][0] };
            next();
          }, closedDays);
          grid.classList.remove("is-loading");
          if (open === 0) {
            note.hidden = false;
            // Past the booking limit there is no next week to offer.
            if (nxt.disabled) {
              note.textContent = "Inga lediga tider den här veckan. Det går att boka upp till " + Math.round(BOOKING_HORIZON_DAYS / 30) + " månader fram.";
            } else {
              note.textContent = "Inga lediga tider den här veckan. ";
              var jump = mk("button", "chip-link-btn", "Visa nästa vecka");
              jump.type = "button";
              jump.addEventListener("click", function () { state.weekOffset++; loadWeek(); });
              note.appendChild(jump);
            }
          }
        });
      }
      // Open on the week with the first free time, not an empty current week.
      if (state.weekPicked) loadWeek();
      else {
        state.weekPicked = true;
        firstFreeWeek().then(function (offset) { state.weekOffset = offset; if (steps[stepIndex] === "time") loadWeek(); });
      }
      clearInterval(refreshTimer);
      refreshTimer = setInterval(function () {
        if (popup.classList.contains("is-open") && steps[stepIndex] === "time" && document.visibilityState === "visible") loadWeek();
      }, 15000);
    }

    // ---- step: contact details ----
    function field(label, input) {
      var f = mk("div", "bd-field");
      var l = mk("label", null, label);
      input.id = "bf-" + label.toLowerCase().replace(/[^a-zåäö]/g, "");
      l.setAttribute("for", input.id);
      f.appendChild(l);
      f.appendChild(input);
      return f;
    }
    function renderDetailsStep() {
      title.textContent = "Dina uppgifter";
      var staffLabel = state.slot && state.slot.staffId ? staffName(state.slot.staffId) : "";
      var card = mk("dl", "bf-recap");
      [
        ["Tjänst", state.service.name + " · " + state.service.durationMinutes + " min" + (state.service.priceLabel ? " · " + state.service.priceLabel : "")],
        ["Tid", fmtSlot(state.slot.dateStr, state.slot.time)],
        ["Frisör", staffLabel],
      ].concat(state.profile.questions.map(function (qid) {
        var v = state.answers[qid] || "";
        if (qid === "hairThickness" && v === HAIR_TYPE_UNSURE) v = "Vet inte, frisören kollar på plats";
        return [QUESTIONS[qid].note, v];
      })).forEach(function (row) {
        if (!row[1]) return;
        card.appendChild(mk("dt", null, row[0]));
        card.appendChild(mk("dd", null, row[1]));
      });
      body.appendChild(card);

      var first = mk("input"); first.type = "text"; first.autocomplete = "given-name";
      var last = mk("input"); last.type = "text"; last.autocomplete = "family-name";
      var tel = mk("input"); tel.type = "tel";
      var mail = mk("input"); mail.type = "email"; mail.autocomplete = "email"; mail.placeholder = "namn@exempel.se";
      var msg = mk("textarea"); msg.rows = 2; msg.maxLength = 300; msg.placeholder = state.profile.message || "T.ex. önskemål eller allergier";
      var form = mk("div", "bf-form");
      form.appendChild(field("Förnamn", first));
      form.appendChild(field("Efternamn", last));
      form.appendChild(field("E-post", mail));
      form.appendChild(field("Telefonnummer", tel));
      form.appendChild(field("Meddelande (valfritt)", msg));
      var err = mk("p", "bd-error");
      err.setAttribute("role", "alert");
      err.hidden = true;
      form.appendChild(err);
      body.appendChild(form);
      var phone = wirePhoneInput(tel);
      [first, last, mail, tel].forEach(function (i) { i.addEventListener("input", function () { if (i.hasAttribute("aria-invalid")) showErr(""); }); });
      if (state.contact) { first.value = state.contact.first; last.value = state.contact.last; mail.value = state.contact.email || ""; msg.value = state.contact.msg; }

      function showErr(text, input) {
        [first, last, mail, tel].forEach(function (i) { i.removeAttribute("aria-invalid"); });
        err.textContent = text || "";
        err.hidden = !text;
        if (input) { input.setAttribute("aria-invalid", "true"); input.focus(); }
      }
      setFooter("Bekräfta bokning", true, function () {
        if (!/\p{L}/u.test(first.value)) return showErr("Fyll i ditt förnamn.", first);
        if (!/\p{L}/u.test(last.value)) return showErr("Fyll i ditt efternamn.", last);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) return showErr("Fyll i din e-post, så skickar vi en bekräftelse.", mail);
        if (!isValidPhone(phone.value())) return showErr("Fyll i ett giltigt telefonnummer, t.ex. 70 123 45 67.", tel);
        showErr("");
        state.contact = { first: first.value.trim(), last: last.value.trim(), email: mail.value.trim(), msg: msg.value.trim() };
        // One "Label: answer" per line, hair length + thickness together on
        // the first; the free-text message always last (it may span lines).
        var noteParts = [];
        var hairBits = ["hairLength", "hairThickness"].filter(function (qid) { return state.answers[qid]; })
          .map(function (qid) { return QUESTIONS[qid].note + ": " + state.answers[qid]; });
        if (hairBits.length) noteParts.push(hairBits.join(" · "));
        state.profile.questions.forEach(function (qid) {
          if (qid === "hairLength" || qid === "hairThickness" || !state.answers[qid]) return;
          noteParts.push(QUESTIONS[qid].note + ": " + state.answers[qid]);
        });
        if (state.contact.msg) noteParts.push("Meddelande: " + state.contact.msg);
        nextBtn.disabled = true;
        nextBtn.textContent = "Bokar…";
        if (!isLive) {
          setTimeout(function () {
            markDemoBooked(state.slot.dateStr, state.slot.time, state.slot.staffId, state.service.durationMinutes);
            next();
          }, 500);
          return;
        }
        fetch(apiBase + "/bookings/" + companyId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingDate: state.slot.dateStr,
            timeLabel: state.slot.time,
            staffId: state.slot.staffId || undefined,
            serviceLabel: state.service.name,
            durationMinutes: state.service.durationMinutes,
            customerName: state.contact.first + " " + state.contact.last,
            customerPhone: phone.value(),
            customerEmail: state.contact.email,
            customerNote: noteParts.join("\n") || undefined,
          }),
        })
          .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, status: r.status, body: b }; }); })
          .then(function (res) {
            if (res.ok) { state.confirmationEmailSent = !!(res.body && res.body.confirmationEmailSent); return next(); }
            nextBtn.disabled = false;
            nextBtn.textContent = "Bekräfta bokning";
            if (res.status === 409) {
              state.slot = null;
              goTo(steps.indexOf("time"));
              var taken = body.querySelector(".booking-cal-next-available");
              if (taken) { taken.hidden = false; taken.textContent = "Tiden hann bokas av någon annan. Välj en ny tid."; }
              return;
            }
            showErr(res.body.error || "Kunde inte boka den tiden.");
          })
          .catch(function () {
            nextBtn.disabled = false;
            nextBtn.textContent = "Bekräfta bokning";
            showErr("Kunde inte nå bokningssystemet just nu.");
          });
      });
      first.focus();
    }

    // ---- step: done ----
    function renderDoneStep() {
      title.textContent = "Klart!";
      var done = mk("div", "bf-done");
      var check = mk("div", "bf-done-check", "✓");
      done.appendChild(check);
      done.appendChild(mk("p", "bf-done-title", "Din tid är bokad"));
      done.appendChild(mk("p", "bf-done-line", state.service.name + ", " + fmtSlot(state.slot.dateStr, state.slot.time)));
      var who = staffName(state.slot.staffId);
      if (who) done.appendChild(mk("p", "bf-done-line", "Hos " + who));
      if (state.confirmationEmailSent && state.contact && state.contact.email) {
        done.appendChild(mk("p", "bf-done-fine", "Vi har skickat en bekräftelse till " + state.contact.email + ". Där kan du också avboka."));
      }
      done.appendChild(mk("p", "bf-done-fine", "Vi ser fram emot ditt besök."));
      body.appendChild(done);
      setFooter("Stäng", true, close);
    }

    // ---- open / close ----
    function open(service) {
      var profile = useHairStep ? profileFor(service.name) : { questions: [] };
      state = { service: service, profile: profile, answers: {}, staff: null, slot: null, weekOffset: 0, weekPicked: false, contact: null };
      steps = profile.questions.map(function (qid) { return "q:" + qid; }).concat(["staff", "time", "details", "done"]);
      popup.classList.add("is-open");
      loadStaff();
      goTo(0);
    }
    function close() {
      popup.classList.remove("is-open");
      clearInterval(refreshTimer);
    }
    backBtn.addEventListener("click", function () {
      var step = steps[stepIndex];
      if (step === "details") state.slot = null;
      goTo(stepIndex - 1);
    });
    closeBtn.addEventListener("click", close);
    closeOnOutsideClick(popup, close);
    // Escape and clicks elsewhere in the popup close an open week picker
    // first; only a second Escape closes the whole popup.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !popup.classList.contains("is-open")) return;
      if (dismissPicker) { dismissPicker(); return; }
      close();
    });
    modal.addEventListener("mousedown", function (e) {
      if (dismissPicker && !e.target.closest(".bf-weekpick, .bf-range-btn")) dismissPicker();
    });

    bookBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".price-item");
        var priceEl = item ? item.querySelector(".price-item-amount") : null;
        open({
          name: btn.getAttribute("data-service-name") || "Tjänst",
          durationMinutes: parseInt(btn.getAttribute("data-duration-minutes"), 10) || 30,
          priceLabel: priceEl ? priceEl.textContent.trim() : "",
        });
      });
    });
  }

  var WEEKDAY_SHORT = ["Sön", "Mån", "Tis", "Ons", "Tors", "Fre", "Lör"];

  /**
   * "Nästa lediga tid" — the one honest scarcity/urgency signal this
   * system allows (2026-09-17): real availability computed from the
   * company's actual staff schedules + real bookings (same endpoint the
   * booking widget itself uses for "nästa tillgängliga frisör"), never a
   * fabricated countdown. If the real answer is "plenty of room", it just
   * says the real next slot — it doesn't lie in either direction. Fails
   * silently (element stays hidden) on any network/API error, same
   * philosophy as every other optional site-kit widget.
   */
  function formatNextAvailable(dateIso, timeHm) {
    var today = new Date();
    var todayIso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    var tomorrow = new Date(today.getTime() + 86400000);
    var tomorrowIso = tomorrow.getFullYear() + "-" + String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" + String(tomorrow.getDate()).padStart(2, "0");
    if (dateIso === todayIso) return "Idag kl " + timeHm;
    if (dateIso === tomorrowIso) return "Imorgon kl " + timeHm;
    var d = new Date(dateIso + "T00:00:00");
    return WEEKDAY_SHORT[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1) + " kl " + timeHm;
  }

  function wireNextAvailable() {
    document.querySelectorAll(".next-available-note").forEach(function (el) {
      var isLive = el.getAttribute("data-live") === "true";
      if (!isLive) {
        var d = new Date();
        for (var i = 0; i < 8; i++) {
          var dateStr = isoDate(d);
          var slots = demoSlotsForDate(dateStr);
          if (slots.length > 0) {
            el.textContent = "Nästa lediga tid: " + formatNextAvailable(dateStr, slots[0]);
            el.hidden = false;
            return;
          }
          d.setDate(d.getDate() + 1);
        }
        el.hidden = true;
        return;
      }
      var companyId = el.getAttribute("data-company-id");
      var apiBase = el.getAttribute("data-api-base") || "";
      var duration = el.getAttribute("data-duration-minutes") || "30";
      if (!companyId) return;
      fetch(apiBase + "/bookings/" + companyId + "/next-available?durationMinutes=" + duration)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (next) {
          if (!next || !next.date || !next.time) { el.hidden = true; return; }
          el.textContent = "Nästa lediga tid: " + formatNextAvailable(next.date, next.time);
          el.hidden = false;
        })
        .catch(function () { el.hidden = true; });
    });
  }

  function init() {
    renderStars();
    wireCountUp();
    wireReveal();
    wireNameWrite();
    wireFlowLines();
    wireSignatureMark();
    wireNextAvailable();
    wireBooking();

    // The legacy always-visible calendar uses the shared #bdBackdrop confirm
    // modal; the per-service popup has its own details step (wireBookingFlow).
    var calRoot = document.getElementById("bookingCal");
    if (calRoot) {
      var confirmModal = createConfirmModal(
        calRoot.getAttribute("data-api-base") || "",
        calRoot.getAttribute("data-company-id"),
        calRoot.getAttribute("data-live") === "true"
      );
      wireBookingCalendar(confirmModal);
    }
    wireBookingFlow();

    wireHeaderScrollState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
