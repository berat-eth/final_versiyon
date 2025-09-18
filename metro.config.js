const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Basic performance optimizations
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable tree shaking
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
