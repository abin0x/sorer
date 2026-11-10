import React from "react";
import { Mail, Phone, MessageSquare, Smartphone } from "lucide-react";

// Reusable contact action icons: email, phone call, text (SMS), in-app message.
// Pass email/phone strings and an optional onMessage callback.
export default function ContactActions({ email, phone, onMessage, size = "sm", className = "" }) {
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const btn = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const base = `${btn} flex items-center justify-center rounded-lg transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10`;
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {email && (
        <a href={`mailto:${email}`} title="Email" className={base}>
          <Mail className={icon} />
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} title="Call" className={base}>
          <Phone className={icon} />
        </a>
      )}
      {phone && (
        <a href={`sms:${phone}`} title="Text" className={base}>
          <Smartphone className={icon} />
        </a>
      )}
      {onMessage && (
        <button type="button" onClick={onMessage} title="Message in app" className={base}>
          <MessageSquare className={icon} />
        </button>
      )}
    </div>
  );
}