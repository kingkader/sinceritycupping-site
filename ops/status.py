"""Read-only: prints the lucidmark Pages domain status, zone SSL mode and worker routes."""
import json, os, urllib.request, urllib.error
T, A = os.environ["CF_TOKEN"], os.environ["CF_ACCOUNT"]
def api(path):
    req = urllib.request.Request("https://api.cloudflare.com/client/v4" + path, headers={"Authorization": f"Bearer {T}"})
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try: return e.code, json.load(e)
        except Exception: return e.code, {}
c, j = api(f"/accounts/{A}/pages/projects/lucidmark/domains")
for d in j.get("result", []):
    print("domain", d.get("name"), d.get("status"), "| validation:", json.dumps(d.get("validation_data")), "| verification:", json.dumps(d.get("verification_data")), "| cert:", d.get("certificate_authority"))
c, j = api("/zones?name=lucidmark.co.uk"); Z = j["result"][0]["id"]
c, j = api(f"/zones/{Z}/settings/ssl"); print("ssl mode", c, j.get("result", {}).get("value"))
c, j = api(f"/zones/{Z}/workers/routes"); print("routes", c, [(r["pattern"], r.get("script")) for r in j.get("result", [])])
c, j = api(f"/zones/{Z}/dns_records?per_page=50"); print("dns", [(r["type"], r["name"], r["content"], r.get("proxied")) for r in j.get("result", []) if r["type"] in ("A","AAAA","CNAME")])
