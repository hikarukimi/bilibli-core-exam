import React from 'react';
import {Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';

import AssistantBridge from './src/native/NativeAssistantBridge';

function App() {
  async function handleStart() {
    try {
      await AssistantBridge.startAssistantSession();
    } catch {
      // 原生层会负责权限页、悬浮控件和失败提示；RN 只做启动入口。
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f2" />
      <Pressable style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>开始</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#f7f7f2',
    flex: 1,
    justifyContent: 'center',
    paddingTop: StatusBar.currentHeight ?? 0,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#fb7299',
    borderRadius: 28,
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 160,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default App;
