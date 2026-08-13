import type { CompanyDoctorBusinessModel, CompanyDoctorCheck } from "./framework";

export type CompanyDoctorSectorId = "dietitian" | "education" | "cafe" | "personal_trainer" | "generic";

export type CompanyDoctorSectorPack = {
  id: CompanyDoctorSectorId;
  label: string;
  businessModel: CompanyDoctorBusinessModel;
  diagnosticQuestions: string[];
  commonExternalProblems: string[];
  commonInternalProblems: string[];
  commonPhilosophicalProblems: string[];
  commonDesires: string[];
  checklist: Array<Omit<CompanyDoctorCheck, "matched">>;
};

export const companyDoctorSectorPacks: Record<CompanyDoctorSectorId, CompanyDoctorSectorPack> = {
  generic: {
    id: "generic",
    label: "Genel İşletme",
    businessModel: "service",
    diagnosticQuestions: [
      "Müşteri akışın düzenli ve öngörülebilir mi?",
      "Gelirin tek bir kanal veya kişiye aşırı bağımlı mı?",
      "Teklifin müşterinin anlayacağı kadar net mi?",
      "Takip ve CRM sürecin sistemli mi?",
      "İçerik ve pazarlama düzenli çalışıyor mu?",
      "İşletme sen olmadan da temel operasyonlarını sürdürebiliyor mu?",
    ],
    commonExternalProblems: ["düzensiz müşteri akışı", "artan edinme maliyeti", "düşük dijital görünürlük"],
    commonInternalProblems: ["odak kaybı", "sistem kurmak yerine günü kurtarma", "karar yorgunluğu"],
    commonPhilosophicalProblems: ["çok çalışıyorum ama büyüme aynı hızda gelmiyor", "özgür olmak için kurduğum iş bana bağımlı"],
    commonDesires: ["öngörülebilir gelir", "düzenli müşteri akışı", "ölçeklenebilir sistem", "operasyonel özgürlük"],
    checklist: [
      { id: "lead-flow", label: "Müşteri akışı düzensiz" },
      { id: "revenue-volatility", label: "Gelir dalgalanması yüksek" },
      { id: "no-crm", label: "CRM/takip sistemi yok" },
      { id: "content-inconsistent", label: "Düzenli içerik üretilemiyor" },
      { id: "low-visibility", label: "Dijital görünürlük yetersiz" },
      { id: "owner-dependent", label: "Operasyon sahibine aşırı bağımlı" },
      { id: "no-automation", label: "Tekrarlayan işler otomasyonsuz" },
      { id: "weak-offer", label: "Teklif/vaat net değil" },
      { id: "weak-proof", label: "Sosyal kanıt ve vaka kullanımı zayıf" },
      { id: "single-channel", label: "Gelir tek kanala aşırı bağımlı" },
    ],
  },
  dietitian: {
    id: "dietitian",
    label: "Diyetisyen",
    businessModel: "knowledge_expertise",
    diagnosticQuestions: [
      "Yeni danışan akışı aylar arasında çok değişiyor mu?",
      "Gelirin büyük kısmı birebir seanslardan mı geliyor?",
      "Danışan takibi WhatsApp/telefon ağırlıklı mı?",
      "Danışan devamlılığı ve program tamamlama oranı ölçülüyor mu?",
      "Web sitesi, randevu sistemi, CRM veya e-posta listesi var mı?",
      "Bilgini düzenli içerik veya dijital ürüne dönüştürebiliyor musun?",
    ],
    commonExternalProblems: ["fiyat baskısı", "düşük dijital görünürlük", "düzensiz danışan akışı", "rakiplerin hızlı sonuç vaadi"],
    commonInternalProblems: ["sürekli motivasyon verme yorgunluğu", "teknoloji çekingenliği", "bilgiyi içeriğe dönüştürememe"],
    commonPhilosophicalProblems: ["bilime sadık kalmak istiyorum ama piyasa hızlı sonuç istiyor", "başkalarının sağlığını düzeltirken kendi dengemi kaybediyorum"],
    commonDesires: ["istikrarlı danışan akışı", "yüksek danışan bağlılığı", "dijital ürün geliri", "daha az operasyon yükü"],
    checklist: [
      { id: "diet-no-crm", label: "E-posta/CRM sistemi yok" },
      { id: "diet-no-site", label: "Web sitesi/randevu sistemi yok" },
      { id: "diet-low-content", label: "Düzenli içerik üretilemiyor" },
      { id: "diet-low-visibility", label: "Dijital görünürlük yetersiz" },
      { id: "diet-high-churn", label: "Danışan bırakma oranı yüksek" },
      { id: "diet-1to1", label: "Gelir tamamen birebir seansa bağlı" },
      { id: "diet-irregular-flow", label: "Danışan akışı düzensiz" },
      { id: "diet-price-pressure", label: "Fiyat baskısı yüksek" },
      { id: "diet-tech-gap", label: "Otomasyon/teknoloji kullanımı zayıf" },
      { id: "diet-burnout", label: "Tükenmişlik belirtileri var" },
    ],
  },
  education: {
    id: "education",
    label: "Eğitim Kurumu",
    businessModel: "service",
    diagnosticQuestions: [
      "Kayıtların büyük bölümü yılın birkaç ayına mı sıkışıyor?",
      "Velilerin fiyat duyarlılığı ve alternatiflerle kıyaslaması satışları etkiliyor mu?",
      "Dijital reklam maliyetleri artarken dönüşüm oranı düşüyor mu?",
      "Kurumu farklılaştıran değer önerisi net mi?",
      "Veli karar yolculuğunda dijital görünürlük yeterli mi?",
      "Regülasyon ve maliyet değişimleri marjı sıkıştırıyor mu?",
    ],
    commonExternalProblems: ["alım gücü baskısı", "regülasyonlar", "yoğun rekabet", "artan reklam maliyeti", "sezonluk kayıt bağımlılığı"],
    commonInternalProblems: ["fiyat indirimine kaçma", "farklılaşma mesajının net olmaması", "sezon baskısı"],
    commonPhilosophicalProblems: ["eğitim kalitesini artırırken fiyat rekabetine sıkışıyorum", "kurum büyüyor ama kayıt dönemi dışında sistem duruyor"],
    commonDesires: ["istikrarlı kayıt talebi", "yüksek veli güveni", "daha güçlü marka konumu", "sezon dışı talep"],
    checklist: [
      { id: "edu-seasonal", label: "Kayıt akışı sezonluk" },
      { id: "edu-margin", label: "Maliyet/regülasyon nedeniyle marj baskısı var" },
      { id: "edu-ad-cost", label: "Reklam maliyeti yükseliyor" },
      { id: "edu-low-digital", label: "Dijital görünürlük rakiplerin gerisinde" },
      { id: "edu-price", label: "Velilerde yüksek fiyat hassasiyeti var" },
      { id: "edu-differentiation", label: "Farklılaşma mesajı net değil" },
      { id: "edu-followup", label: "Aday veli takip sistemi zayıf" },
      { id: "edu-proof", label: "Başarı/vaka/sosyal kanıt sistematik kullanılmıyor" },
    ],
  },
  cafe: {
    id: "cafe",
    label: "Kafe",
    businessModel: "service",
    diagnosticQuestions: [
      "Mekân dolu görünmesine rağmen masa başı ciro düşük mü?",
      "İşletme sen yokken aynı kalite ve hızda çalışıyor mu?",
      "Personel devir oranı yüksek mi?",
      "Google Business ve sosyal medya düzenli güncelleniyor mu?",
      "Müdavimlerin ortalama sepeti artıyor mu?",
      "Marka tek şubeden çoğalabilecek kadar sistemli mi?",
    ],
    commonExternalProblems: ["düşük masa başı ciro", "personel devri", "yüksek rekabet", "düşük harita/sosyal görünürlük"],
    commonInternalProblems: ["operasyon kaosu", "sürekli işletmede bulunma zorunluluğu", "yaratıcılığa zaman ayıramama"],
    commonPhilosophicalProblems: ["mekân dolu ama kasa beklediğim kadar dolmuyor", "özgür olmak için patron oldum ama işletmeye daha çok bağlandım"],
    commonDesires: ["yüksek ortalama sepet", "hayran müşteri kitlesi", "otomatik pilot operasyon", "franchise verilebilir marka"],
    checklist: [
      { id: "cafe-low-check", label: "Ortalama sepet düşük" },
      { id: "cafe-owner-dependent", label: "İşletme sahibine aşırı bağımlı" },
      { id: "cafe-staff-churn", label: "Personel devir oranı yüksek" },
      { id: "cafe-google", label: "Google Business düzenli güncellenmiyor" },
      { id: "cafe-content", label: "Sosyal içerik düzeni zayıf" },
      { id: "cafe-upsell", label: "Upsell/cross-sell sistemi zayıf" },
      { id: "cafe-loyalty", label: "Sadakat sistemi ölçülmüyor" },
      { id: "cafe-process", label: "Operasyon standartları belgeli değil" },
    ],
  },
  personal_trainer: {
    id: "personal_trainer",
    label: "Personal Trainer",
    businessModel: "knowledge_expertise",
    diagnosticQuestions: [
      "Gelirin fiziksel olarak verebildiğin ders saatine mi bağlı?",
      "Salon komisyonu kazancını ciddi etkiliyor mu?",
      "İptaller doğrudan gelir kaybına dönüşüyor mu?",
      "Müşteri sonuçlarını sistematik sosyal kanıta dönüştürüyor musun?",
      "Online paket, grup programı veya dijital ürünün var mı?",
      "Sosyal medya takipçilerini satış sürecine taşıyan sistemin var mı?",
    ],
    commonExternalProblems: ["salon komisyonu", "iptal kaynaklı gelir kaybı", "saat kapasitesi sınırı", "ücretsiz içerikle rekabet"],
    commonInternalProblems: ["uzun vadeli sistem kurmayı erteleme", "gelir/statü kaygısı", "gelecek kaygısı"],
    commonPhilosophicalProblems: ["çok disiplinliyim ama kazancım aynı hızda büyümüyor", "bir saatte bir kişiye değer katarken ölçekleyemiyorum"],
    commonDesires: ["online gelir", "yüksek sosyal kanıt", "salondan bağımsız müşteri akışı", "ölçeklenebilir program"],
    checklist: [
      { id: "pt-commission", label: "Salon komisyonuna yüksek bağımlılık" },
      { id: "pt-cancellations", label: "İptaller ciddi gelir kaybı yaratıyor" },
      { id: "pt-hourly", label: "Gelir saat satmaya bağlı" },
      { id: "pt-no-online", label: "Online program/dijital ürün yok" },
      { id: "pt-proof", label: "Müşteri sonuçları sistematik sosyal kanıta dönüşmüyor" },
      { id: "pt-no-funnel", label: "Sosyal medyadan satışa giden sistem yok" },
      { id: "pt-no-crm", label: "Lead/CRM takibi yok" },
      { id: "pt-future-risk", label: "Gelir fiziksel performansa aşırı bağımlı" },
    ],
  },
};

export function getCompanyDoctorSectorPack(sector?: string | null) {
  const normalized = (sector || "").trim().toLocaleLowerCase("tr-TR");
  if (!normalized) return companyDoctorSectorPacks.generic;

  if (["diyetisyen", "dietitian", "nutritionist"].includes(normalized)) return companyDoctorSectorPacks.dietitian;
  if (["eğitim", "egitim", "okul", "education", "school"].includes(normalized)) return companyDoctorSectorPacks.education;
  if (["kafe", "cafe", "coffee shop", "kahve"].includes(normalized)) return companyDoctorSectorPacks.cafe;
  if (["pt", "personal trainer", "trainer", "antrenör", "antrenor"].includes(normalized)) return companyDoctorSectorPacks.personal_trainer;

  return companyDoctorSectorPacks.generic;
}
