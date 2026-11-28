import 'dotenv/config';
import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getChains,
  validateChainAddress,
  verifyDeposit,
  withdrawFunds,
} from './controllers/walletController.js';
import {
  attachPaymentWebSocket,
  getPaymentsHandler,
  refreshPaymentsHandler,
  trackPaymentHandler,
} from './services/realtimePayments.js';
import { getPricesHandler } from './services/realtimePrices.js';
import {
  adminCreditWalletHandler,
  adminResetWalletHandler,
  getAdminOverviewHandler,
  getAdminStatusHandler,
  loginAdminHandler,
  logoutAdminHandler,
  requireAdminAuth,
  setupAdminHandler,
} from './services/adminAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON request body' });
    }
    return next(err);
  });

  // Admin Authentication & Protected Admin Routes
  app.get('/api/admin/status', getAdminStatusHandler);
  app.post('/api/admin/setup', setupAdminHandler);
  app.post('/api/admin/login', loginAdminHandler);
  app.post('/api/admin/logout', logoutAdminHandler);
  app.get('/api/admin/overview', requireAdminAuth, getAdminOverviewHandler);
  app.post('/api/admin/wallet-credit', requireAdminAuth, adminCreditWalletHandler);
  app.post('/api/admin/wallet-reset', requireAdminAuth, adminResetWalletHandler);

  // Multi-chain Web3 Exchange Wallet API Routes
  app.get('/api/chains', getChains);
  app.post('/api/deposit/verify', verifyDeposit);
  app.post('/api/withdraw', requireAdminAuth, withdrawFunds);
  app.post('/api/validate-address', validateChainAddress);
  app.get('/api/payments', getPaymentsHandler);
  app.post('/api/payments/refresh', refreshPaymentsHandler);
  app.post('/api/payments/track', trackPaymentHandler);
  app.get('/api/prices', getPricesHandler);
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'API endpoint not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  attachPaymentWebSocket(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Trust Wallet & Multi-Chain Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
