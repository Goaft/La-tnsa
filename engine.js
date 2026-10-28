const Engine = {
  getNowTasks() {
    const now = Date.now();
    const active = (Store.get("tasks", []) || []).filter(t => !t.done);
    active.sort((a, b) => {
      const aOver = a.due && a.due < now, bOver = b.due && b.due < now;
      if (aOver && !bOver) return -1; if (!aOver && bOver) return 1;
      return (b.priority || 0) - (a.priority || 0);
    });
    return active.slice(0, 3);
  },
  getOverdueTasks() {
    const now = Date.now();
    return (Store.get("tasks", []) || []).filter(t => !t.done && t.due && t.due < now);
  },
  getContextualNudge() {
    const h = new Date().getHours();
    const pool = (h >= 5 && h < 12) ? DATA.smartNudges.morning :
                 (h >= 12 && h < 18) ? DATA.smartNudges.afternoon :
                 (h >= 18 && h < 21) ? DATA.smartNudges.evening :
                 DATA.smartNudges.night;
    return pool[new Date().getDay() % pool.length];
  },
  getBestTip() {
    const today = new Date().toDateString();
    const cache = Store.get("lastTip", {}) || {};
    if (cache.date === today && cache.text) return { type: "daily", text: cache.text };
    const tip = DATA.dailyTips[new Date().getDate() % DATA.dailyTips.length];
    Store.set("lastTip", { date: today, text: tip });
    return { type: "daily", text: tip };
  },
  getSavoringPrompt() { return DATA.savoringPrompts[new Date().getDate() % DATA.savoringPrompts.length]; },
  getSilentChild() {
    const kids = Store.get("kids", []) || [];
    if (!kids.length) return null;
    let silent = null, maxDays = -1;
    kids.forEach(k => {
      const d = H.daysSince(k.lastOneOnOne);
      const normalizedD = d === Infinity ? 9999 : d;
      if (normalizedD > maxDays) { maxDays = normalizedD; silent = k; }
    });
    return maxDays >= 5 ? { child: silent, days: maxDays === 9999 ? "never" : maxDays } : null;
  },
  getKidDefaultTasks(age) {
    let bracketMax = 6;
    if (age >= 7 && age <= 11) bracketMax = 11;
    if (age >= 12) bracketMax = 18;
    return DATA.kidTaskTemplates.filter(t => t.ageMax === bracketMax).map(t => ({
      id: H.uid(), title: t.title, points: t.points, done: false
    }));
  }
};