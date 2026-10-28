const Notifications = {
  categories: {
    medication:  { label: "💊 الأدوية",           default: "strict" },
    appointment: { label: "📅 المواعيد والمناسبات", default: "strict" },
    prayer:      { label: "🕌 الصلاة",             default: "normal" },
    task:        { label: "✅ المهام",             default: "normal" },
    couple:      { label: "💞 الزوجان",            default: "normal" },
    kid:         { label: "👦 الأطفال",            default: "normal" },
    routine:     { label: "⏰ الروتين",            default: "quiet"  }
  },

  async requestPermission() {
    if (!("Notification" in window)) { Notify.toast("الجهاز لا يدعم الإشعارات"); return false; }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
      Notify.toast("الإشعارات مرفوضة — فعّلها من إعدادات الموقع");
      return false;
    }
    const p = await Notification.requestPermission();
    if (p === "granted") { Notify.toast("✓ الإشعارات مفعّلة"); H.haptic([50,50,50]); }
    return p === "granted";
  },

  categoryLevel(cat) {
    const s = Store.get("notifLevels", {}) || {};
    return s[cat] || this.categories[cat]?.default || "quiet";
  },

  itemLevel(kind, item) {
    if (item && item.level) return item.level;
    return this.categoryLevel(kind);
  },

  _timers: new Map(),
  _repeats: new Map(),

  async fire({ level, title, body, tag, kind, itemId, ts, actions = [] }) {
    if (Notification.permission !== "granted") return false;
    if (level === "quiet") return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const strict = level === "strict";
    const opts = {
      body, tag,
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { kind, itemId, ts },
      actions: strict
        ? [{ action: "confirm", title: "تم ✓" }, { action: "snooze", title: "١٠ دقائق" }]
        : (actions.length ? actions : [{ action: "confirm", title: "تم ✓" }]),
      requireInteraction: strict,
      vibrate: strict ? [400,120,400,120,400,120,400] : [200,80,200],
      renotify: true
    };
    try {
      if (reg) await reg.showNotification(title, opts);
      else new Notification(title, opts);
      if (strict) this.scheduleRepeat(tag, { title, body, tag, kind, itemId, ts, actions: opts.actions });
      return true;
    } catch(e) { console.warn("show:", e); return false; }
  },

  scheduleRepeat(tag, payload, times = 3) {
    this.cancelRepeat(tag);
    let count = 0;
    const tick = async () => {
      count++;
      if (count > times) { this._repeats.delete(tag); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      try {
        await reg.showNotification("🔴 تذكير لم يُؤكَّد", {
          body: payload.title + " — " + payload.body,
          tag: payload.tag + "_r" + count,
          icon: "icon-192.png",
          badge: "icon-192.png",
          data: { kind: payload.kind, itemId: payload.itemId, ts: payload.ts },
          requireInteraction: true,
          vibrate: [400,120,400],
          actions: payload.actions,
          renotify: true
        });
      } catch(e) {}
      const t = setTimeout(tick, 5 * 60 * 1000);
      this._repeats.set(payload.tag, t);
    };
    const t = setTimeout(tick, 5 * 60 * 1000);
    this._repeats.set(payload.tag, t);
  },
  cancelRepeat(tag) {
    const t = this._repeats.get(tag);
    if (t) { clearTimeout(t); this._repeats.delete(tag); }
  },

  setBadge(n) {
    try { n > 0 ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch(e) {}
  },

  schedule(key, ts, fireFn) {
    this.cancel(key);
    const delay = ts - Date.now();
    if (delay <= 0) { fireFn(); return; }
    const t = setTimeout(() => { fireFn(); this._timers.delete(key); }, Math.min(delay, 2147483647));
    this._timers.set(key, t);
  },
  cancel(key) {
    const t = this._timers.get(key);
    if (t) { clearTimeout(t); this._timers.delete(key); }
  },

  syncAll() {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    Scheduler.getTodayEvents().forEach(item => {
      if (item.ts <= Date.now() || item.time === "طوال اليوم") return;
      if (item.event.history.some(h => h.at === item.ts)) return;
      const cat = item.event.type === "medication" ? "medication" : "appointment";
      const level = this.itemLevel(cat, item.event);
      if (level === "quiet") return;
      const key = `ev_${item.event.id}_${item.ts}`;
      this.schedule(key, item.ts, () => this.fire({
        level,
        title: "💊 " + item.event.title,
        body: `${item.time} — هل أخذته؟`,
        tag: key, kind: "event", itemId: item.event.id, ts: item.ts
      }));
    });

    (Store.get("tasks", []) || []).forEach(t => {
      if (t.done || !t.due || t.due <= Date.now()) return;
      const level = this.itemLevel("task", t);
      if (level === "quiet") return;
      const key = `task_${t.id}`;
      this.schedule(key, t.due, () => this.fire({
        level,
        title: "✅ " + t.title,
        body: "حان موعد المهمة",
        tag: key, kind: "task", itemId: t.id
      }));
    });

    const pending = (Store.get("tasks", []) || []).filter(t => !t.done && t.due && t.due <= Date.now()).length;
    this.setBadge(pending);
  },

  async processPending() {
    try {
      const cache = await caches.open("pending-confirm");
      const keys = await cache.keys();
      for (const req of keys) {
        const res = await cache.match(req);
        if (!res) continue;
        const data = await res.json();
        try {
          if (data.kind === "event") AppMintGuard.logEvent(data.itemId, data.ts, "taken");
          if (data.kind === "task")  AppMintGuard.logTask(data.itemId, "done");
        } catch(e) {}
        await cache.delete(req);
      }
    } catch(e) { console.warn("processPending:", e); }
  }
};