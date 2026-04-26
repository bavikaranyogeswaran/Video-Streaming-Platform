const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;
const REPLICA_ID = process.env.REPLICA_ID || '?';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Attach replica ID to every response
app.use((req, res, next) => {
  res.setHeader('X-Replica-ID', REPLICA_ID);
  next();
});

// ── Health check ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'up',
    service: 'streaming-service',
    replicaId: REPLICA_ID,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Streaming stub (Day 6 will add real HLS proxy logic) ────────
app.get('/stream/:videoId/*', (req, res) => {
  res.json({
    message: 'Streaming service stub — real HLS delivery coming Day 6',
    replicaId: REPLICA_ID,
    videoId: req.params.videoId,
  });
});

app.listen(PORT, () => {
  console.log(`🎬 Streaming Service [Replica ${REPLICA_ID}] listening on port ${PORT}`);
});
