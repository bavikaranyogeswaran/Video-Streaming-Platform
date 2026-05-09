// =================================================================================
// STORAGE NODE (The Content Vault)
// =================================================================================
// This microservice manages the physical storage of HLS assets.
// It handles high-concurrency file serving and receives replicated
// data chunks from the ingestion orchestrator.
// =================================================================================

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

// 1. [SIDE EFFECT] Ensure physical storage directory exists on mount point
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

// HEALTH CHECK: Heartbeat endpoint for the Health Monitor service
app.get('/health', (req, res) => {
  // 1. [VALIDATION] Verify local file system state
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

// LIST FILES: Debug/Audit endpoint to see hosted segments
app.get('/files', (req, res) => {
  const videos = fs.existsSync(VIDEO_DIR) ? fs.readdirSync(VIDEO_DIR) : [];
  res.json({ nodeId: NODE_ID, nodeLabel: NODE_LABEL, files: videos });
});

// SERVE FILE: Delivers requested HLS segments or playlists
app.get('/files/:videoId/:filename', (req, res) => {
  // 1. [VALIDATION] Resolve and check physical file path
  const filePath = path.join(VIDEO_DIR, req.params.videoId, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found', nodeId: NODE_ID });
  }

  // 2. [SIDE EFFECT] Send binary data with node identity headers
  res.setHeader('X-Served-By-Node', NODE_ID);
  res.setHeader('X-Node-Label', NODE_LABEL);
  res.sendFile(filePath);
});

// ── Ingestion Logic ──────────────────────────────────────────────
const multer = require('multer');

// [SIDE EFFECT] Configure disk storage for incoming replication chunks
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 1. [VALIDATION] Resolve sub-directory by videoId for organizational grouping
    const videoId = req.body.videoId;
    const dir = path.join(VIDEO_DIR, videoId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // 2. [SIDE EFFECT] Retain original filename (critical for HLS manifest consistency)
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// STORE FILE: Receives replicated video chunks from the orchestrator
app.post('/store', upload.single('file'), (req, res) => {
  // 1. [VALIDATION] Ensure the multipart upload was successful
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // 2. [SIDE EFFECT] Confirm local persistence to the caller
  res.json({
    message: 'File stored successfully',
    nodeId: NODE_ID,
    path: req.file.path,
  });
});

app.listen(PORT, () => {
  console.log(`💾 Storage Node [${NODE_ID} — ${NODE_LABEL}] listening on port ${PORT}`);
});
