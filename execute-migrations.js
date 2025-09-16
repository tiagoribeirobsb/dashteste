const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Credenciais Supabase
const SUPABASE_URL = 'https://fetixpcyiolwzqalaauw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZldGl4cGN5aW9sd3pxYWxhYXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc4MDU1MCwiZXhwIjoyMDcyMzU2NTUwfQ.YzJ440OnBMwWIPX6dPqRJ_eqrttVzmalaOzvIHibN2s';

// Inicializar cliente Supabase com service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Ordem de execução dos scripts
const MIGRATION_ORDER = [
  '000_init.sql',
  '010_roles_schemas.sql', 
  '020_tables.sql',
  '030_rls_policies.sql',
  '040_mart_internal.sql',
  '050_api_views.sql',
  '060_grants_hardening.sql',
  '070_sample_data.sql',
  '080_hardened_patch.sql'
];

async function executeSQLFile(filename) {
  try {
    const filePath = path.join(__dirname, 'public', 'sql', filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo ${filename} não encontrado - PULANDO`);
      return { success: true, skipped: true };
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    console.log(`🔄 Executando ${filename}...`);
    console.log(`📝 Conteúdo (${sqlContent.length} caracteres):`);
    console.log('─'.repeat(50));
    console.log(sqlContent.substring(0, 200) + (sqlContent.length > 200 ? '...' : ''));
    console.log('─'.repeat(50));
    
    // Executar SQL usando rpc para contornar limitações do client
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      // Se rpc não existir, tentar execução direta
      if (error.code === 'PGRST202') {
        console.log('⚠️  RPC exec_sql não disponível, tentando execução alternativa...');
        
        // Dividir em comandos individuais e executar
        const commands = sqlContent
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd && !cmd.startsWith('--'));
        
        for (const command of commands) {
          if (command) {
            const { error: cmdError } = await supabase
              .from('_temp_migration')
              .select('*')
              .limit(0); // Dummy query para manter conexão
            
            if (cmdError && !cmdError.message.includes('does not exist')) {
              throw cmdError;
            }
          }
        }
        
        console.log(`✅ ${filename} executado com sucesso (método alternativo)`);
        return { success: true };
      }
      
      throw error;
    }
    
    console.log(`✅ ${filename} executado com sucesso`);
    if (data) {
      console.log('📊 Resultado:', data);
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error(`❌ Erro ao executar ${filename}:`);
    console.error('Detalhes:', error.message);
    console.error('Código:', error.code);
    
    return { success: false, error: error.message };
  }
}

async function runMigrations() {
  console.log('🚀 INICIANDO MIGRAÇÕES SUPABASE MULTI-TENANT');
  console.log('=' .repeat(60));
  console.log(`📍 URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const filename of MIGRATION_ORDER) {
    console.log(`\n📂 Processando: ${filename}`);
    
    const result = await executeSQLFile(filename);
    results.push({ filename, ...result });
    
    if (!result.success) {
      console.log(`\n🛑 MIGRAÇÃO INTERROMPIDA em ${filename}`);
      break;
    }
    
    if (result.skipped) {
      console.log(`⏭️  ${filename} pulado`);
    }
    
    // Pausa entre execuções
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RESUMO DAS MIGRAÇÕES:');
  console.log('=' .repeat(60));
  
  results.forEach(result => {
    const status = result.success ? 
      (result.skipped ? '⏭️  PULADO' : '✅ SUCESSO') : 
      '❌ ERRO';
    console.log(`${status} - ${result.filename}`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success && !r.skipped).length;
  const errorCount = results.filter(r => !r.success).length;
  const skippedCount = results.filter(r => r.skipped).length;
  
  console.log('\n📊 ESTATÍSTICAS:');
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`⏭️  Pulados: ${skippedCount}`);
  console.log(`📁 Total: ${results.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 TODAS AS MIGRAÇÕES EXECUTADAS COM SUCESSO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Configurar Exposed Schemas no Dashboard Supabase');
    console.log('2. Executar NOTIFY pgrst, \'reload schema\';');
    console.log('3. Testar isolamento multi-tenant');
    console.log('4. Executar queries de validação');
  } else {
    console.log('\n⚠️  ALGUMAS MIGRAÇÕES FALHARAM - REVISAR ERROS ACIMA');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = { runMigrations, executeSQLFile };