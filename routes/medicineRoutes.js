const express = require("express");
const {
  addMedicine,
  getMedicines,
  confirmDose,
} = require("../controllers/medicineController");

const router = express.Router();

router.post("/", addMedicine);
router.get("/", getMedicines);
router.post("/confirm-dose", confirmDose);

module.exports = router;
