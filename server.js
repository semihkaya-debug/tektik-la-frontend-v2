// ============================================
// TEKTIK.LA BACKEND - Ana Sunucu Dosyası
// ============================================
// Bu dosya tüm API endpoint'lerini içerir.
// Frontend (Cloudflare Pages) buraya istek atar.

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// AYARLAR (Railway'de environment variables'dan gelecek)
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'tektik2024!admin';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Supabase client oluştur
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Resend client (email göndermek için)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Email gönderici bilgileri
const EMAIL_FROM = 'tektik.la <info@tektik.la>';
const SITE_URL = 'https://tektik.la';

// ============================================
// MIDDLEWARE (Her isteğe uygulanır)
// ============================================
app.use(cors()); // Frontend'in backend'e istek atabilmesi için
app.use(express.json()); // JSON istekleri okuyabilmek için

// JWT token kontrol middleware'i
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Geçersiz token' });
    req.user = user;
    next();
  });
}

// ============================================
// EMAIL HELPER FUNCTIONS
// ============================================

// Email gönderme yardımcı fonksiyonu
async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log('⚠️ Resend not configured. Email not sent:', subject, '→', to);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html
    });
    console.log('✅ Email sent:', subject, '→', to, '(', result.data?.id, ')');
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

// Email template'i için ortak HTML wrapper
function emailTemplate({ title, body, ctaText, ctaUrl, footerText }) {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="540" style="max-width:540px;background:#141414;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid #2a2a2a;">
              <div style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#f0f0f0;letter-spacing:-0.5px;">
                tektik<span style="color:#c8f530;">.la</span>
              </div>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-1px;color:#f0f0f0;">
                ${title}
              </h1>
              <div style="font-size:15px;line-height:1.7;color:#cccccc;margin-bottom:28px;">
                ${body}
              </div>
              
              ${ctaText && ctaUrl ? `
              <div style="margin:28px 0;">
                <a href="${ctaUrl}" style="display:inline-block;background:#c8f530;color:#0a0a0a;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.5px;">
                  ${ctaText} →
                </a>
              </div>
              <div style="font-family:'Courier New',monospace;font-size:11px;color:#666;line-height:1.6;margin-top:20px;word-break:break-all;">
                Buton çalışmazsa şu linke tıkla:<br>
                <a href="${ctaUrl}" style="color:#c8f530;text-decoration:underline;">${ctaUrl}</a>
              </div>
              ` : ''}
              
              ${footerText ? `
              <div style="font-family:'Courier New',monospace;font-size:12px;color:#666;line-height:1.6;margin-top:28px;padding-top:20px;border-top:1px solid #2a2a2a;">
                ${footerText}
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#0f0f0f;border-top:1px solid #2a2a2a;text-align:center;">
              <div style="font-family:'Courier New',monospace;font-size:11px;color:#666;line-height:1.6;">
                © 2026 tektik.la · <a href="https://tektik.la" style="color:#c8f530;text-decoration:none;">tektik.la</a><br>
                Bu maili almak istemiyorsan <a href="mailto:info@tektik.la" style="color:#888;text-decoration:underline;">bize bildir</a>.
              </div>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// SAĞLIK KONTROLÜ
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'tektik.la backend çalışıyor!',
    version: '1.0.0'
  });
});

// ============================================
// AUTH ENDPOINTS
// ============================================

// SIGNUP - Yeni kullanıcı kaydı
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, slug } = req.body;

    // Validasyon
    if (!email || !password || !slug) {
      return res.status(400).json({ error: 'Email, şifre ve slug gerekli' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    // Slug formatı kontrolü (sadece harf, rakam, tire)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug sadece küçük harf, rakam ve tire içerebilir' });
    }

    // Rezerve slug'lar (araç ve sistem sayfalarıyla çakışmasın diye)
    const RESERVED_SLUGS = [
      'admin', 'api', 'app', 'auth', 'base64', 'binary', 'blog', 'btk',
      'cekilis', 'config', 'cv', 'dashboard', 'fatura', 'fis', 'foto',
      'functions', 'gerisayim', 'gorsel', 'gorsel-kirp', 'gradient',
      'hashtag', 'hesap', 'home', 'html-encode', 'iletisim', 'index',
      'json', 'kelime', 'kosullar', 'login', 'logout', 'lorem', 'markdown',
      'metin', 'password', 'pomodoro', 'profile', 'qr', 'r', 'register',
      'regex', 'renk', 'renk-tonu', 'robots', 'saat', 'settings', 'sifre',
      'signup', 'sitemap', 'static', 'tarih', 'turkce', 'uuid', 'whitespace',
      'www', 'yuzde', 'barkod', 'gizlilik', 'kvkk', 'iade', 'sozlesme',
      'destek', 'yardim', 'hakkimizda', 'about', 'contact', 'help', 'support',
      'terms', 'privacy'
    ];
    
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
      return res.status(400).json({ error: 'Bu kullanıcı adı sistem tarafından rezerve edilmiş, lütfen başka bir tane seç' });
    }

    if (slug.length < 2) {
      return res.status(400).json({ error: 'Kullanıcı adı en az 2 karakter olmalı' });
    }

    if (slug.length > 30) {
      return res.status(400).json({ error: 'Kullanıcı adı en fazla 30 karakter olmalı' });
    }

    // Slug zaten var mı?
    const { data: existingSlug } = await supabase
      .from('user_profiles')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış' });
    }

    // Email zaten var mı?
    const { data: existingEmail } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(password, 10);

    // 30 günlük trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Kullanıcı oluştur
    const { data: newUser, error } = await supabase
      .from('user_profiles')
      .insert([{
        email,
        slug,
        password_hash: passwordHash,
        trial_ends_at: trialEndsAt.toISOString(),
        is_paid: false,
        bio: '',
        title: slug
      }])
      .select()
      .single();

    if (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ error: 'Kayıt başarısız', details: error.message });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, slug: newUser.slug },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Hoş geldin maili gönder (background, başarısız olursa kayıt etkilenmez)
    sendEmail({
      to: newUser.email,
      subject: 'tektik.la\'ya hoş geldin! 🎉',
      html: emailTemplate({
        title: 'Aramıza hoş geldin!',
        body: `
          <p>Merhaba <strong>${newUser.slug}</strong>,</p>
          <p>tektik.la'ya kaydolduğun için teşekkürler! Profil URL'in artık hazır:</p>
          <div style="background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 18px;margin:16px 0;font-family:'Courier New',monospace;font-size:14px;color:#c8f530;">
            ${SITE_URL}/${newUser.slug}
          </div>
          <p>Şimdi yapabileceklerin:</p>
          <ul style="padding-left:20px;line-height:1.8;">
            <li>📝 Profilini düzenle (bio, avatar)</li>
            <li>🔗 İstediğin kadar link ekle</li>
            <li>📱 Sosyal medya hesaplarını bağla</li>
            <li>🎨 Profilini Instagram, Twitch, YouTube bio'na ekle</li>
          </ul>
        `,
        ctaText: 'Profilimi Düzenle',
        ctaUrl: `${SITE_URL}/dashboard`,
        footerText: `
          🎁 İlk <strong>30 gün ücretsiz</strong>! Sonrasında abonelik için gerekli detaylar gönderilecek.<br>
          📧 Soruların için: <a href="mailto:info@tektik.la" style="color:#c8f530;">info@tektik.la</a>
        `
      })
    }).catch(err => console.error('Welcome email failed:', err));

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        slug: newUser.slug,
        trial_ends_at: newUser.trial_ends_at
      }
    });

  } catch (error) {
    console.error('Signup exception:', error);
    res.status(500).json({ error: 'Sunucu hatası', details: error.message });
  }
});

// LOGIN - Giriş
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }

    // Kullanıcıyı bul
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Email veya şifre yanlış' });
    }

    // Şifre kontrol
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email veya şifre yanlış' });
    }

    // JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, slug: user.slug },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        slug: user.slug,
        bio: user.bio,
        title: user.title,
        avatar_url: user.avatar_url,
        trial_ends_at: user.trial_ends_at,
        is_paid: user.is_paid
      }
    });

  } catch (error) {
    console.error('Login exception:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ============================================
// ŞIFRE SIFIRLAMA ENDPOINTS
// ============================================

// POST /api/auth/forgot-password - Sıfırlama maili gönder
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email gerekli' });
    }

    // Kullanıcıyı bul
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, slug, title, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Güvenlik: Kullanıcı bulunamasa bile aynı mesajı dön
    // (Hangi email'in kayıtlı olduğunu sızdırmamak için)
    if (userError || !user) {
      console.log('Forgot password: user not found for', email);
      return res.json({
        success: true,
        message: 'Eğer bu email kayıtlıysa, sıfırlama linki gönderildi.'
      });
    }

    // Token oluştur (32 byte random hex = 64 karakter)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat geçerli

    // Token'ı veritabanına kaydet
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      console.error('Token insert error:', insertError);
      return res.status(500).json({ error: 'Token oluşturulamadı' });
    }

    // Sıfırlama linki
    const resetUrl = `${SITE_URL}/reset-password?token=${token}`;
    const userName = user.title || user.slug;

    // Email gönder
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'tektik.la şifre sıfırlama',
      html: emailTemplate({
        title: 'Şifreni sıfırla',
        body: `
          <p>Merhaba <strong>${userName}</strong>,</p>
          <p>tektik.la hesabın için şifre sıfırlama talebi aldık. Aşağıdaki butona tıklayarak yeni bir şifre belirleyebilirsin.</p>
        `,
        ctaText: 'Şifremi Sıfırla',
        ctaUrl: resetUrl,
        footerText: `
          ⏱️ Bu link <strong>1 saat</strong> geçerlidir.<br>
          🔒 Bu talebi sen yapmadıysan bu maili görmezden gelebilirsin, hesabın güvende.
        `
      })
    });

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      // Yine de kullanıcıya başarılı gibi dön (security)
    }

    res.json({
      success: true,
      message: 'Eğer bu email kayıtlıysa, sıfırlama linki gönderildi.'
    });

  } catch (error) {
    console.error('Forgot password exception:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/auth/reset-password - Token doğrula + yeni şifre kaydet
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token ve yeni şifre gerekli' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    // Token'ı bul
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ error: 'Geçersiz veya hatalı token' });
    }

    // Kullanılmış mı kontrol et
    if (tokenData.used) {
      return res.status(400).json({ error: 'Bu link daha önce kullanılmış. Yeni bir sıfırlama isteği yap.' });
    }

    // Süresi dolmuş mu kontrol et
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Bu linkin süresi doldu. Yeni bir sıfırlama isteği yap.' });
    }

    // Yeni şifreyi hash'le
    const passwordHash = await bcrypt.hash(password, 10);

    // Kullanıcı şifresini güncelle
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ password_hash: passwordHash })
      .eq('id', tokenData.user_id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'Şifre güncellenemedi' });
    }

    // Token'ı kullanıldı olarak işaretle
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    res.json({
      success: true,
      message: 'Şifren başarıyla güncellendi. Şimdi giriş yapabilirsin.'
    });

  } catch (error) {
    console.error('Reset password exception:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ============================================
// PROFILE ENDPOINTS
// ============================================

// GET /api/profile/:slug - Public profil (giriş gerekmez)
app.get('/api/profile/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Profil bilgileri
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, slug, bio, avatar_url, title')
      .eq('slug', slug)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profil bulunamadı' });
    }

    // Linkler
    const { data: links } = await supabase
      .from('user_links')
      .select('id, title, url, icon, link_order')
      .eq('user_id', profile.id)
      .order('link_order', { ascending: true });

    // Sosyal medya
    const { data: socials } = await supabase
      .from('social_media')
      .select('id, platform, url')
      .eq('user_id', profile.id);

    res.json({
      profile,
      links: links || [],
      socials: socials || []
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PUT /api/profile - Kendi profilini güncelle (giriş gerekli)
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { bio, title, avatar_url } = req.body;
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ bio, title, avatar_url })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Güncelleme başarısız' });
    }

    res.json({ success: true, profile: data });

  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ============================================
// LINKS ENDPOINTS
// ============================================

// POST /api/links - Yeni link ekle
app.post('/api/links', authenticateToken, async (req, res) => {
  try {
    const { title, url, icon } = req.body;
    const userId = req.user.userId;

    if (!title || !url) {
      return res.status(400).json({ error: 'Başlık ve URL gerekli' });
    }

    // Mevcut link sayısını al (sıralama için)
    const { data: existingLinks } = await supabase
      .from('user_links')
      .select('id')
      .eq('user_id', userId);

    const linkOrder = (existingLinks?.length || 0) + 1;

    const { data, error } = await supabase
      .from('user_links')
      .insert([{ user_id: userId, title, url, icon, link_order: linkOrder }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Link eklenemedi' });
    }

    res.json({ success: true, link: data });

  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// DELETE /api/links/:id - Link sil
app.delete('/api/links/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { error } = await supabase
      .from('user_links')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Sadece kendi linkini silebilir

    if (error) {
      return res.status(500).json({ error: 'Silme başarısız' });
    }

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ============================================
// SOCIAL MEDIA ENDPOINTS
// ============================================

// POST /api/social - Sosyal medya ekle
app.post('/api/social', authenticateToken, async (req, res) => {
  try {
    const { platform, url } = req.body;
    const userId = req.user.userId;

    const validPlatforms = ['twitter', 'instagram', 'threads', 'linkedin', 'youtube', 'tiktok', 'twitch', 'kick', 'github'];
    
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Geçersiz platform' });
    }

    const { data, error } = await supabase
      .from('social_media')
      .insert([{ user_id: userId, platform, url }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Eklenemedi' });
    }

    res.json({ success: true, social: data });

  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// DELETE /api/social/:id - Sosyal medya sil
app.delete('/api/social/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { error } = await supabase
      .from('social_media')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Silme başarısız' });
    }

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// POST /api/admin/users - Admin: kullanıcı listesi
app.post('/api/admin/users', async (req, res) => {
  try {
    const { adminPassword } = req.body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Yetkisiz erişim' });
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, slug, trial_ends_at, is_paid, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Kullanıcılar alınamadı' });
    }

    res.json({ success: true, users: data });

  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ============================================
// SUNUCUYU BAŞLAT
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 tektik.la backend ${PORT} portunda çalışıyor`);
});
