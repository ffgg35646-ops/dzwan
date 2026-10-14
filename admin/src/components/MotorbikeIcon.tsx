import type { CSSProperties } from "react";

// The same MaterialCommunityIcons motorbike glyph used by the captain app.
// admin/src/index.css already loads the original icon font.
export default function MotorbikeIcon({
  size = 20,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className="zajel-brand-icon"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        fontSize: size,
        lineHeight: 1,
        color: "inherit",
        flexShrink: 0,
        ...style,
      }}
    >
      {"\u{F037C}"}
    </span>
  );
}
