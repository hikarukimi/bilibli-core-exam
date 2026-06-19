import {AnswerResult} from '../api/answerTypes';

export type AssistantStatus = 'idle' | 'ready' | 'recognizing' | 'answered' | 'failed';

export type AssistantState = {
  status: AssistantStatus;
  rawText?: string;
  answer?: AnswerResult;
  error?: string;
};

export type AssistantAction =
  | {type: 'session-started'}
  | {type: 'recognition-started'}
  | {type: 'recognition-succeeded'; rawText: string; answer: AnswerResult}
  | {type: 'recognition-failed'; message: string};

export function createInitialAssistantState(): AssistantState {
  return {
    status: 'idle',
  };
}

export function assistantReducer(
  state: AssistantState,
  action: AssistantAction,
): AssistantState {
  switch (action.type) {
    case 'session-started':
      return {
        status: 'ready',
      };
    case 'recognition-started':
      return {
        ...state,
        status: 'recognizing',
        error: undefined,
      };
    case 'recognition-succeeded':
      return {
        status: 'answered',
        rawText: action.rawText,
        answer: action.answer,
      };
    case 'recognition-failed':
      return {
        ...state,
        status: 'failed',
        error: action.message,
      };
  }
}
