import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DocumentViewer({ fileUri, fileName }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["complianceDocUrl", fileUri],
    queryFn: async () => (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 })).signed_url,
    enabled: !!fileUri,
  });
  if (isLoading) return <div className="flex items-center justify-center h-full min-h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!url) return <p className="text-sm text-slate-500 p-4">No document available.</p>;
  const isPdf = /\.pdf$/i.test(fileName || fileUri);
  return isPdf
    ? <iframe src={url} title="Certificate" className="w-full h-full min-h-[420px] rounded-lg border" />
    : <img src={url} alt="Certificate" className="w-full max-h-[480px] object-contain rounded-lg border bg-slate-50" />;
}