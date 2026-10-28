document.addEventListener("DOMContentLoaded", async () => {
  Voice.init();
  await Notify.init();
  UI.init();
  
  // تهيئة إشعارات الأندرويد الأصلية
  if (typeof NativeBridge !== "undefined") {
    await NativeBridge.init();
    await NativeBridge.syncFromStorage();
  }

  UI.showScreen("home");

  // نبض البيت
  Pulse.refresh();
  document.getElementById("btnPulse").addEventListener("click", () => UI.showScreen("journal"));

  // تهيئة AppMintGuard ثم معالجة التأكيدات المنتظرة
  AppMintGuard.loadState();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (e) => {
      const m = e.data || {};
      if (m.type === "NOTIF_CONFIRM") Notifications.processPending();
      if (m.type === "NOTIF_OPEN") UI.showScreen(m.data?.kind === "event" ? "appointments" : "home");
      if (m.type === "REQUEST_SYNC") Notifications.syncAll();
    });
  }
  await Notifications.processPending();
  AppMintGuard.start();

  // طلب الإذن في أول تفاعل
  if (typeof Notification !== "undefined" && !Store.get("notifAsked") && Notification.permission === "default") {
    document.addEventListener("click", async () => {
      if (Store.get("notifAsked")) return;
      Store.set("notifAsked", true);
      const ok = await Notifications.requestPermission();
      if (ok) Notifications.syncAll();
    }, { once: true });
  } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    Notifications.syncAll();
  }

  // مزامنة عند العودة للتطبيق
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      Notifications.syncAll();
      Notifications.processPending();
      if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
    }
  });

  // تحديث الوقت
  setInterval(() => {
    const el = document.getElementById("nowTime");
    if (el) el.textContent = H.timeStr(Date.now());
  }, 60000);
});