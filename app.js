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

  AppMintGuard.loadState();
  AppMintGuard.start();

  // طلب الإذن في أول تفاعل (للمتصفح فقط)
  if (typeof Capacitor === "undefined" || !Capacitor.isNativePlatform()) {
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
  }

  // مزامنة عند العودة للتطبيق
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      Notifications.syncAll();
      if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
    }
  });

  setInterval(() => {
    const el = document.getElementById("nowTime");
    if (el) el.textContent = H.timeStr(Date.now());
  }, 60000);
});