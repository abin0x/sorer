import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Save, Eye, Code, RotateCcw, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATE_LIST, mjmlToPreview } from "@/lib/generatedEmails";

export default function GeneratedEmailsTab() {
  const [templates, setTemplates] = useState([]);
  const [selectedName, setSelectedName] = useState(null);
  const [mode, setMode] = useState("preview");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await base44.functions.invoke("email-templates", { action: "list" });
      const data = res.data;
      if (data?.templates?.length > 0) {
        const fileMap = new Map(data.templates.map((t) => [t.name, t.content]));
        const merged = TEMPLATE_LIST.map((t) => ({
          ...t,
          content: fileMap.has(t.name) ? fileMap.get(t.name) : t.defaultContent,
        }));
        // Add any filesystem templates not in the embedded list
        for (const ft of data.templates) {
          if (!merged.find((m) => m.name === ft.name)) {
            merged.push({ name: ft.name, description: "", variables: [], content: ft.content, defaultContent: ft.content });
          }
        }
        setTemplates(merged);
      } else {
        setTemplates(TEMPLATE_LIST.map((t) => ({ ...t, content: t.defaultContent })));
      }
    } catch {
      setTemplates(TEMPLATE_LIST.map((t) => ({ ...t, content: t.defaultContent })));
    }
    setLoading(false);
  }

  const selected = templates.find((t) => t.name === selectedName) || templates[0];

  useEffect(() => {
    if (selected) {
      setEditContent(selected.content);
      setDirty(false);
    }
  }, [selectedName]);

  if (!selected) {
    return (
      <div className="flex items-center justify-center py-20">
        {loading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <p className="text-slate-500">No templates found.</p>}
      </div>
    );
  }

  const previewHtml = mjmlToPreview(dirty ? editContent : selected.content);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("email-templates", {
        action: "save",
        name: selected.name,
        content: editContent,
      });
      if (res.data?.success) {
        toast.success(res.data.method === "file" ? "Template overwritten" : "Saved as override");
        setTemplates((prev) => prev.map((t) => (t.name === selected.name ? { ...t, content: editContent } : t)));
        setDirty(false);
      } else {
        toast.error(res.data?.error || "Failed to save");
      }
    } catch (e) {
      toast.error("Failed to save template");
    }
    setSaving(false);
  }

  function handleReset() {
    setEditContent(selected.defaultContent);
    setDirty(true);
    toast.info("Reverted to default. Click Save to apply.");
  }

  function handleSelect(name) {
    if (dirty && !window.confirm("You have unsaved changes. Switch template anyway?")) return;
    setSelectedName(name);
    setMode("preview");
  }

  return (
    <div className="space-y-4">
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              These are the system-generated email templates used by automated workflows (compliance, reports, etc.).
              Edit the MJML source and save to overwrite the template. Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{variables}}"}</code> for dynamic data.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Template list */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm dark:text-white">Templates</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {templates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleSelect(t.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    (selected?.name === t.name)
                      ? "bg-primary/10 border border-primary/30 text-primary font-semibold"
                      : "border border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-sm truncate">{t.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor / Preview */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base dark:text-white">{selected.name}</CardTitle>
                {selected.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selected.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant={mode === "preview" ? "default" : "outline"} onClick={() => setMode("preview")}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                </Button>
                <Button size="sm" variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode("edit")}>
                  <Code className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              </div>
            </div>
            {selected.variables?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selected.variables.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">{`{{${v}}}`}</Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {mode === "preview" ? (
              <div className="rounded-lg border dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={previewHtml}
                  className="w-full h-[500px] border-0 bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
                  rows={24}
                  className="font-mono text-xs dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Edit MJML source..."
                />
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t dark:border-slate-700">
              <div className="flex items-center gap-2">
                {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} disabled={!selected.defaultContent}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset to Default
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save / Overwrite
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}