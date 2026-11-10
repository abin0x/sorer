import React from "react";
import { PLATFORMS } from "@/lib/marketing/constants";

export default function PostPreview({ platform, body, hashtags = [], media = [], clubName, logoUrl }) {
  const tags = hashtags.map((h) => `#${h}`).join(" ");
  const isX = platform === "x";
  return (
    <div className="rounded-xl border bg-white overflow-hidden max-w-sm mx-auto text-sm">
      <div className="flex items-center gap-2 p-3">
        {logoUrl ? <img src={logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-primary/20" />}
        <div className="min-w-0">
          <p className="font-semibold truncate leading-tight">{clubName}</p>
          <p className="text-[11px] text-muted-foreground">{PLATFORMS[platform]?.label} preview</p>
        </div>
      </div>
      {platform === "instagram" && media[0] && <img src={media[0]} alt="" className="w-full aspect-square object-cover" />}
      <div className="px-3 pb-3 pt-1 whitespace-pre-wrap break-words">
        {body || <span className="text-muted-foreground">Your post will appear here…</span>}
        {tags && <p className="text-blue-600 mt-1">{tags}</p>}
      </div>
      {platform !== "instagram" && media[0] && <img src={media[0]} alt="" className={`w-full object-cover ${isX ? "aspect-video" : "aspect-[4/3]"}`} />}
    </div>
  );
}