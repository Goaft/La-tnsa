const Journal = {
  MAX: 500,
  add(entry) {
    const list = Store.get("journal", []) || [];
    const item = {
      id: H.uid(),
      ts: Date.now(),
      type: entry.type,
      personId: entry.personId || null,
      text: entry.text || "",
      meta: entry.meta || {}
    };
    list.unshift(item);
    if (list.length > this.MAX) list.length = this.MAX;
    Store.set("journal", list);
    return item;
  },
  updateMoment(id, text) {
    const list = Store.get("journal", []) || [];
    const item = list.find(x => x.id === id);
    if (item) { item.text = String(text).trim(); Store.set("journal", list); }
  },
  list(filter = {}) {
    let list = Store.get("journal", []) || [];
    if (filter.type) list = list.filter(x => x.type === filter.type);
    if (filter.personId) list = list.filter(x => x.personId === filter.personId);
    if (filter.since) list = list.filter(x => x.ts >= filter.since);
    return list;
  },
  countThisWeek() {
    return this.list({ since: Date.now() - 7 * 86400000 }).length;
  },
  lastFor(personId) {
    return this.list({ personId })[0] || null;
  }
};