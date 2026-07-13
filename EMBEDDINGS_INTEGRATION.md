# Skin Embeddings Integration

## What Was Built

A complete pipeline for processing 7,916 Minecraft skin images and integrating them into the AI generation system as few-shot examples.

## Pipeline Overview

### 1. Feature Extraction (Python)
- **Script**: `scripts/extract_features.py`
- **Input**: 7,916 skin images from `C:\Users\dheyn\Downloads\archive\skins`
- **Output**: `reference_data/skin_features.json` (24MB)
- **Features extracted**:
  - Color palettes (top 8 dominant colors)
  - Regional features (head, body, legs)
  - HSV statistics (hue, saturation, brightness)
  - Color categories (dark/medium/light, muted/vivid, hue families)

### 2. Clustering & Embedding (Python)
- **Script**: `scripts/cluster_and_embed.py`
- **Output**: `reference_data/skin_embeddings.json` (27MB)
- **Process**:
  - KMeans clustering (500 clusters, avg 15.8 skins per cluster)
  - PCA dimensionality reduction (60-dimensional embeddings)
  - Cluster representative identification

### 3. Database Population (TypeScript)
- **Script**: `scripts/populate-skin-db.ts`
- **Database**: Turso/libSQL `skin_references` table
- **Records**: 7,916 skins with full feature metadata
- **Indexes**: cluster_id, dominant_hue_category, brightness_category

### 4. Runtime Integration (TypeScript)
- **Module**: `src/lib/skinRetrieval.ts`
- **Integration**: `src/app/api/generate/route.ts`
- **Process**:
  1. Extract keywords from user prompt (colors, styles, brightness)
  2. Query `skin_references` table for matching examples
  3. Format 3 examples as few-shot demonstrations
  4. Inject into AI prompt before generation

## How It Works

### User Prompt Flow

```
User: "emo girl with blonde hair and red tie"
  ↓
Keyword Extraction:
  - Colors: ["blonde", "red"]
  - Styles: ["emo"]
  - Brightness: null
  ↓
Database Query:
  SELECT * FROM skin_references
  WHERE dominant_hue_category IN ('yellow', 'red')
  ORDER BY RANDOM()
  LIMIT 3
  ↓
Retrieved Examples:
  1. "medium moderate yellow colors: #f0c090, #705040"
  2. "dark vivid red colors: #cc0000, #330000"
  3. "light moderate pink colors: #ff99cc, #663366"
  ↓
AI Prompt Injection:
  "Here are examples of high-quality parameter choices..."
  [3 examples with colors and styles]
  ↓
AI Generation:
  - Better color choices (informed by examples)
  - More specific style attributes
  - Less generic defaults
```

## Database Schema

```sql
CREATE TABLE skin_references (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  cluster_id INTEGER NOT NULL,
  description TEXT,
  dominant_colors TEXT,  -- JSON array
  brightness_category TEXT,
  saturation_category TEXT,
  dominant_hue_category TEXT,
  embedding BLOB,  -- 60-dim vector (not yet used for similarity search)
  features_json TEXT,  -- Full feature set
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Cost Analysis

| Component | Cost |
|-----------|------|
| Feature extraction (Python) | $0 |
| Clustering (scikit-learn) | $0 |
| Database storage (Turso) | ~$0/month (within free tier) |
| Runtime queries | $0 (SQL queries) |
| **Total** | **$0** |

**vs AI vision tagging**: ~$50-100 for 7,916 images

## Performance

- **Database insertion**: ~2 minutes (batched)
- **Runtime query**: <50ms (indexed)
- **Memory footprint**: ~50MB (embeddings loaded on demand)

## Future Enhancements

1. **Vector similarity search**: Use Turso's vector extension for cosine similarity on embeddings
2. **Dynamic example selection**: Weight examples by recency, quality scores, or user preferences
3. **Incremental learning**: Add new skins to the database as users generate them
4. **Multi-modal retrieval**: Combine text embeddings with image embeddings for better matching

## Files Generated

- `reference_data/skin_features.json` (24MB) - Raw features
- `reference_data/skin_embeddings.json` (27MB) - Embeddings + metadata
- `reference_data/cluster_representatives.json` (152KB) - 500 cluster centroids
- `reference_data/schema.sql` - Database schema
- `reference_data/insert_statements.sql` (12MB) - SQL inserts

All reference data is gitignored to keep the repo lean.
