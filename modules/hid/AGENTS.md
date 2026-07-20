# HID Module Agent Guide

These instructions apply only to `modules/hid/`.

## Responsibilities

- `HIDKeyboardServer.ts` owns the BLE peripheral, HID-over-GATT services, keyboard report encoding, pairing, bonding,
  advertising, and host LED output reports.
- `HIDMediaControlServer.ts` owns the standalone Consumer Control HID peripheral, media usage reports, bonding,
  advertising, and battery reporting.
- Keep hardware buttons, touch input, application UI, and product-specific key mappings in examples.
- Keep the public import `moddablue/hid/keyboard-server` stable.
- Keep the public import `moddablue/hid/media-control-server` stable.

## Invariants

- Preserve the standard eight-byte boot keyboard report shape: modifiers, reserved byte, and six key codes.
- Send a release report after every automatic key press.
- Notify only the input report matching the active HID protocol mode.
- Require an encrypted subscription before sending keyboard input.
- Keep Consumer Control usages such as volume and media playback in the media-control server, not the keyboard report
  map.
- Send a release report after every automatic Consumer Control usage.
- Character conversion uses the US keyboard layout; document this wherever text helpers are exposed.

## Validation

Build `examples/hid-keyboard` for `esp32/moddable_two` after HID changes.
