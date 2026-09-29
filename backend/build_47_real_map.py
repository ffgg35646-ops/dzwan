from pathlib import Path
import re
import json

ROOT = Path.cwd()

REQ = {
    1:  ["auth", "admin", "permission"],
    2:  ["governorate"],
    3:  ["area"],
    4:  ["pricing"],
    5:  ["establishment", "registration"],
    6:  ["establishment", "location"],
    7:  ["customer", "snapshot", "order"],
    8:  ["order", "intake"],
    9:  ["order", "lifecycle", "status"],
    10: ["dispatch"],
    11: ["shift", "strict-shift", "shift-policy"],
    12: ["attendance"],
    13: ["captain-registration", "registration"],
    14: ["captain"],
    15: ["work-area"],
    16: ["dispatch", "maxActiveOrders", "operations"],
    17: ["cash"],
    18: ["ledger", "cash"],
    19: ["delivery-proof"],
    20: ["pickup", "completion"],
    21: ["order-note", "order", "notes"],
    22: ["rating"],
    23: ["kpi", "performance"],
    24: ["establishment-report"],
    25: ["reports"],
    26: ["dashboard"],
    27: ["notification"],
    28: ["complaint"],
    29: ["timeline"],
    30: ["timer", "stage"],
    31: ["stuck"],
    32: ["redispatch", "dispatch"],
    33: ["emergency"],
    34: ["audit"],
    35: ["sub-admin", "staff"],
    36: ["permission", "staff-permission"],
    37: ["document", "compliance"],
    38: ["version", "app-version"],
    39: ["version", "force"],
    40: ["security"],
    41: ["search"],
    42: ["backup"],
    43: ["maintenance"],
    44: ["system-settings", "settings", "central"],
    45: ["geofence"],
    46: ["cancellation", "cancel"],
    47: ["notification", "event"],
}

def norm(s):
    return s.lower().replace("_", "-")

def score_file(path, words):
    s = norm(str(path))
    return sum(1 for w in words if norm(w) in s)

# ------------------------------------------------------------
# Collect source files
# ------------------------------------------------------------

source = []
for p in ROOT.glob("src/**/*.ts"):
    if "node_modules" not in p.parts and "dist" not in p.parts:
        source.append(p)

# ------------------------------------------------------------
# Extract route definitions
# ------------------------------------------------------------

routes = []

rx1 = re.compile(
    r'\brouter\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[\'"`]([^\'"`]+)',
    re.I,
)

rx2 = re.compile(
    r'\bapp\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[\'"`]([^\'"`]+)',
    re.I,
)

for p in source:
    text = p.read_text(encoding="utf-8", errors="ignore")
    rel = str(p.relative_to(ROOT))

    for m in rx1.finditer(text):
        routes.append({
            "method": m.group(1).upper(),
            "path": m.group(2),
            "file": rel,
        })

    for m in rx2.finditer(text):
        routes.append({
            "method": m.group(1).upper(),
            "path": m.group(2),
            "file": rel,
        })

unique = {}
for r in routes:
    unique[
        (r["method"], r["path"], r["file"])
    ] = r

routes = list(unique.values())

# ------------------------------------------------------------
# Controller / Service files
# ------------------------------------------------------------

controllers = list(ROOT.glob("src/controllers/*.ts"))
services = list(ROOT.glob("src/services/*.ts"))
models = list(ROOT.glob("src/models/*.ts"))
route_files = list(ROOT.glob("src/routes/*.ts"))

# ------------------------------------------------------------
# Map route file -> routes
# ------------------------------------------------------------

by_route_file = {}

for r in routes:
    by_route_file.setdefault(
        r["file"],
        []
    ).append(r)

# ------------------------------------------------------------
# Match each requirement
# ------------------------------------------------------------

mapping = []

for num, words in REQ.items():
    route_hits = []
    controller_hits = []
    service_hits = []
    model_hits = []

    # Routes
    for r in routes:
        hay = norm(
            r["file"] + " " + r["path"]
        )

        if any(norm(w) in hay for w in words):
            route_hits.append(r)

    # Controllers
    for p in controllers:
        if score_file(p, words):
            controller_hits.append(
                str(p.relative_to(ROOT))
            )

    # Services
    for p in services:
        if score_file(p, words):
            service_hits.append(
                str(p.relative_to(ROOT))
            )

    # Models
    for p in models:
        if score_file(p, words):
            model_hits.append(
                str(p.relative_to(ROOT))
            )

    # Status
    if route_hits or controller_hits or service_hits or model_hits:
        status = "FOUND"
    else:
        status = "NOT_FOUND"

    mapping.append({
        "number": num,
        "keywords": words,
        "status": status,
        "routes": route_hits[:30],
        "controllers": controller_hits[:15],
        "services": service_hits[:15],
        "models": model_hits[:15],
    })

# ------------------------------------------------------------
# Actual auth contract
# ------------------------------------------------------------

auth = {
    "routes": [
        r for r in routes
        if "auth" in norm(r["file"])
    ],
    "controllers": [
        str(p.relative_to(ROOT))
        for p in controllers
        if "auth" in norm(p.name)
    ],
}

# ------------------------------------------------------------
# Actual order contract
# ------------------------------------------------------------

order_contract = {
    "routes": [
        r for r in routes
        if "order" in norm(r["file"])
    ],
    "controllers": [
        str(p.relative_to(ROOT))
        for p in controllers
        if "order" in norm(p.name)
    ],
    "services": [
        str(p.relative_to(ROOT))
        for p in services
        if "order" in norm(p.name)
    ],
}

# ------------------------------------------------------------
# Print
# ------------------------------------------------------------

print()
print("=" * 80)
print("DZWAN / ZAJEL — REAL 47 REQUIREMENTS MAP")
print("=" * 80)

for item in mapping:
    icon = "✅" if item["status"] == "FOUND" else "❌"

    print(
        f'{icon} {item["number"]:02d} '
        f'{" / ".join(item["keywords"])}'
    )

    if item["routes"]:
        print("   Routes:")
        for r in item["routes"][:8]:
            print(
                f'      {r["method"]:6} '
                f'{r["path"]:45} '
                f'[{r["file"]}]'
            )

    if item["controllers"]:
        print("   Controllers:")
        for x in item["controllers"][:5]:
            print("      ", x)

    if item["services"]:
        print("   Services:")
        for x in item["services"][:5]:
            print("      ", x)

    if item["models"]:
        print("   Models:")
        for x in item["models"][:5]:
            print("      ", x)

    print()

# ------------------------------------------------------------
# Save JSON
# ------------------------------------------------------------

report = {
    "backend": str(ROOT),
    "requirements": mapping,
    "auth": auth,
    "orderContract": order_contract,
}

Path("DZWAN_47_REAL_MAP.json").write_text(
    json.dumps(
        report,
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)

# ------------------------------------------------------------
# Save compact markdown-like text
# ------------------------------------------------------------

out = []

out.append("# DZWAN / ZAJEL — REAL 47 MAP")
out.append("")

for item in mapping:
    out.append(
        f'## {item["number"]:02d} — '
        f'{" / ".join(item["keywords"])}'
    )

    out.append(
        f'Status: {item["status"]}'
    )

    if item["routes"]:
        out.append("Routes:")
        for r in item["routes"][:15]:
            out.append(
                f'- {r["method"]} {r["path"]} '
                f'[{r["file"]}]'
            )

    if item["controllers"]:
        out.append("Controllers:")
        for x in item["controllers"][:10]:
            out.append(f"- {x}")

    if item["services"]:
        out.append("Services:")
        for x in item["services"][:10]:
            out.append(f"- {x}")

    if item["models"]:
        out.append("Models:")
        for x in item["models"][:10]:
            out.append(f"- {x}")

    out.append("")

Path("DZWAN_47_REAL_MAP.md").write_text(
    "\n".join(out),
    encoding="utf-8",
)

print("=" * 80)
print("✅ DZWAN_47_REAL_MAP.json")
print("✅ DZWAN_47_REAL_MAP.md")
print("=" * 80)

found = sum(
    1 for x in mapping
    if x["status"] == "FOUND"
)

print(
    f"FOUND: {found}/47"
)

print()
print("📌 Auth:")
for r in auth["routes"]:
    print(
        f'  {r["method"]} {r["path"]} [{r["file"]}]'
    )

print()
print("📌 Order:")
for r in order_contract["routes"]:
    print(
        f'  {r["method"]} {r["path"]} [{r["file"]}]'
    )

print()
print("الآن أصبح لدينا خريطة مبنية على Backend الحقيقي.")
