# ANCS Notifications Example Agent Guide

These instructions apply only to `examples/ancs-notifications/`.

## Boundaries

- Keep reusable ANCS protocol, GATT, pairing, reconnect, and notification-state logic in `../../modules/ancs/`.
- Keep `main.js` limited to example application behavior, logging, and explicit user or test actions.
- Import the ANCS module through `moddablue/ancs/service`; do not compile module source files directly in this manifest.
- Keep unsupported platforms rejected explicitly in `manifest.json`.

## Safety

- The default `ancsAction` must remain `none`.
- Never perform a notification action unless the application explicitly requests it.
- Treat `ancsAction=positive` and `ancsAction=negative` as deliberate hardware-test options only.

## Validation

Build this example for a supported ESP32 target after application or manifest changes.
