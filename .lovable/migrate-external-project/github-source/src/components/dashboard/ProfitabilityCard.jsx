import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfitabilityCard({ project }) {
  const isPositive = project.profit >= 0;
  const marginColor = project.profitMargin >= 20 ? 'text-green-600' : project.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-lg transition-shadow dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base line-clamp-2 dark:text-white">{project.title}</CardTitle>
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revenue</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">${(project.revenue / 1000).toFixed(1)}k</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cost</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">${(project.totalCost / 1000).toFixed(1)}k</p>
            </div>
          </div>

          <div className="p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 rounded-lg">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">Profit</p>
            <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              ${(project.profit / 1000).toFixed(1)}k
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Margin</p>
              <p className={`text-sm font-bold ${marginColor}`}>{project.profitMargin}%</p>
            </div>
            <Badge variant="outline" className="text-xs dark:text-slate-300">
              {project.totalHours}h
            </Badge>
          </div>

          {project.costPerHour && (
            <div className="text-xs text-slate-600 dark:text-slate-400 text-center pt-2 border-t dark:border-slate-700">
              ${project.costPerHour}/hr
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}