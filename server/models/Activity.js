const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
  worker: { type: String, required: true },
  loginTime: { type: Date, required: true, default: Date.now },
  logoutTime: { type: Date, default: null },
  shiftCloseTime: { type: Date, default: null },
});

module.exports = mongoose.model("Activity", ActivitySchema);
