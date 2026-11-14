// lucidmark-proxy retired: pass every request straight to the zone's origin (Cloudflare Pages).
export default {
  fetch(request) {
    return fetch(request);
  },
};
