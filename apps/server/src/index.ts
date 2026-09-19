import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { closeRedisConnections, cmdClient } from './config/redis.js';
import { broadcastAuctionState, setupSocketGateway } from './gateway/socketGateway.js';
import { bidEngine } from './services/bidEngine.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.get('/readyz', async (_req: Request, res: Response) => {
  try {
    const pong = await cmdClient.ping();
    if (pong === 'PONG') {
      res.status(200).json({ status: 'ready', redis: true });
      return;
    }
    res.status(503).json({ status: 'unavailable', redis: false });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', redis: false, error: String(error) });
  }
});

app.post('/api/auction/:id/reset', async (req: Request, res: Response) => {
  try {
    const auctionId = req.params['id'] || 'demo-auction-1';
    const durationMinutes = req.body?.durationMinutes
      ? parseInt(String(req.body.durationMinutes), 10)
      : 5;

    const updatedState = await bidEngine.resetDemoAuction(auctionId, durationMinutes);
    broadcastAuctionState(auctionId, updatedState);

    res.status(200).json({
      success: true,
      message: `Auction ${auctionId} reset for ${durationMinutes} minutes`,
      state: updatedState,
    });
  } catch (err) {
    console.error('[Server] Error resetting auction:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

const httpServer = createServer(app);
setupSocketGateway(httpServer);

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);

async function startServer(): Promise<void> {
  try {
    await bidEngine.init();
    await bidEngine.seedDemoAuction('demo-auction-1');
    console.log('[Server] Demo auction "demo-auction-1" seeded successfully.');

    httpServer.listen(PORT, () => {
      console.log(`[Server] Ingress Socket Gateway running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize server:', err);
    process.exit(1);
  }
}

async function handleShutdown(signal: string): Promise<void> {
  console.log(`[Server] Received ${signal}, initiating graceful shutdown...`);
  httpServer.close(async () => {
    console.log('[Server] HTTP server closed.');
    await closeRedisConnections();
    console.log('[Server] Redis connections closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  handleShutdown('SIGINT').catch(() => process.exit(1));
});

process.on('SIGTERM', () => {
  handleShutdown('SIGTERM').catch(() => process.exit(1));
});

startServer();
