# 统一答题接口草案

## 接口

`POST /api/answer`

手机端提交当前屏幕识别出的题目文本，后端返回结构化答案结果。

## 请求

```json
{
  "requestId": "client-generated-id",
  "scenario": "bilibili_core_test",
  "rawText": "从屏幕 OCR 得到的完整文本",
  "question": "尽力解析出的题干，可为空",
  "options": [
    { "id": "A", "text": "选项 A" },
    { "id": "B", "text": "选项 B" },
    { "id": "C", "text": "选项 C" },
    { "id": "D", "text": "选项 D" }
  ],
  "clientContext": {
    "platform": "android",
    "appVersion": "0.1.0",
    "ocrEngine": "mlkit"
  }
}
```

## 请求字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `requestId` | 是 | 客户端生成的请求 ID，用于排查问题。 |
| `scenario` | 是 | 场景标识，MVP 固定为 `bilibili_core_test`。 |
| `rawText` | 是 | 原始题目文本，是后端兜底输入。 |
| `question` | 否 | 客户端尽力解析出的题干。 |
| `options` | 否 | 客户端尽力解析出的选项。 |
| `clientContext` | 否 | 客户端版本和 OCR 信息。 |

客户端不得上传截图、Cookie、bilibili 账号或页面接口数据。

## 响应

```json
{
  "requestId": "client-generated-id",
  "status": "answered",
  "answer": {
    "optionId": "B",
    "text": "选项 B",
    "confidence": "high",
    "rationale": "题干关键词和选项文本与知识库条目高度匹配。",
    "sourceType": "knowledge_base",
    "sources": [
      {
        "title": "来源标题",
        "url": "https://example.com",
        "snippet": "来源摘要"
      }
    ]
  },
  "diagnostics": {
    "matchedKnowledgeBase": true,
    "modelUsed": false,
    "elapsedMs": 320
  }
}
```

## 响应字段

| 字段 | 说明 |
| --- | --- |
| `status` | `answered`、`low_confidence`、`not_found`、`failed`。 |
| `answer.optionId` | 推荐选项字母；无法确定时可为空。 |
| `answer.text` | 推荐选项文本或候选答案文本。 |
| `answer.confidence` | `high`、`medium`、`low`。 |
| `answer.rationale` | 顶部提示条可展示的简短依据。 |
| `answer.sourceType` | `knowledge_base`、`model_web`、`mixed`、`none`。 |
| `answer.sources` | 来源标题、链接和摘要；模型无法提供时可为空。 |
| `diagnostics` | 仅用于客户端调试和后端排查，不作为用户主要展示内容。 |

## 低置信响应示例

```json
{
  "requestId": "client-generated-id",
  "status": "low_confidence",
  "answer": {
    "optionId": "C",
    "text": "选项 C",
    "confidence": "low",
    "rationale": "未找到稳定来源，模型仅根据题干语义给出候选答案。",
    "sourceType": "model_web",
    "sources": []
  },
  "diagnostics": {
    "matchedKnowledgeBase": false,
    "modelUsed": true,
    "elapsedMs": 8400
  }
}
```

## 失败响应示例

```json
{
  "requestId": "client-generated-id",
  "status": "failed",
  "error": {
    "code": "MODEL_TIMEOUT",
    "message": "答案查询超时，请重试。"
  },
  "diagnostics": {
    "matchedKnowledgeBase": false,
    "modelUsed": true,
    "elapsedMs": 10000
  }
}
```

## 错误码草案

| 错误码 | 说明 |
| --- | --- |
| `EMPTY_TEXT` | 请求没有可用题目文本。 |
| `UNSUPPORTED_QUESTION_TYPE` | 非单选题或无法按单选题处理。 |
| `KNOWLEDGE_BASE_ERROR` | 知识库加载或查询失败。 |
| `MODEL_ERROR` | 模型服务调用失败。 |
| `MODEL_TIMEOUT` | 模型服务超时。 |
| `INTERNAL_ERROR` | 后端未知错误。 |

## 超时策略

MVP 使用同步 HTTP 请求。建议后端总超时控制在 8 到 12 秒。超时后返回失败响应，由用户手动重试。

