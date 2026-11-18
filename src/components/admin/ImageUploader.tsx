"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCloudUploadAlt, FaStar, FaTrashAlt } from "react-icons/fa";
import { uploadImage } from "@/app/admin/actions";

/**
 * Uploads images one by one to /media and keeps the ordered list of URLs in a hidden input.
 * multiple=false keeps a single image (category banner, hero photo).
 */
export default function ImageUploader({
  name,
  initial,
  multiple = true,
  hint,
  onChange,
}: {
  name: string;
  initial: string[];
  multiple?: boolean;
  hint?: string;
  /** notified whenever the image list changes (e.g. for a live preview) */
  onChange?: (urls: string[]) => void;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const notify = useRef(onChange);
  useEffect(() => {
    notify.current = onChange;
  });
  useEffect(() => {
    notify.current?.(urls);
  }, [urls]);

  async function upload(files: FileList | File[]) {
    setError("");
    const list = Array.from(files).slice(0, multiple ? 10 : 1);
    setBusy(list.length);
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImage(fd);
      if (res.url) setUrls((u) => (multiple ? [...u, res.url!] : [res.url!]));
      else setError(res.error ?? "ატვირთვა ვერ მოხერხდა");
      setBusy((b) => b - 1);
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setUrls((u) => {
      const next = [...u];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  return (
    <div className="adm-uploader">
      <input type="hidden" name={name} value={multiple ? JSON.stringify(urls) : (urls[0] ?? "")} />

      {urls.length > 0 && (
        <ul className={`adm-thumbs${multiple ? "" : " single"}`}>
          {urls.map((u, i) => (
            <li key={u + i}>
              <img src={u} alt="" />
              {multiple && i === 0 && (
                <span className="main-badge">
                  <FaStar /> მთავარი
                </span>
              )}
              <div className="thumb-actions">
                {multiple && (
                  <>
                    <button type="button" aria-label="მარცხნივ" disabled={i === 0} onClick={() => move(i, -1)}>
                      <FaArrowLeft />
                    </button>
                    <button type="button" aria-label="მარჯვნივ" disabled={i === urls.length - 1} onClick={() => move(i, 1)}>
                      <FaArrowRight />
                    </button>
                  </>
                )}
                <button type="button" aria-label="წაშლა" onClick={() => setUrls((x) => x.filter((_, k) => k !== i))}>
                  <FaTrashAlt />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(multiple || urls.length === 0) && (
        <button
          type="button"
          className={`adm-drop${drag ? " drag" : ""}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
          }}
        >
          <FaCloudUploadAlt className="drop-ico" />
          <strong>{busy > 0 ? `იტვირთება (${busy})...` : "ჩააგდეთ ფოტო ან აირჩიეთ"}</strong>
          <span>{hint ?? "JPG, PNG, WEBP, მაქს. 8 MB"}</span>
        </button>
      )}
      {!multiple && urls.length > 0 && (
        <button type="button" className="adm-btn ghost sm" onClick={() => input.current?.click()}>
          ფოტოს შეცვლა
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple={multiple}
        hidden
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="adm-field-error">{error}</p>}
    </div>
  );
}
