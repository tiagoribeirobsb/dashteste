// test-bi-server.js - Servidor simples para testar a integração BI
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rota de teste simples para simular dados do Metabase
app.post('/bi/card/:id/query', (req, res) => {
  const cardId = req.params.id;
  const { parameters } = req.body;
  
  console.log(`📊 Requisição para card ${cardId}:`, parameters);
  
  // Dados simulados baseados no card ID
  const mockData = {
    1: { // KPI - Receita Total
      type: 'kpi',
      value: 1250000,
      format: 'currency',
      change: 12.5,
      period: 'mensal'
    },
    2: { // KPI - Margem
      type: 'kpi', 
      value: 23.8,
      format: 'percentage',
      change: 2.1,
      period: 'mensal'
    },
    3: { // KPI - Clientes Ativos
      type: 'kpi',
      value: 1847,
      format: 'number',
      change: 8.3,
      period: 'mensal'
    },
    4: { // KPI - Ticket Médio
      type: 'kpi',
      value: 677.50,
      format: 'currency',
      change: -3.2,
      period: 'mensal'
    },
    5: { // Gráfico - Receita por Mês
      type: 'chart',
      chartType: 'line',
      data: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [{
          label: 'Receita',
          data: [980000, 1050000, 1120000, 1180000, 1220000, 1250000],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }]
      }
    },
    6: { // Gráfico - Vendas por Categoria
      type: 'chart',
      chartType: 'doughnut',
      data: {
        labels: ['Eletrônicos', 'Roupas', 'Casa', 'Esportes', 'Livros'],
        datasets: [{
          data: [35, 25, 20, 15, 5],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        }]
      }
    },
    7: { // Tabela - Top Clientes
      type: 'table',
      columns: ['Cliente', 'Receita', 'Pedidos', 'Ticket Médio'],
      data: [
        ['Empresa ABC Ltda', 'R$ 125.000', '45', 'R$ 2.778'],
        ['Comércio XYZ S/A', 'R$ 98.500', '38', 'R$ 2.592'],
        ['Indústria 123', 'R$ 87.200', '29', 'R$ 3.007'],
        ['Varejo Premium', 'R$ 76.800', '52', 'R$ 1.477'],
        ['Tech Solutions', 'R$ 65.400', '24', 'R$ 2.725']
      ]
    },
    8: { // Tabela - Análise de Produtos
      type: 'table',
      columns: ['Produto', 'Vendas', 'Margem', 'Estoque'],
      data: [
        ['Smartphone Pro', '1.247', '28%', '156'],
        ['Notebook Ultra', '892', '22%', '89'],
        ['Tablet Max', '654', '31%', '234'],
        ['Smartwatch', '543', '35%', '178'],
        ['Fones Premium', '432', '42%', '267']
      ]
    }
  };
  
  const responseData = mockData[cardId] || {
    type: 'error',
    message: `Card ${cardId} não encontrado`
  };
  
  // Simular delay de rede
  setTimeout(() => {
    res.json({
      success: true,
      data: responseData,
      cardId: parseInt(cardId),
      timestamp: new Date().toISOString()
    });
  }, Math.random() * 1000 + 500); // 500-1500ms delay
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'BI Test Server',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🧪 BI Test Server rodando na porta ${PORT}`);
  console.log(`📊 Endpoint disponível: POST /bi/card/:id/query`);
  console.log(`✅ Status: GET /status`);
});