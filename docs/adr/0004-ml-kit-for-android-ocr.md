# 使用 Google ML Kit 进行 Android 端侧 OCR

Android 端侧 OCR 优先采用 Google ML Kit Text Recognition，并通过 React Native 原生模块桥接给 JavaScript/TypeScript 业务层。该选择优先保证 MVP 的集成成熟度、识别速度和单次屏幕识别体验；如果中文识别质量无法满足 bilibili 知识测试场景，再评估 PaddleOCR 等更重的端侧 OCR 方案。
