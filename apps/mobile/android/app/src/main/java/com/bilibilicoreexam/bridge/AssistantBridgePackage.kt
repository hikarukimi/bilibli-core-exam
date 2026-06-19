package com.bilibilicoreexam.bridge

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class AssistantBridgePackage : TurboReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == NativeAssistantBridgeModule.NAME) {
      NativeAssistantBridgeModule(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        NativeAssistantBridgeModule.NAME to ReactModuleInfo(
          NativeAssistantBridgeModule.NAME,
          NativeAssistantBridgeModule.NAME,
          false,
          false,
          false,
          true,
        ),
      )
    }
}
