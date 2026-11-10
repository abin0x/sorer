import React from "react";

/**
 * ClubLogo — renders the Rudder app icon (white logo) inside a square
 * filled with the club's primary color. This connects the app brand
 * (Rudder) with the tenant brand (club color) in every place a logo
 * appears: sidebar, header, emails, etc.
 *
 * Props:
 *  - primaryColor: hex string (e.g. "#399F7D"). Falls back to indigo.
 *  - size: px size of the square (default 40).
 *  - className: extra classes on the wrapper.
 *  - rounded: border-radius override (default rounded-xl).
 */
export const RUDDER_LOGO_URL =
  "https://media.base44.com/images/public/690d4c6dccfb0f4e79c33a38/f27090daf_Rudder-white-logo.png";

export default function ClubLogo({ primaryColor = "#4f47e6", size = 40, className = "", rounded = "rounded-xl" }) {
  return (
    <div
      className={`${rounded} flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: primaryColor }}
    >
      <img
        src={RUDDER_LOGO_URL}
        alt="Club Rudder"
        style={{ width: size * 0.62, height: size * 0.62, objectFit: "contain" }}
      />
    </div>
  );
}