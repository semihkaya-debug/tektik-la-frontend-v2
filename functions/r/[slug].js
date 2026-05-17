export async function onRequest(context) {
  const { params, env } = context;
  const slug = params.slug;

  const SUPABASE_URL = env.SUPABASE_URL || 'https://yxeuthrfqdquqgzwuxvm.supabase.co';
  const SUPABASE_KEY = env.SUPABASE_KEY;

  if (!SUPABASE_KEY) {
    return Response.redirect('https://tektik.la/?error=config', 302);
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&select=original_url,expires_at,click_count`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const data = await res.json();

    if (!data || data.length === 0) {
      return Response.redirect('https://tektik.la/?error=notfound', 302);
    }

    const { original_url, expires_at, click_count } = data[0];

    if (expires_at && new Date(expires_at) < new Date()) {
      return Response.redirect('https://tektik.la/?error=expired', 302);
    }

    context.waitUntil(
      fetch(`${SUPABASE_URL}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ click_count: (click_count || 0) + 1 })
      })
    );

    return Response.redirect(original_url, 302);

  } catch (e) {
    return Response.redirect('https://tektik.la/?error=servererror', 302);
  }
}
