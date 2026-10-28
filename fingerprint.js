if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const radii = typeof r === "number" ? [r,r,r,r] : (Array.isArray(r) ? r : [0,0,0,0]);
    const [tl, tr, br, bl] = radii;
    this.beginPath();
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y); this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br); this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h); this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl); this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}

const Fingerprint = {
  show() {
    const canvas = this.render();
    const host = document.createElement("div");
    host.className = "fp-host";
    host.innerHTML = `
      <div class="fp-modal">
        <h3 style="margin-top:0;text-align:center;">بصمة أسبوعك</h3>
        <img src="${canvas.toDataURL("image/png")}" alt="بصمة الأسبوع" style="width:100%;border-radius:16px;display:block;">
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button id="fpShare" class="btn-primary" style="flex:1;">شارك</button>
          <button id="fpClose" style="flex:1;background:rgba(0,0,0,.06);border:0;border-radius:12px;padding:14px;font-weight:800;cursor:pointer;color:var(--ink);">إغلاق</button>
        </div>
      </div>`;
    document.body.appendChild(host);
    host.querySelector("#fpClose").addEventListener("click", () => host.remove());
    host.querySelector("#fpShare").addEventListener("click", async () => {
      try {
        const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
        const file = new File([blob], "athar-week.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "بصمة أسبوعي" });
        } else {
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.download = "athar-week.png";
          a.click();
        }
      } catch(e) { Notify.toast("تعذّرت المشاركة"); }
    });
  },

  render() {
    const W = 720, Hh = 860;
    const c = document.createElement("canvas");
    c.width = W; c.height = Hh;
    const ctx = c.getContext("2d");

    const g = ctx.createLinearGradient(0, 0, W, Hh);
    g.addColorStop(0, "#f2f6f3"); g.addColorStop(1, "#e0ebe4");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);

    ctx.fillStyle = "#2e7d32";
    ctx.beginPath(); ctx.roundRect(0, 0, W, 110, [0,0,26,26]); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px 'Noto Naskh Arabic', 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("أثر أسبوعي", W/2, 72);

    ctx.fillStyle = "#6b7a70";
    ctx.font = "18px 'Noto Naskh Arabic', 'Arial', sans-serif";
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const dateStr = weekAgo.toLocaleDateString("ar-EG", {day:"numeric",month:"long"}) +
                    " — " + new Date().toLocaleDateString("ar-EG", {day:"numeric",month:"long",year:"numeric"});
    ctx.fillText(dateStr, W/2, 152);

    const week = Journal.list({ since: Date.now() - 7 * 86400000 });
    const sessions = week.filter(x => x.type === "session").length;
    const couples  = week.filter(x => x.type === "couple").length;
    const kidPts   = week.filter(x => x.type === "kid_point").length;
    const memories = week.filter(x => x.text).length;

    const stats = [
      { emoji: "🕐", value: sessions, label: "جلسة فردية" },
      { emoji: "💞", value: couples,  label: "لحظة زوجية" },
      { emoji: "⭐", value: kidPts,   label: "نجمة أطفال" },
      { emoji: "✨", value: memories, label: "ذكرى محفوظة" }
    ];

    stats.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = W/4 + col * W/2, y = 290 + row * 170;
      ctx.font = "56px 'Arial', sans-serif"; ctx.fillStyle = "#000";
      ctx.fillText(s.emoji, x, y);
      ctx.font = "bold 52px 'Noto Naskh Arabic', 'Arial', sans-serif";
      ctx.fillStyle = "#2e7d32"; ctx.fillText(String(s.value), x, y + 64);
      ctx.font = "18px 'Noto Naskh Arabic', 'Arial', sans-serif";
      ctx.fillStyle = "#6b7a70"; ctx.fillText(s.label, x, y + 94);
    });

    const lastMemory = week.find(x => x.text);
    if (lastMemory) {
      const boxY = 660;
      ctx.fillStyle = "rgba(251,192,45,.15)";
      ctx.beginPath(); ctx.roundRect(40, boxY, W-80, 100, 16); ctx.fill();
      ctx.fillStyle = "#a07a1a";
      ctx.font = "italic 20px 'Noto Naskh Arabic', 'Arial', sans-serif";
      const text = lastMemory.text.length > 60 ? lastMemory.text.slice(0,60) + "…" : lastMemory.text;
      ctx.fillText(`"${text}"`, W/2, boxY + 58);
    }

    ctx.font = "bold 22px 'Noto Naskh Arabic', 'Arial', sans-serif";
    ctx.fillStyle = "#2e7d32";
    ctx.fillText(`${Pulse.emoji()}  ${Pulse.label()}`, W/2, 820);

    return c;
  }
};