const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    userPhone: {
      type: String,
      required: true,
      trim: true,
      match: /^\+[1-9]\d{7,14}$/,
    },
    caretakerPhone: {
      type: String,
      required: true,
      trim: true,
      match: /^\+[1-9]\d{7,14}$/,
    },
    lastNotified: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medicine", medicineSchema);
