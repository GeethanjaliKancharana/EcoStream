
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Security settings
app.use(helmet({
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  }
}));

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"]
}));

app.use(express.json({ limit: "2mb" }));

// Make uploaded images accessible
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200
}));

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/complaints", require("./routes/complaintRoutes"));

// Socket.IO for live updates
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

// Basic test route
app.get("/", (req, res) => {
  res.json({
    message: "EcoStream API is running",
    status: "Success"
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`EcoStream server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

// Socket connection
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("A client disconnected:", socket.id);
  });
});
