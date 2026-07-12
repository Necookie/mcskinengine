"use client";

import React from "react";
import { useSkinStore } from "@/lib/store";
import { GraduationCap, Briefcase, FlaskConical, User, UserCheck } from "lucide-react";

const ROLES = [
  { key: "hoodie", label: "Student (Hoodie)", icon: GraduationCap },
  { key: "blazer", label: "Professor (Blazer)", icon: Briefcase },
  { key: "labcoat", label: "STEM Lab Coat", icon: FlaskConical }
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
        <div className="segmented-control">
          <button
            onClick={() => handleModelTypeChange("steve")}
            className={`segmented-item ${modelType === "steve" ? "active" : ""}`}
          >
            <User size={13} />
            <span>Steve (4px)</span>
          </button>
          <button
            onClick={() => handleModelTypeChange("alex")}
            className={`segmented-item ${modelType === "alex" ? "active" : ""}`}
          >
            <UserCheck size={13} />
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
        <div className="segmented-control">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isActive = role === r.key;
            return (
              <button
                key={r.key}
                onClick={() => handleRoleChange(r.key)}
                className={`segmented-item ${isActive ? "active" : ""}`}
                title={r.label}
              >
                <Icon size={13} />
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
        <div className="ethnicity-buttons-grid">
          {ETHNICITIES.map((eth) => {
            const isActive = ethnicity === eth;
            return (
              <button
                key={eth}
                onClick={() => handleEthnicityChange(eth)}
                className={`ethnicity-btn ${isActive ? "active" : ""}`}
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
