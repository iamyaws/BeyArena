"""Parse the two firecrawl_map JSON files, filter to Beyblade X content, categorize, and write url-inventory.json.

Each input file is a JSON array of {type, text} chunks; each `text` is itself a JSON
blob with shape {"links": [{"url", "title", "description"}, ...]}.

Filter signals (a URL is BX content if ANY apply):
  1. Description or title contains the literal phrase "Beyblade X" (case-insensitive).
  2. Slug matches the BX bey naming pattern: <Name>_<RatchetCode> e.g. PhoenixWing_9-60GF.
  3. Slug matches one of the curated BX-only allowlist entries (Phalanx, Pendragon, The_X, etc.).
"""
import io
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

# Force UTF-8 stdout for the Windows console.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CANON_FILE = Path(r"C:\Users\öööö\.claude\projects\C--Users-------basic-memory\e03918b0-5dec-4197-b1f2-165e33f9ab7f\tool-results\mcp-firecrawl-firecrawl_map-1777237187029.txt")
FANON_FILE = Path(r"C:\Users\öööö\.claude\projects\C--Users-------basic-memory\e03918b0-5dec-4197-b1f2-165e33f9ab7f\tool-results\mcp-firecrawl-firecrawl_map-1777237205770.txt")
OUT = Path(r"C:\Users\öööö\.basic-memory\beystadium-spec\research\url-inventory.json")


def load_links(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    outer = json.loads(raw)
    all_links: list[dict] = []
    for chunk in outer:
        text = chunk.get("text", "") if isinstance(chunk, dict) else ""
        if not text:
            continue
        try:
            inner = json.loads(text)
        except json.JSONDecodeError:
            continue
        for L in inner.get("links", []):
            if isinstance(L, dict) and "url" in L:
                all_links.append(L)
    return all_links


# --- Filtering ---------------------------------------------------------------

BX_PHRASE = re.compile(r"\bBeyblade\s+X\b", re.IGNORECASE)
# Bey naming pattern: Name_<optionalLetterPrefix><digits>-<digits><suffixLetters>
BX_BEY_PATTERN = re.compile(r"_[A-Z]?\d+-\d+[A-Z]+$")
META_PREFIXES = (
    "Special:", "User:", "Talk:", "File:", "Category:", "Template:", "Help:",
    "MediaWiki:", "User_talk:", "Forum:", "Blog:", "Project:", "Module:",
    "Message_Wall:", "Board:", "Board_Thread:", "Thread:", "User_blog:",
    "User_blog_comment:", "Source:",
)

# Slugs that are clearly BX-only (canon) but may not have "Beyblade X" in description.
CANON_BX_ALLOW = {
    "The_X", "Robin_Kazami", "Phalanx", "Pendragon", "Persona",
    "Xtreme_Dash", "X-Line", "Unique_Line", "Custom_Line", "Basic_Line",
    "X-Over_Project", "Cross_Corporation", "Future_Pros",
    "Nine_Kurosu", "Zero_Kurosu", "One_Kurosu",
    "Tenka_Shiroboshi", "Omega_Shiroboshi", "Ginro", "Gigatani", "Packun",
    "Beyblade_City", "Type",
}


def slug_from(url: str) -> str:
    if "/wiki/" not in url:
        return ""
    s = url.split("/wiki/", 1)[1].split("?")[0].split("#")[0]
    return unquote(s)


def is_meta_page(slug: str) -> bool:
    return any(slug.startswith(m) for m in META_PREFIXES)


def is_bx(link: dict, slug: str) -> bool:
    blob = (link.get("description") or "") + " | " + (link.get("title") or "")
    if BX_PHRASE.search(blob):
        return True
    if BX_BEY_PATTERN.search(slug):
        return True
    if slug in CANON_BX_ALLOW:
        return True
    return False


# --- Categorization ----------------------------------------------------------

# Known canonical bey *names* (no part suffix). Stripped from full slug.
KNOWN_BEY_STEMS = {
    "DranSword", "DranBuster", "DranBrave", "DranStrike", "DranzerSpiral",
    "KnightShield", "KnightLance",
    "HellsScythe", "HellsHammer", "HellsReaper", "HellsChain",
    "WizardArrow", "WizardRod",
    "SphinxCowl", "SharkEdge", "SharkScale",
    "LeonCrest", "LeonClaw",
    "TyrannoBeat",
    "PhoenixWing", "PhoenixFeather",
    "CobaltDrake", "CobaltDragoon",
    "UnicornSting", "UnicornDelta",
    "RhinoHorn",
    "CrimsonGaruda",
    "SteelSamurai", "SamuraiSaber",
    "BlackShell",
    "WeissTiger", "ViperTail",
    "GoldTurnstone", "RoarTyranno",
    "SavageBear", "YellKong",
    "SilverWolf", "IronBoar",
    "HoverWyvern", "WyvernGale",
    "GhostCircle", "TalonPtera",
    "BulletLion", "BulletGriffon",
    "TuskMammoth", "MammothTusk",
    "AeroPegasus", "WhaleWave",
    "ImpactDrake", "MeteorDragoon",
    "OrochiCluster", "ValkyrieVolt", "SolEclipse",
    "RagnaRage",
}

KNOWN_CHARACTER_STEMS = {
    "Robin_Kazami", "Bird_Kazami", "Bird_Maboroshi", "Maboroshi_Bird",
    "Multi_Nakajima", "Nakajima_Multi",
    "Hyuga_Asahi", "Asahi_Hyuga",
    "Hikaru_Hayato", "Hayato_Hikaru",
    "Ekusu_Kurusu", "Ekusu_Kurosu", "Ekusu",
    "Karunaa", "Hou_Iizuka",
    "Lui_Shirosagi", "Shirosagi_Lui",
    "Atsushi_Kurosagi", "Tatsuya_Hidaka", "Yuni_Hidaka",
    "Lan_Valhalla", "Krad_Norse",
    "Tenka_Shiroboshi", "Omega_Shiroboshi",
    "Ginro", "Gigatani", "Packun",
    "Nine_Kurosu", "Zero_Kurosu", "One_Kurosu",
    "Jaxon_Cross",
    "Sazanaki", "Hannah_Hannibal", "Rhys_Phantom",
    "Multi_Nanairo",
}

KNOWN_TEAM_STEMS = {
    "Persona", "Pendragon", "Phalanx", "Phantom",
    "Future_Pros", "Cross_Corporation", "Right_Above", "Vagabond",
}

KNOWN_LOCATION_STEMS = {
    "The_X", "Xenon_City", "Xenon_Tower", "X_Tower", "Animal_Castle",
    "Beyblade_City", "Sazanaki_Stadium", "Suiba",
}

KNOWN_TERM_STEMS = {
    "Xtreme_Finish", "Burst_Finish", "Over_Finish", "Spin_Finish",
    "Xtreme_Dash", "X-Line", "X_Line", "X-Dash",
    "X-Gear", "X_Gear", "X-Tournament", "X_Tournament",
    "Unique_Line", "Custom_Line", "Basic_Line", "Type",
    "Hall_of_Fame_(Beyblade_X)",
}

ITEM_TOKENS = (
    "_Stadium", "Stadium_(", "_Launcher", "Launcher_(",
    "String_Launcher", "Sword_Launcher", "Winder_Launcher",
    "Random_Booster", "Booster_(", "_Set", "Bundle_Pack",
    "Customize_Set", "Customize_Set_U", "Battle_Entry_Set",
    "Battle_Pass", "Tournament_(Beyblade_X)", "Expansion_Pack",
    "Multipack", "Anniversary_Set", "Deck_Set",
    "App", "(app)",
)

EPISODE_RE = re.compile(
    r"(Episode_\d+|Chapter_\d+|"
    r"_Episodes?\b|_Chapters?\b|"
    r"List_of_Beyblade_X_episodes|List_of_Beyblade_X_chapters|"
    r"Beyblade_X_-_Episode|Beyblade_X_\(Season|"
    r"_\(Season_\d+\))",
    re.IGNORECASE,
)


def categorize(slug: str) -> str:
    s = slug
    stem = s.split("_(")[0]

    # Episodes / seasons / chapters first.
    if EPISODE_RE.search(s):
        return "episodes"

    # Stadiums + launchers + product codes (BX-XX) belong to items.
    if re.match(r"^BX-?\d+", s):
        return "items"
    if any(t in s for t in ITEM_TOKENS):
        return "items"
    # "List of X products / Customs / Generic Beyblades in Beyblade X" -> items (catalogs).
    if s.startswith("List_of_") and ("Beyblade_X" in s or "Basic_Line" in s):
        return "items"
    # Video games / apps with "Beyblade_X:" prefix (Xone, EvoBattle, etc.) -> items.
    if s.startswith("Beyblade_X:_") or s.startswith("Beyblade_X_App") or s.startswith("Beyblade_X_(app"):
        return "items"
    # X-Over_Project = manga/multi-series collab event -> terms.
    if s == "X-Over_Project":
        return "terms"

    # Beys: stem-name match, OR a slug that matches the BX bey-naming pattern.
    if stem in KNOWN_BEY_STEMS:
        return "beys"
    if BX_BEY_PATTERN.search(s):
        return "beys"
    if any(b in s for b in KNOWN_BEY_STEMS):
        return "beys"

    # Parts: ratchet pattern alone, or known part terms.
    if re.match(r"^\d+-\d+(?:_\(Beyblade_X\))?$", s):
        return "parts"
    if any(t in s for t in ("Bit_-_", "Blade_(Beyblade_X)", "Ratchet")):
        return "parts"

    # Characters.
    if stem in KNOWN_CHARACTER_STEMS or s in KNOWN_CHARACTER_STEMS:
        return "characters"
    if any(c in s for c in KNOWN_CHARACTER_STEMS):
        return "characters"

    # Teams.
    if stem in KNOWN_TEAM_STEMS or s in KNOWN_TEAM_STEMS:
        return "teams"

    # Locations.
    if stem in KNOWN_LOCATION_STEMS or s in KNOWN_LOCATION_STEMS:
        return "locations"

    # Terms / mechanics.
    if stem in KNOWN_TERM_STEMS or s in KNOWN_TERM_STEMS:
        return "terms"
    if "Finish" in s or "X-Dash" in s or "Xtreme" in s or "X-Line" in s:
        return "terms"

    return "uncategorized"


def build(links: list[dict]) -> tuple[dict, int]:
    buckets: dict[str, list[dict]] = {
        k: [] for k in ("beys", "parts", "characters", "teams",
                        "locations", "episodes", "terms", "items", "uncategorized")
    }
    seen = set()
    raw_total = len(links)
    for L in links:
        url = L.get("url", "")
        slug = slug_from(url)
        if not slug or is_meta_page(slug):
            continue
        if not is_bx(L, slug):
            continue
        if slug in seen:
            continue
        seen.add(slug)
        cat = categorize(slug)
        buckets[cat].append({"url": url, "slug": slug})
    return buckets, raw_total


def main():
    canon_links = load_links(CANON_FILE)
    fanon_links = load_links(FANON_FILE)

    canon_buckets, canon_raw = build(canon_links)
    fanon_buckets, fanon_raw = build(fanon_links)

    out = {"canon": canon_buckets, "fanon": fanon_buckets}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    def summary(label: str, raw_total: int, buckets: dict):
        filtered = sum(len(v) for v in buckets.values())
        print(f"\n=== {label} ===")
        print(f"  raw URLs: {raw_total}")
        print(f"  filtered to BX content: {filtered}")
        for cat, items in buckets.items():
            print(f"  {cat:>15s}: {len(items):>3d}")
            for s in items[:5]:
                print(f"      - {s['slug']}")

    summary("CANON (beyblade.fandom.com)", canon_raw, canon_buckets)
    summary("FANON (beybladefanon.fandom.com)", fanon_raw, fanon_buckets)
    print(f"\nWrote: {OUT}")


if __name__ == "__main__":
    main()
