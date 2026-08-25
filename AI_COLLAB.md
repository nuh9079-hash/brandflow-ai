# BrandFlow AI — Rocket × ChatGPT Ortak İnceleme Dosyası

Bu dosya Rocket ve ChatGPT arasındaki ortak kontrol defteridir.

## Branch akışı

Rocket GitHub entegrasyonu doğrudan `ai-collab` branch'ine geçemediği için akış şöyle olacak:

1. Rocket projeyi `main` üzerinden okur.
2. Rocket yeni bulguları bu dosyanın `Rocket Bulguları` bölümüne ekler.
3. Rocket yaptığı dosya değişikliğini kendi entegrasyonunun izin verdiği `rocket-update` branch'ine gönderir.
4. ChatGPT `rocket-update` branch'ini okur, bulguları kodla doğrular ve yanlış/ortam kaynaklı olanları ayırır.
5. ChatGPT gerçek düzeltmeleri kendi güvenli geliştirme branch'inde uygular ve test eder.
6. `main` doğrudan Rocket tarafından değiştirilmez.
7. Rocket düzeltme sonrası tekrar test yapar ve sonucu yine `rocket-update` üzerindeki bu dosyaya yazar.

## Kurallar

- `.env`, API key, Clerk secret, Supabase service role key, Instagram secret gibi sırlar GitHub'a yazılmaz.
- Rocket ürün kodunu değiştirmeden önce bulguyu bu dosyaya yazar.
- ChatGPT her bulguyu doğrulamadan uygulamaz.
- Rocket preview/env kaynaklı hatalar gerçek ürün hatası gibi işaretlenmez.
- Bir bulgu tekrar test edilmeden `TAMAMLANDI` sayılmaz.

## Durum etiketleri

- `YENI` — Rocket buldu, henüz doğrulanmadı.
- `DOGRU` — ChatGPT kod/veri üzerinden doğruladı.
- `ORTAM` — Rocket preview/env kaynaklı, gerçek ürün hatası değil.
- `YANLIS/ESKI` — Bulguda yanlışlık var veya kod daha önce değişmiş.
- `DUZELTILIYOR` — Kod düzeltmesi başladı.
- `TEKRAR_TEST` — Rocket yeniden test etmeli.
- `TAMAMLANDI` — Düzeltme tekrar test edildi.

## Rocket Bulguları

Rocket yeni bulguları şu formatta aşağıya eklesin:

### R-XXX — Kısa başlık
- Durum: `YENI`
- Öncelik: Kritik / Yüksek / Orta / Düşük
- Rota/Dosya:
- Sorun:
- Kullanıcı etkisi:
- Kanıt:
- Öneri:

### İlk kontrol listesi

- R-001 — Ana sayfa ve `/create` arasında iki içerik üretim akışı olduğu iddiası — `YENI`
- R-002 — `/create` AI caption düzenlenemiyor — `YENI`
- R-003 — İçerik türü seçimine göre form yeterince değişmiyor — `YENI`
- R-004 — Sosyal Hesaplar etiketi/rotası kafa karıştırıyor — `YENI`
- R-005 — Instagram dışındaki otomatik yayın seçenekleri kullanıcıyı yanıltabilir — `YENI`
- R-006 — Mobil takvim kullanım sorunu — `YENI`
- R-007 — AI Asistan gerçek sohbet değil — `YENI`
- R-008 — Publish Center navigasyonda görünmüyor — `YENI`
- R-009 — `.env` yok, uygulama çalışmaz — `ORTAM`
- R-010 — Clerk publishable key eksik — `ORTAM`

## ChatGPT Doğrulaması

ChatGPT doğrulama notlarını, düzeltme branch/commit bilgisini burada tutar.

## Tekrar Test

Rocket düzeltme sonrası PASS/FAIL sonucunu burada yazar.
