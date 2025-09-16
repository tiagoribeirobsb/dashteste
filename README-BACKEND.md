# Copa Derma Dashboard - Backend Setup

## Visão Geral

Este backend fornece endpoints para upload de arquivos CSV que alimentam o dashboard da Copa Derma. Os dados são processados e armazenados no Supabase.

## Configuração

### 1. Instalar Dependências

```bash
npm install --save express multer csv-parse @supabase/supabase-js cors dotenv
npm install --save-dev nodemon
```

Ou usando o package-backend.json:

```bash
cp package-backend.json package.json
npm install
```

### 2. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Configure suas credenciais do Supabase no arquivo `.env`:
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
PORT=3001
```

### 3. Executar o Servidor

**Desenvolvimento:**
```bash
npm run dev
```

**Produção:**
```bash
npm start
```

O servidor estará disponível em `http://localhost:3001`

## Endpoints Disponíveis

### Upload de Arquivos

Todos os endpoints esperam:
- **Method:** POST
- **Content-Type:** multipart/form-data
- **Body:** 
  - `tenant`: ID do tenant (string)
  - `file`: Arquivo CSV

#### 1. Base de Clientes
**POST** `/upload-proxy/clients-master`

**Headers esperados no CSV:**
- `customer_key` (obrigatório)
- `customer_name` (obrigatório)
- `first_order_date` (obrigatório)
- `last_order_date` (obrigatório)
- `avg_cycle_days` (obrigatório)
- `city` (obrigatório)
- `state` (obrigatório)

#### 2. Vendas por Cliente
**POST** `/upload-proxy/sales-by-customer`

**Headers esperados no CSV:**
- `sale_date` (obrigatório)
- `customer_key` (obrigatório)
- `orders` (obrigatório)
- `revenue` (obrigatório)

#### 3. Vendas Diárias
**POST** `/upload-proxy/daily-sales`

**Headers esperados no CSV:**
- `sale_date` (obrigatório)
- `orders` (obrigatório)
- `revenue` (obrigatório)

#### 4. Status dos Pedidos
**POST** `/upload-proxy/order-status`

**Headers esperados no CSV:**
- `order_id` (obrigatório)
- `status` (obrigatório)
- `order_date` (obrigatório)
- `customer_key` (opcional)
- `revenue` (opcional)

#### 5. Top 20 Clientes
**POST** `/upload-proxy/top-clients`

**Headers esperados no CSV:**
- `customer_key` (obrigatório)
- `customer_name` (obrigatório)
- `total_revenue` (obrigatório)
- `orders_count` (opcional)
- `ranking_position` (opcional)

#### 6. Metas Mensais
**POST** `/upload-proxy/monthly-targets`

**Headers esperados no CSV:**
- `target_month` (obrigatório)
- `target_revenue` (obrigatório)
- `target_orders` (opcional)
- `actual_revenue` (opcional)
- `actual_orders` (opcional)

### Outros Endpoints

#### Health Check
**GET** `/health`

Retorna o status do servidor.

## Resposta dos Endpoints

### Sucesso
```json
{
  "ok": true,
  "rows": 150,
  "errors": 0
}
```

### Erro
```json
{
  "ok": false,
  "error": "Header obrigatório ausente: customer_key"
}
```

## Estrutura do Projeto

```
├── routes/
│   └── upload.js          # Rotas de upload
├── server.js              # Servidor principal
├── package-backend.json   # Dependências do backend
├── .env.example          # Exemplo de variáveis de ambiente
└── README-BACKEND.md     # Este arquivo
```

## Notas Importantes

1. **Service Role Key**: É necessário usar a Service Role Key do Supabase (não a anon key) para inserir dados nas tabelas.

2. **Validação**: Todos os endpoints validam se os headers obrigatórios estão presentes no CSV.

3. **Upsert**: Os dados são inseridos usando `upsert` para evitar duplicatas baseado nas chaves de conflito definidas.

4. **Formato de Números**: O sistema aceita números com vírgula ou ponto como separador decimal.

5. **CORS**: O servidor está configurado para aceitar requisições de qualquer origem (desenvolvimento).

## Troubleshooting

### Erro de Conexão com Supabase
- Verifique se as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão corretas
- Confirme se as tabelas existem no banco de dados

### Erro de Headers
- Verifique se o CSV possui todos os headers obrigatórios
- Confirme se não há espaços extras nos nomes dos headers

### Erro de Parsing
- Verifique se o arquivo está em formato CSV válido
- Confirme se a codificação do arquivo está correta (UTF-8)