# 移动端应用

这是 bilibili 硬核会员答题助手 MVP 的 React Native CLI Android 应用。

## 技术栈

- React Native 0.86
- TypeScript
- Android 原生工程
- pnpm workspace

当前 MVP 只面向 Android，暂未初始化 iOS 工程。

## 常用命令

在仓库根目录执行：

```sh
pnpm install
pnpm mobile:test
pnpm mobile:typecheck
pnpm mobile:lint
pnpm mobile:start
pnpm mobile:android
```

如果 Windows PowerShell 的脚本执行策略阻止运行 `pnpm.ps1`，可以改用 `pnpm.cmd`：

```sh
pnpm.cmd mobile:test
```

## Android 构建

运行应用前，建议先用 Android Studio 打开 `apps/mobile/android`，等待 Gradle 同步完成。

首次构建可能会下载 Gradle、Android Gradle Plugin 和 React Native Android 相关产物。如果命令行构建看起来长时间无响应，优先查看 Android Studio 的 Gradle 同步面板，因为它能更清楚地显示依赖下载和 SDK 错误。

命令行构建方式：

```sh
cd apps/mobile/android
.\gradlew.bat assembleDebug
```

如果 `java` 不在 `PATH` 中，可以在当前 shell 中临时追加 `JAVA_HOME`：

```powershell
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
```

## 已实现骨架

- 助手状态流：未启动、待识别、识别中、展示结果、失败。
- 单选题 OCR 文本解析。
- 与 `docs/api/answer-api.md` 对齐的答案 API 请求和响应类型。
- 用于权限检查、OCR 和顶部提示展示的模拟原生桥接。
- 单次识别用例，包含成功和失败处理。
