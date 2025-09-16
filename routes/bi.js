import { Router } from "express";
import fetch from "node-fetch";

const r = Router();
let MB_TOKEN = process.env.MB_TOKEN || null;
let MB_EXP = 0;

async function loginIfNeeded() {
  const now = Date.now();
  if (!MB_TOKEN || now > MB_EXP) {
    const res = await fetch(`${process.env.MB_URL}/api/session`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ username: process.env.MB_USER, password: process.env.MB_PASS })
    });
    const j = await res.json();
    if (!j.id) throw new Error("Falha no login Metabase");
    MB_TOKEN = j.id; 
    MB_EXP = now + 50*60*1000;
  }
  return MB_TOKEN;
}

async function queryCard(cardId, parameters=[]) {
  const tok = await loginIfNeeded();
  const res = await fetch(`${process.env.MB_URL}/api/card/${cardId}/query`, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "X-Metabase-Session":tok },
    body: JSON.stringify({ ignore_cache:true, parameters })
  });
  if (res.status === 401) { 
    MB_TOKEN=null; 
    return queryCard(cardId, parameters); 
  }
  const j = await res.json();
  const cols = j.data.cols.map(c=>c.name);
  return j.data.rows.map(row => Object.fromEntries(cols.map((c,i)=>[c,row[i]])));
}

// Dados mockados para fallback
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

// Proxy por ID com tenant (usa cache simples, se quiser)
r.post("/bi/card/:id/query", async (req,res)=>{
  try {
    const id = Number(req.params.id);
    const tenant = (req.query.tenant || req.body.tenant || "default").toString();
    
    console.log(`📊 Requisição para card ${id} (tenant: ${tenant})`);
    
    // Tentar conectar com Metabase real primeiro
    try {
      const params = [{ type:"category", target:["variable",["template-tag","tenant"]], value:tenant }];
      const rows = await queryCard(id, params);
      console.log(`✅ Dados reais obtidos para card ${id}`);
      res.json({ success: true, data: rows });
      return;
    } catch (metabaseError) {
      console.warn(`⚠️ Falha ao conectar com Metabase para card ${id}:`, metabaseError.message);
      
      // Usar dados mockados como fallback
      if (mockData[id]) {
        console.log(`🎭 Usando dados mockados para card ${id}`);
        res.json(mockData[id]);
        return;
      }
      
      // Se não há dados mockados para este card, retornar erro genérico
      throw new Error(`Card ${id} não encontrado`);
    }
  } catch (e) { 
    console.error(`❌ Erro ao processar card ${req.params.id}:`, e.message);
    res.status(500).json({ success: false, error: e.message || String(e) }); 
  }
});

export default r;