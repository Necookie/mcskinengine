"""
Heuristic mapper: Converts visual features to ApparelResult parameters.
This allows us to generate concrete examples for the AI without using vision models.
"""

import json
import colorsys
from pathlib import Path


STENCIL_KEYS = ["hoodie", "blazer", "labcoat", "crewneck", "tracksuit", "bomber", "summer-dress", "skirt-top"]
HAIR_STYLE_KEYS = ["messy-fringe", "undercut", "long-curly", "parted-curtains", "short-spiky", "ponytail", "twin-braids", "long-straight", "bob", "buzz-cut", "side-part"]
EYE_STYLE_KEYS = ["cool-highlight", "shadow-2x2", "anime-glowing", "classic-simple", "long-lashes", "soft-round", "narrow-serious"]
PATTERN_KEYS = ["knit", "tweed", "pinstripe", "denim", "flannel", "plaid", "corduroy", "ribbed", "leather", "grunge", "none"]
ACCESSORY_KEYS = ["glasses", "headphones", "mask", "beard", "eyebrows", "freckles", "blush", "lipstick", "earrings"]


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple (0-255)."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Convert RGB to hex string."""
    return f"#{int(r):02x}{int(g):02x}{int(b):02x}"


def rgb_to_hsv(r: int, g: int, b: int) -> tuple:
    """Convert RGB (0-255) to HSV (0-1)."""
    return colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)


def is_skin_tone(r: int, g: int, b: int) -> bool:
    """Check if a color is likely a skin tone."""
    h, s, v = rgb_to_hsv(r, g, b)
    # Skin tones are typically in the orange/yellow range with moderate saturation
    return (0.05 < h < 0.15) and (0.2 < s < 0.6) and (0.3 < v < 0.9)


def pick_stencil(features: dict, cluster_id: int) -> str:
    """Pick stencil based on body complexity and cluster diversity."""
    body_var = features['regional']['body']['color_variance']
    n_colors = len([d for d in features['palette']['distribution'] if d > 0.05])
    
    # Complexity score
    complexity = (body_var / 1000) + (n_colors / 8)
    
    if complexity > 1.5:
        options = ['jacket', 'armor_plate', 'blazer']
    elif complexity > 1.0:
        options = ['hoodie', 'robe', 'jacket']
    elif complexity > 0.5:
        options = ['tshirt', 'hoodie', 'dress']
    else:
        options = ['dress', 'tshirt', 'tank_top']
    
    # Use cluster_id for diversity within same complexity
    return options[cluster_id % len(options)]


def pick_hair_style(features: dict, cluster_id: int) -> str:
    """Pick hair style based on head region characteristics."""
    head_var = features['regional']['head']['color_variance']
    head_coverage = features['regional']['head']['coverage']
    brightness = features['statistics']['avg_brightness']
    
    if head_coverage < 0.2:
        # Low coverage = bald or very short hair
        options = ['buzz-cut', 'short-spiky', 'undercut']
    elif head_var > 500:
        # High variance = messy or multi-toned
        options = ['messy-fringe', 'long-curly', 'spiky']
    elif brightness < 0.3:
        # Dark hair
        options = ['long-straight', 'bob', 'ponytail']
    else:
        # Normal variance
        options = ['side-part', 'parted-curtains', 'bob']
    
    return options[cluster_id % len(options)]


def pick_eye_style(features: dict, cluster_id: int) -> str:
    """Pick eye style based on brightness and saturation."""
    brightness = features['statistics']['avg_brightness']
    saturation = features['statistics']['avg_saturation']
    
    if brightness < 0.3:
        options = ['narrow-serious', 'shadow-2x2', 'cool-highlight']
    elif saturation > 0.6:
        options = ['anime-glowing', 'cool-highlight', 'long-lashes']
    elif brightness > 0.7:
        options = ['soft-round', 'classic-simple', 'long-lashes']
    else:
        options = ['classic-simple', 'soft-round', 'shadow-2x2']
    
    return options[cluster_id % len(options)]


def pick_shading_mode(features: dict) -> str:
    """Pick shading mode based on contrast."""
    brightness_var = features['statistics']['brightness_variance']
    saturation = features['statistics']['avg_saturation']
    brightness = features['statistics']['avg_brightness']
    
    # High contrast or dark = graphic
    if brightness_var > 0.05 or (brightness < 0.3 and saturation < 0.3):
        return 'graphic'
    return 'soft'


def pick_palette_mode(features: dict) -> str:
    """Pick palette mode based on hue relationships."""
    colors = features['palette']['colors'][:4]
    
    if len(colors) < 2:
        return 'monochrome'
    
    # Calculate hues
    hues = []
    for color_hex in colors:
        r, g, b = hex_to_rgb(color_hex)
        h, s, v = rgb_to_hsv(r, g, b)
        if s > 0.1:  # Only count saturated colors
            hues.append(h * 360)
    
    if len(hues) < 2:
        return 'monochrome'
    
    hue_spread = max(hues) - min(hues)
    
    if hue_spread < 30:
        return 'monochrome'
    elif hue_spread < 80:
        return 'analogous'
    elif hue_spread < 120:
        return 'triadic'
    elif hue_spread > 150:
        return 'complementary'
    else:
        return 'full'


def pick_style_vibe(features: dict) -> str:
    """Pick style vibe based on color characteristics."""
    saturation = features['statistics']['avg_saturation']
    brightness = features['statistics']['avg_brightness']
    
    # High saturation + dark = masculine
    if saturation > 0.5 and brightness < 0.4:
        return 'masculine'
    # Low saturation + light = feminine
    elif saturation < 0.3 and brightness > 0.6:
        return 'feminine'
    return 'neutral'


def pick_accessories(features: dict, cluster_id: int) -> list:
    """Pick accessories based on color distribution."""
    distribution = features['palette']['distribution']
    
    # If there are small accent colors (< 5%), might have accessories
    small_colors = [d for d in distribution if 0.02 < d < 0.05]
    
    if len(small_colors) > 0:
        options = ['glasses', 'headphones', 'eyebrows', 'freckles']
        n_accessories = min(2, len(small_colors))
        return [options[(cluster_id + i) % len(options)] for i in range(n_accessories)]
    
    return []


def pick_detail_texture(features: dict, cluster_id: int) -> str:
    """Pick detail texture based on color distribution entropy."""
    distribution = features['palette']['distribution']
    
    # Calculate entropy
    entropy = 0
    for p in distribution:
        if p > 0:
            entropy -= p * (p ** 0.5)  # Simplified entropy
    
    if entropy > 0.5:
        options = ['knit', 'camo', 'denim']
    elif entropy > 0.3:
        options = ['stripe', 'plaid', 'flannel']
    else:
        options = ['solid', 'none', 'ribbed']
    
    return options[cluster_id % len(options)]


def extract_colors(features: dict) -> dict:
    """Extract color assignments from palette."""
    colors = features['palette']['colors']
    distribution = features['palette']['distribution']
    
    # Separate skin/hair tones from clothing colors
    clothing_colors = []
    skin_color = "#c68d5f"  # Default
    hair_color = "#3a2a1a"  # Default
    
    for i, color_hex in enumerate(colors):
        r, g, b = hex_to_rgb(color_hex)
        
        if is_skin_tone(r, g, b) and skin_color == "#c68d5f":
            skin_color = color_hex
        elif distribution[i] > 0.15 and hair_color == "#3a2a1a":
            # Most common dark color is likely hair
            h, s, v = rgb_to_hsv(r, g, b)
            if v < 0.5:
                hair_color = color_hex
            else:
                clothing_colors.append(color_hex)
        else:
            clothing_colors.append(color_hex)
    
    # Assign clothing colors
    primary = clothing_colors[0] if len(clothing_colors) > 0 else "#4a5568"
    secondary = clothing_colors[1] if len(clothing_colors) > 1 else "#2d3748"
    trim = clothing_colors[2] if len(clothing_colors) > 2 else "#e2e8f0"
    
    # Additional colors
    shirt = clothing_colors[3] if len(clothing_colors) > 3 else secondary
    tie = clothing_colors[4] if len(clothing_colors) > 4 else trim
    pants = clothing_colors[5] if len(clothing_colors) > 5 else secondary
    shoes = clothing_colors[6] if len(clothing_colors) > 6 else "#1a1a1a"
    
    # Eye color: use a bright accent or default
    eye_color = "#4a90e2"  # Default blue
    
    return {
        "primary": primary,
        "secondary": secondary,
        "trim": trim,
        "shirt": shirt,
        "tie": tie,
        "pants": pants,
        "shoes": shoes,
        "skinColor": skin_color,
        "hairColor": hair_color,
        "eyeColor": eye_color,
    }


def generate_apparel_result(features: dict, cluster_id: int) -> dict:
    """Generate complete ApparelResult from visual features."""
    colors = extract_colors(features)
    
    return {
        **colors,
        "stencilKey": pick_stencil(features, cluster_id),
        "hairStyle": pick_hair_style(features, cluster_id),
        "eyeStyle": pick_eye_style(features, cluster_id),
        "detailTexture": pick_detail_texture(features, cluster_id),
        "styleVibe": pick_style_vibe(features),
        "shadingMode": pick_shading_mode(features),
        "paletteMode": pick_palette_mode(features),
        "accessories": pick_accessories(features, cluster_id),
    }


def main():
    features_path = Path("reference_data/skin_features.json")
    output_path = Path("reference_data/skin_apparel.json")
    
    print("Loading features...")
    with open(features_path, 'r') as f:
        data = json.load(f)
    
    print(f"Generating ApparelResult for {len(data)} skins...")
    results = []
    
    for i, item in enumerate(data):
        if (i + 1) % 1000 == 0:
            print(f"Processing {i + 1}/{len(data)}...")
        
        # We need cluster_id from embeddings
        # For now, use a hash of filename to get consistent cluster assignment
        cluster_id = hash(item['filename']) % 500
        
        apparel_result = generate_apparel_result(item['features'], cluster_id)
        
        results.append({
            "filename": item['filename'],
            "apparel_result": apparel_result,
        })
    
    print(f"Saving to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Done! Generated {len(results)} ApparelResult entries")


if __name__ == "__main__":
    main()
