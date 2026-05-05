const mongoose = require("mongoose");
const Medicine = require("../models/Medicine");
const History = require("../models/History");
const { clearPendingConfirmation } = require("../services/schedulerService");

function validateTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function validatePhone(value) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

async function addMedicine(req, res) {
  try {
    const { name, dosage, time, userPhone, caretakerPhone } = req.body;

    if (!name || !dosage || !time || !userPhone || !caretakerPhone) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!validateTime(time)) {
      return res
        .status(400)
        .json({ message: "Time must be in HH:MM (24-hour) format." });
    }

    if (!validatePhone(userPhone) || !validatePhone(caretakerPhone)) {
      return res
        .status(400)
        .json({ message: "Phone numbers must use E.164 format." });
    }

    const medicine = await Medicine.create({
      name,
      dosage,
      time,
      userPhone,
      caretakerPhone,
    });

    return res.status(201).json(medicine);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getMedicines(req, res) {
  try {
    const medicines = await Medicine.find();
    const result = [];

    for (const medicine of medicines) {
      const latestHistory = await History.findOne({
        medicineId: medicine._id,
      }).sort({ timestamp: -1 });

      let status = "pending";

      if (latestHistory) {
        status = latestHistory.status;
      }

      result.push({
        ...medicine.toObject(),
        status,
      });
    }

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}

async function confirmDose(req, res) {
  try {
    const { medicineId } = req.body;

    if (!medicineId) {
      return res.status(400).json({ message: "medicineId is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(medicineId)) {
      return res.status(400).json({ message: "Invalid medicineId." });
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found." });
    }

    await History.create({
      medicineId,
      status: "taken",
      timestamp: new Date(),
    });

    clearPendingConfirmation(String(medicineId));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getHistory(req, res) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const data = await History.find({
      timestamp: { $gte: startOfDay },
    })
      .populate("medicineId")
      .where("medicineId")
      .ne(null)
      .sort({ timestamp: -1 });

    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { addMedicine, getMedicines, confirmDose, getHistory };
