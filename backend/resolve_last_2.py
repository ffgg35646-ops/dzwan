from pathlib import Path
import re

ROOT = Path.cwd()

print("=" * 75)
print("🔎 حل النقطتين 02 و42 + استخراج الـmounts الحقيقي")
print("=" * 75)

# =========================================================
# 1) Governorate
# =========================================================

print("\n[02] GOVERNORATES")

hits = []

for p in ROOT.glob("src/**/*.ts"):
    if "node_modules" in p.parts or "dist" in p.parts:
        continue

    text = p.read_text(encoding="utf-8", errors="ignore")

    if re.search(
        r"governorate|governorates|محافظ",
        text,
        re.I
    ):
        hits.append(p)

for p in sorted(set(hits)):
    print("✅", p.relative_to(ROOT))

# =========================================================
# 2) Backup
# =========================================================

print("\n[42] BACKUP")

hits = []

for p in ROOT.glob("src/**/*.ts"):
    if "node_modules" in p.parts or "dist" in p.parts:
        continue

    text = p.read_text(encoding="utf-8", errors="ignore")

    if re.search(
        r"\bbackup\b|\brestore\b|نسخ احتياط",
        text,
        re.I
    ):
        hits.append(p)

for p in sorted(set(hits)):
    print("✅", p.relative_to(ROOT))

# أيضًا scripts
for p in ROOT.glob("scripts/*"):
    text = ""
    if p.is_file():
        try:
            text = p.read_text(
                encoding="utf-8",
                errors="ignore"
            )
        except:
            pass

    if re.search(
        r"backup|restore",
        p.name + " " + text,
        re.I
    ):
        print("✅ SCRIPT", p.relative_to(ROOT))

# =========================================================
# 3) استخراج جميع router.use الحقيقية
# =========================================================

print("\n" + "=" * 75)
print("🔗 REAL ROUTER MOUNTS")
print("=" * 75)

mount_regexes = [
    re.compile(
        r'\.use\s*\(\s*[\'"`]([^\'"`]+)[\'"`]\s*,\s*([A-Za-z0-9_]+)',
        re.I
    ),
    re.compile(
        r'\.use\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)',
        re.I
    ),
]

for p in ROOT.glob("src/**/*.ts"):
    if "node_modules" in p.parts or "dist" in p.parts:
        continue

    text = p.read_text(
        encoding="utf-8",
        errors="ignore"
    )

    found = []

    for rx in mount_regexes:
        for m in rx.finditer(text):
            found.append(m.groups())

    if found:
        print(f"\n📄 {p.relative_to(ROOT)}")

        for prefix, router in found:
            print(
                f"   {prefix:45} -> {router}"
            )

# =========================================================
# 4) server.ts كامل حول app.use
# =========================================================

print("\n" + "=" * 75)
print("🖥️ SERVER MOUNTS")
print("=" * 75)

for rel in [
    "src/server.ts",
    "src/app.ts",
    "src/index.ts",
]:
    p = ROOT / rel

    if not p.exists():
        continue

    print(f"\n📄 {rel}")

    lines = p.read_text(
        encoding="utf-8",
        errors="ignore"
    ).splitlines()

    for i, line in enumerate(lines):
        if re.search(
            r"\.use\(|app\.use|router",
            line,
            re.I
        ):
            start = max(0, i - 2)
            end = min(len(lines), i + 4)

            print(
                "\n".join(
                    f"{j+1:4}: {lines[j]}"
                    for j in range(start, end)
                )
            )

# =========================================================
# 5) ملخص
# =========================================================

print("\n" + "=" * 75)
print("✅ انتهى")
print("=" * 75)
