# AI_COLLAB.md — BrandFlow AI İşbirliği Dosyası

Bu dosya Rocket (kod inceleme + bulgu yazma) ve ChatGPT (doğrulama + düzeltme) arasındaki işbirliği protokolüdür.

---

## Çalışma Protokolü

1. **Rocket** → Kodu inceler, UX/teknik bulguları bu dosyanın "Rocket Bulguları" bölümüne yazar. Ürün koduna dokunmaz.
2. **ChatGPT** → Bulguları doğrular, önceliklendirir ve gerçek kod düzeltmelerini yapar.
3. **Rocket** → Güncel sürümü tekrar test eder, yeni bulguları ekler.

---

## Bulgu Formatı

```
### [BULGU-XXX] Başlık
**Dosya:** `path/to/file.tsx` (satır numarası)
**Öncelik:** KRİTİK | Yüksek | Orta | Düşük
**Tür:** UX | Teknik | Dil/Çeviri | Performans | Güvenlik
**Durum:** Açık | Doğrulandı | Düzeltildi

**Sorun:** Ne yanlış ve neden sorun?
**Kanıt:** Dosyada gördüğüm somut kod/metin
**Önerilen Düzeltme:** Ne yapılmalı?
```

---

## Rocket Bulguları

> Son güncelleme: 2026-08-25 — Rocket tarafından eklendi (ilk tam inceleme)

---

### [BULGU-001] Geçmiş sayfasında İngilizce buton metinleri
**Dosya:** `app/history/HistoryClient.tsx` (satır 86-103)
**Öncelik:** Yüksek
**Tür:** Dil/Çeviri
**Durum:** Açık

**Sorun:** Uygulama tamamen Türkçe olmasına rağmen geçmiş sayfasındaki butonlar ve filtre seçenekleri İngilizce. Kullanıcı deneyimi tutarsız.
**Kanıt:**
```tsx
<option value="all">All</option>
<option value="favorite">Favorites</option>
<Button>Open again</Button>
<Button>Copy</Button>
<Button>{item.is_favorite ? "Unfavorite" : "Favorite"}</Button>
<Button>Delete</Button>
<p className="mt-1 text-sm text-zinc-400">Tone: {item.tone}</p>
```
**Önerilen Düzeltme:** "All" → "Tümü", "Favorites" → "Favoriler", "Open again" → "Tekrar aç", "Copy" → "Kopyala", "Favorite"/"Unfavorite" → "Favoriye ekle"/"Favoriden çıkar", "Delete" → "Sil", "Tone:" → "Ton:"

---

### [BULGU-002] Marketing Advisor kategori etiketleri İngilizce
**Dosya:** `app/marketing-advisor/MarketingAdvisorClient.tsx` (satır 35-49)
**Öncelik:** Orta
**Tür:** Dil/Çeviri
**Durum:** Açık

**Sorun:** `categoryLabels` objesi tüm değerleri İngilizce içeriyor. Türkçe uygulamada analiz sonuçları İngilizce kategori adlarıyla gösteriliyor.
**Kanıt:**
```tsx
const categoryLabels: Record<AdvisorCategory, string> = {
  visualQuality: "Visual Quality",
  brandConsistency: "Brand Consistency",
  audienceMatch: "Audience Match",
  engagementPrediction: "Engagement Prediction",
  ctaStrength: "CTA Strength",
  captionQuality: "Caption Quality",
  hashtagQuality: "Hashtag Quality",
  platformOptimization: "Platform Optimization",
  accessibility: "Accessibility",
  readingDifficulty: "Reading Difficulty",
  colorHarmony: "Color Harmony",
  composition: "Composition",
  textReadability: "Text Readability",
};
```
**Önerilen Düzeltme:** Tüm değerleri Türkçeye çevir: "Görsel Kalite", "Marka Tutarlılığı", "Hedef Kitle Uyumu", "Etkileşim Tahmini", "CTA Gücü", "Caption Kalitesi", "Hashtag Kalitesi", "Platform Optimizasyonu", "Erişilebilirlik", "Okuma Zorluğu", "Renk Uyumu", "Kompozisyon", "Metin Okunabilirliği"

---

### [BULGU-003] Video stili seçenekleri İngilizce
**Dosya:** `app/video-studio/VideoStudioClient.tsx` (satır 9, 47)
**Öncelik:** Orta
**Tür:** Dil/Çeviri
**Durum:** Açık

**Sorun:** `VideoStyle` tipi ve `fallbackStyles` dizisi İngilizce değerler içeriyor. Video üretim formunda stil seçenekleri İngilizce görünüyor.
**Kanıt:**
```tsx
type VideoStyle = "Cinematic" | "Funny" | "Product Promotion" | "Social Media" | "Realistic";
const fallbackStyles: VideoStyle[] = ["Cinematic", "Funny", "Product Promotion", "Social Media", "Realistic"];
```
**Önerilen Düzeltme:** UI'da Türkçe etiket göster: "Sinematik", "Komik", "Ürün Tanıtımı", "Sosyal Medya", "Gerçekçi". Tip değerlerini değiştirmeden sadece görüntüleme etiketlerini çevir.

---

### [BULGU-004] Video durum etiketleri İngilizce
**Dosya:** `app/video-studio/VideoStudioClient.tsx` (satır 53-58)
**Öncelik:** Orta
**Tür:** Dil/Çeviri
**Durum:** Açık

**Sorun:** `statusLabels` objesi İngilizce değerler içeriyor. Video üretimi sırasında kullanıcıya İngilizce durum mesajları gösteriliyor.
**Kanıt:**
```tsx
const statusLabels: Record<VideoStatus, string> = {
  preparing: "preparing",
  submitting: "submitting",
  processing: "processing",
  completed: "completed",
  failed: "failed",
};
```
**Önerilen Düzeltme:** "preparing" → "Hazırlanıyor", "submitting" → "Gönderiliyor", "processing" → "İşleniyor", "completed" → "Tamamlandı", "failed" → "Başarısız"

---

### [BULGU-005] AI Asistanı `notice` state'i her sayfa yüklenişinde açık başlıyor
**Dosya:** `components/assistant/ExecutiveAssistant.tsx` (satır 10)
**Öncelik:** Orta
**Tür:** UX
**Durum:** Açık

**Sorun:** `notice` state'i `true` olarak başlatılıyor. Kullanıcı her sayfa değişikliğinde asistan balonunu kapatmak zorunda kalıyor. `hidden` state'i localStorage'a kaydediliyor ama `notice` state'i kaydedilmiyor.
**Kanıt:**
```tsx
const [notice, setNotice] = useState(true);
// hidden state localStorage'a kaydediliyor:
useEffect(() => {
  const timer = window.setTimeout(() => setHidden(localStorage.getItem(HIDDEN_KEY) === "1"), 0);
  return () => window.clearTimeout(timer);
}, []);
// Ama notice state için benzer bir localStorage kontrolü yok
```
**Önerilen Düzeltme:** `notice` state'ini de localStorage'a kaydet. Kullanıcı bir kez kapattıysa tekrar açılmasın. Örnek: `const NOTICE_KEY = "brandflow-assistant-notice-dismissed"` ile kontrol et.

---

### [BULGU-006] AI Asistanı gerçek sohbet arayüzü sunmuyor — adı yanıltıcı
**Dosya:** `components/assistant/ExecutiveAssistant.tsx` (satır 20-22)
**Öncelik:** Yüksek
**Tür:** UX
**Durum:** Açık

**Sorun:** "AI Asistanı" adıyla sunulan bileşen sadece 3 sabit link gösteriyor. Kullanıcı soru soramıyor, metin giremez, gerçek bir AI konuşması yapamıyor. "AI Asistanı" etiketi kullanıcı beklentisini karşılamıyor.
**Kanıt:**
```tsx
<Link href="/company-doctor">Şirketimi analiz et</Link>
<Link href="/opportunities">Yeni fırsatları göster</Link>
<Link href="/create">Bugün ne paylaşmalıyım?</Link>
// Gerçek chat input yok, mesaj gönderme yok
```
**Önerilen Düzeltme:** Ya gerçek chat arayüzü ekle (Groq API zaten mevcut — `app/api/create-assistant/route.ts`), ya da bileşenin adını "Hızlı Erişim" veya "Kısayollar" olarak değiştir.

---

### [BULGU-007] Plan & Faturalandırma sayfasında tüm yükseltme butonları "Yakında"
**Dosya:** `app/billing/page.tsx` (satır 11)
**Öncelik:** Yüksek
**Tür:** UX
**Durum:** Açık

**Sorun:** Pro ve İşletme planlarının butonları "Yakında" yazıyor. Kullanıcı plan yükseltmek istediğinde yapabileceği hiçbir şey yok. Ödeme entegrasyonu yok, iletişim formu yok, bekleme listesi yok.
**Kanıt:**
```tsx
<Button variant={plan?.name === "Pro" ? "primary" : "secondary"}>
  {plan?.name === "Ücretsiz" ? "Mevcut plan" : "Yakında"}
</Button>
```
**Önerilen Düzeltme:** "Yakında" butonu yerine "Erken erişim için bize ulaş" linki veya mailto bağlantısı ekle. Boş "Yakında" butonu kötü UX.

---

### [BULGU-008] Sidebar'da "Sosyal Hesaplar" etiketi yanlış sayfaya yönlendiriyor
**Dosya:** `components/layout/Sidebar.tsx` (satır 22)
**Öncelik:** KRİTİK
**Tür:** UX
**Durum:** Açık

**Sorun:** Sidebar'da "Sosyal Hesaplar" yazıyor ve `/profiles` sayfasına yönlendiriyor. Ancak `/profiles` sayfası sosyal medya hesap bağlantılarını değil, marka profillerini (işletme adı, ton, hedef kitle) yönetiyor. Kullanıcı Instagram bağlamak için "Sosyal Hesaplar"a tıklıyor ama marka profili formuyla karşılaşıyor.
**Kanıt:**
```tsx
{ href: "/profiles", label: "Sosyal Hesaplar", hint: "Hesap bağlantılarını yönet" }
// /profiles sayfası aslında marka profili yönetiyor, sosyal hesap bağlantısı değil
// Instagram OAuth bağlantısı /calendar sayfasında gömülü
```
**Önerilen Düzeltme:** Sidebar etiketini "Marka Profilleri" olarak değiştir. Hint'i "Marka tonunu ve hedef kitlesini ayarla" yap. Instagram/sosyal bağlantıları için ayrı bir sayfa oluştur veya takvim sayfasındaki bağlantı kartını daha görünür yap.

---

### [BULGU-009] Sidebar'da Publish Center (/publish) sayfası yok
**Dosya:** `components/layout/Sidebar.tsx` (satır 7-34)
**Öncelik:** Yüksek
**Tür:** UX
**Durum:** Açık

**Sorun:** `app/publish/` sayfası ve `app/publish/PublishCenterClient.tsx` mevcut ama sidebar navigasyonunda hiç görünmüyor. Kullanıcı bu sayfaya URL'yi bilmeden ulaşamaz.
**Kanıt:**
```tsx
// Sidebar groups içinde /publish rotası yok:
const groups: NavGroup[] = [
  { title: "Başla", items: [{ href: "/" }, { href: "/create" }] },
  { title: "Üretim", items: [{ href: "/image-studio" }, { href: "/video-studio" }, { href: "/media" }] },
  { title: "Yayınla", items: [{ href: "/calendar" }, { href: "/profiles" }] },
  // /publish burada yok
```
**Önerilen Düzeltme:** "Yayınla" grubuna `{ href: "/publish", label: "Yayın Merkezi", hint: "İçerikleri yayına hazırla" }` ekle.

---

### [BULGU-010] Takvim ay görünümünde 42 günlük grid — mobilde kullanılamaz
**Dosya:** `app/calendar/CalendarClient.tsx` (satır 55)
**Öncelik:** Yüksek
**Tür:** UX / Performans
**Durum:** Açık

**Sorun:** Ay görünümü her zaman 42 hücre (6 hafta) render ediyor. Mobil ekranda her hücre çok küçük, tıklanamaz. Varsayılan görünüm "month" olarak ayarlanmış.
**Kanıt:**
```tsx
function monthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
const [view, setView] = useState<CalendarView>("month"); // Varsayılan ay görünümü
```
**Önerilen Düzeltme:** Mobilde varsayılan görünümü "week" yap. `useEffect` ile ekran genişliğini kontrol et: `if (window.innerWidth < 768) setView("week")`.

---

### [BULGU-011] BrandFlowDashboard.tsx 1249 satır — tek dosyada çok fazla sorumluluk
**Dosya:** `app/BrandFlowDashboard.tsx` (1-1249 satır)
**Öncelik:** Yüksek
**Tür:** Teknik
**Durum:** Açık

**Sorun:** Ana sayfa bileşeni 1249 satır. Profil yönetimi, içerik üretimi, platform seçimi, fotoğraf yükleme, sonuç gösterimi hepsi tek dosyada. Bakımı zor, performansı düşük, test edilemez.
**Kanıt:** Dosya boyutu: 1249 satır. İçerik: profil state yönetimi, form state, API çağrıları, görsel işleme, output render — hepsi tek component.
**Önerilen Düzeltme:** Bileşenlere böl: `ContentGenerationForm`, `OutputSections`, `ProfileManager`, `PhotoUploader`. Dashboard ana sayfayı özet widget'larına dönüştür, üretim akışını `/create` sayfasına taşı.

---

### [BULGU-012] İki paralel içerik üretim akışı — hangisi kullanılmalı belirsiz
**Dosya:** `app/BrandFlowDashboard.tsx` + `app/create/page.tsx` + `app/api/generate/route.ts` + `app/api/create-assistant/route.ts`
**Öncelik:** KRİTİK
**Tür:** UX / Teknik
**Durum:** Açık

**Sorun:** Ana Sayfa (`/`) kendi içinde tam bir içerik üretim formu barındırıyor (`/api/generate` endpoint'i). Sidebar'da ayrıca `/create` rotasına bağlı "İçerik Üret" sayfası var (`/api/create-assistant` endpoint'i). İki farklı UI, iki farklı API, iki farklı çıktı formatı. Kullanıcı hangisini kullanması gerektiğini bilemiyor.
**Kanıt:** `app/api/generate/route.ts` ve `app/api/create-assistant/route.ts` — iki ayrı AI üretim endpoint'i. Her ikisi de Groq kullanıyor ama farklı prompt yapıları var.
**Önerilen Düzeltme:** Ana Sayfayı dashboard'a dönüştür (istatistikler, son içerikler, hızlı eylemler). İçerik üretimi tamamen `/create` sayfasına taşı. İki paralel akışı birleştir.

---

### [BULGU-013] Analizler sayfası gerçek sosyal medya verisi göstermiyor ama bu yeterince vurgulanmıyor
**Dosya:** `app/analytics/AnalyticsClient.tsx` (satır 1-107)
**Öncelik:** Yüksek
**Tür:** UX
**Durum:** Açık

**Sorun:** Analizler sayfası sadece BrandFlow iç kullanım verilerini (kaç medya yüklendi, kaç takvim kaydı var) gösteriyor. Gerçek Instagram/TikTok metrikleri yok. Kullanıcı "Analizler" deyince gerçek platform verilerini bekler. Sayfa altında küçük bir uyarı var ama yeterince belirgin değil.
**Kanıt:** `app/analytics/AnalyticsClient.tsx` — `AnalyticsOverview` tipi sadece BrandFlow iç metriklerini içeriyor. Gerçek sosyal medya API entegrasyonu yok.
**Önerilen Düzeltme:** Sayfanın en üstüne büyük ve net bir bilgilendirme banner'ı ekle: "Bu sayfa BrandFlow kullanım istatistiklerini gösteriyor. Gerçek platform analitiği için sosyal hesabını bağla."

---

### [BULGU-014] Mobil navigasyon `<details>/<summary>` ile yapılmış — erişilebilirlik ve UX sorunu
**Dosya:** `components/layout/Sidebar.tsx` (satır 50)
**Öncelik:** Orta
**Tür:** UX / Erişilebilirlik
**Durum:** Açık

**Sorun:** Mobil menü native HTML `<details>/<summary>` elementi kullanıyor. Animasyon yok, dışarı tıklayınca kapanmıyor, klavye navigasyonu sorunlu, erişilebilirlik eksik.
**Kanıt:**
```tsx
<details className="relative lg:hidden">
  <summary className="cursor-pointer list-none ...">Menü</summary>
  <div className="absolute right-0 z-[70] ...">
    {/* Menü içeriği */}
  </div>
</details>
```
**Önerilen Düzeltme:** State tabanlı dropdown veya drawer menüye geçir. `useState` ile `isOpen` kontrolü, dışarı tıklayınca kapanma için `useEffect` + document click listener, `aria-expanded` attribute ekle.

---

### [BULGU-015] Hesap Akışı silme işlemi onaysız
**Dosya:** `app/cashflow/CashFlowClient.tsx`
**Öncelik:** Düşük
**Tür:** UX
**Durum:** Açık

**Sorun:** Hesap Akışı kayıtlarında silme işlemi onay adımı olmadan direkt gerçekleşiyor. Kullanıcı yanlışlıkla silerse geri alınamaz.
**Kanıt:** Silme işlemi doğrudan API çağrısı yapıyor, `window.confirm` veya Modal kullanmıyor.
**Önerilen Düzeltme:** Mevcut `Modal` bileşenini kullanarak onay adımı ekle.

---

### [BULGU-016] Medya silme işlemi `window.confirm` kullanıyor
**Dosya:** `app/media/MediaCenterClient.tsx`
**Öncelik:** Düşük
**Tür:** UX
**Durum:** Açık

**Sorun:** Medya silme işlemi native browser `confirm()` diyaloğu kullanıyor. Mobilde kötü görünüyor, marka deneyimiyle uyumsuz.
**Kanıt:** `window.confirm("...")` çağrısı mevcut.
**Önerilen Düzeltme:** Mevcut `Modal` bileşenini kullan. Zaten projede var: `components/ui/Modal.tsx`.

---

### [BULGU-017] Video üretimi uzun sürebilir ama kullanıcı yeterince bilgilendirilmiyor
**Dosya:** `app/video-studio/VideoStudioClient.tsx`
**Öncelik:** Yüksek
**Tür:** UX
**Durum:** Açık

**Sorun:** Video üretimi polling mekanizmasıyla çalışıyor ve 6 dakikaya kadar sürebilir. Kullanıcıya sadece "processing" durumu gösteriliyor. Tarayıcı sekmesi kapatılırsa iş kaybolur.
**Kanıt:** `statusDescriptions.processing: "Video sağlayıcısı üretimi sürdürüyor."` — süre tahmini yok. Polling mantığı mevcut ama job ID localStorage'a kaydedilmiyor.
**Önerilen Düzeltme:** Tahmini süre göster ("Video üretimi 2-5 dakika sürebilir"). Job ID'yi localStorage'a kaydet, geri dönünce kontrol et. Sayfa kapatılmak istenirse uyarı ver.

---

### [BULGU-018] `.env` dosyası yok — uygulama büyük ihtimalle çalışmıyor
**Dosya:** `.env.example` (referans)
**Öncelik:** KRİTİK
**Tür:** Teknik / Güvenlik
**Durum:** Açık

**Sorun:** Proje kök dizininde `.env` veya `.env.local` dosyası yok. `GROQ_API_KEY`, Supabase URL/key, Clerk keys, Instagram OAuth credentials tanımlı değil. AI üretimi, veritabanı, auth ve sosyal bağlantı çalışmaz.
**Kanıt:** Sistem ENV değişkenleri boş: `# File not found: /home/ubuntu/app/brandflow_ai/.env`
**Önerilen Düzeltme:** `.env.example` dosyası mevcut — tüm değerleri doldur ve `.env.local` olarak kaydet.

---

### [BULGU-019] Otomatik yayın sadece Instagram için çalışıyor ama diğer platformlarda toggle görünüyor
**Dosya:** `app/calendar/CalendarClient.tsx` + `components/social/InstagramConnectionCard.tsx`
**Öncelik:** KRİTİK
**Tür:** UX
**Durum:** Açık

**Sorun:** Takvimde tüm platformlar için "Otomatik yayın" toggle'ı görünüyor ama sadece Instagram OAuth entegrasyonu mevcut. TikTok, Facebook, LinkedIn, Twitter için bağlantı seçeneği yok. Kullanıcı diğer platformlar için toggle'ı açınca yanıltıcı bir beklenti oluşuyor.
**Kanıt:** `lib/social/providers/` altında tiktok, twitter, facebook, linkedin, youtube provider dosyaları var ama bunlar için OAuth akışı yok. Sadece `InstagramConnectionCard` bileşeni mevcut.
**Önerilen Düzeltme:** Desteklenmeyen platformlarda "Otomatik yayın yakında" etiketi göster. Toggle'ı Instagram dışında disabled yap ve açıklama ekle.

---

### [BULGU-020] Şirket Doktoru ve Fırsatlar sayfaları aynı API'yi çağırıyor — fark belirsiz
**Dosya:** `app/company-doctor/CompanyDoctorClient.tsx` + `app/opportunities/OpportunitiesClient.tsx`
**Öncelik:** Orta
**Tür:** UX
**Durum:** Açık

**Sorun:** Her iki sayfa da `GET /api/marketing-advisor/analyze` endpoint'ini çağırıyor. Şirket Doktoru "riskler ve güçler", Fırsatlar "kampanya/zamanlama önerileri" gösteriyor ama kaynak aynı. Kullanıcı için iki ayrı sayfa gereksiz karmaşıklık yaratıyor.
**Kanıt:** Her iki client dosyası da aynı API endpoint'ini kullanıyor.
**Önerilen Düzeltme:** İkisini tek "Marka Sağlığı" sayfasında tab'larla birleştir veya aralarındaki farkı çok daha net yap (farklı veri, farklı başlık, farklı aksiyon).

---

## ChatGPT Doğrulama Bölümü

> Bu bölüm ChatGPT tarafından doldurulacak.

| Bulgu No | Doğrulandı mı? | Düzeltme Durumu | Notlar |
|----------|---------------|-----------------|--------|
| BULGU-001 | — | — | — |
| BULGU-002 | — | — | — |
| BULGU-003 | — | — | — |
| BULGU-004 | — | — | — |
| BULGU-005 | — | — | — |
| BULGU-006 | — | — | — |
| BULGU-007 | — | — | — |
| BULGU-008 | — | — | — |
| BULGU-009 | — | — | — |
| BULGU-010 | — | — | — |
| BULGU-011 | — | — | — |
| BULGU-012 | — | — | — |
| BULGU-013 | — | — | — |
| BULGU-014 | — | — | — |
| BULGU-015 | — | — | — |
| BULGU-016 | — | — | — |
| BULGU-017 | — | — | — |
| BULGU-018 | — | — | — |
| BULGU-019 | — | — | — |
| BULGU-020 | — | — | — |

---

## Öncelik Özeti

### 🔴 KRİTİK (Yayın bloklayıcı)
- BULGU-018: `.env` dosyası yok
- BULGU-012: İki paralel içerik üretim akışı
- BULGU-008: "Sosyal Hesaplar" sidebar etiketi yanlış sayfaya yönlendiriyor
- BULGU-019: Otomatik yayın sadece Instagram için çalışıyor ama yanıltıcı toggle var

### 🟠 YÜKSEK (İlk haftada yapılmalı)
- BULGU-001: Geçmiş sayfasında İngilizce buton metinleri
- BULGU-006: AI Asistanı gerçek sohbet sunmuyor
- BULGU-007: Faturalandırma sayfasında "Yakında" butonları
- BULGU-009: Publish Center sidebar'da yok
- BULGU-010: Takvim mobil görünümü kullanılamaz
- BULGU-011: BrandFlowDashboard.tsx 1249 satır
- BULGU-013: Analizler sayfası beklenti yönetimi eksik
- BULGU-017: Video üretimi süre uyarısı yok

### 🟡 ORTA (İlk ay içinde)
- BULGU-002: Marketing Advisor kategori etiketleri İngilizce
- BULGU-003: Video stili seçenekleri İngilizce
- BULGU-004: Video durum etiketleri İngilizce
- BULGU-005: AI Asistanı notice state localStorage'a kaydedilmiyor
- BULGU-014: Mobil navigasyon `<details>` ile yapılmış
- BULGU-020: Şirket Doktoru ve Fırsatlar sayfaları farkı belirsiz

### 🟢 DÜŞÜK (Sonraki sürümler)
- BULGU-015: Hesap Akışı silme işlemi onaysız
- BULGU-016: Medya silme `window.confirm` kullanıyor
