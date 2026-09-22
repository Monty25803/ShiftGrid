self.addEventListener("push", (event) => {
  let data = { title: "ShiftGrid", body: "You have a schedule update", href: "/schedule" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // ignore
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { href: data.href },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/schedule";
  event.waitUntil(clients.openWindow(href));
});
