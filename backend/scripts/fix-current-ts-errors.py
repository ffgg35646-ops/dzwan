from pathlib import Path
import re
import shutil

ROOT = Path.cwd()

def backup(p: Path):
    b = p.with_suffix(p.suffix + ".before-current-ts-fix")
    if not b.exists():
        shutil.copy2(p, b)
        print(f"✅ Backup: {b}")

# ============================================================
# 1) captain-attendance: duplicate captainId
# ============================================================

p = ROOT / "src/controllers/captain-attendance.controller.ts"
backup(p)
s = p.read_text(encoding="utf-8")

# Remove consecutive duplicate captainId property.
s = re.sub(
    r'(\n\s*captainId,\s*)\n\s*captainId,\s*',
    r'\1',
    s,
    count=1,
)

p.write_text(s, encoding="utf-8")
print("✅ Fixed duplicate captainId")


# ============================================================
# 2) order.controller: attachCustomerSnapshots(orders)
#    was placed before orders was declared.
# ============================================================

p = ROOT / "src/controllers/order.controller.ts"
backup(p)
s = p.read_text(encoding="utf-8")

call = "await attachCustomerSnapshots(orders);"

# Remove misplaced calls first.
s = s.replace(call, "")

# Find the first declaration of orders in that controller.
m = re.search(
    r'(\s*const orders\s*=\s*await[\s\S]*?;\n)',
    s,
    flags=re.M,
)

if m:
    insert_at = m.end()
    s = s[:insert_at] + f"\n        {call}\n" + s[insert_at:]
    print("✅ Moved attachCustomerSnapshots after orders declaration")
else:
    print("⚠️ Could not locate orders declaration automatically")

p.write_text(s, encoding="utf-8")


# ============================================================
# 3) order.controller: Request params typing
# ============================================================

s = p.read_text(encoding="utf-8")

# Make the specific admin-decision-style handler accept params.
# Only change an unparameterized Request near the handler that
# accesses req.params.id.
needle = 'const orderId = String(req.params.id || "");'

idx = s.find(needle)

if idx != -1:
    start = max(0, s.rfind("\n", 0, idx - 2000))
    segment = s[start:idx]

    segment = re.sub(
        r'\breq:\s*Request\b',
        'req: Request<{ id: string }>',
        segment,
        count=1,
    )

    s = s[:start] + segment + s[idx:]
    print("✅ Fixed Request params typing")
else:
    print("⚠️ Could not locate req.params.id")


p.write_text(s, encoding="utf-8")


# ============================================================
# 4) order.routes: adminOrderDecision signature mismatch
# ============================================================

p = ROOT / "src/controllers/order.controller.ts"
s = p.read_text(encoding="utf-8")

# Detect swapped req/res in function declaration.
s = re.sub(
    r'(export\s+async\s+function\s+adminOrderDecision\s*\(\s*)'
    r'res:\s*Response\s*,\s*req:\s*Request(?:<[^>]+>)?',
    r'\1req: Request<{ id: string }>, res: Response',
    s,
    count=1,
)

# Also support const-style declaration.
s = re.sub(
    r'(const\s+adminOrderDecision\s*=\s*async\s*\(\s*)'
    r'res:\s*Response\s*,\s*req:\s*Request(?:<[^>]+>)?',
    r'\1req: Request<{ id: string }>, res: Response',
    s,
    count=1,
)

p.write_text(s, encoding="utf-8")
print("✅ Normalized adminOrderDecision handler")


# ============================================================
# 5) dispatch.service: rankDispatchCandidates returns
#    { captain, score }, not { candidate, score }
# ============================================================

p = ROOT / "src/services/dispatch.service.ts"
backup(p)
s = p.read_text(encoding="utf-8")

s = s.replace(
    "ranked[0]?.candidate ?? candidates[0]",
    "ranked[0]?.captain ?? candidates[0]",
)

p.write_text(s, encoding="utf-8")
print("✅ Fixed Smart Dispatch ranked result property")


print()
print("==============================================")
print("✅ CURRENT TYPESCRIPT ERRORS PATCHED")
print("==============================================")
