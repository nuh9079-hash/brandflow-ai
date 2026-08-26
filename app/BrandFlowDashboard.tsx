"use client";

import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { UpcomingScheduledPosts } from "@/components/calendar/UpcomingScheduledPosts";
import { LatestRecommendations } from "@/components/marketing/LatestRecommendations";
import { AnalyticsSummary } from "@/components/analytics/AnalyticsSummary";
import { ProfileBadge } from "@/components/profiles/ProfileBadge";
import { ProfileOnboarding } from "@/components/profiles/ProfileOnboarding";
import { Button, Card, Input, Select } from "@/components/ui";
import { cacheGeneratedContent } from "@/lib/client-content-cache";
import type { GeneratedContentRecord } from "@/lib/content-store";
import { activeProfileId, loadProfiles, setActiveProfileId, updateProfile } from "@/lib/profiles/client";
import { createEmptyProfileInput, profileTypeLabels, type ProfileInput, type ProfilePlatform, type UserProfile } from "@/lib/profiles/types";

type GeneratedSections = {
  instagram: string;
  tiktok: string;
  reels: string;
  youtubeShorts: string;
  facebook: string;
  twitter: string;
  linkedIn: string;
  adCopies: string;
  story: string;
  hashtags: string;
  imagePrompts: string;
  contentPlan: string;
};

type SectionKey = keyof GeneratedSections;
type ContentMode = "business" | "personal" | "creator";

type OutputSection = {
  key: SectionKey;
  title: string;
  helper: string;
};

const modeOptions: Array<{ id: ContentMode; title: string; helper: string }> = [
  { id: "business", title: "İşletme / Ürün", helper: "Ürün, kampanya ve satış içerikleri" },
  { id: "personal", title: "Kişisel Paylaşım", helper: "Fotoğraf için doğal paylaşım metinleri" },
  { id: "creator", title: "İçerik Üretici", helper: "Video fikri, hook, senaryo ve caption" },
];

const tones = ["Samimi", "Profesyonel", "Eğlenceli", "Lüks", "Cesur", "Minimal"];
const personalStyles = ["Komik", "Samimi", "Havalı", "Duygusal", "Doğal"];
const contentTypes = ["Eğitici video", "Vlog", "Liste içerik", "İnceleme", "Storytelling", "Tanıtım"];
const videoDurations = ["15 saniye", "30 saniye", "45 saniye", "60 saniye"];
const creatorTones = ["Enerjik", "Bilgilendirici", "Samimi", "Komik", "Havalı", "Duygusal"];
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 8 * 1024 * 1024;
const maxImageEdge = 1280;
const imageQuality = 0.8;

type ProcessedPhoto = {
  dataUrl: string;
  width: number;
  height: number;
};

const outputSections: OutputSection[] = [
  { key: "instagram", title: "Instagram", helper: "Caption ve paylaşım fikri" },
  { key: "tiktok", title: "TikTok", helper: "Kısa video fikri" },
  { key: "reels", title: "Reels", helper: "Hızlı video akışı" },
  { key: "youtubeShorts", title: "YouTube Shorts", helper: "Dikey video metni" },
  { key: "facebook", title: "Facebook", helper: "Paylaşım metni" },
  { key: "twitter", title: "X / Twitter", helper: "Kısa paylaşım" },
  { key: "linkedIn", title: "LinkedIn", helper: "Profesyonel paylaşım" },
  { key: "adCopies", title: "Reklam Metinleri", helper: "Satış odaklı metinler" },
  { key: "story", title: "Story", helper: "Hikaye akışı" },
  { key: "hashtags", title: "Hashtagler", helper: "Etiket listesi" },
  { key: "imagePrompts", title: "Görsel Promptları", helper: "Görsel üretim fikirleri" },
  { key: "contentPlan", title: "7 Günlük İçerik Planı", helper: "Haftalık paylaşım planı" },
];

const allPlatformKeys = outputSections.map((section) => section.key);
const allPlatformKeySet = new Set<string>(allPlatformKeys);

function profilePlatformsToSectionKeys(platforms: ProfilePlatform[]) {
  const keys = platforms.filter((platform): platform is SectionKey => allPlatformKeySet.has(platform));
  return keys.length > 0 ? keys : [...allPlatformKeys];
}

const fallbackSections: GeneratedSections = {
  instagram: "Henüz içerik oluşturulmadı.",
  tiktok: "Ürün bilgilerini girip tüm içerikleri oluşturun.",
  reels: "Reels fikirleri burada görünecek.",
  youtubeShorts: "YouTube Shorts metni burada görünecek.",
  facebook: "Facebook paylaşımı burada görünecek.",
  twitter: "X / Twitter metni burada görünecek.",
  linkedIn: "LinkedIn paylaşımı burada görünecek.",
  adCopies: "Reklam metinleri burada görünecek.",
  story: "Story akışı burada görünecek.",
  hashtags: "#brandflow #sosyalmedya",
  imagePrompts: "Görsel promptları burada görünecek.",
  contentPlan: "7 günlük plan burada görünecek.",
};

const loadingSteps = ["Brief okunuyor", "Moda göre ayarlanıyor", "Platform metinleri yazılıyor", "Sonuçlar hazırlanıyor"];

function emptySections(): GeneratedSections {
  return {
    instagram: "",
    tiktok: "",
    reels: "",
    youtubeShorts: "",
    facebook: "",
    twitter: "",
    linkedIn: "",
    adCopies: "",
    story: "",
    hashtags: "",
    imagePrompts: "",
    contentPlan: "",
  };
}

function normalizeLabel(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[()]/g, "")
    .replace(/[\\/#*_`]/g, " ")
    .replace(/[:：]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGeneratedText(text: string): GeneratedSections {
  const labels: Record<SectionKey, string[]> = {
    instagram: ["instagram"],
    tiktok: ["tiktok", "tik tok"],
    reels: ["reels", "instagram reels"],
    youtubeShorts: ["youtube shorts", "shorts"],
    facebook: ["facebook"],
    twitter: ["x twitter", "x", "twitter", "x / twitter"],
    linkedIn: ["linkedin", "linked in"],
    adCopies: ["reklam metinleri", "reklam metni", "ad copies", "ads"],
    story: ["story", "hikaye"],
    hashtags: ["hashtagler", "hashtags", "hashtag"],
    imagePrompts: ["görsel promptları", "görsel promptlar", "image prompts", "ai image prompts"],
    contentPlan: ["7 günlük içerik planı", "7 gunluk icerik plani", "içerik planı", "content plan"],
  };

  const sections = emptySections();
  const lines = text.split(/\r?\n/);
  let current: SectionKey | null = null;

  for (const line of lines) {
    const cleanLine = line.replace(/^\s*[-*#\d.)]+\s*/, "").trim();
    const heading = cleanLine.split(/[:：]/)[0];
    const normalizedHeading = normalizeLabel(heading);
    const matchedKey = (Object.keys(labels) as SectionKey[]).find((key) =>
      labels[key].some((label) => normalizeLabel(label) === normalizedHeading)
    );

    if (matchedKey) {
      current = matchedKey;
      const inlineValue = cleanLine.split(/[:：]/).slice(1).join(":").trim();
      if (inlineValue) {
        sections[current] += `${inlineValue}\n`;
      }
      continue;
    }

    if (current && cleanLine) {
      sections[current] += `${line.trim()}\n`;
    }
  }

  if (!Object.values(sections).some(Boolean)) {
    sections.instagram = text;
  }

  return Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [key, value.trim()])
  ) as GeneratedSections;
}

function sectionText(sections: GeneratedSections, key: SectionKey) {
  return sections[key] || "Bu bölüm için içerik bulunamadı.";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdown(markdown: string) {
  const escaped = escapeHtml(markdown);
  const withInline = escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  return withInline
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      const isList = lines.every((line) => /^\s*[-•]\s+/.test(line));
      const isOrderedList = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));

      if (isList) {
        return `<ul>${lines.map((line) => `<li>${line.replace(/^\s*[-•]\s+/, "")}</li>`).join("")}</ul>`;
      }

      if (isOrderedList) {
        return `<ol>${lines.map((line) => `<li>${line.replace(/^\s*\d+[.)]\s+/, "")}</li>`).join("")}</ol>`;
      }

      return `<p>${lines.join("<br />")}</p>`;
    })
    .join("");
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Görsel okunamadı."));
    image.src = src;
  });
}

async function resizePhoto(file: File): Promise<ProcessedPhoto> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxImageEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Görsel işlenemedi.");
    }

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", imageQuality),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function BrandFlowDashboard() {
  const [mode, setMode] = useState<ContentMode>("business");
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("Samimi");
  const [targetAudience, setTargetAudience] = useState("");
  const [price, setPrice] = useState("");
  const [campaign, setCampaign] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [website, setWebsite] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");
  const [personalGoal, setPersonalGoal] = useState("");
  const [mood, setMood] = useState("");
  const [personalStyle, setPersonalStyle] = useState("Doğal");
  const [personalNote, setPersonalNote] = useState("");
  const [photo, setPhoto] = useState<ProcessedPhoto | null>(null);
  const [photoFileName, setPhotoFileName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);
  const [creatorTopic, setCreatorTopic] = useState("");
  const [contentType, setContentType] = useState("Eğitici video");
  const [creatorAudience, setCreatorAudience] = useState("");
  const [videoDuration, setVideoDuration] = useState("30 saniye");
  const [creatorTone, setCreatorTone] = useState("Enerjik");
  const [platforms, setPlatforms] = useState<SectionKey[]>(() => [...allPlatformKeys]);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<SectionKey | "all" | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useUser();
  const displayName = user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Hoş geldin";
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [profileStorage, setProfileStorage] = useState<"supabase" | "local">("supabase");
  const [activeProfileStateId, setActiveProfileStateId] = useState("");
  const [skipProfileOnboarding, setSkipProfileOnboarding] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const sections = useMemo(
    () => (result ? parseGeneratedText(result) : fallbackSections),
    [result]
  );
  const selectedOutputSections = useMemo(
    () => outputSections.filter((section) => platforms.includes(section.key)),
    [platforms]
  );
  const requiredFieldFilled =
    mode === "business"
      ? Boolean(product.trim())
      : mode === "personal"
        ? Boolean(photoDescription.trim())
        : Boolean(creatorTopic.trim());
  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileStateId) ?? null,
    [activeProfileStateId, profiles]
  );
  const defaultProfile = useMemo(
    () => profiles.find((profile) => profile.is_default) ?? null,
    [profiles]
  );
  const lastUsedProfile = useMemo(
    () =>
      profiles
        .filter((profile) => profile.last_used_at)
        .sort((first, second) => new Date(second.last_used_at ?? 0).getTime() - new Date(first.last_used_at ?? 0).getTime())[0] ?? null,
    [profiles]
  );

  function applyProfileToForm(profile: UserProfile, announce = false) {
    setActiveProfileStateId(profile.id);
    setMode(profile.profile_type);
    setResult("");
    setError("");
    setCopiedKey(null);

    if (profile.profile_type === "personal") {
      setPhotoDescription(profile.photo_style || profile.personal_notes || "");
      setPersonalGoal("");
      setMood(profile.personal_mood || "");
      setPersonalStyle(profile.content_style || "Doğal");
      setPersonalNote(profile.personal_notes || "");
      setPlatforms(profilePlatformsToSectionKeys(profile.personal_platforms));
    } else if (profile.profile_type === "creator") {
      setCreatorTopic(profile.main_topic || "");
      setContentType(profile.sub_topics[0] || "Eğitici video");
      setCreatorAudience(profile.creator_audience || "");
      setVideoDuration(profile.video_duration || "30 saniye");
      setCreatorTone(profile.creator_tone || "Enerjik");
      setPlatforms(profilePlatformsToSectionKeys(profile.creator_platforms));
    } else {
      setProduct(profile.product_or_service || profile.business_name || "");
      setDescription(profile.description || "");
      setTone(profile.brand_tone || "Samimi");
      setTargetAudience(profile.target_audience || "");
      setPrice(profile.price_range || "");
      setCampaign(profile.campaign_info || "");
      setCompetitor(profile.competitor || "");
      setWebsite(profile.website || "");
      setPlatforms(profilePlatformsToSectionKeys(profile.default_platforms));
    }

    if (announce) {
      setProfileMessage(`${profile.profile_name} forma uygulandı.`);
      window.setTimeout(() => setProfileMessage(""), 1800);
    }
  }

  function profileInputFromCurrent(profile: UserProfile): ProfileInput {
    const base: ProfileInput = {
      ...createEmptyProfileInput(profile.profile_type),
      ...profile,
      is_default: profile.is_default,
    };

    if (profile.profile_type === "personal") {
      return {
        ...base,
        photo_style: photoDescription,
        personal_mood: mood,
        content_style: personalStyle,
        personal_notes: personalNote,
        personal_platforms: platforms as ProfilePlatform[],
        personal_language: base.personal_language || "Türkçe",
      };
    }

    if (profile.profile_type === "creator") {
      return {
        ...base,
        main_topic: creatorTopic,
        sub_topics: contentType ? [contentType] : base.sub_topics,
        creator_audience: creatorAudience,
        video_duration: videoDuration,
        creator_tone: creatorTone,
        creator_platforms: platforms as ProfilePlatform[],
        creator_language: base.creator_language || "Türkçe",
      };
    }

    return {
      ...base,
      product_or_service: product,
      description,
      brand_tone: tone,
      target_audience: targetAudience,
      price_range: price,
      campaign_info: campaign,
      competitor,
      website,
      default_platforms: platforms as ProfilePlatform[],
      language: base.language || "Türkçe",
    };
  }

  useEffect(() => {
    if (!loading) return;

    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(value + Math.random() * 14, 90));
    }, 450);

    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!user?.id) return;

    const timer = window.setTimeout(() => {
      loadProfiles(user.id)
        .then(({ storage, profiles: nextProfiles }) => {
          const storedActiveId = activeProfileId(user.id);
          const preferredProfile = nextProfiles.find((profile) => profile.id === storedActiveId)
            ?? nextProfiles.find((profile) => profile.is_default)
            ?? nextProfiles[0]
            ?? null;

          setProfiles(nextProfiles);
          setProfileStorage(storage);
          setActiveProfileStateId(preferredProfile?.id ?? "");
          if (preferredProfile) setActiveProfileId(user.id, preferredProfile.id);
        })
        .catch(() => setProfileStorage("local"));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user?.id]);

  useEffect(() => {
    if (!activeProfile) return;

    const timer = window.setTimeout(() => {
      applyProfileToForm(activeProfile);
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]);

  useEffect(() => {
    if (!user?.id) return;

    function handleActiveProfileChange(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string; profileId?: string }>).detail;
      if (detail?.userId && detail.userId !== user?.id) return;
      setActiveProfileStateId(detail?.profileId ?? "");
    }

    window.addEventListener("brandflow:active-profile-change", handleActiveProfileChange);
    return () => window.removeEventListener("brandflow:active-profile-change", handleActiveProfileChange);
  }, [user?.id]);

  function selectMode(nextMode: ContentMode) {
    setMode(nextMode);
    setResult("");
    setError("");
    setCopiedKey(null);
  }

  function chooseProfile(profileId: string) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile || !user?.id) return;

    setActiveProfileStateId(profile.id);
    setActiveProfileId(user.id, profile.id);
    applyProfileToForm(profile, true);
  }

  async function saveCurrentFormToProfile() {
    if (!activeProfile || !user?.id) {
      setProfileMessage("Kaydetmek için önce bir profil seç.");
      window.setTimeout(() => setProfileMessage(""), 1800);
      return;
    }

    const { storage, profile } = await updateProfile(user.id, activeProfile.id, profileInputFromCurrent(activeProfile));
    setProfileStorage(storage);

    if (profile) {
      setProfiles((current) => current.map((item) => (item.id === profile.id ? profile : item)));
      setProfileMessage("Profil güncellendi.");
    } else {
      setProfileMessage("Profil güncellenemedi. Lütfen tekrar dene.");
    }

    window.setTimeout(() => setProfileMessage(""), 1800);
  }

  function togglePlatform(key: SectionKey) {
    setPlatforms((current) =>
      current.includes(key)
        ? current.filter((platformKey) => platformKey !== key)
        : [...current, key]
    );
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setPhotoError("");
    setError("");

    if (!acceptedImageTypes.includes(file.type)) {
      setPhoto(null);
      setPhotoFileName("");
      setPhotoError("Sadece JPG, PNG veya WEBP görsel yükleyebilirsin.");
      event.target.value = "";
      return;
    }

    if (file.size > maxImageBytes) {
      setPhoto(null);
      setPhotoFileName("");
      setPhotoError(`Görsel en fazla 8 MB olabilir. Seçilen dosya: ${formatFileSize(file.size)}.`);
      event.target.value = "";
      return;
    }

    setImageProcessing(true);
    setPhotoFileName(file.name);

    try {
      const processedPhoto = await resizePhoto(file);
      setPhoto(processedPhoto);
    } catch {
      setPhoto(null);
      setPhotoFileName("");
      setPhotoError("Görsel işlenemedi. Farklı bir JPG, PNG veya WEBP dosyası dene.");
      event.target.value = "";
    } finally {
      setImageProcessing(false);
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoFileName("");
    setPhotoError("");
    setImageProcessing(false);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function validationMessage() {
    if (mode === "business" && !product.trim()) {
      return "Başlamak için ürün adını yaz.";
    }

    if (mode === "personal" && !photoDescription.trim()) {
      return "Kişisel paylaşım için fotoğrafı kısaca anlat.";
    }

    if (mode === "creator" && !creatorTopic.trim()) {
      return "İçerik üretici modu için konuyu yaz.";
    }

    if (imageProcessing) {
      return "Görsel işleniyor. Lütfen birkaç saniye sonra tekrar dene.";
    }

    if (platforms.length === 0) {
      return "İçerik oluşturmak için en az bir bölüm seç.";
    }

    return "";
  }

  function currentContentTitle() {
    if (mode === "personal") return photoDescription.trim().slice(0, 90) || "Kişisel paylaşım";
    if (mode === "creator") return creatorTopic.trim().slice(0, 90) || "İçerik üretici";
    return product.trim() || "BrandFlow içeriği";
  }

  function currentToneLabel() {
    if (mode === "personal") return personalStyle;
    if (mode === "creator") return creatorTone;
    return tone;
  }

  async function generateContent() {
    const message = validationMessage();

    if (message) {
      setError(message);
      return;
    }

    setLoading(true);
    setProgress(10);
    setResult("");
    setError("");
    setCopiedKey(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          product,
          description,
          tone,
          targetAudience,
          price,
          campaign,
          competitor,
          website,
          photoDescription,
          personalGoal,
          mood,
          personalStyle,
          personalNote,
          personalImage:
            mode === "personal" && photo
              ? {
                  dataUrl: photo.dataUrl,
                  width: photo.width,
                  height: photo.height,
                  mimeType: "image/jpeg",
                }
              : undefined,
          creatorTopic,
          contentType,
          creatorAudience,
          videoDuration,
          creatorTone,
          platforms,
          profileId: activeProfile?.id,
          profileSnapshot: activeProfile ? profileInputFromCurrent(activeProfile) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "İçerikler oluşturulamadı.");
      }

      setProgress(100);
      const generatedText = data.result || "İçerikler oluşturulamadı.";
      setResult(generatedText);

      if (user?.id) {
        cacheGeneratedContent(
          user.id,
          data.savedContent
            ? (data.savedContent as GeneratedContentRecord)
            : {
                product: currentContentTitle(),
                tone: currentToneLabel(),
                content: generatedText,
                sections: { selectedPlatforms: platforms.join(",") },
              }
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const safeMessage =
        message && !/failed|network|unexpected|json|syntaxerror/i.test(message)
          ? message
          : "İçerikler oluşturulamadı. Lütfen tekrar dene.";

      setError(safeMessage);
    } finally {
      window.setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
    }
  }

  async function copyText(key: SectionKey | "all") {
    const text =
      key === "all"
        ? selectedOutputSections.map((section) => `${section.title}\n${sectionText(sections, section.key)}`).join("\n\n")
        : sectionText(sections, key);

    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  }

  const activeLoadingSteps =
    mode === "personal" && photo
      ? ["Görsel analiz ediliyor", "Fotoğraf notu hazırlanıyor", "Paylaşım metinleri yazılıyor", "Sonuçlar hazırlanıyor"]
      : loadingSteps;
  const loadingStep = activeLoadingSteps[Math.min(Math.floor(progress / 26), activeLoadingSteps.length - 1)];

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-300">BrandFlow AI</p>
            <h1 className="mt-2 text-2xl font-black sm:text-4xl">Tek tuşla tüm içeriklerini oluştur</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              İster ürün sat, ister fotoğraf paylaş, ister video içeriği üret. Modunu seç, kısa brief ver, sonuçları al.
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-200">{displayName}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5">
              <UserButton />
            </div>
            <SignOutButton redirectUrl="/sign-in">
              <Button type="button" variant="secondary">Çıkış yap</Button>
            </SignOutButton>
          </div>
        </header>

        <section className="py-6">
          {profiles.length === 0 && !skipProfileOnboarding && (
            <div className="mb-5">
              <ProfileOnboarding onSkip={() => setSkipProfileOnboarding(true)} />
            </div>
          )}

          <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Profil</p>
              <p className="mt-2 text-2xl font-black text-white">{profiles.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Varsayılan</p>
              <p className="mt-2 truncate text-lg font-black text-white">{defaultProfile?.profile_name ?? "Yok"}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Son kullanılan</p>
              <p className="mt-2 truncate text-lg font-black text-white">{lastUsedProfile?.profile_name ?? activeProfile?.profile_name ?? "Yok"}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Profil türü</p>
              <p className="mt-2 truncate text-lg font-black text-white">{activeProfile ? profileTypeLabels[activeProfile.profile_type] : "Seçilmedi"}</p>
            </Card>
          </div>

          <AnalyticsSummary />
          <div className="mb-5 grid gap-3 lg:grid-cols-2">
            <UpcomingScheduledPosts />
            <LatestRecommendations />
          </div>

          <Card className="p-4 sm:p-6">
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                generateContent();
              }}
            >
              <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black text-zinc-100">Aktif profil</h2>
                      {activeProfile && <ProfileBadge type={activeProfile.profile_type} />}
                      {profileStorage === "local" && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-100">
                          Tarayıcıda saklanıyor
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Profil seçince form otomatik dolar. Formda yaptığın değişiklikler sadece butona basınca profile kaydedilir.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {profiles.length > 0 ? (
                      <select
                        value={activeProfileStateId}
                        onChange={(event) => chooseProfile(event.target.value)}
                        className="min-h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-300"
                      >
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.profile_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Link href="/profiles">
                        <Button type="button" variant="secondary">Profil oluştur</Button>
                      </Link>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={saveCurrentFormToProfile}
                      disabled={!activeProfile}
                    >
                      Bu değişiklikleri profile kaydet
                    </Button>

                    <Link href="/profiles">
                      <Button type="button" variant="ghost">Profilleri yönet</Button>
                    </Link>
                  </div>
                </div>

                {profileMessage && (
                  <p className="mt-3 text-sm font-semibold text-emerald-200">{profileMessage}</p>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                <h2 className="text-sm font-black text-zinc-100">Ne üretmek istiyorsun?</h2>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {modeOptions.map((option) => {
                    const selected = mode === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectMode(option.id)}
                        className={`rounded-lg border p-4 text-left transition ${
                          selected
                            ? "border-emerald-400/50 bg-emerald-400/10" :"border-white/10 bg-white/[0.03] hover:bg-white/5"
                        }`}
                      >
                        <span className="block text-sm font-black text-zinc-100">{option.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-zinc-500">{option.helper}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {mode === "business" && (
                <>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Input
                      id="product"
                      label="Ürün adı"
                      type="text"
                      value={product}
                      onChange={(event) => setProduct(event.target.value)}
                      placeholder="Örneğin: Siyah oversize tişört"
                    />

                    <Input
                      id="targetAudience"
                      label="Hedef kitle"
                      type="text"
                      value={targetAudience}
                      onChange={(event) => setTargetAudience(event.target.value)}
                      placeholder="Örneğin: 18-30 yaş streetwear sevenler"
                    />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                    <label className="block text-sm font-semibold text-zinc-200" htmlFor="description">
                      Ürün açıklaması
                      <textarea
                        id="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Ürünün öne çıkan özelliklerini, fiyat avantajını veya müşteriye faydasını yaz."
                        rows={4}
                        className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                      />
                    </label>

                    <Select
                      id="tone"
                      label="Marka tonu"
                      value={tone}
                      onChange={(event) => setTone(event.target.value)}
                      options={tones}
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <Input
                      id="price"
                      label="Fiyat / teklif"
                      type="text"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder="Örneğin: 399 TL"
                    />
                    <Input
                      id="campaign"
                      label="Kampanya"
                      type="text"
                      value={campaign}
                      onChange={(event) => setCampaign(event.target.value)}
                      placeholder="Örneğin: 2 al 1 öde"
                    />
                    <Input
                      id="competitor"
                      label="Rakip / alternatif"
                      type="text"
                      value={competitor}
                      onChange={(event) => setCompetitor(event.target.value)}
                      placeholder="Örneğin: Benzer markalar"
                    />
                    <Input
                      id="website"
                      label="Website"
                      type="url"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}

              {mode === "personal" && (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-5">
                    <label className="block text-sm font-semibold text-zinc-200" htmlFor="photoDescription">
                      Fotoğraf açıklaması
                      <textarea
                        id="photoDescription"
                        value={photoDescription}
                        onChange={(event) => setPhotoDescription(event.target.value)}
                        placeholder="Fotoğrafta ne var? Ortam, kişi, kıyafet, duygu veya anı kısaca anlat."
                        rows={4}
                        className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                      />
                    </label>

                    <div className="grid gap-5 md:grid-cols-2">
                      <Input
                        id="personalGoal"
                        label="Paylaşım amacı"
                        type="text"
                        value={personalGoal}
                        onChange={(event) => setPersonalGoal(event.target.value)}
                        placeholder="Örneğin: Tatil anısı, yeni profil paylaşımı"
                      />
                      <Input
                        id="mood"
                        label="Ruh hali"
                        type="text"
                        value={mood}
                        onChange={(event) => setMood(event.target.value)}
                        placeholder="Örneğin: Mutlu, sakin, özgüvenli"
                      />
                    </div>

                    <Select
                      id="personalStyle"
                      label="İçerik tarzı"
                      value={personalStyle}
                      onChange={(event) => setPersonalStyle(event.target.value)}
                      options={personalStyles}
                    />

                    <Input
                      id="personalNote"
                      label="İsteğe bağlı kısa not"
                      type="text"
                      value={personalNote}
                      onChange={(event) => setPersonalNote(event.target.value)}
                      placeholder="Örneğin: Çok iddialı olmasın, kısa ve doğal dursun"
                    />
                  </div>

                  <div className="block text-sm font-semibold text-zinc-200">
                    Fotoğraf yükle
                    <label className="mt-2 flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15 bg-zinc-950 text-center text-sm text-zinc-500 transition hover:border-emerald-300/50 hover:bg-white/[0.03]" htmlFor="photoUpload">
                      <input
                        ref={photoInputRef}
                        id="photoUpload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        className="sr-only"
                      />
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.dataUrl} alt="Fotoğraf önizleme" className="h-64 w-full object-cover" />
                      ) : (
                        <span className="px-6 leading-6">
                          JPG, PNG veya WEBP seç. En fazla 8 MB. Görsel tarayıcıda küçültülüp üretim isteğine geçici olarak eklenir.
                        </span>
                      )}
                    </label>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        {imageProcessing && <p className="text-xs font-semibold text-emerald-300">Görsel işleniyor...</p>}
                        {photoFileName && !imageProcessing && (
                          <p className="truncate text-xs text-zinc-500">
                            {photoFileName}
                            {photo ? ` · ${photo.width}x${photo.height}px olarak hazırlandı` : ""}
                          </p>
                        )}
                        {photoError && <p className="text-xs font-semibold text-red-300">{photoError}</p>}
                      </div>

                      {photo && (
                        <Button type="button" variant="secondary" onClick={removePhoto} className="px-3 py-2 text-xs">
                          Fotoğrafı kaldır
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {mode === "creator" && (
                <div className="grid gap-5">
                  <label className="block text-sm font-semibold text-zinc-200" htmlFor="creatorTopic">
                    Konu
                    <textarea
                      id="creatorTopic"
                      value={creatorTopic}
                      onChange={(event) => setCreatorTopic(event.target.value)}
                      placeholder="İçeriğin ne hakkında olacağını yaz."
                      rows={4}
                      className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                    />
                  </label>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <Select
                      id="contentType"
                      label="İçerik türü"
                      value={contentType}
                      onChange={(event) => setContentType(event.target.value)}
                      options={contentTypes}
                    />
                    <Input
                      id="creatorAudience"
                      label="Hedef kitle"
                      type="text"
                      value={creatorAudience}
                      onChange={(event) => setCreatorAudience(event.target.value)}
                      placeholder="Örneğin: Yeni başlayan içerik üreticileri"
                    />
                    <Select
                      id="videoDuration"
                      label="Video süresi"
                      value={videoDuration}
                      onChange={(event) => setVideoDuration(event.target.value)}
                      options={videoDurations}
                    />
                    <Select
                      id="creatorTone"
                      label="İçerik tonu"
                      value={creatorTone}
                      onChange={(event) => setCreatorTone(event.target.value)}
                      options={creatorTones}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-black text-zinc-100">Hangi içerikler oluşturulsun?</h2>
                    <p className="mt-1 text-sm text-zinc-500">{platforms.length} bölüm seçili</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPlatforms([...allPlatformKeys])}
                      className="px-3 py-2 text-xs"
                    >
                      Tümünü Seç
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPlatforms([])}
                      className="px-3 py-2 text-xs"
                    >
                      Tümünü Kaldır
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {outputSections.map((section) => {
                    const checked = platforms.includes(section.key);

                    return (
                      <label
                        key={section.key}
                        className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          checked
                            ? "border-emerald-400/40 bg-emerald-400/10 text-zinc-100" :"border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/5"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlatform(section.key)}
                          className="h-4 w-4 shrink-0 accent-emerald-400"
                        />
                        <span className="font-semibold">{section.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  disabled={loading || imageProcessing || !requiredFieldFilled}
                  className="w-full py-4 text-base font-black sm:w-auto sm:min-w-80"
                >
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />}
                  {loading ? "İçerikler hazırlanıyor" : "Her Şeyi Oluştur"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => copyText("all")}
                  disabled={!result || selectedOutputSections.length === 0}
                  className="w-full py-4 sm:w-auto"
                >
                  {copiedKey === "all" ? "Kopyalandı" : "Tümünü kopyala"}
                </Button>

                {result && (
                  <Link href="/publish" className="w-full sm:w-auto">
                    <Button type="button" variant="secondary" className="w-full py-4 sm:w-auto">
                      Paylaşım Merkezine Git
                    </Button>
                  </Link>
                )}
              </div>

              {loading && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-emerald-200">{loadingStep}</span>
                    <span className="text-zinc-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </form>
          </Card>
        </section>

        <section className="pb-10">
          {!result && !loading ? (
            <Card className="p-6 text-center">
              <h2 className="text-xl font-black">İçerikler burada görünecek</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                Formu doldurup büyük butona bastığında seçtiğin bölümler otomatik hazırlanır.
              </p>
            </Card>
          ) : selectedOutputSections.length === 0 ? (
            <Card className="p-6 text-center">
              <h2 className="text-xl font-black">Gösterilecek bölüm seçilmedi</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                Sonuç kartlarını görmek için yukarıdan en az bir bölüm seç.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selectedOutputSections.map((section) => (
                <Card key={section.key} className="flex min-h-72 flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black">{section.title}</h2>
                      <p className="mt-1 text-sm text-zinc-500">{section.helper}</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => copyText(section.key)}
                      disabled={!result}
                      className="shrink-0 px-3 py-2 text-xs"
                    >
                      {copiedKey === section.key ? "Kopyalandı" : "Kopyala"}
                    </Button>
                  </div>

                  <div className="mt-4 min-h-44 flex-1 rounded-lg bg-zinc-950/80 p-4 text-sm leading-6 text-zinc-300">
                    {loading ? (
                      <div className="space-y-3">
                        <div className="h-3 w-11/12 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-9/12 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-10/12 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-7/12 animate-pulse rounded bg-white/10" />
                      </div>
                    ) : (
                      <div
                        className="markdown-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(sectionText(sections, section.key)) }}
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
