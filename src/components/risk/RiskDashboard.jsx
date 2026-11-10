import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, AlertCircle, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

export default function RiskDashboard({ risks, summary }) {
  if (!risks || risks.length === 0) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="pt-6">
          <p className="text-center text-slate-600 dark:text-slate-400">No risks identified - All systems go!</p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';
      case 'high':
        return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100';
      default:
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100';
    }
  };

  const getSeverityIcon = (severity) => {
    return severity === 'critical' ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />;
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-yellow-500 text-white';
    }
  };

  const groupedRisks = {
    critical: risks.filter(r => r.severity === 'critical'),
    high: risks.filter(r => r.severity === 'high'),
    medium: risks.filter(r => r.severity === 'medium')
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">Critical</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">{summary.critical}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300">High</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{summary.high}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Medium</p>
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{summary.medium}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300">Total</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{summary.totalRisks}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-slate-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risks by Severity */}
      <Tabs defaultValue="critical" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 dark:bg-slate-800">
          <TabsTrigger value="critical">Critical ({summary.critical})</TabsTrigger>
          <TabsTrigger value="high">High ({summary.high})</TabsTrigger>
          <TabsTrigger value="medium">Medium ({summary.medium})</TabsTrigger>
        </TabsList>

        {['critical', 'high', 'medium'].map(severity => (
          <TabsContent key={severity} value={severity}>
            <div className="space-y-3">
              {groupedRisks[severity].map((risk, idx) => (
                <motion.div
                  key={risk.programId + risk.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Alert className={`border-2 ${getSeverityColor(risk.severity)}`}>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {getSeverityIcon(risk.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold">{risk.title}</h4>
                            <p className="text-sm opacity-90">{risk.programTitle}</p>
                          </div>
                          <Badge className={getSeverityBadgeColor(risk.severity)}>
                            {risk.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <AlertDescription className="mb-3">
                          {risk.description}
                        </AlertDescription>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="opacity-75">Impact</p>
                            <p className="font-semibold">{risk.impact}</p>
                          </div>
                          <div>
                            <p className="opacity-75">Recommendation</p>
                            <p className="font-semibold">{risk.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Alert>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}