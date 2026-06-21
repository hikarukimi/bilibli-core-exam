package com.bilibilicoreexam

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.TextView
import com.bilibilicoreexam.assistant.AssistantController

class MainActivity : Activity() {

  private lateinit var controller: AssistantController

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    controller = AssistantController(this)
    setContentView(buildLauncher())
  }

  private fun buildLauncher(): FrameLayout {
    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.parseColor("#F7F7F2"))
    }
    val button = TextView(this).apply {
      text = "开始"
      gravity = Gravity.CENTER
      textSize = 18f
      setTextColor(Color.WHITE)
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#FB7299"))
        cornerRadius = dp(28).toFloat()
      }
      setOnClickListener { controller.startSession() }
    }
    val params = FrameLayout.LayoutParams(dp(160), dp(56)).apply {
      gravity = Gravity.CENTER
    }
    root.addView(button, params)
    return root
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    controller.onCaptureResult(requestCode, resultCode, data)
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
