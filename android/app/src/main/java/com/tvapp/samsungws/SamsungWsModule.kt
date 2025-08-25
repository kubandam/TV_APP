package com.tvapp.samsungws

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import okhttp3.*
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.*
import java.util.concurrent.TimeUnit

class SamsungWsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var webSocket: okhttp3.WebSocket? = null
  private var client: OkHttpClient? = null

  override fun getName() = "SamsungWs"

  private fun sendEvent(name: String, params: Any?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("SamsungWs_$name", params)
  }

  private fun buildUnsafeClient(allowedHost: String): OkHttpClient {
    val trustAll = arrayOf<TrustManager>(object : X509TrustManager {
      override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
      override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
      override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
    })
    val tm = trustAll[0] as X509TrustManager
    val ctx = SSLContext.getInstance("TLS")
    ctx.init(null, trustAll, SecureRandom())

    return OkHttpClient.Builder()
      .sslSocketFactory(ctx.socketFactory, tm)
      .hostnameVerifier { hostname, _ -> hostname == allowedHost } // only trust this IP/host
      .pingInterval(25, TimeUnit.SECONDS)
      .retryOnConnectionFailure(true)
      .build()
  }

  @ReactMethod
  fun connect(url: String, host: String, promise: Promise) {
    try {
      client = buildUnsafeClient(host)
      val req = Request.Builder().url(url).build()
      webSocket = client!!.newWebSocket(req, object : WebSocketListener() {
        override fun onOpen(webSocket: okhttp3.WebSocket, response: Response) {
          sendEvent("open", null)
        }
        override fun onMessage(webSocket: okhttp3.WebSocket, text: String) {
          sendEvent("message", text)
        }
        override fun onClosing(webSocket: okhttp3.WebSocket, code: Int, reason: String) {
          webSocket.close(code, reason)
        }
        override fun onClosed(webSocket: okhttp3.WebSocket, code: Int, reason: String) {
          val m = Arguments.createMap().apply {
            putInt("code", code); putString("reason", reason)
          }
          sendEvent("closed", m)
        }
        override fun onFailure(webSocket: okhttp3.WebSocket, t: Throwable, response: Response?) {
          sendEvent("error", t.message ?: "unknown")
        }
      })
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CONNECT_ERR", e)
    }
  }

  @ReactMethod
  fun send(text: String) {
    webSocket?.send(text)
  }

  @ReactMethod
  fun disconnect() {
    try { webSocket?.close(1000, "bye") } catch (_: Exception) {}
    webSocket = null
    client = null
  }
}
