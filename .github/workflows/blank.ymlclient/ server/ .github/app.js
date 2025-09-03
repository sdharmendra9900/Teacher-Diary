// app.js - Teacher Daily Diary (refactored)
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const nowISO = () => new Date().toISOString().slice(0,10);
const pad2 = (n) => n.toString().padStart(2,'0');

const clockEl = $('#clock');
const btnLogout = $('#btnLogout');

function tickClock(){
  const d = new Date();
  const date = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  clockEl.textContent = `${date} · ${time}`;
}
setInterval(tickClock,1000); tickClock();

// ---------- Storage Keys ----------
const LS_USERS = 'td_users';
const LS_SESSION = 'td_session';
const LS_PROFILE = (u) => `td_profile_${u}`;
const LS_ENTRIES = (u) => `td_entries_${u}`;

// ---------- Load / Seed Users ----------
function loadUsers(){
  const raw = localStorage.getItem(LS_USERS);
  let users = {};
  if(raw){ try { users = JSON.parse(raw); } catch{ users = {}; } }
  const seed = {
    user1: {pass: 'user123', email: 'user1@example.com', is_active: true, isAdmin: false},
    user2: {pass:'user123', email: 'user2@example.com', is_active: true, isAdmin: false},
    admin1: {pass: 'admin123', email: 'admin@example.com', is_active: true, isAdmin: true}
  };
  for (const key in seed) {
      if (!users[key]) {
          users[key] = seed[key];
      } else {
          if (users[key].is_active === undefined) users[key].is_active = true;
          if (users[key].isAdmin === undefined) users[key].isAdmin = false;
      }
  }
  localStorage.setItem(LS_USERS, JSON.stringify(users));
  return users;
}
let USERS = loadUsers();

function getSession(){ return localStorage.getItem(LS_SESSION) || null; }
function setSession(u){ if(u) localStorage.setItem(LS_SESSION, u); else localStorage.removeItem(LS_SESSION); }

// UI Sections
const authCard = $('#authCard');
const registerCard = $('#registerCard');
const profileCard = $('#profileCard');
const diaryCard = $('#diaryCard');
const logCard = $('#logCard');
const adminCard = $('#adminCard');

function show(section){
  [authCard, registerCard, profileCard, diaryCard, logCard, adminCard].forEach(el => el.classList.add('hidden'));
  section.classList.remove('hidden');
  if(section !== authCard && section !== registerCard) logCard.classList.remove('hidden');
}

// Auth handlers
const btnLogin = $('#btnLogin');
const btnShowRegister = $('#btnShowRegister');
const authMsg = $('#authMsg');

btnLogin.addEventListener('click', () => {
  const u = $('#loginUser').value.trim();
  const p = $('#loginPass').value;
  const user = USERS[u];
  if(!user){ authMsg.textContent = 'Invalid credentials.'; return; }
  if(user.pass !== p){ authMsg.textContent = 'Invalid credentials.'; return; }
  if(user.is_active === false){ authMsg.textContent = 'Account disabled. Contact your administrator.'; return; }
  setSession(u);
  authMsg.textContent = '';
  initAfterLogin();
});

btnLogout.addEventListener('click', () => {
  setSession(null);
  btnLogout.classList.add('hidden');
  show(authCard);
});

btnShowRegister.addEventListener('click', () => {
  show(registerCard);
  $('#registerMsg').textContent = '';
});

$('#btnShowLogin').addEventListener('click', () => {
  show(authCard);
  $('#authMsg').textContent = '';
});

$('#btnRegister').addEventListener('click', () => {
  const name = $('#regName').value.trim();
  const mobile = $('#regMobile').value.trim();
  const email = $('#regEmail').value.trim();
  const u = $('#regUser').value.trim();
  const p = $('#regPass').value;
  const registerMsg = $('#registerMsg');

  if (!name || !mobile || !email || !u || !p) {
    registerMsg.textContent = 'Please fill out all fields.'; registerMsg.className='muted danger'; return;
  }
  if (USERS[u]) { registerMsg.textContent = 'Username already exists.'; registerMsg.className='muted danger'; return; }
  USERS[u] = { name, mobile, email, pass: p, is_active: true, isAdmin: false };
  localStorage.setItem(LS_USERS, JSON.stringify(USERS));
  registerMsg.textContent = 'Registration successful! You can now log in.'; registerMsg.className='muted success';
  setTimeout(()=>{ show(authCard); $('#loginUser').value = u; $('#regName').value=''; $('#regMobile').value=''; $('#regEmail').value=''; $('#regUser').value=''; $('#regPass').value=''; registerMsg.textContent=''; },1500);
});

// Profile
const btnSaveProfile = $('#btnSaveProfile');
const btnResetProfile = $('#btnResetProfile');
const profileMsg = $('#profileMsg');

function getProfile(u){ const raw = localStorage.getItem(LS_PROFILE(u)); return raw ? JSON.parse(raw) : null; }
function setProfile(u, data){ localStorage.setItem(LS_PROFILE(u), JSON.stringify(data)); }

btnSaveProfile.addEventListener('click', () => {
  const u = getSession(); if(!u) return;
  const data = {
    name: $('#tName').value.trim(),
    subject: $('#tSubject').value.trim(),
    email: $('#tEmail').value.trim(),
    school: $('#tSchool').value.trim(),
    academicYear: $('#tAcademicYear').value.trim()
  };
  if(!data.name){ profileMsg.textContent = 'Please enter your name.'; return; }
  setProfile(u, data);
  profileMsg.textContent = 'Profile saved ✓';
  show(diaryCard);
  loadProfileIntoForm();
});

btnResetProfile.addEventListener('click', () => {
  const u = getSession(); if(!u) return;
  localStorage.removeItem(LS_PROFILE(u));
  loadProfileIntoForm();
  profileMsg.textContent = 'Profile reset. Fill again.';
});

function loadProfileIntoForm(){
  const u = getSession(); if(!u) return;
  const p = getProfile(u) || {name: '', subject: '', email: '', school: '', academicYear: ''};
  $('#tName').value = p.name || '';
  $('#tSubject').value = p.subject || '';
  $('#tEmail').value = p.email || '';
  $('#tSchool').value = p.school || '';
  $('#tAcademicYear').value = p.academicYear || '';
}

// Diary entry
const todayBadge = $('#todayBadge');
const entryDate = $('#entryDate');
const classSel = $('#classSel');
const periodSel = $('#periodSel');
const subjectSel = $('#subjectSel');
const topic = $('#topic');
const remarks = $('#remarks');
const attnMsg = $('#attnMsg');
const saveMsg = $('#saveMsg');

function seedClassAndPeriod(){
  classSel.innerHTML = '';
  for(let c=6; c<=12; c++){
    ['A','B'].forEach(sec => {
      const opt = document.createElement('option');
      opt.value = `${c}-${sec}`;
      opt.textContent = `Class ${c} · Section ${sec}`;
      classSel.appendChild(opt);
    });
  }
  periodSel.innerHTML = '';
  for(let p=1; p<=8; p++){
    const opt = document.createElement('option');
    opt.value = String(p);
    opt.textContent = `Period ${p}`;
    periodSel.appendChild(opt);
  }
}

function autoSetDate(){
  const today = nowISO();
  entryDate.value = today;
  todayBadge.textContent = new Date().toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'});
}

function calcPresent(){
  const total = +$('#strength').value || 0;
  const ab = +$('#absent').value || 0;
  const late = +$('#late').value || 0;
  const sick = +$('#sick').value || 0;
  const od = +$('#od').value || 0;
  const nr = +$('#nr').value || 0;
  const other = +$('#other').value || 0;
  const nonPresent = ab + late + sick + od + nr + other;
  const present = Math.max(0, total - nonPresent);
  $('#present').value = present;
  const delta = total - (present + nonPresent);
  attnMsg.textContent = delta === 0 ? 'Attendance tallies correctly.' : `Check counts: off by ${delta}.`;
}

$('#btnAutoCalc').addEventListener('click', calcPresent);
['strength','absent','late','sick','od','nr','other','present'].forEach(id => {
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('input', () => {
    const total = +$('#strength').value || 0;
    const present = +$('#present').value || 0;
    const ab = +$('#absent').value || 0;
    const late = +$('#late').value || 0;
    const sick = +$('#sick').value || 0;
    const od = +$('#od').value || 0;
    const nr = +$('#nr').value || 0;
    const other = +$('#other').value || 0;
    const sum = present + ab + late + sick + od + nr + other;
    const delta = total - sum;
    attnMsg.textContent = delta === 0 ? 'Attendance tallies correctly.' : `Check counts: off by ${delta}.`;
  });
});

// Entries save/load
function getEntries(u){ const raw = localStorage.getItem(LS_ENTRIES(u)); return raw ? JSON.parse(raw) : []; }
function setEntries(u, arr){ localStorage.setItem(LS_ENTRIES(u), JSON.stringify(arr)); }

function entryFromForm(){
  return {
    date: entryDate.value,
    class: classSel.value,
    period: periodSel.value,
    subject: subjectSel.value.trim(),
    topic: topic.value.trim(),
    remarks: remarks.value.trim(),
    strength: +$('#strength').value || 0,
    present: +$('#present').value || 0,
    absent: +$('#absent').value || 0,
    late: +$('#late').value || 0,
    sick: +$('#sick').value || 0,
    od: +$('#od').value || 0,
    nr: +$('#nr').value || 0,
    other: +$('#other').value || 0,
    ts: Date.now()
  };
}

function formFromEntry(e){
  entryDate.value = e.date;
  classSel.value = e.class;
  periodSel.value = e.period;
  subjectSel.value = e.subject;
  topic.value = e.topic;
  remarks.value = e.remarks || '';
  $('#strength').value = e.strength;
  $('#present').value = e.present;
  $('#absent').value = e.absent;
  $('#late').value = e.late;
  $('#sick').value = e.sick;
  $('#od').value = e.od;
  $('#nr').value = e.nr;
  $('#other').value = e.other;
  calcPresent();
}

function saveEntry(){
  const u = getSession(); if(!u) return;
  const e = entryFromForm();
  if(!e.subject || !e.topic){ saveMsg.textContent = 'Add subject and topic.'; return; }
  const list = getEntries(u);
  const key = (v) => `${v.date}|${v.class}|${v.period}`;
  const idx = list.findIndex(x => key(x) === key(e));
  if(idx >= 0) list[idx] = e; else list.unshift(e);
  setEntries(u, list);
  saveMsg.textContent = 'Saved ✓';
  renderLog();
}

function newEntry(){
  autoSetDate();
  classSel.selectedIndex = 0;
  periodSel.selectedIndex = 0;
  const prof = getProfile(getSession());
  subjectSel.value = (prof && prof.subject) ? prof.subject : '';
  topic.value = '';
  remarks.value = '';
  ['strength','present','absent','late','sick','od','nr','other'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=0; });
  attnMsg.textContent = '';
  saveMsg.textContent = '';
}

$('#btnSave').addEventListener('click', saveEntry);
$('#btnNew').addEventListener('click', newEntry);

// Clear all (with improved button)
$('#btnClearAll').addEventListener('click', ()=> {
  if(!confirm('This will permanently delete all your saved entries. Are you sure?')) return;
  const u = getSession(); if(!u) return;
  localStorage.removeItem(LS_ENTRIES(u));
  renderLog();
  saveMsg.textContent = 'All entries cleared.';
});

// Render Log & search
const logTableBody = document.querySelector('#logTable tbody');
const entryCount = $('#entryCount');
const searchInput = document.createElement('input');
searchInput.placeholder = 'Search subject/topic/class...';
searchInput.className = 'search';
searchInput.addEventListener('input', renderLog);

logHeader.appendChild(container);
}

function renderLog(){
  const u = getSession(); if(!u) return;
  const list = getEntries(u);
  const q = searchInput.value.trim().toLowerCase();
  const filtered = list.filter(e => {
    if(!q) return true;
    return (e.subject||'').toLowerCase().includes(q) || (e.topic||'').toLowerCase().includes(q) || (e.class||'').toLowerCase().includes(q);
  });
  entryCount.textContent = `${filtered.length} entries`;
  logTableBody.innerHTML = '';
  filtered.forEach(e => {
    const tr = document.createElement('tr');
    const cells = [e.date, e.class, e.period, e.subject, e.topic, e.present, e.absent, e.strength, e.remarks||''];
    cells.forEach(v => { const td=document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    tr.style.cursor = 'pointer';
    tr.title = 'Click to load this entry in the form';
    tr.addEventListener('click', () => formFromEntry(e));
    logTableBody.appendChild(tr);
  });
}

// Admin panel
const userTableBody = $('#userTable tbody');
const adminMsg = $('#adminMsg');

function renderAdminPanel(){
  userTableBody.innerHTML = '';
  const currentUser = getSession();
  for (const username in USERS) {
    const user = USERS[username];
    const tr = document.createElement('tr');
    const userTd = document.createElement('td'); userTd.textContent = username; tr.appendChild(userTd);
    const statusTd = document.createElement('td'); const statusSpan = document.createElement('span'); statusSpan.textContent = user.is_active ? 'Enabled' : 'Disabled'; statusSpan.className = user.is_active ? 'success' : 'danger'; statusTd.appendChild(statusSpan); tr.appendChild(statusTd);
    const actionTd = document.createElement('td');
    const actionBtn = document.createElement('button');
    actionBtn.textContent = user.is_active ? 'Disable' : 'Enable';
    actionBtn.className = 'btn';
    actionBtn.style.width = 'auto';
    actionBtn.addEventListener('click', () => {
      if (username === currentUser) { adminMsg.textContent = "You cannot change your own account status."; adminMsg.className = 'muted warning'; return; }
      user.is_active = !user.is_active;
      localStorage.setItem(LS_USERS, JSON.stringify(USERS));
      renderAdminPanel();
      adminMsg.textContent = `User '${username}' has been ${user.is_active ? 'enabled' : 'disabled'}.`; adminMsg.className = 'muted success';
    });
    actionTd.appendChild(actionBtn); tr.appendChild(actionTd);
    userTableBody.appendChild(tr);
  }
}

// Init after login
function initAfterLogin(){
  seedClassAndPeriod();
  autoSetDate();
  const u = getSession();
  const hasProfile = !!getProfile(u);
  const isAdmin = USERS[u] && USERS[u].isAdmin;
  btnLogout.classList.remove('hidden');
  if (isAdmin) {
    show(adminCard);
    renderAdminPanel();
  } else {
    show(hasProfile ? diaryCard : profileCard);
    loadProfileIntoForm();
    if(hasProfile){
      const prof = getProfile(u);
      subjectSel.value = prof && prof.subject ? prof.subject : '';
    }
  }
  renderLog();
  // ensure event handlers for save/new are attached
}

if(getSession()) initAfterLogin();


// --- Google Drive Backup (client-side) ---
// NOTE: To use Drive backup you must create a Google OAuth client ID (Web) and set the CLIENT_ID below.
// Follow instructions in README.md. This code uses OAuth2 popup and uploads a single JSON file to the user's Drive.
// It will NOT silently upload to accessiblew@gmail.com without that user authorizing the Drive destination.
const DRIVE_CLIENT_ID = ''; // <-- Put your OAuth 2.0 Client ID here (or set in README and on deployed site)
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata';
async function openOAuthPopup(url, name='oauth', width=600, height=600){
  return new Promise((resolve, reject) => {
    const left = (screen.width/2)-(width/2);
    const top = (screen.height/2)-(height/2);
    const w = window.open(url, name, `width=${width},height=${height},top=${top},left=${left}`);
    if(!w) return reject(new Error('Popup blocked'));
    const timer = setInterval(() => {
      try {
        if(w.closed){ clearInterval(timer); resolve(null); }
      } catch(e){}
    },500);
    window.addEventListener('message', function onmsg(e){
      if(e.origin !== location.origin) return;
      if(e.data && e.data.type === 'oauth_callback') {
        window.removeEventListener('message', onmsg);
        clearInterval(timer);
        resolve(e.data.payload);
      }
    });
  });
}

async function driveBackup(){
  const u = getSession(); if(!u){ alert('Please log in first.'); return; }
  const entries = getEntries(u);
  if(!entries || entries.length===0){ alert('No entries to backup.'); return; }
  // Prepare file
  const blob = new Blob([JSON.stringify({user:u, entries, at: new Date().toISOString()}, null, 2)], {type:'application/json'});
  // OAuth flow: open Google's OAuth URL in a popup that will redirect back to the same origin with token in hash.
  if(!DRIVE_CLIENT_ID){ alert('Drive client ID not configured. See README to configure OAuth client ID.'); return; }
  const redirectUri = location.origin + '/';
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
    '?response_type=token' +
    '&client_id=' + encodeURIComponent(DRIVE_CLIENT_ID) +
    '&scope=' + encodeURIComponent(DRIVE_SCOPE) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&prompt=consent' +
    '&include_granted_scopes=true';
  // open popup and wait for token via message from child (we expect redirect to same origin so child can postMessage)
  const win = window.open(authUrl, 'drive_oauth', 'width=600,height=700');
  if(!win){ alert('Popup blocked. Allow popups and try again.'); return; }
  // Poll the popup for URL access token (simple approach)
  const token = await (new Promise((resolve) => {
    const t = setInterval(() => {
      try {
        if(!win || win.closed){ clearInterval(t); resolve(null); }
        const href = win.location && win.location.href;
        if(!href) return;
        if(href.indexOf('#')>0){
          const hash = href.split('#')[1];
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          if(access_token){ clearInterval(t); win.close(); resolve(access_token); }
        }
      } catch(e){}
    }, 500);
  }));
  if(!token){ alert('Google sign-in failed or cancelled.'); return; }
  try {
    // Upload file via Drive API (multipart)
    const metadata = { name: `${u}_backup_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`, mimeType: 'application/json' };
    const form = new FormData();
    const metaBlob = new Blob([JSON.stringify(metadata)], {type:'application/json'});
    form.append('metadata', metaBlob);
    form.append('file', blob);
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: form
    });
    if(!res.ok) throw new Error('Upload failed: ' + res.statusText);
    const data = await res.json();
    alert('Backup uploaded to your Google Drive (file id: ' + data.id + ').');
  } catch(err){
    alert('Drive backup failed: ' + err.message);
  }
}

// Attach to button
const btnDrive = document.getElementById('btnDriveBackup'); if(btnDrive) btnDrive.setAttribute('aria-label','Backup entries to Google Drive');
if(btnDrive) btnDrive.addEventListener('click', driveBackup);

// --- Print range function ---
const fromDate = document.getElementById('fromDate');
const toDate = document.getElementById('toDate');
const btnPrintRange = document.getElementById('btnPrintRange'); if(btnPrintRange) btnPrintRange.setAttribute('aria-label','Print entries for selected date range');

function entriesInRange(list, from, to){
  if(!from && !to) return list;
  const f = from ? new Date(from) : new Date('1970-01-01');
  const t = to ? new Date(to) : new Date('2100-01-01');
  return list.filter(e => {
    const d = new Date(e.date);
    return d >= f && d <= t;
  });
}

btnPrintRange && btnPrintRange.addEventListener('click', () => {
  const u = getSession(); if(!u){ alert('Login to print.'); return; }
  const all = getEntries(u);
  const subset = entriesInRange(all, fromDate.value, toDate.value);
  if(!subset.length){ alert('No entries in selected range.'); return; }
  // Build printable HTML
  let html = '<!doctype html><html><head><meta charset=\"utf-8\"><title>Print Entries</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ccc;text-align:left}</style></head><body>';
  html += '<h2>Diary entries for: ' + (fromDate.value||'...') + ' to ' + (toDate.value||'...') + '</h2>';
  html += '<table><thead><tr><th>Date</th><th>Class</th><th>Period</th><th>Subject</th><th>Topic</th><th>Present</th><th>Absent</th></tr></thead><tbody>';
  subset.forEach(e => {
    html += `<tr><td>${e.date}</td><td>${e.class}</td><td>${e.period}</td><td>${e.subject}</td><td>${(e.topic||'')}</td><td>${e.present}</td><td>${e.absent}</td></tr>`;
  });
  html += '</tbody></table></body></html>';
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
});

// --- Admin superpowers ---
function renderAdminPanel(){
  userTableBody.innerHTML = '';
  const currentUser = getSession();
  for (const username in USERS) {
    const user = USERS[username];
    const tr = document.createElement('tr');
    const userTd = document.createElement('td'); userTd.textContent = username; tr.appendChild(userTd);
    const statusTd = document.createElement('td'); const statusSpan = document.createElement('span'); statusSpan.textContent = user.is_active ? 'Enabled' : 'Disabled'; statusSpan.className = user.is_active ? 'success' : 'danger'; statusTd.appendChild(statusSpan); tr.appendChild(statusTd);
    const actionTd = document.createElement('td');
    // enable/disable
    const actionBtn = document.createElement('button');
    actionBtn.textContent = user.is_active ? 'Disable' : 'Enable';
    actionBtn.className = 'btn';
    actionBtn.style.width = 'auto';
    actionBtn.addEventListener('click', () => {
      if (username === currentUser) { adminMsg.textContent = "You cannot change your own account status."; adminMsg.className = 'muted warning'; return; }
      user.is_active = !user.is_active;
      localStorage.setItem(LS_USERS, JSON.stringify(USERS));
      renderAdminPanel();
      adminMsg.textContent = `User '${username}' has been ${user.is_active ? 'enabled' : 'disabled'}.`; adminMsg.className = 'muted success';
    });
    actionTd.appendChild(actionBtn);
    // reset password
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Pass';
    resetBtn.className = 'btn';
    resetBtn.style.marginLeft = '6px';
    resetBtn.addEventListener('click', () => {
      if(!confirm('Reset password for ' + username + ' to default (user123)?')) return;
      USERS[username].pass = 'user123';
      localStorage.setItem(LS_USERS, JSON.stringify(USERS));
      adminMsg.textContent = `Password for '${username}' reset to 'user123'.`; adminMsg.className = 'muted success';
    });
    actionTd.appendChild(resetBtn);
    // delete user
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'btn btn-danger';
    delBtn.style.marginLeft = '6px';
    delBtn.addEventListener('click', () => {
      if(!confirm('Permanently delete user ' + username + ' and their entries?')) return;
      delete USERS[username];
      localStorage.setItem(LS_USERS, JSON.stringify(USERS));
      localStorage.removeItem(LS_ENTRIES(username));
      renderAdminPanel();
      adminMsg.textContent = `User '${username}' deleted.`; adminMsg.className = 'muted success';
    });
    actionTd.appendChild(delBtn);
    // download user's entries (admin power)
    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Download Entries';
    dlBtn.className = 'btn btn-export';
    dlBtn.style.marginLeft = '6px';
    dlBtn.addEventListener('click', () => {
      const arr = getEntries(username) || [];
      const blob = new Blob([JSON.stringify(arr, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${username}_entries.json`; a.click();
      URL.revokeObjectURL(url);
    });
    actionTd.appendChild(dlBtn);

    tr.appendChild(actionTd);
    userTableBody.appendChild(tr);
  }
  // super admin export: download all users data
  const footer = document.createElement('div');
  footer.style.marginTop = '12px';
  const exportAll = document.createElement('button');
  exportAll.className = 'btn btn-export';
  exportAll.textContent = 'Export All Users (ZIP)';
  exportAll.addEventListener('click', () => {
    // collect into a single object and offer as download
    const all = {};
    for(const uname in USERS){
      all[uname] = {profile: getProfile(uname), entries: getEntries(uname)};
    }
    const dataStr = JSON.stringify(all, null, 2);
    const blob = new Blob([dataStr], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `all_users_backup_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  });
  adminCard.appendChild(footer);
  footer.appendChild(exportAll);
}


// --- Sync with server (offline-first) ---
const API_BASE = ''; // If same origin + server is proxied, leave blank; otherwise set to server URL e.g. 'https://<your-render-url>'

function serverFetch(path, opts){
  const url = (API_BASE || '') + path;
  return fetch(url, opts).then(async res => {
    if(!res.ok) {
      const txt = await res.text().catch(()=>null);
      throw new Error(txt || res.statusText);
    }
    return res.json();
  });
}

// Authentication: store token in localStorage under 'td_token'
function setToken(t){ if(t) localStorage.setItem('td_token', t); else localStorage.removeItem('td_token'); }
function getToken(){ return localStorage.getItem('td_token'); }

// Override login/register to use server when API_BASE configured
async function serverLogin(username, password){
  if(!username || !password) throw new Error('missing');
  try {
    const data = await serverFetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({username, password})
    });
    setToken(data.token);
    localStorage.setItem('td_user', data.username);
    return data;
  } catch(e){ throw e; }
}
async function serverRegister({username,password,email}){
  const data = await serverFetch('/api/register', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password,email})
  });
  setToken(data.token);
  localStorage.setItem('td_user', data.username);
  return data;
}

// Sync local entries to server
async function syncLocalToServer(){
  const token = getToken();
  if(!token) return;
  const user = localStorage.getItem('td_user');
  if(!user) return;
  const localKey = LS_ENTRIES(user);
  const arr = JSON.parse(localStorage.getItem(localKey) || '[]');
  if(!arr.length) return;
  for(const e of arr){
    try {
      await serverFetch('/api/entry', {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          date: e.date,
          class: e.class,
          class_section: e.class,
          period: e.period,
          subject: e.subject,
          topic: e.topic,
          remarks: e.remarks,
          strength: e.strength,
          present: e.present,
          absent: e.absent,
          late: e.late,
          sick: e.sick,
          od: e.od,
          nr: e.nr,
          other: e.other,
          ts: e.ts || Date.now()
        })
      });
      // mark as synced: we will not remove local copy but we set a flag
      e._synced = true;
    } catch(err){
      console.warn('Sync failed for entry', e, err.message);
    }
  }
  // write back local entries with _synced flags
  localStorage.setItem(localKey, JSON.stringify(arr, null, 2));
  console.log('Sync attempt finished.');
}

// Pull entries from server to local (replace local for now)
async function pullFromServer(){
  const token = getToken();
  if(!token) return;
  try {
    const rows = await serverFetch('/api/entries', { headers: { 'Authorization': 'Bearer ' + token } });
    const user = localStorage.getItem('td_user');
    if(!user) return;
    // map server rows to local format
    const mapped = rows.map(r => ({
      date: r.date,
      class: r.class_section,
      period: r.period,
      subject: r.subject,
      topic: r.topic,
      remarks: r.remarks,
      strength: r.strength,
      present: r.present,
      absent: r.absent,
      late: r.late,
      sick: r.sick,
      od: r.od,
      nr: r.nr,
      other: r.other,
      ts: r.ts || (r.id ? r.id : Date.now()),
      _synced: true
    }));
    localStorage.setItem(LS_ENTRIES(user), JSON.stringify(mapped, null, 2));
    renderLog();
  } catch(err){
    console.warn('Pull failed', err);
  }
}

// Hook online/offline events
window.addEventListener('online', () => {
  console.log('Went online — attempting sync...');
  syncLocalToServer().then(() => pullFromServer());
});
window.addEventListener('offline', () => {
  console.log('Offline — using localStorage');
}

// Modify existing login/register button handlers to try server then fallback
const oldBtnLogin = document.getElementById('btnLogin');
if(oldBtnLogin){
  oldBtnLogin.addEventListener('click', async (ev) => {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    // try server login if API_BASE set
    if(API_BASE){
      try {
        const data = await serverLogin(u,p);
        // on success
        localStorage.setItem('td_user', u);
        // proceed with existing init
        setSession(u);
        initAfterLogin();
        return;
      } catch(err){
        console.warn('Server login failed, falling back to local:', err.message);
      }
    }
    // fallback to existing local login
    const user = USERS[u];
    if(!user){ authMsg.textContent = 'Invalid credentials.'; return; }
    if(user.pass !== p){ authMsg.textContent = 'Invalid credentials.'; return; }
    if(user.is_active === false){ authMsg.textContent = 'Account disabled. Contact your administrator.'; return; }
    setSession(u);
    authMsg.textContent = '';
    initAfterLogin();
  });
}

// Also override register to attempt server registration if API_BASE set
const oldBtnRegister = document.getElementById('btnRegister');
if(oldBtnRegister){
  oldBtnRegister.addEventListener('click', async () => {
    const name = document.getElementById('regName').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const u = document.getElementById('regUser').value.trim();
    const p = document.getElementById('regPass').value;
    const registerMsg = document.getElementById('registerMsg');
    if(API_BASE){
      try {
        const data = await serverRegister({username: u, password: p, email});
        setSession(u);
        initAfterLogin();
        registerMsg.textContent = 'Registered on server and logged in.';
        return;
      } catch(err){
        registerMsg.textContent = 'Server registration failed: ' + err.message;
      }
    }
    // fallback to local register (existing behavior preserved by original handler)
  });
}
