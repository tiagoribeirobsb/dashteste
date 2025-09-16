import dotenv from 'dotenv';
dotenv.config();

console.log('=== TESTE DE VARIÁVEIS ===');
console.log('CARD_VENDAS14_ID raw:', process.env.CARD_VENDAS14_ID);
console.log('CARD_VENDAS14_ID Number:', Number(process.env.CARD_VENDAS14_ID));
console.log('É NaN?:', isNaN(Number(process.env.CARD_VENDAS14_ID)));
console.log('MB_URL:', process.env.MB_URL);
console.log('MB_TOKEN:', process.env.MB_TOKEN?.substring(0,10) + '...');

// Testar leitura direta do .env
import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf8');
console.log('\n=== CONTEÚDO .env (primeiras 5 linhas) ===');
console.log(envContent.split('\n').slice(0,5).join('\n'));
console.log('\n=== LINHAS COM CARD_ ===');
console.log(envContent.split('\n').filter(l => l.includes('CARD_')).join('\n'));
