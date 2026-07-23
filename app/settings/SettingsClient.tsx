"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { ProfileSettings } from "@/lib/content-store";

type SettingsClientProps = {
  profile: ProfileSettings | null;
};

export function SettingsClient({ profile }: SettingsClientProps) {
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    brand_name: profile?.brand_name ?? "",
    brand_colors: profile?.brand_colors ?? "",
    target_audience: profile?.target_audience ?? "",
    default_language: profile?.default_language ?? "Türkçe",
    writing_style: profile?.writing_style ?? "Profesyonel",
  });
  const [saved, setSaved] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function saveSettings() {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaved(response.ok);
  }

  return (
    <Card className="p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Input label="Name" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        <Input label="Brand Name" value={form.brand_name} onChange={(event) => updateField("brand_name", event.target.value)} />
        <Input label="Brand Colors" value={form.brand_colors} placeholder="#10b981, #09090b" onChange={(event) => updateField("brand_colors", event.target.value)} />
        <Input label="Target Audience" value={form.target_audience} onChange={(event) => updateField("target_audience", event.target.value)} />
        <Input label="Default Language" value={form.default_language} onChange={(event) => updateField("default_language", event.target.value)} />
        <Input label="Writing Style" value={form.writing_style} onChange={(event) => updateField("writing_style", event.target.value)} />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button type="button" onClick={saveSettings}>Kaydet</Button>
        {saved && <p className="text-sm text-emerald-300">Ayarlar kaydedildi.</p>}
      </div>
    </Card>
  );
}
