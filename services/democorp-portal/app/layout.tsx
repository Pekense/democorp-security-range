import type { Metadata } from "next";

import { Sidebar } from "@/components/Sidebar";
import { TraceProvider } from "@/lib/trace-context";

import "./globals.css";

export const metadata: Metadata = {
  title: "DemoCorp | Enterprise Security Range",
  description: "Controlled AI Security Environment — DemoCorp Enterprise Security Range operations console.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TraceProvider>
          <div className="appShell">
            <Sidebar />
            <div className="mainColumn">
              <main className="mainContent">{children}</main>
            </div>
          </div>
        </TraceProvider>
      </body>
    </html>
  );
}
