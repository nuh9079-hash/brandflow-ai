"use client";

import { useEffect, useState } from "react";

export type BrandFlowBackground = "aurora" | "nebula" | "midnight" | "minimal" | "custom";

const STORAGE_KEY = "brandflow-background";
const CUSTOM_KEY = "brandflow-custom-background";

export function AnimatedBackground() {
  const [theme, setTheme] = useState<BrandFlowBackground>("aurora");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    const sync = () => {
      setTheme((localStorage.getItem(STORAGE_KEY) as BrandFlowBackground) || "aurora");
      setCustom(localStorage.getItem(CUSTOM_KEY) || "");
    };
    sync();
    window.addEventListener("brandflow-background-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("brandflow-background-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <div className={`bf-background bf-background--${theme}`} aria-hidden="true">
      {theme === "custom" && custom && <div className="bf-custom-bg" style={{ backgroundImage: `url(${custom})` }} />}
      <div className="bf-stars" />
      <div className="bf-planet bf-planet-one" />
      <div className="bf-planet bf-planet-two" />
      <div className="bf-aurora bf-aurora-one" />
      <div className="bf-aurora bf-aurora-two" />
      <div className="bf-vignette" />
    </div>
  );
}
