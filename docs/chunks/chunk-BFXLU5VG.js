// front/src/log.js
var LOG_ALL = true;
var log = {
  MAX_LOG_ENTRIES: 100,
  logItems: [],
  next_item: 0,
  mylog_entry(_level, _desc, _item) {
    var logItem = {
      timestamp: Date.now(),
      level: _level,
      desc: _desc,
      item: _item
    };
    if (this.logItems.length < this.MAX_LOG_ENTRIES) {
      this.logItems.push(logItem);
      return;
    }
    this.logItems[this.next_item] = logItem;
    this.next_item = this.next_item + 1;
    if (this.next_item == this.MAX_LOG_ENTRIES) {
      this.next_item = 0;
    }
    return;
  },
  log(_desc, ...additional) {
    if (LOG_ALL) {
      console.log(_desc, ...additional);
      this.mylog_entry("N", _desc, ...additional);
    }
  },
  warn(_desc, ...additional) {
    if (LOG_ALL) {
      let msg = _desc;
      try {
        let e = new Warning(_desc);
        msg = e.stack;
      } catch {
      }
      console.warn(msg, ...additional);
      this.mylog_entry("W", msg, ...additional);
    }
  },
  error(_desc, ...additional) {
    let msg = _desc;
    try {
      let e = new Error(_desc);
      msg = e.stack;
    } catch {
    }
    console.error(msg, ...additional);
    this.mylog_entry("E", msg, ...additional);
  },
  num_items() {
    if (this.logItems.length < this.MAX_LOG_ENTRIES) {
      return this.logItems.length;
    }
    return this.MAX_LOG_ENTRIES;
  },
  item(index) {
    if (index >= this.num_items()) {
      return void 0;
    }
    if (this.logItems.length < this.MAX_LOG_ENTRIES) {
      return this.logItems[index];
    } else {
      let real_index = (this.next_item + index) % this.MAX_LOG_ENTRIES;
      return this.logItems[real_index];
    }
  }
};

export {
  log
};
