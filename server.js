require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const medicineRoutes = require("./routes/medicineRoutes");
const historyRoutes = require("./routes/historyRoutes");
const { startScheduler } = require("./services/schedulerService");
const { sendSMS } = require("./services/smsService");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/medicines", medicineRoutes);
app.use("/api/history", historyRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/test-sms", async (req, res) => {
  try {
    const to = req.query.to || process.env.TEST_SMS_TO;
    if (!to) {
      return res
        .status(400)
        .json({ message: "Provide ?to=+91XXXXXXXXXX or set TEST_SMS_TO." });
    }

    await sendSMS(to, "Test SMS working");
    return res.send("SMS sent");
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    startScheduler();
    console.log("Scheduler started");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
