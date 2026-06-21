package com.bilibilicoreexam.assistant

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * 悬浮控制的窗口管理：收起态悬浮球、展开态菜单与顶部答案卡片。
 * 仅负责渲染与转发点击，识别状态由 AssistantController 注入。
 */
class FloatingController(
  private val context: Context,
  private val onRecognize: () -> Unit,
  private val onStop: () -> Unit,
) {

  private var floatingView: LinearLayout? = null
  private var cardView: View? = null
  private var expanded = false
  private var recognizing = false

  fun render(recognizing: Boolean) {
    this.recognizing = recognizing
    val view = floatingView ?: LinearLayout(context).also {
      it.orientation = LinearLayout.VERTICAL
      floatingView = it
      windowManager().addView(it, overlayParams(Gravity.START or Gravity.CENTER_VERTICAL))
    }
    view.removeAllViews()
    if (expanded) addMenu(view) else addBubble(view)
  }

  fun showCard(card: Card) {
    removeCard()
    val view = LinearLayout(context)
    view.orientation = LinearLayout.VERTICAL
    view.setPadding(dp(14), dp(12), dp(14), dp(12))
    view.background = round(Color.WHITE)
    view.addView(text(if (card.optionId == null) card.text else "${card.optionId}. ${card.text}", 18, "#111816"))
    view.addView(text("置信度：${card.confidence} · 来源：${card.sourceType}", 12, "#68716C"))
    view.addView(text(card.rationale, 14, "#3E4742"))
    val close = Button(context)
    close.text = "关闭"
    close.setOnClickListener { removeCard() }
    view.addView(close)
    cardView = view
    windowManager().addView(view, overlayParams(Gravity.TOP))
  }

  fun removeCard() {
    cardView?.let { if (it.parent != null) windowManager().removeView(it) }
    cardView = null
  }

  fun teardown() {
    removeCard()
    floatingView?.let { if (it.parent != null) windowManager().removeView(it) }
    floatingView = null
    expanded = false
  }

  private fun addBubble(parent: LinearLayout) {
    parent.background = null
    val bubble = TextView(context)
    bubble.text = if (recognizing) "识" else "开"
    bubble.gravity = Gravity.CENTER
    bubble.textSize = 18f
    bubble.setTextColor(Color.WHITE)
    bubble.background = oval(PINK)
    bubble.setOnClickListener {
      expanded = true
      render(recognizing)
    }
    parent.addView(bubble, LinearLayout.LayoutParams(dp(48), dp(48)))
  }

  private fun addMenu(parent: LinearLayout) {
    parent.background = round(Color.WHITE)
    parent.setPadding(dp(12), dp(10), dp(12), dp(12))
    val recognize = Button(context)
    recognize.text = if (recognizing) "识别中" else "单次识别"
    recognize.isEnabled = !recognizing
    recognize.setTextColor(Color.WHITE)
    recognize.backgroundTintList = ColorStateList.valueOf(BLUE)
    recognize.setOnClickListener {
      expanded = false
      onRecognize()
    }
    parent.addView(recognize, LinearLayout.LayoutParams(dp(132), dp(48)))

    val stop = Button(context)
    stop.text = "结束读屏"
    stop.setTextColor(PINK)
    stop.backgroundTintList = ColorStateList.valueOf(Color.WHITE)
    stop.setOnClickListener { onStop() }
    parent.addView(stop, LinearLayout.LayoutParams(dp(132), dp(48)))
  }

  private fun text(value: String, size: Int, color: String): TextView =
    TextView(context).apply {
      text = value
      textSize = size.toFloat()
      setTextColor(Color.parseColor(color))
      setPadding(0, dp(4), 0, 0)
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
    context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

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

  private fun dp(value: Int): Int = (value * context.resources.displayMetrics.density).toInt()

  companion object {
    private val PINK = Color.parseColor("#FB7299")
    private val BLUE = Color.parseColor("#00A1D6")
  }
}
