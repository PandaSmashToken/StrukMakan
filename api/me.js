import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const { accessToken, deviceId } = req.body || {};
    if (!accessToken) return res.status(400).json({ error: 'accessToken wajib' });

    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
    if (userError || !userData?.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = userData.user;

    const { data: existing } = await admin
      .from('profiles')
      .select('id, remaining_scans')
      .eq('id', user.id)
      .maybeSingle();

    let remaining = existing?.remaining_scans;
    if (remaining == null) {
      const { data: fp } = await admin.from('device_fingerprints').select('device_id').eq('device_id', deviceId).maybeSingle();
      remaining = fp ? 0 : 3;
      await admin.from('profiles').upsert({ id: user.id, email: user.email, remaining_scans: remaining });
      if (!fp && deviceId) await admin.from('device_fingerprints').insert({ device_id: deviceId, first_user_id: user.id });
    }

    res.status(200).json({ user_id: user.id, email: user.email, remaining_scans: remaining ?? 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
