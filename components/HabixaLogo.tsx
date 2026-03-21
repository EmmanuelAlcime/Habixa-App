import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { ViewStyle } from 'react-native';

type HabixaLogoProps = {
  width?: number;
  height?: number;
  variant?: 'dark' | 'light' | 'terracotta' | 'sage';
  style?: ViewStyle;
};

const variantColors = {
  dark: {
    houseFill: '#1E2D45',
    roofFill: '#0F1623',
    houseStroke: '#89B4C8',
    door: '#C2673A',
    keyhole: '#F5EFE6',
    windows: '#D4A843',
    chimney: '#1E2D45',
    ground: '#5C7C6F',
  },
  light: {
    houseFill: '#E8DDD0',
    roofFill: '#D4C9BC',
    houseStroke: '#5C7C6F',
    door: '#C2673A',
    keyhole: '#F5EFE6',
    windows: '#D4A843',
    chimney: '#D4C9BC',
    ground: '#5C7C6F',
  },
  terracotta: {
    houseFill: 'rgba(255,255,255,0.15)',
    roofFill: 'rgba(255,255,255,0.08)',
    houseStroke: 'rgba(255,255,255,0.6)',
    door: 'rgba(255,255,255,0.9)',
    keyhole: '#C2673A',
    windows: 'rgba(255,255,255,0.8)',
    chimney: '#C2673A',
    ground: 'rgba(255,255,255,0.5)',
  },
  sage: {
    houseFill: 'rgba(255,255,255,0.12)',
    roofFill: 'rgba(255,255,255,0.06)',
    houseStroke: 'rgba(255,255,255,0.5)',
    door: '#C2673A',
    keyhole: '#F5EFE6',
    windows: '#D4A843',
    chimney: '#5C7C6F',
    ground: 'rgba(255,255,255,0.4)',
  },
};

export function HabixaLogo({
  width = 68,
  height = 72,
  variant = 'dark',
  style,
}: HabixaLogoProps) {
  const c = variantColors[variant];

  return (
    <Svg width={width} height={height} viewBox="0 0 68 72" fill="none" style={style}>
      <Path
        d="M34 4 L64 28 L64 68 L4 68 L4 28 Z"
        fill={c.houseFill}
        stroke={c.houseStroke}
        strokeWidth={1.5}
      />
      <Path
        d="M34 4 L64 28 L4 28 Z"
        fill={c.roofFill}
        stroke={c.houseStroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M22 68 L22 48 Q22 38 34 38 Q46 38 46 48 L46 68 Z"
        fill={c.door}
      />
      <Circle cx="34" cy="50" r="5" fill={c.keyhole} />
      <Path d="M31 55 Q31 60 34 63 Q37 60 37 55 Z" fill={c.keyhole} />
      <Rect x="8" y="34" width="10" height="10" rx="2" fill="none" stroke={c.windows} strokeWidth={1.2} />
      <Line x1="13" y1="34" x2="13" y2="44" stroke={c.windows} strokeWidth={0.8} />
      <Line x1="8" y1="39" x2="18" y2="39" stroke={c.windows} strokeWidth={0.8} />
      <Rect x="50" y="34" width="10" height="10" rx="2" fill="none" stroke={c.windows} strokeWidth={1.2} />
      <Line x1="55" y1="34" x2="55" y2="44" stroke={c.windows} strokeWidth={0.8} />
      <Line x1="50" y1="39" x2="60" y2="39" stroke={c.windows} strokeWidth={0.8} />
      <Rect x="48" y="10" width="6" height="14" rx="1" fill={c.chimney} stroke={c.houseStroke} strokeWidth={1} />
      <Line x1="0" y1="68" x2="68" y2="68" stroke={c.ground} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
