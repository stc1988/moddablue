# ANCS Notifications Example Agent Guide

These instructions apply only to `examples/ancs-notifications/`.

## Boundaries

- Keep reusable ANCS protocol, GATT, pairing, reconnect, and notification-state logic in `../../modules/ancs/`.
- Keep Piu UI code in `NotificationsView.ts` and `components/`.
- Keep application notification state centralized in `NotificationModel.ts` and route touch input through
  `NotificationsController.ts`.
- Keep ANCS and simulator adapters in `services/`; components must not call services directly.
- Treat `NotificationService.ts` as the common notification-service contract.
- Use `MockNotificationService` for simulator builds and `ANCSNotificationService` only for ESP32 builds.
- Do not include the ANCS module in the simulator platform path.
- Import the ANCS module through `moddablue/ancs`; do not compile module source files directly in this manifest.
- Keep unsupported platforms rejected explicitly in `manifest.json`.

## Safety

- The default `ancsAction` must remain `none`.
- Never perform a notification action unless the application explicitly requests it.
- Treat `ancsAction=positive` and `ancsAction=negative` as deliberate hardware-test options only.
