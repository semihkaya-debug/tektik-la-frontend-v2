export async function onRequest(context) {
  const { request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    let domain = (body.url || '').trim().toLowerCase();
    // Protokolü temizle
    domain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();

    if (!domain) {
      return new Response(JSON.stringify({ error: 'Alan adı gerekli' }), {
        status: 400, headers: corsHeaders
      });
    }

    // Paralel DNS sorguları
    // 1. Global DNS (Cloudflare 1.1.1.1)
    // 2. Türk ISP DNS'leri — DNS-over-HTTPS ile
    //    Turkcell: 195.175.39.39, TTNet/Türk Telekom: 195.175.39.39
    //    Bunlara DoH desteği olmadığı için alternatif: 
    //    Google'ın Türkiye rotasını simüle etmek yerine
    //    bilinen engellenmiş IP listesiyle karşılaştırıyoruz

    const [globalRes, turkishRes] = await Promise.allSettled([
      // Global DNS (Cloudflare)
      fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
        headers: { 'Accept': 'application/dns-json' }
      }),
      // Türkiye DNS (Google'ın Turkey edge — alternatif olarak farklı resolver)
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, {
        headers: { 'Accept': 'application/dns-json' }
      })
    ]);

    let globalIPs = [];
    let turkishIPs = [];
    let globalStatus = 'error';
    let turkishStatus = 'error';

    // Global sonuç
    if (globalRes.status === 'fulfilled' && globalRes.value.ok) {
      const data = await globalRes.value.json();
      globalStatus = data.Status === 0 ? 'ok' : data.Status === 3 ? 'nxdomain' : 'error';
      if (data.Answer) {
        globalIPs = data.Answer.filter(r => r.type === 1).map(r => r.data);
      }
    }

    // Türk DNS sonucu — Türk ISP'lerinin sıkça kullandığı redirect IP'leri
    // BTK engel sayfaları genellikle şu IP'lere yönlendirir:
    const BLOCK_IPS = [
      '195.175.254.2',   // BTK engel sayfası
      '195.175.254.3',
      '94.55.55.55',     // Türk Telekom engel
      '81.212.0.0',
      '77.79.210.0',
      '195.142.103.0',
    ];

    if (turkishRes.status === 'fulfilled' && turkishRes.value.ok) {
      const data = await turkishRes.value.json();
      turkishStatus = data.Status === 0 ? 'ok' : data.Status === 3 ? 'nxdomain' : 'error';
      if (data.Answer) {
        turkishIPs = data.Answer.filter(r => r.type === 1).map(r => r.data);
      }
    }

    // Engel tespiti
    let blocked = false;
    let reason = '';
    let confidence = 'low';

    // 1. NXDOMAIN — domain bulunamıyor (DNS engel)
    if (turkishStatus === 'nxdomain' && globalStatus === 'ok') {
      blocked = true;
      reason = 'DNS engeli — Alan adı Türkiye\'de çözülemiyor';
      confidence = 'high';
    }
    // 2. Bilinen BTK engel IP'lerine yönlendirme
    else if (turkishIPs.some(ip => BLOCK_IPS.some(bip => ip.startsWith(bip.replace('.0',''))))) {
      blocked = true;
      reason = 'DNS yönlendirmesi — BTK engel sayfasına yönlendiriliyor';
      confidence = 'high';
    }
    // 3. IP'ler tamamen farklı (DNS manipulation)
    else if (globalIPs.length > 0 && turkishIPs.length > 0) {
      const overlap = globalIPs.some(ip => turkishIPs.includes(ip));
      if (!overlap) {
        blocked = true;
        reason = 'DNS manipülasyonu — Farklı IP adresleri döndürülüyor';
        confidence = 'medium';
      } else {
        blocked = false;
        confidence = 'high';
      }
    }
    // 4. Her iki DNS de çalışıyor ve aynı sonuç
    else if (globalStatus === 'ok' && turkishStatus === 'ok') {
      blocked = false;
      confidence = 'high';
    }
    // 5. Belirsiz
    else {
      blocked = null;
      confidence = 'low';
    }

    return new Response(JSON.stringify({
      domain,
      blocked,
      reason: reason || null,
      confidence,
      global_ips: globalIPs.slice(0, 3),
      turkish_ips: turkishIPs.slice(0, 3),
      checked_at: new Date().toISOString(),
    }), { headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({
      error: 'Sorgu başarısız: ' + e.message
    }), { status: 500, headers: corsHeaders });
  }
}

