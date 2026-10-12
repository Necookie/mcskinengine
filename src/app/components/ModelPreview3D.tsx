"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSkinStore } from "@/lib/store";
import dynamic from "next/dynamic";
import { Play, Pause, Download, Upload, Sun, Lightbulb, Layers, Camera, Grid } from "lucide-react";

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
  const [rotateSpeed, setRotateSpeed] = useState<number>(0.8);
  const [animationName, setAnimationName] = useState<"walk" | "run" | "idle" | "wave" | "crouch" | "static">("walk");
  const [lightingMode, setLightingMode] = useState<"studio" | "flat">("studio");
  const [showOuterLayers, setShowOuterLayers] = useState(true);
  const [wireframeMode, setWireframeMode] = useState(false);
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
      viewer.autoRotateSpeed = rotateSpeed;
    }
  }, [viewer, autoRotate, rotateSpeed]);

  // Synchronize lighting mode (studio vs flat pixel light)
  useEffect(() => {
    if (!viewer) return;
    const v = viewer as any;
    if (v.globalLight && v.cameraLight) {
      if (lightingMode === "flat") {
        v.globalLight.intensity = 3.2;
        v.cameraLight.intensity = 0.0;
      } else {
        v.globalLight.intensity = 1.8;
        v.cameraLight.intensity = 1.2;
      }
    }
  }, [viewer, lightingMode]);

  // Synchronize outer overlay layers (Minecraft 1.8 2nd skin layer)
  useEffect(() => {
    if (!viewer) return;
    const player = (viewer as any).playerObject?.skin;
    if (player) {
      const parts = [player.head, player.torso, player.rightArm, player.leftArm, player.rightLeg, player.leftLeg];
      parts.forEach((p) => {
        if (p && p.outerLayer) {
          p.outerLayer.visible = showOuterLayers;
        }
      });
    }
  }, [viewer, showOuterLayers]);

  // Synchronize wireframe debug view
  useEffect(() => {
    if (!viewer) return;
    const player = (viewer as any).playerObject?.skin;
    if (player) {
      const parts = [player.head, player.torso, player.rightArm, player.leftArm, player.rightLeg, player.leftLeg];
      parts.forEach((p) => {
        if (p) {
          if (p.innerLayer?.material) {
            p.innerLayer.material.wireframe = wireframeMode;
          }
          if (p.outerLayer?.material) {
            p.outerLayer.material.wireframe = wireframeMode;
          }
        }
      });
    }
  }, [viewer, wireframeMode]);

  const downloadSkin = () => {
    const link = document.createElement("a");
    link.download = `skin_${modelType}_${role}.png`;
    link.href = skinArrayToCanvas(skinArray).toDataURL("image/png");
    link.click();
  };

  const export3DSnapshot = () => {
    if (!viewer) return;
    const v = viewer as any;
    if (v.renderer?.domElement) {
      if (v.render) v.render();
      const url = v.renderer.domElement.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `render_${modelType}_${role}_${animationName}.png`;
      link.href = url;
      link.click();
    }
  };

  const setCameraAngle = (angle: "front" | "back" | "iso" | "top") => {
    if (!viewer) return;
    const v = viewer as any;
    if (v.camera) {
      if (angle === "front") {
        v.camera.position.set(0, 0, 60);
      } else if (angle === "back") {
        v.camera.position.set(0, 0, -60);
      } else if (angle === "iso") {
        v.camera.position.set(35, 20, 50);
      } else if (angle === "top") {
        v.camera.position.set(0, 65, 0.01);
      }
      v.camera.lookAt(0, 0, 0);
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

        {/* Camera Snap Buttons Overlay */}
        <div className="preview-3d-camera-snaps">
          <button
            type="button"
            onClick={() => setCameraAngle("front")}
            className="preview-camera-snap-btn"
            title="Front View"
          >
            FRONT
          </button>
          <button
            type="button"
            onClick={() => setCameraAngle("back")}
            className="preview-camera-snap-btn"
            title="Back View"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={() => setCameraAngle("iso")}
            className="preview-camera-snap-btn"
            title="Isometric View"
          >
            ISO
          </button>
          <button
            type="button"
            onClick={() => setCameraAngle("top")}
            className="preview-camera-snap-btn"
            title="Top View"
          >
            TOP
          </button>
        </div>

        {/* Outer Layer Visibility Toggle */}
        <div className="preview-3d-layer-toggle">
          <button
            type="button"
            onClick={() => setShowOuterLayers(!showOuterLayers)}
            className={`preview-layer-toggle-btn ${showOuterLayers ? "active" : ""}`}
            title={`Toggle Minecraft Outer Layer: ${showOuterLayers ? "Showing" : "Hidden"}`}
          >
            <Layers size={10} />
            <span>{showOuterLayers ? "2ND LAYER ON" : "BASE LAYER"}</span>
          </button>
        </div>

        {/* Overlay controls on top of 3D preview */}
        <div className="preview-3d-actions-bottom">
          <button
            type="button"
            onClick={() => setLightingMode(lightingMode === "studio" ? "flat" : "studio")}
            className={`preview-3d-action-btn ${lightingMode === "flat" ? "active" : ""}`}
            title={`Lighting: ${lightingMode === "studio" ? "Studio Shading" : "Flat Pixel"}`}
          >
            {lightingMode === "studio" ? <Lightbulb size={12} /> : <Sun size={12} />}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="preview-3d-action-btn"
            title="Toggle Auto Rotation"
          >
            {autoRotate ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`preview-3d-action-btn ${wireframeMode ? "active" : ""}`}
            title={`Wireframe Mode: ${wireframeMode ? "ON" : "OFF"}`}
          >
            <Grid size={12} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (rotateSpeed === 0.4) setRotateSpeed(0.8);
              else if (rotateSpeed === 0.8) setRotateSpeed(1.6);
              else setRotateSpeed(0.4);
            }}
            className="preview-3d-action-btn"
            title={`Rotation Speed: ${rotateSpeed === 0.4 ? "0.5x" : rotateSpeed === 0.8 ? "1.0x" : "2.0x"}`}
          >
            <span style={{ fontSize: "8px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {rotateSpeed === 0.4 ? "0.5×" : rotateSpeed === 0.8 ? "1.0×" : "2.0×"}
            </span>
          </button>
        </div>
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
          title="Download 64×64 skin PNG file"
        >
          <Download size={13} />
          <span>Skin PNG</span>
        </button>
        <button
          onClick={export3DSnapshot}
          className="voxel-btn"
          style={{ padding: "6px 0", fontSize: "10px", justifyContent: "center", width: "100%" }}
          title="Export high-resolution 3D pose render"
        >
          <Camera size={13} />
          <span>3D Render</span>
        </button>
        <button
          onClick={handleUploadClick}
          className="voxel-btn"
          style={{ padding: "6px 0", fontSize: "10px", justifyContent: "center", width: "100%", gridColumn: "span 2" }}
          title="Upload existing skin file"
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
