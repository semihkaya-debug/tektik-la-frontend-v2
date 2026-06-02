// ============================================
// tektik.la - Routing Middleware
// ============================================
// Bu dosya HER request'i yakalar ve karar verir:
// - Bilinen path mı? → normal serve et
// - Slug mı? → profile.html serve et

const RESERVED = new Set([
  'admin', 'api', 'app', 'auth', 'base64', 'blog', 'cekilis', 'cv', 'dashboard', 'foto',
  'functions', 'gerisayim', 'gorsel', 'gradient',
  'hashtag', 'hesap', 'home', 'iletisim', 'index',
  'json', 'kelime', 'kosullar', 'login', 'logout', 'lorem', 'markdown',
  'metin', 'password', 'pomodoro', 'profile', 'qr', 'r', 'register',
  'regex', 'renk', 'renk-tonu', 'saat', 'settings', 'sifre',
  'signup', 'static', 'tarih', 'turkce', 'www', 'yuzde', 'barkod', 'gizlilik', 'kvkk', 'iade', 'sozlesme',
  'destek', 'yardim', 'hakkimizda', 'about', 'contact', 'help', 'support',
  'terms', 'privacy', 'forgot-password', 'reset-password',
  'svg-converter', 'kdv', 'instagram-font', 'ip', 'qr-menu', 'dk2026'
]);

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const hostname = url.hostname;

  // ============================================
  // t1.ist → Link kısaltma redirect
  // ============================================
  if (hostname === 't1.ist' || hostname === 'www.t1.ist') {
    const segments = path.split('/').filter(s => s.length > 0);

    if (segments.length === 0) {
      return Response.redirect('https://tektik.la', 302);
    }

    const slug = segments[0];

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return Response.redirect('https://tektik.la', 302);
    }

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

  // ============================================
  // tektik.la → Normal routing
  // ============================================

  // Path'in segment'lerini al
  const segments = path.split('/').filter(s => s.length > 0);
  
  // Boş path (ana sayfa) → normal serve
  if (segments.length === 0) {
    return next();
  }
  
  // 2+ segment'li path'ler (örn: /blog/yazi, /profile/ahmet) → normal serve
  if (segments.length > 1) {
    return next();
  }
  
  const slug = segments[0].toLowerCase();
  
  // Uzantılı dosyalar (favicon.svg, sitemap.xml, vs.) → normal serve
  if (slug.includes('.')) {
    return next();
  }
  
  // Rezerve isim → normal serve
  if (RESERVED.has(slug)) {
    return next();
  }
  
  // Slug formatı geçerli değil → normal serve (404'e gider)
  if (!/^[a-z0-9-]+$/i.test(segments[0])) {
    return next();
  }
  
  // BU NOKTAYA KADAR GELDİYSEK: bu bir kullanıcı slug'ı
  // profile.html dosyasını serve et (URL değişmesin)
  try {
    const profileUrl = new URL('/profile.html', request.url);
    const response = await env.ASSETS.fetch(profileUrl);
    
    // Response'u clone'la ki status 200 dönsün (404 değil)
    return new Response(response.body, {
      status: 200,
      headers: response.headers
    });
  } catch (e) {
    return next();
  }
}
