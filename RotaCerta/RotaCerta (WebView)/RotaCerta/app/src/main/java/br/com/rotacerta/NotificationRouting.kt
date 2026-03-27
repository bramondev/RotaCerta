package br.com.rotacerta

object NotificationRouting {
    @Volatile
    private var pendingHashRoute: String? = null

    @Volatile
    private var routeListener: ((String) -> Unit)? = null

    @Synchronized
    fun bind(listener: ((String) -> Unit)?) {
        routeListener = listener

        val routeToDeliver = pendingHashRoute
        if (listener != null && routeToDeliver != null) {
            pendingHashRoute = null
            listener(routeToDeliver)
        }
    }

    @Synchronized
    fun open(hashRoute: String) {
        val listener = routeListener
        if (listener != null) {
            listener(hashRoute)
            return
        }

        pendingHashRoute = hashRoute
    }
}
