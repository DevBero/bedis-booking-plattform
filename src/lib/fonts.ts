import localFont from "next/font/local";

// Geist (SIL OFL, src/assets/fonts/OFL.txt) from our own repository: no request to Google at build or runtime
export const geist = localFont({
  src: "../assets/fonts/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
});
