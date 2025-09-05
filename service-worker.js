self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("iris-cache").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./script.js",
        "./Avatar.png",
        "./mic.svg",
        "./voice.gif"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
