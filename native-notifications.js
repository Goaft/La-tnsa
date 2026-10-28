const NativeBridge = {
  isNative: () => typeof Capacitor !== "undefined" && Capacitor.isNativePlatform(),

  async init() {
    if (!this.isNative()) return;
    const { LocalNotifications } = Capacitor.Plugins;

    // 1. طلب الإذن
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;

    // 2. تسجيل أزرار الإشعار
    await LocalNotifications.registerActionTypes({
      types: [{
        id: "REMINDER_ACTIONS",
        actions: [
          { id: "confirm", title: "أخذته ✓" },
          { id: "snooze", title: "١٠ دقائق" }
        ]
      }]
    });

    // 3. الاستماع لنقرات المستخدم
    await LocalNotifications.addListener("localNotificationActionPerformed", (notification) => {
      const { actionId, notification: notif } = notification;
      const data = notif.extra || {};
      
      if (actionId === "confirm") {
        if (data.kind === "event") AppMintGuard.logEvent(data.itemId, data.ts, "taken");
        if (data.kind === "task") AppMintGuard.logTask(data.itemId, "done");
      }
    });
  },

  // دالة لجدولة الإشعارات بناءً على بيانات تطبيقك
  async syncFromStorage() {
    if (!this.isNative()) return;
    const { LocalNotifications } = Capacitor.Plugins;

    // إلغاء كل الإشعارات القديمة وجدولة الجديدة
    await LocalNotifications.cancel({ notifications: (await LocalNotifications.getPending()).notifications });
    
    const pending = [];
    let idCounter = 1;

    // جدولة المواعيد والأدوية
    if (typeof Scheduler !== "undefined") {
      Scheduler.getTodayEvents().forEach(item => {
        if (item.ts <= Date.now() || item.time === "طوال اليوم") return;
        if (item.event.history.some(h => h.at === item.ts)) return;

        const scheduleDate = new Date(item.ts);
        pending.push({
          id: idCounter++,
          title: "💊 " + item.event.title,
          body: `موعد ${item.time} — هل أخذته؟`,
          schedule: { at: scheduleDate },
          actionTypeId: "REMINDER_ACTIONS",
          extra: { kind: "event", itemId: item.event.id, ts: item.ts }
        });
      });
    }

    // جدولة المهام
    if (typeof Store !== "undefined") {
      (Store.get("tasks", []) || []).forEach(t => {
        if (t.done || !t.due || t.due <= Date.now()) return;
        
        pending.push({
          id: idCounter++,
          title: "✅ " + t.title,
          body: "حان موعد المهمة",
          schedule: { at: new Date(t.due) },
          actionTypeId: "REMINDER_ACTIONS",
          extra: { kind: "task", itemId: t.id }
        });
      });
    }

    if (pending.length > 0) {
      await LocalNotifications.schedule({ notifications: pending });
    }
  }
};