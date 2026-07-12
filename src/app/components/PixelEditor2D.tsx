"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSkinStore } from "@/lib/store";

const PALETTE = [
  "#1c1c1d", "#ffffff", "#ff2a85", "#b3d7df", "#ebd3be",
  "#f1e4d3", "#d2ebd9", "#704732", "#f3d0bc", "#e02424",
  "#eab308", "#22c55e", "#3b82f6", "#a855f7"
] as const;

export default function PixelEditor2D() {
  const {
    skinArray,
    skinBase64,
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const lastUndoPos = useRef<{ x: number; y: number } | null>(null);

  // Draw skin array to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Disable smoothing
    ctx.imageSmoothingEnabled = false;

    const imgData = ctx.createImageData(64, 64);
    imgData.data.set(skinArray);
    ctx.putImageData(imgData, 0, 0);
  }, [skinArray]);

  // 1-second save debounce
  useEffect(() => {
    if (skinBase64) {
      const timer = setTimeout(() => {
        saveSkin();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [skinBase64]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 64);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 64);

    if (x >= 0 && x < 64 && y >= 0 && y < 64) {
      return { x, y };
    }
    return null;
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    if (coords) {
      pushUndo(skinArray);
      lastUndoPos.current = coords;
      applyPaint(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (coords) {
      setHoverCoords(coords);
      if (isDrawing) {
        applyPaint(coords.x, coords.y);
      }
    } else {
      setHoverCoords(null);
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDrawing(false);
    lastUndoPos.current = null;
  };

  const applyPaint = useCallback((x: number, y: number) => {
    if (activeTool === "brush") {
      setPixel(x, y, selectedColor, 255);
    } else {
      setPixel(x, y, "#000000", 0);
    }
  }, [activeTool, selectedColor, setPixel]);

  const getRegionLabel = useCallback((x: number, y: number) => {
    const isAlex = modelType === "alex";
    if (x >= 0 && x < 32 && y >= 0 && y < 16) {
      return `HEAD BASE (${x < 8 || x >= 24 || y < 8 ? "SIDES/TOP" : "FRONT"})`;
    }
    if (x >= 32 && x < 64 && y >= 0 && y < 16) return "HAT / HOOD OVERLAY";
    if (x >= 0 && x < 16 && y >= 16 && y < 32) return "RIGHT LEG BASE";
    if (x >= 16 && x < 40 && y >= 16 && y < 32) return "TORSO BASE";
    if (x >= 40 && x < 56 && y >= 16 && y < 32) return isAlex ? "RIGHT ARM BASE (ALEX 3PX)" : "RIGHT ARM BASE (STEVE 4PX)";
    
    if (x >= 0 && x < 16 && y >= 32 && y < 48) return "RIGHT PANTS OVERLAY";
    if (x >= 16 && x < 40 && y >= 32 && y < 48) return "TORSO JACKET OVERLAY";
    if (x >= 40 && x < 56 && y >= 32 && y < 48) return "RIGHT SLEEVE OVERLAY";

    if (x >= 0 && x < 16 && y >= 48 && y < 64) return "LEFT PANTS OVERLAY";
    if (x >= 16 && x < 32 && y >= 48 && y < 64) return "LEFT LEG BASE";
    if (x >= 32 && x < 48 && y >= 48 && y < 64) return isAlex ? "LEFT ARM BASE (ALEX 3PX)" : "LEFT ARM BASE (STEVE 4PX)";
    if (x >= 48 && x < 64 && y >= 48 && y < 64) return "LEFT SLEEVE OVERLAY";

    return "BLANK TEXTURE FIELD";
  }, [modelType]);

  return (
    <div className="canvas-workspace-wrapper">
      {/* 2D CANVAS CONTAINER */}
      <div className="canvas-board-outer">
        {/* Canvas Wrap for zoom scaling */}
        <div 
          className="canvas-board-wrap checkerboard border-4 border-[#1c1c1d]"
        >
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
            style={{ transform: `scale(${zoom2D})`, transformOrigin: "center center" }}
          >
            <canvas
              ref={canvasRef}
              width={64}
              height={64}
              className="w-full h-full pixelated cursor-crosshair block"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            />

            {/* Guide Grid Overlays */}
            {showGuides && (
              <svg
                className="absolute inset-0 pointer-events-none w-full h-full select-none"
                viewBox="0 0 64 64"
                stroke="#ff2a85"
                strokeWidth="0.2"
                fill="none"
                opacity="0.75"
              >
                {/* Head / Hat */}
                <rect x="0" y="0" width="32" height="16" stroke="#f59e0b" />
                <rect x="32" y="0" width="32" height="16" stroke="#84cc16" />
                
                {/* Row 2 */}
                <rect x="0" y="16" width="16" height="16" stroke="#3b82f6" />
                <rect x="16" y="16" width="24" height="16" stroke="#a855f7" />
                <rect x="40" y="16" width="16" height="16" stroke="#ec4899" />
                
                {/* Row 3 */}
                <rect x="0" y="32" width="16" height="16" stroke="#06b6d4" />
                <rect x="16" y="32" width="24" height="16" stroke="#10b981" />
                <rect x="40" y="32" width="16" height="16" stroke="#f43f5e" />

                {/* Row 4 */}
                <rect x="0" y="48" width="16" height="16" stroke="#6366f1" />
                <rect x="16" y="48" width="16" height="16" stroke="#e11d48" />
                <rect x="32" y="48" width="16" height="16" stroke="#14b8a6" />
                <rect x="48" y="48" width="16" height="16" stroke="#3b82f6" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Floating controls bar below: Brush Size & Coordinates & Color Palette */}
      <div className="canvas-controls-bar">
        {/* Brush Size Selector & Coordinates */}
        <div className="controls-row-top">
          {/* Coordinates overlay */}
          <div className="controls-coords">
            {hoverCoords ? (
              <span>X:{hoverCoords.x.toString().padStart(2, "0")} Y:{hoverCoords.y.toString().padStart(2, "0")} | {getRegionLabel(hoverCoords.x, hoverCoords.y).split(" (")[0]}</span>
            ) : (
              <span>GRID: 64x64</span>
            )}
          </div>

          <div className="brush-size-selector">
            <span className="brush-size-label">Size:</span>
            <div className="brush-size-btn-group">
              {[1, 2, 3].map((size) => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`brush-size-btn ${brushSize === size ? "active" : ""}`}
                >
                  {size}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Color Palette Presets */}
        <div className="color-presets-grid">
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
            />
          ))}
          {/* Custom color picker */}
          <div className="custom-color-picker-wrap">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => {
                setSelectedColor(e.target.value);
                setActiveTool("brush");
              }}
              className="custom-color-picker-input"
            />
            <span className="custom-color-picker-plus">+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
