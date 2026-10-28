const CACHE_NAME = "no-tansa-v4";
const ASSETS = [
  "./","./index.html","./style.css","./data.js","./core.js","./dialog.js",
  "./event.js","./scheduler.js","./intelligence.js","./journal.js",
  "./pulse.js","./moment.js","./fingerprint.js","./notifications.js",
  "./appmint-guard.js","./engine.js","./ui.js","./app.js","./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME && k !== "pending-confirm").map(k => caches.delete(k))
  )));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => {
    if (r && r.status === 200 && r.type === "basic") {
      const clone = r.clone();
      caches.open(CACHE_NAME).then(cc => cc.put(e.request, clone));
    }
    return r;
  }).catch(() => e.request.mode === "navigate" ? caches.match("./index.html") : new Response("", {status:503}))));
});

async function broadcast(msg) {
  const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  cs.forEach(c => c.postMessage(msg));
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const action = event.action;

  if (action === "confirm") {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open("pending-confirm");
        const key = `/__confirm__/${d.kind}/${d.itemId}/${d.ts || 0}`;
        await cache.put(new Request(key), new Response(JSON.stringify(d)));
      } catch(e) {}
      broadcast({ type: "NOTIF_CONFIRM", ...d });
    })());
    return;
  }
  if (action === "snooze") {
    event.waitUntil((async () => {
      await new Promise(r => setTimeout(r, 10 * 60 * 1000));
      await self.registration.showNotification("⏰ مؤجل ١٠ دقائق", {
        body: "تذكير: " + (d.kind === "event" ? "دواء/موعد" : "مهمة"),
        tag: "snooze_" + (d.itemId || Date.now()),
        icon: "icon-192.png", badge: "icon-192.png",
        data: d,
        requireInteraction: true,
        vibrate: [400,120,400],
        actions: [{ action: "confirm", title: "تم ✓" }]
      });
    })());
    return;
  }

  event.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (cs.length) { cs[0].focus(); cs[0].postMessage({ type: "NOTIF_OPEN", data: d }); }
    else self.clients.openWindow("./index.html");
  })());
});

self.addEventListener("periodicsync", (e) => {
  if (e.tag === "check-reminders") {
    e.waitUntil(broadcast({ type: "REQUEST_SYNC" }));
  }
});