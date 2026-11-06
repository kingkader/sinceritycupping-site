(function () {
  document.documentElement.classList.add("js");

  // Price scale bar.
  var range = document.getElementById("spend");
  if (range) {
    var out = document.getElementById("fee");
    var note = document.getElementById("fee-note");
    var spendOut = document.getElementById("spend-val");
    var tiers = document.querySelectorAll(".tiers div");
    var segs = document.querySelectorAll(".bar span");
    var gbp = function (n) { return "£" + Math.round(n).toLocaleString("en-GB"); };
    var update = function () {
      var s = Number(range.value);
      var fee, idx, txt;
      if (s <= 1500) { fee = 499; idx = 0; txt = "Starter"; }
      else if (s <= 4000) { fee = 750; idx = 1; txt = "Growth"; }
      else if (s <= 8000) { fee = 999; idx = 2; txt = "Pro"; }
      else { fee = s * 0.15; idx = 3; txt = "Scale, 15% of your spend"; }
      spendOut.textContent = gbp(s) + (s >= 12000 ? "+" : "");
      out.textContent = gbp(fee);
      note.textContent = "a month on " + txt + ". Your ad spend goes to Google, on top.";
      range.setAttribute("aria-valuetext", gbp(s) + " a month on ads, fee " + gbp(fee) + " a month");
      tiers.forEach(function (t, i) { t.classList.toggle("on", i === idx); });
      segs.forEach(function (t, i) { t.classList.toggle("on", i <= idx); });
    };
    range.addEventListener("input", update);
    update();
  }

  // Audit forms.
  document.querySelectorAll("form.audit").forEach(function (form) {
    var msg = form.querySelector(".msg");
    var btn = form.querySelector("button[type=submit]");
    var say = function (t, cls) { msg.textContent = t; msg.className = "msg " + (cls || ""); };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = null;
      form.querySelectorAll("[required]").forEach(function (el) {
        var ok = el.checkValidity();
        el.setAttribute("aria-invalid", ok ? "false" : "true");
        if (!ok && !bad) bad = el;
      });
      if (bad) {
        say(bad.type === "email" ? "Please check your email address." : "Please add your " + (bad.dataset.name || "details") + ".", "err");
        bad.focus();
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
      btn.disabled = true;
      say("Sending…");
      fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function () {
          say("Thanks. We'll email you within one working day to set up your audit.", "ok");
          form.reset();
        })
        .catch(function () {
          // Fallback: open the visitor's email app with the details filled in.
          var body = Object.keys(data).filter(function (k) { return k !== "company_site" && data[k]; })
            .map(function (k) { return k + ": " + data[k]; }).join("\n");
          window.location.href = "mailto:hello@lucidmark.co.uk?subject=" + encodeURIComponent("Free Google Ads audit") + "&body=" + encodeURIComponent(body);
          say("Your email app should open with your details. Press send and we'll reply within one working day.", "ok");
        })
        .finally(function () { btn.disabled = false; });
    });
  });
})();
