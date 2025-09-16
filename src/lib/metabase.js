import dotenv from 'dotenv';
dotenv.config();

import fetch from 'node-fetch';
import crypto from 'crypto';

const MB_URL = process.env.MB_URL || 'http://164.90.132.243:3001';
const MB_TOKEN = process.env.MB_TOKEN;

export async function queryMetabaseCard(cardId, tenant, params) {
  const url = `${MB_URL}/api/card/${cardId}/query`;
  
  // NÃO enviar parameters - deixar o Metabase usar os defaults
  const body = '{}';
  
  console.log(`📊 Chamando Metabase card ${cardId}`);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Metabase-Session': MB_TOKEN
    },
    body
  });

  if (![200, 202].includes(res.status)) {
    const error = await res.text();
    throw new Error(`Metabase card ${cardId} -> HTTP ${res.status}: ${error.substring(0,100)}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}
