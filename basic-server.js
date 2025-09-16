import dotenv from 'dotenv';
dotenv.config(); // DEVE SER PRIMEIRO!

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Importar rotas KPI APÓS carregar .env
import kpiRoutes from './src/routes/kpi.js';
app.use('/api', kpiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    env_loaded: {
      MB_URL: process.env.MB_URL ? 'OK' : 'MISSING',
      MB_TOKEN: process.env.MB_TOKEN ? 'OK' : 'MISSING',
      CARD_VENDAS14_ID: process.env.CARD_VENDAS14_ID || 'MISSING'
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor na porta ${PORT}`);
  console.log(`📊 Cards configurados:`);
  console.log(`  - VENDAS14: ${process.env.CARD_VENDAS14_ID || 'NÃO DEFINIDO'}`);
  console.log(`  - TOP20: ${process.env.CARD_TOP20_ID || 'NÃO DEFINIDO'}`);
});
