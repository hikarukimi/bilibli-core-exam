package com.bilibilicoreexam.assistant

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class Card(
  val text: String,
  val sourceType: String,
  val confidence: String,
  val rationale: String,
  val optionId: String? = null,
)

class AnswerClient(private val baseUrl: String = DEFAULT_BASE_URL) {

  fun requestAnswer(rawText: String, timeoutMs: Long): Card {
    val body = JSONObject()
      .put("requestId", "android-${System.currentTimeMillis()}")
      .put("scenario", "bilibili_core_test")
      .put("rawText", rawText)
      .put("clientContext", JSONObject().put("platform", "android").put("ocrEngine", "mlkit"))
      .toString()
    val connection = (URL("$baseUrl/api/answer").openConnection() as HttpURLConnection)
    connection.requestMethod = "POST"
    connection.connectTimeout = timeoutMs.toInt()
    connection.readTimeout = timeoutMs.toInt()
    connection.setRequestProperty("Content-Type", "application/json")
    connection.doOutput = true
    connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

    val response = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
    val answer = response.optJSONObject("answer")
      ?: return Card(
        response.optJSONObject("error")?.optString("message") ?: "暂未找到可靠答案。",
        "none",
        "low",
        "",
      )
    return Card(
      text = answer.optString("text", "暂未找到可靠答案。"),
      sourceType = answer.optString("sourceType", "none"),
      confidence = answer.optString("confidence", "low"),
      rationale = answer.optString("rationale", ""),
      optionId = answer.optString("optionId").takeIf { it.isNotBlank() },
    )
  }

  companion object {
    const val DEFAULT_BASE_URL = "http://127.0.0.1:8000"
    const val HTTP_TIMEOUT_MS = 30_000L
  }
}
