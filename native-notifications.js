const NativeBridge = {
  isNative: () => typeof Capacitor !== "undefined" && Capacitor.isNativePlatform(),

  async init() {
    if (!this.isNative()) return;
    const { LocalNotifications } = Capacitor.Plugins;

    // 1. إنشاء قناة "منبه صارم" (تتجاوز وضع الصامت وتظهر كـ Pop-up)
    try {
      await LocalNotifications.createChannel({
        id: 'strict_alarms',
        name: 'منبهات صارمة',
        description: 'تنبيهات الأدوية والمهام الهامة',
        importance: 5, // 5 = MAX (صوت + اهتزاز + Pop-up)
        visibility: 1, // 1 = يظهر على شاشة القفل
        sound: 'default',
        vibration: true,
        lights: true
      });
    } catch(e) { console.log("Channel error", e); }

    // 2. طلب إذن الإشعارات
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }

    // 3. تسجيل أزرار الإشعارات
    await LocalNotifications.registerActionTypes({
      types: [{
        id: "REMINDER_ACTIONS",
        actions: [
          { id: "confirm", title: "تم التنفيذ ✓" },
          { id: "snooze", title: "تأجيل ٥ دقائق" }
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

    // إلغاء الإشعارات القديمة
    await LocalNotifications.cancel({ notifications: (await LocalNotifications.getPending()).notifications });
    
    const pending = [];
    let idCounter = 1;

    // جدولة الأدوية والمواعيد
    if (typeof Scheduler !== "undefined") {
      Scheduler.getTodayEvents().forEach(item => {
        if (item.ts <= Date.now() || item.time === "طوال اليوم") return;
        if (item.event.history.some(h => h.at === item.ts)) return;

        pending.push({
          id: idCounter++,
          title: "🚨 تنبيه عاجل: " + item.event.title,
          body: `موعد ${item.time} — اضغط هنا لتأكيد الأخذ.`,
          schedule: { 
            at: new Date(item.ts), 
            allowWhileIdle: true, // يعمل حتى لو الهاتف نائم
            exact: true // دقة بالثانية
          },
          channelId: 'strict_alarms',
          sound: 'default',
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
          title: "🚨 مهمة: " + t.title,
          body: "حان موعد هذه المهمة الآن.",
          schedule: { 
            at: new Date(t.due), 
            allowWhileIdle: true, 
            exact: true 
          },
          channelId: 'strict_alarms',
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