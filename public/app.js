import { SUPABASE_URL, SUPABASE_KEY, ENABLE_GOOGLE, SESSION_DAYS } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const BUCKET = "apresentacao";
const HERE = location.origin + location.pathname;

/* ───────────── utilidades ───────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICONS = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
};
const ic = (n) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || "") + "</svg>";
$$("[data-ic]").forEach((el) => (el.innerHTML = ic(el.dataset.ic)));
$$("[data-eye]").forEach((b) => {
  b.innerHTML = ic("eye");
  b.addEventListener("click", () => { const i = b.parentElement.querySelector("input"); i.type = i.type === "password" ? "text" : "password"; });
});
if (!ENABLE_GOOGLE) $$("[data-google], [data-google-or]").forEach((el) => (el.hidden = true));

let toastT;
function toast(msg, ms) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms || 3200);
}
function show(view) {
  $("#auth").hidden = false;
  $$("[data-view]").forEach((s) => (s.hidden = s.dataset.view !== view));
}
function loading(text) { $("[data-loading-text]").textContent = text || "Carregando…"; show("loading"); }
function fmtDate(v) {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d) ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}
function errText(e) {
  const m = String((e && (e.message || e.error_description || e.error)) || e || "");
  const L = m.toLowerCase();
  if (L.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (L.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Procure o link na caixa de entrada e no spam.";
  if (L.includes("already registered") || L.includes("already been registered")) return "Já existe um cadastro com esse e-mail. Use a aba Entrar.";
  if (L.includes("not authorized") && L.includes("email")) return "O envio de e-mails ainda não está configurado no Supabase. Avise o administrador.";
  if (L.includes("rate limit") || L.includes("security purposes")) return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  if (L.includes("password") && (L.includes("at least") || L.includes("weak"))) return "Senha fraca. Use pelo menos 8 caracteres, com letras e números.";
  if (L.includes("invalid") && L.includes("email")) return "Esse e-mail não é válido.";
  if (L.includes("failed to fetch") || L.includes("network")) return "Sem conexão com a internet. Verifique a rede e tente de novo.";
  if (L.includes("row-level security") || L.includes("permission") || L.includes("unauthorized") || L.includes("403")) return "Sem permissão para essa ação.";
  if (L.includes("not found") || L.includes("object not found")) return "Arquivo da apresentação não encontrado. Publique de novo.";
  return m || "Algo deu errado. Tente de novo.";
}
function busy(form, on) { $$("button", form).forEach((b) => (b.disabled = on)); }

/* ───────────── abas e formulários de acesso ───────────── */
function setTab(name) {
  $$("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  $$("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== name));
}
$$("[data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
$$("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));

$("#fLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, msg = $(".msg", f);
  const email = f.email.value.trim().toLowerCase(), pass = f.pass.value;
  if (!email || !pass) { msg.textContent = "Preencha e-mail e senha."; return; }
  msg.textContent = ""; busy(f, true);
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  busy(f, false);
  if (error) {
    msg.textContent = errText(error);
    if (String(error.message).toLowerCase().includes("not confirmed")) { lastEmail = email; $("[data-email]").textContent = email; show("verify"); }
  }
});

let lastEmail = "";
$("#fSignup").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, msg = $(".msg", f);
  const name = f.name.value.trim().replace(/\s+/g, " "), email = f.email.value.trim().toLowerCase();
  const phone = f.phone.value.trim(), company = f.company.value.trim(), pass = f.pass.value;
  if (name.split(" ").length < 2) { msg.textContent = "Escreva nome e sobrenome."; return; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = "Esse e-mail não é válido."; return; }
  if (phone.replace(/\D/g, "").length < 10) { msg.textContent = "Informe o WhatsApp com DDD."; return; }
  if (pass.length < 8 || !/[a-z]/i.test(pass) || !/\d/.test(pass)) { msg.textContent = "A senha precisa ter pelo menos 8 caracteres, com letras e números."; return; }
  if (pass !== f.pass2.value) { msg.textContent = "As senhas não conferem."; return; }
  msg.textContent = ""; busy(f, true);
  const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { name, phone, company }, emailRedirectTo: HERE } });
  busy(f, false);
  if (error) { msg.textContent = errText(error); return; }
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { msg.textContent = "Já existe um cadastro com esse e-mail. Use a aba Entrar."; return; }
  if (!data.session) { lastEmail = email; $("[data-email]").textContent = email; show("verify"); }
});

$$("[data-google]").forEach((b) => b.addEventListener("click", async () => {
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: HERE } });
  if (error) $(".msg", b.closest("form")).textContent = errText(error);
}));

$("#fReset").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, msg = $(".msg", f);
  const email = f.email.value.trim().toLowerCase();
  if (!email) { msg.className = "msg"; msg.textContent = "Informe o e-mail do cadastro."; return; }
  busy(f, true);
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: HERE });
  busy(f, false);
  if (error) { msg.className = "msg"; msg.textContent = errText(error); return; }
  msg.className = "msg ok"; msg.textContent = "Se houver um cadastro com esse e-mail, o link chega em alguns minutos. Confira também o spam.";
});

$("#fNewPass").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, msg = $(".msg", f), pass = f.pass.value;
  if (pass.length < 8 || !/[a-z]/i.test(pass) || !/\d/.test(pass)) { msg.textContent = "A senha precisa ter pelo menos 8 caracteres, com letras e números."; return; }
  if (pass !== f.pass2.value) { msg.textContent = "As senhas não conferem."; return; }
  busy(f, true);
  const { error } = await sb.auth.updateUser({ password: pass });
  busy(f, false);
  if (error) { msg.textContent = errText(error); return; }
  recovering = false;
  toast("Senha alterada.");
  const { data } = await sb.auth.getSession();
  if (data.session) start(data.session.user);
});

$("[data-resend]").addEventListener("click", async () => {
  const msg = $("[data-view=verify] .msg");
  const { error } = await sb.auth.resend({ type: "signup", email: lastEmail, options: { emailRedirectTo: HERE } });
  if (error) { msg.className = "msg"; msg.textContent = errText(error); }
  else { msg.className = "msg ok"; msg.textContent = "E-mail reenviado. Confira também o spam."; }
});
$$("[data-logout]").forEach((b) => b.addEventListener("click", () => logout()));

/* ───────────── sessão ───────────── */
let me = null, uid = null, running = false, recovering = false, pollMe = null, pollAdm = null, started = null;

function stopAll() {
  clearInterval(pollMe); pollMe = null;
  clearInterval(pollAdm); pollAdm = null;
  stopApp();
}
async function logout() {
  stopAll(); started = null; me = null;
  $("#menu").hidden = true; $("#admin").hidden = true;
  await sb.auth.signOut();
  setTab("login"); show("enter");
}

sb.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") { recovering = true; stopAll(); started = null; show("newpass"); return; }
  if (recovering) return;
  if (!session) { if (started) { stopAll(); started = null; me = null; } setTab("login"); show("enter"); return; }
  if (started === session.user.id) return; // renovação de token: nada muda
  setTimeout(() => start(session.user), 0);
});

async function start(user) {
  started = user.id; uid = user.id;
  const last = Date.parse(user.last_sign_in_at || "");
  if (last && Date.now() - last > SESSION_DAYS * 864e5) {
    toast("Sua sessão expirou. Entre de novo.", 5000);
    logout(); return;
  }
  loading("Verificando seu acesso…");
  sb.rpc("touch").then(() => {}, () => {});
  await refreshMe(true);
  clearInterval(pollMe);
  pollMe = setInterval(() => refreshMe(false), 10000);
}

async function refreshMe(first) {
  const { data, error } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
  if (started !== uid) return;
  if (error) { if (first) { toast(errText(error), 6000); show("pending"); } return; }
  if (!data) { stopApp(); deniedView("missing"); return; }
  const was = me && me.status;
  me = data;
  const who = "<b>" + esc(me.name) + "</b><br>" + esc(me.email);
  $$("[data-who]").forEach((w) => (w.innerHTML = who));
  $("[data-open-admin]").hidden = me.role !== "admin";
  if (me.status === "approved") {
    if (!running) openApp();
    if (me.role === "admin") watchUsers();
  } else {
    if (running || first || was !== me.status) { stopApp(); me.status === "pending" ? show("pending") : deniedView(me.status); }
  }
}
function deniedView(status) {
  const T = {
    rejected: ["Cadastro não aprovado", "O administrador não liberou este cadastro. Se achar que é um engano, fale com a Intersolid."],
    revoked: ["Acesso encerrado", "O administrador encerrou o seu acesso à apresentação. Fale com a Intersolid para saber mais."],
    missing: ["Cadastro não encontrado", "Sua conta existe, mas o cadastro não foi criado. Avise o administrador (o script do banco pode não ter sido executado)."]
  }[status] || ["Acesso não liberado", "Fale com o administrador da Intersolid para saber mais."];
  $("[data-denied-title]").textContent = T[0]; $("[data-denied-text]").textContent = T[1];
  show("denied");
}

/* ───────────── apresentação protegida ───────────── */
const cache = (function () {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open("isx-portal", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = (mode, fn) => open().then((d) => new Promise((res, rej) => { const t = d.transaction("kv", mode); const q = fn(t.objectStore("kv")); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  return {
    get: () => tx("readonly", (s) => s.get("app")).catch(() => null),
    set: (v) => tx("readwrite", (s) => s.put(v, "app")).catch(() => {})
  };
})();

async function latestVersion() {
  const { data, error } = await sb.from("versions").select("*").order("id", { ascending: false }).limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}
async function fetchVersion() {
  const cur = await latestVersion();
  if (!cur) return null;
  const c = await cache.get();
  if (c && c.path === cur.path && c.html) return { cur, html: c.html };
  loading("Baixando a apresentação…");
  const { data, error } = await sb.storage.from(BUCKET).download(cur.path);
  if (error) throw error;
  const html = await data.text();
  cache.set({ path: cur.path, html });
  return { cur, html };
}

async function openApp() {
  running = true;
  loading("Abrindo a apresentação…");
  try {
    const v = await fetchVersion();
    if (!running) return;
    if (!v) {
      running = false;
      if (me.role === "admin") nopubView();
      else { $("[data-nopub-title]").textContent = "Apresentação em preparação"; $("[data-nopub-text]").textContent = "O administrador ainda não publicou a apresentação. Tente mais tarde."; $("[data-nopub-drop]").hidden = true; show("nopub"); }
      return;
    }
    window.ISX_HOST = {
      role: me.role, name: me.name, email: me.email,
      publish: (html) => publish(html),
      menu: (rect) => openMenu(rect)
    };
    const fr = $("#app");
    fr.onload = () => {
      try {
        const d = fr.contentDocument;
        d.addEventListener("pointerdown", () => { $("#menu").hidden = true; }, true);
        d.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#menu").hidden = true; }, true);
      } catch (e) {}
    };
    fr.srcdoc = v.html;
    fr.hidden = false;
    $("#auth").hidden = true;
    paintWatermark();
    log("abriu a apresentação");
    if (me.role === "admin") setTimeout(() => { if (pendingCount > 0) toast(pendingCount + (pendingCount > 1 ? " cadastros aguardando" : " cadastro aguardando") + " aprovação. Abra pelo menu da sua conta.", 6000); }, 2500);
  } catch (err) {
    running = false;
    toast(errText(err), 7000);
    if (me && me.role === "admin") nopubView(); else show("pending");
  }
}
function stopApp() {
  running = false;
  const fr = $("#app");
  if (!fr.hidden || fr.hasAttribute("srcdoc")) { fr.hidden = true; fr.removeAttribute("srcdoc"); fr.src = "about:blank"; }
  $("#wm").hidden = true; $("#menu").hidden = true;
  delete window.ISX_HOST;
}
function paintWatermark() {
  const txt = (me.name + " · " + me.email + " · " + new Date().toLocaleDateString("pt-BR")).replace(/[<>&"]/g, "");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="460" height="260"><text x="10" y="150" fill="#fff" font-family="Montserrat, Verdana, sans-serif" font-size="15" font-weight="600" transform="rotate(-22 230 130)">' + txt + "</text></svg>";
  const wm = $("#wm");
  wm.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
  wm.hidden = false;
}
function log(event) {
  sb.from("logs").insert({ user_id: uid, email: me.email, name: me.name, event, ua: navigator.userAgent.slice(0, 160) }).then(() => {}, () => {});
}

/* publicar nova versão (o banco só aceita se for administrador) */
async function publish(html) {
  if (!me || me.role !== "admin") throw new Error("Só administradores podem publicar");
  if (!/<html[\s>]/i.test(html) || html.indexOf('id="knowData"') < 0) throw new Error("Este arquivo não parece ser a apresentação Intersolid");
  const path = "v" + Date.now() + ".html";
  const body = new Blob([html], { type: "text/plain;charset=utf-8" });
  const up = await sb.storage.from(BUCKET).upload(path, body, { contentType: "text/plain;charset=utf-8", upsert: false, cacheControl: "31536000" });
  if (up.error) throw new Error(errText(up.error));
  const ins = await sb.from("versions").insert({ path, size: html.length, created_by: me.email });
  if (ins.error) throw new Error(errText(ins.error));
  await cache.set({ path, html });
  log("publicou nova versão");
  return true;
}
function nopubView() {
  $("[data-nopub-title]").textContent = "Publique a apresentação";
  $("[data-nopub-text]").textContent = "Ainda não há nenhuma versão no portal. Envie o arquivo da apresentação para liberar o acesso aos vendedores.";
  $("[data-nopub-drop]").hidden = false;
  show("nopub");
}
async function publishFile(file, msgEl) {
  if (!file) return false;
  if (msgEl) { msgEl.className = "msg ok"; msgEl.textContent = "Publicando…"; }
  try {
    await publish(await file.text());
    if (msgEl) msgEl.textContent = "Publicado.";
    toast("Versão publicada para todos.", 5000);
    return true;
  } catch (err) {
    if (msgEl) { msgEl.className = "msg"; msgEl.textContent = errText(err); } else toast(errText(err), 6000);
    return false;
  }
}
$("[data-view=nopub] [data-publish-file]").addEventListener("change", async (e) => {
  const ok = await publishFile(e.target.files[0], $("[data-view=nopub] .msg"));
  e.target.value = "";
  if (ok) openApp();
});

/* ───────────── menu da conta ───────────── */
function openMenu(rect) {
  const m = $("#menu");
  $("[data-me-name]").textContent = me.name; $("[data-me-email]").textContent = me.email;
  m.hidden = false;
  const w = m.offsetWidth;
  m.style.top = Math.round((rect && rect.bottom ? rect.bottom : 60) + 8) + "px";
  m.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, Math.round((rect && rect.right ? rect.right : window.innerWidth - 12) - w))) + "px";
  setTimeout(() => { const b = $("button:not([hidden])", m); if (b) b.focus(); }, 0);
}
document.addEventListener("click", (e) => { const m = $("#menu"); if (!m.hidden && !m.contains(e.target)) m.hidden = true; }, true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $("#menu").hidden = true; if (!$("#admin").hidden) closeAdmin(); } });
$("[data-open-admin]").addEventListener("click", () => { $("#menu").hidden = true; openAdmin(); });

/* ───────────── painel de acessos ───────────── */
let users = [], pendingCount = 0, atab = "pending";
async function loadUsers() {
  const { data, error } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return;
  users = data || [];
  pendingCount = users.filter((u) => u.status === "pending").length;
  const c = $("[data-pending-count]"); c.hidden = !pendingCount; c.textContent = pendingCount;
  if (!$("#admin").hidden && atab !== "logs" && atab !== "version") drawAdmin();
}
function watchUsers() {
  if (pollAdm) return;
  loadUsers();
  pollAdm = setInterval(loadUsers, 15000);
}
function openAdmin() { $("#admin").hidden = false; drawAdmin(); loadUsers(); $("[data-close-admin]").focus(); }
function closeAdmin() { $("#admin").hidden = true; }
$("[data-close-admin]").addEventListener("click", closeAdmin);
$$("[data-atab]").forEach((b) => b.addEventListener("click", () => { atab = b.dataset.atab; drawAdmin(); }));

function drawAdmin() {
  $$("[data-atab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.atab === atab)));
  const groups = {
    pending: users.filter((u) => u.status === "pending"),
    approved: users.filter((u) => u.status === "approved"),
    blocked: users.filter((u) => u.status === "rejected" || u.status === "revoked")
  };
  Object.keys(groups).forEach((k) => ($("[data-n=" + k + "]").textContent = groups[k].length ? "(" + groups[k].length + ")" : ""));
  const pane = $("[data-apane]");
  if (atab === "logs") return drawLogs(pane);
  if (atab === "version") return drawVersion(pane);
  const list = groups[atab];
  const empty = { pending: "Nenhum cadastro aguardando. Quando alguém se cadastrar, aparece aqui.", approved: "Ninguém liberado ainda.", blocked: "Nenhum cadastro recusado ou revogado." }[atab];
  pane.innerHTML = list.length ? '<div class="ulist">' + list.map(row).join("") + "</div>" : '<p class="empty">' + empty + "</p>";
}
function row(u) {
  const self = me && u.id === me.id, boss = u.decided_by === "administrador principal";
  let acts = "";
  if (u.status === "pending") acts = btn("approve", "Aprovar", "ok") + btn("reject", "Recusar", "no");
  else if (u.status === "approved") {
    if (!boss && !self) acts = (u.role === "admin" ? btn("unadmin", "Remover administrador", "ghost") : btn("admin", "Tornar administrador", "ghost")) + btn("revoke", "Revogar acesso", "no");
  } else acts = btn("approve", "Liberar", "ok");
  const tags = (u.role === "admin" ? '<span class="tag adm">ADM</span>' : "") + (boss ? '<span class="tag adm">principal</span>' : "");
  const when = u.status === "pending" ? "Cadastro em " + fmtDate(u.created_at) : u.status === "approved" ? "Último acesso " + fmtDate(u.last_seen) : "Decidido em " + fmtDate(u.decided_at);
  return '<div class="urow" data-uid="' + esc(u.id) + '"><div><b>' + esc(u.name) + tags + "</b><small>" + esc(u.email) + "</small></div>" +
    "<div><small>" + esc(u.phone || "sem telefone") + (u.company ? " · " + esc(u.company) : "") + "</small><small>" + when + "</small></div>" +
    '<div class="acts">' + acts + "</div></div>";
  function btn(a, t, k) { return '<button class="btn sm ' + k + '" type="button" data-act="' + a + '">' + t + "</button>"; }
}
$("[data-apane]").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.closest("[data-uid]").dataset.uid, u = users.find((x) => x.id === id); if (!u) return;
  const a = b.dataset.act, stamp = { decided_at: new Date().toISOString(), decided_by: me.email };
  let patch = null, ok = "";
  if (a === "approve") { patch = { status: "approved" }; ok = u.name + " foi liberado."; }
  else if (a === "reject") { if (!confirm("Recusar o cadastro de " + u.name + "?")) return; patch = { status: "rejected" }; ok = "Cadastro recusado."; }
  else if (a === "revoke") { if (!confirm("Revogar o acesso de " + u.name + "? A apresentação fecha para essa pessoa em até 10 segundos.")) return; patch = { status: "revoked", role: "vendor" }; ok = "Acesso revogado."; }
  else if (a === "admin") { if (!confirm(u.name + " poderá aprovar pessoas e publicar conteúdo. Continuar?")) return; patch = { role: "admin" }; ok = u.name + " agora é administrador."; }
  else if (a === "unadmin") { patch = { role: "vendor" }; ok = u.name + " voltou a ser vendedor."; }
  if (!patch) return;
  b.disabled = true;
  const { data, error } = await sb.from("profiles").update(Object.assign(patch, stamp)).eq("id", id).select();
  b.disabled = false;
  if (error || !data || !data.length) { toast(error ? errText(error) : "Sem permissão para alterar esse cadastro.", 6000); return; }
  toast(ok);
  loadUsers();
});
async function drawLogs(pane) {
  pane.innerHTML = '<p class="empty">Carregando…</p>';
  const { data, error } = await sb.from("logs").select("*").order("at", { ascending: false }).limit(150);
  if (atab !== "logs") return;
  if (error) { pane.innerHTML = '<p class="empty">' + esc(errText(error)) + "</p>"; return; }
  pane.innerHTML = data.length
    ? '<div class="tscroll"><table class="logs"><thead><tr><th>Quando</th><th>Quem</th><th>O que</th></tr></thead><tbody>' +
      data.map((r) => "<tr><td>" + fmtDate(r.at) + "</td><td>" + esc(r.name || "") + '<br><small style="color:var(--haze)">' + esc(r.email || "") + "</small></td><td>" + esc(r.event || "") + "</td></tr>").join("") +
      "</tbody></table></div>"
    : '<p class="empty">Nenhum acesso registrado ainda.</p>';
}
async function drawVersion(pane) {
  let cur = null;
  try { cur = await latestVersion(); } catch (e) {}
  if (atab !== "version") return;
  pane.innerHTML =
    '<div class="ver"><div>' + (cur
      ? "<b>Versão no ar</b><small>Publicada em " + fmtDate(cur.created_at) + " por " + esc(cur.created_by || "—") + " · " + (Math.round((cur.size || 0) / 1e5) / 10) + " MB</small>"
      : "<b>Nenhuma versão publicada</b><small>Envie o arquivo da apresentação para liberar os vendedores.</small>") +
    '</div><label class="btn primary sm" style="cursor:pointer">' + ic("upload") + 'Publicar arquivo .html<input type="file" accept=".html,text/html" hidden data-ver-file></label></div>' +
    '<p class="msg" data-ver-msg style="margin-top:12px"></p>' +
    '<p style="color:var(--haze);font-size:13.5px;margin-top:6px">O jeito mais simples de atualizar é pelo próprio painel ADM da apresentação: cadastre os conteúdos e clique em <b>Publicar para todos</b>. Use este botão só para enviar um arquivo inteiro.</p>';
  $("[data-ver-file]", pane).addEventListener("change", async (e) => {
    const ok = await publishFile(e.target.files[0], $("[data-ver-msg]", pane));
    e.target.value = "";
    if (ok) { drawVersion(pane); if (confirm("Recarregar a apresentação com a nova versão agora?")) { closeAdmin(); stopApp(); openApp(); } }
  });
}
