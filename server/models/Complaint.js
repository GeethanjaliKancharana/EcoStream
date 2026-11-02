
const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    wasteType: {
      type: String,
      enum: [
        "Household Waste",
        "Plastic Waste",
        "Industrial Waste",
        "Medical Waste",
        "Construction Waste",
        "Other"
      ],
      required: true
    },

    location: {
      type: String,
      required: true
    },

    latitude: {
      type: Number,
      default: null
    },

    longitude: {
      type: Number,
      default: null
    },

    photo: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "Assigned",
        "In Progress",
        "Completed",
        "Rejected"
      ],
      default: "Submitted"
    },

    rejectionReason: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);

