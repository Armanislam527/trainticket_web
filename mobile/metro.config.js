const { getDefaultConfig } = require('expo/metro-config');

// This ensures Expo handles all routing, require.context, and babel transformations correctly
module.exports = getDefaultConfig(__dirname);