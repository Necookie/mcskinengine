"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileImage } from "lucide-react";

interface ImageDropzoneProps {
  onImageLoaded: (base64: string | null) => void;
}

export default function ImageDropzone({ onImageLoaded }: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreview(result);
        onImageLoaded(result);
      };
      reader.readAsDataURL(file);
    },
    [onImageLoaded]
  );

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onImageLoaded(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`voxel-dropzone ${isDragActive ? "voxel-dropzone-active" : ""}`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <div className="dropzone-preview-wrap">
          {/* Preview Image */}
          <div className="dropzone-img-box">
            <img
              src={preview}
              alt="Uniform Reference"
              className="w-20 h-20 object-contain pixelated"
            />
            <button
              onClick={clearImage}
              className="dropzone-clear-btn"
            >
              <X size={12} />
            </button>
          </div>
          <span className="text-grid-tag text-xs">Reference Loaded</span>
        </div>
      ) : (
        <div className="dropzone-info-group">
          <Upload size={24} className="text-[#8a8a93]" style={{ marginBottom: "4px" }} />
          <span className="dropzone-title">
            {isDragActive ? "Drop Reference File Here" : "Drag Reference Image"}
          </span>
          <span className="dropzone-subtitle">
            PNG, JPG, or WEBP (Max 1 file)
          </span>
        </div>
      )}
    </div>
  );
}
