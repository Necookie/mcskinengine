"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSkinStore } from "@/lib/store";
import dynamic from "next/dynamic";
import { Play, Pause, Download, Upload } from "lucide-react";

/**
 * Converts a flat RGBA Uint8Array into an off-screen 64×64 HTMLCanvasElement.
 * Centralises the repeated temp-canvas boilerplate used across this component.
 */
function skinArrayToCanvas(arr: Uint8Array): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const imgData = ctx.createImageData(64, 64);
    imgData.data.set(arr);
    ctx.putImageData(imgData, 0, 0);
  }
  return canvas;
}

// Dynamically import SkinViewer since it depends on browser canvas APIs (WebGL, ThreeJS)
const ReactSkinview3d = dynamic(
  () => import("react-skinview3d"),
  { ssr: false, loading: () => <div className="text-grid-tag text-[#555558]">Loading Voxel Mesh...</div> }
);

/** Minimal interface of the skinview3d viewer instance used in this component. */
interface SkinViewer3DInstance {
  skinCanvas: HTMLCanvasElement;
  skinTexture: { minFilter: number; magFilter: number; needsUpdate: boolean };
  background: null | string;
  autoRotate: boolean;
  autoRotateSpeed: number;
  animations: { add: (cls: unknown) => void; handles: Array<{ resetAndRemove: () => void }> };
  loadSkin: (url: string, model: "slim" | "classic") => void;
}

export default function ModelPreview3D() {
  const skinArray = useSkinStore((s) => s.skinArray);
  const modelType = useSkinStore((s) => s.modelType);
  const role = useSkinStore((s) => s.role);
  const setSkinArray = useSkinStore((s) => s.setSkinArray);
  const saveSkin = useSkinStore((s) => s.saveSkin);
  const pushUndo = useSkinStore((s) => s.pushUndo);
  const [autoRotate, setAutoRotate] = useState(true);
  const [animationName, setAnimationName] = useState<"walk" | "run" | "idle" | "wave" | "crouch" | "static">("walk");
  const [viewer, setViewer] = useState<SkinViewer3DInstance | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

      const player = (viewer as any).playerObject?.skin;
      if (player) {
        // Reset limb rotations to default
        player.rightArm.rotation.set(0, 0, 0);
        player.leftArm.rotation.set(0, 0, 0);
        player.rightLeg.rotation.set(0, 0, 0);
        player.leftLeg.rotation.set(0, 0, 0);
        player.head.rotation.set(0, 0, 0);
      }

      if (animationName === "walk") {
        viewer.animations.add(sv.WalkingAnimation);
      } else if (animationName === "run") {
        viewer.animations.add(sv.RunningAnimation);
      } else if (animationName === "idle") {
        viewer.animations.add(sv.IdleAnimation);
      } else if (animationName === "wave") {
        if (player) {
          player.rightArm.rotation.x = -2.6;
          player.rightArm.rotation.z = 0.4;
          player.head.rotation.y = -0.2;
        }
      } else if (animationName === "crouch") {
        if (player) {
          player.rightLeg.rotation.x = -0.4;
          player.leftLeg.rotation.x = -0.4;
          player.torso.rotation.x = 0.3;
          player.head.rotation.x = -0.2;
        }
      }
    });
  }, [viewer, animationName]);

  // Synchronize model type (Steve vs Alex) dynamically on the viewer instance
  useEffect(() => {
    if (viewer && skinArray) {
      viewer.loadSkin(skinArrayToCanvas(skinArray).toDataURL(), modelType === "alex" ? "slim" : "classic");
    }
  }, [viewer, modelType, skinArray]);

  // Synchronize autoRotate dynamically on the viewer instance
  useEffect(() => {
    if (viewer) {
      viewer.autoRotate = autoRotate;
      viewer.autoRotateSpeed = 0.8;
    }
  }, [viewer, autoRotate]);

  const downloadSkin = () => {
    const link = document.createElement("a");
    link.download = `skin_${modelType}_${role}.png`;
    link.href = skinArrayToCanvas(skinArray).toDataURL("image/png");
    link.click();
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
          setUploadError("Skin must be exactly 64×64 pixels.");
          setTimeout(() => setUploadError(null), 3000);
          console.error("[Upload] Invalid skin dimensions: must be 64x64 pixels.");
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

              // Set background to null (transparent)
              viewerInstance.background = null;

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
        <div className="pose-selector-header">
          <span className="pose-selector-label">Model Pose</span>
          <span className="pose-active-indicator">{animationName.toUpperCase()}</span>
        </div>
        <div className="pose-buttons-grid">
          {(["walk", "run", "idle", "wave", "crouch", "static"] as const).map((anim) => (
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

      {/* Upload error feedback */}
      {uploadError && (
        <div style={{ marginTop: "6px", fontSize: "10px", color: "#c53030", fontFamily: "var(--font-mono)", textAlign: "center", padding: "4px 8px", border: "1px solid #fca5a5", backgroundColor: "#fce8e6" }}>
          {uploadError}
        </div>
      )}
    </div>
  );
}
