"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { ProfileTypeSelector } from "@/components/profiles/ProfileTypeSelector";
import {
  createEmptyProfileInput,
  defaultProfilePlatforms,
  profilePlatformLabels,
  type ProfileInput,
  type ProfilePlatform,
  type ProfileType,
  type UserProfile,
} from "@/lib/profiles/types";

type ProfileFormProps = {
  initialProfile?: UserProfile | ProfileInput | null;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (input: ProfileInput) => Promise<void> | void;
};

const tones = ["Samimi", "Profesyonel", "Eğlenceli", "Lüks", "Cesur", "Minimal"];
const personalStyles = ["Komik", "Samimi", "Havalı", "Duygusal", "Doğal"];
const creatorTones = ["Enerjik", "Bilgilendirici", "Samimi", "Komik", "Havalı", "Duygusal"];
const videoDurations = ["15 saniye", "30 saniye", "45 saniye", "60 saniye"];

function initialValue(profile?: UserProfile | ProfileInput | null): ProfileInput {
  if (!profile) return createEmptyProfileInput();

  return {
    ...createEmptyProfileInput(profile.profile_type),
    ...profile,
    is_default: profile.is_default ?? false,
  };
}

function csvValue(values: string[]) {
  return values.join(", ");
}

function csvArray(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function selectedPlatforms(input: ProfileInput) {
  if (input.profile_type === "personal") return input.personal_platforms;
  if (input.profile_type === "creator") return input.creator_platforms;
  return input.default_platforms;
}

export function ProfileForm({ initialProfile, submitLabel, onCancel, onSubmit }: ProfileFormProps) {
  const [input, setInput] = useState<ProfileInput>(() => initialValue(initialProfile));
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function setType(type: ProfileType) {
    setInput((current) => ({
      ...createEmptyProfileInput(type),
      profile_name: current.profile_name || createEmptyProfileInput(type).profile_name,
      profile_type: type,
      is_default: current.is_default,
    }));
  }

  function togglePlatform(platform: ProfilePlatform) {
    const key =
      input.profile_type === "personal" ?"personal_platforms"
        : input.profile_type === "creator" ?"creator_platforms" :"default_platforms";
    const values = input[key];
    const nextValues = values.includes(platform)
      ? values.filter((entry) => entry !== platform)
      : [...values, platform];

    update(key, nextValues);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await onSubmit(input);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <ProfileTypeSelector value={input.profile_type} onChange={setType} />

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          id="profile_name"
          label="Profil adı"
          value={input.profile_name}
          onChange={(event) => update("profile_name", event.target.value)}
          placeholder="Örneğin: Yaz kampanyası"
        />
        <label className="flex items-end gap-3 rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200">
          <input
            type="checkbox"
            checked={input.is_default}
            onChange={(event) => update("is_default", event.target.checked)}
            className="h-4 w-4 accent-emerald-400"
          />
          Varsayılan profil yap
        </label>
      </div>

      {input.profile_type === "business" && (
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              id="business_name"
              label="Marka adı"
              value={input.business_name ?? ""}
              onChange={(event) => update("business_name", event.target.value)}
              placeholder="Örneğin: BrandFlow Studio"
            />
            <Input
              id="product_or_service"
              label="Ürün / hizmet"
              value={input.product_or_service ?? ""}
              onChange={(event) => update("product_or_service", event.target.value)}
              placeholder="Örneğin: Sosyal medya içerik paketi"
            />
          </div>
          <label className="block text-sm font-semibold text-zinc-200" htmlFor="profile_description">
            Açıklama
            <textarea
              id="profile_description"
              value={input.description ?? ""}
              onChange={(event) => update("description", event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
              placeholder="Marka, ürün ve müşteriye faydayı kısaca yaz."
            />
          </label>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Select id="brand_tone" label="Marka tonu" value={input.brand_tone ?? "Samimi"} onChange={(event) => update("brand_tone", event.target.value)} options={tones} />
            <Input id="target_audience" label="Hedef kitle" value={input.target_audience ?? ""} onChange={(event) => update("target_audience", event.target.value)} />
            <Input id="price_range" label="Fiyat / teklif" value={input.price_range ?? ""} onChange={(event) => update("price_range", event.target.value)} />
            <Input id="campaign_info" label="Kampanya" value={input.campaign_info ?? ""} onChange={(event) => update("campaign_info", event.target.value)} />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Input id="competitor" label="Rakip" value={input.competitor ?? ""} onChange={(event) => update("competitor", event.target.value)} />
            <Input id="website" label="Website" value={input.website ?? ""} onChange={(event) => update("website", event.target.value)} />
            <Input id="brand_colors" label="Marka renkleri" value={input.brand_colors ?? ""} onChange={(event) => update("brand_colors", event.target.value)} placeholder="Örneğin: siyah, emerald" />
          </div>
        </div>
      )}

      {input.profile_type === "personal" && (
        <div className="grid gap-5 md:grid-cols-2">
          <Input id="display_name" label="Görünen ad" value={input.display_name ?? ""} onChange={(event) => update("display_name", event.target.value)} />
          <Select id="content_style" label="İçerik tarzı" value={input.content_style ?? "Doğal"} onChange={(event) => update("content_style", event.target.value)} options={personalStyles} />
          <Input id="personal_mood" label="Genel ruh hali" value={input.personal_mood ?? ""} onChange={(event) => update("personal_mood", event.target.value)} placeholder="Örneğin: rahat, eğlenceli" />
          <Input id="humor_level" label="Mizah seviyesi" value={input.humor_level ?? ""} onChange={(event) => update("humor_level", event.target.value)} placeholder="Az, orta, yüksek" />
          <Input id="photo_style" label="Fotoğraf tarzı" value={input.photo_style ?? ""} onChange={(event) => update("photo_style", event.target.value)} placeholder="Örneğin: doğal ışık, şehir" />
          <Input id="interests" label="İlgi alanları" value={csvValue(input.interests)} onChange={(event) => update("interests", csvArray(event.target.value))} placeholder="Seyahat, kahve, spor" />
          <label className="block text-sm font-semibold text-zinc-200 md:col-span-2" htmlFor="personal_notes">
            Kısa not
            <textarea
              id="personal_notes"
              value={input.personal_notes ?? ""}
              onChange={(event) => update("personal_notes", event.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
              placeholder="Örneğin: Fazla satış dili olmasın, doğal dursun."
            />
          </label>
        </div>
      )}

      {input.profile_type === "creator" && (
        <div className="grid gap-5 md:grid-cols-2">
          <Input id="creator_name" label="Kanal / üretici adı" value={input.creator_name ?? ""} onChange={(event) => update("creator_name", event.target.value)} />
          <Input id="main_topic" label="Ana konu" value={input.main_topic ?? ""} onChange={(event) => update("main_topic", event.target.value)} placeholder="Örneğin: Yapay zeka araçları" />
          <Input id="sub_topics" label="Alt konular" value={csvValue(input.sub_topics)} onChange={(event) => update("sub_topics", csvArray(event.target.value))} placeholder="Prompt, otomasyon, tasarım" />
          <Input id="creator_audience" label="Hedef kitle" value={input.creator_audience ?? ""} onChange={(event) => update("creator_audience", event.target.value)} />
          <Select id="video_duration" label="Video süresi" value={input.video_duration ?? "30 saniye"} onChange={(event) => update("video_duration", event.target.value)} options={videoDurations} />
          <Select id="creator_tone" label="İçerik tonu" value={input.creator_tone ?? "Enerjik"} onChange={(event) => update("creator_tone", event.target.value)} options={creatorTones} />
          <Input id="hook_style" label="Hook tarzı" value={input.hook_style ?? ""} onChange={(event) => update("hook_style", event.target.value)} placeholder="Örneğin: merak uyandıran" />
          <Input id="cta_style" label="CTA tarzı" value={input.cta_style ?? ""} onChange={(event) => update("cta_style", event.target.value)} placeholder="Örneğin: yoruma çağıran" />
          <Input id="thumbnail_style" label="Thumbnail tarzı" value={input.thumbnail_style ?? ""} onChange={(event) => update("thumbnail_style", event.target.value)} className="md:col-span-2" />
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
        <p className="text-sm font-black text-white">Varsayılan içerikler</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {defaultProfilePlatforms.map((platform) => (
            <label
              key={platform}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                selectedPlatforms(input).includes(platform)
                  ? "border-emerald-400/40 bg-emerald-400/10 text-zinc-100" :"border-white/10 bg-white/[0.03] text-zinc-400"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPlatforms(input).includes(platform)}
                onChange={() => togglePlatform(platform)}
                className="h-4 w-4 accent-emerald-400"
              />
              <span className="font-semibold">{profilePlatformLabels[platform]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input id="language" label="Dil" value={input.language ?? input.personal_language ?? input.creator_language ?? "Türkçe"} onChange={(event) => {
          update("language", event.target.value);
          update("personal_language", event.target.value);
          update("creator_language", event.target.value);
        }} />
        <Input id="required_words" label="Kullanılacak kelimeler" value={csvValue(input.required_words)} onChange={(event) => update("required_words", csvArray(event.target.value))} placeholder="Virgülle ayır" />
        <Input id="blocked_words" label="Kullanılmayacak kelimeler" value={csvValue(input.blocked_words)} onChange={(event) => update("blocked_words", csvArray(event.target.value))} placeholder="Virgülle ayır" />
        <Input id="blocked_topics" label="Kaçınılacak konular" value={csvValue(input.blocked_topics)} onChange={(event) => update("blocked_topics", csvArray(event.target.value))} placeholder="Virgülle ayır" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Kaydediliyor" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
