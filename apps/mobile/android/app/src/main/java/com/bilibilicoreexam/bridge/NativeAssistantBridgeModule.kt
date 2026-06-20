package com.bilibilicoreexam.bridge

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

class NativeAssistantBridgeModule(
  private val reactContext: ReactApplicationContext,
) : NativeAssistantBridgeSpec(reactContext), ActivityEventListener {

  private val executor = Executors.newSingleThreadExecutor()
  private val textRecognizer =
    TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
  private var capturePromise: Promise? = null
  private var floatingView: LinearLayout? = null
  private var cardView: View? = null
  private var expanded = false
  private var recognizing = false

  init {
    reactContext.addActivityEventListener(this)
    ScreenCaptureService.onSessionInvalidated = {
      showCard(Card("读屏已停止，请重新开始。", "none", "low", ""))
    }
  }

  override fun getName(): String = NAME

  override fun startAssistantSession(promise: Promise) {
    if (!Settings.canDrawOverlays(reactContext)) {
      openOverlaySettings()
      promise.reject("OVERLAY_PERMISSION_DENIED", "缺少悬浮窗权限。")
      return
    }
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "当前没有可用的 Activity。")
      return
    }
    capturePromise = promise
    showFloating()
    val manager =
      activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    activity.startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CAPTURE)
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    if (requestCode != REQUEST_CAPTURE) return
    val promise = capturePromise ?: return
    capturePromise = null
    if (resultCode != Activity.RESULT_OK || data == null) {
      promise.reject("SCREEN_CAPTURE_DENIED", "缺少屏幕捕获授权。")
      return
    }
    val intent = Intent(reactContext, ScreenCaptureService::class.java)
      .putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, resultCode)
      .putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, data)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
    promise.resolve(null)
  }

  override fun onNewIntent(intent: Intent) {}

  private fun showFloating() = UiThreadUtil.runOnUiThread {
    val view = floatingView ?: LinearLayout(reactContext).also {
      it.orientation = LinearLayout.VERTICAL
      floatingView = it
      windowManager().addView(it, overlayParams(Gravity.START or Gravity.CENTER_VERTICAL))
    }
    view.removeAllViews()
    if (expanded) addMenu(view) else addBubble(view)
  }

  private fun addBubble(parent: LinearLayout) {
    parent.background = null
    val bubble = TextView(reactContext)
    bubble.text = if (recognizing) "识" else "开"
    bubble.gravity = Gravity.CENTER
    bubble.textSize = 18f
    bubble.setTextColor(Color.WHITE)
    bubble.background = oval(PINK)
    bubble.setOnClickListener {
      expanded = true
      showFloating()
    }
    parent.addView(bubble, LinearLayout.LayoutParams(dp(48), dp(48)))
  }

  private fun addMenu(parent: LinearLayout) {
    parent.background = round(Color.WHITE)
    parent.setPadding(dp(12), dp(10), dp(12), dp(12))
    val recognize = Button(reactContext)
    recognize.text = if (recognizing) "识别中" else "单次识别"
    recognize.isEnabled = !recognizing
    recognize.setTextColor(Color.WHITE)
    recognize.backgroundTintList = ColorStateList.valueOf(BLUE)
    recognize.setOnClickListener {
      expanded = false
      recognizeOnce()
    }
    parent.addView(recognize, LinearLayout.LayoutParams(dp(132), dp(48)))

    val stop = Button(reactContext)
    stop.text = "结束读屏"
    stop.setTextColor(PINK)
    stop.backgroundTintList = ColorStateList.valueOf(Color.WHITE)
    stop.setOnClickListener { stopSession() }
    parent.addView(stop, LinearLayout.LayoutParams(dp(132), dp(48)))
  }

  private fun recognizeOnce() {
    if (recognizing) return
    recognizing = true
    showFloating()
    executor.execute {
      try {
        val startedAt = System.currentTimeMillis()
        val rawText = readScreenText()
        if (rawText.isBlank()) {
          showCard(Card("未识别到题目。", "none", "low", ""))
          return@execute
        }
        val timeoutMs = minOf(HTTP_TIMEOUT_MS, TOTAL_TIMEOUT_MS - (System.currentTimeMillis() - startedAt))
        if (timeoutMs <= 0) throw TimeoutException()
        showCard(requestAnswer(rawText, timeoutMs))
      } catch (_: SocketTimeoutException) {
        showCard(Card("答案查询超时，请重试。", "none", "low", ""))
      } catch (_: TimeoutException) {
        showCard(Card("识别超时，请重试。", "none", "low", ""))
      } catch (_: Exception) {
        showCard(Card("网络不可用。", "none", "low", ""))
      } finally {
        recognizing = false
        showFloating()
      }
    }
  }

  private fun readScreenText(): String {
    val bitmap = ScreenCaptureService.instance?.captureLatestBitmap()
      ?: throw IllegalStateException("screen capture stopped")
    return Tasks.await(
      textRecognizer.process(InputImage.fromBitmap(bitmap, 0)),
      TOTAL_TIMEOUT_MS,
      TimeUnit.MILLISECONDS,
    ).text
  }

  private fun requestAnswer(rawText: String, timeoutMs: Long): Card {
    val body = JSONObject()
      .put("requestId", "android-${System.currentTimeMillis()}")
      .put("scenario", "bilibili_core_test")
      .put("rawText", rawText)
      .put("clientContext", JSONObject().put("platform", "android").put("ocrEngine", "mlkit"))
      .toString()
    val connection = (URL("$BACKEND_BASE_URL/api/answer").openConnection() as HttpURLConnection)
    connection.requestMethod = "POST"
    connection.connectTimeout = timeoutMs.toInt()
    connection.readTimeout = timeoutMs.toInt()
    connection.setRequestProperty("Content-Type", "application/json")
    connection.doOutput = true
    connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

    val response = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
    val answer = response.optJSONObject("answer")
      ?: return Card(response.optJSONObject("error")?.optString("message") ?: "暂未找到可靠答案。", "none", "low", "")
    return Card(
      text = answer.optString("text", "暂未找到可靠答案。"),
      sourceType = answer.optString("sourceType", "none"),
      confidence = answer.optString("confidence", "low"),
      rationale = answer.optString("rationale", ""),
      optionId = answer.optString("optionId").takeIf { it.isNotBlank() },
    )
  }

  private fun showCard(card: Card) = UiThreadUtil.runOnUiThread {
    removeCard()
    val view = LinearLayout(reactContext)
    view.orientation = LinearLayout.VERTICAL
    view.setPadding(dp(14), dp(12), dp(14), dp(12))
    view.background = round(Color.WHITE)
    view.addView(text(if (card.optionId == null) card.text else "${card.optionId}. ${card.text}", 18, "#111816"))
    view.addView(text("置信度：${card.confidence} · 来源：${card.sourceType}", 12, "#68716C"))
    view.addView(text(card.rationale, 14, "#3E4742"))
    val close = Button(reactContext)
    close.text = "关闭"
    close.setOnClickListener { removeCard() }
    view.addView(close)
    cardView = view
    windowManager().addView(view, overlayParams(Gravity.TOP))
  }

  private fun text(value: String, size: Int, color: String): TextView =
    TextView(reactContext).apply {
      text = value
      textSize = size.toFloat()
      setTextColor(Color.parseColor(color))
      setPadding(0, dp(4), 0, 0)
    }

  private fun stopSession() {
    reactContext.stopService(Intent(reactContext, ScreenCaptureService::class.java))
    removeCard()
    floatingView?.let { if (it.parent != null) windowManager().removeView(it) }
    floatingView = null
  }

  private fun removeCard() {
    cardView?.let { if (it.parent != null) windowManager().removeView(it) }
    cardView = null
  }

  private fun openOverlaySettings() {
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${reactContext.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  private fun overlayParams(gravity: Int): WindowManager.LayoutParams =
    WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
      },
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT,
    ).apply {
      this.gravity = gravity
      x = dp(12)
      y = dp(12)
    }

  private fun windowManager(): WindowManager =
    reactContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager

  private fun oval(color: Int): GradientDrawable =
    GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(color)
    }

  private fun round(color: Int): GradientDrawable =
    GradientDrawable().apply {
      setColor(color)
      cornerRadius = dp(18).toFloat()
    }

  private fun dp(value: Int): Int = (value * reactContext.resources.displayMetrics.density).toInt()

  private data class Card(
    val text: String,
    val sourceType: String,
    val confidence: String,
    val rationale: String,
    val optionId: String? = null,
  )

  companion object {
    const val NAME = "AssistantBridge"
    private const val REQUEST_CAPTURE = 7001
    private const val BACKEND_BASE_URL = "http://127.0.0.1:8000"
    private const val TOTAL_TIMEOUT_MS = 35_000L
    private const val HTTP_TIMEOUT_MS = 30_000L
    private val PINK = Color.parseColor("#FB7299")
    private val BLUE = Color.parseColor("#00A1D6")
  }
}
