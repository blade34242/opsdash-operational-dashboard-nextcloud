<?php
/** @var array $_ */
$h = fn($v)=>htmlspecialchars((string)$v, ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8');
$enabled = !empty($_['enabled']);
$metrics = is_array($_['metrics'] ?? null) ? $_['metrics'] : [];
$gen = \OC::$server->getURLGenerator();
$csrf = \OC::$server->getCsrfTokenManager()->getToken();
$urlGet = $gen->linkToRoute('aaacalstatsdashxyz.admin.getMetrics');
$urlGetUsers = $gen->linkToRoute('aaacalstatsdashxyz.admin.getUserMetrics');
$urlCfg = $gen->linkToRoute('aaacalstatsdashxyz.admin.setMetricsConfig');
$urlRst = $gen->linkToRoute('aaacalstatsdashxyz.admin.resetMetrics');
?>
<div class="section">
  <h2>Calendar Dashboard · Metrics</h2>
  <p>Aggregate usage metrics (open, load, save). Privacy-friendly: no user IDs, IPs, or per-event timestamps stored.</p>

  <label>
    <input type="checkbox" id="m-enable" <?php if ($enabled) echo 'checked'; ?>>
    Enable metrics collection
  </label>
  <button id="m-save" class="button">Apply</button>
  <button id="m-reset" class="button">Reset counters</button>

  <h3>Counts</h3>
  <table class="grid">
    <thead><tr><th>metric</th><th>count</th><th>last update</th></tr></thead>
    <tbody id="m-body">
      <?php foreach (['open','load','save'] as $m): $row=$metrics[$m]??['count'=>0,'updated_at'=>0]; ?>
        <tr>
          <td><?= $h($m) ?></td>
          <td><?= (int)$row['count'] ?></td>
          <td><?= $row['updated_at'] ? date('Y-m-d H:i:s', (int)$row['updated_at']) : '—' ?></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <h3>Per-user monthly metrics</h3>
  <div style="display:flex;gap:8px;align-items:center;margin:6px 0">
    <label>Months
      <select id="m-months">
        <option value="3">3</option>
        <option value="6" selected>6</option>
        <option value="12">12</option>
      </select>
    </label>
    <button id="m-refresh" class="button">Refresh</button>
  </div>
  <table class="grid">
    <thead><tr><th>user</th><th>month</th><th>open</th><th>load</th><th>save</th><th>total</th></tr></thead>
    <tbody id="m-ubody"></tbody>
  </table>
</div>

<script>
(function(){
  const enable = document.getElementById('m-enable')
  const btnSave = document.getElementById('m-save')
  const btnReset = document.getElementById('m-reset')
  const urlCfg = <?= json_encode($urlCfg) ?>
  const urlRst = <?= json_encode($urlRst) ?>
  const urlGet = <?= json_encode($urlGet) ?>
  const urlGetUsers = <?= json_encode($urlGetUsers) ?>
  const token  = <?= json_encode((string)$csrf) ?>

  async function post(url, body){
    const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', 'requesttoken': token }, body: JSON.stringify(body||{}), credentials:'same-origin' })
    if (!res.ok) throw new Error('HTTP '+res.status)
    return res.json()
  }
  async function refresh(){
    const res = await fetch(urlGet, { headers:{ 'Accept':'application/json' } })
    if (!res.ok) return
    const json = await res.json()
    enable.checked = !!json.enabled
    const rows = { open:{}, load:{}, save:{} }
    Object.assign(rows, json.metrics||{})
    const body = document.getElementById('m-body')
    body.innerHTML = ''
    for (const k of ['open','load','save']){
      const r = rows[k] || {count:0, updated_at:0}
      const tr = document.createElement('tr')
      tr.innerHTML = `<td>${k}</td><td>${Number(r.count||0)}</td><td>${r.updated_at?new Date((r.updated_at||0)*1000).toISOString().replace('T',' ').slice(0,19):'—'}</td>`
      body.appendChild(tr)
    }
    // per-user monthly
    try {
      const monthsSel = document.getElementById('m-months')
      const months = Number(monthsSel && monthsSel.value || 6)
      const resU = await fetch(urlGetUsers + '?months=' + months, { headers:{ 'Accept':'application/json' }, credentials:'same-origin' })
      if (resU.ok) {
        const ju = await resU.json()
        const ubody = document.getElementById('m-ubody')
        ubody.innerHTML = ''
        (ju.rows||[]).forEach(r => {
          const tr = document.createElement('tr')
          tr.innerHTML = `<td>${r.uid||''}</td><td>${r.ym||''}</td><td>${Number(r.open||0)}</td><td>${Number(r.load||0)}</td><td>${Number(r.save||0)}</td><td>${Number(r.total||0)}</td>`
          ubody.appendChild(tr)
        })
      }
    } catch(_) {}
  }
  btnSave.addEventListener('click', ()=> post(urlCfg, { enabled: !!enable.checked }).then(refresh).catch(console.error))
  btnReset.addEventListener('click', ()=> post(urlRst, {}).then(refresh).catch(console.error))
  document.getElementById('m-refresh').addEventListener('click', ()=> refresh().catch(console.error))
  refresh().catch(console.error)
})();
</script>
