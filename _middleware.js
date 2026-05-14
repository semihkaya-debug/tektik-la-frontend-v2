// ============================================
// tektik.la - Routing Middleware
// ============================================
// Bu dosya HER request'i yakalar ve karar verir:
// - Bilinen path mı? → normal serve et
// - Slug mı? → profile.html serve et

const RESERVED = new Set([
  'admin', 'api', 'app', 'auth', 'base64', 'blog', 'cekilis', 'cv', 'dashboard', 'fatura', 'foto',
  'functions', 'gerisayim', 'gorsel', 'gradient',
  'hashtag', 'hesap', 'home', 'iletisim', 'index',
  'json', 'kelime', 'kosullar', 'login', 'logout', 'lorem', 'markdown',
  'metin', 'password', 'pomodoro', 'profile', 'qr', 'r', 'register',
  'regex', 'renk', 'renk-tonu', 'saat', 'settings', 'sifre',
  'signup', 'static', 'tarih', 'turkce', 'www', 'yuzde', 'barkod', 'gizlilik', 'kvkk', 'iade', 'sozlesme',
  'destek', 'yardim', 'hakkimizda', 'about', 'contact', 'help', 'support',
  'terms', 'privacy', 'forgot-password', 'reset-password',
  'svg-converter', 'kdv'
]);

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
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
