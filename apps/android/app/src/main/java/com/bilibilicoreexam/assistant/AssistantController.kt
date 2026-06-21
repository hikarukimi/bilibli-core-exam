package com.bilibilicoreexam.assistant

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.bilibilicoreexam.capture.ScreenCaptureService
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import java.net.SocketTimeoutException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/**
 * 运行时业务大脑：编排权限、屏幕捕获、ML Kit OCR、后端请求与答案卡片渲染。
 * 由 MainActivity 持有，授权回调经 onCaptureResult 转发。
 */
class AssistantController(private val activity: Activity) {

  private val appContext: Context = activity.applicationContext
  private val mainHandler = Handler(Looper.getMainLooper())
  private val executor = Executors.newSingleThreadExecutor()
  private val textRecognizer =
    TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
  private val answerClient = AnswerClient()
  private val floating = FloatingController(
    appContext,
    onRecognize = { recognizeOnce() },
    onStop = { stopSession() },
  )

  @Volatile
  private var recognizing = false

  init {
    ScreenCaptureService.onSessionInvalidated = {
      runOnUi { floating.showCard(Card("读屏已停止，请重新开始。", "none", "low", "")) }
    }
  }

  fun startSession() {
    if (!Settings.canDrawOverlays(appContext)) {
      openOverlaySettings()
      return
    }
    floating.render(recognizing)
    val manager =
      activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    activity.startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CAPTURE)
  }

  fun onCaptureResult(requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CAPTURE) return
    if (resultCode != Activity.RESULT_OK || data == null) {
      runOnUi { floating.showCard(Card("缺少屏幕捕获授权。", "none", "low", "")) }
      return
    }
    val intent = Intent(appContext, ScreenCaptureService::class.java)
      .putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, resultCode)
      .putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, data)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      appContext.startForegroundService(intent)
    } else {
      appContext.startService(intent)
    }
  }

  private fun recognizeOnce() {
    if (recognizing) return
    recognizing = true
    floating.render(recognizing)
    executor.execute {
      try {
        val startedAt = System.currentTimeMillis()
        val rawText = readScreenText()
        if (rawText.isBlank()) {
          runOnUi { floating.showCard(Card("未识别到题目。", "none", "low", "")) }
          return@execute
        }
        val timeoutMs =
          minOf(AnswerClient.HTTP_TIMEOUT_MS, TOTAL_TIMEOUT_MS - (System.currentTimeMillis() - startedAt))
        if (timeoutMs <= 0) throw TimeoutException()
        val card = answerClient.requestAnswer(rawText, timeoutMs)
        runOnUi { floating.showCard(card) }
      } catch (_: SocketTimeoutException) {
        runOnUi { floating.showCard(Card("答案查询超时，请重试。", "none", "low", "")) }
      } catch (_: TimeoutException) {
        runOnUi { floating.showCard(Card("识别超时，请重试。", "none", "low", "")) }
      } catch (_: Exception) {
        runOnUi { floating.showCard(Card("网络不可用。", "none", "low", "")) }
      } finally {
        recognizing = false
        runOnUi { floating.render(recognizing) }
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

  private fun stopSession() {
    appContext.stopService(Intent(appContext, ScreenCaptureService::class.java))
    floating.teardown()
  }

  private fun openOverlaySettings() {
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${appContext.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    appContext.startActivity(intent)
  }

  private fun runOnUi(block: () -> Unit) = mainHandler.post(block)

  companion object {
    private const val REQUEST_CAPTURE = 7001
    private const val TOTAL_TIMEOUT_MS = 35_000L
  }
}
