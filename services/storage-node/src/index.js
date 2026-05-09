const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4001;
const NODE_ID = process.env.NODE_ID || '?';
const NODE_LABEL = process.env.NODE_LABEL || 'Unknown';
const VIDEO_DIR = '/videos';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Ensure video directory exists
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

// ── Health check ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const videos = fs.existsSync(VIDEO_DIR) ? fs.readdirSync(VIDEO_DIR) : [];
  res.json({
    status: 'up',
    service: 'storage-node',
    nodeId: NODE_ID,
    nodeLabel: NODE_LABEL,
    videoCount: videos.length,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── List videos on this node ────────────────────────────────────
app.get('/files', (req, res) => {
  const videos = fs.existsSync(VIDEO_DIR) ? fs.readdirSync(VIDEO_DIR) : [];
  res.json({ nodeId: NODE_ID, nodeLabel: NODE_LABEL, files: videos });
});

// ── Serve a file ────────────────────────────────────────────────
app.get('/files/:videoId/:filename', (req, res) => {
  const filePath = path.join(VIDEO_DIR, req.params.videoId, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found', nodeId: NODE_ID });
  }
  res.setHeader('X-Served-By-Node', NODE_ID);
  res.setHeader('X-Node-Label', NODE_LABEL);
  res.sendFile(filePath);
});

// ── Store a file ────────────────────────────────────────────────
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const videoId = req.body.videoId;
    const dir = path.join(VIDEO_DIR, videoId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

app.post('/store', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    message: 'File stored successfully',
    nodeId: NODE_ID,
    path: req.file.path,
  });
});

app.listen(PORT, () => {
  console.log(`💾 Storage Node [${NODE_ID} — ${NODE_LABEL}] listening on port ${PORT}`);
});
