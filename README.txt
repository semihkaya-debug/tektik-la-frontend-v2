TEKTIK.LA - MAIL SİSTEMİ FRONTEND GÜNCELLEMESİ
================================================

Bu zip'i çıkardıktan sonra TÜM dosyaları repo klasörüne kopyala.
Klasör yapısı korunmalı. "Replace All" / "Üzerine yaz" de.

İçerik:
  📄 _redirects                       → repo köküne
  📁 functions/_middleware.js         → repo'daki functions/ klasörüne
  📁 forgot-password/index.html       → repo'daki forgot-password/ klasörüne (üzerine yaz)
  📁 reset-password/index.html        → YENİ klasör, içinde index.html

GitHub Desktop'ta:
  - 4 dosya değişiklik göreceksin
  - Summary: "Mail sistemi: forgot/reset password"
  - Commit to main + Push origin

Cloudflare 1-2 dakika içinde deploy eder.
