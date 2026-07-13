"""
Clustering and Embedding Generation for Minecraft Skins
Groups similar skins together and generates embeddings for fast retrieval.
"""

import json
import numpy as np
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import joblib


def load_features(features_path: str) -> tuple:
    """Load extracted features from JSON file."""
    with open(features_path, 'r') as f:
        data = json.load(f)
    
    filenames = [item['filename'] for item in data]
    vectors = np.array([item['vector'] for item in data])
    
    return filenames, vectors, data


def cluster_skins(vectors: np.ndarray, n_clusters: int = 500) -> tuple:
    """Cluster skins into groups of similar appearances."""
    print(f"Clustering {len(vectors)} skins into {n_clusters} groups...")
    
    # Normalize features
    scaler = StandardScaler()
    normalized = scaler.fit_transform(vectors)
    
    # Apply KMeans clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, verbose=1)
    cluster_labels = kmeans.fit_predict(normalized)
    
    # Save the model for later use
    print("Saving clustering model...")
    joblib.dump(scaler, 'reference_data/scaler.pkl')
    joblib.dump(kmeans, 'reference_data/kmeans_model.pkl')
    
    return cluster_labels, kmeans, scaler


def reduce_dimensions(vectors: np.ndarray, n_components: int = 50) -> tuple:
    """Reduce dimensionality for faster similarity search."""
    # n_components must be <= min(n_samples, n_features)
    max_components = min(vectors.shape[0], vectors.shape[1])
    n_components = min(n_components, max_components)
    
    print(f"Reducing dimensions from {vectors.shape[1]} to {n_components}...")
    
    scaler = StandardScaler()
    normalized = scaler.fit_transform(vectors)
    
    pca = PCA(n_components=n_components, random_state=42)
    reduced = pca.fit_transform(normalized)
    
    # Save the PCA model
    joblib.dump(pca, 'reference_data/pca_model.pkl')
    
    return reduced, pca, scaler


def find_cluster_representatives(vectors: np.ndarray, labels: np.ndarray) -> dict:
    """Find the most representative skin for each cluster."""
    representatives = {}
    
    unique_labels = np.unique(labels)
    
    for label in unique_labels:
        cluster_indices = np.where(labels == label)[0]
        cluster_vectors = vectors[cluster_indices]
        
        # Find the centroid of the cluster
        centroid = cluster_vectors.mean(axis=0)
        
        # Find the skin closest to the centroid
        distances = np.linalg.norm(cluster_vectors - centroid, axis=1)
        closest_idx = cluster_indices[np.argmin(distances)]
        
        representatives[int(label)] = {
            "representative_index": int(closest_idx),
            "cluster_size": len(cluster_indices),
            "members": cluster_indices.tolist()
        }
    
    return representatives


def generate_text_description(features: dict) -> str:
    """Generate a human-readable description from features."""
    stats = features.get("statistics", {})
    palette = features.get("palette", {})
    
    parts = []
    
    # Brightness category
    brightness = stats.get("brightness_category", "medium")
    parts.append(brightness)
    
    # Saturation category
    saturation = stats.get("saturation_category", "moderate")
    parts.append(saturation)
    
    # Dominant hue
    hue = stats.get("dominant_hue_category", "neutral")
    parts.append(hue)
    
    # Top colors
    colors = palette.get("colors", [])[:3]
    if colors:
        parts.append("colors: " + ", ".join(colors))
    
    return " ".join(parts)


def save_embeddings_for_turso(
    data: list,
    labels: np.ndarray,
    reduced_vectors: np.ndarray,
    output_path: str
):
    """Save embeddings in format ready for Turso database insertion."""
    output = []
    
    for i, item in enumerate(data):
        entry = {
            "filename": item["filename"],
            "cluster_id": int(labels[i]),
            "embedding": reduced_vectors[i].tolist(),
            "description": generate_text_description(item["features"]),
            "features": item["features"]
        }
        output.append(entry)
    
    output_file = Path(output_path) / "skin_embeddings.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Saved {len(output)} embeddings to {output_file}")
    
    return output


def main():
    features_path = "reference_data/skin_features.json"
    output_path = "reference_data"
    
    # Load features
    print("Loading features...")
    filenames, vectors, data = load_features(features_path)
    print(f"Loaded {len(vectors)} feature vectors")
    
    # Cluster skins
    n_clusters = min(500, len(vectors) // 10)  # Aim for ~10 skins per cluster
    labels, kmeans, scaler = cluster_skins(vectors, n_clusters=n_clusters)
    
    # Find representatives
    print("Finding cluster representatives...")
    representatives = find_cluster_representatives(vectors, labels)
    
    # Save representatives
    rep_file = Path(output_path) / "cluster_representatives.json"
    with open(rep_file, 'w') as f:
        json.dump(representatives, f, indent=2)
    print(f"Saved {len(representatives)} cluster representatives")
    
    # Reduce dimensions for embeddings
    reduced_vectors, pca, pca_scaler = reduce_dimensions(vectors, n_components=128)
    
    # Save embeddings for Turso
    save_embeddings_for_turso(data, labels, reduced_vectors, output_path)
    
    # Print summary
    print("\n=== Summary ===")
    print(f"Total skins: {len(data)}")
    print(f"Clusters: {n_clusters}")
    print(f"Embedding dimensions: {reduced_vectors.shape[1]}")
    print(f"Average cluster size: {len(data) / n_clusters:.1f}")
    
    # Show cluster size distribution
    unique, counts = np.unique(labels, return_counts=True)
    print(f"Min cluster size: {counts.min()}")
    print(f"Max cluster size: {counts.max()}")
    print(f"Median cluster size: {np.median(counts)}")


if __name__ == "__main__":
    main()
