import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileDown } from "lucide-react";

export default function ReportBuilder({ onGenerate }) {
  const [config, setConfig] = useState({
    dateRange: { start: "", end: "" },
    metrics: {
      programs: true,
      tasks: true,
      expenses: true,
      staffPay: true,
      completion: true,
      budget: true
    },
    filters: {
      branch: "all",
      season: "all",
      status: "all",
      priority: "all"
    }
  });

  const toggleMetric = (key) => {
    setConfig({
      ...config,
      metrics: { ...config.metrics, [key]: !config.metrics[key] }
    });
  };

  return (
    <Card className="dark:bg-slate-900 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg dark:text-white">Custom Report Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="dark:text-slate-300">Start Date</Label>
            <Input
              type="date"
              value={config.dateRange.start}
              onChange={(e) => setConfig({
                ...config,
                dateRange: { ...config.dateRange, start: e.target.value }
              })}
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
          <div>
            <Label className="dark:text-slate-300">End Date</Label>
            <Input
              type="date"
              value={config.dateRange.end}
              onChange={(e) => setConfig({
                ...config,
                dateRange: { ...config.dateRange, end: e.target.value }
              })}
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
        </div>

        <div>
          <Label className="mb-3 block dark:text-slate-300">Select Metrics</Label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(config.metrics).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={value}
                  onCheckedChange={() => toggleMetric(key)}
                />
                <label htmlFor={key} className="text-sm cursor-pointer capitalize dark:text-slate-300">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="dark:text-slate-300">Branch</Label>
            <Select
              value={config.filters.branch}
              onValueChange={(val) => setConfig({
                ...config,
                filters: { ...config.filters, branch: val }
              })}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="Dearborn">Dearborn</SelectItem>
                <SelectItem value="Downriver">Downriver</SelectItem>
                <SelectItem value="Northville">Northville</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="dark:text-slate-300">Status</Label>
            <Select
              value={config.filters.status}
              onValueChange={(val) => setConfig({
                ...config,
                filters: { ...config.filters, status: val }
              })}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onGenerate(config, 'pdf')}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            onClick={() => onGenerate(config, 'csv')}
            variant="outline"
            className="flex-1 dark:border-slate-700"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}