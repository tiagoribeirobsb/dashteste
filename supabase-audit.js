const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://fetixpcyiolwzqalaauw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldGl4cGN5aW9sd3pxYWxhYXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc4MDU1MCwiZXhwIjoyMDcyMzU2NTUwfQ.YzJ440OnBMwWIPX6dPqRJ_eqrttVzmalaOzvIHibN2s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(query) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });
    if (error) {
      console.log(`❌ Erro SQL: ${error.message}`);
      return null;
    }
    return data;
  } catch (err) {
    console.log(`❌ Erro de execução: ${err.message}`);
    return null;
  }
}

async function auditDatabase() {
  console.log('🔍 INICIANDO AUDITORIA DO BANCO SUPABASE');
  console.log('=' .repeat(50));
  
  const auditResults = {
    schemas: { found: [], missing: [] },
    tables: { found: [], missing: [] },
    errors: []
  };
  
  try {
    // 1. Testar conexão básica
    console.log('\n🔌 TESTANDO CONEXÃO...');
    const { data: testData, error: testError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro de conexão:', testError);
      auditResults.errors.push(`Conexão: ${testError.message}`);
      
      // Tentar método alternativo - listar tabelas do schema public
      console.log('\n🔄 TENTANDO MÉTODO ALTERNATIVO...');
      const { data: publicTables, error: publicError } = await supabase
        .from('pg_tables')
        .select('*')
        .eq('schemaname', 'public');
      
      if (publicError) {
        console.error('❌ Método alternativo falhou:', publicError);
        return auditResults;
      } else {
        console.log('✅ Conexão alternativa estabelecida!');
        console.log(`📋 Encontradas ${publicTables.length} tabelas no schema public`);
      }
    } else {
      console.log('✅ Conexão estabelecida com sucesso!');
    }
    
    // 2. Verificar schemas usando pg_namespace
    console.log('\n📁 VERIFICANDO SCHEMAS...');
    const { data: allSchemas, error: schemaError } = await supabase
      .from('pg_namespace')
      .select('nspname')
      .order('nspname');
    
    if (schemaError) {
      console.error('❌ Erro ao listar schemas:', schemaError);
      auditResults.errors.push(`Schemas: ${schemaError.message}`);
    } else {
      console.log('📋 Schemas encontrados:');
      allSchemas.forEach(schema => {
        console.log(`   - ${schema.nspname}`);
      });
      
      // Verificar schemas esperados
      const expectedSchemas = ['raw', 'stg', 'core', 'mart'];
      const foundSchemas = allSchemas.map(s => s.nspname);
      
      expectedSchemas.forEach(schema => {
        if (foundSchemas.includes(schema)) {
          auditResults.schemas.found.push(schema);
          console.log(`✅ Schema '${schema}' encontrado`);
        } else {
          auditResults.schemas.missing.push(schema);
          console.log(`❌ Schema '${schema}' NÃO encontrado`);
        }
      });
    }
    
    // 3. Verificar tabelas usando pg_tables
    console.log('\n📊 VERIFICANDO TABELAS...');
    const { data: allTables, error: tableError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .in('schemaname', ['public', 'raw', 'stg', 'core', 'mart'])
      .order('schemaname')
      .order('tablename');
    
    if (tableError) {
      console.error('❌ Erro ao listar tabelas:', tableError);
      auditResults.errors.push(`Tabelas: ${tableError.message}`);
    } else {
      console.log('📋 Tabelas encontradas:');
      allTables.forEach(table => {
        console.log(`   - ${table.schemaname}.${table.tablename}`);
      });
      
      // Verificar tabelas esperadas por schema
      const expectedTables = {
        'raw': ['customers', 'orders', 'order_items'],
        'stg': ['customers', 'orders', 'order_items'],
        'core': ['tenants', 'dim_date', 'dim_customers', 'dim_products', 'fact_orders', 'fact_order_items'],
        'mart': ['sales_daily', 'sales_monthly', 'product_performance', 'kpi_current']
      };
      
      console.log('\n🔍 VERIFICANDO TABELAS ESPERADAS...');
      
      for (const [schema, tables] of Object.entries(expectedTables)) {
        console.log(`\n📁 Schema: ${schema}`);
        
        const schemaTables = allTables
          .filter(t => t.schemaname === schema)
          .map(t => t.tablename);
        
        tables.forEach(expectedTable => {
          const fullTableName = `${schema}.${expectedTable}`;
          if (schemaTables.includes(expectedTable)) {
            auditResults.tables.found.push(fullTableName);
            console.log(`   ✅ ${expectedTable}`);
          } else {
            auditResults.tables.missing.push(fullTableName);
            console.log(`   ❌ ${expectedTable} - NÃO ENCONTRADA`);
          }
        });
      }
    }
    
    // 4. Verificar colunas das tabelas encontradas usando pg_attribute
    console.log('\n📋 VERIFICANDO ESTRUTURA DAS TABELAS...');
    
    for (const tableRef of auditResults.tables.found) {
      const [schema, tableName] = tableRef.split('.');
      
      try {
        // Usar uma query mais simples para obter informações da tabela
        const { data: tableInfo, error: infoError } = await supabase
          .from('pg_tables')
          .select('*')
          .eq('schemaname', schema)
          .eq('tablename', tableName)
          .single();
        
        if (infoError) {
          console.log(`❌ ${tableRef}: Erro ao obter informações - ${infoError.message}`);
          auditResults.errors.push(`${tableRef} info: ${infoError.message}`);
        } else {
          console.log(`\n📊 ${tableRef}: Tabela confirmada`);
          console.log(`   - Owner: ${tableInfo.tableowner}`);
          console.log(`   - Has indexes: ${tableInfo.hasindexes ? 'Sim' : 'Não'}`);
          console.log(`   - Has rules: ${tableInfo.hasrules ? 'Sim' : 'Não'}`);
        }
      } catch (err) {
        console.log(`❌ ${tableRef}: Erro inesperado - ${err.message}`);
        auditResults.errors.push(`${tableRef}: ${err.message}`);
      }
    }
    
    // 5. Verificar índices usando pg_indexes
    console.log('\n🔗 VERIFICANDO ÍNDICES...');
    try {
      const { data: indexes, error: indexError } = await supabase
        .from('pg_indexes')
        .select('schemaname, tablename, indexname')
        .in('schemaname', ['raw', 'stg', 'core', 'mart'])
        .order('schemaname')
        .order('tablename');
      
      if (indexError) {
        console.error('❌ Erro ao verificar índices:', indexError);
        auditResults.errors.push(`Índices: ${indexError.message}`);
      } else {
        console.log(`📋 ${indexes.length} índices encontrados:`);
        indexes.forEach(idx => {
          console.log(`   - ${idx.schemaname}.${idx.tablename}: ${idx.indexname}`);
        });
      }
    } catch (err) {
      console.log(`❌ Erro ao acessar pg_indexes: ${err.message}`);
      auditResults.errors.push(`pg_indexes: ${err.message}`);
    }
    
    // 6. Verificar se há dados nas tabelas encontradas
    console.log('\n📊 VERIFICANDO DADOS NAS TABELAS...');
    
    for (const tableRef of auditResults.tables.found.slice(0, 5)) { // Limitar a 5 tabelas para não sobrecarregar
      const [schema, tableName] = tableRef.split('.');
      
      try {
        const { count, error: countError } = await supabase
          .from(`${schema}.${tableName}`)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.log(`❌ ${tableRef}: Erro ao contar registros - ${countError.message}`);
        } else {
          console.log(`📊 ${tableRef}: ${count || 0} registros`);
        }
      } catch (err) {
        console.log(`❌ ${tableRef}: Erro ao acessar dados - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral na auditoria:', error);
    auditResults.errors.push(`Geral: ${error.message}`);
  }
  
  // Resumo final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA AUDITORIA');
  console.log('='.repeat(50));
  console.log(`✅ Schemas encontrados: ${auditResults.schemas.found.length}/4`);
  console.log(`❌ Schemas ausentes: ${auditResults.schemas.missing.length}`);
  console.log(`✅ Tabelas encontradas: ${auditResults.tables.found.length}`);
  console.log(`❌ Tabelas ausentes: ${auditResults.tables.missing.length}`);
  console.log(`⚠️ Erros encontrados: ${auditResults.errors.length}`);
  
  if (auditResults.schemas.missing.length > 0) {
    console.log('\n❌ SCHEMAS AUSENTES:');
    auditResults.schemas.missing.forEach(schema => console.log(`   - ${schema}`));
  }
  
  if (auditResults.tables.missing.length > 0) {
    console.log('\n❌ TABELAS AUSENTES:');
    auditResults.tables.missing.forEach(table => console.log(`   - ${table}`));
  }
  
  if (auditResults.errors.length > 0) {
    console.log('\n⚠️ ERROS ENCONTRADOS:');
    auditResults.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  console.log('\n🏁 AUDITORIA CONCLUÍDA');
  return auditResults;
}

// Executar auditoria
auditDatabase().then(results => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Falha crítica:', error);
  process.exit(1);
});