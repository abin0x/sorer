import React, { useState } from "react";
import { Link } from '@/lib/router-compat';
import { ArrowRight, Calendar } from "lucide-react";
import BookDemoDialog from "@/components/public/BookDemoDialog";

export default function FeaturesFinalCTA() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-14 md:py-20 text-center">
        <h2 className="pub-display text-2xl md:text-4xl mb-4">
          See it on your club's structure: your branches, your age groups.
        </h2>
        <p className="mb-8 opacity-90">
          Start a 30-day free trial with no credit card, or book a live walkthrough built around your club.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/create-club"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-extrabold bg-white text-slate-900 hover:bg-white/90 transition-colors"
          >
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-extrabold border-2 border-white text-white hover:bg-white/10 transition-colors"
          >
            <Calendar className="w-4 h-4" /> Book a demo
          </button>
        </div>
      </div>
      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}