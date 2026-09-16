import type { Metadata } from "next";
import "./globals.css";
import "ol/ol.css";
import "./adaptive-layout.css";

export const metadata: Metadata = {
  title: "A.R.E.A. GeoCensimento Lab",
  description: "Laboratorio tecnico per il dominio Censimento A.R.E.A.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
