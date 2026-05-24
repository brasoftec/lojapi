const BASE = '/api/v1';
let S = { token: null, apiKey: null, storeId: null, slug: null, name: null };
let prodPage = 1, ordPage = 1;

function toast(m, t) {
  var el = document.getElementById('toast');
  el.textContent = m; el.className = 'show ' + (t || 'ok');
  setTimeout(function() { el.className = ''; }, 3000);
}
function cp(id) { var el = document.getElementById(id); el.select(); document.execCommand('copy'); toast('Copiado!'); }
function cpText(t) { navigator.clipboard.writeText(t).then(function() { toast('Copiado!'); }); }
function cpBlock(id) {
  var el = document.getElementById(id);
  var t = Array.from(el.childNodes).filter(function(n) { return n.nodeType === 3 || n.tagName !== 'BUTTON'; }).map(function(n) { return n.textContent; }).join('');
  cpText(t.trim());
}
function dt(d) { if (!d) return '—'; return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function money(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
function badge(s) {
  var m = { PENDING: 'by', CONFIRMED: 'bb', PROCESSING: 'bb', SHIPPED: 'bb', DELIVERED: 'bg', CANCELLED: 'br', REFUNDED: 'bm', PAID: 'bg', FAILED: 'br' };
  return '<span class="badge ' + (m[s] || 'bm') + '">' + s + '</span>';
}
async function req(method, path, body) {
  var h = { 'Content-Type': 'application/json' };
  if (S.apiKey) h['X-API-Key'] = S.apiKey;
  else if (S.token) h['Authorization'] = 'Bearer ' + S.token;
  var r = await fetch(BASE + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined });
  var d = await r.json().catch(function() { return {}; });
  if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
  return d;
}

// ── AUTH ───────────────────────────────────────────────────────────────────
function togglePass() {
  var inp = document.getElementById('login-pass');
  var icon = document.getElementById('eye-icon');
  var showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  if (showing) {
    // senha oculta → olho ABERTO
    icon.setAttribute('viewBox','0 0 32 32');
    icon.innerHTML = '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="17" cy="15" r="1"/><circle cx="16" cy="16" r="6"/><path d="M2 16S7 6 16 6s14 10 14 10s-5 10-14 10S2 16 2 16"/></g>';
  } else {
    // senha visível → olho FECHADO
    icon.setAttribute('viewBox','0 0 15 15');
    icon.innerHTML = '<path fill="currentColor" fill-rule="evenodd" d="M2.497 6.666C3.56 7.848 5.186 9 7.5 9s3.939-1.152 5.003-2.334a9.4 9.4 0 0 0 1.449-2.164l.08-.18l.004-.007v-.001l.464.186l.464.186v.002l-.003.004l-.005.014a3 3 0 0 1-.1.222a10.4 10.4 0 0 1-1.61 2.406a9 9 0 0 1-.598.607l1.706 1.705l-.708.708l-1.774-1.775A7.3 7.3 0 0 1 8 9.984V12H7V9.984A7.3 7.3 0 0 1 3.128 8.58l-1.774 1.775l-.708-.708l1.706-1.705a9 9 0 0 1-.599-.607a10.4 10.4 0 0 1-1.61-2.406a6 6 0 0 1-.099-.222L.04 4.692l-.002-.004v-.001H.035L.5 4.5l.464-.186l.004.008a3 3 0 0 0 .08.18a9.4 9.4 0 0 0 1.449 2.164" clip-rule="evenodd"/>';
  }
}

function showErr(m) { var e = document.getElementById('login-err'); e.textContent = m; e.style.display = 'block'; }

var BTN_DEFAULT = 'ENTRAR <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>';
var BTN_LOADING = '<span class="btn-spinner"></span>';

async function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pass = document.getElementById('login-pass').value;
  var slugEl = document.getElementById('login-slug');
  var slug = slugEl ? slugEl.value.trim() : '';
  document.getElementById('login-err').style.display = 'none';
  if (!email || !pass) { showErr('Preencha email e senha'); return; }
  var btn = document.getElementById('btn-login');
  btn.innerHTML = BTN_LOADING; btn.disabled = true;
  try {
    var saved = localStorage.getItem('lojapi_slug') || '';
    var derived = email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
    var trySlug = slug || saved || derived;
    var lojaRes = await fetch(BASE + '/auth/loja/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass, storeSlug: trySlug })
    }).then(function(r) { return r.json(); });
    if (!lojaRes.error) {
      localStorage.setItem('lojapi_slug', lojaRes.store.slug);
      S.token = lojaRes.token; S.name = lojaRes.user.name; S.role = lojaRes.user.role;
      S.storeId = lojaRes.store.id; S.slug = lojaRes.store.slug; S.storeName = lojaRes.store.name;
      var loja = await fetch(BASE + '/loja', { headers: { 'Authorization': 'Bearer ' + S.token } }).then(function(r) { return r.json(); });
      S.apiKey = loja.apiKey; S.storeId = loja.id;
      btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
      startApp(); return;
    }
    var adminRes = await fetch(BASE + '/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    }).then(function(r) { return r.json(); });
    if (!adminRes.error) {
      S.token = adminRes.token; S.name = adminRes.user.name; S.role = adminRes.user.role; S.storeName = 'Admin';
      btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
      startApp(); return;
    }
    document.getElementById('slug-field').style.display = 'block';
    document.getElementById('login-slug').focus();
    showErr('Informe o slug da sua loja no campo acima e tente novamente.');
  } catch(e) { showErr(e.message); }
  btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
}

function startApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('store-badge').textContent = S.storeName || '—';
  document.getElementById('user-name').textContent = S.name || '—';
  document.getElementById('user-role').textContent = S.role || '—';
  checkApiStatus(); loadOverview(); loadTokens(); loadWh(); loadEnv(); loadEvents();
}

function logout() {
  S = {}; localStorage.removeItem('lojapi_slug');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

function goTo(btn, page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  document.getElementById('page-' + page).classList.add('active');
  btn.classList.add('active');
  var fn = { products: loadProds, orders: loadOrds, customers: loadCusts };
  if (fn[page]) fn[page]();
}

async function checkApiStatus() {
  var el = document.getElementById('api-status-badge');
  try { await fetch('/status'); el.innerHTML = '<span class="status-dot dot-green"></span><span class="sm muted">API online</span>'; }
  catch(e) { el.innerHTML = '<span class="status-dot dot-red"></span><span class="sm muted">API offline</span>'; }
}

async function loadOverview() {
  try {
    var d = await req('GET', '/loja');
    document.getElementById('s-products').textContent = d._count && d._count.products != null ? d._count.products : '—';
    document.getElementById('s-customers').textContent = d._count && d._count.customers != null ? d._count.customers : '—';
    document.getElementById('s-orders').textContent = d._count && d._count.orders != null ? d._count.orders : '—';
    document.getElementById('s-plan').textContent = d.plan || '—';
    document.getElementById('c-id').value = d.id || '';
    document.getElementById('c-slug').value = d.slug || '';
  } catch(e) { toast(e.message, 'err'); }
}

async function loadTokens() {
  try {
    var d = await req('GET', '/tokens');
    var tb = document.getElementById('tokens-tb');
    if (!d.length) { tb.innerHTML = '<tr><td colspan="6" class="empty">Nenhum token gerado ainda</td></tr>'; return; }
    tb.innerHTML = d.map(function(t) {
      return '<tr><td><b>' + t.name + '</b></td><td><code style="font-size:11px;color:var(--accent2)">' + t.token + '</code></td><td class="muted sm">' + dt(t.createdAt) + '</td><td>' + (t.expiresAt ? dt(t.expiresAt) : '<span class="badge bm">Nunca</span>') + '</td><td>' + (t.lastUsedAt ? dt(t.lastUsedAt) : '<span class="muted">—</span>') + '</td><td><button class="btn btn-danger btn-sm revoke-btn" data-id="' + t.id + '">Revogar</button></td></tr>';
    }).join('');
    document.querySelectorAll('.revoke-btn').forEach(function(b) {
      b.addEventListener('click', function() { revokeToken(b.dataset.id); });
    });
  } catch(e) { toast(e.message, 'err'); }
}

async function genToken() {
  var name = document.getElementById('tk-name').value.trim() || 'Token ERP';
  var days = parseInt(document.getElementById('tk-days').value) || 365;
  try {
    var d = await req('POST', '/tokens', { name: name, expiresInDays: days });
    document.getElementById('tk-val').textContent = d.integration.token;
    document.getElementById('tk-expires').textContent = d.integration.expiresAt ? 'Expira em: ' + dt(d.integration.expiresAt) : 'Sem expiração';
    document.getElementById('tk-result').style.display = 'block';
    toast('Token gerado!'); loadTokens(); loadEnv();
  } catch(e) { toast(e.message, 'err'); }
}

async function revokeToken(id) {
  if (!confirm('Revogar este token?')) return;
  try { await req('DELETE', '/tokens/' + id + '/revogar'); toast('Token revogado'); loadTokens(); }
  catch(e) { toast(e.message, 'err'); }
}

async function loadWh() {
  try {
    var d = await req('GET', '/loja');
    if (d.webhookUrl) { document.getElementById('wh-url').value = d.webhookUrl; document.getElementById('wh-current').textContent = 'URL atual: ' + d.webhookUrl; }
  } catch(e) {}
  loadLogs();
}
async function saveWh() {
  var url = document.getElementById('wh-url').value.trim();
  if (!url) { toast('Informe a URL', 'err'); return; }
  try { await req('POST', '/webhook/configurar', { webhookUrl: url }); document.getElementById('wh-current').textContent = 'URL atual: ' + url; toast('Webhook salvo!'); }
  catch(e) { toast(e.message, 'err'); }
}
async function testWh() {
  try { var r = await req('POST', '/webhook/testar'); toast(r.message || 'Evento de teste enviado!'); }
  catch(e) { toast(e.message, 'err'); }
}
async function loadEvents() {
  try {
    var d = await req('GET', '/webhook/eventos');
    document.getElementById('events-grid').innerHTML = d.map(function(e) {
      return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 13px"><code style="color:var(--accent2);font-size:12px">' + e.event + '</code><div class="sm muted" style="margin-top:3px">' + e.description + '</div></div>';
    }).join('');
  } catch(e) {}
}
async function loadLogs() {
  try {
    var d = await req('GET', '/webhook/logs?limit=15');
    var tb = document.getElementById('logs-tb');
    if (!d.data || !d.data.length) { tb.innerHTML = '<tr><td colspan="4" class="empty">Nenhum log ainda</td></tr>'; return; }
    tb.innerHTML = d.data.map(function(l) {
      var st = l.status >= 200 && l.status < 300 ? '<span class="badge bg">' + l.status + '</span>' : '<span class="badge br">' + (l.status || '—') + '</span>';
      return '<tr><td><code style="font-size:11px;color:var(--accent2)">' + l.event + '</code></td><td>' + st + '</td><td class="muted sm">' + (l.response || '—') + '</td><td class="muted sm">' + dt(l.createdAt) + '</td></tr>';
    }).join('');
  } catch(e) { toast(e.message, 'err'); }
}

async function loadEnv() {
  try {
    var d = await req('GET', '/tokens/env');
    document.getElementById('env-block').textContent = d.dotenv_format;
    document.getElementById('ex-node').innerHTML = '<button class="cpbtn" data-cpblock="ex-node">copiar</button>' + d.examples.node;
    document.getElementById('ex-php').innerHTML = '<button class="cpbtn" data-cpblock="ex-php">copiar</button>' + d.examples.php;
    document.getElementById('ex-curl').innerHTML = '<button class="cpbtn" data-cpblock="ex-curl">copiar</button>' + d.examples.curl;
    bindCpblockBtns();
  } catch(e) {}
}

async function loadProds() {
  var q = document.getElementById('prod-q').value;
  try {
    var d = await req('GET', '/produtos?page=' + prodPage + '&limit=20' + (q ? '&search=' + encodeURIComponent(q) : ''));
    var tb = document.getElementById('prods-tb');
    if (!d.data || !d.data.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">Nenhum produto</td></tr>'; return; }
    tb.innerHTML = d.data.map(function(p) {
      var stk = p.stock > 10 ? 'var(--accent)' : p.stock > 0 ? 'var(--yellow)' : 'var(--red)';
      return '<tr><td><b>' + p.name + '</b>' + (p.featured ? ' <span class="badge by">destaque</span>' : '') + '</td><td class="muted sm">' + (p.sku || '—') + '</td><td>' + money(p.price) + '</td><td style="color:' + stk + '">' + p.stock + '</td><td>' + (p.active ? '<span class="badge bg">ativo</span>' : '<span class="badge br">inativo</span>') + '</td></tr>';
    }).join('');
    var pg = d.pagination;
    var el = document.getElementById('prods-pg');
    el.innerHTML = '<span class="sm muted">' + pg.total + ' produtos</span>';
    if (pg.page > 1) { var pb = document.createElement('button'); pb.className = 'btn btn-ghost btn-sm'; pb.textContent = '← Anterior'; pb.addEventListener('click', function() { prodPage--; loadProds(); }); el.appendChild(pb); }
    if (pg.page < pg.totalPages) { var nb = document.createElement('button'); nb.className = 'btn btn-ghost btn-sm'; nb.textContent = 'Próxima →'; nb.addEventListener('click', function() { prodPage++; loadProds(); }); el.appendChild(nb); }
  } catch(e) { toast(e.message, 'err'); }
}

async function updStock() {
  var id = document.getElementById('sk-id').value.trim();
  var qty = parseInt(document.getElementById('sk-qty').value);
  var op = document.getElementById('sk-op').value;
  if (!id || isNaN(qty)) { toast('Preencha ID e quantidade', 'err'); return; }
  try { var r = await req('PATCH', '/produtos/' + id + '/estoque', { quantity: qty, operation: op }); toast('Estoque: ' + r.stock); loadProds(); }
  catch(e) { toast(e.message, 'err'); }
}

async function loadOrds() {
  var st = document.getElementById('ord-st').value;
  var pay = document.getElementById('ord-pay').value;
  try {
    var d = await req('GET', '/pedidos?page=' + ordPage + '&limit=20' + (st ? '&status=' + st : '') + (pay ? '&paymentStatus=' + pay : ''));
    var tb = document.getElementById('ords-tb');
    if (!d.data || !d.data.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">Nenhum pedido</td></tr>'; return; }
    tb.innerHTML = d.data.map(function(o) {
      var opts = ['CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(function(s) { return '<option>' + s + '</option>'; }).join('');
      return '<tr><td><b>' + o.orderNumber + '</b></td><td class="muted sm">' + (o.customer && o.customer.name ? o.customer.name : '—') + '</td><td>' + money(o.total) + '</td><td>' + badge(o.status) + '</td><td>' + badge(o.paymentStatus) + '</td><td class="muted sm">' + dt(o.createdAt) + '</td><td><select class="ord-status-sel" data-id="' + o.id + '" style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:11px"><option value="">Alterar...</option>' + opts + '</select></td></tr>';
    }).join('');
    document.querySelectorAll('.ord-status-sel').forEach(function(sel) {
      sel.addEventListener('change', function() { if (sel.value) updOrdStatus(sel.dataset.id, sel.value); });
    });
    var pg = d.pagination;
    var el = document.getElementById('ords-pg');
    el.innerHTML = '<span class="sm muted">' + pg.total + ' pedidos</span>';
    if (pg.page > 1) { var pb = document.createElement('button'); pb.className = 'btn btn-ghost btn-sm'; pb.textContent = '← Anterior'; pb.addEventListener('click', function() { ordPage--; loadOrds(); }); el.appendChild(pb); }
    if (pg.page < pg.totalPages) { var nb = document.createElement('button'); nb.className = 'btn btn-ghost btn-sm'; nb.textContent = 'Próxima →'; nb.addEventListener('click', function() { ordPage++; loadOrds(); }); el.appendChild(nb); }
  } catch(e) { toast(e.message, 'err'); }
}

async function updOrdStatus(id, status) {
  try { await req('PATCH', '/pedidos/' + id + '/status', { status: status }); toast('Status: ' + status); loadOrds(); }
  catch(e) { toast(e.message, 'err'); }
}

async function loadCusts() {
  var q = document.getElementById('cust-q').value;
  try {
    var d = await req('GET', '/clientes?limit=30' + (q ? '&search=' + encodeURIComponent(q) : ''));
    var tb = document.getElementById('custs-tb');
    if (!d.data || !d.data.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">Nenhum cliente</td></tr>'; return; }
    tb.innerHTML = d.data.map(function(c) {
      return '<tr><td><b>' + c.name + '</b></td><td class="muted sm">' + c.email + '</td><td class="muted sm">' + (c.phone || '—') + '</td><td>' + (c._count && c._count.orders != null ? c._count.orders : 0) + '</td><td>' + (c.active ? '<span class="badge bg">ativo</span>' : '<span class="badge br">inativo</span>') + '</td></tr>';
    }).join('');
  } catch(e) { toast(e.message, 'err'); }
}

function bindCpblockBtns() {
  document.querySelectorAll('[data-cpblock]').forEach(function(b) {
    b.addEventListener('click', function() { cpBlock(b.dataset.cpblock); });
  });
}

// ── BIND ALL EVENT LISTENERS ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Login
  document.getElementById('btn-login').addEventListener('click', doLogin);
  document.getElementById('login-pass').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
  document.getElementById('login-email').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
  document.getElementById('login-slug').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
  document.getElementById('eye-btn').addEventListener('click', togglePass);
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(function(btn) {
    btn.addEventListener('click', function() { goTo(btn, btn.dataset.page); });
  });
  document.getElementById('nav-swagger').addEventListener('click', function() { window.open('/api/v1/docs', '_blank'); });
  document.getElementById('nav-status').addEventListener('click', function() { window.open('/status', '_blank'); });

  // Copiar credenciais
  document.querySelectorAll('[data-cp]').forEach(function(b) {
    b.addEventListener('click', function() { cp(b.dataset.cp); });
  });

  // Tokens
  document.getElementById('btn-gen-token').addEventListener('click', genToken);
  document.getElementById('btn-reload-tokens').addEventListener('click', loadTokens);
  document.getElementById('btn-cp-token').addEventListener('click', function() { cpText(document.getElementById('tk-val').textContent); });

  // Webhook
  document.getElementById('btn-save-wh').addEventListener('click', saveWh);
  document.getElementById('btn-test-wh').addEventListener('click', testWh);
  document.getElementById('btn-reload-logs').addEventListener('click', loadLogs);

  // Env
  document.getElementById('btn-cp-env').addEventListener('click', function() { cpText(document.getElementById('env-block').textContent.trim()); });
  bindCpblockBtns();

  // Produtos
  document.getElementById('prod-q').addEventListener('input', loadProds);
  document.getElementById('btn-reload-prods').addEventListener('click', loadProds);
  document.getElementById('btn-upd-stock').addEventListener('click', updStock);

  // Pedidos
  document.getElementById('ord-st').addEventListener('change', loadOrds);
  document.getElementById('ord-pay').addEventListener('change', loadOrds);
  document.getElementById('btn-reload-ords').addEventListener('click', loadOrds);

  // Clientes
  document.getElementById('cust-q').addEventListener('input', loadCusts);
  document.getElementById('btn-reload-custs').addEventListener('click', loadCusts);
});