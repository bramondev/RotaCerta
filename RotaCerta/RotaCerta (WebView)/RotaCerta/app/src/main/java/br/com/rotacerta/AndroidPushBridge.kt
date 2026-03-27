package br.com.rotacerta

import android.app.Activity
import android.webkit.JavascriptInterface
import com.onesignal.OneSignal
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AndroidPushBridge(private val activity: Activity) {
    @JavascriptInterface
    fun syncUser(userId: String?, userType: String?) {
        val normalizedUserId = userId?.trim().orEmpty()
        val normalizedUserType = userType?.trim().takeUnless { it.isNullOrBlank() } ?: "motoboy"

        activity.runOnUiThread {
            if (normalizedUserId.isBlank()) {
                OneSignal.logout()
                return@runOnUiThread
            }

            OneSignal.login(normalizedUserId)
            OneSignal.User.addTag("app", "rota_certa")
            OneSignal.User.addTag("supabase_user_id", normalizedUserId)
            OneSignal.User.addTag("user_role", normalizedUserType)
        }
    }

    @JavascriptInterface
    fun logoutUser() {
        activity.runOnUiThread {
            OneSignal.logout()
        }
    }

    @JavascriptInterface
    fun requestPermission() {
        activity.runOnUiThread {
            CoroutineScope(Dispatchers.Main).launch {
                OneSignal.Notifications.requestPermission(true)
            }
        }
    }
}
