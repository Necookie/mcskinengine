"""
Minecraft Skin Feature Extraction Pipeline
Extracts visual features from 64x64 Minecraft skin PNGs for embedding generation.
No AI vision models needed - pure pixel analysis.
"""

import os
import json
import numpy as np
from PIL import Image
from pathlib import Path
from collections import Counter
import colorsys


def extract_color_palette(image_path: str, n_colors: int = 8) -> dict:
    """Extract dominant colors from a Minecraft skin image."""
    img = Image.open(image_path).convert('RGBA')
    pixels = np.array(img)
    
    # Flatten to list of RGB tuples (ignore alpha)
    rgb_pixels = pixels[:, :, :3].reshape(-1, 3)
    
    # Filter out fully transparent pixels
    alpha = pixels[:, :, 3].flatten()
    visible_pixels = rgb_pixels[alpha > 128]
    
    if len(visible_pixels) == 0:
        return {"colors": [], "distribution": []}
    
    # Quantize colors to reduce noise (round to nearest 16)
    quantized = (visible_pixels // 16) * 16
    
    # Count color frequencies
    color_counts = Counter(map(tuple, quantized))
    
    # Get top N colors
    top_colors = color_counts.most_common(n_colors)
    
    total_pixels = len(visible_pixels)
    colors = []
    distribution = []
    
    for color, count in top_colors:
        hex_color = '#{:02x}{:02x}{:02x}'.format(*color)
        colors.append(hex_color)
        distribution.append(count / total_pixels)
    
    return {
        "colors": colors,
        "distribution": distribution,
        "total_visible_pixels": total_pixels
    }


def extract_regional_features(image_path: str) -> dict:
    """Extract features from specific regions of the Minecraft skin."""
    img = Image.open(image_path).convert('RGBA')
    pixels = np.array(img)
    
    # Minecraft skin layout (64x64):
    # Head: 0-8 x, 0-8 y (front), 8-16 x, 0-8 y (side)
    # Body: 16-24 x, 16-20 y (front), 24-32 x, 16-20 y (side)
    # Legs: 0-8 x, 16-20 y (left leg), 8-16 x, 16-20 y (right leg)
    # Arms: 36-40 x, 48-52 y (left arm), 44-48 x, 48-52 y (right arm)
    
    regions = {
        "head": pixels[0:8, 0:8],
        "body": pixels[16:20, 16:24],
        "left_leg": pixels[16:20, 0:8],
        "right_leg": pixels[16:20, 8:16],
    }
    
    features = {}
    
    for region_name, region_pixels in regions.items():
        rgb = region_pixels[:, :, :3].reshape(-1, 3)
        alpha = region_pixels[:, :, 3].flatten()
        visible = rgb[alpha > 128]
        
        if len(visible) == 0:
            features[region_name] = {
                "avg_color": "#000000",
                "color_variance": 0,
                "coverage": 0
            }
            continue
        
        # Average color
        avg_color = visible.mean(axis=0).astype(int)
        avg_hex = '#{:02x}{:02x}{:02x}'.format(*avg_color)
        
        # Color variance (how diverse the colors are)
        variance = visible.var(axis=0).mean()
        
        # Coverage (how much of the region is non-transparent)
        total_pixels = region_pixels.shape[0] * region_pixels.shape[1]
        coverage = len(visible) / total_pixels
        
        features[region_name] = {
            "avg_color": avg_hex,
            "color_variance": float(variance),
            "coverage": float(coverage)
        }
    
    return features


def extract_color_statistics(image_path: str) -> dict:
    """Extract overall color statistics from the skin."""
    img = Image.open(image_path).convert('RGBA')
    pixels = np.array(img)
    
    rgb = pixels[:, :, :3].reshape(-1, 3)
    alpha = pixels[:, :, 3].flatten()
    visible = rgb[alpha > 128]
    
    if len(visible) == 0:
        return {}
    
    # Convert to HSV for better color analysis
    hsv = np.array([colorsys.rgb_to_hsv(r/255, g/255, b/255) for r, g, b in visible])
    
    # Overall statistics
    stats = {
        "avg_hue": float(hsv[:, 0].mean()),
        "avg_saturation": float(hsv[:, 1].mean()),
        "avg_brightness": float(hsv[:, 2].mean()),
        "hue_variance": float(hsv[:, 0].var()),
        "saturation_variance": float(hsv[:, 1].var()),
        "brightness_variance": float(hsv[:, 2].var()),
        "dominant_hue_category": categorize_hue(hsv[:, 0].mean()),
        "brightness_category": categorize_brightness(hsv[:, 2].mean()),
        "saturation_category": categorize_saturation(hsv[:, 1].mean())
    }
    
    return stats


def categorize_hue(hue: float) -> str:
    """Categorize hue value into color family."""
    if hue < 0.02 or hue > 0.98:
        return "red"
    elif hue < 0.08:
        return "orange"
    elif hue < 0.18:
        return "yellow"
    elif hue < 0.42:
        return "green"
    elif hue < 0.52:
        return "cyan"
    elif hue < 0.70:
        return "blue"
    elif hue < 0.85:
        return "purple"
    else:
        return "pink"


def categorize_brightness(brightness: float) -> str:
    """Categorize brightness into dark/medium/light."""
    if brightness < 0.3:
        return "dark"
    elif brightness < 0.7:
        return "medium"
    else:
        return "light"


def categorize_saturation(saturation: float) -> str:
    """Categorize saturation into muted/vivid."""
    if saturation < 0.3:
        return "muted"
    elif saturation < 0.7:
        return "moderate"
    else:
        return "vivid"


def extract_all_features(image_path: str) -> dict:
    """Extract all features from a single skin image."""
    palette = extract_color_palette(image_path)
    regional = extract_regional_features(image_path)
    stats = extract_color_statistics(image_path)
    
    return {
        "palette": palette,
        "regional": regional,
        "statistics": stats
    }


def generate_feature_vector(features: dict) -> np.ndarray:
    """Convert extracted features into a fixed-size numerical vector for embedding."""
    vector = []
    
    # Palette features (8 colors × 3 channels = 24 values)
    for color_hex in features["palette"]["colors"]:
        r = int(color_hex[1:3], 16) / 255.0
        g = int(color_hex[3:5], 16) / 255.0
        b = int(color_hex[5:7], 16) / 255.0
        vector.extend([r, g, b])
    
    # Pad if fewer than 8 colors
    while len(vector) < 24:
        vector.extend([0, 0, 0])
    
    # Color distribution (8 values)
    vector.extend(features["palette"]["distribution"][:8])
    while len(vector) < 32:
        vector.append(0)
    
    # Regional features (4 regions × 3 features = 12 values)
    for region in ["head", "body", "left_leg", "right_leg"]:
        region_data = features["regional"][region]
        # Average color
        avg_color = region_data["avg_color"]
        r = int(avg_color[1:3], 16) / 255.0
        g = int(avg_color[3:5], 16) / 255.0
        b = int(avg_color[5:7], 16) / 255.0
        vector.extend([r, g, b])
        # Variance and coverage
        vector.append(region_data["color_variance"] / 1000.0)  # Normalize
        vector.append(region_data["coverage"])
    
    # Statistics (8 values)
    stats = features["statistics"]
    vector.extend([
        stats["avg_hue"],
        stats["avg_saturation"],
        stats["avg_brightness"],
        stats["hue_variance"] / 0.1,  # Normalize
        stats["saturation_variance"] / 0.1,
        stats["brightness_variance"] / 0.1,
        1 if stats["dominant_hue_category"] == "red" else 0,
        1 if stats["brightness_category"] == "dark" else 0
    ])
    
    return np.array(vector, dtype=np.float32)


def process_dataset(dataset_path: str, output_path: str):
    """Process all skins in the dataset and save features."""
    dataset_dir = Path(dataset_path)
    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Find all image files
    image_files = list(dataset_dir.glob("*.jpg")) + list(dataset_dir.glob("*.png"))
    
    print(f"Found {len(image_files)} images to process")
    
    results = []
    
    for i, img_path in enumerate(image_files):
        if (i + 1) % 100 == 0:
            print(f"Processing {i + 1}/{len(image_files)}...")
        
        try:
            features = extract_all_features(str(img_path))
            feature_vector = generate_feature_vector(features)
            
            results.append({
                "filename": img_path.name,
                "features": features,
                "vector": feature_vector.tolist()
            })
        except Exception as e:
            print(f"Error processing {img_path.name}: {e}")
            continue
    
    # Save results
    output_file = output_dir / "skin_features.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Processed {len(results)} skins successfully")
    print(f"Features saved to {output_file}")
    
    return results


if __name__ == "__main__":
    # Process the dataset
    dataset_path = r"C:\Users\dheyn\Downloads\archive\skins"
    output_path = r"C:\Users\dheyn\Documents\02_Dev\mcskinengine\reference_data"
    
    results = process_dataset(dataset_path, output_path)
