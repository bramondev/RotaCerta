importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

const CACHE_NAME = "rotacerta-cache-v3";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/Rotacertaoficial.jpg"];

const firebaseConfig = {
  apiKey: "AIzaSyBjUkAMToriAZsCqt5lcgup3uUR5dHPs4s",
  authDomain: "rota-certa-43342.firebaseapp.com",
  projectId: "rota-certa-43342",
  storageBucket: "rota-certa-43342.firebasestorage.app",
  messagingSenderId: "401156619389",
  appId: "1:401156619389:web:51f4773768dac3a90f4514",
  measurementId: "G-XLKGL4WLVB",
};

firebase.initializeApp(firebaseConfig);
firebase.messaging();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        )
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }

          return Response.error();
        });
    }),
  );
});
