import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdisalPageHeader, AdisalCard, SectionLabel } from "@/components/adisal/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Clock, Users, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TestDiagram from "@/components/player/TestDiagrams";

export default function SkillTests() {
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("basic");
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [logScore, setLogScore] = useState("");
  const [logging, setLogging] = useState(false);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["skill-tests"],
    queryFn: () => base44.entities.SkillTest.list("order", 100),
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["skill-test-scores"],
    queryFn: () => base44.entities.SkillTestScore.list("-test_date", 500),
  });

  const byCategory = useMemo(() => ({
    basic: tests.filter((t) => t.category === "basic"),
    advanced: tests.filter((t) => t.category === "advanced"),
  }), [tests]);

  const visibleTests = byCategory[activeCategory] || [];
  const selectedTest = tests.find((t) => t.id === selectedTestId) || visibleTests[0];

  const testScores = useMemo(() => {
    if (!selectedTest) return [];
    return scores.filter((s) => s.test_id === selectedTest.id).sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
  }, [scores, selectedTest]);

  const handleLogScore = async () => {
    if (!selectedTest || !logScore) return;
    setLogging(true);
    try {
      await base44.entities.SkillTestScore.create({
        test_id: selectedTest.id,
        test_title: selectedTest.title,
        score: parseFloat(logScore),
        test_date: new Date().toISOString().split("T")[0],
      });
      toast.success("Score logged!");
      setLogScore("");
      qc.invalidateQueries({ queryKey: ["skill-test-scores"] });
    } catch (e) {
      toast.error("Failed to log score");
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <AdisalPageHeader
        breadcrumb="Coaches > Skill Measurable"
        title="SKILL TESTS"
        subtitle="Technical tests with diagrams and scoring. Log your tests and track your progress over time."
      />

      {/* Category sections */}
      <div className="mb-6">
        <SectionLabel>Basic</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {byCategory.basic.map((t) => (
            <CategoryCard key={t.id} test={t} active={selectedTestId === t.id} onClick={() => setSelectedTestId(t.id)} />
          ))}
          {byCategory.basic.length === 0 && !isLoading && <EmptyCategory />}
        </div>
        <SectionLabel>Advanced</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {byCategory.advanced.map((t) => (
            <CategoryCard key={t.id} test={t} active={selectedTestId === t.id} onClick={() => setSelectedTestId(t.id)} />
          ))}
          {byCategory.advanced.length === 0 && !isLoading && <EmptyCategory />}
        </div>
      </div>

      {/* Detail panel */}
      {selectedTest ? (
        <AdisalCard className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Description */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl font-bold text-foreground">{selectedTest.title}</h2>
                {selectedTest.duration_minutes && (
                  <Badge className="bg-primary/15 text-primary">{selectedTest.duration_minutes} MIN</Badge>
                )}
              </div>
              {selectedTest.description && <p className="text-sm text-muted-foreground mb-4">{selectedTest.description}</p>}
              {selectedTest.setup && (
                <div className="mb-4">
                  <SectionLabel>Setup</SectionLabel>
                  <p className="text-sm text-foreground whitespace-pre-line">{selectedTest.setup}</p>
                </div>
              )}
              {selectedTest.how_to_perform && (
                <div className="mb-4">
                  <SectionLabel>How to Perform</SectionLabel>
                  <p className="text-sm text-foreground whitespace-pre-line">{selectedTest.how_to_perform}</p>
                </div>
              )}
              {selectedTest.scoring && (
                <div className="mb-4">
                  <SectionLabel>Scoring</SectionLabel>
                  <p className="text-sm text-foreground whitespace-pre-line">{selectedTest.scoring}</p>
                </div>
              )}
              {/* Log score */}
              <div className="pt-4 border-t border-border">
                <SectionLabel>Log Your Score</SectionLabel>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Enter score..." value={logScore} onChange={(e) => setLogScore(e.target.value)} className="flex-1" />
                  <Button onClick={handleLogScore} disabled={logging || !logScore} className="bg-primary hover:bg-primary/90">
                    <Award className="w-3.5 h-3.5 mr-1.5" /> Log Score
                  </Button>
                </div>
                {testScores.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">No previous scores for this test.</p>
                ) : (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Previous scores:</p>
                    {testScores.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{s.test_date} — {s.player_name || "—"}</span>
                        <span className="font-bold text-foreground">{s.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Diagram */}
            <div>
              <SectionLabel>Diagram</SectionLabel>
              <div className="aspect-square bg-secondary/30 border border-border rounded-lg flex items-center justify-center p-8">
                <TestDiagram testTitle={selectedTest.title} />
              </div>
              {selectedTest.diagram_notes && (
                <p className="text-xs text-muted-foreground mt-2">{selectedTest.diagram_notes}</p>
              )}
            </div>
          </div>
        </AdisalCard>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          {isLoading ? "Loading..." : "Select a test to view details"}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ test, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 text-left border rounded-lg transition-all text-sm",
        active ? "border-primary border-2 bg-primary/5" : "border-border hover:border-primary/40"
      )}
    >
      <div className="font-bold text-foreground text-xs uppercase tracking-wide">{test.title}</div>
      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
        {test.duration_minutes && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{test.duration_minutes}min</span>}
        {test.player_count && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{test.player_count}p</span>}
      </div>
    </button>
  );
}

function EmptyCategory() {
  return <div className="text-xs text-muted-foreground col-span-4 text-center py-4">No tests in this category yet.</div>;
}