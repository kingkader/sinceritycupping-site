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
