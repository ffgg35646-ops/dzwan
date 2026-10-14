import type { CSSProperties } from "react";

// Same Zajel courier silhouette as the captain app: helmet, bag and motorcycle.
export default function MotorbikeIcon({
  size = 20,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{ display: "inline-block", verticalAlign: "middle", color: "inherit", flexShrink: 0, ...style }}
    >
      <circle cx="23" cy="76" r="14" stroke="currentColor" strokeWidth="6" />
      <circle cx="79" cy="76" r="14" stroke="currentColor" strokeWidth="6" />
      <path d="M23 76L40 55H61L79 76H52L41 65L34 76H23ZM61 55L72 48L81 50" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M56 58L67 76M42 53L39 46H30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <rect x="14" y="36" width="19" height="23" rx="4" fill="#F97316" />
      <path d="M18 42H29M23.5 39V46" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M46 28C46 21 51 16 58 16C65 16 70 21 70 28V31H46V28Z" fill="#174B9A" />
      <path d="M48 26H72" stroke="#FFB547" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="58" cy="33" r="7" fill="#F5B987" />
      <path d="M49 42L61 43L68 56L57 60L50 51L39 56" stroke="#174B9A" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M61 45L72 49L77 48" stroke="#F5B987" strokeWidth="4" strokeLinecap="round" />
      <path d="M57 59L45 68L35 68" stroke="#174B9A" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
