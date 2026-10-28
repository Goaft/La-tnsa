const UI = {
  currentScreen: "home",
  _modalType: null,
  _editingId: null,
  _journalFilter: "all",

  init() {
    document.querySelectorAll("#bottomNav button").forEach(btn => {
      btn.addEventListener("click", () => this.showScreen(btn.dataset.screen));
    });
    document.getElementById("btnSettings").addEventListener("click", () => this.showScreen("settings"));
    document.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", () => this.openAddModal(btn.dataset.add));
    });
    document.getElementById("btnForget").addEventListener("click", () => this.quickForget());
    document.getElementById("forgetInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.quickForget();
    });
    document.getElementById("modalCancel").addEventListener("click", () => this.closeModal());
    document.getElementById("modalSave").addEventListener("click", () => this.saveModal());
  },

  showScreen(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const el = document.getElementById("scr-" + name);
    if (el) el.classList.add("active");
    document.querySelectorAll("#bottomNav button").forEach(b => {
      b.classList.toggle("active", b.dataset.screen === name);
    });
    this.currentScreen = name;
    this.renderScreen(name);
  },

  renderScreen(name) {
    const map = {
      home: () => this.renderHome(),
      journal: () => this.renderJournal(),
      appointments: () => this.renderAppointments(),
      family: () => this.renderFamily(),
      forgotten: () => this.renderForgotten(),
      couple: () => this.renderCouple(),
      kids: () => this.renderKids(),
      parenting: () => this.renderParenting(),
      worship: () => this.renderWorship(),
      routine: () => this.renderRoutine(),
      mirror: () => this.renderMirror(),
      settings: () => this.renderSettings()
    };
    if (map[name]) map[name]();
    try { Pulse.refresh(); } catch(e){}
  },

  renderHome() {
    document.getElementById("nowTime").textContent = H.timeStr(Date.now());

    const season = Intelligence.getSeasonalPlan();
    const sBanner = document.getElementById("seasonalBanner");
    if (sBanner) {
      sBanner.classList.remove("hidden");
      sBanner.innerHTML = `<div class="tip-label">${H.escape(season.theme)}</div><div>${H.escape(season.tip)}</div>`;
    }

    const banner = document.getElementById("forgetBanner");
    const overdue = Engine.getOverdueTasks();
    const pendingMeds = Scheduler.getTodayEvents().filter(item =>
      item.ts <= Date.now() && item.time !== "طوال اليوم" && !item.event.history.some(h => h.at === item.ts));

    if (pendingMeds.length > 0) {
      banner.classList.remove("hidden");
      banner.innerHTML = `<div class="fb-title">💊 لديك ${pendingMeds.length} موعد ينتظر التأكيد</div>
        <div class="fb-body">اضغط هنا لمراجعة الأدوية (${H.escape(pendingMeds[0].event.title)}...)</div>`;
      banner.onclick = () => this.showScreen("appointments");
    } else if (overdue.length >= 1) {
      banner.classList.remove("hidden");
      banner.innerHTML = `<div class="fb-title">🔴 وضع النسيان: ${overdue.length} مهام متأخرة</div>
        <div class="fb-body">اضغط لإنجازها الآن، أو ستُعاد جدولتها تلقائيًا.</div>`;
      banner.onclick = () => {
        overdue.forEach(t => {
          const tasks = Store.get("tasks", []) || [];
          const item = tasks.find(x => x.id === t.id);
          if (item) { item.due = Date.now(); item.rescheduled = 0; }
          Store.set("tasks", tasks);
        });
        this.renderHome();
        Notify.toast("تم تقديم المهام المتأخرة");
      };
    } else {
      banner.classList.add("hidden");
    }

    const tipEl = document.getElementById("dailyTip");
    const best = Engine.getBestTip();
    tipEl.className = "tip-card";
    tipEl.innerHTML = `<div class="tip-label">💡 نصيحة الآن</div><div class="tip-text"></div><button class="speak-btn">🔊 اسمعها</button>`;
    tipEl.querySelector(".tip-text").textContent = best.text;
    tipEl.querySelector(".speak-btn").addEventListener("click", () => Voice.speak(best.text));

    const tasks = Engine.getNowTasks();
    const list = document.getElementById("liveTasks");
    list.innerHTML = "";
    if (!tasks.length) list.innerHTML = `<p class="hint">لا مهام عاجلة الآن. تنفّس. 🌿</p>`;
    else tasks.forEach(t => list.appendChild(this.taskCard(t)));

    const silent = Engine.getSilentChild();
    if (silent) {
      const div = document.createElement("div");
      div.className = "last-done bad";
      const daysText = silent.days === "never" ? "لم تسجل جلسة بعد" : `منذ ${silent.days} أيام`;
      div.innerHTML = `<div><div class="label">🫥 ${H.escape(silent.child.name)}</div><div class="status">${daysText} لم تجلس معه وحده</div></div><button>اجلس معه</button>`;
      div.querySelector("button").addEventListener("click", () => this.markOneOnOne(silent.child.id));
      list.appendChild(div);
    }

    const qc = document.getElementById("quickCards");
    qc.innerHTML = "";
    [
      { icon: "🫀", label: "أثر البيت", screen: "journal" },
      { icon: "💞", label: "الزوجان", screen: "couple" },
      { icon: "📚", label: "التربية", screen: "parenting" },
      { icon: "⏰", label: "الروتين", screen: "routine" }
    ].forEach(c => {
      const btn = document.createElement("button");
      btn.className = "quick-card";
      btn.innerHTML = `<span class="qc-icon">${c.icon}</span>${c.label}`;
      btn.addEventListener("click", () => this.showScreen(c.screen));
      qc.appendChild(btn);
    });
  },

  renderJournal() {
    const el = document.getElementById("journalContent");
    if (!el) return;
    const all = Journal.list();
    const kids = Store.get("kids", []) || [];
    const active = this._journalFilter || "all";

    const chips = [
      { id: "all", label: "الكل" },
      ...kids.map(k => ({ id: "kid_" + k.id, label: "👦 " + k.name })),
      { id: "couple", label: "💞 الزوجان" },
      { id: "task", label: "✅ المهام" }
    ];

    el.innerHTML = `
      <div class="pulse-card">
        <div class="pulse-emoji">${Pulse.emoji()}</div>
        <div style="flex:1;">
          <div class="pulse-title">${H.escape(Pulse.label())}</div>
          <div class="pulse-hint">${H.escape(Pulse.suggestion())}</div>
        </div>
        <button id="btnFingerprint" class="btn-primary" style="padding:10px 12px;font-size:13px;flex-shrink:0;">بصمة الأسبوع</button>
      </div>
      <div class="journal-filters">
        ${chips.map(c => `<button class="jf-chip${active === c.id ? ' active' : ''}" data-f="${c.id}">${H.escape(c.label)}</button>`).join("")}
      </div>
      <div id="journalStream"></div>`;

    el.querySelectorAll(".jf-chip").forEach(b => {
      b.addEventListener("click", () => { this._journalFilter = b.dataset.f; this.renderJournal(); });
    });
    el.querySelector("#btnFingerprint").addEventListener("click", () => Fingerprint.show());

    let items = all;
    if (active.startsWith("kid_")) {
      const kidId = active.slice(4);
      items = items.filter(x => x.personId === kidId);
    } else if (active === "couple") items = items.filter(x => x.type === "couple");
    else if (active === "task")  items = items.filter(x => x.type === "task");

    const stream = el.querySelector("#journalStream");
    if (!items.length) {
      stream.innerHTML = `<p class="hint" style="text-align:center;padding:40px 20px;">لا أثر بعد. أضف لحظتك الأولى ✨</p>`;
      return;
    }

    const icons = { session: "🕐", couple: "💞", kid_point: "⭐", task: "✅", med: "💊" };
    const labels = { session: "جلسة فردية", couple: "لحظة زوجية", kid_point: "نقطة طفل", task: "مهمة", med: "دواء" };

    items.slice(0, 100).forEach(item => {
      const card = document.createElement("div");
      card.className = "athar-card";
      const person = item.personId ? kids.find(k => k.id === item.personId) : null;
      const subject = person ? person.name : (labels[item.type] || "لحظة");

      card.innerHTML = `
        <div class="ac-icon">${icons[item.type] || "✨"}</div>
        <div class="ac-body">
          <div class="ac-head">
            <span class="ac-subject">${H.escape(subject)}</span>
            <span class="ac-time">${H.ago(item.ts)}</span>
          </div>
          ${item.text
            ? `<div class="ac-memory">"${H.escape(item.text)}"</div>`
            : (item.type === "session" || item.type === "couple")
              ? `<button class="ac-add-moment" data-id="${item.id}">+ أضف لحظة</button>`
              : ""}
          ${item.meta && item.meta.title ? `<div class="ac-meta">${H.escape(item.meta.title)}</div>` : ""}
        </div>`;
      const btn = card.querySelector(".ac-add-moment");
      if (btn) btn.addEventListener("click", () => Moment.openInput(item.id));
      stream.appendChild(card);
    });
  },

  renderAppointments() {
    const list = document.getElementById("appointmentsList");
    if (!list) return;
    list.innerHTML = "";
    const events = Store.get("events", []) || [];
    if (!events.length) {
      list.innerHTML = `<p class="hint">لا توجد مواعيد. أضف دواءً أو عيد ميلاد لتبدأ.</p>`;
      return;
    }
    events.slice().sort((a,b) => a.start - b.start).forEach(e => {
      const div = document.createElement("div");
      const typeClass = e.type === "medication" ? "meds" : e.type;
      div.className = `appointment-item ${typeClass}`;
      let timeStr = "موعد واحد";
      if (e.recurrence.freq === "daily") timeStr = "يومياً: " + e.recurrence.times.join(" - ");
      if (e.recurrence.freq === "yearly") timeStr = "سنوياً: " + H.dateStr(e.start);
      const icon = e.type === "medication" ? "💊" : e.type === "birthday" ? "🎂" : "💍";
      div.innerHTML = `
        <div class="appointment-info">
          <h4>${icon} ${H.escape(e.title)}</h4>
          <p>${H.escape(timeStr)}</p>
        </div>
        <div class="appointment-actions"><button data-del="${e.id}">🗑️</button></div>`;
      div.querySelector("[data-del]").addEventListener("click", () => this.deleteEvent(e.id));
      list.appendChild(div);
    });
  },

  openAddAppointment(type) {
    if (type === "medication") {
      Dialog.prompt({ title: "💊 دواء جديد", label: "اسم الدواء", placeholder: "مثال: مضاد حيوي" }, (name) => {
        Dialog.prompt({ title: "⏰ أوقات الجرعات", label: "الأوقات مفصولة بفاصلة (مثال: 08:00, 14:00)", value: "08:00, 20:00" }, (timesStr) => {
          const times = timesStr.split(",").map(t => t.trim()).filter(t => t.includes(":"));
          if (!times.length) return Notify.toast("صيغة الوقت خاطئة");
          const events = Store.get("events", []) || [];
          events.push(EventModel.create("medication", { title: name, start: Date.now(), freq: "daily", times }));
          Store.set("events", events);
          Notify.toast("أُضيف الدواء ✓");
          Notifications.syncAll();
          if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
          this.renderAppointments();
        });
      });
    } else if (type === "birthday" || type === "anniversary") {
      const titleStr = type === "birthday" ? "🎂 اسم صاحب العيد" : "💍 ذكرى الزواج";
      Dialog.prompt({ title: titleStr, label: "الاسم / العنوان", placeholder: "مثال: يوسف" }, (name) => {
        Dialog.prompt({ title: "📅 التاريخ", label: "السنة-الشهر-اليوم", type: "date" }, (dateStr) => {
          const ts = new Date(dateStr).getTime();
          if (isNaN(ts)) return Notify.toast("تاريخ غير صالح");
          const events = Store.get("events", []) || [];
          events.push(EventModel.create(type, { title: name, start: ts, freq: "yearly" }));
          Store.set("events", events);
          Notify.toast("أُضيف الموعد ✓");
          Notifications.syncAll();
          if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
          this.renderAppointments();
        });
      });
    }
  },

  deleteEvent(id) {
    Dialog.confirm("هل تريد حذف هذا الموعد نهائياً؟", () => {
      Store.set("events", (Store.get("events", []) || []).filter(e => e.id !== id));
      Notify.toast("حُذف");
      if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
      this.renderAppointments();
    });
  },

  renderFamily() {
    const el = document.getElementById("familyWheel");
    if (!el) return;
    const kids = Store.get("kids", []) || [];
    const couple = Store.get("couple", {}) || {};
    el.innerHTML = `<div class="last-done ${Intelligence.getPersonHealth({ lastContact: couple['c3'], expectedDays: 3 })}"><div><div class="label">💞 الزوجة</div><div class="status">آخر جلسة: ${H.ago(couple['c3'])}</div></div></div>`;
    kids.forEach(k => {
      const st = Intelligence.getPersonHealth({ lastContact: k.lastOneOnOne, expectedDays: 3 });
      const div = document.createElement("div");
      div.className = "last-done " + st;
      div.innerHTML = `<div><div class="label">👦 ${H.escape(k.name)}</div><div class="status">آخر جلسة: ${H.ago(k.lastOneOnOne)}</div></div><button>اجلس معه</button>`;
      div.querySelector("button").addEventListener("click", () => this.markOneOnOne(k.id));
      el.appendChild(div);
    });
  },

  taskCard(t) {
    const div = document.createElement("div");
    div.className = "task-card" + (t.done ? " done" : "");
    if (t.priority >= 4) div.classList.add("priority-high");
    else if (t.priority >= 2) div.classList.add("priority-med");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "task-check";
    check.checked = !!t.done;
    const body = document.createElement("div");
    body.className = "task-body";
    body.innerHTML = `<div class="task-title"></div><div class="task-meta"></div>`;
    body.querySelector(".task-title").textContent = t.title;
    body.querySelector(".task-meta").textContent = (t.category || "") + (t.due ? " • " + H.dateStr(t.due) : "");
    const actions = document.createElement("div");
    actions.className = "task-actions";
    const editBtn = document.createElement("button"); editBtn.textContent = "✏️";
    const delBtn = document.createElement("button"); delBtn.textContent = "🗑️";
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    div.appendChild(check);
    div.appendChild(body);
    div.appendChild(actions);
    check.addEventListener("change", (e) => {
      const tasks = Store.get("tasks", []) || [];
      const item = tasks.find(x => x.id === t.id);
      if (item) {
        item.done = e.target.checked;
        item.doneAt = e.target.checked ? Date.now() : null;
        Store.set("tasks", tasks);
        if (e.target.checked) {
          H.haptic();
          try { Journal.add({ type: "task", meta: { title: item.title } }); } catch(err){}
          Notify.toast("أُنجزت ✓");
        }
        Notifications.syncAll();
        if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
        this.renderScreen(this.currentScreen);
      }
    });
    editBtn.addEventListener("click", () => this.openEditTask(t));
    delBtn.addEventListener("click", () => this.deleteTask(t.id));
    return div;
  },

  deleteTask(id) {
    Dialog.confirm("حذف هذه المهمة؟", () => {
      Store.set("tasks", (Store.get("tasks", []) || []).filter(t => t.id !== id));
      Notify.toast("حُذفت");
      Notifications.syncAll();
      if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
      this.renderScreen(this.currentScreen);
    });
  },

  renderForgotten() {
    const list = document.getElementById("forgottenList");
    const items = Store.get("forgotten", []) || [];
    list.innerHTML = "";
    if (!items.length) { list.innerHTML = `<p class="hint">لا شيء هنا بعد.</p>`; return; }
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "task-card";
      const body = document.createElement("div");
      body.className = "task-body";
      body.innerHTML = `<div class="task-title"></div><div class="task-meta"></div>`;
      body.querySelector(".task-title").textContent = item.text;
      body.querySelector(".task-meta").textContent = H.ago(item.ts);
      const actions = document.createElement("div");
      actions.className = "task-actions";
      const toTask = document.createElement("button"); toTask.textContent = "📋";
      const del = document.createElement("button"); del.textContent = "🗑️";
      actions.appendChild(toTask);
      actions.appendChild(del);
      div.appendChild(body);
      div.appendChild(actions);
      toTask.addEventListener("click", () => this.openAddModal("task", { title: item.text }));
      del.addEventListener("click", () => {
        Store.set("forgotten", (Store.get("forgotten", []) || []).filter(x => x.id !== item.id));
        this.renderForgotten();
      });
      list.appendChild(div);
    });
  },

  quickForget() {
    const input = document.getElementById("forgetInput");
    const text = input.value.trim();
    if (!text) return;
    const arr = Store.get("forgotten", []) || [];
    arr.unshift({ id: H.uid(), text, ts: Date.now() });
    Store.set("forgotten", arr);
    input.value = "";
    Notify.toast("حُفظ في المنسي");
    this.renderForgotten();
  },

  renderCouple() {
    const list = document.getElementById("coupleList");
    list.innerHTML = "";
    const coupleData = Store.get("couple", {}) || {};
    const savor = document.createElement("div");
    savor.className = "tip-card";
    savor.innerHTML = `<div class="tip-label">💞 تلذذ مشترك</div><div>${H.escape(Engine.getSavoringPrompt())}</div>`;
    list.appendChild(savor);

    DATA.couplePrompts.forEach(p => {
      const st = H.statusColor(coupleData[p.id], 1, 7);
      const div = document.createElement("div");
      div.className = "last-done " + st;
      div.innerHTML = `<div><div class="label"></div><div class="status"></div></div><button>تم الآن</button>`;
      div.querySelector(".label").textContent = p.label;
      div.querySelector(".status").textContent = H.ago(coupleData[p.id]);
      div.querySelector("button").addEventListener("click", () => {
        const c = Store.get("couple", {}) || {};
        c[p.id] = Date.now();
        Store.set("couple", c);
        H.haptic();
        const entry = Journal.add({ type: "couple", meta: { promptId: p.id, label: p.label } });
        Moment.offer(entry.id, "ما الذي أعجبك في هذه اللحظة؟ ✍️");
        Notify.toast("سُجّل ✓");
        this.renderCouple();
      });
      list.appendChild(div);
    });

    const mirrorBtn = document.createElement("button");
    mirrorBtn.className = "btn-add";
    mirrorBtn.textContent = "📖 افتح المرآة الأسبوعية";
    mirrorBtn.addEventListener("click", () => this.showScreen("mirror"));
    list.appendChild(mirrorBtn);
  },

  renderKids() {
    const list = document.getElementById("kidsList");
    const kids = Store.get("kids", []) || [];
    list.innerHTML = "";
    if (!kids.length) { list.innerHTML = `<p class="hint">أضف أول طفل لتبدأ المتابعة.</p>`; return; }
    kids.forEach(k => list.appendChild(this.kidCard(k)));
  },

  kidCard(k) {
    const div = document.createElement("div");
    div.className = "kid-card";
    const days = H.daysSince(k.lastOneOnOne);
    const st = days <= 1 ? "ok" : days <= 5 ? "warn" : "bad";
    const totalPoints = k.totalPoints || 0;
    const head = document.createElement("div");
    head.className = "kc-head";
    head.innerHTML = `<div><div class="kc-name"></div><div class="kc-age"></div></div><div class="kc-points">⭐ ${totalPoints}</div>`;
    head.querySelector(".kc-name").textContent = k.name;
    head.querySelector(".kc-age").textContent = k.age ? k.age + " سنة" : "";
    div.appendChild(head);
    const status = document.createElement("div");
    status.className = "kc-status " + st;
    status.textContent = "آخر جلسة: " + H.ago(k.lastOneOnOne);
    div.appendChild(status);
    const tasksDiv = document.createElement("div");
    tasksDiv.className = "kc-tasks";
    if (k.tasks && k.tasks.length) {
      k.tasks.forEach(task => {
        const row = document.createElement("div");
        row.className = "kc-task";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!task.done;
        const label = document.createElement("span");
        label.textContent = `${task.title} (+${task.points})`;
        if (task.done) label.style.textDecoration = "line-through";
        label.style.flex = "1";
        const delBtn = document.createElement("button");
        delBtn.textContent = "✖";
        delBtn.style.background = "none";
        delBtn.style.border = "none";
        delBtn.style.color = "var(--muted)";
        delBtn.style.fontSize = "14px";
        cb.addEventListener("change", () => this.toggleKidTask(k.id, task.id, cb.checked));
        delBtn.addEventListener("click", () => this.deleteKidTask(k.id, task.id));
        row.appendChild(cb);
        row.appendChild(label);
        row.appendChild(delBtn);
        tasksDiv.appendChild(row);
      });
    } else {
      tasksDiv.innerHTML = `<p class="hint">لا مهام بعد.</p>`;
    }
    div.appendChild(tasksDiv);

    const rewards = Store.get("rewards") ?? DATA.defaultRewards;
    const rewardsDiv = document.createElement("div");
    rewardsDiv.className = "kc-rewards";
    rewards.forEach(r => {
      const btn = document.createElement("button");
      btn.className = "kc-reward";
      btn.textContent = `${r.name} (${r.cost}⭐)`;
      btn.addEventListener("click", () => this.redeemReward(k.id, r));
      rewardsDiv.appendChild(btn);
    });
    div.appendChild(rewardsDiv);

    const actions = document.createElement("div");
    actions.className = "kc-actions";
    const btnSession = document.createElement("button"); btnSession.textContent = "🕐 جلسة";
    btnSession.addEventListener("click", () => this.markOneOnOne(k.id));
    const btnAddTask = document.createElement("button"); btnAddTask.textContent = "＋ مهمة";
    btnAddTask.addEventListener("click", () => this.openKidTaskModal(k.id));
    const btnDel = document.createElement("button"); btnDel.textContent = "🗑️ حذف";
    btnDel.addEventListener("click", () => this.deleteKid(k.id));
    actions.appendChild(btnSession);
    actions.appendChild(btnAddTask);
    actions.appendChild(btnDel);
    div.appendChild(actions);
    return div;
  },

  toggleKidTask(kidId, taskId, done) {
    const kids = Store.get("kids", []) || [];
    const kid = kids.find(x => x.id === kidId);
    if (!kid || !kid.tasks) return;
    const task = kid.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.done = done;
    if (done) kid.totalPoints = (kid.totalPoints || 0) + (task.points || 1);
    else kid.totalPoints = Math.max(0, (kid.totalPoints || 0) - (task.points || 1));
    Store.set("kids", kids);
    if (done) {
      H.haptic();
      try { Journal.add({ type: "kid_point", personId: kidId, meta: { title: task.title, points: task.points } }); } catch(e){}
      Notify.toast(`+${task.points} ⭐`);
    }
    this.renderScreen(this.currentScreen);
  },

  deleteKidTask(kidId, taskId) {
    Dialog.confirm("حذف هذه المهمة؟", () => {
      const kids = Store.get("kids", []) || [];
      const kid = kids.find(x => x.id === kidId);
      if (kid && kid.tasks) {
        kid.tasks = kid.tasks.filter(t => t.id !== taskId);
        Store.set("kids", kids);
        this.renderKids();
      }
    });
  },

  redeemReward(kidId, reward) {
    const kids = Store.get("kids", []) || [];
    const kid = kids.find(x => x.id === kidId);
    if (!kid) return;
    if ((kid.totalPoints || 0) < reward.cost) { Notify.toast("نقاط غير كافية"); return; }
    Dialog.confirm(`استبدال "${reward.name}" بـ ${reward.cost} نقطة؟`, () => {
      kid.totalPoints -= reward.cost;
      Store.set("kids", kids);
      H.haptic([100,50,100]);
      Notify.toast("🎉 مبروك!");
      this.renderKids();
    });
  },

  markOneOnOne(kidId) {
    const kids = Store.get("kids", []) || [];
    const item = kids.find(x => x.id === kidId);
    if (item) {
      item.lastOneOnOne = Date.now();
      Store.set("kids", kids);
      H.haptic();
      const entry = Journal.add({ type: "session", personId: kidId });
      Moment.offer(entry.id);
      Notify.toast("سُجّلت الجلسة ✓");
      this.renderScreen(this.currentScreen);
    }
  },

  deleteKid(kidId) {
    Dialog.confirm("حذف هذا الطفل وكل بياناته؟", () => {
      Store.set("kids", (Store.get("kids", []) || []).filter(k => k.id !== kidId));
      this.renderKids();
    });
  },

  openKidTaskModal(kidId) {
    const kids = Store.get("kids", []) || [];
    const kid = kids.find(x => x.id === kidId);
    if (!kid) return;
    Dialog.prompt({ title: `مهمة جديدة لـ ${kid.name}`, label: "اسم المهمة", placeholder: "مثال: رتب ألعابه" }, (title) => {
      Dialog.prompt({ title: "النقاط", label: "كم نقطة لهذه المهمة؟", value: "1", type: "number" }, (pointsStr) => {
        const points = parseInt(pointsStr) || 1;
        kid.tasks = kid.tasks || [];
        kid.tasks.push({ id: H.uid(), title, points, done: false });
        Store.set("kids", kids);
        this.renderKids();
      });
    });
  },

  renderParenting() {
    const el = document.getElementById("parentingContent");
    el.innerHTML = "";

    const pk = document.createElement("div");
    pk.className = "parenting-card";
    pk.innerHTML = `<h3>🧭 ${H.escape(DATA.peluKasih.title)}</h3>` +
      DATA.peluKasih.steps.map(s =>
        `<div style="margin:12px 0;padding:12px;background:var(--bg);border-radius:10px;">
          <b>${H.escape(s.label)}</b>
          <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">${H.escape(s.tip)}</p>
        </div>`).join("");
    el.appendChild(pk);

    DATA.parenting.byAge.forEach(sec => {
      const card = document.createElement("div");
      card.className = "parenting-card";
      card.innerHTML = `<h3>${H.escape(sec.range)} — ${H.escape(sec.title)}</h3>` +
        sec.tips.map(t => `
          <div style="margin:12px 0;padding:12px;background:var(--bg);border-radius:10px;">
            <b>${H.escape(t.title)}</b>
            <p style="margin:6px 0 0;font-size:14px;color:var(--muted);line-height:1.7;">${H.escape(t.example)}</p>
          </div>`).join("");
      el.appendChild(card);
    });

    const sitCard = document.createElement("div");
    sitCard.className = "parenting-card";
    sitCard.innerHTML = `<h3>🎯 حسب الموقف</h3>` +
      DATA.parenting.bySituation.map(s =>
        `<details style="margin:10px 0;padding:10px;background:var(--bg);border-radius:10px;">
          <summary style="cursor:pointer;font-weight:800;color:var(--primary);">${H.escape(s.situation)}</summary>
          ${s.tips.map(t => `<div style="padding:10px 8px;font-size:14px;"><b>${H.escape(t.title)}</b><br><span style="color:var(--muted);">${H.escape(t.example)}</span></div>`).join("")}
        </details>`).join("");
    el.appendChild(sitCard);

    const propCard = document.createElement("div");
    propCard.className = "parenting-card";
    propCard.innerHTML = `<h3>🕌 من السيرة</h3>` +
      DATA.parenting.prophetic.map(p => `
        <div style="margin:12px 0;padding:12px;background:var(--bg);border-radius:10px;">
          <b>${H.escape(p.title)}</b>
          <p style="font-size:14px;margin:6px 0;">${H.escape(p.text)}</p>
          <p style="font-size:13px;color:var(--muted);margin:0;"><i>${H.escape(p.example)}</i></p>
        </div>`).join("");
    el.appendChild(propCard);

    const qaCard = document.createElement("div");
    qaCard.className = "parenting-card";
    qaCard.innerHTML = `<h3>🌱 علّم أطفالك (عقيدة مبسطة)</h3>` +
      DATA.kidsQA.map(q => `
        <details style="margin:8px 0;padding:10px;background:var(--bg);border-radius:10px;">
          <summary style="cursor:pointer;font-weight:800;color:var(--primary);">${H.escape(q.q)}</summary>
          <p style="margin:8px 0 0;font-size:14px;color:var(--muted);">${H.escape(q.a)}</p>
        </details>`).join("");
    el.appendChild(qaCard);
  },

  renderWorship() {
    const ps = document.getElementById("prayerSection");
    ps.innerHTML = "<h3>🕌 مواقيت الصلاة</h3>";
    const times = Store.get("prayerTimes", {}) || {};
    ["الفجر","الظهر","العصر","المغرب","العشاء"].forEach(name => {
      const div = document.createElement("div");
      div.className = "last-done ok";
      div.innerHTML = `<div><div class="label"></div><div class="status"></div></div><button>تعديل</button>`;
      div.querySelector(".label").textContent = name;
      div.querySelector(".status").textContent = times[name] || "لم يُضبط";
      div.querySelector("button").addEventListener("click", () => {
        Dialog.prompt({ title: `وقت صلاة ${name}`, label: "الوقت (مثال: 05:30)", value: times[name] || "" }, (val) => {
          if (val) {
            const cur = Store.get("prayerTimes", {}) || {};
            cur[name] = val.trim();
            Store.set("prayerTimes", cur);
            this.renderWorship();
          }
        });
      });
      ps.appendChild(div);
    });

    const as = document.getElementById("adhkarSection");
    as.innerHTML = "<h3>📿 أذكار الصباح</h3>";
    DATA.adhkar.morning.forEach(z => {
      const div = document.createElement("div");
      div.className = "task-card";
      div.innerHTML = `<div class="task-body"><div class="task-title"></div><div class="task-meta"></div></div><button class="speak-btn">🔊</button>`;
      div.querySelector(".task-title").textContent = z.text;
      div.querySelector(".task-meta").textContent = `${z.count} مرة`;
      div.querySelector(".speak-btn").addEventListener("click", () => Voice.speak(z.text));
      as.appendChild(div);
    });
  },

  renderRoutine() {
    const el = document.getElementById("routineContent");
    let routine = Store.get("routine", null);
    if (!routine) {
      routine = DATA.defaultRoutine.map(r => ({ id: H.uid(), ...r, done: false }));
      Store.set("routine", routine);
    }
    el.innerHTML = "";
    const nowHHMM = String(new Date().getHours()).padStart(2,'0') + ":" + String(new Date().getMinutes()).padStart(2,'0');
    let currentMarked = false;
    routine.forEach(slot => {
      const isCurrent = !currentMarked && slot.time <= nowHHMM;
      if (isCurrent) currentMarked = true;
      const div = document.createElement("div");
      div.className = "routine-slot" + (isCurrent ? " current" : "");
      div.innerHTML = `<div class="rs-time"></div><div class="rs-activity"></div><div class="rs-actions"><button class="edit">✏️</button><button class="del">🗑️</button></div>`;
      div.querySelector(".rs-time").textContent = slot.time;
      div.querySelector(".rs-activity").textContent = slot.activity;
      div.querySelector(".edit").addEventListener("click", () => this.editRoutineSlot(slot.id));
      div.querySelector(".del").addEventListener("click", () => {
        Dialog.confirm("حذف هذه الفترة؟", () => {
          Store.set("routine", routine.filter(s => s.id !== slot.id));
          this.renderRoutine();
        });
      });
      el.appendChild(div);
    });
  },

  editRoutineSlot(id) {
    const routine = Store.get("routine", []) || [];
    const slot = routine.find(s => s.id === id);
    if (!slot) return;
    Dialog.prompt({ title: "تعديل الفترة", label: "الوقت (HH:MM)", value: slot.time }, (time) => {
      Dialog.prompt({ title: "تعديل الفترة", label: "النشاط", value: slot.activity }, (activity) => {
        slot.time = time.trim();
        slot.activity = activity.trim();
        Store.set("routine", routine);
        this.renderRoutine();
      });
    });
  },

  renderMirror() {
    const el = document.getElementById("mirrorContent");
    el.innerHTML = `<div class="tip-card"><div class="tip-label">📖 جلسة الجمعة</div><p>اجلسا معًا 15 دقيقة. اسألا:</p><ul id="mirrorQs"></ul></div><button class="btn-primary" id="startMirror">ابدأ الجلسة</button>`;
    const ul = el.querySelector("#mirrorQs");
    DATA.mirrorQuestions.forEach(q => { const li = document.createElement("li"); li.textContent = q; ul.appendChild(li); });
    el.querySelector("#startMirror").addEventListener("click", () => {
      Notify.toast("بدأت الجلسة — 15 دقيقة");
      Voice.speak("بدأت جلسة المرآة الأسبوعية. اجلسا معًا وتحدثا بهدوء.");
    });
  },

  renderSettings() {
    const el = document.getElementById("settingsContent");
    el.innerHTML = `
      <div class="settings-section">
        <h3>🔔 التنبيهات</h3>
        <div id="notifSettings"></div>
      </div>
      <div class="settings-section">
        <h3>🎯 الموسم</h3>
        <select id="seasonSelect" class="notif-select" style="width:100%;padding:12px;">
          <option value="">تلقائي (رمضان/الجمعة)</option>
          <option value="ramadan">🌙 رمضان</option>
          <option value="exams">📝 فترة الامتحانات</option>
          <option value="schoolStart">🎒 بداية الدراسة</option>
          <option value="friday">🕌 الجمعة (دائمًا)</option>
        </select>
      </div>
      <div class="last-done ok"><div class="label">🔊 الصوت</div><button id="setVoice">جرّب</button></div>
      <div class="last-done ok"><div class="label">💾 نسخ احتياطي</div><button id="setExport">تصدير</button></div>
      <div class="last-done ok"><div class="label">📥 استيراد</div><button id="setImport">استيراد</button></div>
      <div class="last-done bad"><div class="label">🗑️ حذف كل البيانات</div><button id="setWipe">حذف</button></div>
      <input type="file" id="importFile" hidden accept=".json">
      <p class="hint" style="margin-top:24px;padding:12px;background:var(--bg);border-radius:10px;font-size:12px;">
        💡 لضمان وصول الإشعارات في كل الأوقات، افتح التطبيق مرة واحدة يوميًا على الأقل. متصفحات الهواتف لا تسمح لمواقع الويب بجدولة إشعارات أثناء إغلاق التطبيق تمامًا — هذا قيد المتصفح، وليس التطبيق.
      </p>`;
    this.renderNotifSettings();
    document.getElementById("setVoice").addEventListener("click", () => Voice.test());
    document.getElementById("setExport").addEventListener("click", () => this.exportData());
    document.getElementById("setImport").addEventListener("click", () => document.getElementById("importFile").click());
    document.getElementById("importFile").addEventListener("change", (e) => this.importData(e));
    document.getElementById("setWipe").addEventListener("click", () => {
      Dialog.confirm("سيُحذف كل شيء! متأكد؟", () => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith(NS)) localStorage.removeItem(k); });
        Notify.toast("حُذف كل شيء");
        this.showScreen("home");
      });
    });

    const seasonSel = document.getElementById("seasonSelect");
    seasonSel.value = Store.get("season", "") || "";
    seasonSel.addEventListener("change", () => {
      if (seasonSel.value) Store.set("season", seasonSel.value);
      else Store.remove("season");
      Notify.toast("حُفظ");
      this.renderHome();
    });
  },

  renderNotifSettings() {
  const el = document.getElementById("notifSettings");
  if (!el) return;
  
  // الكشف الذكي: هل نحن داخل تطبيق أندرويد أم متصفح؟
  const isNative = typeof Capacitor !== "undefined" && Capacitor.isNativePlatform();
  let html = "";

  if (isNative) {
    // داخل التطبيق الأصلي: الإشعارات مدعومة دائماً ولن تظهر رسالة الخطأ
    html += `<div style="text-align:center;color:var(--primary);font-weight:800;padding:10px 0;">✓ التطبيق جاهز للإشعارات</div>
             <p style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:12px;">تأكد من السماح بالإشعارات عند فتح التطبيق.</p>`;
  } else {
    // داخل المتصفح: نتحقق من إذن المتصفح
    const perm = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
    if (perm === "denied") {
      html += `<div class="notif-warn">⚠️ الإشعارات مرفوضة من المتصفح.</div>`;
    } else if (perm !== "granted") {
      html += `<button class="btn-primary" id="btnReqPerm" style="width:100%;margin-bottom:12px;">تفعيل الإشعارات</button>`;
    } else {
      html += `<div style="text-align:center;color:var(--primary);font-weight:800;padding:10px 0;">✓ الإشعارات مفعّلة</div>`;
    }
  }

  Object.entries(Notifications.categories).forEach(([key, cat]) => {
    const lvl = Notifications.categoryLevel(key);
    html += `
      <div class="notif-row">
        <div class="notif-label">${H.escape(cat.label)}</div>
        <select data-cat="${H.escape(key)}" class="notif-select">
          <option value="quiet"  ${lvl==="quiet"?"selected":""}>🟢 هادئ</option>
          <option value="normal" ${lvl==="normal"?"selected":""}>🟡 عادي</option>
          <option value="strict" ${lvl==="strict"?"selected":""}>🔴 صارم</option>
        </select>
      </div>`;
  });

  el.innerHTML = html;
  el.querySelector("#btnReqPerm")?.addEventListener("click", async () => {
    if (await Notifications.requestPermission()) this.renderNotifSettings();
  });
  el.querySelectorAll(".notif-select").forEach(sel => {
    sel.addEventListener("change", () => {
      const s = Store.get("notifLevels", {}) || {};
      s[sel.dataset.cat] = sel.value;
      Store.set("notifLevels", s);
      if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
      Notifications.syncAll();
      Notify.toast("حُفظ");
    });
  });
},

  exportData() {
    const data = {};
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(NS)) { try { data[k] = JSON.parse(localStorage.getItem(k)); } catch(e){} }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "no-tansa-backup-" + new Date().toISOString().slice(0,10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
    Notify.toast("تم التصدير");
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.keys(data).forEach(k => {
          if (k.startsWith(NS)) Store.set(k.slice(NS.length), data[k]);
        });
        Notify.toast("استُعيدت البيانات ✓");
        this.renderScreen(this.currentScreen);
      } catch (err) { Notify.toast("ملف غير صالح"); }
    };
    reader.readAsText(file);
  },

  openAddModal(type, prefill = {}, editId = null) {
    this._modalType = type;
    this._editingId = editId;
    const titles = { task: "مهمة", child: "طفل", routine: "فترة روتين" };
    document.getElementById("modalTitle").textContent = (editId ? "تعديل " : "إضافة ") + (titles[type] || "");
    let fields = "";

    if (type === "task") {
      fields = `
        <label>المهمة</label>
        <input id="mTitle" placeholder="ماذا تريد أن تتذكر؟">
        <div id="mTemplates" class="template-chips"></div>
        <label>الفئة (اختياري)</label>
        <input id="mCategory" placeholder="مثل: بيت، عبادة">
        <label>الأولوية</label>
        <select id="mPriority">
          <option value="1">عادية</option>
          <option value="3">مهمة</option>
          <option value="5">عاجلة</option>
        </select>
        <label>الموعد (اختياري)</label>
        <input id="mDue" type="datetime-local">
        <label>درجة التنبيه</label>
        <select id="mLevel">
          <option value="">افتراضي الفئة</option>
          <option value="quiet">🟢 هادئ (بدون إشعار)</option>
          <option value="normal">🟡 عادي</option>
          <option value="strict">🔴 صارم (لن يختفي حتى تؤكد)</option>
        </select>`;
    } else if (type === "child") {
      fields = `<label>اسم الطفل</label><input id="mTitle" placeholder="الاسم"><label>العمر</label><input id="mAge" type="number" min="0" max="18" placeholder="سنة">`;
    } else if (type === "routine") {
      fields = `<label>الوقت (HH:MM)</label><input id="mTime" type="time"><label>النشاط</label><input id="mActivity" placeholder="مثل: الفطور">`;
    }

    document.getElementById("modalFields").innerHTML = fields;

    if (type === "task") {
      document.getElementById("mTitle").value = prefill.title || "";
      document.getElementById("mCategory").value = prefill.category || "";
      document.getElementById("mPriority").value = prefill.priority || 1;
      document.getElementById("mLevel").value = prefill.level || "";
      if (prefill.due) {
        const d = new Date(prefill.due);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        document.getElementById("mDue").value = local.toISOString().slice(0,16);
      }
      const tmpl = document.getElementById("mTemplates");
      if (tmpl && !editId) {
        DATA.templates.forEach(t => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "template-chip";
          chip.textContent = t.title;
          chip.addEventListener("click", () => {
            document.getElementById("mTitle").value = t.title;
            document.getElementById("mCategory").value = t.category;
          });
          tmpl.appendChild(chip);
        });
      }
    }
    if (type === "routine" && prefill) {
      document.getElementById("mTime").value = prefill.time || "08:00";
      document.getElementById("mActivity").value = prefill.activity || "";
    }

    document.getElementById("modal").classList.remove("hidden");
    setTimeout(() => document.getElementById("mTitle")?.focus(), 100);
  },

  openEditTask(t) { this.openAddModal("task", t, t.id); },
  closeModal() { document.getElementById("modal").classList.add("hidden"); this._editingId = null; this._modalType = null; },

  saveModal() {
    const type = this._modalType;
    if (type === "task") {
      const title = document.getElementById("mTitle").value.trim();
      if (!title) { Notify.toast("اكتب المهمة أولًا"); return; }
      const tasks = Store.get("tasks", []) || [];
      const priority = parseInt(document.getElementById("mPriority").value || 1);
      const category = document.getElementById("mCategory").value.trim();
      const dueVal = document.getElementById("mDue").value;
      const due = dueVal ? new Date(dueVal).getTime() : null;
      const level = document.getElementById("mLevel").value || undefined;
      if (this._editingId) {
        const item = tasks.find(x => x.id === this._editingId);
        if (item) { item.title = title; item.priority = priority; item.category = category; item.due = due; item.level = level; }
      } else {
        tasks.push({ id: H.uid(), title, priority, category, due, level, done: false, createdAt: Date.now() });
      }
      Store.set("tasks", tasks);
      Notify.toast("حُفظت ✓");
      Notifications.syncAll();
      if (typeof NativeBridge !== "undefined") NativeBridge.syncFromStorage();
    }
    if (type === "child") {
      const name = document.getElementById("mTitle").value.trim();
      if (!name) { Notify.toast("اكتب الاسم"); return; }
      const age = parseInt(document.getElementById("mAge").value || 0);
      const kids = Store.get("kids", []) || [];
      kids.push({ id: H.uid(), name, age, lastOneOnOne: null, totalPoints: 0, tasks: Engine.getKidDefaultTasks(age) });
      Store.set("kids", kids);
      Notify.toast("أُضيف ✓");
    }
    if (type === "routine") {
      const time = document.getElementById("mTime").value;
      const activity = document.getElementById("mActivity").value.trim();
      if (!time || !activity) { Notify.toast("املأ الحقول"); return; }
      const routine = Store.get("routine", []) || [];
      routine.push({ id: H.uid(), time, activity, done: false });
      routine.sort((a,b) => a.time.localeCompare(b.time));
      Store.set("routine", routine);
      Notify.toast("أُضيفت ✓");
    }
    this.closeModal();
    this.renderScreen(this.currentScreen);
  }
};