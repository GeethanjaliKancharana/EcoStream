
const express = require("express");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get logged-in user's profile
router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Profile accessed successfully",
    user: req.user
  });
});

module.exports = router;
