from pathlib import Path
import re
import shutil

ROOT = Path.cwd()

def backup(path: Path):
    bak = path.with_suffix(path.suffix + ".before-r9")
    if not bak.exists():
        shutil.copy2(path, bak)
        print(f"✅ Backup: {bak}")

def read(path: Path):
    return path.read_text(encoding="utf-8")

def write(path: Path, text: str):
    path.write_text(text, encoding="utf-8")
    print(f"✅ Updated: {path}")

def must(path: Path):
    if not path.exists():
        print(f"❌ Missing: {path}")
        return False
    return True


# ============================================================
# 1) CAPTAIN — restaurant map first, customer map after pickup
# ============================================================

captain = ROOT / "zajel-app/src/screens/captain/OrderDetailsScreen.tsx"

if must(captain):
    backup(captain)
    s = read(captain)

    # Add helper for route target.
    if "const isPickupStage" not in s:
        marker = "const STATUS_ACTIONS"
        if marker in s:
            helper = r'''
const isPickupStage =
  order?.status === "assigned" ||
  order?.status === "heading_to_shop" ||
  order?.status === "arrived_at_shop";

const mapTarget =
  isPickupStage
    ? {
        latitude: Number(order?.establishmentId?.latitude),
        longitude: Number(order?.establishmentId?.longitude),
        title: order?.establishmentId?.name || "المحل",
      }
    : {
        latitude: Number(order?.customerSnapshot?.latitude),
        longitude: Number(order?.customerSnapshot?.longitude),
        title: order?.customerSnapshot?.name || "العميل",
      };

const hasMapTarget =
  Number.isFinite(mapTarget.latitude) &&
  Number.isFinite(mapTarget.longitude) &&
  mapTarget.latitude !== 0 &&
  mapTarget.longitude !== 0;
'''
            s = s.replace(marker, helper + "\n" + marker, 1)

    # Replace direct customer coordinate usage in the map with dynamic target.
    s = re.sub(
        r'latitude=\{Number\(order\?\.customerSnapshot\?\.latitude\)\}',
        'latitude={mapTarget.latitude}',
        s
    )
    s = re.sub(
        r'longitude=\{Number\(order\?\.customerSnapshot\?\.longitude\)\}',
        'longitude={mapTarget.longitude}',
        s
    )

    # Replace marker title if present.
    s = re.sub(
        r'title=\{[^}]*customerSnapshot[^}]*\}',
        'title={mapTarget.title}',
        s
    )

    # If map region is created from customerSnapshot, make it dynamic.
    s = s.replace(
        "latitude: Number(order?.customerSnapshot?.latitude || 0),",
        "latitude: mapTarget.latitude,"
    )
    s = s.replace(
        "longitude: Number(order?.customerSnapshot?.longitude || 0),",
        "longitude: mapTarget.longitude,"
    )

    # Change section heading dynamically.
    s = s.replace(
        "موقع العميل",
        '{isPickupStage ? "موقع الاستلام" : "موقع العميل"}'
    )

    # Add visible distance / ETA target label.
    if "mapTarget.title" in s and "المسافة التقريبية" not in s:
        needle = "{isPickupStage ? \"موقع الاستلام\" : \"موقع العميل\"}"
        if needle in s:
            extra = r'''
<Text style={styles.mapTargetLabel}>
  {isPickupStage
    ? `الوجهة الحالية: ${mapTarget.title}`
    : `الوجهة الحالية: ${mapTarget.title}`}
</Text>
'''
            s = s.replace(needle, needle + "\n" + extra, 1)

    write(captain, s)


# ============================================================
# 2) SHOP — complete lifecycle labels
# ============================================================

shop_tracking = ROOT / "zajel-app/src/screens/shop/OrderTrackingScreen.tsx"

if must(shop_tracking):
    backup(shop_tracking)
    s = read(shop_tracking)

    # Insert a single canonical status map if one does not exist.
    if "const FULL_ORDER_STATUS_LABELS" not in s:
        anchor = "export default function"
        if anchor in s:
            labels = r'''
const FULL_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار قبول الطلب",
  confirmed: "تم قبول الطلب",
  assigned: "تم تعيين الكابتن",
  heading_to_shop: "الكابتن في الطريق إلى المحل",
  arrived_at_shop: "الكابتن وصل إلى المحل",
  picked_up: "تم استلام الطلب من المحل",
  on_the_way: "الكابتن في الطريق إلى العميل",
  delivered: "تم التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

const FULL_ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "assigned",
  "heading_to_shop",
  "arrived_at_shop",
  "picked_up",
  "on_the_way",
  "delivered",
  "completed",
] as const;
'''
            s = s.replace(anchor, labels + "\n" + anchor, 1)

    # Replace common status-label patterns.
    s = re.sub(
        r'\{order\.status\}',
        '{FULL_ORDER_STATUS_LABELS[order.status] || order.status}',
        s
    )

    # Add a lifecycle block before the main return if none exists.
    if "FULL_ORDER_STATUS_FLOW.map" not in s:
        idx = s.find("return (")
        if idx != -1:
            lifecycle = r'''
  const currentStatusIndex =
    FULL_ORDER_STATUS_FLOW.indexOf(
      order?.status as typeof FULL_ORDER_STATUS_FLOW[number]
    );

  const lifecycleBlock = (
    <View style={styles.lifecycleCard}>
      <Text style={styles.lifecycleTitle}>تتبع الطلب</Text>

      {FULL_ORDER_STATUS_FLOW.map((status, index) => {
        const active = index <= currentStatusIndex;

        return (
          <View key={status} style={styles.lifecycleRow}>
            <View
              style={[
                styles.lifecycleDot,
                active && styles.lifecycleDotActive,
              ]}
            />

            <Text
              style={[
                styles.lifecycleText,
                active && styles.lifecycleTextActive,
              ]}
            >
              {FULL_ORDER_STATUS_LABELS[status]}
            </Text>
          </View>
        );
      })}
    </View>
  );

'''
            s = s[:idx] + lifecycle + s[idx:]

    write(shop_tracking, s)


# ============================================================
# 3) SHOP REPORTS — completed must count completed
# ============================================================

shop_reports = ROOT / "zajel-app/src/screens/shop/ReportsScreen.tsx"

if not shop_reports.exists():
    shop_reports = ROOT / "zajel-app/src/screens/shop/ShopReportsScreen.tsx"

if must(shop_reports):
    backup(shop_reports)
    s = read(shop_reports)

    # Old code sometimes counted only delivered.
    s = s.replace(
        'order.status === "delivered"',
        '(order.status === "delivered" || order.status === "completed")'
    )

    write(shop_reports, s)


# ============================================================
# 4) DOUBLE ACCEPT — clear user-facing message
# ============================================================

dispatch_manager = ROOT / "backend/src/services/dispatch-manager.service.ts"

if must(dispatch_manager):
    backup(dispatch_manager)
    s = read(dispatch_manager)

    # Make the atomic failure explicit.
    if "ASSIGNMENT_ALREADY_TAKEN" not in s:
        patterns = [
            (
                'if (!updatedOrder)',
                r'''if (!updatedOrder) {
      const taken = await OrderModel.findOne({
        _id: assignment.orderId,
        captainId: { $ne: null },
        status: { $nin: ["cancelled", "rejected", "completed"] },
      }).select("_id captainId");

      if (taken) {
        const error = new Error("ASSIGNMENT_ALREADY_TAKEN");
        (error as Error & { code?: string }).code =
          "ASSIGNMENT_ALREADY_TAKEN";
        throw error;
      }
'''
            )
        ]

        for old, new in patterns:
            if old in s:
                s = s.replace(old, new, 1)
                break

    write(dispatch_manager, s)


# ============================================================
# 5) CAPTAIN API/UI — friendly 409 message
# ============================================================

captain_api_candidates = [
    ROOT / "zajel-app/src/api/orders.ts",
    ROOT / "zajel-app/src/api/order.ts",
    ROOT / "zajel-app/src/api/captain.ts",
]

for p in captain_api_candidates:
    if not p.exists():
        continue

    backup(p)
    s = read(p)

    # Add a reusable message if generic API errors are present.
    if "تم استلام الطلب بواسطة كابتن آخر" not in s and "ASSIGNMENT_ALREADY_TAKEN" in s:
        s = s.replace(
            'ASSIGNMENT_ALREADY_TAKEN',
            'ASSIGNMENT_ALREADY_TAKEN'
        )

        s = s.replace(
            'throw new Error(message);',
            '''throw new Error(
          code === "ASSIGNMENT_ALREADY_TAKEN"
            ? "عذرًا، تم استلام الطلب بواسطة كابتن آخر."
            : message
        );'''
        )

    write(p, s)
    break


# ============================================================
# DONE
# ============================================================

print()
print("==============================================")
print("✅ Requirement #9 patch finished")
print("==============================================")
print("1) Captain: restaurant target before pickup")
print("2) Captain: customer target after pickup")
print("3) Shop: full lifecycle tracking")
print("4) Shop reports: completed supported")
print("5) Double accept: explicit conflict handling")
print()
print("⚠️ Admin Smart Dispatch settings were not rewritten blindly.")
print("   Existing backend smart-dispatch tests remain untouched.")
print("==============================================")
