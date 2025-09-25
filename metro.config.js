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

// JSON parse hatalarını önle
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Symbolicate hatalarını önle
config.symbolicator = {
  customizeFrame: (frame) => {
    if (frame.file && frame.file.includes('node_modules')) {
      return null;
    }
    return frame;
  },
};

module.exports = config;
