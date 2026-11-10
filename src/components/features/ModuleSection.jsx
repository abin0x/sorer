import React from "react";
import FeatureCard from "./FeatureCard";

export default function ModuleSection({ module }) {
  const Icon = module.icon;
  return (
    <section id={module.key} className="space-y-6 pt-2">
      <div className={`flex items-center gap-4 pb-4 border-b ${module.border}`}>
        <div className={`p-3 rounded-xl ${module.iconBg}`}>
          <Icon className={`w-7 h-7 ${module.iconText}`} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{module.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{module.tagline}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {module.features.map((feature, idx) => (
          <FeatureCard key={idx} feature={feature} iconBg={module.iconBg} iconText={module.iconText} />
        ))}
      </div>
    </section>
  );
}