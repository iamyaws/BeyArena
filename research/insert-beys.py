"""Build a SQL UPSERT statement for beys table from catalog JSON, then run via Supabase Management API."""
import json
import os
import sys
import urllib.request
import subprocess
import tempfile

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "beyblade-x-catalog.json")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
PROJECT_ID = "utcoyyluspvcnyqkrvwy"

if not TOKEN:
    print("Set SUPABASE_ACCESS_TOKEN env var first", file=sys.stderr)
    sys.exit(1)

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    catalog = json.load(f)

beys = catalog["beys"]


def sql_str(s):
    """Escape a string for SQL literal."""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def sql_int(n):
    return "NULL" if n is None else str(n)


# Build VALUES tuples
values = []
for b in beys:
    name_en = b.get("name_en")
    name_jp = b.get("name_jp")
    product_code = b.get("product_code")
    type_val = b.get("type")  # already lowercase enum value
    line_val = b.get("line")  # already lowercase enum value
    image_url = b.get("image_url")
    source_url = b.get("source_url")
    stat_a = b.get("stat_attack")
    stat_d = b.get("stat_defense")
    stat_st = b.get("stat_stamina")
    stat_br = b.get("stat_burst_resistance")

    # Cast type/line via ::bey_type / ::bey_line
    type_lit = sql_str(type_val) + "::bey_type" if type_val else "NULL"
    line_lit = sql_str(line_val) + "::bey_line" if line_val else "NULL"

    values.append(
        f"({sql_str(name_en)}, {sql_str(name_jp)}, {sql_str(product_code)}, "
        f"{sql_str(image_url)}, {type_lit}, {line_lit}, "
        f"{sql_int(stat_a)}, {sql_int(stat_d)}, {sql_int(stat_st)}, {sql_int(stat_br)}, "
        f"{sql_str(source_url)}, true, NOW())"
    )

# Strategy: use staging temp table + LEFT JOIN to upsert without needing a "real" unique constraint.
# 1. Create temp table with the same shape
# 2. Insert all rows into temp table
# 3. UPDATE existing beys by source_url match
# 4. INSERT into beys those rows where source_url not present
sql = f"""
CREATE TEMP TABLE staging_beys (
    name_en text, name_jp text, product_code text, image_url text,
    type bey_type, line bey_line,
    stat_attack int, stat_defense int, stat_stamina int, stat_burst_resistance int,
    source_url text, canonical bool, scraped_at timestamptz
);
INSERT INTO staging_beys (
    name_en, name_jp, product_code, image_url, type, line,
    stat_attack, stat_defense, stat_stamina, stat_burst_resistance,
    source_url, canonical, scraped_at
) VALUES
{",\n".join(values)};

-- Update existing rows
UPDATE beys b
SET name_en = s.name_en,
    name_jp = s.name_jp,
    product_code = s.product_code,
    image_url = s.image_url,
    type = s.type,
    line = s.line,
    stat_attack = s.stat_attack,
    stat_defense = s.stat_defense,
    stat_stamina = s.stat_stamina,
    stat_burst_resistance = s.stat_burst_resistance,
    canonical = s.canonical,
    scraped_at = s.scraped_at
FROM staging_beys s
WHERE b.source_url = s.source_url;

-- Insert new rows
INSERT INTO beys (
    name_en, name_jp, product_code, image_url, type, line,
    stat_attack, stat_defense, stat_stamina, stat_burst_resistance,
    source_url, canonical, scraped_at
)
SELECT s.name_en, s.name_jp, s.product_code, s.image_url, s.type, s.line,
       s.stat_attack, s.stat_defense, s.stat_stamina, s.stat_burst_resistance,
       s.source_url, s.canonical, s.scraped_at
FROM staging_beys s
WHERE NOT EXISTS (SELECT 1 FROM beys b WHERE b.source_url = s.source_url);

DROP TABLE staging_beys;

-- Final report
SELECT name_en, product_code, type::text AS type, line::text AS line FROM beys ORDER BY product_code, name_en;
"""

# Execute via Supabase Management API using curl (avoids Cloudflare WAF blocking on python urllib)
payload = json.dumps({"query": sql})
with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
    f.write(payload)
    payload_path = f.name

try:
    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST",
            f"https://api.supabase.com/v1/projects/{PROJECT_ID}/database/query",
            "-H", f"Authorization: Bearer {TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", f"@{payload_path}",
        ],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode != 0:
        print(f"curl exit {result.returncode}: {result.stderr}", file=sys.stderr)
        sys.exit(2)
    response = json.loads(result.stdout)
    if isinstance(response, dict) and response.get("error"):
        print(f"DB error: {response}", file=sys.stderr)
        sys.exit(3)
    if isinstance(response, list):
        print(f"Upserted {len(response)} rows")
        for row in response[:10]:
            print(f"  - {row.get('name_en')} ({row.get('product_code')}) {row.get('type')}/{row.get('line')}")
        if len(response) > 10:
            print(f"  ...and {len(response)-10} more")
    else:
        print(f"Unexpected response: {response}", file=sys.stderr)
        sys.exit(4)
finally:
    os.unlink(payload_path)
