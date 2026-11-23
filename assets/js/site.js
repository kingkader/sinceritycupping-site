(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");

  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // Local guide discovery: never store or transmit a visitor's search terms.
  var guideSearch = document.querySelector("[data-guide-search]");
  if (guideSearch) {
    var query = document.querySelector("#guide-query");
    var reset = document.querySelector("[data-guide-reset]");
    var status = document.querySelector("#guide-search-status");
    var empty = document.querySelector("#guide-empty");
    var guides = Array.prototype.slice.call(document.querySelectorAll("[data-guide-card]"));
    if (query && reset && status && empty) {
      var guideText = guides.map(function (card) { return card.textContent.toLowerCase(); });
      function filterGuides() {
        var words = query.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
        var count = 0;
        guides.forEach(function (card, index) {
          var match = words.every(function (word) { return guideText[index].indexOf(word) !== -1; });
          card.hidden = !match;
          if (match) count += 1;
        });
        status.textContent = count + (count === 1 ? " guide found" : " guides found");
        empty.hidden = count !== 0;
      }
      query.addEventListener("input", filterGuides);
      reset.addEventListener("click", function () { query.value = ""; filterGuides(); query.focus(); });
      guideSearch.hidden = false;
      filterGuides();
    }
  }

  // Next sunnah days: the dates come from the page (copied from the guide); only the next three are shown.
  var sunnah = document.querySelector("[data-sunnah-dates]");
  if (sunnah && window.Intl) {
    try {
      var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      var part = function (t) { return p.filter(function (x) { return x.type === t; })[0].value; };
      var today = part("year") + "-" + part("month") + "-" + part("day");
      var next = sunnah.getAttribute("data-sunnah-dates").split(",").filter(function (d) { return d >= today; }).slice(0, 3);
      var list = sunnah.querySelector(".sunnah-chips");
      next.forEach(function (d) {
        var b = d.split("-"), date = new Date(+b[0], +b[1] - 1, +b[2]), li = document.createElement("li");
        [["wd", { weekday: "short" }], ["day", { day: "numeric" }], ["mon", { month: "short" }]].forEach(function (f) {
          var s = document.createElement("span"); s.className = f[0]; s.textContent = date.toLocaleDateString("en-GB", f[1]); li.appendChild(s);
        });
        list.appendChild(li);
      });
      if (next.length) sunnah.hidden = false;
    } catch (e) { /* leave the guide link as the way to the dates */ }
  }


  // Appointment card: the chosen practitioner sets the appointment length.
  var appt = document.querySelector(".appt");
  if (appt) {
    var length = appt.querySelector(".appt-length");
    var lengths = { women: "45 min", men: "40 min" };
    var syncLength = function () {
      var chosen = appt.querySelector('input[name="practitioner"]:checked');
      if (length && chosen && lengths[chosen.value]) length.textContent = lengths[chosen.value];
    };
    appt.addEventListener("change", syncLength);
    syncLength();

    // On phones, the quick-actions bar waits until the card's own booking bar has scrolled away.
    var bar = document.querySelector(".mobile-bar");
    var go = appt.querySelector(".appt-go");
    if (bar && go && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        bar.classList.toggle("is-tucked", entries[0].isIntersecting);
      }, { threshold: 0 }).observe(go);
    }
  }

  // Appointment card: mark today and say whether the clinic is open, in London time.
  var week = document.querySelector(".week");
  var openStatus = document.querySelector("[data-open-status]");
  if (week && openStatus && window.Intl) {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var get = function (type) { var p = parts.filter(function (x) { return x.type === type; })[0]; return p ? p.value : ""; };
      var day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
      var now = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
      if (day > 0 && !isNaN(now)) {
        var todayEl = week.querySelector('[data-day="' + day + '"]');
        if (todayEl) { todayEl.classList.add("today"); todayEl.setAttribute("aria-current", "date"); }
        var close = day >= 6 ? 20 * 60 + 30 : 19 * 60;
        var closeLabel = day >= 6 ? "20:30" : "19:00";
        if (now < 10 * 60) { openStatus.textContent = "Opens today at 10:00, until " + closeLabel; openStatus.classList.add("is-later"); }
        else if (now < close) { openStatus.textContent = "Open now, until " + closeLabel + " today"; openStatus.classList.add("is-open"); }
        else { openStatus.textContent = "Closed for today. Opens tomorrow at 10:00"; openStatus.classList.add("is-later"); }
      }
    } catch (e) {}
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  function showAll() {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  if (reduced || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
    setTimeout(showAll, 2500);
  }
})();
