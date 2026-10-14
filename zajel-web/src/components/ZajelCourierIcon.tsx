import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

// Zajel courier mark: the rider, delivery bag and motorcycle are one vector.
export default function ZajelCourierIcon({
  size = 48,
  color = "#E5501C",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Circle cx="23" cy="76" r="14" stroke={color} strokeWidth="6" />
      <Circle cx="79" cy="76" r="14" stroke={color} strokeWidth="6" />
      <Path d="M23 76L40 55H61L79 76H52L41 65L34 76H23ZM61 55L72 48L81 50" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M56 58L67 76M42 53L39 46H30" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <Rect x="14" y="36" width="19" height="23" rx="4" fill="#F97316" />
      <Path d="M18 42H29M23.5 39V46" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M46 28C46 21 51 16 58 16C65 16 70 21 70 28V31H46V28Z" fill="#174B9A" />
      <Path d="M48 26H72" stroke="#FFB547" strokeWidth="3.5" strokeLinecap="round" />
      <Circle cx="58" cy="33" r="7" fill="#F5B987" />
      <Path d="M49 42L61 43L68 56L57 60L50 51L39 56" stroke="#174B9A" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M61 45L72 49L77 48" stroke="#F5B987" strokeWidth="4" strokeLinecap="round" />
      <Path d="M57 59L45 68L35 68" stroke="#174B9A" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
