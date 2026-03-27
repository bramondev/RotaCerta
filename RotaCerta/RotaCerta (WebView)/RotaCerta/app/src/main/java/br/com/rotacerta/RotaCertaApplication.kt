package br.com.rotacerta

import android.app.Application
import com.onesignal.notifications.INotificationClickEvent
import com.onesignal.notifications.INotificationClickListener
import com.onesignal.OneSignal

class RotaCertaApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        OneSignal.initWithContext(this, ONE_SIGNAL_APP_ID)
        OneSignal.Notifications.addClickListener(object : INotificationClickListener {
            override fun onClick(event: INotificationClickEvent) {
                val screen = event.notification.additionalData?.optString("screen")
                val launchUrl = event.notification.launchURL.orEmpty()

                val targetRoute = when {
                    screen == "community" -> "/#/community"
                    launchUrl.contains("#/community") -> "/#/community"
                    else -> null
                }

                if (targetRoute != null) {
                    NotificationRouting.open(targetRoute)
                }
            }
        })
    }

    private companion object {
        const val ONE_SIGNAL_APP_ID = "977604f7-a451-4b2a-8a3c-588c9f7ca553"
    }
}
