const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
    assetExts: [...config.resolver.assetExts],
  },
  transformer: {
    ...config.transformer,
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  }
};