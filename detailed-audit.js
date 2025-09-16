// ============================================
// AUDITORIA DETALHADA - IA BRIDGE ANALYTICS
// Verifica estrutura, colunas, tipos e relacionamentos
// ============================================

const { createClient } = require('@supabase/supabase-js');

// Configuração
const SUPABASE_URL = 'https://fetixpcyiolwzqalaauw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldGl4cGN5aW9sd3pxYWxhYXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc4MDU1MCwiZXhwIjoyMDcyMzU2NTUwfQ.YzJ440OnBMwWIPX6dPqRJ_eqrttVzmalaOzvIHibN2s';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Estrutura esperada conforme DBML (usando apenas nome da tabela)
const EXPECTED_STRUCTURE = {
  'customers': {
    schema: 'raw',
    columns: ['id', 'name', 'email', 'phone', 'address', 'created_at', 'updated_at'],
    primaryKey: 'id'
  },
  'orders': {
    schema: 'raw', 
    columns: ['id', 'customer_id', 'order_date', 'status', 'total_amount', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: [{ column: 'customer_id', references: 'customers.id' }]
  },
  'order_items': {
    schema: 'raw',
    columns: ['id', 'order_id', 'product_name', 'quantity', 'unit_price', 'total_price', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: [{ column: 'order_id', references: 'orders.id' }]
  },
  'tenants': {
    schema: 'core',
    columns: ['id', 'name', 'created_at', 'updated_at'],
    primaryKey: 'id'
  },
  'dim_date': {
    schema: 'core',
    columns: ['date_key', 'date', 'year', 'month', 'day', 'quarter', 'week_of_year', 'day_of_week', 'is_weekend'],
    primaryKey: 'date_key'
  },
  'dim_customers': {
    schema: 'core',
    columns: ['customer_key', 'customer_id', 'name', 'email', 'phone', 'address', 'created_at', 'updated_at'],
    primaryKey: 'customer_key'
  },
  'dim_products': {
    schema: 'core',
    columns: ['product_key', 'product_name', 'category', 'created_at', 'updated_at'],
    primaryKey: 'product_key'
  },
  'fact_orders': {
    schema: 'core',
    columns: ['order_key', 'order_id', 'customer_key', 'date_key', 'order_date', 'status', 'total_amount'],
    primaryKey: 'order_key',
    foreignKeys: [
      { column: 'customer_key', references: 'dim_customers.customer_key' },
      { column: 'date_key', references: 'dim_date.date_key' }
    ]
  },
  'fact_order_items': {
    schema: 'core',
    columns: ['order_item_key', 'order_key', 'product_key', 'quantity', 'unit_price', 'total_price'],
    primaryKey: 'order_item_key',
    foreignKeys: [
      { column: 'order_key', references: 'fact_orders.order_key' },
      { column: 'product_key', references: 'dim_products.product_key' }
    ]
  },
  'sales_daily': {
    schema: 'mart',
    columns: ['date', 'total_sales', 'total_orders', 'avg_order_value'],
    primaryKey: 'date'
  },
  'sales_monthly': {
    schema: 'mart',
    columns: ['year_month', 'total_sales', 'total_orders', 'avg_order_value'],
    primaryKey: 'year_month'
  },
  'product_performance': {
    schema: 'mart',
    columns: ['product_name', 'total_quantity', 'total_revenue', 'avg_price'],
    primaryKey: 'product_name'
  },
  'kpi_current': {
    schema: 'mart',
    columns: ['metric_name', 'metric_value', 'last_updated'],
    primaryKey: 'metric_name'
  }
};

// Mapear tabelas por schema
const TABLES_BY_SCHEMA = {
  raw: ['customers', 'orders', 'order_items'],
  stg: ['customers', 'orders', 'order_items'], // STG tem mesma estrutura que RAW
  core: ['tenants', 'dim_date', 'dim_customers', 'dim_products', 'fact_orders', 'fact_order_items'],
  mart: ['sales_daily', 'sales_monthly', 'product_performance', 'kpi_current']
};

async function detailedAudit() {
  console.log('='.repeat(80));
  console.log('AUDITORIA DETALHADA - IA BRIDGE ANALYTICS');
  console.log('='.repeat(80));
  console.log('');

  const report = {
    schemas: {},
    tables: {},
    issues: [],
    summary: {
      tablesChecked: 0,
      columnsMatched: 0,
      columnsMissing: 0,
      extraColumns: 0,
      structureIssues: 0
    }
  };

  // Verificar cada schema
  for (const [schemaName, tableList] of Object.entries(TABLES_BY_SCHEMA)) {
    console.log(`\n📁 SCHEMA: ${schemaName.toUpperCase()}`);
    console.log('='.repeat(60));
    
    report.schemas[schemaName] = { tables: {}, issues: [] };

    for (const tableName of tableList) {
      const fullTableName = `${schemaName}.${tableName}`;
      console.log(`\n🔍 Auditando: ${fullTableName}`);
      console.log('-'.repeat(40));
      
      report.tables[fullTableName] = {
        exists: false,
        columns: [],
        missingColumns: [],
        extraColumns: [],
        issues: []
      };

      try {
        // Usar o nome completo como no primeiro script que funcionou
        const { data, error, count } = await supabase
          .from(fullTableName)
          .select('*', { count: 'exact' })
          .limit(1);

        if (error) {
          console.log(`    ❌ Erro: ${error.message}`);
          report.issues.push(`${fullTableName}: ${error.message}`);
          continue;
        }

        report.tables[fullTableName].exists = true;
        report.summary.tablesChecked++;
        
        console.log(`    ✅ Tabela existe (${count ?? 0} registros)`);

        // Verificar estrutura se há dados ou tentar inserir dados de teste
        if (data && data.length > 0) {
          const actualColumns = Object.keys(data[0]);
          report.tables[fullTableName].columns = actualColumns;
          
          console.log(`    📋 Colunas: ${actualColumns.join(', ')}`);
          
          // Usar estrutura esperada baseada no schema
          let expectedStructure;
          if (schemaName === 'stg') {
            // STG tem mesma estrutura que RAW
            expectedStructure = EXPECTED_STRUCTURE[tableName];
          } else {
            expectedStructure = EXPECTED_STRUCTURE[tableName];
          }
          
          if (expectedStructure) {
            const missingColumns = expectedStructure.columns.filter(col => !actualColumns.includes(col));
            const extraColumns = actualColumns.filter(col => !expectedStructure.columns.includes(col));
            
            if (missingColumns.length > 0) {
              console.log(`    ⚠️  Ausentes: ${missingColumns.join(', ')}`);
              report.tables[fullTableName].missingColumns = missingColumns;
              report.summary.columnsMissing += missingColumns.length;
              report.issues.push(`${fullTableName}: Colunas ausentes - ${missingColumns.join(', ')}`);
            }
            
            if (extraColumns.length > 0) {
              console.log(`    ➕ Extras: ${extraColumns.join(', ')}`);
              report.tables[fullTableName].extraColumns = extraColumns;
              report.summary.extraColumns += extraColumns.length;
            }
            
            if (missingColumns.length === 0 && extraColumns.length === 0) {
              console.log(`    ✅ Estrutura conforme DBML`);
              report.summary.columnsMatched += actualColumns.length;
            }
          } else {
            console.log(`    ⚠️  Estrutura esperada não definida`);
          }
        } else {
          console.log(`    📋 Tabela vazia - estrutura não verificável`);
          report.tables[fullTableName].issues.push('Tabela vazia');
        }
        
      } catch (err) {
        console.log(`    ❌ Erro inesperado: ${err.message}`);
        report.issues.push(`${fullTableName}: ${err.message}`);
        report.summary.structureIssues++;
      }
    }
  }

  // Relatório final
  console.log('\n' + '='.repeat(80));
  console.log('RELATÓRIO FINAL DE CONFORMIDADE');
  console.log('='.repeat(80));

  console.log('\n📊 RESUMO EXECUTIVO:');
  console.log(`  🔍 Tabelas verificadas: ${report.summary.tablesChecked}/16`);
  console.log(`  ✅ Colunas conformes: ${report.summary.columnsMatched}`);
  console.log(`  ❌ Colunas ausentes: ${report.summary.columnsMissing}`);
  console.log(`  ➕ Colunas extras: ${report.summary.extraColumns}`);
  console.log(`  ⚠️  Problemas: ${report.issues.length}`);

  // Análise por schema
  console.log('\n📁 ANÁLISE POR SCHEMA:');
  for (const schema of ['raw', 'stg', 'core', 'mart']) {
    const schemaTables = TABLES_BY_SCHEMA[schema];
    const schemaIssues = report.issues.filter(issue => issue.startsWith(schema));
    const status = schemaIssues.length === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${schema.toUpperCase()}: ${schemaTables.length} tabelas, ${schemaIssues.length} problemas`);
  }

  if (report.issues.length > 0) {
    console.log('\n⚠️ PROBLEMAS DETALHADOS:');
    report.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }

  // Cálculo de conformidade
  const totalExpected = 16;
  const conformityScore = report.summary.tablesChecked > 0 ? 
    ((report.summary.tablesChecked - report.issues.length) / totalExpected * 100) : 0;
  
  console.log(`\n📈 SCORE DE CONFORMIDADE: ${conformityScore.toFixed(1)}%`);

  if (conformityScore >= 90) {
    console.log('🎉 EXCELENTE! Banco altamente conforme com DBML');
  } else if (conformityScore >= 70) {
    console.log('👍 BOM! Algumas melhorias recomendadas');
  } else if (conformityScore >= 50) {
    console.log('⚠️  REGULAR! Várias correções necessárias');
  } else {
    console.log('❌ CRÍTICO! Estrutura precisa de revisão completa');
  }

  console.log('\n📋 PRÓXIMOS PASSOS:');
  if (report.summary.columnsMissing > 0) {
    console.log('  1. Adicionar colunas ausentes nas tabelas');
  }
  if (report.summary.extraColumns > 0) {
    console.log('  2. Revisar colunas extras (podem ser removidas ou documentadas)');
  }
  if (report.issues.length === 0) {
    console.log('  ✅ Nenhuma ação necessária - estrutura conforme!');
  }

  return report;
}

// Executar auditoria
detailedAudit()
  .then(() => {
    console.log('\n✅ Auditoria detalhada concluída!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Erro na auditoria:', err);
    process.exit(1);
  });