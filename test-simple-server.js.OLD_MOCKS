import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de log para todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Dados mockados
const mockData = {
  1: { // KPI - Receita Total
    success: true,
    data: {
      value: 2500000,
      format: 'currency',
      change: 15.5
    }
  },
  2: { // KPI - Margem de Lucro
    success: true,
    data: {
      value: 23.8,
      format: 'percentage',
      change: 2.3
    }
  },
  3: { // KPI - Clientes Ativos
    success: true,
    data: {
      value: 1247,
      format: 'number',
      change: 8.7
    }
  },
  4: { // Gráfico - Vendas por Mês
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
  5: { // Tabela - Top Clientes
    success: true,
    data: {
      columns: ['Cliente', 'Receita', 'Pedidos'],
      data: [
        ['Empresa ABC Ltda', 'R$ 125.000', '45'],
        ['Comércio XYZ S.A.', 'R$ 98.500', '32'],
        ['Indústria 123', 'R$ 87.200', '28'],
        ['Distribuidora DEF', 'R$ 76.800', '24'],
        ['Varejo GHI', 'R$ 65.400', '19']
      ]
    }
  },
  6: { // KPI - Ticket Médio
    success: true,
    data: {
      value: 1850,
      format: 'currency',
      change: 5.2
    }
  },
  7: { // Gráfico - Receita por Categoria
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
  8: { // KPI - Meta do Mês
    success: true,
    data: {
      value: 87.5,
      format: 'percentage',
      change: 12.3
    }
  }
};

// Rota principal para cards BI
app.post('/bi/card/:id/query', (req, res) => {
  const id = Number(req.params.id);
  const tenant = req.query.tenant || req.body.tenant || "default";
  
  console.log(`📊 Requisição para card ${id} (tenant: ${tenant})`);
  
  if (mockData[id]) {
    console.log(`✅ Retornando dados mockados para card ${id}`);
    res.json(mockData[id]);
  } else {
    console.log(`❌ Card ${id} não encontrado`);
    res.status(404).json({ success: false, error: `Card ${id} não encontrado` });
  }
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ success: false, error: 'Erro interno do servidor' });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
  console.log(`📊 Endpoint disponível: POST /bi/card/:id/query`);
  console.log(`💚 Status: GET /status`);
});

// Manter o processo vivo e tratar erros
server.on('error', (err) => {
  console.error('Erro no servidor:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Exceção não capturada:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Servidor sendo encerrado...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Servidor sendo encerrado...');
  server.close(() => {
    process.exit(0);
  });
});

// Manter o processo vivo
setInterval(() => {
  // Heartbeat para manter o processo ativo
}, 30000);