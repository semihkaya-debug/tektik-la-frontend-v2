// ============================================
// tektik.la - IP Bilgisi API
// Cloudflare Pages Function
// /functions/api/ip.js
// ============================================

export async function onRequest(context) {
  const { request } = context;
  const headers = request.headers;

  const ip = headers.get('CF-Connecting-IP') || headers.get('X-Forwarded-For') || 'Bilinmiyor';
  const country = headers.get('CF-IPCountry') || '';
  const city = headers.get('CF-IPCity') || '';
  const region = headers.get('CF-IPRegion') || '';
  const timezone = headers.get('CF-Timezone') || '';
  const isp = headers.get('CF-ISP') || '';

  const countryNames = {
    TR: 'Türkiye', US: 'Amerika Birleşik Devletleri', DE: 'Almanya',
    GB: 'Birleşik Krallık', FR: 'Fransa', NL: 'Hollanda',
    RU: 'Rusya', UA: 'Ukrayna', PL: 'Polonya', IT: 'İtalya',
    ES: 'İspanya', SE: 'İsveç', NO: 'Norveç', FI: 'Finlandiya',
    CH: 'İsviçre', AT: 'Avusturya', BE: 'Belçika', PT: 'Portekiz',
    JP: 'Japonya', CN: 'Çin', KR: 'Güney Kore', AU: 'Avustralya',
    CA: 'Kanada', BR: 'Brezilya', IN: 'Hindistan', MX: 'Meksika',
    SA: 'Suudi Arabistan', AE: 'Birleşik Arap Emirlikleri', EG: 'Mısır',
    AZ: 'Azerbaycan', GE: 'Gürcistan', SY: 'Suriye', IQ: 'Irak',
  };

  const countryFlags = {
    TR: '🇹🇷', US: '🇺🇸', DE: '🇩🇪', GB: '🇬🇧', FR: '🇫🇷',
    NL: '🇳🇱', RU: '🇷🇺', UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹',
    ES: '🇪🇸', SE: '🇸🇪', NO: '🇳🇴', FI: '🇫🇮', CH: '🇨🇭',
    AT: '🇦🇹', BE: '🇧🇪', PT: '🇵🇹', JP: '🇯🇵', CN: '🇨🇳',
    KR: '🇰🇷', AU: '🇦🇺', CA: '🇨🇦', BR: '🇧🇷', IN: '🇮🇳',
    MX: '🇲🇽', SA: '🇸🇦', AE: '🇦🇪', EG: '🇪🇬', AZ: '🇦🇿',
    GE: '🇬🇪', SY: '🇸🇾', IQ: '🇮🇶',
  };

  const data = {
    ip,
    country_code: country,
    country_name: countryNames[country] || country,
    country_flag: countryFlags[country] || '🌍',
    city: city || null,
    region: region || null,
    timezone: timezone || null,
    isp: isp || null,
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
