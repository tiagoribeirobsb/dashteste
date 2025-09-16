// ============================================
// SCRIPT DE AUDITORIA DIRETA - IA BRIDGE ANALYTICS
// Funciona sem precisar do information_schema
// ============================================

const { createClient } = require('@supabase/supabase-js');

// Configuração
const SUPABASE_URL = 'https://fetixpcyiolwzqalaauw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldGl4cGN5aW9sd3pxYWxhYXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc4MDU1MCwiZXhwIjoyMDcyMzU2NTUwfQ.YzJ440OnBMwWIPX6dPqRJ_eqrttVzmalaOzvIHibN2s';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Lista de tabelas esperadas conforme DBML
const EXPECTED_TABLES = {
  raw: ['customers', 'orders', 'order_items'],
  stg: ['customers', 'orders', 'order_items'],
  core: ['tenants', 'dim_date', 'dim_customers', 'dim_products', 'fact_orders', 'fact_order_items'],
  mart: ['sales_daily', 'sales_monthly', 'product_performance', 'kpi_current']
};

async function auditDatabase() {
  console.log('='.repeat(60));
  console.log('AUDITORIA IA BRIDGE ANALYTICS - SUPABASE');
  console.log('='.repeat(60));
  console.log('');

  const report = {
    schemas: {},
    tables: {},
    missing: [],
    found: [],
    errors: []
  };

  // Verificar cada schema e suas tabelas
  for (const [schema, tables] of Object.entries(EXPECTED_TABLES)) {
    console.log(`\n📁 Verificando schema: ${schema}`);
    console.log('-'.repeat(40));
    
    report.schemas[schema] = { exists: false, tables: {} };

    for (const table of tables) {
      const tableName = `${schema}.${table}`;
      console.log(`  Verificando tabela: ${tableName}`);
      
      try {
        // Tentar fazer SELECT COUNT(*) para verificar se a tabela existe
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('relation')) {
            console.log(`    ❌ Tabela NÃO existe`);
            report.missing.push(tableName);
            report.schemas[schema].tables[table] = { exists: false };
          } else if (error.message.includes('permission denied')) {
            console.log(`    ⚠️  Tabela existe mas sem permissão de leitura`);
            report.found.push(tableName);
            report.schemas[schema].tables[table] = { exists: true, permission: false };
            report.schemas[schema].exists = true;
          } else {
            console.log(`    ⚠️  Erro desconhecido: ${error.message}`);
            report.errors.push({ table: tableName, error: error.message });
          }
        } else {
          console.log(`    ✅ Tabela existe (${count ?? 0} registros)`);
          report.found.push(tableName);
          report.schemas[schema].tables[table] = { exists: true, count: count ?? 0 };
          report.schemas[schema].exists = true;

          // Tentar obter estrutura da tabela (1 registro como amostra)
          const { data: sample } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (sample && sample.length > 0) {
            const columns = Object.keys(sample[0]);
            report.schemas[schema].tables[table].columns = columns;
            console.log(`       Colunas detectadas: ${columns.join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`    ⚠️  Erro ao verificar: ${err.message}`);
        report.errors.push({ table: tableName, error: err.message });
      }
    }
  }

  // Gerar relatório final
  console.log('\n' + '='.repeat(60));
  console.log('RELATÓRIO FINAL');
  console.log('='.repeat(60));

  console.log('\n📊 RESUMO:');
  console.log(`  ✅ Tabelas encontradas: ${report.found.length}`);
  console.log(`  ❌ Tabelas ausentes: ${report.missing.length}`);
  console.log(`  ⚠️  Erros encontrados: ${report.errors.length}`);

  if (report.missing.length > 0) {
    console.log('\n❌ TABELAS AUSENTES:');
    report.missing.forEach(t => console.log(`  - ${t}`));
  }

  if (report.found.length > 0) {
    console.log('\n✅ TABELAS ENCONTRADAS:');
    report.found.forEach(t => console.log(`  - ${t}`));
  }

  if (report.errors.length > 0) {
    console.log('\n⚠️ ERROS:');
    report.errors.forEach(e => console.log(`  - ${e.table}: ${e.error}`));
  }

  // SQL para criar tabelas ausentes
  if (report.missing.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('SQL PARA CRIAR TABELAS AUSENTES:');
    console.log('='.repeat(60));
    console.log('\n-- Cole este SQL no Supabase SQL Editor:');
    console.log('-- ' + '-'.repeat(40));
    
    // Gerar CREATE SCHEMA se necessário
    const missingSchemas = new Set();
    report.missing.forEach(t => {
      const schema = t.split('.')[0];
      if (!report.schemas[schema].exists) {
        missingSchemas.add(schema);
      }
    });

    missingSchemas.forEach(schema => {
      console.log(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    });

    console.log('\n-- Agora execute o script SQL completo do DBML');
    console.log('-- para criar todas as tabelas ausentes com a estrutura correta');
  }

  return report;
}

// Executar auditoria
auditDatabase()
  .then(() => {
    console.log('\n✅ Auditoria concluída!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Erro na auditoria:', err);
    process.exit(1);
  });

// Salvar o script acima como audit.js e executar:
// npm install @supabase/supabase-js
// node audit.js