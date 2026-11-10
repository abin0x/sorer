import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

const PRIMARY = "hsl(157 47% 42%)";

const tourSteps = [
  { selector: "[data-tour='schedule']", title: "Schedules that sync themselves", body: "Every practice and game you add here syncs to parents' phones automatically — no group texts needed." },
  { selector: "[data-tour='comms']", title: "Message the right people", body: "Coaches can message just their team's parents, or the whole club — without sharing personal phone numbers." },
  { selector: "[data-tour='branches']", title: "One view, every branch", body: "See consolidated reports across all your branches in a single dashboard — no more switching between spreadsheets." },
  { selector: "[data-tour='payments']", title: "Payments, sorted", body: "Track registration fees, payment status, and sync it all to QuickBooks without manual data entry." },
];

export default function DemoTour({ onClose }) {
  const [step, setStep] = useState(0);
  const current = tourSteps[step];
  const isLast = step === tourSteps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl soft-shadow-lg p-8 max-w-md w-full text-center"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `${PRIMARY}12` }}>
            <span className="text-lg font-extrabold" style={{ color: PRIMARY }}>{step + 1}</span>
          </div>
          <h3 className="text-xl font-extrabold mb-2">{current.title}</h3>
          <p className="text-slate-600 mb-6">{current.body}</p>
          <div className="flex items-center justify-center gap-2 mb-6">
            {tourSteps.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all" style={{
                width: i === step ? 24 : 6,
                background: i === step ? PRIMARY : "hsl(220 14% 85%)",
              }} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 transition-colors min-h-[44px]">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            {isLast ? (
              <button onClick={onClose} className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 min-h-[44px]" style={{ background: PRIMARY }}>
                Got it, let me explore
              </button>
            ) : (
              <button onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 min-h-[44px]" style={{ background: PRIMARY }}>
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}