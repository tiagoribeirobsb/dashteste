import dotenv from 'dotenv';
dotenv.config(); // CARREGAR AQUI TAMBÉM!

import express from 'express';
import { queryMetabaseCard } from '../lib/metabase.js';
import { toScalar, toTable, toTimeseries } from '../lib/normalizers.js';

const router = express.Router();
const TENANT_DEFAULT = process.env.MB_TENANT_DEFAULT || 'default';

const ID = {
  SAUDE: Number(process.env.CARD_SAUDE_ID),
  PARETO: Number(process.env.CARD_PARETO_ID),
  REATIVA: Number(process.env.CARD_REATIVA_ID),
  VENDAS14: Number(process.env.CARD_VENDAS14_ID),
  STATUS14: Number(process.env.CARD_STATUS14_ID),
  TOP20: Number(process.env.CARD_TOP20_ID),
};

console.log('✅ Cards carregados:', ID);

function must(n) { 
  if (!n || isNaN(n)) throw new Error('Card ID ausente no .env'); 
}

router.get('/kpi/vendas-14d', async (req, res) => {
  try {
    must(ID.VENDAS14);
    const tenant = String(req.query.tenant ?? TENANT_DEFAULT);
    const mb = await queryMetabaseCard(ID.VENDAS14, tenant, { tenant });
    res.json(toTimeseries(mb, 'vendas'));
  } catch (e) { 
    res.status(500).json({ error: e.message });
  }
});

router.get('/kpi/top20-30d', async (req, res) => {
  try {
    must(ID.TOP20);
    const tenant = String(req.query.tenant ?? TENANT_DEFAULT);
    const mb = await queryMetabaseCard(ID.TOP20, tenant, { tenant });
    res.json(toTable(mb));
  } catch (e) { 
    res.status(500).json({ error: e.message });
  }
});

router.get('/kpi/saude-base', async (req, res) => {
  try {
    must(ID.SAUDE);
    const tenant = String(req.query.tenant ?? TENANT_DEFAULT);
    const mb = await queryMetabaseCard(ID.SAUDE, tenant, { tenant });
    res.json(toScalar(mb, 'saude_base'));
  } catch (e) { 
    res.status(500).json({ error: e.message });
  }
});

router.get('/kpi/pareto-hhi', async (req, res) => {
  try {
    must(ID.PARETO);
    const tenant = String(req.query.tenant ?? TENANT_DEFAULT);
    const mb = await queryMetabaseCard(ID.PARETO, tenant, { tenant });
    res.json(toTable(mb));
  } catch (e) { 
    res.status(500).json({ error: e.message });
  }
});

router.get('/kpi/radar-reativacao', async (req, res) => {
  try {
    must(ID.REATIVA);
    const tenant = String(req.query.tenant ?? TENANT_DEFAULT);
    const mb = await queryMetabaseCard(ID.REATIVA, tenant, { tenant });
    res.json(toTable(mb));
  } catch (e) { 
    res.status(500).json({ error: e.message });
  }
});

router.get('/kpi/status-14d', async (req, res) => {
  try {
    must(ID.STATUS14);
    const tenant = String(req.query.tenant ?? TENANT_DEFAULT);
    const mb = await queryMetabaseCard(ID.STATUS14, tenant, { tenant });
    res.json(toTimeseries(mb, 'status'));
  } catch (e) { 
    res.status(500).json({ error: e.message });
  }
});

export default router;
