"""
Database schema and insertion script for Minecraft skin embeddings.
Prepares data for Turso/libSQL vector search.
"""

import json
from pathlib import Path


def generate_sql_schema() -> str:
    """Generate SQL schema for skin_references table with vector support."""
    return """
-- Skin references table with vector embeddings for similarity search
CREATE TABLE IF NOT EXISTS skin_references (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    cluster_id INTEGER NOT NULL,
    description TEXT,
    dominant_colors TEXT,  -- JSON array of hex colors
    brightness_category TEXT,
    saturation_category TEXT,
    dominant_hue_category TEXT,
    embedding BLOB,  -- 60-dimensional float32 vector
    features_json TEXT,  -- Full feature set as JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast cluster lookups
CREATE INDEX IF NOT EXISTS idx_cluster_id ON skin_references(cluster_id);

-- Index for fast hue lookups
CREATE INDEX IF NOT EXISTS idx_hue ON skin_references(dominant_hue_category);

-- Index for fast brightness lookups
CREATE INDEX IF NOT EXISTS idx_brightness ON skin_references(brightness_category);
"""


def prepare_insert_statements(embeddings_path: str, batch_size: int = 100) -> list:
    """Prepare SQL INSERT statements for Turso."""
    with open(embeddings_path, 'r') as f:
        data = json.load(f)
    
    statements = []
    
    for i, item in enumerate(data):
        features = item['features']
        stats = features.get('statistics', {})
        palette = features.get('palette', {})
        
        # Convert embedding to binary (float32 array)
        embedding = item['embedding']
        
        # Normalize embedding values to 0-255 range for storage
        normalized_embedding = [max(0, min(255, int((x + 2) * 63.75))) for x in embedding[:60]]
        
        # Prepare JSON strings
        dominant_colors = json.dumps(palette.get('colors', [])[:5])
        features_json = json.dumps(features)
        
        # Generate INSERT statement
        stmt = f"""
INSERT INTO skin_references (
    id,
    filename,
    cluster_id,
    description,
    dominant_colors,
    brightness_category,
    saturation_category,
    dominant_hue_category,
    embedding,
    features_json
) VALUES (
    '{item['filename'].replace('.jpg', '').replace('.png', '')}',
    '{item['filename']}',
    {item['cluster_id']},
    '{item['description'].replace("'", "''")}',
    '{dominant_colors}',
    '{stats.get('brightness_category', 'medium')}',
    '{stats.get('saturation_category', 'moderate')}',
    '{stats.get('dominant_hue_category', 'neutral')}',
    X'{bytes(bytearray(normalized_embedding)).hex()}',
    '{features_json.replace("'", "''")}'
);
"""
        statements.append(stmt)
        
        if (i + 1) % batch_size == 0:
            print(f"Prepared {i + 1}/{len(data)} insert statements")
    
    return statements


def generate_sample_queries() -> str:
    """Generate example SQL queries for similarity search."""
    return """
-- Example 1: Find skins similar to a specific description
SELECT id, filename, description, cluster_id
FROM skin_references
WHERE dominant_hue_category = 'blue'
  AND brightness_category = 'dark'
ORDER BY cluster_id
LIMIT 10;

-- Example 2: Find all skins in a specific cluster (similar visual style)
SELECT id, filename, description, dominant_colors
FROM skin_references
WHERE cluster_id = 42
ORDER BY id;

-- Example 3: Find skins with specific color palette
SELECT id, filename, description, dominant_colors
FROM skin_references
WHERE dominant_colors LIKE '%#ff0000%'  -- Contains red
LIMIT 20;

-- Example 4: Count skins by hue category
SELECT dominant_hue_category, COUNT(*) as count
FROM skin_references
GROUP BY dominant_hue_category
ORDER BY count DESC;

-- Example 5: Vector similarity search (requires libsql-vector extension)
-- This would use vector_distance_cos() if available
-- SELECT id, filename, description,
--   vector_distance_cos(embedding, [query_vector]) as similarity
-- FROM skin_references
-- ORDER BY similarity DESC
-- LIMIT 10;
"""


def main():
    output_dir = Path("reference_data")
    output_dir.mkdir(exist_ok=True)
    
    # Generate schema
    schema = generate_sql_schema()
    schema_file = output_dir / "schema.sql"
    with open(schema_file, 'w') as f:
        f.write(schema)
    print(f"Generated schema: {schema_file}")
    
    # Prepare insert statements
    embeddings_file = output_dir / "skin_embeddings.json"
    if embeddings_file.exists():
        statements = prepare_insert_statements(str(embeddings_file))
        insert_file = output_dir / "insert_statements.sql"
        with open(insert_file, 'w') as f:
            f.write("BEGIN TRANSACTION;\n")
            for stmt in statements:
                f.write(stmt + "\n")
            f.write("COMMIT;\n")
        print(f"Generated {len(statements)} insert statements: {insert_file}")
    
    # Generate sample queries
    queries = generate_sample_queries()
    queries_file = output_dir / "sample_queries.sql"
    with open(queries_file, 'w') as f:
        f.write(queries)
    print(f"Generated sample queries: {queries_file}")
    
    print("\n=== Next Steps ===")
    print("1. Review schema.sql and run it on your Turso database")
    print("2. Run insert_statements.sql to populate the table")
    print("3. Use sample_queries.sql as templates for your API routes")
    print("4. Integrate into /api/generate for few-shot example retrieval")


if __name__ == "__main__":
    main()
