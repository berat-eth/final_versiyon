import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: string;
  iconSource?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, icon, iconSource }) => {
  return (
    <View style={styles.container}>
      {iconSource ? (
        <Image source={iconSource} style={styles.iconImage} resizeMode="contain" />
      ) : icon ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : null}
      {title && <Text style={styles.title}>{title}</Text>}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  iconImage: {
    width: 64,
    height: 64,
    marginBottom: 16,
    tintColor: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});