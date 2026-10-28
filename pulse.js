const Pulse = {
  compute() {
    const kids = Store.get("kids", []) || [];
    const couple = Store.get("couple", {}) || {};
    let score = 100;
    kids.forEach(k => {
      const d = H.daysSince(k.lastOneOnOne);
      if (d === Infinity) score -= 25;
      else if (d > 14) score -= 20;
      else if (d > 7) score -= 10;
      else if (d > 3) score -= 3;
    });
    ["c3","c1","c4"].forEach(id => {
      const d = H.daysSince(couple[id]);
      if (d === Infinity) score -= 12;
      else if (d > 14) score -= 8;
      else if (d > 7) score -= 3;
    });
    const week = Journal.countThisWeek();
    if (week === 0) score -= 20;
    else if (week < 3) score -= 10;
    return Math.max(0, Math.min(100, score));
  },
  emoji() {
    const s = this.compute();
    if (s >= 75) return "💚";
    if (s >= 45) return "💛";
    return "🩶";
  },
  label() {
    const s = this.compute();
    if (s >= 75) return "البيت دافئ";
    if (s >= 45) return "يحتاج لمسة";
    return "افتح قلبك الليلة";
  },
  suggestion() {
    const kids = Store.get("kids", []) || [];
    let silent = null, maxD = -1;
    kids.forEach(k => {
      const d = H.daysSince(k.lastOneOnOne);
      if (d === Infinity) { silent = k; maxD = 999; }
      else if (d > maxD) { silent = k; maxD = d; }
    });
    if (silent && maxD >= 5) return `اجلس 10 دقائق مع ${silent.name} الليلة.`;
    const couple = Store.get("couple", {}) || {};
    if (H.daysSince(couple.c3) > 7) return "10 دقائق وحدكما… دون هواتف.";
    if (Journal.countThisWeek() < 3) return "سجّل لحظة جميلة اليوم — حتى لو صغيرة.";
    return "استمر — الأثر يتراكم.";
  },
  refresh() {
    const btn = document.getElementById("btnPulse");
    if (btn) { btn.textContent = this.emoji(); btn.title = this.label(); }
  }
};