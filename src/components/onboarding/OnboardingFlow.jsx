import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, BookOpen, Zap, Target, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import OnboardingIcon from "@/components/onboarding/OnboardingIcon";

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState('welcome');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [currentTutorial, setCurrentTutorial] = useState(null);

  useEffect(() => {
    loadOnboardingContent();
  }, []);

  const loadOnboardingContent = async () => {
    try {
      setLoading(true);
      // MembershipGate has already resolved invitations before this tutorial opens.
      const response = await base44.functions.invoke('generateOnboardingContent');
      setContent(response.data);
      setStep('features');
    } catch (error) {
      console.error('Error loading onboarding:', error);
      toast.error('Failed to load onboarding content');
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = (index) => {
    const newCompleted = new Set(completedTasks);
    newCompleted.add(index);
    setCompletedTasks(newCompleted);
  };

  const handleSkip = () => {
    onComplete();
  };

  if (loading || !content) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-slate-600">Loading your personalized onboarding...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Welcome step
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
        <Card className="w-full max-w-lg dark:bg-slate-900 dark:border-slate-700">
          <CardHeader className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">🎉</span>
              </div>
            </div>
            <CardTitle className="text-2xl">{content.greeting}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600 dark:text-slate-400 text-center">{content.roleDescription}</p>

            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                We've created a personalized onboarding experience just for you based on your role!
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                Skip for now
              </Button>
              <Button
                onClick={() => setStep('features')}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Let's get started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Key features step
  if (step === 'features') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto overscroll-contain">
        <Card className="w-full max-w-2xl my-auto shrink-0 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Key Features for You</CardTitle>
              <CardDescription>Features most relevant to your role</CardDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close onboarding" onClick={handleSkip} className="shrink-0 text-muted-foreground">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.keyFeatures?.map((feature, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <OnboardingIcon icon={feature.icon} className="w-6 h-6 shrink-0 text-primary" />
                    <h4 className="min-w-0 break-words font-semibold text-foreground">{feature.name}</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('tasks')} className="flex-1">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quick start tasks step
  if (step === 'tasks') {
    const allComplete = completedTasks.size === content.quickStartTasks?.length;

    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto overscroll-contain">
        <Card className="w-full max-w-2xl my-auto shrink-0 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quick Start Tasks</CardTitle>
              <CardDescription>Get up and running in minutes</CardDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close onboarding" onClick={handleSkip} className="shrink-0 text-muted-foreground">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.quickStartTasks?.map((task, idx) => (
              <div
                key={idx}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  completedTasks.has(idx)
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                }`}
                onClick={() => handleTaskComplete(idx)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                      completedTasks.has(idx)
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {completedTasks.has(idx) && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{task.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{task.description}</p>
                  </div>
                  {task.actionUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={task.actionUrl} aria-label={`Open ${task.title}`}><ArrowRight className="w-4 h-4" /></a>
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('tips')} className="flex-1">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Optimization tips step
  if (step === 'tips') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto overscroll-contain">
        <Card className="w-full max-w-2xl my-auto shrink-0 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>AI-Driven Tips</CardTitle>
              <CardDescription>Optimize your workflow</CardDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close onboarding" onClick={handleSkip} className="shrink-0 text-muted-foreground">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.optimizationTips?.map((item, idx) => (
              <div key={idx} className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">{item.tip}</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">{item.reasoning}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('tutorials')} className="flex-1">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tutorials step
  if (step === 'tutorials') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto overscroll-contain">
        <Card className="w-full max-w-2xl my-auto shrink-0 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recommended Tutorials</CardTitle>
              <CardDescription>Interactive learning paths for your role</CardDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close onboarding" onClick={handleSkip} className="shrink-0 text-muted-foreground">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.tutorials?.map((tutorial, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentTutorial(idx)}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{tutorial.name}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{tutorial.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">⏱️ {tutorial.duration}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            ))}

            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-sm text-green-900 dark:text-green-100">
                You're all set! You can revisit these tutorials anytime from the help section.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                Maybe later
              </Button>
              <Button onClick={onComplete} className="flex-1 bg-primary hover:bg-primary/90">
                Start using Club Rudder! <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}