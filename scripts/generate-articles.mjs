import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const business = JSON.parse(fs.readFileSync(path.join(root, "data", "business.json"), "utf8"));
const topics = JSON.parse(fs.readFileSync(path.join(root, "data", "article-topics.json"), "utf8"));
const args = new Map(process.argv.slice(2).map((arg, index, arr) => {
  if (!arg.startsWith("--")) return [arg, true];
  const [key, value] = arg.includes("=") ? arg.split("=") : [arg, arr[index + 1]?.startsWith("--") ? "true" : arr[index + 1]];
  return [key, value ?? "true"];
}));

const count = Number(args.get("--count") || 1);
const now = args.get("--date") ? new Date(String(args.get("--date"))) : new Date();
const isoDate = now.toISOString().slice(0, 10);
const manifestPath = path.join(root, "data", "article-manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : [];
const used = new Set(manifest.map((article) => article.slug));
const available = topics.filter((topic) => !used.has(topic.slug));
const chosen = available.length >= count ? available.slice(0, count) : topics.slice(0, count);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function articleHtml(topic) {
  const title = escapeHtml(topic.title);
  const description = escapeHtml(topic.summary);
  const url = `${business.domain}/articles/${topic.slug}/`;
  const serviceUrl = `${business.domain}/services/`;
  const contactUrl = `${business.domain}/contact/`;
  const bookingUrl = business.bookingUrl;
  const localArea = topic.area === "South London" ? "South London" : `${topic.area} and nearby South London`;

  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | ${business.name}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${business.domain}/assets/img/wet-cupping-therapy-1600.jpg">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
    <link rel="shortcut icon" href="/favicon.ico">
    <style id="critical-css">:root{--ink:#10292f;--ink-soft:#34545b;--paper:#fbfaf6;--mist:#eef5f2;--line:#d7e4df;--teal:#0b7895;--leaf:#2d6e3c;--saffron:#e2a319;--saffron-text:#8a5a00;--white:#ffffff;--shadow:0 18px 45px rgba(16,41,47,.13);--container:min(1120px,calc(100% - 40px))}
*{box-sizing:border-box}
html{scroll-behavior:smooth;overflow-x:hidden}
body{margin:0;background:var(--paper);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px;line-height:1.65;text-rendering:optimizeLegibility;overflow-x:hidden}
img{display:block;max-width:100%;height:auto}
a{color:inherit}
h1,h2,h3{margin:0;line-height:1.05;text-wrap:balance}
h1{max-width:11ch;font-size:clamp(3.4rem,12vw,7.7rem)}
h2{max-width:14ch;font-size:clamp(2.2rem,6vw,4.7rem)}
.skip-link{position:absolute;left:16px;top:-80px;z-index:30;padding:10px 14px;background:var(--ink);color:var(--white);border-radius:6px}
.skip-link:focus{top:16px}
.site-header{position:sticky;top:0;z-index:20;border-bottom:1px solid rgba(215,228,223,.78);background:rgba(251,250,246,.92);backdrop-filter:blur(14px)}
.nav{width:var(--container);min-height:132px;margin:0 auto;display:grid;grid-template-columns:minmax(130px,auto) 1fr auto auto;align-items:center;gap:20px}
.brand{display:inline-flex;align-items:center;gap:0;min-width:0;text-decoration:none;font-weight:800}
.brand img{width:118px;height:118px;object-fit:contain}
.brand span{display:block;max-width:12rem;color:var(--ink);font-size:1.05rem;line-height:1.05}
.nav-links{display:flex;align-items:center;justify-content:center;gap:6px}
.nav-links a{padding:10px 12px;border-radius:6px;color:var(--ink-soft);font-weight:650;text-decoration:none}
.nav-toggle{display:none;width:44px;height:44px;border:1px solid var(--line);border-radius:8px;background:var(--white);color:var(--ink);cursor:pointer}
.button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:46px;padding:12px 18px;border:1px solid transparent;border-radius:8px;background:var(--ink);color:var(--white);text-decoration:none;font-weight:800;max-width:100%}
.button.secondary{background:transparent;border-color:rgba(255,255,255,.75);color:var(--white)}
.button.light{background:var(--white);color:var(--ink)}
.button.ghost{background:transparent;border-color:var(--line);color:var(--ink)}
.hero{position:relative;min-height:82dvh;display:grid;align-items:end;isolation:isolate;overflow:hidden;background:var(--ink);color:var(--white)}
.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,41,47,.9),rgba(16,41,47,.68) 42%,rgba(16,41,47,.2)),url("/assets/img/back-cupping-glass-1200.jpg") center/cover;background:linear-gradient(90deg,rgba(16,41,47,.9),rgba(16,41,47,.68) 42%,rgba(16,41,47,.2)),image-set(url("/assets/img/back-cupping-glass-1200.avif") type("image/avif"),url("/assets/img/back-cupping-glass-1200.webp") type("image/webp"),url("/assets/img/back-cupping-glass-1200.jpg") type("image/jpeg")) center/cover;z-index:-2}
.hero::after{content:"";position:absolute;inset:auto 0 0;height:26%;background:linear-gradient(0deg,rgba(16,41,47,.82),transparent);z-index:-1}
.hero-inner,.section-inner,.footer-inner{width:min(1120px,calc(100vw - 40px));margin:0 auto}
.hero-inner{padding:112px 0 54px}
.eyebrow{margin:0 0 18px;color:var(--saffron-text);font-size:.88rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.hero p{max-width:min(42rem,100%);margin:22px 0 0;color:rgba(255,255,255,.9);font-size:clamp(1.05rem,2vw,1.28rem)}
.hero-actions,.inline-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:28px}
.hero-facts{width:min(1120px,calc(100vw - 40px));margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.22)}
.hero-facts div{min-height:98px;padding:18px 22px;border-right:1px solid rgba(255,255,255,.22)}
.hero-facts strong{display:block;font-size:clamp(1.35rem,2.4vw,2rem)}
.hero-facts span{display:block;color:rgba(255,255,255,.78);line-height:1.4}
.section{padding:clamp(64px,9vw,120px) 0}
.section.alt{background:var(--mist)}
.page-hero{padding:clamp(80px,12vw,150px) 0 clamp(52px,8vw,88px);background:var(--mist)}
.page-hero .section-inner{display:grid;grid-template-columns:minmax(0,.95fr) minmax(280px,.7fr);gap:42px;align-items:end}
.page-hero h1{max-width:12ch;color:var(--ink)}
.page-hero p{margin:0;color:var(--ink-soft);font-size:1.12rem}
@media (max-width:620px){:root{--container:min(1120px,calc(100% - 28px))}.brand img{width:86px;height:86px}.brand span{display:none}.hero{min-height:auto}.hero-inner{padding-top:86px}.hero-actions,.inline-actions{align-items:stretch;flex-direction:column}.button{width:100%}}</style>
    <link rel="preload" href="/assets/css/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="/assets/css/styles.css"></noscript>
    <script type="application/ld+json">
      ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: topic.title,
        description: topic.summary,
        datePublished: isoDate,
        dateModified: isoDate,
        mainEntityOfPage: url,
        author: {
          "@type": "Person",
          "@id": `${business.domain}/about/#aisha-mejri`,
          name: "Sister Aisha Mejri",
          jobTitle: "Lead Hijama Practitioner"
        },
        citation: [
          {"@type": "WebPage", "name": "Jami at-Tirmidhi 2051 — cupping on 17, 19, 21", url: "https://sunnah.com/tirmidhi:2051"},
          {"@type": "WebPage", "name": "Cleveland Clinic — Cupping Therapy", url: "https://my.clevelandclinic.org/health/treatments/16554-cupping"}
        ],
        publisher: {
          "@type": "Organization",
          name: business.name,
          logo: {"@type": "ImageObject", url: `${business.domain}/assets/img/sincerity-cupping-logo.svg`}
        },
        image: `${business.domain}/assets/img/wet-cupping-therapy-1600.jpg`,
        about: [
          {"@type": "Thing", name: topic.service},
          {"@type": "Place", name: topic.area}
        ]
      })}
    </script>
  </head>
  <body class="article-page">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <nav class="nav" aria-label="Primary navigation">
        <a class="brand" href="/"><img src="/assets/img/sincerity-cupping-logo.svg" width="160" height="160" alt="${business.name} logo"></a>
        <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-label="Open menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        <div class="nav-links" data-nav-links><a href="/">Home</a><a href="/services/">Services</a><a href="/about/">About</a><a href="/blog/" aria-current="page">Blog</a><a href="/contact/">Contact</a></div>
        <a class="button" href="${bookingUrl}">Book now</a>
      </nav>
    </header>
    <main id="main" class="article-layout">
      <p class="eyebrow">${escapeHtml(topic.keyword)}</p>
      <h1>${title}</h1>
      <p class="article-meta">Published ${isoDate} by ${business.name} · Local guide for ${escapeHtml(topic.area)}</p>

      <div class="answer-block">
        <p>${escapeHtml(topic.service)} at ${business.name} is insured, consultation-led care for men and women in ${escapeHtml(localArea)}. This guide explains ${escapeHtml(topic.angle)} so you can book with clear expectations and ask the right safety questions before wet cupping.</p>
      </div>

      <h2>Quick answer</h2>
      <p>If you are searching for ${escapeHtml(topic.keyword)}, start by checking practitioner experience, insurance, hygiene process, aftercare and whether wet cupping is suitable for your health situation. ${business.name} is based at ${business.address.street}, ${business.address.locality} ${business.address.postcode}, with online booking available through Fresha.</p>

      <h2>What happens before treatment?</h2>
      <p>A good cupping appointment should not feel rushed. Before treatment, expect a short conversation about your goals, recent health history, medication, skin condition, previous cupping experience and comfort level. This is especially important for wet cupping because the skin is opened and infection-control standards matter.</p>
      <ul>
        <li>Share any medical conditions, pregnancy, blood-thinning medication or skin problems.</li>
        <li>Ask about practitioner preference, privacy and comfort if these matter to you.</li>
        <li>Check what marks, soreness or aftercare needs are normal after your session.</li>
      </ul>

      <h2>How this applies locally</h2>
      <p>For clients in Streatham, Streatham Hill, Streatham Common, Balham, Brixton, Tooting, Clapham, Norbury, Tulse Hill, West Norwood, Herne Hill, Dulwich, Crystal Palace, Mitcham and Colliers Wood, local convenience matters. A nearby clinic makes it easier to ask questions, arrive calmly, follow aftercare and book a review session if needed. ${business.name} offers wet cupping for male and female clients in a clean, serene and fully insured setting near Streatham High Road.</p>

      <h2>Safety and honest expectations</h2>
      <p>Cupping is a complementary therapy. The <a href="https://www.nccih.nih.gov/health/cupping" rel="noopener">National Center for Complementary and Integrative Health</a> notes that cupping can cause side effects such as persistent skin discoloration, scars, burns and infections. NHS information on <a href="https://www.nhs.uk/conditions/complementary-and-alternative-medicine/" rel="noopener">complementary and alternative medicine</a> also encourages people to think carefully about evidence and safety. UKHSA infection-control guidance for skin-piercing settings highlights the importance of reducing infection and bloodborne virus risks.</p>
      <p>If you have an active skin infection, unexplained symptoms, a bleeding disorder, serious illness, pregnancy or medication that affects bleeding, ask a suitable healthcare professional before booking.</p>

      <h2>Book or ask a question</h2>
      <p>You can read more about wet cupping on the <a href="${serviceUrl}">services page</a>, contact the clinic through the <a href="${contactUrl}">contact page</a>, or book directly online when you are ready.</p>
      <div class="inline-actions">
        <a class="button ghost" href="${bookingUrl}">Book online</a>
        <a class="button ghost" href="/contact/">Contact the clinic</a>
      </div>
    </main>
    <footer class="site-footer">
      <div class="footer-inner">
        <div><img class="footer-logo" src="/assets/img/sincerity-cupping-logo.svg" width="160" height="160" alt="${business.name} logo"><p>Insured wet cupping and hijama for men and women in Streatham, South London.</p></div>
        <div class="footer-links"><strong>Pages</strong><a href="/">Home</a><a href="/services/">Services</a><a href="/about/">About</a><a href="/blog/">Blog</a><a href="/privacy/">Privacy</a></div>
        <div class="footer-links"><strong>Contact</strong><a href="tel:${business.telephone}">${business.phone}</a><a href="${business.whatsappUrl}">WhatsApp</a><a href="mailto:${business.email}">${business.email}</a><a href="${business.googleMapsUrl}">${business.address.street}, ${business.address.postcode}</a></div>
      </div>
      <p class="footer-small">© <span data-year></span> ${business.name}. Cupping is a complementary therapy and is not a replacement for medical advice, diagnosis or treatment.</p>
    </footer>
    <script src="/assets/js/main.js" defer></script>
  </body>
</html>`;
}

function blogHtml(articles) {
  const cards = articles.map((article) => `<article class="article-card">
    <time datetime="${article.date}">${article.date}</time>
    <h3>${escapeHtml(article.title)}</h3>
    <p>${escapeHtml(article.summary)}</p>
    <a href="/articles/${article.slug}/">Read article</a>
  </article>`).join("\n");

  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hijama Blog | Wet Cupping Guides in South London</title>
    <meta name="description" content="SEO-rich wet cupping, hijama, aftercare and safety guides from Sincerity Cupping Clinic in Streatham, South London.">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${business.domain}/blog/">
    <meta property="og:title" content="Wet Cupping Blog | ${business.name}">
    <meta property="og:description" content="Local wet cupping and hijama guides for South London clients.">
    <meta property="og:image" content="${business.domain}/assets/img/wet-cupping-therapy-1600.jpg">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
    <link rel="shortcut icon" href="/favicon.ico">
    <style id="critical-css">:root{--ink:#10292f;--ink-soft:#34545b;--paper:#fbfaf6;--mist:#eef5f2;--line:#d7e4df;--teal:#0b7895;--leaf:#2d6e3c;--saffron:#e2a319;--saffron-text:#8a5a00;--white:#ffffff;--shadow:0 18px 45px rgba(16,41,47,.13);--container:min(1120px,calc(100% - 40px))}
*{box-sizing:border-box}
html{scroll-behavior:smooth;overflow-x:hidden}
body{margin:0;background:var(--paper);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px;line-height:1.65;text-rendering:optimizeLegibility;overflow-x:hidden}
img{display:block;max-width:100%;height:auto}
a{color:inherit}
h1,h2,h3{margin:0;line-height:1.05;text-wrap:balance}
h1{max-width:11ch;font-size:clamp(3.4rem,12vw,7.7rem)}
h2{max-width:14ch;font-size:clamp(2.2rem,6vw,4.7rem)}
.skip-link{position:absolute;left:16px;top:-80px;z-index:30;padding:10px 14px;background:var(--ink);color:var(--white);border-radius:6px}
.skip-link:focus{top:16px}
.site-header{position:sticky;top:0;z-index:20;border-bottom:1px solid rgba(215,228,223,.78);background:rgba(251,250,246,.92);backdrop-filter:blur(14px)}
.nav{width:var(--container);min-height:132px;margin:0 auto;display:grid;grid-template-columns:minmax(130px,auto) 1fr auto auto;align-items:center;gap:20px}
.brand{display:inline-flex;align-items:center;gap:0;min-width:0;text-decoration:none;font-weight:800}
.brand img{width:118px;height:118px;object-fit:contain}
.brand span{display:block;max-width:12rem;color:var(--ink);font-size:1.05rem;line-height:1.05}
.nav-links{display:flex;align-items:center;justify-content:center;gap:6px}
.nav-links a{padding:10px 12px;border-radius:6px;color:var(--ink-soft);font-weight:650;text-decoration:none}
.nav-toggle{display:none;width:44px;height:44px;border:1px solid var(--line);border-radius:8px;background:var(--white);color:var(--ink);cursor:pointer}
.button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:46px;padding:12px 18px;border:1px solid transparent;border-radius:8px;background:var(--ink);color:var(--white);text-decoration:none;font-weight:800;max-width:100%}
.button.secondary{background:transparent;border-color:rgba(255,255,255,.75);color:var(--white)}
.button.light{background:var(--white);color:var(--ink)}
.button.ghost{background:transparent;border-color:var(--line);color:var(--ink)}
.hero{position:relative;min-height:82dvh;display:grid;align-items:end;isolation:isolate;overflow:hidden;background:var(--ink);color:var(--white)}
.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,41,47,.9),rgba(16,41,47,.68) 42%,rgba(16,41,47,.2)),url("/assets/img/back-cupping-glass-1200.jpg") center/cover;background:linear-gradient(90deg,rgba(16,41,47,.9),rgba(16,41,47,.68) 42%,rgba(16,41,47,.2)),image-set(url("/assets/img/back-cupping-glass-1200.avif") type("image/avif"),url("/assets/img/back-cupping-glass-1200.webp") type("image/webp"),url("/assets/img/back-cupping-glass-1200.jpg") type("image/jpeg")) center/cover;z-index:-2}
.hero::after{content:"";position:absolute;inset:auto 0 0;height:26%;background:linear-gradient(0deg,rgba(16,41,47,.82),transparent);z-index:-1}
.hero-inner,.section-inner,.footer-inner{width:min(1120px,calc(100vw - 40px));margin:0 auto}
.hero-inner{padding:112px 0 54px}
.eyebrow{margin:0 0 18px;color:var(--saffron-text);font-size:.88rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.hero p{max-width:min(42rem,100%);margin:22px 0 0;color:rgba(255,255,255,.9);font-size:clamp(1.05rem,2vw,1.28rem)}
.hero-actions,.inline-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:28px}
.hero-facts{width:min(1120px,calc(100vw - 40px));margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.22)}
.hero-facts div{min-height:98px;padding:18px 22px;border-right:1px solid rgba(255,255,255,.22)}
.hero-facts strong{display:block;font-size:clamp(1.35rem,2.4vw,2rem)}
.hero-facts span{display:block;color:rgba(255,255,255,.78);line-height:1.4}
.section{padding:clamp(64px,9vw,120px) 0}
.section.alt{background:var(--mist)}
.page-hero{padding:clamp(80px,12vw,150px) 0 clamp(52px,8vw,88px);background:var(--mist)}
.page-hero .section-inner{display:grid;grid-template-columns:minmax(0,.95fr) minmax(280px,.7fr);gap:42px;align-items:end}
.page-hero h1{max-width:12ch;color:var(--ink)}
.page-hero p{margin:0;color:var(--ink-soft);font-size:1.12rem}
@media (max-width:620px){:root{--container:min(1120px,calc(100% - 28px))}.brand img{width:86px;height:86px}.brand span{display:none}.hero{min-height:auto}.hero-inner{padding-top:86px}.hero-actions,.inline-actions{align-items:stretch;flex-direction:column}.button{width:100%}}</style>
    <link rel="preload" href="/assets/css/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="/assets/css/styles.css"></noscript>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <nav class="nav" aria-label="Primary navigation">
        <a class="brand" href="/"><img src="/assets/img/sincerity-cupping-logo.svg" width="160" height="160" alt="${business.name} logo"></a>
        <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-label="Open menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        <div class="nav-links" data-nav-links><a href="/">Home</a><a href="/services/">Services</a><a href="/about/">About</a><a href="/blog/" aria-current="page">Blog</a><a href="/contact/">Contact</a></div>
        <a class="button" href="${business.bookingUrl}">Book now</a>
      </nav>
    </header>
    <main id="main">
      <section class="page-hero">
        <div class="section-inner">
          <div><p class="eyebrow">Blog</p><h1>Wet cupping guides for South London</h1></div>
          <p>Answer-led articles for clients researching hijama, wet cupping aftercare, practitioner preference, hygiene and local booking questions.</p>
        </div>
      </section>
      <section class="section">
        <div class="section-inner article-grid">
          ${cards}
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="footer-inner">
        <div><img class="footer-logo" src="/assets/img/sincerity-cupping-logo.svg" width="160" height="160" alt="${business.name} logo"><p>Insured wet cupping and hijama for men and women in Streatham, South London.</p></div>
        <div class="footer-links"><strong>Pages</strong><a href="/">Home</a><a href="/services/">Services</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a></div>
        <div class="footer-links"><strong>Contact</strong><a href="tel:${business.telephone}">${business.phone}</a><a href="${business.whatsappUrl}">WhatsApp</a><a href="mailto:${business.email}">${business.email}</a><a href="${business.googleMapsUrl}">${business.address.street}, ${business.address.postcode}</a></div>
      </div>
      <p class="footer-small">© <span data-year></span> ${business.name}. Cupping is a complementary therapy and is not a replacement for medical advice, diagnosis or treatment.</p>
    </footer>
    <script src="/assets/js/main.js" defer></script>
  </body>
</html>`;
}

function sitemap(articles) {
  const staticUrls = [
    ["", "1.0", "weekly"],
    ["services/", "0.9", "monthly"],
    ["about/", "0.7", "monthly"],
    ["contact/", "0.8", "monthly"],
    ["blog/", "0.8", "weekly"],
    ["privacy/", "0.3", "yearly"]
  ];
  const urls = staticUrls.map(([loc, priority, changefreq]) => `  <url><loc>${business.domain}/${loc}</loc><lastmod>${isoDate}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`);
  for (const article of articles) {
    urls.push(`  <url><loc>${business.domain}/articles/${article.slug}/</loc><lastmod>${article.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
  }
  // Local area landing pages — preserved across cron runs (Codex audit fix 2026-05-14)
  for (const area of business.serviceAreas) {
    const slug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    urls.push(`  <url><loc>${business.domain}/areas/${slug}/</loc><lastmod>${isoDate}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function llms(articles) {
  const articleLines = articles.map((article) => `- [${article.title}](${business.domain}/articles/${article.slug}/): ${article.summary}`).join("\n");
  return `# ${business.name}
> Insured wet cupping and hijama clinic for men and women in Streatham, South London.

## Key facts
- Name: ${business.name}
- Address: ${business.address.street}, ${business.address.locality} ${business.address.postcode}, United Kingdom
- Phone: ${business.phone}
- WhatsApp: ${business.whatsappUrl}
- Email: ${business.email}
- Services: ${business.services.map((service) => service.name).join(", ")}
- Combined practitioner experience: ${business.combinedExperienceYears} years
- Insurance: ${business.fullyInsured ? "Fully insured" : "Check with clinic"}
- Environment: ${business.environment}
- Service areas: ${business.serviceAreas.join(", ")}

## Main pages
- [Home](${business.domain}/): Overview of the clinic, wet cupping service, reviews and booking.
- [Services](${business.domain}/services/): Wet cupping / hijama for men and women, including suitability, hygiene, insurance and aftercare.
- [About](${business.domain}/about/): Clinic story, approach and values.
- [Contact](${business.domain}/contact/): Phone, WhatsApp, email, address, map and enquiry form.
- [Blog](${business.domain}/blog/): Wet cupping guides written for local SEO and answer-led search.

## Local Area Pages
${business.serviceAreas.map(area => {
  const slug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `- [Wet cupping in ${area}](${business.domain}/areas/${slug}/): Wet cupping and hijama for clients from ${area}.`;
}).join("\n")}

## Articles
${articleLines}

## Safety note
Cupping is a complementary therapy and is not a replacement for medical advice, diagnosis or treatment.
`;
}

const created = [];
for (const topic of chosen) {
  const articleDir = path.join(root, "articles", topic.slug);
  fs.mkdirSync(articleDir, {recursive: true});
  fs.writeFileSync(path.join(articleDir, "index.html"), articleHtml(topic));
  const record = {slug: topic.slug, title: topic.title, summary: topic.summary, date: isoDate};
  const existingIndex = manifest.findIndex((article) => article.slug === topic.slug);
  if (existingIndex >= 0) manifest[existingIndex] = record;
  else manifest.push(record);
  created.push(record);
}

manifest.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(root, "blog", "index.html"), blogHtml(manifest));
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap(manifest));
fs.writeFileSync(path.join(root, "llms.txt"), llms(manifest));

console.log(`Generated ${created.length} article(s): ${created.map((article) => article.slug).join(", ")}`);
