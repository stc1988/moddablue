# HID Media Control Example Agent Guide

These instructions apply only to `examples/hid-media-control/`.

## Responsibilities

- Keep the radial Piu control UI and touch behavior in `main.ts`.
- Keep the common application-facing service contract in `services/HIDMediaControlService.ts`.
- Use `MockHIDMediaControlServer` for simulator builds and the reusable HID module only for ESP32 builds.
- Keep product-specific button placement and usage mappings in this example.
- Keep reusable BLE HID and Consumer Control behavior in `../../modules/hid/`.

## Invariants

- Send media commands only after a completed tap inside the originating button.
- Preserve visible pairing, securing, connected, sent, and failure feedback.
- Keep the UI usable on a 320x240 display with one touch point.
- Do not instantiate keyboard and media-control GATT servers together.

## Validation

- Build the simulator with `npm run build:hid-media:sim -- -t build`.
- Build `esp32/moddable_two` with `npm run build:hid-media:esp32 -- -t build`.
