import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { PositionSlot } from '@/constants/formations';
import { PlayerPosition } from '@/types/database';

const PITCH_GREEN = '#2D8B4E';
const PITCH_GREEN_LIGHT = '#35A05A';
const PITCH_LINE = 'rgba(255,255,255,0.35)';
const PITCH_RATIO = 1.45; // height / width

interface PlayerOnPitch {
  positionKey: string;
  playerName: string;
  jerseyNumber: number | null;
  positions?: PlayerPosition[]; // player's actual positions
}

interface PitchViewProps {
  positions: PositionSlot[];
  players: Record<string, PlayerOnPitch>;  // keyed by position key
  onPositionPress?: (positionKey: string) => void;
  readOnly?: boolean;
}

// Map formation position keys to PlayerPosition categories
function getPositionCategory(posKey: string): PlayerPosition {
  const key = posKey.replace(/[0-9]/g, '').toUpperCase();
  if (key === 'GK') return 'goalkeeper';
  if (['CB', 'LB', 'RB', 'LCB', 'RCB', 'LWB', 'RWB', 'SW'].includes(key)) return 'defender';
  if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'DM', 'AM'].includes(key)) return 'midfielder';
  // ST, LW, RW, CF, SS, etc.
  return 'forward';
}

// Get eligibility color: green = primary match, yellow = secondary, red = no match
function getEligibilityColor(posKey: string, playerPositions?: PlayerPosition[]): string | null {
  if (!playerPositions || playerPositions.length === 0) return null;

  const requiredCategory = getPositionCategory(posKey);

  // Primary position is first in the array
  if (playerPositions[0] === requiredCategory) return '#10B981'; // green
  if (playerPositions.includes(requiredCategory)) return '#F59E0B'; // yellow
  return '#EF4444'; // red
}

export default function PitchView({ positions, players, onPositionPress, readOnly }: PitchViewProps) {
  const screenWidth = Dimensions.get('window').width;
  const pitchWidth = screenWidth - 40; // 20px padding each side
  const pitchHeight = pitchWidth * PITCH_RATIO;

  return (
    <View style={[styles.pitch, { width: pitchWidth, height: pitchHeight }]}>
      {/* Pitch stripes */}
      <View style={[styles.stripe, { top: 0, height: '14.3%' }]} />
      <View style={[styles.stripeLight, { top: '14.3%', height: '14.3%' }]} />
      <View style={[styles.stripe, { top: '28.6%', height: '14.3%' }]} />
      <View style={[styles.stripeLight, { top: '42.9%', height: '14.3%' }]} />
      <View style={[styles.stripe, { top: '57.2%', height: '14.3%' }]} />
      <View style={[styles.stripeLight, { top: '71.5%', height: '14.3%' }]} />
      <View style={[styles.stripe, { top: '85.8%', height: '14.2%' }]} />

      {/* Pitch markings */}
      <View style={styles.outerBorder} />
      <View style={styles.centerLine} />
      <View style={styles.centerCircle} />
      <View style={styles.centerDot} />
      <View style={styles.topPenaltyBox} />
      <View style={styles.topGoalBox} />
      <View style={styles.bottomPenaltyBox} />
      <View style={styles.bottomGoalBox} />

      {/* Player positions */}
      {positions.map(pos => {
        const player = players[pos.key];
        const hasPlayer = !!player;
        const eligibilityColor = hasPlayer ? getEligibilityColor(pos.key, player.positions) : null;

        return (
          <TouchableOpacity
            key={pos.key}
            disabled={readOnly && !hasPlayer}
            onPress={() => onPositionPress?.(pos.key)}
            activeOpacity={0.7}
            style={[
              styles.positionDot,
              {
                left: `${pos.x - 5.5}%`,
                top: `${pos.y - 4}%`,
              },
            ]}
          >
            <View style={[
              styles.playerCircle,
              hasPlayer ? styles.playerFilled : styles.playerEmpty,
              hasPlayer && eligibilityColor && { borderColor: eligibilityColor, borderWidth: 3 },
            ]}>
              {hasPlayer ? (
                <Text style={styles.jerseyNumber}>
                  {player.jerseyNumber ?? '?'}
                </Text>
              ) : (
                <Text style={styles.plusIcon}>+</Text>
              )}
            </View>
            {/* Eligibility dot indicator */}
            {hasPlayer && eligibilityColor && (
              <View style={[styles.eligibilityDot, { backgroundColor: eligibilityColor }]} />
            )}
            <Text style={styles.positionLabel} numberOfLines={1}>
              {hasPlayer ? player.playerName.split(' ').pop() : pos.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pitch: {
    backgroundColor: PITCH_GREEN,
    borderRadius: UI.radius.lg,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
  },
  stripe: {
    position: 'absolute', left: 0, right: 0, backgroundColor: PITCH_GREEN,
  },
  stripeLight: {
    position: 'absolute', left: 0, right: 0, backgroundColor: PITCH_GREEN_LIGHT,
  },
  outerBorder: {
    position: 'absolute', top: '3%', left: '5%', right: '5%', bottom: '3%',
    borderWidth: 1.5, borderColor: PITCH_LINE, borderRadius: 2,
  },
  centerLine: {
    position: 'absolute', top: '50%', left: '5%', right: '5%',
    height: 1.5, backgroundColor: PITCH_LINE,
  },
  centerCircle: {
    position: 'absolute', top: '50%', left: '50%',
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 1.5, borderColor: PITCH_LINE,
    marginLeft: -30, marginTop: -30,
  },
  centerDot: {
    position: 'absolute', top: '50%', left: '50%',
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: PITCH_LINE, marginLeft: -3, marginTop: -3,
  },
  topPenaltyBox: {
    position: 'absolute', top: '3%', left: '20%', right: '20%', height: '15%',
    borderWidth: 1.5, borderColor: PITCH_LINE, borderTopWidth: 0,
  },
  topGoalBox: {
    position: 'absolute', top: '3%', left: '33%', right: '33%', height: '7%',
    borderWidth: 1.5, borderColor: PITCH_LINE, borderTopWidth: 0,
  },
  bottomPenaltyBox: {
    position: 'absolute', bottom: '3%', left: '20%', right: '20%', height: '15%',
    borderWidth: 1.5, borderColor: PITCH_LINE, borderBottomWidth: 0,
  },
  bottomGoalBox: {
    position: 'absolute', bottom: '3%', left: '33%', right: '33%', height: '7%',
    borderWidth: 1.5, borderColor: PITCH_LINE, borderBottomWidth: 0,
  },
  positionDot: {
    position: 'absolute', width: '11%', alignItems: 'center', zIndex: 10,
  },
  playerCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  playerFilled: {
    backgroundColor: Colors.surface, borderColor: Colors.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  playerEmpty: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.5)', borderStyle: 'dashed',
  },
  jerseyNumber: {
    fontSize: 14, fontFamily: UI.typography.bold, color: Colors.textPrimary,
  },
  plusIcon: {
    fontSize: 18, color: 'rgba(255,255,255,0.7)', fontWeight: '300',
  },
  eligibilityDot: {
    position: 'absolute', top: 0, right: '18%',
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#fff',
    zIndex: 11,
  },
  positionLabel: {
    fontSize: 9, fontFamily: UI.typography.semibold,
    color: 'rgba(255,255,255,0.9)', marginTop: 2, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
});
