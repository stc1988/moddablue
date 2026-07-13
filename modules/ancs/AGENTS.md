# ANCS Module Agent Guide

These instructions apply only to `modules/ancs/`.

## Responsibilities

- `ANCSService.js` coordinates pairing, client lifecycle, reconnects, notification state, app-name caching, and actions.
- `ANCSClient.js` owns GATT discovery, subscriptions, control-point writes, and response parsing.
- `ANCSPairingServer.js` owns the short-lived BLE peripheral pairing and solicitation flow.
- The module must remain independent of application UI.

## Invariants

- Notification actions must remain explicitly requested by the application.
- The default example build must never perform an action automatically.
- Preserve cached app display names across client reconnects.
- Keep the peripheral alive while transitioning to the central; closing it can shut down the shared NimBLE host.
- Preserve the public imports `moddablue/ancs/service`, `moddablue/ancs/client`, and
  `moddablue/ancs/pairing-server`.

## Validation

Build `examples/ancs-notifications` for a supported ESP32 target after ANCS changes.
