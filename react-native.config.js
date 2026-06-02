module.exports = {
  assets: ['./node_modules/react-native-vector-icons/Fonts'],
  dependencies: {
    // expo is used only for web (expo start --web).
    // Exclude its native Android/iOS modules from autolinking to avoid
    // the 'expo-module-gradle-plugin not found' Gradle build error.
    expo: {
      platforms: {
        android: null,
        ios: null,
      },
    },
    'expo-modules-core': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
