const AppMintGuard = {
  notifiedEvents: {},
  host: null,

  loadState() {
    this.notifiedEvents = Store.get("notifiedEvents", {}) || {};
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    Object.keys(this.notifiedEvents).forEach(k => {
      const v = this.notifiedEvents[k];
      if (typeof v === "number" && v < cutoff) delete this.notifiedEvents[k];
    });
    Store.set("notifiedEvents", this.notifiedEvents);
    this.ensureHost();
  },

  start() {
    this.checkPending();
    setInterval(() => this.checkPending(), 10000);
  },

  ensureHost() {
    if (this.host) return;
    this.host = document.createElement("div");
    this.host.id = "guardHost";
    this.host.className = "modal hidden";
    this.host.innerHTML = `
      <div class="modal-box" role="dialog">
        <h3 id="guardTitle" style="text-align:center;"></h3>
        <div id="guardBody" style="margin-bottom:0;max-height:55vh;overflow-y:auto;"></div>
      </div>`;
    document.body.appendChild(this.host);
  },

  checkPending() {
    const now = Date.now();
    const items = [];
    let hapticDone = false;

    Scheduler.getTodayEvents().forEach(item => {
      if (item.ts > now || item.time === "طوال اليوم") return;
      if (item.event.history.some(h => h.at === item.ts)) return;
      const key = `ev_${item.event.id}_${item.ts}`;
      if (!this.notifiedEvents[key]) {
        this.notifiedEvents[key] = now;
        Store.set("notifiedEvents", this.notifiedEvents);
        if (!hapticDone) { H.haptic([300,100,300,100,300]); hapticDone = true; }
        Voice.speak("تنبيه: حان موعد " + item.event.title);
        Notify.toast("⏰ حان موعد: " + item.event.title, 5000);
      }
      items.push({
        html: `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:8px;border-right:4px solid var(--red);">
          <div style="font-weight:bold;">${H.escape(item.event.title)} (${H.escape(item.time)})</div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button onclick="AppMintGuard.logEvent('${item.event.id}',${item.ts},'taken')" style="flex:1;background:var(--primary);color:#fff;border:0;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;">أخذته</button>
            <button onclick="AppMintGuard.logEvent('${item.event.id}',${item.ts},'missed')" style="flex:1;background:var(--red);color:#fff;border:0;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;">فاتني</button>
          </div></div>`
      });
    });

    (Store.get("tasks", []) || []).forEach(t => {
      if (t.done || !t.due || t.due > now) return;
      const key = `task_${t.id}`;
      if (!this.notifiedEvents[key]) {
        this.notifiedEvents[key] = now;
        Store.set("notifiedEvents", this.notifiedEvents);
        if (!hapticDone) { H.haptic([300,100,300,100,300]); hapticDone = true; }
        Voice.speak("تنبيه: حان موعد مهمة " + t.title);
        Notify.toast("⏰ حان موعد: " + t.title, 5000);
      }
      items.push({
        html: `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:8px;border-right:4px solid var(--blue);">
          <div style="font-weight:bold;">${H.escape(t.title)} (${H.timeStr(t.due)})</div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button onclick="AppMintGuard.logTask('${t.id}','done')" style="flex:1;background:var(--primary);color:#fff;border:0;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;">أنجزتها</button>
            <button onclick="AppMintGuard.logTask('${t.id}','missed')" style="flex:1;background:var(--red);color:#fff;border:0;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;">تأخرت</button>
          </div></div>`
      });
    });

    if (items.length) this.render(items);
    else this.close();
  },

  render(items) {
    this.ensureHost();
    this.host.querySelector("#guardTitle").textContent = `⚠️ ${items.length} تنبيه يحتاج تأكيد`;
    this.host.querySelector("#guardBody").innerHTML = items.map(i => i.html).join("");
    this.host.classList.remove("hidden");
  },

  close() {
    if (this.host) this.host.classList.add("hidden");
  },

  logEvent(id, ts, status) {
    Scheduler.logOccurrence(id, ts, status);
    delete this.notifiedEvents[`ev_${id}_${ts}`];
    Store.set("notifiedEvents", this.notifiedEvents);
    Notifications.cancelRepeat(`ev_${id}_${ts}`);
    this.checkPending();
    if (typeof UI !== "undefined" && UI.currentScreen) UI.renderScreen(UI.currentScreen);
  },

  logTask(id, status) {
    const tasks = Store.get("tasks", []) || [];
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (status === "done") {
      task.done = true;
      task.doneAt = Date.now();
      try { Journal.add({ type: "task", meta: { title: task.title } }); } catch(e){}
      Notify.toast("أُنجزت المهمة ✓");
    } else {
      task.due = Date.now() + 86400000;
      task.rescheduled = (task.rescheduled || 0) + 1;
      Notify.toast("تم تأجيل المهمة للغد");
    }
    delete this.notifiedEvents[`task_${id}`];
    Store.set("tasks", tasks);
    Store.set("notifiedEvents", this.notifiedEvents);
    Notifications.cancelRepeat(`task_${id}`);
    this.checkPending();
    if (typeof UI !== "undefined" && UI.currentScreen) UI.renderScreen(UI.currentScreen);
  }
};