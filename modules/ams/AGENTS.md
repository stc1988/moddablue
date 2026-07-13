# AMS Module Agent Guide

These instructions apply only to `modules/ams/`.

## Responsibilities

- `AMSClient.js` owns GATT service discovery, AMS subscriptions, GAP Device Name reads, and AMS entity parsing.
- `AMSPairingServer.js` owns the short-lived BLE peripheral pairing and solicitation flow.
- The module must remain independent of Piu and application-specific models.

## Invariants

- Read the peer device name from GAP service `1800`, characteristic `2A00`, after GATT security.
- Treat AMS Player `NAME` as the media player or app name; never use it as the peer device name.
- Subscribe only to Remote Command and Entity Update.
- Keep Entity Attribute available for write-then-read follow-up requests; never add it to the subscription sequence.
- A GAP Device Name read failure must be logged but must not fail the AMS connection.
- Request a larger GATT MTU before security and service discovery.
- Preserve the public imports `moddablue/ams/client` and `moddablue/ams/pairing-server`.

## Reference Implementations

- `$(MODDABLE)/examples/network/ble/ios-media-sync/main.js`
- `$(MODDABLE)/examples/network/ble/ios-media-sync/manifest.json`
- `$(MODDABLE)/modules/network/ble/ams-client/amsclient.js`

## Validation

Build `examples/ams-media-player` for a supported ESP32 target after AMS changes.
