import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Ensure uploads folder exists
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// 🔹 Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + path.extname(file.originalname);
    cb(null, unique);
  },
});
const upload = multer({ storage });

// 🔹 MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// 🔹 Schema
const reportSchema = new mongoose.Schema({
  refid: {
    type: String,
    unique: true,
    required: true,
    default: () => "RPT-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
  },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  image: { type: String, required: false },
  time: { type: Date, default: Date.now },
});

const Report = mongoose.model("Report", reportSchema);

// 🔹 Routes
app.get("/", (req, res) => res.send("📡 Server Running"));

// GET all reports
app.get("/reports", async (req, res) => {
  try {
    const reports = await Report.find({}); // fetch all reports
    res.status(200).json(reports);        // send as JSON
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Server error while fetching reports" });
  }
});


// 🔹 Upload + Create Report
app.post("/report", upload.single("image"), async (req, res) => {
  try {
    const { name, mobile, type, description, location } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !mobile || !type || !description || !location) {
      return res.status(400).json({ msg: "Please fill all fields" });
    }

    const report = await Report.create({ name, mobile, type, description, location, image });
    res.status(201).json({
      msg: "✅ Report submitted successfully",
      refid: report.refid,
      report,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Serve uploaded images
app.use("/uploads", express.static(uploadDir));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
