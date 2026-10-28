const EventModel = {
  create(type, data) {
    return {
      id: H.uid(),
      type: type,
      title: data.title,
      personId: data.personId || null,
      start: data.start || Date.now(),
      level: data.level || undefined,
      recurrence: {
        freq: data.freq || "none",
        times: data.times || [],
        until: data.until || null
      },
      history: [],
      done: false
    };
  }
};