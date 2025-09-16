const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant'],
  credentials: true
}));

app.use(express.json());

// Endpoint de status do Metabase
app.get('/api/metabase/status', (req, res) => {
  console.log('✅ GET /api/metabase/status');
  res.json({
    success: true,
    status: 'connected',
    message: 'Metabase connection test successful',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para cards do Metabase
app.get('/api/metabase/cards/:cardId', (req, res) => {
  const { cardId } = req.params;
  console.log(`✅ GET /api/metabase/cards/${cardId}`);
  
  // Dados de exemplo para diferentes cards
  const cardData = {
    1: { title: 'Receitas Totais', value: 'R$ 125.430,00', type: 'currency' },
    2: { title: 'Despesas Totais', value: 'R$ 89.250,00', type: 'currency' },
    3: { title: 'Lucro Líquido', value: 'R$ 36.180,00', type: 'currency' },
    4: { title: 'Margem de Lucro', value: '28.8%', type: 'percentage' },
    5: { title: 'Vendas do Mês', value: '1,247', type: 'number' },
    6: { title: 'Clientes Ativos', value: '892', type: 'number' },
    7: { title: 'Ticket Médio', value: 'R$ 156,80', type: 'currency' },
    8: { title: 'Taxa de Conversão', value: '3.2%', type: 'percentage' }
  };

  const data = cardData[cardId] || { title: `Card ${cardId}`, value: 'N/A', type: 'text' };
  
  res.json({
    success: true,
    data: {
      id: cardId,
      ...data,
      chart_data: [
        { x: '2025-01', y: Math.floor(Math.random() * 1000) + 500 },
        { x: '2025-02', y: Math.floor(Math.random() * 1000) + 500 },
        { x: '2025-03', y: Math.floor(Math.random() * 1000) + 500 }
      ]
    }
  });
});

// Endpoint para embed de cards
app.get('/api/metabase/cards/:cardId/embed', (req, res) => {
  const { cardId } = req.params;
  console.log(`✅ GET /api/metabase/cards/${cardId}/embed`);
  
  res.json({
    success: true,
    embed_url: `http://localhost:3001/embed/card/${cardId}`,
    iframe_url: `http://localhost:3001/embed/iframe/${cardId}`
  });
});

// Endpoint para JWT de embed
app.get('/api/metabase/cards/:cardId/embed/jwt', (req, res) => {
  const { cardId } = req.params;
  console.log(`✅ GET /api/metabase/cards/${cardId}/embed/jwt`);
  
  res.json({
    success: true,
    jwt_token: `fake-jwt-token-for-card-${cardId}`,
    embed_url: `http://localhost:3001/embed/card/${cardId}?token=fake-jwt-token-for-card-${cardId}`
  });
});

// Endpoint para iframe de embed
app.get('/api/metabase/cards/:cardId/embed/iframe', (req, res) => {
  const { cardId } = req.params;
  console.log(`✅ GET /api/metabase/cards/${cardId}/embed/iframe`);
  
  res.send(`
    <iframe 
      src="http://localhost:3001/embed/card/${cardId}" 
      width="100%" 
      height="400" 
      frameborder="0">
    </iframe>
  `);
});

// Endpoint de health check
app.get('/health', (req, res) => {
  console.log('✅ GET /health');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log(`❓ 404 - ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Test endpoints:`);
  console.log(`   GET /api/metabase/status`);
  console.log(`   GET /health`);
});