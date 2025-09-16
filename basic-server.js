import http from 'http';
import https from 'https';
import url from 'url';
import fs from 'fs';

const PORT = 3001;

// Carregar variáveis de ambiente
let envVars = {};
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.log('⚠️ Arquivo .env não encontrado, usando apenas dados mockados');
}

// Variáveis para token do Metabase
let MB_TOKEN = null;
let MB_EXP = 0;

// Contador para debug
let FUNCTION_CALL_COUNT = 0;

async function makeRequest(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlString);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Erro na requisição HTTP:', error.message);
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function loginToMetabase() {
  if (!envVars.MB_URL || !envVars.MB_USER || !envVars.MB_PASS) {
    throw new Error('Credenciais do Metabase não configuradas');
  }
  
  console.log('🔑 Fazendo login no Metabase...');
  console.log('🔗 URL:', envVars.MB_URL);
  console.log('👤 User:', envVars.MB_USER);
  
  const response = await makeRequest(`${envVars.MB_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: envVars.MB_USER,
      password: envVars.MB_PASS
    })
  });
  
  if (response.status !== 200 || !response.data.id) {
    throw new Error(`Login falhou: ${response.status} - ${JSON.stringify(response.data)}`);
  }
  
  MB_TOKEN = response.data.id;
  MB_EXP = Date.now() + 50 * 60 * 1000; // 50 minutos
  console.log('✅ Login no Metabase realizado com sucesso');
  return MB_TOKEN;
}

async function queryMetabaseCard(cardId, parameters = []) {
  FUNCTION_CALL_COUNT++;
  process.stdout.write(`🔥🔥🔥 CHAMADA #${FUNCTION_CALL_COUNT} DA FUNÇÃO! 🔥🔥🔥\n`);
  process.stdout.write('🚨🚨🚨 STDOUT - INÍCIO ABSOLUTO DA FUNÇÃO 🚨🚨🚨\n');
  process.stderr.write('🚨🚨🚨 STDERR - INÍCIO ABSOLUTO DA FUNÇÃO 🚨🚨🚨\n');
  console.log('=== TESTE LOG ===');
  console.log(`🚀 INÍCIO - queryMetabaseCard chamada para card ${cardId}`);
  console.log('✅ LOGS INICIAIS EXECUTADOS COM SUCESSO!');
  console.log(`📊 Consultando Metabase card ${cardId}...`);
  
  // Verificar se precisa fazer login
  if (!MB_TOKEN || Date.now() > MB_EXP) {
    console.log('🔑 Token não existe ou expirado, fazendo login...');
    console.log('🚨 PRESTES A CHAMAR loginToMetabase 🚨');
    await loginToMetabase();
    console.log('✅ loginToMetabase CONCLUÍDO!');
  }
  
  console.log(`🌐 Fazendo requisição para: ${envVars.MB_URL}/api/card/${cardId}/query`);
  console.log('📝 Parâmetros:', JSON.stringify(parameters));
  
  const response = await makeRequest(`${envVars.MB_URL}/api/card/${cardId}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Metabase-Session': MB_TOKEN
    },
    body: JSON.stringify({
      ignore_cache: true,
      parameters
    })
  });
  
  console.log('📡 Resposta recebida do Metabase');
  
  if (response.status === 401) {
    console.log('🔄 Token expirado, renovando...');
    MB_TOKEN = null;
    return queryMetabaseCard(cardId, parameters);
  }
  
  process.stdout.write(`🔍 Status HTTP: ${response.status} (tipo: ${typeof response.status})\n`);
  
  // Metabase pode retornar 200 ou 202 para queries bem-sucedidas
  if (response.status !== 200 && response.status !== 202) {
    process.stdout.write(`🚨 PRESTES A LANÇAR ERRO - STATUS ${response.status} NÃO É 200 NEM 202 🚨\n`);
    throw new Error(`🚨 Status HTTP inválido! Chamada #${FUNCTION_CALL_COUNT}, CardId: ${cardId}, Params: ${JSON.stringify(parameters)}, Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
  }
  
  process.stdout.write('✅ STATUS 200 - CONTINUANDO...\n');
  
  process.stdout.write(`🔍 Status da query: ${response.data.status}\n`);
  process.stdout.write(`🔍 Chaves da resposta: ${Object.keys(response.data)}\n`);
  process.stdout.write(`🔍 Tem data? ${!!response.data.data}\n`);
  
  // Verificar se a query foi completada com sucesso
  if (response.data.status !== 'completed') {
    throw new Error(`Query não completada: ${response.data.status}`);
  }
  
  if (!response.data || !response.data.data || !response.data.data.cols || !response.data.data.rows) {
    console.log('🔍 Estrutura data:', response.data ? Object.keys(response.data) : 'null');
    console.log('🔍 Estrutura data.data:', response.data.data ? Object.keys(response.data.data) : 'null');
    throw new Error('Resposta inválida do Metabase');
  }
  
  const cols = response.data.data.cols.map(c => c.display_name || c.name);
  const rows = response.data.data.rows.map(row => 
    Object.fromEntries(cols.map((c, i) => [c, row[i]]))
  );
  
  console.log(`✅ Card ${cardId} consultado: ${rows.length} linhas`);
  return rows;
}

// Dados mockados
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

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  
  console.log(new Date().toISOString(), method, path);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    }));
    return;
  }
  
  // Rota do proxy BI
  const biMatch = path.match(/^\/bi\/card\/(\d+)\/query$/);
  if (biMatch && method === 'POST') {
    const cardId = parseInt(biMatch[1]);
    const tenant = parsedUrl.query.tenant || 'default';
    console.log(`📊 Requisição para card ${cardId} (tenant: ${tenant})`);
    
    try {
      // Tentar conectar com Metabase real primeiro
      if (envVars.MB_URL && envVars.MB_USER && envVars.MB_PASS) {
        let rows;
        
        try {
          // Primeiro tentar com parâmetro tenant
          const params = [{
            type: "category",
            target: ["variable", ["template-tag", "tenant"]],
            value: tenant
          }];
          console.log(`🔄 Tentando card ${cardId} com parâmetro tenant...`);
          console.log('🚨 PRESTES A CHAMAR queryMetabaseCard 🚨');
          rows = await queryMetabaseCard(cardId, params);
        } catch (paramError) {
          console.log(`🔄 Card ${cardId} não aceita parâmetro tenant (${paramError.message}), tentando sem parâmetros...`);
          // Se falhar, tentar sem parâmetros
          try {
            rows = await queryMetabaseCard(cardId, []);
          } catch (noParamError) {
            console.log(`❌ Falha na segunda tentativa sem parâmetros:`, noParamError.message);
            throw noParamError;
          }
        }
        
        console.log(`✅ Dados reais obtidos para card ${cardId}:`, rows.length, 'linhas');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: rows }));
        return;
      }
    } catch (metabaseError) {
      console.warn(`⚠️ Falha ao conectar com Metabase para card ${cardId}:`);
      console.warn(`🚨 ERRO COMPLETO:`, metabaseError);
      console.warn(`📝 MENSAGEM:`, metabaseError.message);
      console.warn(`⚠️ Stack trace:`, metabaseError.stack);
    }
    
    // Usar dados mockados como fallback
    if (mockData[cardId]) {
      console.log(`🎭 Usando dados mockados para card ${cardId}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockData[cardId]));
    } else {
      console.log(`❌ Card ${cardId} não encontrado nem nos dados reais nem mockados`);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: `Card ${cardId} não encontrado` 
      }));
    }
    return;
  }
  
  // 404 para outras rotas
  console.log(`❌ Endpoint não encontrado: ${method} ${path}`);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor básico rodando na porta ${PORT}`);
  console.log(`📊 Endpoint disponível: POST /bi/card/:id/query`);
  console.log(`🏥 Health check: GET /health`);
});

// Tratamento de erros
server.on('error', (err) => {
  console.error('❌ Erro no servidor:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Exceção não capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
});