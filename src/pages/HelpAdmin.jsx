import React, { useState } from 'react';
import { Link } from '@/lib/router-compat';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useViewer, isHelpAdmin } from '@/lib/help/helpApi';
import ArticleEditor from '@/components/help/admin/ArticleEditor';
import AdminArticleList from '@/components/help/admin/AdminArticleList';
import NeedsUpdateList from '@/components/help/admin/NeedsUpdateList';
import ZeroResultsList from '@/components/help/admin/ZeroResultsList';
import PageMapEditor from '@/components/help/admin/PageMapEditor';

export default function HelpAdmin() {
  const { data: user, isLoading } = useViewer();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null | {} (new) | article

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!isHelpAdmin(user)) {
    return <p className="text-center py-16 text-muted-foreground">Only the system owner can manage the Knowledge Base. <Link to="/help" className="text-primary underline">Back to Help</Link></p>;
  }

  const closeEditor = (changed) => {
    setEditing(null);
    if (changed) qc.invalidateQueries({ queryKey: ['kbAdminArticles'] });
    qc.invalidateQueries({ queryKey: ['kbNeedsUpdate'] });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Manage Knowledge Base</h1>
      {editing ? (
        <ArticleEditor key={editing.id || 'new'} article={editing.id ? editing : null} viewer={user} onClose={closeEditor} />
      ) : (
        <Tabs defaultValue="articles">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="needs">Needs update</TabsTrigger>
            <TabsTrigger value="zero">Zero-result searches</TabsTrigger>
            <TabsTrigger value="map">Page help</TabsTrigger>
          </TabsList>
          <TabsContent value="articles" className="mt-4"><AdminArticleList onEdit={setEditing} onNew={() => setEditing({})} /></TabsContent>
          <TabsContent value="needs" className="mt-4"><NeedsUpdateList onEdit={setEditing} /></TabsContent>
          <TabsContent value="zero" className="mt-4"><ZeroResultsList /></TabsContent>
          <TabsContent value="map" className="mt-4"><PageMapEditor /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}