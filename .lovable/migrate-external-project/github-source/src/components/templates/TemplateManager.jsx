import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Copy } from "lucide-react";
import TemplateDialog from "./TemplateDialog";
import { toast } from "sonner";

export default function TemplateManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => base44.entities.ProgramTemplate.list()
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgramTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: (template) => {
      const { id, created_date, updated_date, created_by, ...data } = template;
      return base44.entities.ProgramTemplate.create({
        ...data,
        name: `${data.name} (Copy)`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template duplicated");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Program Templates</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create reusable templates for common program types
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{template.name}</span>
                {!template.is_active && (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {template.description}
                </p>
              )}
              
              <div className="space-y-2 text-sm">
                {template.default_season && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{template.default_season}</Badge>
                  </div>
                )}
                {template.default_branches?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.default_branches.map((branch, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {branch}
                      </Badge>
                    ))}
                  </div>
                )}
                {template.predefined_tasks?.length > 0 && (
                  <p className="text-slate-600 dark:text-slate-400">
                    📋 {template.predefined_tasks.length} pre-defined tasks
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setDialogOpen(true);
                  }}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateTemplateMutation.mutate(template)}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete this template?")) {
                      deleteTemplateMutation.mutate(template.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Copy className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No templates yet. Create your first one!</p>
          </div>
        )}
      </div>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
      />
    </div>
  );
}