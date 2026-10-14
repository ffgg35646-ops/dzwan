import React from "react";
import { View } from "react-native";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapViewProps = {
  children?: React.ReactNode;
  style?: any;
  [key: string]: any;
};

type MarkerProps = {
  children?: React.ReactNode;
  coordinate?: Coordinate;
  title?: string;
  description?: string;
  pinColor?: string;
  [key: string]: any;
};

type PolylineProps = {
  coordinates?: Coordinate[];
  strokeColor?: string;
  strokeWidth?: number;
  [key: string]: any;
};

export default function MapViewWeb({
  children,
  style,
}: MapViewProps) {
  return <View style={style}>{children}</View>;
}

export function Marker({
  children,
}: MarkerProps) {
  return <>{children}</>;
}

export function Polyline(_props: PolylineProps) {
  return null;
}
