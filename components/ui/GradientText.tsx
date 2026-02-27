import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface GradientTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  colors?: string[];
}

export default function GradientText({
  text,
  style,
  colors = ['#118FF3', '#0C5798'],
}: GradientTextProps) {
  const [start, end] = colors.length >= 2 ? colors : ['#118FF3', '#0C5798'];
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  const chars = [...text];
  const steps = Math.max(chars.length - 1, 1);

  return (
    <Text style={style}>
      {chars.map((char, index) => {
        const t = index / steps;
        const color = rgbToHex({
          r: Math.round(startRgb.r + (endRgb.r - startRgb.r) * t),
          g: Math.round(startRgb.g + (endRgb.g - startRgb.g) * t),
          b: Math.round(startRgb.b + (endRgb.b - startRgb.b) * t),
        });
        return (
          <Text key={`${char}-${index}`} style={{ color }}>
            {char}
          </Text>
        );
      })}
    </Text>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const normalized = cleaned.length === 3
    ? cleaned.split('').map((ch) => ch + ch).join('')
    : cleaned.padEnd(6, '0').slice(0, 6);
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}
