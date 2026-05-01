// tektik-btk Worker — DNS sorgusu yaparak Türkiye'de engellenip engellenmediğini kontrol eder
// Cloudflare Workers'a deploy edilecek

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Türk Telekom DNS (TTNet) — engellenmiş siteleri farklı IP'ye yönlendirir veya NXDOMAIN verir
const TTNET_DNS = 'https://dns.google/resolve'; // Google DoH — TTNet sim için kullanacağız
const CLOUDFLARE_DNS = 'https://cloudflare-dns.com/dns-query';

// TTNet engellenmiş site redirect IP'leri (BTK engel sayfaları)
const BTK_BLOCK_IPS = [
  '195.175.254.2',   // TTNet engel sayfası
  '195.175.254.3',   // TTNet engel sayfası
  '77.245.132.50',   // Superonline engel
  '195.142.103.132', // Vodafone engel
  '109.232.252.40',  // Türk Telekom engel
  '85.105.0.74',     // TTNet
  '195.175.39.39',   // TTNet DNS kendisi
];

async function queryDNS(endpoint, domain) {
  const url = `${endpoint}?name=${encodeURIComponent(domain)}&type=A`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/dns-json' }
  });
  return res.json();
}

async function checkDomain(domain) {
  // Domain temizle
  domain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase();

  try {
    // İki farklı DNS'e paralel sorgu
    const [googleResult, cloudflareResult] = await Promise.allSettled([
      queryDNS(GOOGLE_DOH, domain),
      queryDNS(CLOUDFLARE_DNS, domain),
    ]);

    const googleData = googleResult.status === 'fulfilled' ? googleResult.value : null;
    const cfData = cloudflareResult.status === 'fulfilled' ? cloudflareResult.value : null;

    // NXDOMAIN kontrolü (domain yok — ya gerçekten yok ya da TTNet engelliyor)
    const googleStatus = googleData?.Status;
    const cfStatus = cfData?.Status;

    // Google'dan gelen IP'ler
    const googleIPs = (googleData?.Answer || [])
      .filter(r => r.type === 1)
      .map(r => r.data);

    // Cloudflare'den gelen IP'ler  
    const cfIPs = (cfData?.Answer || [])
      .filter(r => r.type === 1)
      .map(r => r.data);

    // BTK engel IP kontrolü
    const blockedByGoogle = googleIPs.some(ip => BTK_BLOCK_IPS.includes(ip));
    const blockedByCF = cfIPs.some(ip => BTK_BLOCK_IPS.includes(ip));

    // NXDOMAIN — domain çözülemiyor
    if (googleStatus === 3 && cfStatus === 3) {
      return {
        domain,
        status: 'blocked',
        reason: 'DNS çözümlemesi başarısız — alan adı engelli veya mevcut değil',
        google_ips: googleIPs,
        cf_ips: cfIPs,
      };
    }

    // BTK engel IP'sine yönlendirilmiş
    if (blockedByGoogle || blockedByCF) {
      return {
        domain,
        status: 'blocked',
        reason: 'BTK engel sayfasına yönlendiriliyor',
        google_ips: googleIPs,
        cf_ips: cfIPs,
      };
    }

    // IP'ler farklı ise şüpheli
    if (googleIPs.length > 0 && cfIPs.length > 0) {
      const overlap = googleIPs.some(ip => cfIPs.includes(ip));
      if (!overlap && googleIPs.length > 0) {
        return {
          domain,
          status: 'suspicious',
          reason: 'DNS yanıtları tutarsız — DNS manipülasyonu olabilir',
          google_ips: googleIPs,
          cf_ips: cfIPs,
        };
      }
    }

    // Temiz
    return {
      domain,
      status: 'open',
      reason: 'Erişim engeli tespit edilmedi',
      google_ips: googleIPs,
      cf_ips: cfIPs,
    };

  } catch (e) {
    return {
      domain,
      status: 'error',
      reason: 'Sorgu sırasında hata oluştu: ' + e.message,
      google_ips: [],
      cf_ips: [],
    };
  }
}

const GOOGLE_DOH = 'https://dns.google/resolve';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');

    if (!domain) {
      return new Response(JSON.stringify({ error: 'domain parametresi gerekli' }), {
        status: 400, headers: CORS
      });
    }

    // Toplu sorgu
    const domains = domain.split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0)
      .slice(0, 20); // max 20

    if (domains.length === 1) {
      const result = await checkDomain(domains[0]);
      return new Response(JSON.stringify(result), { headers: CORS });
    }

    const results = await Promise.all(domains.map(checkDomain));
    return new Response(JSON.stringify({ results }), { headers: CORS });
  }
};
