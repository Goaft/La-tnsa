const NativeBridge = {
  isNative: () => typeof Capacitor !== "undefined" && Capacitor.isNativePlatform(),

  async init() {
    if (!this.isNative()) return;
    const { LocalNotifications } = Capacitor.Plugins;

    // 1. إنشاء قناة الإشعارات (للصوت والاهتزاز)
    try {
      await LocalNotifications.createChannel({
        id: 'important_alerts',
        name: 'تنبيهات هامة',
        description: 'قناة الأدوية والمواعيد',
        importance: 5, // Pop-up + Sound
        visibility: 1, // Lock screen
        sound: 'default',
        vibration: true
      });
    } catch(e) { console.log("Channel error", e); }

    // 2. طلب إذن الإشعارات تلقائياً
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }

    // 3. تسجيل أزرار الإشعارات
    await LocalNotifications.registerActionTypes({
      types: [{
        id: "REMINDER_ACTIONS",
        actions: [
          { id: "confirm", title: "أخذته ✓" },
          { id: "snooze", title: "١٠ دقائق" }
        ]
      }]
    });

    // 4. الاستماع لنقرات المستخدم
    await LocalNotifications.addListener("localNotificationActionPerformed", (notification) => {
      const { actionId, notification: notif } = notification;
      const data = notif.extra || {};
      if (actionId === "confirm") {
        if (data.kind === "event") AppMintGuard.logEvent(data.itemId, data.ts, "taken");
        if (data.kind === "task") AppMintGuard.logTask(data.itemId, "done");
      }
    });
  },

  async syncFromStorage() {
    if (!this.isNative()) return;
    const { LocalNotifications } = Capacitor.Plugins;

    await LocalNotifications.cancel({ notifications: (await LocalNotifications.getPending()).notifications });
    
    const pending = [];
    let idCounter = 1;

    if (typeof Scheduler !== "undefined") {
      Scheduler.getTodayEvents().forEach(item => {
        if (item.ts <= Date.now() || item.time === "طوال اليوم") return;
        if (item.event.history.some(h => h.at === item.ts)) return;

        pending.push({
          id: idCounter++,
          title: "💊 " + item.event.title,
          body: `موعد ${item.time} — هل أخذته؟`,
          schedule: { at: new Date(item.ts), allowWhileIdle: true },
          channelId: 'important_alerts',
          sound: 'default',
          actionTypeId: "REMINDER_ACTIONS",
          extra: { kind: "event", itemId: item.event.id, ts: item.ts }
        });
      });
    }

    if (typeof Store !== "undefined") {
      (Store.get("tasks", []) || []).forEach(t => {
        if (t.done || !t.due || t.due <= Date.now()) return;
        pending.push({
          id: idCounter++,
          title: "✅ " + t.title,
          body: "حان موعد المهمة",
          schedule: { at: new Date(t.due), allowWhileIdle: true },
          channelId: 'important_alerts',
          sound: 'default',
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