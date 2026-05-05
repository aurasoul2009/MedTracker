const express = require("express");
const { getHistory } = require("../controllers/medicineController");

const router = express.Router();

router.get("/", getHistory);

module.exports = router;
