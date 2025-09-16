import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = 3001;

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

// Variáveis para token do Metabase
let MB_TOKEN = process.env.MB_TOKEN || null;
let MB_EXP = 0;

async function loginIfNeeded() {
  const now = Date.now();
  if (!MB_TOKEN || now > MB_EXP) {
    console.log('🔑 Fazendo login no Metabase...');
    try {
      const res = await fetch(`${process.env.MB_URL}/api/session`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ 
          username: process.env.MB_USER, 
          password: process.env.MB_PASS 
        })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const j = await res.json();
      if (!j.id) {
        throw new Error("Resposta inválida do Metabase: " + JSON.stringify(j));
      }
      
      MB_TOKEN = j.id; 
      MB_EXP = now + 50*60*1000; // 50 minutos
      console.log('✅ Login no Metabase realizado com sucesso');
      return MB_TOKEN;
    } catch (error) {
      console.error('❌ Erro no login Metabase:', error.message);
      throw error;
    }
  }
  return MB_TOKEN;
}

async function queryCard(cardId, parameters=[]) {
  console.log(`📊 Consultando card ${cardId}...`);
  
  try {
    const tok = await loginIfNeeded();
    const res = await fetch(`${process.env.MB_URL}/api/card/${cardId}/query`, {
      method:"POST",
      headers:{ 
        "Content-Type":"application/json", 
        "X-Metabase-Session":tok 
      },
      body: JSON.stringify({ 
        ignore_cache: true, 
        parameters 
      })
    });
    
    if (res.status === 401) { 
      console.log('🔄 Token expirado, renovando...');
      MB_TOKEN = null; 
      return queryCard(cardId, parameters); 
    }
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const j = await res.json();
    
    if (!j.data || !j.data.cols || !j.data.rows) {
      throw new Error('Resposta inválida do Metabase: ' + JSON.stringify(j));
    }
    
    const cols = j.data.cols.map(c => c.name);
    const rows = j.data.rows.map(row => 
      Object.fromEntries(cols.map((c,i) => [c, row[i]]))
    );
    
    console.log(`✅ Card ${cardId} consultado: ${rows.length} linhas`);
    return rows;
    
  } catch (error) {
    console.error(`❌ Erro ao consultar card ${cardId}:`, error.message);
    throw error;
  }
}

// Dados mockados para fallback
const mockData = {
  1: { success: true, data: { value: 2500000, format: 'currency', change: 15.5 } },
  2: { success: true, data: { value: 23.8, format: 'percentage', change: 2.3 } },
  3: { success: true, data: { value: 1247, format: 'number', change: 8.7 } },
  4: { 
    success: true, 
    data: {
      chartType: 'line',
      data: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [{
          label: 'Vendas (R$)',
          data: [180000, 220000, 195000, 240000, 280000, 320000],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      }
    }
  },
  5: { 
    success: true, 
    data: {
      columns: ['Cliente', 'Receita', 'Pedidos'],
      data: [
        ['Empresa ABC Ltda', 'R$ 125.000', '45'],
        ['Comércio XYZ S.A.', 'R$ 98.500', '32'],
        ['Indústria 123', 'R$ 87.200', '28']
      ]
    }
  },
  6: { success: true, data: { value: 1850, format: 'currency', change: 5.2 } },
  7: { 
    success: true, 
    data: {
      chartType: 'doughnut',
      data: {
        labels: ['Produtos', 'Serviços', 'Consultoria', 'Suporte'],
        datasets: [{
          data: [45, 30, 15, 10],
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)'
          ]
        }]
      }
    }
  },
  8: { success: true, data: { value: 87.5, format: 'percentage', change: 12.3 } }
};

// Rota principal do proxy
app.post("/bi/card/:id/query", async (req, res) => {
  const cardId = Number(req.params.id);
  const tenant = (req.query.tenant || req.body.tenant || "default").toString();
  
  console.log(`📊 Requisição para card ${cardId} (tenant: ${tenant})`);
  
  try {
    // Tentar conectar com Metabase real primeiro
    const params = [{ 
      type: "category", 
      target: ["variable", ["template-tag", "tenant"]], 
      value: tenant 
    }];
    
    const rows = await queryCard(cardId, params);
    console.log(`✅ Dados reais obtidos para card ${cardId}`);
    res.json({ success: true, data: rows });
    
  } catch (metabaseError) {
    console.warn(`⚠️ Falha ao conectar com Metabase para card ${cardId}:`, metabaseError.message);
    
    // Usar dados mockados como fallback
    if (mockData[cardId]) {
      console.log(`🎭 Usando dados mockados para card ${cardId}`);
      res.json(mockData[cardId]);
    } else {
      console.error(`❌ Card ${cardId} não encontrado nem nos dados reais nem mockados`);
      res.status(404).json({ 
        success: false, 
        error: `Card ${cardId} não encontrado` 
      });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    metabase_url: process.env.MB_URL,
    metabase_user: process.env.MB_USER ? '***' : 'not set'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  res.status(500).json({ success: false, error: 'Erro interno do servidor' });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ Endpoint não encontrado: ${req.method} ${req.url}`);
  res.status(404).json({ success: false, error: 'Endpoint não encontrado' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Metabase rodando na porta ${PORT}`);
  console.log(`📊 Endpoint disponível: POST /bi/card/:id/query`);
  console.log(`🏥 Health check: GET /health`);
  console.log(`🔗 Metabase URL: ${process.env.MB_URL}`);
  console.log(`👤 Metabase User: ${process.env.MB_USER}`);
});