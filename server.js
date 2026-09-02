require("dotenv").config();

const express = require("express");
const cors = require("cors");
const dealRoutes = require('./routes/dealRoutes');
const path = require('path');
const connectDB = require("./config/db");

const app = express();
const authRoutes = require("./routers/authRoutes");
connectDB();
const dealRoutes = require("./routers/dealRoutes");
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/deals", dealRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/deals', dealRoutes);
app.get("/", (req, res) => {
  res.send("MoneyBridge Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});