import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ImagePlus, X } from "lucide-react";

export default function MediaPicker({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Social networks must fetch the image from a URL, so it is stored publicly
    const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
    onChange([...value, file_url]);
    setUploading(false);
    e.target.value = "";
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5" aria-label="Remove image"><X className="w-3 h-3" /></button>
          </div>
        ))}
        <label className="w-20 h-20 rounded-lg border border-dashed flex items-center justify-center cursor-pointer hover:bg-muted">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">Uploaded images are stored publicly so social networks can fetch them.</p>
    </div>
  );
}