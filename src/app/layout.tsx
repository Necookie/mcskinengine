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
          colorPrimary: "#1c1c1d",
          colorBackground: "#ffffff",
          borderRadius: "0px",
          fontFamily: "var(--font-sans)",
        },
        elements: {
          card: "border-4 border-black rounded-none shadow-none",
          headerTitle: "font-mono font-bold uppercase text-lg tracking-tight",
          headerSubtitle: "font-mono text-xs uppercase text-gray-500",
          formFieldLabel: "font-mono text-[10px] uppercase font-bold text-gray-500",
          formFieldInput: "border-2 border-black rounded-none outline-none focus:border-black font-sans text-xs p-2 bg-white",
          formButtonPrimary: "voxel-btn btn-primary font-sans text-xs uppercase py-2 border-2 border-black shadow-[0_3px_0_0_#1c1c1d] transform translateY(-3px) active:translate-y-0 active:shadow-none",
          footerActionText: "font-mono text-xs text-gray-500",
          footerActionLink: "font-mono text-xs text-black font-bold underline hover:text-gray-700",
          identityPreviewText: "font-mono text-xs",
          identityPreviewEditButtonIcon: "text-black",
          dividerText: "font-mono text-[10px] uppercase text-gray-400 font-bold",
          dividerLine: "bg-neutral-200",
          formResendCodeLink: "font-mono text-xs text-black font-bold underline",
          alternativeMethodsCard: "border-2 border-black rounded-none bg-[#f4f4f6] shadow-none",
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
