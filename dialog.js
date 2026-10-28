const Dialog = {
  host: null,
  init() {
    if (this.host) return;
    this.host = document.createElement("div");
    this.host.id = "dlgHost";
    this.host.className = "modal hidden";
    this.host.innerHTML = `
      <div class="modal-box" role="dialog">
        <h3 id="dlgTitle"></h3>
        <div id="dlgBody" style="margin-bottom:20px;"></div>
        <div class="modal-actions">
          <button id="dlgCancel" style="flex:1;">إلغاء</button>
          <button id="dlgOk" class="btn-primary" style="flex:1;">حفظ</button>
        </div>
      </div>`;
    document.body.appendChild(this.host);
  },
  prompt({ title, label, value = "", type = "text", placeholder = "" }, onOk) {
    this.init();
    this.host.dataset.owned = "prompt";
    this.host.querySelector("#dlgTitle").textContent = title;
    this.host.querySelector("#dlgBody").innerHTML = `
      <label>${H.escape(label)}</label>
      <input id="dlgInput" type="${H.escape(type)}" value="${H.escape(value)}" placeholder="${H.escape(placeholder)}" style="width:100%;padding:14px;border-radius:12px;border:2px solid rgba(0,0,0,0.1);background:var(--bg);color:var(--ink);font-size:16px;">`;
    const ok = this.host.querySelector("#dlgOk");
    const cancel = this.host.querySelector("#dlgCancel");
    ok.style.display = "block";
    cancel.style.display = "block";
    ok.onclick = () => {
      const val = this.host.querySelector("#dlgInput").value.trim();
      if (!val) return Notify.toast("املأ الحقل");
      this.host.classList.add("hidden");
      this.host.dataset.owned = "";
      onOk(val);
    };
    cancel.onclick = () => {
      this.host.classList.add("hidden");
      this.host.dataset.owned = "";
    };
    this.host.classList.remove("hidden");
    setTimeout(() => this.host.querySelector("#dlgInput")?.focus(), 100);
  },
  confirm(message, onYes) {
    this.init();
    this.host.dataset.owned = "confirm";
    this.host.querySelector("#dlgTitle").textContent = "تأكيد";
    this.host.querySelector("#dlgBody").innerHTML = `<p style="font-size:16px;color:var(--ink);">${H.escape(message)}</p>`;
    const ok = this.host.querySelector("#dlgOk");
    const cancel = this.host.querySelector("#dlgCancel");
    ok.style.display = "block";
    cancel.style.display = "block";
    ok.onclick = () => { this.host.classList.add("hidden"); this.host.dataset.owned = ""; onYes(); };
    cancel.onclick = () => { this.host.classList.add("hidden"); this.host.dataset.owned = ""; };
    this.host.classList.remove("hidden");
  }
};