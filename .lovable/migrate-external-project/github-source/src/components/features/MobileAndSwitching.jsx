import React from "react";
import { Link } from "react-router-dom";

export default function MobileAndSwitching() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-12 md:pb-16">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="pub-card p-6">
          <div className="pub-eye mb-2">Companion mobile app</div>
          <h2 className="text-xl md:text-2xl font-extrabold mb-3">Your whole club on every phone</h2>
          <p className="text-sm pub-muted">
            Families see one synced calendar for all their players, pay invoices, message coaches and get game-day alerts. Coaches and players get their own views.
          </p>
        </div>
        <div className="pub-card p-6">
          <div className="pub-eye mb-2">Switching</div>
          <h2 className="text-xl md:text-2xl font-extrabold mb-3">Free, human-verified migration</h2>
          <p className="text-sm pub-muted mb-4">
            Upload your export from TeamSnap, SportsEngine or a spreadsheet. A specialist checks every record before you go live, and we fix anything we miss at no cost.
          </p>
          <Link to="/#migration" className="text-sm font-bold text-primary underline">How migration works</Link>
        </div>
      </div>
    </section>
  );
}