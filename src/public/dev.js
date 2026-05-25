const BASE = '/api/v1';
let S = { token: null, apiKey: null, storeId: null, slug: null, name: null };
let prodPage = 1, ordPage = 1;

// ── SESSION PERSISTENCE ────────────────────────────────────────────────────
function saveSession() {
  localStorage.setItem('lojapi_session', JSON.stringify({
    token: S.token, apiKey: S.apiKey, storeId: S.storeId,
    slug: S.slug, name: S.name, role: S.role, storeName: S.storeName
  }));
}

function clearSession() {
  localStorage.removeItem('lojapi_session');
  localStorage.removeItem('lojapi_slug');
}

async function tryRestoreSession() {
  var raw = localStorage.getItem('lojapi_session');
  if (!raw) return false;
  try {
    var saved = JSON.parse(raw);
    if (!saved.token) return false;
    // Valida o token contra a API
    var r = await fetch(BASE + '/auth/me', {
      headers: { 'Authorization': 'Bearer ' + saved.token }
    });
    if (!r.ok) { clearSession(); return false; }
    // Token ainda válido — restaura estado completo
    S.token = saved.token; S.apiKey = saved.apiKey; S.storeId = saved.storeId;
    S.slug = saved.slug; S.name = saved.name; S.role = saved.role; S.storeName = saved.storeName;
    return true;
  } catch(e) { clearSession(); return false; }
}

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
// ── AUTH ───────────────────────────────────────────────────────────────────
// Retorna true se o usuário logado é admin global
function isAdmin() { return S.role === 'SUPER_ADMIN' || S.role === 'ADMIN'; }

// Rotas globais de admin usam Bearer; rotas escopadas à loja preferem X-API-Key
function isAdminRoute(path) {
  return path.indexOf('/admin/') === 0
      || path.indexOf('/admin') === 0
      || path.indexOf('/cadastrar') === 0
      || path.indexOf('/auth/') === 0;
}

async function req(method, path, body) {
  var h = { 'Content-Type': 'application/json' };
  if (isAdminRoute(path)) {
    if (S.token) h['Authorization'] = 'Bearer ' + S.token;
  } else if (S.apiKey) {
    h['X-API-Key'] = S.apiKey;
  } else if (S.token) {
    h['Authorization'] = 'Bearer ' + S.token;
  }
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
    icon.setAttribute('viewBox','0 0 24 24');
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  }
}

function showErr(m) { var e = document.getElementById('login-err'); e.textContent = m; e.style.display = 'block'; }

var BTN_DEFAULT = 'ENTRAR <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>';
var BTN_LOADING = '<span class="btn-spinner"></span>';

async function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pass = document.getElementById('login-pass').value;
  document.getElementById('login-err').style.display = 'none';
  if (!email || !pass) { showErr('Preencha email e senha'); return; }
  var btn = document.getElementById('btn-login');
  btn.innerHTML = BTN_LOADING; btn.disabled = true;
  try {
    var saved = localStorage.getItem('lojapi_slug') || '';
    if (saved) {
      var lojaRes = await fetch(BASE + '/auth/loja/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pass, storeSlug: saved })
      }).then(function(r) { return r.json(); });
      if (!lojaRes.error) {
        localStorage.setItem('lojapi_slug', lojaRes.store.slug);
        S.token = lojaRes.token; S.name = lojaRes.user.name; S.role = lojaRes.user.role;
        S.storeId = lojaRes.store.id; S.slug = lojaRes.store.slug; S.storeName = lojaRes.store.name;
        var loja = await fetch(BASE + '/loja', { headers: { 'Authorization': 'Bearer ' + S.token } }).then(function(r) { return r.json(); });
        S.apiKey = loja.apiKey; S.storeId = loja.id;
        saveSession();
        btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
        startApp(); return;
      }
    }
    var adminRes = await fetch(BASE + '/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    }).then(function(r) { return r.json(); });
    if (!adminRes.error) {
      S.token = adminRes.token; S.name = adminRes.user.name; S.role = adminRes.user.role; S.storeName = 'Admin';
      saveSession();
      btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
      startApp(); return;
    }
    showErr('Email ou senha inválidos');
  } catch(e) { showErr(e.message); }
  btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
}

function startApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('store-badge').textContent = S.storeName || '—';
  document.getElementById('user-name').textContent = S.name || '—';
  document.getElementById('user-role').textContent = S.role || '—';
  if (isAdmin()) {
    loadAdminContext();
  } else {
    loadOverview(); loadTokens(); loadWh(); loadEnv(); loadEvents();
  }
}

// Admin: carrega a primeira loja ativa e usa a apiKey dela para operar o painel
async function loadAdminContext() {
  try {
    // Se já tem apiKey (sessão restaurada), carrega direto os dados da loja
    if (S.apiKey) {
      var store = await req('GET', '/loja');
      document.getElementById('store-badge').textContent = store.name || S.storeName || '—';
      document.getElementById('c-id').value = store.id || '';
      document.getElementById('c-slug').value = store.slug || '';
      document.getElementById('s-products').textContent = store._count ? store._count.products : '—';
      document.getElementById('s-customers').textContent = store._count ? store._count.customers : '—';
      document.getElementById('s-orders').textContent = store._count ? store._count.orders : '—';
      document.getElementById('s-plan').textContent = store.plan || '—';
      loadTokens(); loadWh(); loadEnv(); loadEvents();
      return;
    }
    // Sem apiKey: busca a primeira loja ativa via rota admin
    var d = await req('GET', '/admin/lojas?limit=1&active=true');
    var stores = d.data || [];
    if (!stores.length) {
      document.getElementById('store-badge').textContent = 'Nenhuma loja';
      return;
    }
    var store = stores[0];
    S.apiKey = store.apiKey;
    S.storeId = store.id;
    S.slug = store.slug;
    S.storeName = store.name;
    saveSession();
    document.getElementById('store-badge').textContent = store.name;
    document.getElementById('c-id').value = store.id || '';
    document.getElementById('c-slug').value = store.slug || '';
    document.getElementById('s-products').textContent = store._count ? store._count.products : '—';
    document.getElementById('s-customers').textContent = store._count ? store._count.customers : '—';
    document.getElementById('s-orders').textContent = store._count ? store._count.orders : '—';
    document.getElementById('s-plan').textContent = store.plan || '—';
    loadTokens(); loadWh(); loadEnv(); loadEvents();
  } catch(e) { toast('Erro ao carregar lojas: ' + e.message, 'err'); }
}

function logout() {
  S = {}; clearSession();
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
  try { await fetch('/status'); }
  catch(e) {}
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
      return '<tr><td><b>' + o.orderNumber + '</b></td><td class="muted sm">' + (o.customer && o.customer.name ? o.customer.name : '—') + '</td><td>' + money(o.total) + '</td><td>' + badge(o.status) + '</td><td>' + badge(o.paymentStatus) + '</td><td class="muted sm">' + dt(o.createdAt) + '</td><td><select class="ord-status-sel" data-id="' + o.id + '" style="background:#fff;border:1.5px solid var(--border-input);border-radius:8px;padding:4px 8px;color:var(--text-input);font-size:11px"><option value="">Alterar...</option>' + opts + '</select></td></tr>';
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

// ── ADMIN: Lojas ──────────────────────────────────────────────────────────
var storesPage = 1;
async function loadStores() {
  var q = document.getElementById('stores-q').value;
  var plan = document.getElementById('stores-plan-filter').value;
  try {
    var url = '/admin/lojas?page=' + storesPage + '&limit=20';
    if (q) url += '&search=' + encodeURIComponent(q);
    if (plan) url += '&plan=' + plan;
    var d = await req('GET', url);
    var tb = document.getElementById('stores-tb');
    if (!d.data || !d.data.length) { tb.innerHTML = '<tr><td colspan="9" class="empty">Nenhuma loja</td></tr>'; return; }
    tb.innerHTML = d.data.map(function(s) {
      var statusBadge = s.active ? '<span class="badge bg">ativa</span>' : '<span class="badge br">inativa</span>';
      var planBadge = '<span class="badge bb">' + s.plan + '</span>';
      var apiKeyShort = s.apiKey ? s.apiKey.substring(0,8) + '...' : '—';
      return '<tr>' +
        '<td><b>' + s.name + '</b></td>' +
        '<td class="muted sm">' + s.slug + '</td>' +
        '<td class="muted sm">' + s.email + '</td>' +
        '<td>' + planBadge + '</td>' +
        '<td class="muted sm">' + (s._count ? s._count.products : 0) + '</td>' +
        '<td class="muted sm">' + (s._count ? s._count.orders : 0) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><code style="font-size:11px;color:var(--accent2)">' + apiKeyShort + '</code> <button class="btn btn-ghost btn-sm regen-key-btn" data-id="' + s.id + '" data-name="' + s.name + '">Regenerar</button></td>' +
        '<td><div class="flex" style="gap:4px">' +
          '<select class="plan-sel" data-id="' + s.id + '" style="background:#fff;border:1.5px solid var(--border-input);border-radius:8px;padding:3px 6px;color:var(--text-input);font-size:11px"><option value="">Plano...</option><option>FREE</option><option>BASIC</option><option>PRO</option><option>ENTERPRISE</option></select>' +
          '<button class="btn btn-sm ' + (s.active ? 'btn-danger' : 'btn-ghost') + ' toggle-store-btn" data-id="' + s.id + '" data-active="' + s.active + '">' + (s.active ? 'Desativar' : 'Ativar') + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
    // Bind eventos
    document.querySelectorAll('.regen-key-btn').forEach(function(b) {
      b.addEventListener('click', function() { regenApiKey(b.dataset.id, b.dataset.name); });
    });
    document.querySelectorAll('.toggle-store-btn').forEach(function(b) {
      b.addEventListener('click', function() { toggleStore(b.dataset.id, b.dataset.active === 'true'); });
    });
    document.querySelectorAll('.plan-sel').forEach(function(sel) {
      sel.addEventListener('change', function() { if (sel.value) updatePlan(sel.dataset.id, sel.value); });
    });
    // Paginação
    var pg = d.pagination;
    var el = document.getElementById('stores-pg');
    el.innerHTML = '<span class="sm muted">' + pg.total + ' lojas</span>';
    if (pg.page > 1) { var pb = document.createElement('button'); pb.className = 'btn btn-ghost btn-sm'; pb.textContent = '← Anterior'; pb.addEventListener('click', function() { storesPage--; loadStores(); }); el.appendChild(pb); }
    if (pg.page < pg.totalPages) { var nb = document.createElement('button'); nb.className = 'btn btn-ghost btn-sm'; nb.textContent = 'Próxima →'; nb.addEventListener('click', function() { storesPage++; loadStores(); }); el.appendChild(nb); }
  } catch(e) { toast(e.message, 'err'); }
}

async function createStore() {
  var name = document.getElementById('ns-name').value.trim();
  var email = document.getElementById('ns-email').value.trim();
  var ownerName = document.getElementById('ns-owner-name').value.trim();
  var ownerEmail = document.getElementById('ns-owner-email').value.trim();
  var ownerPass = document.getElementById('ns-owner-pass').value;
  var plan = document.getElementById('ns-plan').value;
  if (!name || !email || !ownerName || !ownerEmail || !ownerPass) { toast('Preencha todos os campos', 'err'); return; }
  try {
    var d = await req('POST', '/cadastrar', { name, email, ownerName, ownerEmail, ownerPassword: ownerPass, plan });
    toast('Loja criada: ' + d.store.name);
    document.getElementById('ns-name').value = '';
    document.getElementById('ns-email').value = '';
    document.getElementById('ns-owner-name').value = '';
    document.getElementById('ns-owner-email').value = '';
    document.getElementById('ns-owner-pass').value = '';
    loadStores();
  } catch(e) { toast(e.message, 'err'); }
}

async function regenApiKey(id, name) {
  if (!confirm('Regenerar API Key de "' + name + '"? A chave atual será invalidada.')) return;
  try {
    var d = await req('POST', '/loja/' + id + '/regenerar-api-key');
    toast('Nova API Key: ' + d.apiKey.substring(0,12) + '...');
    loadStores();
  } catch(e) { toast(e.message, 'err'); }
}

async function toggleStore(id, isActive) {
  try {
    var d = await req('PATCH', '/admin/lojas/' + id + '/status');
    toast(d.message); loadStores();
  } catch(e) { toast(e.message, 'err'); }
}

async function updatePlan(id, plan) {
  try {
    await req('PATCH', '/admin/lojas/' + id + '/plano', { plan });
    toast('Plano atualizado para ' + plan); loadStores();
  } catch(e) { toast(e.message, 'err'); }
}

// ── ADMIN: Tokens por Loja ────────────────────────────────────────────────
var stTokenStoreId = null;

async function loadStoreSelectOptions() {
  try {
    var d = await req('GET', '/admin/lojas?limit=100');
    var sel = document.getElementById('st-store-sel');
    sel.innerHTML = '<option value="">Selecione uma loja...</option>';
    (d.data || []).forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s.id + '|' + s.apiKey;
      opt.textContent = s.name + ' (' + s.slug + ')';
      sel.appendChild(opt);
    });
  } catch(e) {}
}

async function loadStoreTokens() {
  var val = document.getElementById('st-store-sel').value;
  if (!val) { toast('Selecione uma loja', 'err'); return; }
  var parts = val.split('|');
  stTokenStoreId = parts[0];
  var storeApiKey = parts[1];
  document.getElementById('st-tokens-card').style.display = 'block';
  try {
    var d = await fetch(BASE + '/tokens', { headers: { 'X-API-Key': storeApiKey } }).then(function(r) { return r.json(); });
    var tb = document.getElementById('st-tokens-tb');
    if (!d.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">Nenhum token</td></tr>'; return; }
    tb.innerHTML = d.map(function(t) {
      return '<tr>' +
        '<td><b>' + t.name + '</b></td>' +
        '<td><code style="font-size:11px;color:var(--accent2)">' + t.token + '</code></td>' +
        '<td class="muted sm">' + dt(t.createdAt) + '</td>' +
        '<td>' + (t.expiresAt ? dt(t.expiresAt) : '<span class="badge bm">Nunca</span>') + '</td>' +
        '<td>' + (t.lastUsedAt ? dt(t.lastUsedAt) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (t.active ? '<span class="badge bg">ativo</span>' : '<span class="badge br">revogado</span>') + '</td>' +
        '<td>' + (t.active ? '<button class="btn btn-danger btn-sm st-revoke-btn" data-id="' + t.id + '" data-key="' + storeApiKey + '">Revogar</button>' : '') + '</td>' +
      '</tr>';
    }).join('');
    document.querySelectorAll('.st-revoke-btn').forEach(function(b) {
      b.addEventListener('click', function() { revokeStoreToken(b.dataset.id, b.dataset.key); });
    });
  } catch(e) { toast(e.message, 'err'); }
}

async function genStoreToken() {
  var val = document.getElementById('st-store-sel').value;
  if (!val) { toast('Selecione uma loja', 'err'); return; }
  var storeApiKey = val.split('|')[1];
  var name = prompt('Nome do token:', 'Token ERP');
  if (!name) return;
  try {
    var d = await fetch(BASE + '/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': storeApiKey },
      body: JSON.stringify({ name: name, expiresInDays: 365 })
    }).then(function(r) { return r.json(); });
    if (d.error) throw new Error(d.error);
    toast('Token gerado: ' + d.integration.token.substring(0,16) + '...');
    loadStoreTokens();
  } catch(e) { toast(e.message, 'err'); }
}

async function revokeStoreToken(id, storeApiKey) {
  if (!confirm('Revogar este token?')) return;
  try {
    await fetch(BASE + '/tokens/' + id + '/revogar', { method: 'DELETE', headers: { 'X-API-Key': storeApiKey } });
    toast('Token revogado'); loadStoreTokens();
  } catch(e) { toast(e.message, 'err'); }
}

function bindCpblockBtns() {
  document.querySelectorAll('[data-cpblock]').forEach(function(b) {
    b.addEventListener('click', function() { cpBlock(b.dataset.cpblock); });
  });
}

// ── BIND ALL EVENT LISTENERS ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function() {
  // Tenta restaurar sessão salva antes de mostrar o login
  var restored = await tryRestoreSession();
  document.getElementById('loading-screen').style.display = 'none';
  if (restored) {
    startApp();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
  }

  // Login
  document.getElementById('btn-login').addEventListener('click', doLogin);
  document.getElementById('login-pass').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
  document.getElementById('login-email').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
  document.getElementById('eye-btn').addEventListener('click', togglePass);
  document.getElementById('btn-logout').addEventListener('click', logout);

  document.getElementById('btn-sidebar-toggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(function(btn) {
    btn.addEventListener('click', function() { goTo(btn, btn.dataset.page); });
  });
  document.getElementById('nav-swagger').addEventListener('click', function() { window.open('/api/v1/docs', '_blank'); });
  document.getElementById('nav-status').addEventListener('click', function() { window.open('https://status.api.ofertatop.com.br', '_blank'); });

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

  // Admin: Lojas
  document.getElementById('btn-create-store').addEventListener('click', createStore);
  document.getElementById('btn-reload-stores').addEventListener('click', loadStores);
  document.getElementById('stores-q').addEventListener('input', function() { storesPage = 1; loadStores(); });
  document.getElementById('stores-plan-filter').addEventListener('change', function() { storesPage = 1; loadStores(); });

  // Admin: Tokens por Loja
  document.getElementById('btn-load-store-tokens').addEventListener('click', loadStoreTokens);
  document.getElementById('btn-reload-store-tokens').addEventListener('click', loadStoreTokens);
  document.getElementById('btn-gen-store-token').addEventListener('click', genStoreToken);
});