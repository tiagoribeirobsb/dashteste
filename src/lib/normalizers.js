export function toTable(mb) {
  const rows = mb?.rows ?? (Array.isArray(mb) ? mb : []);
  const cols = mb?.cols?.map(c => ({ 
    key: c.name || c.display_name, 
    label: c.display_name || c.name 
  })) ?? (rows[0] ? Object.keys(rows[0]).map(k => ({ key: k, label: k })) : []);
  return { columns: cols, data: rows };
}

export function toTimeseries(mb, label) {
  const rows = mb?.rows ?? (Array.isArray(mb) ? mb : []);
  if (!rows.length) return { series: [{ name: label ?? 'value', points: [] }] };
  
  const cols = mb?.cols || [];
  const dateCol = cols.findIndex(c => c.base_type?.includes('Date') || c.name?.toLowerCase().includes('date')) || 0;
  const valueCol = dateCol === 0 ? 1 : 0;
  
  return {
    series: [{
      name: label ?? cols[valueCol]?.display_name ?? 'value',
      points: rows.map(r => ({ 
        x: String(r[dateCol]), 
        y: Number(r[valueCol] || 0)
      }))
    }]
  };
}

export function toScalar(mb) {
  if (mb?.value !== undefined) {
    return { value: Number(mb.value), format: mb.format, change: mb.change };
  }
  const row = (mb?.rows ?? [])[0] ?? {};
  const keys = Object.keys(row);
  const v = keys.length > 1 ? row[keys[1]] : row[keys[0]];
  return { value: Number(v ?? 0) };
}
