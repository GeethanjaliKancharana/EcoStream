
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Complaint = require("../models/Complaint");
const { protect, allowRoles } = require("../middleware/auth");

const router = express.Router();

// IMAGE STORAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1E9);

    cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
  }
});

// IMAGE VALIDATION
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WebP images are allowed."));
    }
  }
});

// SUBMIT COMPLAINT
router.post("/", protect, (req, res, next) => {
  upload.single("photo")(req, res, err => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const {
      title,
      description,
      wasteType,
      location,
      latitude,
      longitude
    } = req.body;

    if (!title || !description || !wasteType || !location) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }

      return res.status(400).json({
        message: "Please provide all required complaint details."
      });
    }

    const complaint = await Complaint.create({
      citizen: req.user._id,
      title,
      description,
      wasteType,
      location,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      photo: req.file ? req.file.filename : "",
      status: "Submitted"
    });

    res.status(201).json({
      message: "Complaint submitted successfully.",
      complaint
    });

  } catch (error) {
    console.error("Complaint error:", error.message);

    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      message: "Complaint submission failed."
    });
  }
});

// CITIZEN: VIEW OWN COMPLAINTS
router.get("/my", protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({
      citizen: req.user._id
    }).sort({ createdAt: -1 });

    res.json({
      message: "Complaints retrieved successfully.",
      complaints
    });

  } catch (error) {
    res.status(500).json({
      message: "Unable to retrieve complaints."
    });
  }
});

// ADMIN: VIEW ALL COMPLAINTS
router.get(
  "/admin/all",
  protect,
  allowRoles("Admin", "Administrator"),
  async (req, res) => {
    try {
      const complaints = await Complaint.find()
        .populate("citizen", "name email")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        complaints
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Unable to load complaints."
      });
    }
  }
);

// ADMIN: UPDATE COMPLAINT STATUS
router.patch(
  "/:id/status",
  protect,
  allowRoles("Admin", "Administrator"),
  async (req, res) => {
    try {
      const { status, rejectionReason } = req.body;

      const allowedStatuses = [
        "Submitted",
        "Under Review",
        "Assigned",
        "In Progress",
        "Completed",
        "Rejected"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint status."
        });
      }

      if (
        status === "Rejected" &&
        !rejectionReason?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a rejection reason."
        });
      }

      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found."
        });
      }

      complaint.status = status;
      complaint.rejectionReason =
        status === "Rejected" ? rejectionReason.trim() : "";

      await complaint.save();

      res.json({
        success: true,
        message: "Complaint status updated successfully.",
        complaint
      });

    } catch (error) {
      console.error("Status update error:", error.message);

      res.status(500).json({
        success: false,
        message: "Unable to update complaint status."
      });
    }
  }
);

// CITIZEN: DELETE OWN SUBMITTED COMPLAINT
router.delete("/:id", protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found."
      });
    }

    if (complaint.citizen.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You cannot delete another citizen's complaint."
      });
    }

    if (complaint.status !== "Submitted") {
      return res.status(400).json({
        message: "Only submitted complaints can be deleted."
      });
    }

    await Complaint.findByIdAndDelete(complaint._id);

    if (complaint.photo) {
      const photoPath = path.join(
        __dirname,
        "../uploads",
        path.basename(complaint.photo)
      );

      await fs.promises.unlink(photoPath).catch(error => {
        if (error.code !== "ENOENT") {
          console.error("Photo deletion error:", error.message);
        }
      });
    }

    res.json({
      success: true,
      message: "Complaint deleted successfully."
    });

  } catch (error) {
    console.error("Delete error:", error.message);

    res.status(500).json({
      message: "Unable to delete complaint."
    });
  }
});

module.exports = router;
