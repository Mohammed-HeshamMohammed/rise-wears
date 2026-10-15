"use client";

import { useEffect, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { api } from "@/lib/api";
import { DEFAULT_HERO, HERO_STYLES, type Hero } from "@/lib/hero";
import { Notice, Page, adminApi, useAdminData, useNotice } from "../util";

type View = "desktop" | "phone";
type ImageKey = "imageUrl" | "mobileImageUrl";

function Preview({ hero, view }: { hero: Hero; view: View }) {
  const img = view === "phone" ? hero.mobileImageUrl || hero.imageUrl : hero.imageUrl;
  return (
    <div className={`hp hp--${hero.style} ${view}`} style={{ "--dim": hero.dim / 100 } as CSSProperties}>
      <div className="hp-img" style={{ backgroundImage: `url("${img}")` }} />
      <div className="hp-shade" />
      <div className="hp-text">
        <b>{hero.title || "TITLE"}</b>
        {hero.slogan && <i>{hero.slogan}</i>}
        {hero.description && <p>{hero.description}</p>}
        <span>{hero.buttonText || "BUTTON"}</span>
      </div>
    </div>
  );
}

export default function HeroPage() {
  const { data, reload } = useAdminData<Hero>("/admin/hero");
  const { msg, run } = useNotice();
  const [f, setF] = useState<Hero>(DEFAULT_HERO);
  const [view, setView] = useState<View>("desktop");
  const [busy, setBusy] = useState<ImageKey | null>(null);

  useEffect(() => {
    if (data) setF(data);
  }, [data]);

  const text = (k: keyof Hero) => ({ value: String(f[k]), onChange: (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });

  async function upload(key: ImageKey, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(key);
    await run(async () => {
      const r = await api<{ url: string }>("/admin/uploads", { admin: true, raw: { data: file, type: file.type || "image/jpeg" } });
      setF((cur) => ({ ...cur, [key]: r.url }));
    }, "Photo added. Press Save hero to put it on the site.");
    setBusy(null);
  }

  const save = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      await adminApi.put("/admin/hero", f);
      await reload();
    }, "Saved. The home page shows it within a minute.");
  };

  const reset = () => {
    if (!confirm("Go back to the original hero (RISE, full-screen photo)?")) return;
    return run(async () => {
      await adminApi.del("/admin/hero");
      await reload();
    }, "Restored the original hero.");
  };

  const picker = (key: ImageKey, label: string, hint: string) => (
    <div className="f">
      <label>{label}</label>
      <div className="img-pick">
        <div className="img-thumb" style={{ backgroundImage: f[key] ? `url("${f[key]}")` : undefined }} aria-hidden="true" />
        <div>
          <label className="btn-a ghost sm file-btn">
            {busy === key ? "Uploading…" : "Choose a photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr" onChange={(e) => upload(key, e.target.files)} />
          </label>
          {key === "mobileImageUrl" && f.mobileImageUrl && (
            <button type="button" className="btn-a ghost sm" style={{ marginLeft: 8 }} onClick={() => setF({ ...f, mobileImageUrl: "" })}>Use the main photo</button>
          )}
          <small style={{ display: "block", marginTop: 6 }}>{hint}</small>
        </div>
      </div>
    </div>
  );

  return (
    <Page title="Home page hero" sub="The big banner at the top of the home page. Pick a style, change the words and the photo, and check the preview before saving.">
      <Notice msg={msg} />
      <form onSubmit={save}>
        <section className="card">
          <h2>Style</h2>
          <div className="hero-styles" role="radiogroup" aria-label="Hero style">
            {HERO_STYLES.map((s) => (
              <button type="button" key={s.id} role="radio" aria-checked={f.style === s.id} className={`hero-style${f.style === s.id ? " on" : ""}`} onClick={() => setF({ ...f, style: s.id })}>
                <Preview hero={{ ...f, style: s.id }} view="desktop" />
                <b>{s.name}</b>
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="row c2" style={{ alignItems: "start" }}>
          <section className="card">
            <h2>Words</h2>
            <div className="f"><label>Title</label><input type="text" required maxLength={40} {...text("title")} /></div>
            <div className="f"><label>Slogan</label><input type="text" maxLength={60} {...text("slogan")} placeholder="Small line under the title" /></div>
            <div className="f"><label>Description</label><input type="text" maxLength={200} {...text("description")} /></div>
            <div className="row c2">
              <div className="f"><label>Button text</label><input type="text" required maxLength={30} {...text("buttonText")} /></div>
              <div className="f"><label>Button goes to</label><input type="text" required {...text("buttonLink")} placeholder="/shop" /></div>
            </div>
            <h2 style={{ marginTop: 8 }}>Photo</h2>
            {picker("imageUrl", "Main photo (computer)", "Wide photo, at least 1600 px across. JPG, PNG or WebP, up to 6 MB.")}
            {picker("mobileImageUrl", "Phone photo (optional)", "Tall photo, for example 1080 × 1920. Leave empty to use the main photo.")}
            {f.style !== "split" && (
              <div className="f">
                <label htmlFor="dim">Darkening: {f.dim}%</label>
                <input id="dim" type="range" min={0} max={80} step={5} value={f.dim} onChange={(e) => setF({ ...f, dim: Number(e.target.value) })} style={{ width: "100%" }} />
                <small>Makes the white text easier to read on bright photos.</small>
              </div>
            )}
          </section>

          <section className="card sticky">
            <div className="card-head">
              <h2>Preview</h2>
              <div className="seg" role="group" aria-label="Preview size">
                <button type="button" aria-pressed={view === "desktop"} onClick={() => setView("desktop")}>Computer</button>
                <button type="button" aria-pressed={view === "phone"} onClick={() => setView("phone")}>Phone</button>
              </div>
            </div>
            <Preview hero={f} view={view} />
          </section>
        </div>

        <div className="flex">
          <button className="btn-a">Save hero</button>
          <button type="button" className="btn-a ghost" onClick={reset}>Restore original</button>
        </div>
      </form>
    </Page>
  );
}
