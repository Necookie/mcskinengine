"use client";

import React from "react";
import { useSkinStore } from "@/lib/store";
import { GraduationCap, Briefcase, FlaskConical, User, UserCheck } from "lucide-react";

export default function TraitSelector() {
  const {
    skinArray,
    role,
    ethnicity,
    modelType,
    setRole,
    setEthnicity,
    setModelType,
    saveSkin,
    pushUndo
  } = useSkinStore();

  const roles = [
    { key: "hoodie", label: "Student (Hoodie)", icon: GraduationCap, colorClass: "block-steve" },
    { key: "blazer", label: "Professor (Blazer)", icon: Briefcase, colorClass: "block-tweed" },
    { key: "labcoat", label: "STEM Lab Coat", icon: FlaskConical, colorClass: "block-lab" }
  ];

  const ethnicities = ["East Asian", "South Asian", "Caucasian", "Black"];

  const handleRoleChange = async (newRole: string) => {
    pushUndo(skinArray);
    setRole(newRole);
    setTimeout(() => saveSkin(), 500);
  };

  const handleEthnicityChange = async (newEth: string) => {
    pushUndo(skinArray);
    setEthnicity(newEth);
    setTimeout(() => saveSkin(), 500);
  };

  const handleModelTypeChange = async (type: "steve" | "alex") => {
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
          {roles.map((r) => {
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
          {ethnicities.map((eth) => {
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
