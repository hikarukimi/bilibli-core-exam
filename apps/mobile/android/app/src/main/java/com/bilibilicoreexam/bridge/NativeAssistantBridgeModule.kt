package com.bilibilicoreexam.bridge

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap

class NativeAssistantBridgeModule(
  private val reactContext: ReactApplicationContext,
) : NativeAssistantBridgeSpec(reactContext) {

  private var hintView: TextView? = null

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
    promise.reject("NOT_IMPLEMENTED", "屏幕捕获会话尚未实现。")
  }

  override fun recognizeCurrentScreen(promise: Promise) {
    promise.reject("NOT_IMPLEMENTED", "端侧 OCR 尚未实现。")
  }

  private fun buildPermissionState(): WritableMap {
    val map = Arguments.createMap()
    map.putBoolean("overlayGranted", hasOverlayPermission())
    map.putBoolean("screenCaptureGranted", false)
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
  }
}
