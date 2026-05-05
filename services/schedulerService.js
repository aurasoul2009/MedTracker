const cron = require("node-cron");
const Medicine = require("../models/Medicine");
const History = require("../models/History");
const { sendSMS } = require("./smsService");

const pendingConfirmations = new Map();
const MISSED_TIMEOUT_MS = 5 * 60 * 1000;

function isSameDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function toCurrentHHMM() {
  const now = new Date();
  return now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function clearPendingConfirmation(medicineId) {
  const timeoutId = pendingConfirmations.get(medicineId);
  if (!timeoutId) {
    return;
  }

  clearTimeout(timeoutId);
  pendingConfirmations.delete(medicineId);
}

function scheduleMissedDoseCheck(medicine) {
  const medicineId = String(medicine._id);
  clearPendingConfirmation(medicineId);

  const timeoutId = setTimeout(async () => {
    try {
      pendingConfirmations.delete(medicineId);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const taken = await History.findOne({
        medicineId: medicine._id,
        status: "taken",
        timestamp: { $gte: startOfDay },
      });

      if (taken) {
        return;
      }

      const missed = await History.findOne({
        medicineId: medicine._id,
        status: "missed",
        timestamp: { $gte: startOfDay },
      });

      if (!missed) {
        await History.create({
          medicineId: medicine._id,
          status: "missed",
          timestamp: new Date(),
        });
      }

      await sendSMS(
        medicine.caretakerPhone,
        `Alert: ${medicine.name} was NOT taken by the user.`
      );
    } catch (error) {
      console.error("Missed-dose check failed:", error.message);
    }
  }, MISSED_TIMEOUT_MS);

  pendingConfirmations.set(medicineId, timeoutId);
}

async function processReminderTick() {
  try {
    const now = new Date();
    const currentTime = toCurrentHHMM();
    const medicines = await Medicine.find();

    for (const medicine of medicines) {
      const alreadyNotifiedToday =
        medicine.lastNotified && isSameDay(medicine.lastNotified, now);

      console.log("Now:", currentTime, "Medicine time:", medicine.time);

      if (medicine.time !== currentTime || alreadyNotifiedToday) {
        continue;
      }

      await sendSMS(
        medicine.userPhone,
        `Reminder: Take ${medicine.name} (${medicine.dosage}) now.`
      );

      medicine.lastNotified = now;
      await medicine.save();

      scheduleMissedDoseCheck(medicine);
    }
  } catch (error) {
    console.error("Scheduler tick failed:", error.message);
  }
}

function startScheduler() {
  cron.schedule("* * * * *", processReminderTick);
  console.log("Medicine scheduler started");
}

module.exports = {
  clearPendingConfirmation,
  startScheduler,
};
