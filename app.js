async function getConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Gagal ambil config');
  return res.json();
}

function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  document.getElementById('device').textContent = 'Device: ' + id;
  return id;
}

let supabase;

async function init() {
  const cfg = await getConfig();
  supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  getDeviceId();

  document.getElementById('loginBtn').onclick = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  document.getElementById('logoutBtn').onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  document.getElementById('status').textContent = 'Login: ' + (session.user.email || session.user.id);

  const quotaRes = await fetch('/api/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: session.access_token, deviceId: getDeviceId() })
  });
  const quota = await quotaRes.json();
  document.getElementById('quota').textContent = 'Kuota: ' + (quota.remaining_scans ?? 0);
}

init().catch(err => {
  console.error(err);
  document.getElementById('status').textContent = 'Error: ' + err.message;
});
