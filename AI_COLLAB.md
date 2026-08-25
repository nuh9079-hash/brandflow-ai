# BrandFlow AI — Rocket × ChatGPT Ortak İnceleme Dosyası

Bu branch yalnızca inceleme ve koordinasyon içindir. `main` branch'e doğrudan değişiklik yapmayın.

## Çalışma şekli

1. **Rocket:** Uygulamayı kullanıcı gibi test eder, yeni bulguları aşağıdaki `Rocket Bulguları` bölümüne ekler. Her bulgu için: sorun, kanıt/dosya/rota, önem seviyesi ve öneri yazılır.
2. **ChatGPT:** Bulguları kod ve mevcut sistemle doğrular. Yanlış/stale/env kaynaklı olanları ayırır. Doğrulanan bulguları `ChatGPT Doğrulaması` bölümünde durumlandırır.
3. **ChatGPT:** Onaylanan düzeltmeleri ayrı geliştirme branch'inde uygular ve test eder. `main` doğrudan bozulmaz.
4. **Rocket:** Düzeltme sonrası güncel sürümü tekrar inceler ve `Tekrar Test` bölümüne sonucu yazar.
5. Bir bulgu ancak Rocket tekrar testinden sonra `TAMAMLANDI` sayılır.

## Kurallar

- `.env`, API key, Clerk secret, Supabase service role key, Instagram secret gibi sırlar GitHub'a yazılmaz.
- Rocket `main` branch'e doğrudan push yapmaz.
- Rocket kod değiştirmeden önce bulguyu bu dosyaya yazar.
- ChatGPT her bulguyu doğrulamadan uygulamaz.
- Ortam/preview kaynaklı hatalar gerçek ürün hatası gibi işaretlenmez.

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

### Mevcut rapordan ilk kontrol listesi

- R-001 — Ana sayfa ve `/create` arasında iki içerik üretim akışı olduğu iddiası — `YENI`
- R-002 — `/create` AI caption düzenlenemiyor — `YENI`
- R-003 — İçerik türü seçimine göre form yeterince değişmiyor — `YENI`
- R-004 — Sosyal Hesaplar etiketi/rotası kafa karıştırıyor — `YENI`
- R-005 — Instagram dışındaki otomatik yayın seçenekleri kullanıcıyı yanıltabilir — `YENI`
- R-006 — Mobil takvim kullanım sorunu — `YENI`
- R-007 — AI Asistan gerçek sohbet değil — `YENI`
- R-008 — Publish Center navigasyonda görünmüyor — `YENI`
- R-009 — `.env` yok, uygulama çalışmaz — `ORTAM` (GitHub'a secret dosyası commit edilmemesi normaldir; Rocket ortamında env ayrıca tanımlanmalıdır.)
- R-010 — Clerk publishable key eksik — `ORTAM` (Rocket preview environment değişkeni eksik.)

## ChatGPT Doğrulaması

Buraya ChatGPT doğrulama notları ve düzeltme branch/commit bilgileri eklenecek.

## Tekrar Test

Rocket düzeltme sonrası burada PASS/FAIL sonucu yazsın.
