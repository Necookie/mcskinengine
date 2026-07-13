"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSkinStore } from "@/lib/store";
import dynamic from "next/dynamic";
import { Play, Pause, Download, Upload } from "lucide-react";

// Dynamically import SkinViewer since it depends on browser canvas APIs (WebGL, ThreeJS)
const ReactSkinview3d = dynamic(
  () => import("react-skinview3d"),
  { ssr: false, loading: () => <div className="text-grid-tag text-[#555558]">Loading Voxel Mesh...</div> }
);

export default function ModelPreview3D() {
  const skinArray = useSkinStore((s) => s.skinArray);
  const modelType = useSkinStore((s) => s.modelType);
  const role = useSkinStore((s) => s.role);
  const setSkinArray = useSkinStore((s) => s.setSkinArray);
  const saveSkin = useSkinStore((s) => s.saveSkin);
  const pushUndo = useSkinStore((s) => s.pushUndo);
  const [autoRotate, setAutoRotate] = useState(true);
  const [animationName, setAnimationName] = useState<"walk" | "run" | "idle" | "static">("walk");
  const [viewer, setViewer] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize skinArray changes (Undo/Redo/Drawing strokes) to the 3D viewer texture live
  useEffect(() => {
    if (!viewer || !skinArray) return;
    const ctx = viewer.skinCanvas.getContext("2d");
    if (ctx) {
      const imgData = ctx.createImageData(64, 64);
      imgData.data.set(skinArray);
      ctx.putImageData(imgData, 0, 0);
      viewer.skinTexture.needsUpdate = true;
    }
  }, [viewer, skinArray]);

  // Handle animation changes on the viewer instance
  useEffect(() => {
    if (!viewer) return;

    // Dynamically load animation classes from skinview3d
    import("skinview3d").then((sv) => {
      // Clean up previous animations by resetting limbs to default state and removing them
      viewer.animations.handles.forEach((handle: any) => handle.resetAndRemove());

      if (animationName === "walk") {
        viewer.animations.add(sv.WalkingAnimation);
      } else if (animationName === "run") {
        viewer.animations.add(sv.RunningAnimation);
      } else if (animationName === "idle") {
        viewer.animations.add(sv.IdleAnimation);
      }
    });
  }, [viewer, animationName]);

  // Synchronize model type (Steve vs Alex) dynamically on the viewer instance
  useEffect(() => {
    if (viewer && skinArray) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 64;
      tempCanvas.height = 64;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        const imgData = ctx.createImageData(64, 64);
        imgData.data.set(skinArray);
        ctx.putImageData(imgData, 0, 0);
        viewer.loadSkin(tempCanvas.toDataURL(), { model: modelType === "alex" ? "slim" : "classic" });
      }
    }
  }, [viewer, modelType]);

  // Synchronize autoRotate dynamically on the viewer instance
  useEffect(() => {
    if (viewer) {
      viewer.autoRotate = autoRotate;
      viewer.autoRotateSpeed = 0.8;
    }
  }, [viewer, autoRotate]);

  const downloadSkin = () => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 64;
    tempCanvas.height = 64;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      const imgData = ctx.createImageData(64, 64);
      imgData.data.set(skinArray);
      ctx.putImageData(imgData, 0, 0);
      
      const link = document.createElement("a");
      link.download = `skin_${modelType}_${role}.png`;
      link.href = tempCanvas.toDataURL("image/png");
      link.click();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSkin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 64 || img.height !== 64) {
          alert("Error: Minecraft skins must be exactly 64x64 pixels.");
          return;
        }
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 64;
        tempCanvas.height = 64;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, 64, 64);
          pushUndo(skinArray);
          setSkinArray(new Uint8Array(imgData.data));
          setTimeout(() => saveSkin(), 500);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="preview-container">
      {/* 3D Canvas Box */}
      <div className="preview-3d-box">
        {skinArray ? (
          <ReactSkinview3d
            skinUrl=""
            height={260}
            width={260}
            onReady={(viewerInstance: any) => {
              // Force NearestFilter for Minecraft crisp pixels
              if (viewerInstance.skinTexture) {
                viewerInstance.skinTexture.minFilter = 1003; // THREE.NearestFilter
                viewerInstance.skinTexture.magFilter = 1003; // THREE.NearestFilter
                viewerInstance.skinTexture.needsUpdate = true;
              }

              // Set background to white
              viewerInstance.background = 0xffffff;

              // Enable drag to rotate / orbit controls
              import("skinview3d").then((sv) => {
                sv.createOrbitControls(viewerInstance);
              });

              setViewer(viewerInstance);
            }}
          />
        ) : (
          <div className="text-grid-tag" style={{ color: "var(--color-primary)" }}>Init 3D Scene...</div>
        )}

        {/* Overlay controls on top of 3D preview */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className="preview-3d-rotate-btn"
          title="Toggle Auto Rotation"
        >
          {autoRotate ? <Pause size={12} /> : <Play size={12} />}
        </button>
      </div>

      {/* Animation Selector */}
      <div className="pose-selector-section">
        <span className="pose-selector-label">Preview Pose</span>
        <div className="pose-buttons-grid">
          {(["walk", "run", "idle", "static"] as const).map((anim) => (
            <button
              key={anim}
              onClick={() => setAnimationName(anim)}
              className={`pose-btn ${animationName === anim ? "active" : ""}`}
            >
              {anim}
            </button>
          ))}
        </div>
      </div>

      {/* Export / Import Utilities */}
      <div className="utility-buttons-grid">
        <button
          onClick={downloadSkin}
          className="voxel-btn"
          style={{ padding: "6px 0", fontSize: "10px", justifyContent: "center", width: "100%" }}
        >
          <Download size={13} />
          <span>Download</span>
        </button>
        <button
          onClick={handleUploadClick}
          className="voxel-btn"
          style={{ padding: "6px 0", fontSize: "10px", justifyContent: "center", width: "100%" }}
        >
          <Upload size={13} />
          <span>Upload Skin</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUploadSkin}
          accept="image/png"
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}
