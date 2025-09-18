import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { UserLevelProgress, UserLevel } from '../models/UserLevel';

interface UserLevelCardProps {
  levelProgress: UserLevelProgress;
  onPress?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

const { width } = Dimensions.get('window');

export const UserLevelCard: React.FC<UserLevelCardProps> = ({
  levelProgress,
  onPress,
  showDetails = true,
  compact = false,
}) => {
  if (!levelProgress || !levelProgress.currentLevel) {
    return null;
  }

  const { currentLevel, nextLevel, currentExp, expToNextLevel, progressPercentage } = levelProgress;
  const safeBenefits = Array.isArray(currentLevel.benefits) ? currentLevel.benefits : [];

  const getLevelGradient = (level: UserLevel) => {
    switch (level.id) {
      case 'bronze':
        return ['#CD7F32', '#B8860B'];
      case 'iron':
        return ['#C0C0C0', '#A8A8A8'];
      case 'gold':
        return ['#FFD700', '#FFA500'];
      case 'platinum':
        return ['#E5E4E2', '#C0C0C0'];
      case 'diamond':
        return ['#B9F2FF', '#87CEEB'];
      default:
        return ['#CD7F32', '#B8860B'];
    }
  };

  const getLevelIcon = (level: UserLevel) => {
    switch (level.id) {
      case 'bronze':
        return 'medal-outline';
      case 'iron':
        return 'shield-outline';
      case 'gold':
        return 'star-outline';
      case 'platinum':
        return 'diamond-outline';
      case 'diamond':
        return 'diamond';
      default:
        return 'medal-outline';
    }
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress}>
        <LinearGradient
          colors={getLevelGradient(currentLevel)}
          style={styles.compactGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.compactContent}>
            <Ionicons
              name={getLevelIcon(currentLevel) as any}
              size={24}
              color="white"
            />
            <View style={styles.compactTextContainer}>
              <Text style={styles.compactLevelName}>{currentLevel.displayName}</Text>
              <Text style={styles.compactExpText}>{currentExp} EXP</Text>
            </View>
            <View style={styles.compactProgressContainer}>
              <View style={styles.compactProgressBar}>
                <View
                  style={[
                    styles.compactProgressFill,
                    { width: `${progressPercentage}%` }
                  ]}
                />
              </View>
              {nextLevel && (
                <Text style={styles.compactNextLevelText}>
                  {expToNextLevel} EXP kaldı
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <LinearGradient
        colors={getLevelGradient(currentLevel)}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.levelInfo}>
            <Ionicons
              name={getLevelIcon(currentLevel) as any}
              size={32}
              color="white"
            />
            <View style={styles.levelTextContainer}>
              <Text style={styles.levelName}>{currentLevel.displayName}</Text>
              <Text style={styles.levelSubtitle}>Seviye {currentLevel.name}</Text>
            </View>
          </View>
          <View style={styles.expContainer}>
            <Text style={styles.currentExp}>{currentExp.toLocaleString()}</Text>
            <Text style={styles.expLabel}>EXP</Text>
          </View>
        </View>

        {showDetails && (
          <>
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {nextLevel ? `${nextLevel.displayName} Seviyesine` : 'Maksimum Seviye'}
                </Text>
                <Text style={styles.progressPercentage}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` }
                  ]}
                />
              </View>
              {nextLevel && (
                <Text style={styles.expToNext}>
                  {expToNextLevel.toLocaleString()} EXP kaldı
                </Text>
              )}
            </View>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Seviye Avantajları:</Text>
              {safeBenefits.slice(0, 3).map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
              {safeBenefits.length > 3 && (
                <Text style={styles.moreBenefitsText}>
                  +{safeBenefits.length - 3} daha fazla avantaj
                </Text>
              )}
            </View>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelTextContainer: {
    marginLeft: 12,
  },
  levelName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  levelSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
  },
  expContainer: {
    alignItems: 'center',
  },
  currentExp: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  expLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  expToNext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  benefitsContainer: {
    marginTop: 8,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
    flex: 1,
  },
  moreBenefitsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Compact styles
  compactContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  compactGradient: {
    padding: 12,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  compactLevelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  compactExpText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  compactProgressContainer: {
    alignItems: 'flex-end',
  },
  compactProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  compactNextLevelText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
