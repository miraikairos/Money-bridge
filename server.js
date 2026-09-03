require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const app = express();
const authRoutes = require("./routers/authRoutes");
const dealRoutes = require("./routers/dealRoutes");

connectDB();

app.use(cors());
app.use(express.json());

// Serve uploaded files (sample / final / reference)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/deals", dealRoutes);

app.get("/", (req, res) => {
  res.json({ ok: true, service: "MoneyBridge Backend", version: "v2-workflow" });
});

// JSON error handler (catches multer errors: file too large, bad type)
app.use((err, req, res, next) => {
  console.error(err.message || err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
