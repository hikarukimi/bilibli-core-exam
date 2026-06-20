package com.bilibilicoreexam.bridge

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions

class NativeAssistantBridgeModule(
  private val reactContext: ReactApplicationContext,
) : NativeAssistantBridgeSpec(reactContext), ActivityEventListener {

  private var hintView: TextView? = null
  private var sessionPromise: Promise? = null
  private val textRecognizer =
    TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = NAME

  override fun getPermissionState(promise: Promise) {
    promise.resolve(buildPermissionState())
  }

  override fun requestOverlayPermission(promise: Promise) {
    if (hasOverlayPermission()) {
      promise.resolve(buildPermissionState())
      return
    }
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${reactContext.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      reactContext.startActivity(intent)
      // 用户在系统设置页授权，返回后由 JS 再次调用 getPermissionState 复查
      promise.resolve(buildPermissionState())
    } catch (e: Exception) {
      promise.reject("OVERLAY_PERMISSION_INTENT_FAILED", e)
    }
  }

  override fun showTopHint(message: String, promise: Promise) {
    if (!hasOverlayPermission()) {
      promise.reject("OVERLAY_PERMISSION_DENIED", "缺少悬浮窗权限。")
      return
    }
    UiThreadUtil.runOnUiThread {
      try {
        val windowManager =
          reactContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val view = hintView ?: createHintView().also { hintView = it }
        view.text = message
        if (view.parent == null) {
          windowManager.addView(view, buildLayoutParams())
        }
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("SHOW_TOP_HINT_FAILED", e)
      }
    }
  }

  override fun startScreenCaptureSession(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "当前没有可用的 Activity。")
      return
    }
    if (sessionPromise != null) {
      promise.reject("SESSION_PENDING", "屏幕捕获授权正在进行中。")
      return
    }
    sessionPromise = promise
    try {
      val manager =
        activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      activity.startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CAPTURE)
    } catch (e: Exception) {
      sessionPromise = null
      promise.reject("SCREEN_CAPTURE_INTENT_FAILED", e)
    }
  }

  override fun recognizeCurrentScreen(promise: Promise) {
    val bitmap = ScreenCaptureService.instance?.captureLatestBitmap()
    if (bitmap == null) {
      promise.reject("SESSION_INVALID", "读屏已停止，请重新开始。")
      return
    }
    textRecognizer.process(InputImage.fromBitmap(bitmap, 0))
      .addOnSuccessListener { result ->
        val map = Arguments.createMap()
        map.putString("rawText", result.text)
        promise.resolve(map)
      }
      .addOnFailureListener { e -> promise.reject("OCR_FAILED", e) }
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    if (requestCode != REQUEST_CAPTURE) return
    val promise = sessionPromise ?: return
    sessionPromise = null
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

  private fun buildPermissionState(): WritableMap {
    val map = Arguments.createMap()
    map.putBoolean("overlayGranted", hasOverlayPermission())
    return map
  }

  private fun hasOverlayPermission(): Boolean = Settings.canDrawOverlays(reactContext)

  private fun createHintView(): TextView {
    val view = TextView(reactContext)
    view.setBackgroundColor(Color.parseColor("#16615B"))
    view.setTextColor(Color.WHITE)
    view.textSize = 14f
    val padding = (12 * reactContext.resources.displayMetrics.density).toInt()
    view.setPadding(padding, padding, padding, padding)
    return view
  }

  private fun buildLayoutParams(): WindowManager.LayoutParams {
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    )
    params.gravity = Gravity.TOP
    return params
  }

  companion object {
    const val NAME = "AssistantBridge"
    private const val REQUEST_CAPTURE = 7001
  }
}
