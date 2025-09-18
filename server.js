const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = 5000;

// Enable CORS so your React frontend (likely on localhost:3000) can talk to this server
app.use(cors());
app.use(express.json());

// Make uploads folder if it doesn't exist
const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    // Use timestamp + original name to avoid overwriting
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// File filter to allow multiple formats
const allowedTypes = [
  "application/pdf",          // PDF
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/msword",       // DOC
  "application/vnd.ms-powerpoint", // PPT
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
  "image/jpeg",               // JPG
  "image/png"                 // PNG
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, PPTX, JPG, and PNG files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// === ROUTE: Upload file ===
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    id: Date.now(),
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    status: "Uploaded",
    uploadDate: new Date(),
  });
});

// === ROUTE: Get all uploaded files ===
app.get("/uploads", (req, res) => {
  fs.readdir(uploadFolder, (err, files) => {
    if (err) return res.status(500).json({ error: "Failed to read uploads folder" });

    const fileList = files.map((file) => ({
      filename: file,
      originalName: file.split("-").slice(1).join("-"),
      status: "Uploaded",
      uploadDate: fs.statSync(path.join(uploadFolder, file)).birthtime,
    }));

    res.json(fileList);
  });
});

// === ROUTE: Download file ===
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(uploadFolder, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});


// ===================== QUIZ SCORE ROUTES =====================
const scoresFile = path.join(__dirname, "scores.json");

// Ensure scores.json exists
if (!fs.existsSync(scoresFile)) {
  fs.writeFileSync(scoresFile, JSON.stringify([]));
}

// Save score
app.post("/save-score", (req, res) => {
  const { score } = req.body;
  if (score === undefined) {
    return res.status(400).json({ message: "Score is required!" });
  }

  // Read existing scores
  let scores = JSON.parse(fs.readFileSync(scoresFile, "utf-8"));

  const newScore = {
    id: Date.now(),
    score,
    date: new Date(),
  };

  // Add new score
  scores.push(newScore);

  // Save back to file
  fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2));

  return res.json({ message: "Score saved successfully!", score: newScore });
});

// Get all scores
app.get("/get-score", (req, res) => {
  const scores = JSON.parse(fs.readFileSync(scoresFile, "utf-8"));
  if (scores.length > 0) {
    return res.json(scores);
  } else {
    return res.json({ message: "No scores found yet!" });
  }
});
// =============================================================
app.use(express.json());

// Serve React dist folder
app.use(express.static(path.join(__dirname, "dist")));

// Example backend API route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

// Catch-all: send React index.html for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
