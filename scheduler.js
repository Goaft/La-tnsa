const Scheduler = {
  getTodayEvents() {
    const events = Store.get("events", []) || [];
    const today = new Date(); today.setHours(0,0,0,0);
    const todayTs = today.getTime();
    let todayList = [];

    events.forEach(e => {
      if (e.recurrence.freq === "yearly") {
        const start = new Date(e.start);
        if (start.getDate() === today.getDate() && start.getMonth() === today.getMonth()) {
          todayList.push({ event: e, time: "طوال اليوم", ts: todayTs });
        }
      }
      if (e.recurrence.freq === "daily") {
        if (e.recurrence.until && Date.now() > e.recurrence.until) return;
        e.recurrence.times.forEach(t => {
          const [h, m] = t.split(":").map(Number);
          const occ = new Date(today);
          occ.setHours(h, m, 0, 0);
          todayList.push({ event: e, time: t, ts: occ.getTime() });
        });
      }
    });
    return todayList.sort((a, b) => a.ts - b.ts);
  },

  logOccurrence(eventId, ts, status) {
    const events = Store.get("events", []) || [];
    const e = events.find(x => x.id === eventId);
    if (!e) return;
    e.history.push({ at: ts, status, loggedAt: Date.now() });
    Store.set("events", events);
    H.haptic(50);
    Notify.toast(status === "taken" ? "✓ سُجّل بنجاح" : "سُجّل الفوات");
    if (status === "taken") {
      try { Journal.add({ type: "med", meta: { title: e.title, eventType: e.type } }); } catch(err){}
    }
    if (typeof UI !== "undefined" && UI.currentScreen === "appointments") UI.renderAppointments();
  }
};