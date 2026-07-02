"use client";
import { useRef, useState } from "react";
import { FileUp } from "lucide-react";

export function ImportDropzone({
  onImport,
}: {
  onImport: (text: string) => number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState("");

  const handleFile = async (file: File) => {
    const text = await file.text();
    const n = onImport(text);
    setMsg(
      n > 0
        ? `${n} prospect(s) importé(s)`
        : "Aucune ligne reconnue — vérifie le CSV",
    );
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
        drag ? "border-primary bg-secondary" : "border-border bg-card"
      }`}
    >
      <div className="font-semibold inline-flex items-center gap-2">
        <FileUp className="size-4 text-primary" aria-hidden />
        Glisse ton CSV de prospects ici
      </div>
      <div className="text-muted-foreground text-sm mt-1">
        Export Apify / prospect-finder · ou clique pour choisir un fichier
      </div>
      {msg && <div className="text-primary text-sm mt-2">{msg}</div>}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
