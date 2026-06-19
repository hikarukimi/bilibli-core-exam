import {AnswerRequest, AnswerResponse} from './answerTypes';

export type AnswerClient = {
  requestAnswer(request: AnswerRequest): Promise<AnswerResponse>;
};

type AnswerClientConfig = {
  baseUrl: string;
};

export function createAnswerClient(config: AnswerClientConfig): AnswerClient {
  return {
    async requestAnswer(request) {
      const response = await fetch(`${config.baseUrl}/api/answer`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        return {
          requestId: request.requestId,
          status: 'failed',
          error: {
            code: 'BACKEND_HTTP_ERROR',
            message: '后端请求失败。',
          },
        };
      }

      return response.json() as Promise<AnswerResponse>;
    },
  };
}
