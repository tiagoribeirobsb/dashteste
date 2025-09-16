import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRoutes from './routes/upload.js';
import metabaseRoutes from './routes/metabase.js';
// import biRoutes from './routes/bi.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
console.log('📝 Registrando rotas...');
app.use('/upload-proxy', uploadRoutes);
console.log('✅ Upload routes registradas');
app.use('/api/metabase', metabaseRoutes);
console.log('✅ Metabase routes registradas');
// app.use(biRoutes);
// console.log('✅ BI routes registradas');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Upload endpoints available at:`);
  console.log(`   POST /upload-proxy/clients-master`);
  console.log(`   POST /upload-proxy/sales-by-customer`);
  console.log(`   POST /upload-proxy/daily-sales`);
  console.log(`   POST /upload-proxy/order-status`);
  console.log(`   POST /upload-proxy/top-clients`);
  console.log(`   POST /upload-proxy/monthly-targets`);
  console.log(`📈 Metabase BI endpoints available at:`);
  console.log(`   GET/POST /api/metabase/cards/:cardId`);
  console.log(`   POST /api/metabase/cards/batch`);
  console.log(`   GET /api/metabase/cards/:cardId/info`);
  console.log(`   GET /api/metabase/cards/:cardId/embed`);
  console.log(`   GET /api/metabase/cards/:cardId/embed/jwt`);
  console.log(`   GET /api/metabase/cards/:cardId/embed/iframe`);
  console.log(`   DELETE /api/metabase/cache/clear`);
  console.log(`   GET /api/metabase/cache/stats`);
  console.log(`   GET /api/metabase/status`);
  console.log(`   POST /api/metabase/test`);
  console.log(`🔗 BI Proxy endpoints available at:`);
  console.log(`   POST /bi/card/:id/query`);
  
  // Manter o servidor rodando
  process.on('SIGINT', () => {
    console.log('\n🛑 Servidor sendo encerrado...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Servidor sendo encerrado...');
    process.exit(0);
  });
});

// Exportar o app para uso como módulo
export default app;