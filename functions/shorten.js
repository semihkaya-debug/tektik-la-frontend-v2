export async function onRequest(context) {
  const { env, request } = context;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { slug, original_url, expires_at, click_count } = body;

    if (!slug || !original_url) {
      return new Response(JSON.stringify({ error: 'slug ve original_url zorunlu' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(
      `INSERT INTO links (slug, original_url, expires_at, click_count, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(slug, original_url, expires_at || null, click_count || 0).run();

    return new Response(JSON.stringify({ slug, original_url }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    // Slug zaten varsa
    if (e.message && e.message.includes('UNIQUE')) {
      return new Response(JSON.stringify({ error: 'Bu slug zaten kullanımda' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
