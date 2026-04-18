(async ()=>{
  const fetch = global.fetch || (await import('node:node-fetch')).default;
  const baseCandidates = ['http://localhost:3001','http://localhost:3000'];
  const admin = { email: 'admin@cenplus.com', password: 'admin123' };

  async function tryLogin(base) {
    try {
      const res = await fetch(base + '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admin)
      });
      const body = await res.json().catch(()=>null);
      return { ok: res.ok, status: res.status, body, base };
    } catch (e) { return { ok:false, error: e.message, base }; }
  }

  let token = null; let usedBase = null;
  for (const b of baseCandidates) {
    const r = await tryLogin(b);
    console.log('[monitor-check] Tried login at', b, '=>', r.ok ? 'OK' : 'NO', r.status || r.error);
    if (r.ok && r.body?.token) { token = r.body.token; usedBase = b; break; }
  }

  if (!token) {
    console.error('[monitor-check] ERROR: Could not obtain admin token. Aborting.');
    process.exit(2);
  }

  console.log('[monitor-check] Using base URL:', usedBase);

  // Trigger monitor run (print text body if JSON fails)
  try {
    const runRes = await fetch(usedBase + '/api/monitor/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({})
    });
    const runText = await runRes.text().catch(()=>null);
    let runBody = null;
    try { runBody = runText ? JSON.parse(runText) : null; } catch(e) { runBody = null; }
    console.log('[monitor-run] status:', runRes.status, 'body_text:', runText ? runText.substring(0,2000) : null, 'json_parsed:', runBody);
  } catch (e) {
    console.error('[monitor-run] Error calling monitor/run:', e.message);
  }

  // Fetch agitadores
  try {
    const a = await fetch(usedBase + '/api/agitadores', { headers: { 'Authorization': `Bearer ${token}` } });
    const aBody = await a.json().catch(()=>null);
    console.log('[agitadores] status:', a.status, 'count:', Array.isArray(aBody?.data) ? aBody.data.length : 'n/a');
    if (aBody?.data) console.log('[agitadores] sample:', JSON.stringify(aBody.data.slice(0,5)));
  } catch (e) { console.error('[agitadores] Error:', e.message); }

  // Try unified trends (POST or GET)
  try {
    const t = await fetch(usedBase + '/api/trends/unified', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
    const tText = await t.text().catch(()=>null);
    let tBody = null; try { tBody = tText ? JSON.parse(tText) : null; } catch(e){ tBody=null }
    console.log('[trends/unified] status:', t.status, 'body_text_sample:', tText ? tText.substring(0,1200) : null);
  } catch (e) {
    console.error('[trends/unified] GET error:', e.message);
  }

  // Lastly, try to call social-listening summary
  try {
    const s = await fetch(usedBase + '/api/social-listening/municipios', { headers: { 'Authorization': `Bearer ${token}` } });
    const sText = await s.text().catch(()=>null);
    let sBody = null; try { sBody = sText ? JSON.parse(sText) : null; } catch(e){ sBody=null }
    console.log('[social-listening/municipios] status:', s.status, 'body_text:', sText ? sText.substring(0,1200) : null);
  } catch (e) { console.error('[social-listening] Error:', e.message); }

  console.log('[monitor-check] Done.');
  process.exit(0);
})();
