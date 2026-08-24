import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StudioScreen } from './src/screens/StudioScreen';
import { useTheme } from './src/theme';

export default function App() {
  const { palette, scheme } = useTheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={[styles.container, { backgroundColor: palette.canvas }]}>
          {/* `auto` flips the status bar text with the system appearance. */}
          <StatusBar style="auto" key={scheme} />
          <StudioScreen />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
