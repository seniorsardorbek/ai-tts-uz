const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'localhost', port:5432, user:'postgres', password:'Enter', database:'coddyjuniorms' });
  try {
    await c.connect();
    for (const t of ['cache_entries','tts_requests','grading_records']) {
      const r = await c.query(`SELECT count(*)::int n FROM ${t}`);
      console.log(`${t}: ${r.rows[0].n} qator`);
    }
    const last = await c.query("SELECT cache_hit, lesson_id, student_uuid, lesson_name FROM tts_requests ORDER BY created_at DESC LIMIT 3");
    console.log('oxirgi tts_requests:', JSON.stringify(last.rows));
    await c.end();
  } catch (e) { console.log('DB XATO:', e.message); }
})();
