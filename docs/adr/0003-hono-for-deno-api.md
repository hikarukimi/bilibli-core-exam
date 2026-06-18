# 使用 Hono 构建 Deno 后端 API

Deno 后端 API 采用 Hono 作为 HTTP 框架，而不是直接使用裸 `Deno.serve` 或面向页面的全栈框架。Hono 提供足够轻量的路由、中间件和 TypeScript 开发体验，适合 MVP 的统一答题接口、日志、错误处理和后续限流扩展。
