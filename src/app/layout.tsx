import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCSkinEngine.dev - Minecraft Skin Workspace",
  description: "A premium retro-voxel Minecraft skin editor powered by Gemini AI and Turso database.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider 
      appearance={{
        variables: {
          colorPrimary: "#18181b",
          colorBackground: "#ffffff",
          colorText: "#18181b",
          borderRadius: "8px",
          fontFamily: "var(--font-sans)",
        },
        elements: {
          card: "border border-zinc-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] bg-white p-8",
          headerTitle: "font-sans font-bold text-xl tracking-tight text-[#18181b]",
          headerSubtitle: "font-sans text-sm text-zinc-500",
          formFieldLabel: "font-mono text-[10px] uppercase tracking-[0.54px] font-bold text-zinc-500 mb-1",
          formFieldInput: "border border-zinc-200 rounded-lg outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 font-sans text-sm p-2.5 bg-white transition-all",
          formButtonPrimary: "font-sans text-sm py-2.5 px-4 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 transition-all font-semibold shadow-none border-none cursor-pointer",
          footerActionText: "font-sans text-xs text-zinc-500",
          footerActionLink: "font-sans text-xs text-zinc-900 font-semibold hover:underline",
          identityPreviewText: "font-mono text-xs text-zinc-700",
          identityPreviewEditButtonIcon: "text-zinc-500",
          dividerText: "font-mono text-[10px] uppercase text-zinc-400 font-bold",
          dividerLine: "bg-zinc-100",
          formResendCodeLink: "font-sans text-xs text-zinc-900 font-semibold hover:underline",
          alternativeMethodsCard: "border border-zinc-200 rounded-lg bg-zinc-50 shadow-none",
        }
      }}
    >
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;540;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
