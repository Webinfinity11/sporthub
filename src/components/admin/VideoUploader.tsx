"use client";

import { useRef, useState } from "react";
import { FaTrashAlt, FaVideo } from "react-icons/fa";
import { createVideoUpload } from "@/app/admin/actions";

/**
 * One optional video, uploaded from the browser straight to R2 (signed URL from the server).
 * The URL is kept in a hidden input; it is saved with the form.
 */
export default function VideoUploader({
  name,
  initial,
  onChange,
}: {
  name: string;
  initial: string;
  onChange?: (url: string) => void;
}) {
  const [url, setUrlState] = useState(initial);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const setUrl = (u: string) => {
    setUrlState(u);
    onChange?.(u);
  };

  async function upload(file: File) {
    setError("");
    const res = await createVideoUpload(file.type, file.size);
    if (!res.uploadUrl || !res.url) return setError(res.error ?? "ატვირთვა ვერ მოხერხდა");
    setProgress(0);
    const ok = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", res.uploadUrl!);
      for (const [k, v] of Object.entries(res.headers ?? {})) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.send(file);
    });
    setProgress(null);
    if (ok) setUrl(res.url);
    else setError("ატვირთვა ვერ მოხერხდა, შეამოწმეთ ინტერნეტი და სცადეთ თავიდან");
  }

  const pick = (files: FileList | null | undefined) => {
    const f = files?.[0];
    if (f) upload(f);
  };

  return (
    <div className="adm-uploader">
      <input type="hidden" name={name} value={url} />

      {url && (
        <ul className="adm-thumbs single">
          <li>
            <video src={url} muted loop autoPlay playsInline />
            <div className="thumb-actions">
              <button type="button" aria-label="ვიდეოს მოხსნა" onClick={() => setUrl("")}>
                <FaTrashAlt />
              </button>
            </div>
          </li>
        </ul>
      )}

      {!url && (
        <button
          type="button"
          className={`adm-drop${drag ? " drag" : ""}`}
          disabled={progress !== null}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files);
          }}
        >
          <FaVideo className="drop-ico" />
          <strong>{progress !== null ? `იტვირთება ${progress}%` : "ჩააგდეთ ვიდეო ან აირჩიეთ"}</strong>
          <span>MP4 ან WebM, მაქს. 50 MB. სასურველია 10 MB-მდე და 10-20 წამი</span>
        </button>
      )}
      {url && progress === null && (
        <button type="button" className="adm-btn ghost sm" onClick={() => input.current?.click()}>
          ვიდეოს შეცვლა
        </button>
      )}
      {url && progress !== null && <p className="adm-hint">იტვირთება {progress}%</p>}

      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm"
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="adm-field-error">{error}</p>}
    </div>
  );
}
