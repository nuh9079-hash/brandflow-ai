"use client";

import { useState } from "react";
import styles from "./LandingPage.module.css";

export default function LandingBrief() {
  const [error, setError] = useState("");
  function begin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const brief = String(new FormData(event.currentTarget).get("brief") || "").trim();
    if (!brief) return;
    try {
      sessionStorage.setItem("brandflow-welcome-brief-v1", brief);
      window.location.assign("/create");
    } catch {
      setError("Fikrin aktarılamadı. Tarayıcı depolamasına izin verip tekrar dene.");
    }
  }
  return <><form onSubmit={begin} className={styles.brief}><label htmlFor="welcome-brief" className={styles.srOnly}>Markan için ne hazırlayalım?</label><input id="welcome-brief" name="brief" required maxLength={3000} placeholder="Bugün markan için ne hazırlıyoruz?" /><button aria-label="Fikrimi içerik stüdyosuna taşı" type="submit">→</button></form>{error && <p role="alert" className={styles.formError}>{error}</p>}</>;
}
