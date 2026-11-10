import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

export default function OnboardStepCard({ icon: Icon, title, description, children, onSubmit, submitting, submitLabel = "Continue" }) {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-xl dark:bg-slate-900 dark:border-slate-700">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-3 shadow-sm">
            {Icon && <Icon className="w-6 h-6 text-white" />}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
          <Button onClick={onSubmit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}