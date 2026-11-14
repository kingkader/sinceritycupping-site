"""Points lucidmark.co.uk (and www) at the Cloudflare Pages project and retires the old Cloudways proxy route.
Runs in GitHub Actions with the Cloudflare secrets. Prints status codes and Cloudflare messages only."""
import json, os, urllib.request, urllib.error

T, A = os.environ["CF_TOKEN"], os.environ["CF_ACCOUNT"]
ZONE_NAME, PROJECT, TARGET = "lucidmark.co.uk", "lucidmark", "lucidmark.pages.dev"


def api(method, path, body=None):
    req = urllib.request.Request("https://api.cloudflare.com/client/v4" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {T}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, {}


def msg(j):
    return "; ".join(x.get("message", "") for x in (j.get("errors") or []))


for name in [ZONE_NAME, "www." + ZONE_NAME]:
    c, j = api("POST", f"/accounts/{A}/pages/projects/{PROJECT}/domains", {"name": name})
    print("pages domain", name, c, msg(j))

c, j = api("GET", f"/zones?name={ZONE_NAME}")
Z = j["result"][0]["id"]

for name in [ZONE_NAME, "www." + ZONE_NAME]:
    c, j = api("GET", f"/zones/{Z}/dns_records?name={name}&per_page=50")
    recs = [r for r in j.get("result", []) if r["type"] in ("A", "AAAA", "CNAME")]
    print("dns", name, "before:", [(r["type"], r["content"]) for r in recs])
    body = {"type": "CNAME", "name": name, "content": TARGET, "proxied": True, "ttl": 1}
    if recs:
        first, rest = recs[0], recs[1:]
        c, j = api("PUT", f"/zones/{Z}/dns_records/{first['id']}", body)
        print("dns update", name, c, msg(j))
        if c == 200:
            for r in rest:
                c2, j2 = api("DELETE", f"/zones/{Z}/dns_records/{r['id']}")
                print("dns remove extra", name, r["type"], c2, msg(j2))
    else:
        c, j = api("POST", f"/zones/{Z}/dns_records", body)
        print("dns create", name, c, msg(j))

c, j = api("GET", f"/zones/{Z}/workers/routes")
for r in j.get("result", []):
    if r.get("script") == "lucidmark-proxy":
        c2, j2 = api("DELETE", f"/zones/{Z}/workers/routes/{r['id']}")
        print("remove proxy route", r["pattern"], c2, msg(j2))

c, j = api("GET", f"/accounts/{A}/pages/projects/{PROJECT}/domains")
print("pages domains now:", [(d["name"], d.get("status")) for d in j.get("result", [])])
