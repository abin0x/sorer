import React from "react";
import { Link } from "react-router-dom";
import { useTenantBranding } from "@/components/TenantBrandingProvider";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  const { branding } = useTenantBranding();
  const logoUrl = branding.logoUrl;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={branding.appName}
              className="h-14 w-auto mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
          )}
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">
            {branding.appName}
          </h2>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <Link to="/privacy-policy" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link to="/terms-of-service" className="hover:text-foreground hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}