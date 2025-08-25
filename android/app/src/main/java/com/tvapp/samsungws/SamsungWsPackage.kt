package com.tvapp.samsungws

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SamsungWsPackage : ReactPackage {
  override fun createNativeModules(rc: ReactApplicationContext): List<NativeModule> =
    listOf(SamsungWsModule(rc))

  override fun createViewManagers(rc: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
