import {AnswerRequest, AnswerResponse} from './answerTypes';
import {request, RequestTimeoutError} from './httpClient';

export type AnswerClient = {
  requestAnswer(payload: AnswerRequest): Promise<AnswerResponse>;
};

type AnswerClientConfig = {
  baseUrl: string;
  timeoutMs?: number;
};

export function createAnswerClient(config: AnswerClientConfig): AnswerClient {
  return {
    async requestAnswer(payload) {
      try {
        const response = await request(
          `${config.baseUrl}/api/answer`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          },
          {timeoutMs: config.timeoutMs},
        );

        if (!response.ok) {
          return failure(payload.requestId, 'BACKEND_HTTP_ERROR', '后端请求失败。');
        }

        return (await response.json()) as AnswerResponse;
      } catch (error) {
        if (error instanceof RequestTimeoutError) {
          return failure(payload.requestId, 'REQUEST_TIMEOUT', '答案查询超时，请重试。');
        }
        return failure(payload.requestId, 'NETWORK_ERROR', '网络不可用。');
      }
    },
  };
}

function failure(requestId: string, code: string, message: string): AnswerResponse {
  return {requestId, status: 'failed', error: {code, message}};
}
