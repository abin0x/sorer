import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Loader2 } from "lucide-react";

/** Renders a message attachment (photo, video, or document) from its private file URI. */
export default function MessageAttachment({ uri, kind = "file", name }) {
  const [signedUrl, setSignedUrl] = useState("");

  useEffect(() => {
    if (!uri) return;
    let active = true;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri })
      .then((r) => { if (active) setSignedUrl(r.signed_url); })
      .catch(() => {});
    return () => { active = false; };
  }, [uri]);

  const loading = (
    <div className="mt-2 h-28 w-52 rounded-xl bg-muted flex items-center justify-center">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  );

  if (kind === "image") {
    return (
      <div className="mt-2 rounded-xl overflow-hidden bg-muted max-w-sm">
        {signedUrl ? <img src={signedUrl} alt={name || ""} className="w-full max-h-80 object-cover" /> : loading}
      </div>
    );
  }

  if (kind === "audio") {
    return signedUrl ? <audio src={signedUrl} controls className="mt-2 w-full max-w-xs" /> : loading;
  }

  if (kind === "video") {
    return signedUrl ? (
      <video src={signedUrl} controls className="mt-2 rounded-xl w-full max-w-sm max-h-80 bg-black" />
    ) : loading;
  }

  return (
    <a
      href={signedUrl || undefined}
      target="_blank"
      rel="noreferrer"
      className={`mt-2 inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs font-medium ${signedUrl ? "hover:bg-muted" : "pointer-events-none opacity-60"}`}
    >
      <FileText className="w-4 h-4 shrink-0" />
      <span className="truncate max-w-[190px]">{name || "Attachment"}</span>
      <Download className="w-3.5 h-3.5 shrink-0" />
    </a>
  );
}