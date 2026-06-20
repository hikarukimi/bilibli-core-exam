package com.bilibilicoreexam.bridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

/**
 * 前台 Service，会话期内长持有 MediaProjection 与 ImageReader，
 * 供桥接模块按需抓取当前屏幕帧。系统回收投屏时停止自身。
 */
class ScreenCaptureService : Service() {

  private val handler = Handler(Looper.getMainLooper())
  private var projection: MediaProjection? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var imageReader: ImageReader? = null

  private val projectionCallback = object : MediaProjection.Callback() {
    override fun onStop() {
      release()
      stopSelf()
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, Int.MIN_VALUE) ?: Int.MIN_VALUE
    @Suppress("DEPRECATION")
    val data = intent?.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)
    if (resultCode == Int.MIN_VALUE || data == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    startForegroundSession()

    val manager =
      getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    val mediaProjection = manager.getMediaProjection(resultCode, data)
    if (mediaProjection == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    mediaProjection.registerCallback(projectionCallback, handler)
    projection = mediaProjection
    setupVirtualDisplay(mediaProjection)
    instance = this
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    release()
    super.onDestroy()
  }

  fun captureLatestBitmap(): Bitmap? {
    val reader = imageReader ?: return null
    repeat(MAX_FRAME_ATTEMPTS) {
      val image = reader.acquireLatestImage()
      if (image != null) {
        try {
          return imageToBitmap(image)
        } finally {
          image.close()
        }
      }
      Thread.sleep(FRAME_RETRY_DELAY_MS)
    }
    return null
  }

  private fun setupVirtualDisplay(mediaProjection: MediaProjection) {
    val metrics = resources.displayMetrics
    val reader =
      ImageReader.newInstance(metrics.widthPixels, metrics.heightPixels, PixelFormat.RGBA_8888, 2)
    imageReader = reader
    virtualDisplay = mediaProjection.createVirtualDisplay(
      "assistant-capture",
      metrics.widthPixels,
      metrics.heightPixels,
      metrics.densityDpi,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
      reader.surface,
      null,
      handler,
    )
  }

  private fun imageToBitmap(image: Image): Bitmap {
    val plane = image.planes[0]
    val rowPadding = plane.rowStride - plane.pixelStride * image.width
    val bitmap = Bitmap.createBitmap(
      image.width + rowPadding / plane.pixelStride,
      image.height,
      Bitmap.Config.ARGB_8888,
    )
    bitmap.copyPixelsFromBuffer(plane.buffer)
    return if (rowPadding == 0) bitmap
    else Bitmap.createBitmap(bitmap, 0, 0, image.width, image.height)
  }

  private fun startForegroundSession() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        buildNotification(),
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
      )
    } else {
      startForeground(NOTIFICATION_ID, buildNotification())
    }
  }

  private fun buildNotification(): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "读屏会话",
        NotificationManager.IMPORTANCE_LOW,
      )
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("答题助手读屏中")
      .setContentText("正在为单次识别保持屏幕捕获会话")
      .setSmallIcon(android.R.drawable.ic_menu_view)
      .setOngoing(true)
      .build()
  }

  private fun release() {
    virtualDisplay?.release()
    virtualDisplay = null
    imageReader?.close()
    imageReader = null
    projection?.unregisterCallback(projectionCallback)
    projection?.stop()
    projection = null
    if (instance === this) instance = null
  }

  companion object {
    @Volatile
    var instance: ScreenCaptureService? = null
      private set

    const val EXTRA_RESULT_CODE = "result_code"
    const val EXTRA_RESULT_DATA = "result_data"

    private const val NOTIFICATION_ID = 1001
    private const val CHANNEL_ID = "screen_capture"
    private const val MAX_FRAME_ATTEMPTS = 5
    private const val FRAME_RETRY_DELAY_MS = 100L
  }
}
