const Moment = {
  chip: null,
  _t: null,
  _entryId: null,

  offer(entryId, prompt = "ما أجمل شيء حدث؟ ✍️") {
    this.dismiss();
    this._entryId = entryId;
    const chip = document.createElement("div");
    chip.className = "moment-chip";
    chip.innerHTML = `
      <span class="mc-emoji">✨</span>
      <span class="mc-text">${H.escape(prompt)}</span>
      <button class="mc-skip" aria-label="تجاهل">✕</button>`;
    document.body.appendChild(chip);
    this.chip = chip;
    requestAnimationFrame(() => chip.classList.add("visible"));
    chip.querySelector(".mc-text").addEventListener("click", () => this.openInput(entryId));
    chip.querySelector(".mc-skip").addEventListener("click", (e) => { e.stopPropagation(); this.dismiss(); });
    this._t = setTimeout(() => this.dismiss(), 8000);
  },

  openInput(entryId) {
    this.dismiss();
    this._entryId = entryId;
    const host = document.createElement("div");
    host.className = "moment-input-host";
    host.innerHTML = `
      <div class="moment-input">
        <input id="momentField" maxlength="140" placeholder="كلمة واحدة تكفي…">
        <button id="momentSave" class="btn-primary" style="padding:10px 18px;">حفظ</button>
      </div>`;
    document.body.appendChild(host);
    const field = host.querySelector("#momentField");
    setTimeout(() => field.focus(), 80);

    let saved = false;
    const save = () => {
      if (saved) return;
      saved = true;
      const text = field.value.trim();
      if (text) {
        Journal.updateMoment(entryId, text);
        Notify.toast("لحظة محفوظة ✨");
        H.haptic(30);
      }
      host.remove();
      if (typeof UI !== "undefined" && UI.currentScreen === "journal") UI.renderJournal();
    };
    host.querySelector("#momentSave").addEventListener("click", save);
    field.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    field.addEventListener("blur", () => setTimeout(save, 180));
  },

  dismiss() {
    clearTimeout(this._t);
    if (this.chip) {
      this.chip.classList.remove("visible");
      const c = this.chip;
      this.chip = null;
      setTimeout(() => c.remove(), 300);
    }
  }
};