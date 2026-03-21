import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

interface EmptyListingsSvgProps {
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Empty state illustration for My Listings — house outline with plus.
 */
export function EmptyListingsSvg({
  width = 140,
  height = 120,
  color = '#9CA3AF',
}: EmptyListingsSvgProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 120" fill="none">
      <G opacity={0.6}>
        {/* House body */}
        <Path
          d="M70 20 L110 55 L110 100 L30 100 L30 55 Z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Roof peak */}
        <Path
          d="M70 20 L30 55 L70 55 L110 55 Z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Door */}
        <Path
          d="M58 100 L58 72 L82 72 L82 100 Z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Plus circle */}
        <Circle cx={95} cy={35} r={18} stroke={color} strokeWidth={2} fill="none" />
        <Path
          d="M95 28 L95 42 M88 35 L102 35"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
