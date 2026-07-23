import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import type { ChatCompletionContentPart } from "groq-sdk/resources/chat";
import { saveGeneratedContent } from "@/lib/content-store";
import { getUserProfile } from "@/lib/profiles/server";
import { profileToPromptLines, sanitizeProfileInput } from "@/lib/profiles/validation";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const sectionLabels = {
  instagram: "Instagram",
  tiktok: "TikTok",
  reels: "Reels",
  youtubeShorts: "YouTube Shorts",
  facebook: "Facebook",
  twitter: "X / Twitter",
  linkedIn: "LinkedIn",
  adCopies: "Reklam Metinleri",
  story: "Story",
  hashtags: "Hashtagler",
  imagePrompts: "Görsel Promptları",
  contentPlan: "7 Günlük İçerik Planı",
} as const;

type SectionKey = keyof typeof sectionLabels;
type ContentMode = "business" | "personal" | "creator";

type PersonalImage = {
  dataUrl: string;
  width?: number;
  height?: number;
  mimeType?: string;
};

const defaultSectionKeys = Object.keys(sectionLabels) as SectionKey[];
const maxImageDataUrlLength = 6_000_000;
const defaultVisionModel = process.env.GROQ_VISION_MODEL || "llama-3.2-11b-vision-preview";

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeLabel(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[()]/g, "")
    .replace(/[\\/#*_`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentMode(value: unknown): ContentMode {
  return value === "personal" || value === "creator" || value === "business" ? value : "business";
}

function toSectionKey(value: unknown): SectionKey | null {
  if (typeof value !== "string") return null;

  const normalizedValue = normalizeLabel(value);

  return (
    defaultSectionKeys.find((key) => {
      return (
        normalizeLabel(key) === normalizedValue ||
        normalizeLabel(sectionLabels[key]) === normalizedValue
      );
    }) ?? null
  );
}

function selectedPlatformKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultSectionKeys;
  }

  return Array.from(
    new Set(value.map(toSectionKey).filter((key): key is SectionKey => Boolean(key)))
  );
}

function personalImage(value: unknown): PersonalImage | null {
  if (!value || typeof value !== "object") return null;

  const image = value as Record<string, unknown>;
  const dataUrl = typeof image.dataUrl === "string" ? image.dataUrl : "";

  if (!dataUrl) return null;

  const isSupportedDataUrl = /^data:image\/(jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(dataUrl);

  if (!isSupportedDataUrl || dataUrl.length > maxImageDataUrlLength) {
    return null;
  }

  return {
    dataUrl,
    width: typeof image.width === "number" ? image.width : undefined,
    height: typeof image.height === "number" ? image.height : undefined,
    mimeType: typeof image.mimeType === "string" ? image.mimeType : "image/jpeg",
  };
}

async function analyzePersonalImage(image: PersonalImage | null) {
  if (!image) return "";

  try {
    const content: ChatCompletionContentPart[] = [
      {
        type: "text",
        text:
          "Bu görseli sosyal medya paylaşımı için kısaca analiz et. Kişi kimliği tahmini yapma. Ortamı, hissi, renkleri, görünür objeleri ve paylaşım tonunu 2-3 Türkçe cümleyle özetle.",
      },
      {
        type: "image_url",
        image_url: {
          url: image.dataUrl,
        },
      },
    ];

    const completion = await groq.chat.completions.create({
      model: defaultVisionModel,
      messages: [
        {
          role: "user",
          content,
        },
      ],
      max_completion_tokens: 180,
    });

    return completion.choices[0]?.message?.content?.trim() || "";
  } catch {
    console.warn("Görsel analizi atlandı; metin açıklamasıyla devam ediliyor.");
    return "";
  }
}

function buildModeBrief(mode: ContentMode, body: Record<string, unknown>, imageDescription: string) {
  if (mode === "personal") {
    return `Üretim modu: Kişisel Paylaşım
Fotoğraf açıklaması: ${textValue(body.photoDescription, "Belirtilmedi")}
Görsel analizi: ${imageDescription || "Görsel analiz edilemedi; kullanıcının fotoğraf açıklamasını esas al."}
Paylaşım amacı: ${textValue(body.personalGoal, "Belirtilmedi")}
Ruh hali: ${textValue(body.mood, "Belirtilmedi")}
İçerik tarzı: ${textValue(body.personalStyle, "Doğal")}
Kısa not: ${textValue(body.personalNote, "Yok")}`;
  }

  if (mode === "creator") {
    return `Üretim modu: İçerik Üretici
Konu: ${textValue(body.creatorTopic, "Belirtilmedi")}
İçerik türü: ${textValue(body.contentType, "Belirtilmedi")}
Hedef kitle: ${textValue(body.creatorAudience, "Genel hedef kitle")}
Video süresi: ${textValue(body.videoDuration, "30 saniye")}
İçerik tonu: ${textValue(body.creatorTone, "Enerjik")}`;
  }

  return `Üretim modu: İşletme / Ürün
Ürün adı: ${textValue(body.product, "Belirtilmedi")}
Ürün açıklaması: ${textValue(body.description, "Belirtilmedi")}
Marka tonu: ${textValue(body.tone, "Samimi")}
Hedef kitle: ${textValue(body.targetAudience, "Genel hedef kitle")}
Fiyat / Teklif: ${textValue(body.price, "Belirtilmedi")}
Aktif Kampanya: ${textValue(body.campaign, "Yok")}
Rakip Marka: ${textValue(body.competitor, "Belirtilmedi")}
Web Sitesi: ${textValue(body.website, "Belirtilmedi")}`;
}

async function profileContext(userId: string, body: Record<string, unknown>) {
  const profileId = textValue(body.profileId, "");

  if (profileId) {
    const { profile } = await getUserProfile(userId, profileId);
    const lines = profileToPromptLines(profile);
    if (lines) return lines;
  }

  if (body.profileSnapshot && typeof body.profileSnapshot === "object") {
    return profileToPromptLines(sanitizeProfileInput(body.profileSnapshot));
  }

  return "";
}

function buildRules(keys: SectionKey[], mode: ContentMode) {
  const has = (key: SectionKey) => keys.includes(key);
  const rules = [
    "- Sadece seçilen başlıklar için içerik üret; seçilmeyen başlıkları hiç yazma.",
    "- Her seçilen bölüm için net, hazır kullanılabilir metin yaz.",
  ];

  if (mode === "personal") {
    rules.push(
      "- Kişisel paylaşım modunda satış dili, reklam dili, kampanya dili veya ürün satma tonu kullanma.",
      "- Normal bir fotoğraf için insan gibi, doğal, paylaşılabilir ve seçilen tarza uygun metinler yaz.",
      "- Kullanıcının seçtiği tarz komik, doğal, havalı, duygusal veya samimi olabilir; çıktıları buna göre ayarla."
    );

    if (has("instagram")) rules.push("- Instagram bölümünde caption ve kısa başlık olsun.");
    if (has("story")) rules.push("- Story bölümünde 2-3 ekranlık story metni yaz.");
    if (has("reels")) rules.push("- Reels bölümünde özellikle komik veya akılda kalan kısa Reels fikri ver.");
    if (has("tiktok")) rules.push("- TikTok bölümünde fotoğraftan çıkabilecek kısa video fikri yaz.");
    if (has("youtubeShorts")) rules.push("- YouTube Shorts bölümünde kısa video fikri ve konuşma akışı ver.");
    if (has("twitter")) rules.push("- X / Twitter bölümünde kısa başlık veya tek cümlelik paylaşım ver.");
    if (has("hashtags")) rules.push("- Hashtagler bölümünde tam 15 hashtag ver.");
    if (has("imagePrompts")) rules.push("- Görsel Promptları bölümünde fotoğraf estetiğini güçlendirecek düzenleme fikirleri ver.");
    if (has("contentPlan")) rules.push("- 7 Günlük İçerik Planı bölümünde kişisel paylaşım hesabına uygun doğal fikirler ver.");
  } else if (mode === "creator") {
    rules.push(
      "- İçerik üretici modu için hook, senaryo, caption, CTA, hashtag ve thumbnail prompt odaklı üret.",
      "- Video akışını net, çekime hazır ve seçilen süreye uygun yaz."
    );

    if (has("instagram") || has("facebook") || has("linkedIn") || has("twitter")) {
      rules.push("- Sosyal paylaşım bölümlerinde caption, hook ve CTA içeren platforma uygun metin yaz.");
    }
    if (has("tiktok") || has("reels") || has("youtubeShorts")) {
      rules.push("- TikTok, Reels ve YouTube Shorts bölümlerinde zaman akışlı senaryo, hook ve kapanış ver.");
    }
    if (has("adCopies")) rules.push("- Reklam Metinleri bölümünde içerik tanıtımı için 5 kısa CTA alternatifi ver.");
    if (has("hashtags")) rules.push("- Hashtagler bölümünde konuya uygun 20 hashtag ver.");
    if (has("imagePrompts")) rules.push("- Görsel Promptları bölümünde thumbnail prompt ve kapak görseli fikri ver.");
    if (has("contentPlan")) rules.push("- 7 Günlük İçerik Planı bölümünde konu etrafında günlük içerik fikirleri ver.");
  } else {
    if (has("instagram")) rules.push("- Instagram bölümünde caption, kısa hook ve paylaşım fikri olsun.");
    if (has("tiktok") || has("reels") || has("youtubeShorts")) {
      rules.push("- TikTok, Reels ve YouTube Shorts bölümlerinde kısa video fikri ve konuşma akışı olsun.");
    }
    if (has("adCopies")) rules.push("- Reklam Metinleri bölümünde 5 farklı kısa reklam metni ver.");
    if (has("story")) rules.push("- Story bölümünde 3 ekranlık hikaye akışı yaz.");
    if (has("hashtags")) rules.push("- Hashtagler bölümünde tam 20 hashtag ver.");
    if (has("imagePrompts")) rules.push("- Görsel Promptları bölümünde 4 net görsel üretim fikri ver.");
    if (has("contentPlan")) {
      rules.push("- 7 Günlük İçerik Planı bölümünde her gün için platform, fikir ve kısa açıklama yaz.");
    }
  }

  rules.push(
    "- Başlıkları markdown ile kalınlaştırma; başlıkları düz metin ve sonlarında iki nokta olacak şekilde yaz.",
    "- API anahtarı, sistem bilgisi veya gereksiz açıklama yazma."
  );

  return rules.join("\n");
}

function validationError(mode: ContentMode, body: Record<string, unknown>) {
  if (mode === "business" && (!body.product || !body.tone)) {
    return "Ürün adı ve marka tonu zorunludur.";
  }

  if (mode === "personal" && !textValue(body.photoDescription, "").trim()) {
    return "Kişisel paylaşım için fotoğraf açıklaması zorunludur.";
  }

  if (mode === "creator" && !textValue(body.creatorTopic, "").trim()) {
    return "İçerik üretici modu için konu zorunludur.";
  }

  return "";
}

function savedContentTitle(mode: ContentMode, body: Record<string, unknown>) {
  if (mode === "personal") {
    return textValue(body.photoDescription, "Kişisel paylaşım").slice(0, 90);
  }

  if (mode === "creator") {
    return textValue(body.creatorTopic, "İçerik üretici").slice(0, 90);
  }

  return textValue(body.product, "BrandFlow içeriği");
}

function savedTone(mode: ContentMode, body: Record<string, unknown>) {
  if (mode === "personal") return textValue(body.personalStyle, "Doğal");
  if (mode === "creator") return textValue(body.creatorTone, "Enerjik");
  return textValue(body.tone, "Samimi");
}

export async function POST(req: Request) {
  try {
    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated) {
      return Response.json(
        { error: "İçerik üretmek için giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const mode = contentMode(body.mode);
    const error = validationError(mode, body);

    if (error) {
      return Response.json({ error }, { status: 400 });
    }

    const selectedKeys = selectedPlatformKeys(body.platforms);

    if (Array.isArray(body.platforms) && selectedKeys.length === 0) {
      return Response.json(
        { error: "İçerik üretmek için en az bir bölüm seçin." },
        { status: 400 }
      );
    }

    const image = mode === "personal" ? personalImage(body.personalImage) : null;

    if (mode === "personal" && body.personalImage && !image) {
      return Response.json(
        { error: "Fotoğraf işlenemedi. Lütfen JPG, PNG veya WEBP formatında daha küçük bir görsel seçin." },
        { status: 400 }
      );
    }

    const imageDescription = mode === "personal" ? await analyzePersonalImage(image) : "";
    const activeProfileContext = userId ? await profileContext(userId, body) : "";
    const selectedHeadings = selectedKeys.map((key) => `${sectionLabels[key]}:`).join("\n");
    const selectedNames = selectedKeys.map((key) => sectionLabels[key]).join(", ");
    const focusKey = toSectionKey(body.focusSection);
    const focusInstruction = focusKey
      ? `\nÖzellikle "${sectionLabels[focusKey]}" bölümünü yeni, daha güçlü ve farklı bir açıyla yaz. Seçili olmayan başlıkları yazma.`
      : "";

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "Sen küçük işletmeler, kişisel sosyal medya kullanıcıları ve içerik üreticileri için çalışan profesyonel bir içerik asistanısın. Cevaplarını Türkçe, sade, net ve markdown uyumlu yaz. Teknik açıklama yapma; doğrudan kullanılabilir içerikler üret.",
        },
        {
          role: "user",
          content: `${buildModeBrief(mode, body, imageDescription)}
${activeProfileContext ? `\nAktif profil bilgileri:\n${activeProfileContext}\n` : ""}
Seçilen bölümler: ${selectedNames}${focusInstruction}

Aşağıdaki seçilen başlıklarla tek seferde içerik paketi hazırla. Başlık adlarını aynen kullan ve her başlığı ayrı satıra yaz:

${selectedHeadings}

Kurallar:
${buildRules(selectedKeys, mode)}`,
        },
      ],
    });

    const result = completion.choices[0]?.message?.content || "İçerik üretilemedi.";

    const savedContent = userId
      ? await saveGeneratedContent({
        userId,
        product: savedContentTitle(mode, body),
        tone: savedTone(mode, body),
        content: result,
        sections: { selectedPlatforms: selectedKeys.join(",") },
      })
      : null;

    return Response.json({ result, savedContent });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Generate route error");
    return Response.json(
      { error: "İçerik oluşturulamadı. Lütfen bilgileri kontrol edip tekrar deneyin." },
      { status: 500 }
    );
  }
}
