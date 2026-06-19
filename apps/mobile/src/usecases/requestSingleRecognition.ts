import {AnswerClient} from '../api/answerClient';
import {AnswerRequest} from '../api/answerTypes';
import {NativeBridge} from '../native/nativeBridgeTypes';
import {parseQuestionText} from '../ocr/parseQuestionText';
import {AssistantAction} from '../state/assistantState';

type RequestSingleRecognitionInput = {
  bridge: NativeBridge;
  answerClient: AnswerClient;
  dispatch: (action: AssistantAction) => void;
};

export async function requestSingleRecognition({
  bridge,
  answerClient,
  dispatch,
}: RequestSingleRecognitionInput): Promise<void> {
  dispatch({type: 'recognition-started'});

  const permissions = await bridge.getPermissionState();
  if (!permissions.overlayGranted) {
    dispatch({type: 'recognition-failed', message: '缺少悬浮窗权限。'});
    return;
  }
  if (!permissions.screenCaptureGranted) {
    dispatch({type: 'recognition-failed', message: '缺少屏幕捕获授权。'});
    return;
  }

  const ocrResult = await bridge.recognizeCurrentScreen();
  if (!ocrResult.rawText.trim()) {
    dispatch({type: 'recognition-failed', message: '未识别到题目。'});
    return;
  }

  const parsed = parseQuestionText(ocrResult.rawText);
  const request: AnswerRequest = {
    requestId: createRequestId(),
    scenario: 'bilibili_core_test',
    rawText: parsed.rawText,
    question: parsed.question,
    options: parsed.options,
    clientContext: {
      platform: 'android',
      appVersion: '0.1.0',
      ocrEngine: 'mlkit',
    },
  };

  const response = await answerClient.requestAnswer(request);
  if (response.status === 'failed' || !response.answer) {
    dispatch({
      type: 'recognition-failed',
      message: response.error?.message ?? '暂未找到可靠答案。',
    });
    return;
  }

  await bridge.showTopHint(response.answer.text);
  dispatch({
    type: 'recognition-succeeded',
    rawText: parsed.rawText,
    answer: response.answer,
  });
}

function createRequestId(): string {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
