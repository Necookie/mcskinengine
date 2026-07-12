"use client";

import React from "react";
import { useSkinStore } from "@/lib/store";
import { GraduationCap, Briefcase, FlaskConical, User, UserCheck, Shirt, Dumbbell, Flame, Sparkles, Wand2 } from "lucide-react";

const ROLES = [
  { key: "hoodie", label: "Student (Hoodie)", icon: GraduationCap },
  { key: "blazer", label: "Professor (Blazer)", icon: Briefcase },
  { key: "labcoat", label: "STEM Lab Coat", icon: FlaskConical },
  { key: "crewneck", label: "Crewneck Sweater", icon: Shirt },
  { key: "tracksuit", label: "Athletic Tracksuit", icon: Dumbbell },
  { key: "bomber", label: "Streetwear Bomber", icon: Flame },
  { key: "summer-dress", label: "Summer Dress", icon: Sparkles },
  { key: "skirt-top", label: "Skirt & Fitted Top", icon: Wand2 }
] as const;

const ETHNICITIES = ["East Asian", "South Asian", "Caucasian", "Black"] as const;

export default function TraitSelector() {
  const skinArray = useSkinStore((s) => s.skinArray);
  const role = useSkinStore((s) => s.role);
  const ethnicity = useSkinStore((s) => s.ethnicity);
  const modelType = useSkinStore((s) => s.modelType);
  const setRole = useSkinStore((s) => s.setRole);
  const setEthnicity = useSkinStore((s) => s.setEthnicity);
  const setModelType = useSkinStore((s) => s.setModelType);
  const saveSkin = useSkinStore((s) => s.saveSkin);
  const pushUndo = useSkinStore((s) => s.pushUndo);

  const handleRoleChange = (newRole: string) => {
    pushUndo(skinArray);
    setRole(newRole);
    setTimeout(() => saveSkin(), 500);
  };

  const handleEthnicityChange = (newEth: string) => {
    pushUndo(skinArray);
    setEthnicity(newEth);
    setTimeout(() => saveSkin(), 500);
  };

  const handleModelTypeChange = (type: "steve" | "alex") => {
    pushUndo(skinArray);
    setModelType(type);
    setTimeout(() => saveSkin(), 500);
  };

  return (
    <div className="trait-selector-container">
      {/* 1. Silhouette / Model Toggle (Steve vs Alex) */}
      <div className="trait-section-card">
        <div className="trait-card-header">
          <span className="trait-card-title">Silhouette</span>
          <span className="trait-card-subtitle">Steve vs Alex</span>
        </div>
        <div className="segmented-control" role="radiogroup" aria-label="Model type">
          <button
            onClick={() => handleModelTypeChange("steve")}
            className={`segmented-item ${modelType === "steve" ? "active" : ""}`}
            role="radio"
            aria-checked={modelType === "steve"}
          >
            <User size={13} aria-hidden="true" />
            <span>Steve (4px)</span>
          </button>
          <button
            onClick={() => handleModelTypeChange("alex")}
            className={`segmented-item ${modelType === "alex" ? "active" : ""}`}
            role="radio"
            aria-checked={modelType === "alex"}
          >
            <UserCheck size={13} aria-hidden="true" />
            <span>Alex (3px)</span>
          </button>
        </div>
      </div>

      {/* 2. Institutional Role */}
      <div className="trait-section-card">
        <div className="trait-card-header">
          <span className="trait-card-title">Institutional Role</span>
          <span className="trait-card-subtitle">Stencil Base</span>
        </div>
        <div className="segmented-control" role="radiogroup" aria-label="Institutional role">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isActive = role === r.key;
            return (
              <button
                key={r.key}
                onClick={() => handleRoleChange(r.key)}
                className={`segmented-item ${isActive ? "active" : ""}`}
                title={r.label}
                role="radio"
                aria-checked={isActive}
              >
                <Icon size={13} aria-hidden="true" />
                <span>{r.key}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Demographic Ethnicity */}
      <div className="trait-section-card">
        <div className="trait-card-header">
          <span className="trait-card-title">Ethnicity Base</span>
          <span className="trait-card-subtitle">Skin Profile</span>
        </div>
        <div className="ethnicity-buttons-grid" role="radiogroup" aria-label="Ethnicity">
          {ETHNICITIES.map((eth) => {
            const isActive = ethnicity === eth;
            return (
              <button
                key={eth}
                onClick={() => handleEthnicityChange(eth)}
                className={`ethnicity-btn ${isActive ? "active" : ""}`}
                role="radio"
                aria-checked={isActive}
              >
                {eth}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
