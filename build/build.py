#!/usr/bin/env python3
"""Builds the static LucidMark site into dist/. Run: python3 build/build.py"""
import json
import pathlib
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
SITE = "https://lucidmark.co.uk"
EMAIL = "hello@lucidmark.co.uk"
LEGAL = ("LucidMark is a trading name of Axonis Ltd, registered in England and Wales, "
         "company number 16436487. Registered office: 330 Streatham High Road, London.")

LOGO = ('<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="2" y="2" width="30" height="30" fill="none" stroke="#fff" stroke-width="3"/>'
        '<path d="M17 2v30M2 17h30" stroke="#fff" stroke-width="1.5" opacity=".6"/>'
        '<circle cx="22" cy="12" r="5" fill="#fff"/></svg>')

ICON = {
    # One line-icon set: 2.2 stroke, ink with a lime fill accent
    "score": '<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="12" fill="#c6f432" stroke="#0b0d0c" stroke-width="2.2"/><path d="M15 15 21 9" stroke="#0b0d0c" stroke-width="2.2" stroke-linecap="round"/><circle cx="15" cy="15" r="2.2" fill="#0b0d0c"/></svg>',
    "pound": '<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="12" fill="#c6f432" stroke="#0b0d0c" stroke-width="2.2"/><path d="M18.5 10.5c-.5-1.7-1.9-2.6-3.5-2.6-2.2 0-3.6 1.5-3.6 3.8V21m-2.2-5.5h6.3M9.2 21h11" fill="none" stroke="#0b0d0c" stroke-width="2.2" stroke-linecap="round"/></svg>',
    "fixes": '<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="12" fill="#c6f432" stroke="#0b0d0c" stroke-width="2.2"/><path d="M10 11h10M10 15h10M10 19h6" stroke="#0b0d0c" stroke-width="2.2" stroke-linecap="round"/></svg>',
    "good": '<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="12" fill="#c6f432" stroke="#0b0d0c" stroke-width="2.2"/><path d="m10 15.5 3.4 3.3L20.5 11" fill="none" stroke="#0b0d0c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "tick": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#c6f432"/><path d="m7.5 12.3 3 3L16.7 9" fill="none" stroke="#0b0d0c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "go": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}


def head(title, desc, path, extra=""):
    url = SITE + path
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0b0d0c">
<meta property="og:type" content="website">
<meta property="og:site_name" content="LucidMark">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/figtree-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
"""


def cover(sheet=""):
    return """<header class="cover">
<div class="cover-in">
<a class="brand" href="/" aria-label="LucidMark home">Lucid<span>Mark</span></a>
<nav aria-label="Main">
<a class="hide-s" href="/#how">How it works</a>
<a class="hide-s" href="/#prices">Prices</a>
<a class="cta-s" href="/free-audit/">Free audit</a>
</nav>
</div>
</header>
"""


def foot():
    return f"""<footer>
<div class="foot-in">
<div class="f-row">
<a href="/free-audit/">Free Google Ads audit</a>
<a href="/#prices">Prices</a>
<a href="/privacy/">Privacy</a>
<a href="/terms/">Terms</a>
<a href="mailto:{EMAIL}">{EMAIL}</a>
</div>
<p>{LEGAL}</p>
<p>Google Ads is a trademark of Google LLC. LucidMark is independent and not endorsed by Google.</p>
</div>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""


def audit_form(fid, full=False):
    extra = ""
    if full:
        extra = f"""<div class="row2">
<div><label for="{fid}-name">Your name</label><input id="{fid}-name" name="name" autocomplete="name" required data-name="name"></div>
<div><label for="{fid}-biz">Business name</label><input id="{fid}-biz" name="business" autocomplete="organization" required data-name="business name"></div>
</div>
<div class="row2">
<div><label for="{fid}-phone">Phone <span class="fine">(optional)</span></label><input id="{fid}-phone" name="phone" type="tel" autocomplete="tel"></div>
<div><label for="{fid}-spend">Monthly Google Ads spend</label>
<select id="{fid}-spend" name="spend">
<option value="">Choose one</option>
<option>Not running ads yet</option>
<option>Under £1,500</option>
<option>£1,500 to £4,000</option>
<option>£4,000 to £8,000</option>
<option>Over £8,000</option>
</select></div>
</div>
"""
    return f"""<form class="audit" id="{fid}" novalidate>
{extra}<div class="row2">
<div><label for="{fid}-site">Your website</label><input id="{fid}-site" name="website" inputmode="url" autocomplete="url" placeholder="yourbusiness.co.uk" required data-name="website"></div>
<div><label for="{fid}-email">Email</label><input id="{fid}-email" name="email" type="email" autocomplete="email" placeholder="you@yourbusiness.co.uk" required></div>
</div>
<div class="hp" aria-hidden="true"><label for="{fid}-hp">Leave this empty</label><input id="{fid}-hp" name="company_site" tabindex="-1" autocomplete="off"></div>
<input type="hidden" name="form" value="{fid}">
<button class="btn" type="submit">Get my free audit {ICON['go']}</button>
<p class="fine">Free, with no obligation. We reply within one working day.</p>
<p class="msg" role="status" aria-live="polite"></p>
</form>"""


def home():
    jsonld = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "LucidMark",
        "url": SITE + "/",
        "email": EMAIL,
        "description": "Google Ads management for UK local businesses: account setup, conversion tracking, daily checks, weekly search-term clean-up and a plain-English weekly report.",
        "areaServed": {"@type": "Country", "name": "United Kingdom"},
        "parentOrganization": {"@type": "Organization", "name": "Axonis Ltd", "identifier": "16436487"},
        "address": {"@type": "PostalAddress", "streetAddress": "330 Streatham High Road", "addressLocality": "London", "addressCountry": "GB"},
        "makesOffer": [
            {"@type": "Offer", "name": "Starter", "price": "499", "priceCurrency": "GBP", "description": "Google Ads management for ad spend up to £1,500 a month"},
            {"@type": "Offer", "name": "Growth", "price": "750", "priceCurrency": "GBP", "description": "Google Ads management for ad spend of £1,500 to £4,000 a month"},
            {"@type": "Offer", "name": "Pro", "price": "999", "priceCurrency": "GBP", "description": "Google Ads management for ad spend of £4,000 to £8,000 a month"},
        ],
    }
    faq = [
        ("Do I need to be running Google Ads already?",
         "No. If you already run ads, the audit shows what's working and what's wasted. If you don't, we'll look at your website and area and tell you honestly whether Google Ads is likely to pay for you."),
        ("What kind of businesses do you work with?",
         "UK local businesses that win customers by phone call, form or booking. Clinics, trades, home services, professional services and more."),
        ("How do you get into my account?",
         "We send an access request from our Google Ads manager account. You accept it in Google Ads. You can remove our access at any time, in two clicks."),
        ("Who will I deal with?",
         "One named contact for calls, questions and your monthly review. Your account is checked every day, and your report arrives every Monday."),
        ("Can I leave?",
         "Yes. After the first 3 months, you can stop at the end of any month. Your account, campaigns and data stay with you."),
        ("Do you guarantee results?",
         "No. Nobody honest can. We promise the work: daily checks, a weekly clean-up of your search terms, and a clear report every Monday."),
    ]
    faq_html = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in faq)
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
    extra = (f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>\n'
             f'<script type="application/ld+json">{json.dumps(faq_ld, ensure_ascii=False)}</script>\n')

    html = head("LucidMark | Google Ads management for UK local businesses",
                "See where your Google Ads money goes. Free audit, daily account checks, a plain-English report every Monday. From £499 a month.",
                "/", extra)
    html += cover()
    html += f"""<main id="main">
<section class="hero" aria-labelledby="hero-h">
<div class="hero-in">
<p class="bignum"><b class="nums">£335</b><span>a month wasted on the wrong searches, in an example local account</span></p>
<div class="hero-grid">
<div>
<h1 id="hero-h">See where your Google Ads money goes.</h1>
<p class="lead">Most local accounts pay for searches that never turn into customers. Our free audit finds them and puts a £ figure on yours.</p>
</div>
<div class="panel" id="audit">
{audit_form("hero-audit")}
</div>
</div>
</div>
</section>
<section class="strip" aria-label="How we look after your account">
<ul>
<li><b>Daily</b><span>account checks</span></li>
<li><b>Weekly</b><span>search clean-up</span></li>
<li><b>Monday</b><span>plain-English report</span></li>
</ul>
</section>

<div class="light">
<section class="sec" aria-labelledby="shows-h">
<h2 id="shows-h">What your free audit shows</h2>
<p class="intro">One page, in plain English. Yours to keep, whether you hire us or not.</p>
<dl class="legend">
<div><dt>{ICON['score']} A score out of 100</dt><dd>How healthy your account is, from tracking to search terms.</dd></div>
<div><dt>{ICON['pound']} Money at risk</dt><dd>The £ a month going on the wrong searches, areas and times.</dd></div>
<div><dt>{ICON['fixes']} Your top 3 fixes</dt><dd>What to change first, in order, and why.</dd></div>
<div><dt>{ICON['good']} What's working</dt><dd>So you keep it. We tell you the good news too.</dd></div>
<div class="note">To run it, we need view access to your Google Ads account. You can remove it at any time.</div>
</dl>
</section>
</div>

<div class="dark">
<section class="sec" id="how" aria-labelledby="how-h">
<h2 id="how-h">From audit to your first Monday report</h2>
<ol class="route">
<li><span class="wp">1</span><h3>Free audit</h3><p>Within one working day of getting access.</p></li>
<li><span class="wp">2</span><h3>Fix tracking</h3><p>So every call, form and booking is counted.</p></li>
<li><span class="wp">3</span><h3>Campaigns live</h3><p>Within about 5 working days of signing up.</p></li>
<li><span class="wp">4</span><h3>Daily checks</h3><p>Spend, leads, broken ads and odd changes.</p></li>
<li><span class="wp">5</span><h3>Monday report</h3><p>In your inbox, every week, in plain English.</p></li>
</ol>
</section>
</div>

<div class="light">
<section class="sec" aria-labelledby="work-h">
<h2 id="work-h">What we do, and how often</h2>
<p class="intro">Most small accounts get looked at once a month. Yours gets looked at every day.</p>
<table class="work">
<tr><th scope="row">Every day<span>Every account, every morning</span></th><td><ul>
<li>Check spend against your budget</li>
<li>Check calls and forms are still being counted</li>
<li>Catch disapproved ads, billing problems and odd changes</li>
</ul></td></tr>
<tr><th scope="row">Every week<span>The clean-up</span></th><td><ul>
<li>Block wasted searches and add the ones that bring customers</li>
<li>Adjust budgets and bids in small, safe steps</li>
<li>Test your landing page on a phone</li>
<li>Send your Monday report</li>
</ul></td></tr>
<tr><th scope="row">Every month<span>The bigger picture</span></th><td><ul>
<li>Refresh ads using only true facts from your website</li>
<li>Review your areas, days and times</li>
<li>A short look back at the month with you</li>
</ul></td></tr>
</table>
</section>
</div>

<div class="dark">
<section class="sec" aria-labelledby="rep-h">
<div class="report-wrap">
<div>
<h2 id="rep-h">Your Monday report</h2>
<p class="intro">No dashboards to log in to. One short email that tells you what happened and what's next.</p>
<ul class="points">
<li>{ICON['tick']}<span>Leads and cost per lead first. That's what you care about.</span></li>
<li>{ICON['tick']}<span>What we changed, and why.</span></li>
<li>{ICON['tick']}<span>A bad week explained in one honest line, with the fix.</span></li>
</ul>
</div>
<figure class="mail" aria-label="Example weekly report email">
<div class="mail-head"><b>Hartley Plumbing: 14 leads at £21 each</b><br>From LucidMark · Monday 9:00 · <span class="example">Example</span></div>
<div class="mail-body nums">
<p>Hi Dave, here's your week.</p>
<h3>The numbers</h3>
<ul>
<li>Leads: <b>14</b> (last week 11)</li>
<li>Cost per lead: <b>£21</b> (last week £26)</li>
<li>Spend: £294. £1,180 of £1,500 used this month</li>
<li>We showed for 64% of local searches for your services</li>
</ul>
<h3>What we did</h3>
<ul>
<li>Blocked 23 wasted searches, like "plumber jobs" and "diy boiler repair"</li>
<li>Moved budget to weekday mornings, when most calls come in</li>
</ul>
<h3>What's next</h3>
<ul><li>Test a new ad for emergency call-outs</li></ul>
<p>How many of last week's 14 calls became booked jobs?</p>
</div>
</figure>
</div>
</section>
</div>

<div class="light">
<section class="sec" id="prices" aria-labelledby="price-h">
<h2 id="price-h">Prices, set by how much you spend with Google</h2>
<p class="intro">One monthly fee. Your ad spend is paid straight to Google and is not part of it.</p>
<div class="scale">
<label class="slab" for="spend">Drag to your monthly Google Ads budget: <span id="spend-val" class="nums">£2,500</span></label>
<div class="track">
<div class="bar" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
<input id="spend" type="range" min="0" max="12000" step="250" value="2500">
</div>
<div class="ticks nums" aria-hidden="true"><span>£0</span><span>£1,500</span><span>£4,000</span><span>£8,000+</span></div>
<div class="tiers">
<div><b class="nums">£499</b><small>Starter · spend up to £1,500</small></div>
<div><b class="nums">£750</b><small>Growth · £1,500 to £4,000</small></div>
<div><b class="nums">£999</b><small>Pro · £4,000 to £8,000</small></div>
<div><b class="nums">15%</b><small>Scale · over £8,000</small></div>
</div>
<div class="readout" aria-live="polite"><output for="spend" id="fee" class="nums">£750</output><span id="fee-note">a month on Growth.</span></div>
</div>
<ul class="points">
<li>{ICON['tick']}<span><b>Your account stays yours.</b> We work inside it. You can remove us at any time.</span></li>
<li>{ICON['tick']}<span><b>You pay Google directly.</b> We never hold your ad budget.</span></li>
<li>{ICON['tick']}<span><b>3 months minimum,</b> then month to month.</span></li>
<li>{ICON['tick']}<span><b>No promised results.</b> We promise the work, every day, and a report every Monday.</span></li>
</ul>
</section>

<section class="sec" aria-labelledby="faq-h">
<h2 id="faq-h">Questions</h2>
<div class="faq">{faq_html}</div>
</section>
</div>

<section class="back" aria-labelledby="back-h">
<div class="back-in">
<div><h2 id="back-h">Find the leaks before you spend another month.</h2>
<p>Free audit. One page. Yours to keep.</p></div>
<a class="btn" href="/free-audit/">Get my free audit {ICON['go']}</a>
</div>
</section>
</main>
"""
    html += foot()
    return html


def audit_page():
    html = head("Free Google Ads audit | LucidMark",
                "Find out what your Google Ads are wasting. A free one-page audit: a score out of 100, the money at risk and your top 3 fixes.",
                "/free-audit/")
    html += cover()
    html += f"""<main id="main" class="audit-wrap">
<div class="audit-page">
<div>
<h1>Free Google Ads audit</h1>
<p class="intro" style="margin-top:1rem">Find out what your ads are wasting, in one page, in plain English.</p>
<dl class="legend">
<div><dt>{ICON['score']} A score out of 100</dt><dd>How healthy your account is.</dd></div>
<div><dt>{ICON['pound']} Money at risk</dt><dd>The £ a month going on the wrong searches and areas.</dd></div>
<div><dt>{ICON['fixes']} Your top 3 fixes</dt><dd>What to change first, and why.</dd></div>
<div><dt>{ICON['good']} What's working</dt><dd>So you keep it.</dd></div>
</dl>
<h2 style="margin-top:2.5rem;font-size:2rem">What happens next</h2>
<ol class="route route-v">
<li><span class="wp">1</span><h3>We email you</h3><p>Within one working day, with a link to give us view access.</p></li>
<li><span class="wp">2</span><h3>We check your account</h3><p>Every campaign, search term and setting.</p></li>
<li><span class="wp">3</span><h3>You get your audit</h3><p>One page. Yours to keep, whether you hire us or not.</p></li>
</ol>
</div>
<div class="panel" id="audit">
<h2 style="font-size:2rem;margin-bottom:1.2rem">Request your audit</h2>
{audit_form("audit-page", full=True)}
</div>
</div>
</main>
"""
    html += foot()
    return html


def doc_page(title, path, desc, body):
    html = head(f"{title} | LucidMark", desc, path)
    html += cover()
    html += f'<main id="main" class="doc">\n<h1>{title}</h1>\n{body}\n</main>\n'
    html += foot()
    return html


PRIVACY = f"""<p>Last updated 6 November 2026.</p>
<p>This notice explains how Axonis Ltd, trading as LucidMark, uses personal information. We are the data controller. Contact: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
<h2>What we collect</h2>
<ul>
<li>What you send through our forms: name, business, website, email, phone and ad spend.</li>
<li>Emails and call notes when we talk to you.</li>
<li>For clients and audits: data in your Google Ads account that you give us access to, such as campaigns, search terms, costs and conversions.</li>
<li>Billing details, handled by Stripe. We do not see full card numbers.</li>
</ul>
<h2>Why we use it</h2>
<ul>
<li>To reply to you and run your free audit (our legitimate interest, or steps before a contract).</li>
<li>To manage your Google Ads and send your reports (to perform our contract with you).</li>
<li>To keep accounts and records (legal obligation).</li>
</ul>
<h2>Who we share it with</h2>
<p>Only the services we need to run the business: Google (Google Ads), Cloudflare (website hosting), our email provider, and Stripe (payments). Some of these may process data outside the UK under approved safeguards. We never sell your data.</p>
<h2>How long we keep it</h2>
<p>Enquiries that don't become clients: up to 12 months. Client records: for 6 years after we stop working together, for tax and legal reasons. We remove our access to your Google Ads account when our work ends.</p>
<h2>Your rights</h2>
<p>You can ask to see, correct or delete your data, or object to how we use it. Email us and we'll reply within one month. You can also complain to the Information Commissioner's Office at ico.org.uk.</p>
<h2>Cookies</h2>
<p>This website does not use tracking or advertising cookies.</p>"""

TERMS = f"""<p>Last updated 6 November 2026. These terms apply when you buy Google Ads management from Axonis Ltd, trading as LucidMark.</p>
<h2>The service</h2>
<p>We set up and manage your Google Ads account: tracking, campaigns, daily checks, weekly search-term clean-up, budgets, bids, ads and a weekly report by email.</p>
<h2>Fees and payment</h2>
<ul>
<li>Your monthly fee depends on your monthly Google Ads spend, as shown on our prices.</li>
<li>Fees are paid monthly in advance by card or Direct Debit through Stripe.</li>
<li>Your ad spend is billed to you directly by Google and is not part of our fee.</li>
</ul>
<h2>Term and cancelling</h2>
<p>The minimum term is 3 months. After that, either of us can stop at the end of any month by email.</p>
<h2>Your account</h2>
<p>Your Google Ads account, campaigns and data belong to you. You can remove our access at any time. When we stop working together, we remove our access.</p>
<h2>Results</h2>
<p>We do not guarantee leads, sales, rankings or any other result. Results depend on many things outside our control, including your market, your website and how you handle enquiries.</p>
<h2>Our responsibility</h2>
<p>We work with reasonable care and skill. Our total liability to you is limited to the fees you paid us in the 3 months before the claim. We are not liable for lost profits or indirect losses. Nothing here limits liability that cannot be limited by law.</p>
<h2>Law</h2>
<p>These terms are governed by the law of England and Wales.</p>"""


NOT_FOUND_BODY = '<p>That page isn\'t on this map. Try the <a href="/">home page</a> or ask for your <a href="/free-audit/">free audit</a>.</p>'


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SRC / "assets", DIST / "assets")
    (DIST / "free-audit").mkdir(parents=True)
    (DIST / "privacy").mkdir()
    (DIST / "terms").mkdir()
    (DIST / "index.html").write_text(home(), encoding="utf-8")
    (DIST / "free-audit" / "index.html").write_text(audit_page(), encoding="utf-8")
    (DIST / "privacy" / "index.html").write_text(doc_page("Privacy", "/privacy/", "How LucidMark uses your personal information.", PRIVACY), encoding="utf-8")
    (DIST / "terms" / "index.html").write_text(doc_page("Terms", "/terms/", "The terms for LucidMark Google Ads management.", TERMS), encoding="utf-8")
    (DIST / "404.html").write_text(doc_page("Page not found", "/404", "Page not found.", NOT_FOUND_BODY).replace('<link rel="canonical" href="https://lucidmark.co.uk/404">', '<meta name="robots" content="noindex">'), encoding="utf-8")
    for f in ["favicon.svg", "robots.txt", "llms.txt", "_headers", "_redirects"]:
        shutil.copy(SRC / f, DIST / f)
    if (SRC / "functions").exists():
        pass  # Pages Functions live at repo root /functions, not in dist
    urls = ["/", "/free-audit/", "/privacy/", "/terms/"]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += "".join(f"<url><loc>{SITE}{u}</loc><lastmod>2026-11-06</lastmod></url>\n" for u in urls) + "</urlset>\n"
    (DIST / "sitemap.xml").write_text(sm, encoding="utf-8")
    print("built", sorted(str(p.relative_to(DIST)) for p in DIST.rglob("*.html")))


if __name__ == "__main__":
    main()
