/*
 * Mandisa tracker: records the visitor's journey (page views, clicks, time on
 * page, scroll depth) for the back office. Plain JavaScript, no dependencies.
 *
 * Privacy:
 * - visitors are identified by a random id stored in this browser only;
 * - typed values are never read (inputs, textareas, selects);
 * - anything inside [data-track-ignore] is skipped;
 * - Global Privacy Control, Do Not Track or localStorage "mt_optout" = "1" disable it.
 *
 * Usage in the page:
 *   <script src="/mt.js" data-endpoint="/api/track" defer></script>
 *   <button data-track="add_to_cart">…</button>          // optional custom name
 *   window.mandisaTracker.track("add_to_cart", { sku: "…" })  // custom events
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var ENDPOINT =
    (script && script.getAttribute("data-endpoint")) || "/api/track";
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  var FLUSH_EVERY_MS = 5000;
  var MAX_BATCH = 20;
  var CLICKABLE =
    'a, button, [role="button"], [role="link"], [role="tab"], [data-track], ' +
    'input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"], summary, label';

  if (window.mandisaTracker) return;

  function optedOut() {
    try {
      if (navigator.globalPrivacyControl) return true;
      if (navigator.doNotTrack === "1" || window.doNotTrack === "1")
        return true;
      return localStorage.getItem("mt_optout") === "1";
    } catch (e) {
      return false;
    }
  }

  if (optedOut()) {
    window.mandisaTracker = {
      visitorId: null,
      sessionId: null,
      track: function () {},
    };
    return;
  }

  // --- Ids -------------------------------------------------------------------

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map
      .call(b, function (x) {
        return (x + 0x100).toString(16).slice(1);
      })
      .join("");
    return (
      h.slice(0, 8) +
      "-" +
      h.slice(8, 12) +
      "-" +
      h.slice(12, 16) +
      "-" +
      h.slice(16, 20) +
      "-" +
      h.slice(20)
    );
  }

  var memory = {};
  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return memory[key] || null;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      memory[key] = value;
    }
  }

  var visitorId = read("mt_vid");
  if (!visitorId) {
    visitorId = uuid();
    write("mt_vid", visitorId);
  }

  var sessionId;
  var newSession = false;
  /** A new session starts after 30 minutes without activity. */
  function touchSession() {
    var now = Date.now();
    var last = Number(read("mt_last") || 0);
    sessionId = read("mt_sid");
    if (!sessionId || now - last > SESSION_TIMEOUT_MS) {
      sessionId = uuid();
      write("mt_sid", sessionId);
      newSession = true;
    }
    write("mt_last", String(now));
  }
  touchSession();

  // --- Context (sent with the first batch of a session) ----------------------

  function device() {
    var w = window.innerWidth;
    return w < 768 ? "mobile" : w < 1100 ? "tablet" : "desktop";
  }

  function utmParams() {
    var out = {};
    var q = new URLSearchParams(location.search);
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ].forEach(function (k) {
      var v = q.get(k);
      if (v) out[k] = v.slice(0, 200);
    });
    return out;
  }

  function externalReferrer() {
    try {
      if (!document.referrer) return null;
      var ref = new URL(document.referrer);
      return ref.origin === location.origin ? null : ref.origin + ref.pathname;
    } catch (e) {
      return null;
    }
  }

  // Order links carry secrets in the query string: only the path is ever recorded.
  function currentPath() {
    return location.pathname;
  }

  // --- Queue and sending -----------------------------------------------------

  var queue = [];
  var context = null;

  function sessionContext() {
    return {
      locale: document.documentElement.lang || null,
      referrer: externalReferrer(),
      landingPath: currentPath(),
      utm: utmParams(),
      device: device(),
    };
  }

  function track(type, props) {
    touchSession();
    if (newSession) {
      context = sessionContext();
      newSession = false;
    }
    queue.push({
      type: type,
      path: currentPath(),
      ts: Date.now(),
      props: clean(props),
    });
    if (queue.length >= MAX_BATCH) flush(false);
  }

  /** Keeps flat, short values only. */
  function clean(props) {
    if (!props) return undefined;
    var out = {};
    Object.keys(props)
      .slice(0, 30)
      .forEach(function (k) {
        var v = props[k];
        if (v === undefined) return;
        if (typeof v === "string") v = v.slice(0, 500);
        else if (typeof v !== "number" && typeof v !== "boolean" && v !== null)
          v = String(v).slice(0, 500);
        out[k.slice(0, 40)] = v;
      });
    return out;
  }

  function flush(leaving) {
    if (queue.length === 0) return;
    var events = queue.splice(0, 50);
    var payload = {
      visitorId: visitorId,
      sessionId: sessionId,
      events: events,
    };
    if (context) {
      payload.context = context;
      context = null;
    }
    var body = JSON.stringify(payload);
    // When the page is going away, sendBeacon survives the unload.
    if (leaving && navigator.sendBeacon) {
      var sent = navigator.sendBeacon(
        ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
      if (sent) return;
    }
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body,
        keepalive: true,
        credentials: "same-origin",
      }).catch(function () {});
    } catch (e) {
      // Analytics must never break the page.
    }
  }

  setInterval(function () {
    flush(false);
  }, FLUSH_EVERY_MS);

  // --- Page views, time on page and scroll depth ------------------------------

  var pagePath = null;
  var pageStart = 0;
  var maxScroll = 0;

  function scrollDepth() {
    var doc = document.documentElement;
    var total = doc.scrollHeight - window.innerHeight;
    if (total <= 0) return 100;
    return Math.min(100, Math.round((window.scrollY / total) * 100));
  }

  function leavePage() {
    if (!pagePath) return;
    queue.push({
      type: "page_leave",
      path: pagePath,
      ts: Date.now(),
      props: { durationMs: Date.now() - pageStart, scrollDepth: maxScroll },
    });
  }

  function pageView() {
    var path = currentPath();
    if (path === pagePath) return;
    leavePage();
    pagePath = path;
    pageStart = Date.now();
    maxScroll = scrollDepth();
    track("page_view", { title: document.title.slice(0, 200) });
  }

  window.addEventListener(
    "scroll",
    function () {
      var d = scrollDepth();
      if (d > maxScroll) maxScroll = d;
    },
    { passive: true },
  );

  // Client-side navigations (Next.js uses the History API).
  ["pushState", "replaceState"].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      // Let the new page set its title first.
      setTimeout(pageView, 0);
      return result;
    };
  });
  window.addEventListener("popstate", function () {
    setTimeout(pageView, 0);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      leavePage();
      flush(true);
      // Coming back to the tab counts as a new stretch of time on the page.
      pageStart = Date.now();
    }
  });
  window.addEventListener("pagehide", function () {
    flush(true);
  });

  // --- Clicks ----------------------------------------------------------------

  function labelOf(el) {
    var text =
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.tagName === "INPUT" ? el.value : el.innerText) ||
      (el.querySelector &&
        el.querySelector("img[alt]") &&
        el.querySelector("img[alt]").alt) ||
      "";
    return text.replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function hrefOf(el) {
    if (el.tagName !== "A" || !el.href) return null;
    try {
      var url = new URL(el.href, location.href);
      // Same site: path only (no query strings, which may carry tokens).
      return url.origin === location.origin
        ? url.pathname
        : url.origin + url.pathname;
    } catch (e) {
      return null;
    }
  }

  /** The nearest section-like ancestor, to know where on the page the click happened. */
  function areaOf(el) {
    var area = el.closest(
      "[data-track-area], header, nav, footer, aside, main section, section, form",
    );
    if (!area) return null;
    return (
      area.getAttribute("data-track-area") ||
      (area.className && typeof area.className === "string"
        ? area.className.split(" ")[0]
        : "") ||
      area.tagName.toLowerCase()
    );
  }

  document.addEventListener(
    "click",
    function (e) {
      var target = e.target instanceof Element ? e.target : null;
      var el = target && target.closest(CLICKABLE);
      if (!el || el.closest("[data-track-ignore]")) return;
      // Text fields are never tracked (and their values never read).
      if (
        el.tagName === "INPUT" &&
        ["submit", "button", "checkbox", "radio"].indexOf(el.type) === -1
      )
        return;

      var props = {
        label: labelOf(el),
        tag: el.tagName.toLowerCase(),
        name: el.getAttribute("data-track"),
        href: hrefOf(el),
        area: areaOf(el),
        id: el.id || null,
      };
      if (el.type === "checkbox" || el.type === "radio")
        props.checked = el.checked;
      track("click", props);
    },
    true,
  );

  // --- Public API ------------------------------------------------------------

  window.mandisaTracker = {
    visitorId: visitorId,
    get sessionId() {
      return sessionId;
    },
    /** Custom event, e.g. track("add_to_cart", { sku: "MDS-W01-14-NB-M" }). */
    track: function (name, props) {
      if (typeof name === "string" && /^[a-z][a-z0-9_]{1,39}$/.test(name))
        track(name, props);
    },
    flush: function () {
      flush(false);
    },
  };

  pageView();
})();
