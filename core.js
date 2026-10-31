const NS = "lts_";

const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(NS + key); return v !== null ? JSON.parse(v) : fallback; } catch(e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
    catch(e) {
      if (typeof Notify !== "undefined" && Notify.toast) Notify.toast("⚠️ مساحة التخزين ممتلئة");
      return false;
    }
  },
  remove(key) { try { localStorage.removeItem(NS + key); } catch(e) {} }
};

const Voice = {
  enabled: true, rate: 0.9, voice: null, primed: false,
  init() {
    if (!("speechSynthesis" in window)) { this.enabled = false; return; }
    const pick = () => {
      const v = speechSynthesis.getVoices();
      this.voice = v.find(x => x.lang.startsWith("ar")) || null;
    };
    pick();
    speechSynthesis.onvoiceschanged = pick;
  },
  speak(text, opts = {}) {
    if (!this.enabled || !text) return;
    try {
      // استخدام محرك الصوت الأصلي في الأندرويد (Capacitor TextToSpeech)
      if (typeof Capacitor !== "undefined" && Capacitor.isNativePlatform() && Capacitor.Plugins.TextToSpeech) {
        Capacitor.Plugins.TextToSpeech.speak({
          text: text,
          lang: "ar-SA",
          rate: opts.rate || this.rate,
          volume: 1.0
        });
        return;
      }
      
      // احتياطي للمتصفح
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ar-SA"; u.rate = opts.rate || this.rate;
      if (this.voice) u.voice = this.voice;
      speechSynthesis.speak(u);
    } catch(e){}
  },
  test() { this.speak("الصوت يعمل. أهلاً بكم في تطبيق لا تنسى."); }
};

const Notify = {
  init() { return Promise.resolve(); },
  toast(message, ms = 3500) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(this._to);
    this._to = setTimeout(() => el.classList.add("hidden"), ms);
  }
};

const H = {
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); },
  escape(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[c]));
  },
  haptic(pattern = 50) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch(e){} },
  isToday(ts) { if (!ts) return false; const d = new Date(ts), n = new Date(); return d.toDateString() === n.toDateString(); },
  daysSince(ts) { if (!ts) return Infinity; return Math.floor((Date.now() - ts) / 86400000); },
  ago(ts) {
    if (!ts) return "لم يُسجَّل بعد";
    const d = this.daysSince(ts);
    if (d === 0) return "اليوم ✓";
    if (d === 1) return "أمس";
    if (d < 7) return `منذ ${d} أيام`;
    return `منذ ${Math.floor(d/7)} أسابيع`;
  },
  statusColor(ts, okDays = 1, warnDays = 7) {
    const d = this.daysSince(ts);
    if (d <= okDays) return "ok";
    if (d <= warnDays) return "warn";
    return "bad";
  },
  dateStr(ts) { if (!ts) return ""; return new Date(ts).toLocaleDateString("ar-EG", { day:"numeric", month:"short", year:"numeric" }); },
  
  // توحيد صيغة الوقت (صباحاً / مساءً)
  timeStr(ts) { 
    if (!ts) return ""; 
    const d = new Date(ts);
    let hours = d.getHours();
    let minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  },
  
  hijriMonth() {
    try {
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month:'numeric' }).formatToParts(new Date());
      const m = parts.find(p => p.type === 'month');
      return m ? parseInt(m.value) : null;
    } catch(e) { return null; }
  }
};