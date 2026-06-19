import React, {useMemo, useReducer} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {createAnswerClient} from './src/api/answerClient';
import {mockNativeBridge} from './src/native/mockNativeBridge';
import {createInitialAssistantState, assistantReducer} from './src/state/assistantState';
import {requestSingleRecognition} from './src/usecases/requestSingleRecognition';

const answerClient = createAnswerClient({baseUrl: 'http://localhost:8000'});

function App() {
  const [state, dispatch] = useReducer(
    assistantReducer,
    undefined,
    createInitialAssistantState,
  );
  const canRecognize = state.status === 'idle' || state.status === 'ready' || state.status === 'answered' || state.status === 'failed';

  const statusLabel = useMemo(() => {
    switch (state.status) {
      case 'idle':
        return '未启动';
      case 'ready':
        return '待识别';
      case 'recognizing':
        return '识别中';
      case 'answered':
        return state.answer?.confidence === 'low' ? '低置信答案' : '展示结果';
      case 'failed':
        return '失败';
    }
  }, [state]);

  async function handleStartSession() {
    dispatch({type: 'session-started'});
  }

  async function handleRecognize() {
    await requestSingleRecognition({
      bridge: mockNativeBridge,
      answerClient,
      dispatch,
    });
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f2" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>硬核会员答题助手</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{statusLabel}</Text>
          {state.status === 'recognizing' ? <ActivityIndicator size="small" color="#16615b" /> : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>顶部提示条预览</Text>
          {state.answer ? (
            <>
              <Text style={styles.answerText}>
                {state.answer.optionId ? `${state.answer.optionId}. ` : ''}
                {state.answer.text}
              </Text>
              <Text style={styles.rationale}>{state.answer.rationale}</Text>
              <Text style={styles.meta}>
                置信度：{state.answer.confidence} · 来源：{state.answer.sourceType}
              </Text>
            </>
          ) : (
            <Text style={styles.emptyText}>触发一次识别后，这里展示推荐答案、依据和置信度。</Text>
          )}
        </View>

        {state.error ? <Text style={styles.errorText}>{state.error}</Text> : null}

        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={handleStartSession}>
            <Text style={styles.secondaryButtonText}>开始读屏会话</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, !canRecognize && styles.disabledButton]}
            disabled={!canRecognize}
            onPress={handleRecognize}>
            <Text style={styles.primaryButtonText}>单次识别</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>原始题目文本</Text>
          <Text style={styles.rawText}>{state.rawText || '暂无 OCR 文本'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f7f2',
    paddingTop: StatusBar.currentHeight ?? 0,
  },
  content: {
    gap: 16,
    padding: 20,
  },
  header: {
    gap: 4,
  },
  title: {
    color: '#1f2623',
    fontSize: 26,
    fontWeight: '700',
  },
  statusRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8ddd7',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  statusDot: {
    backgroundColor: '#16615b',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  statusText: {
    color: '#1f2623',
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ddd7',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  panelTitle: {
    color: '#3e4742',
    fontSize: 14,
    fontWeight: '700',
  },
  answerText: {
    color: '#111816',
    fontSize: 22,
    fontWeight: '800',
  },
  rationale: {
    color: '#3e4742',
    fontSize: 15,
    lineHeight: 22,
  },
  meta: {
    color: '#68716c',
    fontSize: 13,
  },
  emptyText: {
    color: '#68716c',
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: '#9f1f1f',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#16615b',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#9fb3ad',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#16615b',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  rawText: {
    color: '#3e4742',
    fontSize: 14,
    lineHeight: 21,
  },
});

export default App;
