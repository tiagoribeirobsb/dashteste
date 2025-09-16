// routes/upload.js (exemplo)
import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const upload = multer();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); // precisa service role p/ inserir

function csvToRows(fileBuffer) {
  return parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true });
}

// 1) clients_master.csv -> api.clients_master_upload
router.post('/clients-master', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    // valida headers mínimos
    const required = ['customer_key','customer_name','first_order_date','last_order_date','avg_cycle_days','city','state'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    // normalização simples
    const payload = rows.map(r => ({
      tenant_id: tenant,
      customer_key: r.customer_key,
      customer_name: r.customer_name || null,
      first_order_date: r.first_order_date || null,
      last_order_date: r.last_order_date || null,
      avg_cycle_days: r.avg_cycle_days ? parseInt(r.avg_cycle_days, 10) : null,
      city: r.city || null,
      state: r.state || null
    }));

    const { error } = await supabase
      .from('clients_master_upload')
      .upsert(payload, { onConflict: 'tenant_id,customer_key' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 2) sales_by_customer_daily.csv -> api.sales_by_customer_daily_upload
router.post('/sales-by-customer', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['sale_date','customer_key','orders','revenue'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      sale_date: r.sale_date,
      customer_key: r.customer_key,
      orders: parseInt(r.orders, 10),
      revenue: parseFloat(String(r.revenue).replace(',', '.')) // garantir ponto
    }));

    const { error } = await supabase
      .from('sales_by_customer_daily_upload')
      .upsert(payload, { onConflict: 'tenant_id,sale_date,customer_key' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 3) sales-daily (alias para daily_sales)
router.post('/sales-daily', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['sale_date','orders','revenue'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      sale_date: r.sale_date,
      orders: parseInt(r.orders, 10),
      revenue: parseFloat(String(r.revenue).replace(',', '.'))
    }));

    const { error } = await supabase
      .from('daily_sales_upload')
      .upsert(payload, { onConflict: 'tenant_id,sale_date' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 3b) daily_sales.csv -> api.daily_sales_upload (rota original)
router.post('/daily-sales', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['sale_date','orders','revenue'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      sale_date: r.sale_date,
      orders: parseInt(r.orders, 10),
      revenue: parseFloat(String(r.revenue).replace(',', '.'))
    }));

    const { error } = await supabase
      .from('daily_sales_upload')
      .upsert(payload, { onConflict: 'tenant_id,sale_date' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 4) sales-status (alias para order_status)
router.post('/sales-status', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['order_id','status','order_date'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      order_id: r.order_id,
      status: r.status,
      order_date: r.order_date,
      customer_key: r.customer_key || null,
      revenue: r.revenue ? parseFloat(String(r.revenue).replace(',', '.')) : null
    }));

    const { error } = await supabase
      .from('order_status_upload')
      .upsert(payload, { onConflict: 'tenant_id,order_id' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 4b) order_status.csv -> api.order_status_upload (rota original)
router.post('/order-status', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['order_id','status','order_date'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      order_id: r.order_id,
      status: r.status,
      order_date: r.order_date,
      customer_key: r.customer_key || null,
      revenue: r.revenue ? parseFloat(String(r.revenue).replace(',', '.')) : null
    }));

    const { error } = await supabase
      .from('order_status_upload')
      .upsert(payload, { onConflict: 'tenant_id,order_id' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 5) top-customers (alias para top_clients)
router.post('/top-customers', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['customer_key','customer_name','total_revenue'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      customer_key: r.customer_key,
      customer_name: r.customer_name,
      total_revenue: parseFloat(String(r.total_revenue).replace(',', '.')),
      orders_count: r.orders_count ? parseInt(r.orders_count, 10) : null,
      ranking_position: r.ranking_position ? parseInt(r.ranking_position, 10) : null
    }));

    const { error } = await supabase
      .from('top_clients_upload')
      .upsert(payload, { onConflict: 'tenant_id,customer_key' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 5b) top_clients.csv -> api.top_clients_upload (rota original)
router.post('/top-clients', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['customer_key','customer_name','total_revenue'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      customer_key: r.customer_key,
      customer_name: r.customer_name,
      total_revenue: parseFloat(String(r.total_revenue).replace(',', '.')),
      orders_count: r.orders_count ? parseInt(r.orders_count, 10) : null,
      ranking_position: r.ranking_position ? parseInt(r.ranking_position, 10) : null
    }));

    const { error } = await supabase
      .from('top_clients_upload')
      .upsert(payload, { onConflict: 'tenant_id,customer_key' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 6) goals-mtd (alias para monthly_targets)
router.post('/goals-mtd', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['target_month','target_revenue'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      target_month: r.target_month,
      target_revenue: parseFloat(String(r.target_revenue).replace(',', '.')),
      target_orders: r.target_orders ? parseInt(r.target_orders, 10) : null,
      actual_revenue: r.actual_revenue ? parseFloat(String(r.actual_revenue).replace(',', '.')) : null,
      actual_orders: r.actual_orders ? parseInt(r.actual_orders, 10) : null
    }));

    const { error } = await supabase
      .from('monthly_targets_upload')
      .upsert(payload, { onConflict: 'tenant_id,target_month' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 6b) monthly_targets.csv -> api.monthly_targets_upload (rota original)
router.post('/monthly-targets', upload.single('file'), async (req, res) => {
  try {
    const tenant = req.body.tenant;
    const rows = csvToRows(req.file.buffer);

    const required = ['target_month','target_revenue'];
    const cols = Object.keys(rows[0] || {});
    for (const h of required) if (!cols.includes(h)) throw new Error(`Header obrigatório ausente: ${h}`);

    const payload = rows.map(r => ({
      tenant_id: tenant,
      target_month: r.target_month,
      target_revenue: parseFloat(String(r.target_revenue).replace(',', '.')),
      target_orders: r.target_orders ? parseInt(r.target_orders, 10) : null,
      actual_revenue: r.actual_revenue ? parseFloat(String(r.actual_revenue).replace(',', '.')) : null,
      actual_orders: r.actual_orders ? parseInt(r.actual_orders, 10) : null
    }));

    const { error } = await supabase
      .from('monthly_targets_upload')
      .upsert(payload, { onConflict: 'tenant_id,target_month' });

    if (error) throw error;
    res.json({ ok: true, rows: payload.length, errors: 0 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default router;