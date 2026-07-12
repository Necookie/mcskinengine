"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSkinStore } from "@/lib/store";
import dynamic from "next/dynamic";
import { Raycaster, Vector2, MOUSE } from "three";

const PALETTE = [
  "#1c1c1d", "#ffffff", "#ff2a85", "#b3d7df", "#ebd3be",
  "#f1e4d3", "#d2ebd9", "#704732", "#f3d0bc", "#e02424",
  "#eab308", "#22c55e", "#3b82f6", "#a855f7"
] as const;

const ReactSkinview3d = dynamic(
  () => import("react-skinview3d"),
  { ssr: false, loading: () => <div className="text-grid-tag text-[#8a8a93]">Loading Voxel Mat...</div> }
);

export default function PixelEditor3D() {
  const {
    skinArray,
    selectedColor,
    brushSize,
    modelType,
    setPixel,
    setSelectedColor,
    setBrushSize,
    saveSkin,
    activeTool,
    setActiveTool,
    showGuides,
    zoom2D,
    pushUndo
  } = useSkinStore();

  const [viewer, setViewer] = useState<any>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const isDrawingRef = useRef(false);

  // Synchronize skinArray changes (e.g. from Undo/Redo/AI Generation) to the 3D viewer texture
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

  // Synchronize model type (Steve vs Alex)
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

  // Sync zoom level (reusing zoom2D store property)
  useEffect(() => {
    if (viewer) {
      viewer.zoom = zoom2D;
    }
  }, [viewer, zoom2D]);

  // Sync outer skin layer visibility (linking showGuides to show/hide the outer jacket/hat layer)
  useEffect(() => {
    if (viewer) {
      viewer.playerObject.skin.setOuterLayerVisible(showGuides);
    }
  }, [viewer, showGuides]);

  // Auto-save debounce on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveSkin();
    }, 1000);
    return () => clearTimeout(timer);
  }, [skinArray, saveSkin]);

  // Helper to resolve x/y texture coordinates from a raycast event
  const getTextureCoords = useCallback((clientX: number, clientY: number) => {
    if (!viewer) return null;
    const canvas = viewer.canvas;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(x, y), viewer.camera);

    const intersects = raycaster.intersectObject(viewer.playerObject.skin, true);
    if (intersects.length > 0) {
      // Find the first intersection that is visible and has UV coordinates
      for (const hit of intersects) {
        if (hit.object.visible && hit.uv) {
          const px = Math.floor(hit.uv.x * 64);
          const py = Math.floor((1 - hit.uv.y) * 64);
          if (px >= 0 && px < 64 && py >= 0 && py < 64) {
            return { x: px, y: py };
          }
        }
      }
    }
    return null;
  }, [viewer]);

  // Handle painting
  const applyPaint = useCallback((coords: { x: number; y: number }, isStart: boolean) => {
    const color = activeTool === "brush" ? selectedColor : "#000000";
    const alpha = activeTool === "brush" ? 255 : 0;

    if (isStart) {
      pushUndo(skinArray);
    }

    setPixel(coords.x, coords.y, color, alpha);

    // Update 3D canvas directly for zero-latency feedback
    if (viewer) {
      const ctx = viewer.skinCanvas.getContext("2d");
      if (ctx) {
        const half = Math.floor(brushSize / 2);
        const hex = color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;

        const imgData = ctx.getImageData(0, 0, 64, 64);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const px = coords.x + dx;
            const py = coords.y + dy;
            if (px >= 0 && px < 64 && py >= 0 && py < 64) {
              const idx = (py * 64 + px) * 4;
              imgData.data[idx] = r;
              imgData.data[idx + 1] = g;
              imgData.data[idx + 2] = b;
              imgData.data[idx + 3] = alpha;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
        viewer.skinTexture.needsUpdate = true;
      }
    }
  }, [activeTool, selectedColor, brushSize, skinArray, pushUndo, setPixel, viewer]);

  // Add mouse event listeners to canvas
  useEffect(() => {
    if (!viewer) return;
    const canvas = viewer.canvas;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click paints
      const coords = getTextureCoords(e.clientX, e.clientY);
      if (coords) {
        isDrawingRef.current = true;
        applyPaint(coords, true);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const coords = getTextureCoords(e.clientX, e.clientY);
      if (coords) {
        setHoverCoords(coords);
        if (isDrawingRef.current) {
          applyPaint(coords, false);
        }
      } else {
        setHoverCoords(null);
      }
    };

    const onMouseUpOrLeave = () => {
      isDrawingRef.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        const coords = getTextureCoords(touch.clientX, touch.clientY);
        if (coords) {
          isDrawingRef.current = true;
          applyPaint(coords, true);
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        const coords = getTextureCoords(touch.clientX, touch.clientY);
        if (coords) {
          setHoverCoords(coords);
          if (isDrawingRef.current) {
            applyPaint(coords, false);
          }
        } else {
          setHoverCoords(null);
        }
      }
    };

    const onTouchEnd = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUpOrLeave);
    canvas.addEventListener("mouseleave", onMouseUpOrLeave);

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUpOrLeave);
      canvas.removeEventListener("mouseleave", onMouseUpOrLeave);

      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [viewer, getTextureCoords, applyPaint]);

  const getRegionLabel = useCallback((x: number, y: number) => {
    const isAlex = modelType === "alex";
    if (x >= 0 && x < 32 && y >= 0 && y < 16) {
      return `HEAD BASE (${x < 8 || x >= 24 || y < 8 ? "SIDES/TOP" : "FRONT"})`;
    }
    if (x >= 32 && x < 64 && y >= 0 && y < 16) return "HAT / HOOD OVERLAY";
    if (x >= 0 && x < 16 && y >= 16 && y < 32) return "RIGHT LEG BASE";
    if (x >= 16 && x < 40 && y >= 16 && y < 32) return "TORSO BASE";
    if (x >= 40 && x < 56 && y >= 16 && y < 32) return isAlex ? "RIGHT ARM BASE (ALEX)" : "RIGHT ARM BASE (STEVE)";
    
    if (x >= 0 && x < 16 && y >= 32 && y < 48) return "RIGHT PANTS OVERLAY";
    if (x >= 16 && x < 40 && y >= 32 && y < 48) return "TORSO JACKET OVERLAY";
    if (x >= 40 && x < 56 && y >= 32 && y < 48) return "RIGHT SLEEVE OVERLAY";

    if (x >= 0 && x < 16 && y >= 48 && y < 64) return "LEFT PANTS OVERLAY";
    if (x >= 16 && x < 32 && y >= 48 && y < 64) return "LEFT LEG BASE";
    if (x >= 32 && x < 48 && y >= 48 && y < 64) return isAlex ? "LEFT ARM BASE (ALEX)" : "LEFT ARM BASE (STEVE)";
    if (x >= 48 && x < 64 && y >= 48 && y < 64) return "LEFT SLEEVE OVERLAY";

    return "BLANK TEXTURE FIELD";
  }, [modelType]);

  return (
    <div className="canvas-workspace-wrapper">
      {/* 3D CANVAS CONTAINER */}
      <div className="canvas-board-outer">
        <div 
          className="canvas-board-wrap border-4 border-[#1c1c1d] bg-[#ffffff] relative flex items-center justify-center overflow-hidden w-full h-full" 
          style={{ maxWidth: "380px", maxHeight: "380px" }}
        >
          {skinArray ? (
            <ReactSkinview3d
              skinUrl=""
              height={360}
              width={360}
              onReady={(viewerInstance: any) => {
                // NearestFilter for pixel crispness
                if (viewerInstance.skinTexture) {
                  viewerInstance.skinTexture.minFilter = 1003; // NearestFilter
                  viewerInstance.skinTexture.magFilter = 1003; // NearestFilter
                  viewerInstance.skinTexture.needsUpdate = true;
                }

                // Set background of 3D editor scene to white
                viewerInstance.background = 0xffffff;

                // Setup OrbitControls (Right Click to Rotate, Left Click is free for Paint)
                import("skinview3d").then((sv) => {
                  const controls = sv.createOrbitControls(viewerInstance);
                  controls.mouseButtons = {
                    LEFT: null,
                    MIDDLE: MOUSE.DOLLY,
                    RIGHT: MOUSE.ROTATE
                  };
                  controls.update();
                });

                setViewer(viewerInstance);
              }}
            />
          ) : (
            <div className="text-grid-tag" style={{ color: "var(--color-primary)" }}>Loading 3D Mat...</div>
          )}
        </div>
      </div>

      {/* Controls bar below: Brush Size & Coordinates & Color Palette */}
      <div className="canvas-controls-bar">
        {/* Brush Size Selector & Coordinates */}
        <div className="controls-row-top">
          {/* Coordinates overlay */}
          <div className="controls-coords">
            {hoverCoords ? (
              <span>X:{hoverCoords.x.toString().padStart(2, "0")} Y:{hoverCoords.y.toString().padStart(2, "0")} | {getRegionLabel(hoverCoords.x, hoverCoords.y).split(" (")[0]}</span>
            ) : (
              <span>GRID: 3D MODEL</span>
            )}
          </div>

          <div className="brush-size-selector" role="radiogroup" aria-label="Brush size">
            <span className="brush-size-label">Size:</span>
            <div className="brush-size-btn-group">
              {[1, 2, 3].map((size) => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`brush-size-btn ${brushSize === size ? "active" : ""}`}
                  role="radio"
                  aria-checked={brushSize === size}
                  aria-label={`Brush size ${size}x`}
                >
                  {size}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Color Palette Presets */}
        <div className="color-presets-grid" role="listbox" aria-label="Color palette">
          {PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => {
                setSelectedColor(color);
                setActiveTool("brush");
              }}
              className={`color-preset-swatch ${
                selectedColor === color && activeTool === "brush" ? "active" : ""
              }`}
              style={{ backgroundColor: color }}
              role="option"
              aria-selected={selectedColor === color && activeTool === "brush"}
              aria-label={`Color ${color}`}
            />
          ))}
          <div className="custom-color-picker-wrap">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => {
                setSelectedColor(e.target.value);
                setActiveTool("brush");
              }}
              className="custom-color-picker-input"
              aria-label="Custom color picker"
            />
            <span className="custom-color-picker-plus" aria-hidden="true">+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
