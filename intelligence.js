const Intelligence = {
  getPersonHealth(person) {
    const days = H.daysSince(person.lastContact);
    const expected = person.expectedDays || 7;
    if (days > expected * 2) return "red";
    if (days > expected) return "yellow";
    return "green";
  },
  getSeasonalPlan() {
    const manual = Store.get("season", null);
    if (manual && DATA.seasonalContent[manual]) {
      const pool = DATA.seasonalContent[manual];
      return { theme: "🎯", tip: pool[new Date().getDate() % pool.length] };
    }
    const hijri = H.hijriMonth();
    if (hijri === 9) {
      const pool = DATA.seasonalContent.ramadan;
      return { theme: "🌙 رمضان", tip: pool[new Date().getDate() % pool.length] };
    }
    if (new Date().getDay() === 5) {
      const pool = DATA.seasonalContent.friday;
      return { theme: "🕌 الجمعة", tip: pool[new Date().getDate() % pool.length] };
    }
    return { theme: "🌿 يوم جديد", tip: "ابدأ يومك بنية واضحة." };
  }
};