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
  var pre = el.querySelector('.code-pre');
  var t = el.dataset.raw || (pre ? pre.textContent : '');
  cpText(String(t).trim());
}
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
var COPY_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M9 3.25A5.75 5.75 0 0 0 3.25 9v7.107a.75.75 0 0 0 1.5 0V9A4.25 4.25 0 0 1 9 4.75h7.013a.75.75 0 0 0 0-1.5z"/><path fill="currentColor" fill-rule="evenodd" d="M18.403 6.793a44.4 44.4 0 0 0-9.806 0a2.01 2.01 0 0 0-1.774 1.76a42.6 42.6 0 0 0 0 9.894a2.01 2.01 0 0 0 1.774 1.76c3.241.362 6.565.362 9.806 0a2.01 2.01 0 0 0 1.774-1.76a42.6 42.6 0 0 0 0-9.894a2.01 2.01 0 0 0-1.774-1.76M8.764 8.284c3.13-.35 6.342-.35 9.472 0a.51.51 0 0 1 .45.444a41 41 0 0 1 0 9.544a.51.51 0 0 1-.45.444c-3.13.35-6.342.35-9.472 0a.51.51 0 0 1-.45-.444a41 41 0 0 1 0-9.544a.51.51 0 0 1 .45-.444" clip-rule="evenodd"/></svg>';
function maskToken(token) {
  if (!token) return '—';
  if (token.length < 20) return token;
  return token.substring(0, 10) + '...' + token.substring(token.length - 6);
}
function tokenCopyBtn(token, label) {
  return '<button type="button" class="btn btn-ghost btn-cred btn-cred--icon cp-token-btn" data-cp-text="' + escAttr(token) + '" aria-label="' + escAttr(label) + '" title="' + escAttr(label) + '">' + COPY_ICON_SVG + '</button>';
}
function tokenCell(token, name) {
  return '<div class="token-cell"><code class="token-cell-val">' + escHtml(maskToken(token)) + '</code>' + tokenCopyBtn(token, 'Copiar token ' + name) + '</div>';
}
function bindTokenCopyBtns(root) {
  (root || document).querySelectorAll('.cp-token-btn').forEach(function(b) {
    if (b.dataset.cpBound) return;
    b.dataset.cpBound = '1';
    b.addEventListener('click', function() { cpText(b.dataset.cpText || ''); });
  });
}
function hlStrings(t) {
  return t.replace(/('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g, '<span class="tok-string">$&</span>');
}
function hlWords(t, words, cls) {
  if (!words.length) return t;
  return t.replace(new RegExp('\\b(' + words.join('|') + ')\\b', 'g'), '<span class="' + cls + '">$&</span>');
}
function highlightCode(code, lang) {
  var t = escHtml(code || '');
  if (lang === 'dotenv') {
    return t.split('\n').map(function(line) {
      if (/^\s*#/.test(line)) return '<span class="tok-comment">' + line + '</span>';
      var eq = line.indexOf('=');
      if (eq > 0) {
        return '<span class="tok-property">' + line.slice(0, eq) + '</span><span class="tok-punct">=</span><span class="tok-string">' + line.slice(eq + 1) + '</span>';
      }
      return line;
    }).join('\n');
  }
  if (lang === 'shell') {
    t = hlStrings(t);
    t = hlWords(t, ['curl'], 'tok-keyword');
    t = t.replace(/(\s)(-[A-Za-z]+)/g, '$1<span class="tok-flag">$2</span>');
    return t;
  }
  if (lang === 'php') {
    t = hlStrings(t);
    t = t.replace(/\b(new)\b/g, '<span class="tok-keyword">new</span>');
    t = t.replace(/\$(\w+)/g, '<span class="tok-variable">$$$1</span>');
    return t;
  }
  t = hlStrings(t);
  t = hlWords(t, ['const', 'let', 'var', 'new', 'return', 'async', 'await', 'function', 'import', 'from'], 'tok-keyword');
  t = hlWords(t, ['axios', 'create'], 'tok-fn');
  return t;
}
var VSCODE_ICONS = {
  dotenv: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true"><path d="M0 0h256v256H0z" fill="none"/><path fill="currentColor" d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16M92.8 145.6a8 8 0 1 1-9.6 12.8l-32-24a8 8 0 0 1 0-12.8l32-24a8 8 0 0 1 9.6 12.8L69.33 128Zm58.89-71.4l-32 112a8 8 0 1 1-15.38-4.4l32-112a8 8 0 0 1 15.38 4.4m53.11 60.2l-32 24a8 8 0 0 1-9.6-12.8l23.47-17.6l-23.47-17.6a8 8 0 1 1 9.6-12.8l32 24a8 8 0 0 1 0 12.8"/></svg>',
  javascript: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M19.131 3H4.869c-.955 0-1.73.787-1.73 1.758v14.484c0 .97.775 1.758 1.73 1.758h14.262c.956 0 1.73-.787 1.73-1.758V4.758c0-.97-.774-1.758-1.73-1.758m-5.712 9.984h-2.215v6.434H9.439v-6.434H7.223v-1.441h6.196zm5.712 5.277c-.139.317-.377.552-.658.739a3 3 0 0 1-.969.386a5.6 5.6 0 0 1-1.177.12a6.5 6.5 0 0 1-1.211-.11a3.7 3.7 0 0 1-1.004-.33v-1.689l-.066-.053l.066-.015v.068q.441.357.972.545c.347.133.727.2 1.108.2c.242 0 .426-.021.589-.06a1.4 1.4 0 0 0 .415-.168a.7.7 0 0 0 .246-.253a.7.7 0 0 0-.052-.738a1.3 1.3 0 0 0-.346-.335a3 3 0 0 0-.52-.295c-.207-.095-.418-.194-.657-.292c-.589-.281-1.053-.562-1.35-.95c-.301-.35-.45-.808-.45-1.335c0-.422.08-.76.242-1.055c.173-.316.377-.548.658-.738c.277-.193.588-.334.969-.422c.38-.088.762-.133 1.177-.133s.762.024 1.073.073c.311.05.602.127.865.229v1.652a2.3 2.3 0 0 0-.415-.242a3.8 3.8 0 0 0-.97-.275a3 3 0 0 0-.45-.033a2.4 2.4 0 0 0-.553.057a1.3 1.3 0 0 0-.416.161a.8.8 0 0 0-.26.25a.6.6 0 0 0-.093.327q0 .194.104.351q.103.152.295.296c.114.091.27.183.45.274c.207.091.394.183.623.278c.311.133.588.281.83.422c.243.14.447.305.623.492c.187.175.322.387.416.633s.142.523.142.843c0 .457-.108.809-.246 1.125"/></svg>',
  php: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><path d="M0 0h32v32H0z" fill="none"/><path fill="currentColor" d="M9.349 13.609H8.088l-.687 3.531h1.12q1.108 0 1.656-.421c.359-.276.604-.745.729-1.396c.124-.625.067-1.068-.161-1.328q-.351-.384-1.396-.385zM16 7.584C7.161 7.584 0 11.355 0 16s7.161 8.416 16 8.416S32 20.645 32 16s-7.161-8.416-16-8.416m-4.349 9.937a3.2 3.2 0 0 1-1.219.733c-.448.141-1.02.219-1.713.219H7.14l-.432 2.24H4.869l1.641-8.432h3.531q1.595-.001 2.328.833c.485.557.636 1.339.437 2.339a3.8 3.8 0 0 1-.405 1.131a3.8 3.8 0 0 1-.751.937zm5.37.952l.724-3.733q.125-.634-.095-.871q-.212-.228-.916-.229h-1.453l-.937 4.833h-1.828l1.64-8.437h1.823l-.437 2.245h1.625c1.027 0 1.729.177 2.115.531c.391.36.505.937.355 1.735l-.767 3.927zm10.124-3.02a3.7 3.7 0 0 1-.405 1.131a3.8 3.8 0 0 1-.745.937a3.3 3.3 0 0 1-1.224.733c-.448.141-1.021.219-1.713.219h-1.573l-.437 2.24h-1.839l1.641-8.432h3.531c1.063 0 1.839.276 2.328.839c.485.552.636 1.333.437 2.333zm-3.457-1.844h-1.256l-.687 3.531h1.115q1.116 0 1.656-.421c.364-.276.609-.745.735-1.396q.185-.938-.168-1.328c-.228-.255-.697-.385-1.395-.385z"/></svg>',
  shell: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true"><path d="M0 0h256v256H0z" fill="none"/><path fill="currentColor" d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16M88 155.84c.29 14.26.41 20.16 16 20.16a8 8 0 0 1 0 16c-31.27 0-31.72-22.43-32-35.84c-.29-14.26-.41-20.16-16-20.16a8 8 0 0 1 0-16c15.59 0 15.71-5.9 16-20.16c.28-13.41.73-35.84 32-35.84a8 8 0 0 1 0 16c-15.59 0-15.71 5.9-16 20.16c-.17 8.31-.41 20.09-8 27.84c7.59 7.75 7.83 19.53 8 27.84M200 136c-15.59 0-15.71 5.9-16 20.16c-.28 13.41-.73 35.84-32 35.84a8 8 0 0 1 0-16c15.59 0 15.71-5.9 16-20.16c.17-8.31.41-20.09 8-27.84c-7.6-7.75-7.84-19.53-8-27.84c-.29-14.26-.41-20.16-16-20.16a8 8 0 0 1 0-16c31.27 0 31.72 22.43 32 35.84c.29 14.26.41 20.16 16 20.16a8 8 0 0 1 0 16"/></svg>'
};
var VSCODE_BLOCK_LANG = { 'env-block': 'dotenv', 'ex-node': 'javascript', 'ex-php': 'php', 'ex-curl': 'shell' };
function bindCodeDragScroll(pre) {
  if (!pre || pre.dataset.dragScroll) return;
  pre.dataset.dragScroll = '1';
  var active = false, sx, sy, sl, st;
  pre.addEventListener('mousedown', function(e) {
    if (e.button !== 0 || e.target.closest('button')) return;
    active = true;
    pre.classList.add('is-dragging');
    sx = e.clientX; sy = e.clientY; sl = pre.scrollLeft; st = pre.scrollTop;
    e.preventDefault();
  });
  window.addEventListener('mousemove', function(e) {
    if (!active) return;
    pre.scrollLeft = sl - (e.clientX - sx);
    pre.scrollTop = st - (e.clientY - sy);
  });
  window.addEventListener('mouseup', function() {
    if (!active) return;
    active = false;
    pre.classList.remove('is-dragging');
  });
}
function vscodeBlockHtml(id, code, lang, showCopy) {
  var icon = VSCODE_ICONS[lang] || VSCODE_ICONS.dotenv;
  var body = code
    ? '<pre class="code-pre"><code>' + highlightCode(code, lang) + '</code></pre>'
    : '<pre class="code-pre"><code class="tok-muted">' + escHtml(id === 'env-block' ? 'Gere um token primeiro para ver as variáveis.' : '—') + '</code></pre>';
  var copyBtn = showCopy !== false
    ? '<button type="button" class="cpbtn" data-cpblock="' + id + '">copiar</button>'
    : '';
  return '<div class="vscode-toolbar"><span class="vscode-lang-icon">' + icon + '</span>' + copyBtn + '</div>' + body;
}
function setVscodeBlock(id, code, lang) {
  var el = document.getElementById(id);
  if (!el) return;
  lang = lang || el.dataset.vscodeLang || VSCODE_BLOCK_LANG[id] || 'dotenv';
  el.dataset.raw = code;
  el.dataset.vscodeLang = lang;
  el.className = (id === 'env-block' ? 'vscode-block env-block' : 'vscode-block code');
  el.innerHTML = vscodeBlockHtml(id, code, lang, true);
  bindCodeDragScroll(el.querySelector('.code-pre'));
}
function initVscodePlaceholders() {
  ['env-block', 'ex-node', 'ex-php', 'ex-curl'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el || el.querySelector('.vscode-toolbar')) return;
    var lang = el.dataset.vscodeLang || VSCODE_BLOCK_LANG[id] || 'dotenv';
    var placeholder = id === 'env-block' ? '' : null;
    el.innerHTML = vscodeBlockHtml(id, placeholder, lang, id !== 'env-block');
    bindCodeDragScroll(el.querySelector('.code-pre'));
  });
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

async function parseJsonRes(r) {
  var d = await r.json().catch(function() { return {}; });
  return { ok: r.ok, status: r.status, data: d };
}

async function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pass = document.getElementById('login-pass').value;
  document.getElementById('login-err').style.display = 'none';
  if (!email || !pass) { showErr('Preencha email e senha'); return; }
  var btn = document.getElementById('btn-login');
  btn.innerHTML = BTN_LOADING; btn.disabled = true;
  var lastErr = 'Email ou senha inválidos';
  try {
    var adminRes = await parseJsonRes(await fetch(BASE + '/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    }));
    if (adminRes.ok && adminRes.data.token) {
      localStorage.removeItem('lojapi_slug');
      S.token = adminRes.data.token; S.name = adminRes.data.user.name; S.role = adminRes.data.user.role;
      S.storeName = 'Admin'; S.apiKey = null; S.storeId = null; S.slug = null;
      saveSession();
      btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
      startApp(); return;
    }
    if (adminRes.data.error) lastErr = adminRes.data.error;

    var saved = localStorage.getItem('lojapi_slug') || '';
    if (saved) {
      var lojaRes = await parseJsonRes(await fetch(BASE + '/auth/loja/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pass, storeSlug: saved })
      }));
      if (lojaRes.ok && lojaRes.data.token) {
        localStorage.setItem('lojapi_slug', lojaRes.data.store.slug);
        S.token = lojaRes.data.token; S.name = lojaRes.data.user.name; S.role = lojaRes.data.user.role;
        S.storeId = lojaRes.data.store.id; S.slug = lojaRes.data.store.slug; S.storeName = lojaRes.data.store.name;
        var loja = await fetch(BASE + '/loja', { headers: { 'Authorization': 'Bearer ' + S.token } }).then(function(r) { return r.json(); });
        S.apiKey = loja.apiKey; S.storeId = loja.id;
        saveSession();
        btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
        startApp(); return;
      }
      if (lojaRes.data.error) lastErr = lojaRes.data.error;
    }

    showErr(lastErr);
  } catch(e) { showErr(e.message); }
  btn.innerHTML = BTN_DEFAULT; btn.disabled = false;
}

function setUserAvatar(name) {
  var el = document.getElementById('user-avatar');
  if (!el) return;
  if (!name || name === '—') { el.textContent = '?'; return; }
  el.textContent = name.trim()[0].toUpperCase();
}

function startApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('user-name').textContent = S.name || '—';
  document.getElementById('user-role').textContent = S.role || '—';
  setUserAvatar(S.name);
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
      return;
    }
    var store = stores[0];
    S.apiKey = store.apiKey;
    S.storeId = store.id;
    S.slug = store.slug;
    S.storeName = store.name;
    saveSession();
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
  closeMobileMenu();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
  document.body.classList.remove('menu-open');
}

function toggleSidebar() {
  if (isMobile()) {
    var sidebar = document.getElementById('sidebar');
    var open = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    document.getElementById('sidebar-overlay').classList.toggle('visible', open);
    document.body.classList.toggle('menu-open', open);
  } else {
    document.getElementById('sidebar').classList.toggle('collapsed');
  }
}

function goTo(btn, page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  document.getElementById('page-' + page).classList.add('active');
  btn.classList.add('active');
  if (isMobile()) closeMobileMenu();
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
      return '<tr><td><b>' + t.name + '</b></td><td class="td-token-copy">' + tokenCell(t.token, t.name) + '</td><td class="muted sm">' + dt(t.createdAt) + '</td><td>' + (t.expiresAt ? dt(t.expiresAt) : '<span class="badge bm">Nunca</span>') + '</td><td>' + (t.lastUsedAt ? dt(t.lastUsedAt) : '<span class="muted">—</span>') + '</td><td><button class="btn btn-danger btn-sm revoke-btn" data-id="' + t.id + '">Remover</button></td></tr>';
    }).join('');
    bindTokenCopyBtns(tb);
    document.querySelectorAll('.revoke-btn').forEach(function(b) {
      b.addEventListener('click', function() { revokeToken(b.dataset.id); });
    });
  } catch(e) { toast(e.message, 'err'); }
}

async function genToken() {
  var name = document.getElementById('tk-name').value.trim() || 'Token ERP';
  var daysVal = document.getElementById('tk-days').value;
  var body = { name: name };
  if (daysVal) body.expiresInDays = parseInt(daysVal, 10);
  try {
    var d = await req('POST', '/tokens', body);
    document.getElementById('tk-val').textContent = d.integration.token;
    document.getElementById('tk-expires').textContent = d.integration.expiresAt ? 'Expira em: ' + dt(d.integration.expiresAt) : 'Sem expiração';
    document.getElementById('tk-result').style.display = 'block';
    toast('Token gerado!'); loadTokens(); loadEnv();
  } catch(e) { toast(e.message, 'err'); }
}

async function revokeToken(id) {
  if (!confirm('Remover este token permanentemente?')) return;
  try { await req('DELETE', '/tokens/' + id + '/revogar'); toast('Token removido'); loadTokens(); loadEnv(); }
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
var WEBHOOK_EVENT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.062 13A4 4 0 1 0 11 16.5h6"/><path stroke-linecap="round" stroke-linejoin="round" d="m12 7.5l3.057 5.503a4 4 0 1 1-.557 6.62"/><path d="M12 8.5a1 1 0 1 0 0-2m0 2a1 1 0 1 1 0-2m0 2v-2m-5 11a1 1 0 1 0 0-2m0 2a1 1 0 1 1 0-2m0 2v-2m10 2a1 1 0 1 0 0-2m0 2a1 1 0 1 1 0-2m0 2v-2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 7.5a4 4 0 1 0-5.943 3.497L7 16.5"/></g></svg>';
var WEBHOOK_EVENT_BOLD = { 'order.created': true, 'order.status_changed': true };
async function loadEvents() {
  try {
    var d = await req('GET', '/webhook/eventos');
    document.getElementById('events-grid').innerHTML = d.map(function(e) {
      var titleCls = 'event-card-title' + (WEBHOOK_EVENT_BOLD[e.event] ? ' is-bold' : '');
      return '<div class="event-card">' +
        '<span class="event-card-icon">' + WEBHOOK_EVENT_ICON + '</span>' +
        '<div class="event-card-body">' +
          '<div class="' + titleCls + '">' + e.event + '</div>' +
          '<div class="event-card-desc">' + e.description + '</div>' +
        '</div></div>';
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
    var envText = Array.isArray(d.dotenv_format) ? d.dotenv_format.join('\n') : (d.dotenv_format || '');
    setVscodeBlock('env-block', envText, 'dotenv');
    setVscodeBlock('ex-node', d.examples.node, 'javascript');
    setVscodeBlock('ex-php', d.examples.php, 'php');
    setVscodeBlock('ex-curl', d.examples.curl, 'shell');
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
        '<td class="td-token-copy">' + tokenCell(t.token, t.name) + '</td>' +
        '<td class="muted sm">' + dt(t.createdAt) + '</td>' +
        '<td>' + (t.expiresAt ? dt(t.expiresAt) : '<span class="badge bm">Nunca</span>') + '</td>' +
        '<td>' + (t.lastUsedAt ? dt(t.lastUsedAt) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (t.active ? '<span class="badge bg">ativo</span>' : '<span class="badge br">inativo</span>') + '</td>' +
        '<td><button class="btn btn-danger btn-sm st-revoke-btn" data-id="' + t.id + '" data-key="' + storeApiKey + '">Remover</button></td>' +
      '</tr>';
    }).join('');
    bindTokenCopyBtns(tb);
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
  if (!confirm('Remover este token permanentemente?')) return;
  try {
    await fetch(BASE + '/tokens/' + id + '/revogar', { method: 'DELETE', headers: { 'X-API-Key': storeApiKey } });
    toast('Token removido'); loadStoreTokens();
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

  document.getElementById('btn-sidebar-toggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeMobileMenu);
  window.addEventListener('resize', function() {
    if (!isMobile()) closeMobileMenu();
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(function(btn) {
    btn.addEventListener('click', function() { goTo(btn, btn.dataset.page); });
  });
  document.getElementById('nav-swagger').addEventListener('click', function() { closeMobileMenu(); window.open('/api/v1/docs', '_blank'); });
  document.getElementById('nav-status').addEventListener('click', function() { closeMobileMenu(); window.open('https://status.api.ofertatop.com.br', '_blank'); });

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
  initVscodePlaceholders();
  document.getElementById('btn-cp-env').addEventListener('click', function() { cpBlock('env-block'); });
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