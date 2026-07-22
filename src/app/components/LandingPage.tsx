"use client";

import React from "react";
import { SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";

const checkerboardBg = {
  backgroundImage: `
    linear-gradient(45deg, #e2e2e5 25%, transparent 25%),
    linear-gradient(-45deg, #e2e2e5 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e2e5 75%),
    linear-gradient(-45deg, transparent 75%, #e2e2e5 75%)
  `,
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

const loadingSpinnerStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  border: "4px solid #1c1c1d",
  borderTopColor: "transparent",
  animation: "spin 0.6s linear infinite",
};

const cardStyle: React.CSSProperties = {
  maxWidth: 520,
  width: "100%",
  backgroundColor: "#ffffff",
  border: "4px solid #1c1c1d",
  boxShadow: "8px 8px 0px 0px #1c1c1d",
  padding: "0",
  overflow: "hidden",
};

const cardHeaderStyle: React.CSSProperties = {
  backgroundColor: "#1c1c1d",
  padding: "12px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const brandLabelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  fontWeight: 700,
  color: "#f4f4f6",
  textTransform: "uppercase",
  letterSpacing: "1.5px",
};

const logoBlockStyle: React.CSSProperties = {
  backgroundColor: "#ebd3be",
  border: "4px solid #1c1c1d",
  padding: "14px 20px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 28,
  fontWeight: 700,
  textTransform: "uppercase",
  color: "#1c1c1d",
  letterSpacing: "-1px",
  boxShadow: "4px 4px 0px 0px #1c1c1d",
};

const headingStyle: React.CSSProperties = {
  fontSize: 38,
  fontWeight: 700,
  textTransform: "uppercase",
  color: "#1c1c1d",
  letterSpacing: "-1.2px",
  lineHeight: 1.0,
  textAlign: "center",
  marginBottom: 12,
};

const subheadingStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#555558",
  textAlign: "center",
  lineHeight: 1.6,
  marginBottom: 32,
  maxWidth: 360,
  marginLeft: "auto",
  marginRight: "auto",
};

const featurePillStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  color: "#1c1c1d",
  backgroundColor: "#f4f4f6",
  border: "2px solid #1c1c1d",
  padding: "4px 10px",
  letterSpacing: "0.5px",
};

const launchBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 0",
  backgroundColor: "#1c1c1d",
  color: "#ffffff",
  border: "4px solid #1c1c1d",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "1.5px",
  cursor: "pointer",
  boxShadow: "0 4px 0 0 #000000",
  transform: "translateY(-4px)",
  transition: "all 0.05s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

export function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f4f4f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...checkerboardBg,
    }}>
      <div style={loadingSpinnerStyle} />
    </div>
  );
}

export function LandingPage() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f4f4f6",
      ...checkerboardBg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      userSelect: "none",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        style={cardStyle}
      >
        <div style={cardHeaderStyle}>
          <span style={brandLabelStyle}>MCSE.dev — v2.0</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div style={{ padding: "40px 40px 32px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={logoBlockStyle}>MCSE</div>
          </div>

          <h1 style={headingStyle}>MCSkinEngine</h1>
          <p style={subheadingStyle}>
            The next-generation retro-voxel Minecraft skin editor. Design with precision 2D tools or generate skins with Gemini AI.
          </p>

          <div style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 32,
          }}>
            {["Pixel Editor", "AI Generator", "3D Preview", "Turso Sync"].map(feat => (
              <span key={feat} style={featurePillStyle}>{feat}</span>
            ))}
          </div>

          <SignInButton mode="modal">
            <button
              type="button"
              aria-label="Sign in to launch your Minecraft skin workspace"
              style={launchBtnStyle}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.filter = "brightness(0.85)";
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.filter = "brightness(1)";
              }}
              onMouseDown={e => {
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                (e.target as HTMLButtonElement).style.boxShadow = "0 0 0 0 #000000";
              }}
              onMouseUp={e => {
                (e.target as HTMLButtonElement).style.transform = "translateY(-4px)";
                (e.target as HTMLButtonElement).style.boxShadow = "0 4px 0 0 #000000";
              }}
            >
              Launch Workspace
            </button>
          </SignInButton>
        </div>

        <div style={{
          borderTop: "2px solid #e2e2e5",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}>
          {["Free to use", "Clerk Auth", "Gemini AI"].map((item, i) => (
            <span key={item} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "#8a8a93",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              {i > 0 && <span style={{ color: "#e2e2e5" }}>·</span>}
              {item}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
