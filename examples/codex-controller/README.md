# Codex controller

A 320x240 touch controller that connects to the Codex desktop app over Bluetooth Low Energy. It provides six task
buttons, FAST, OK, NG, PLAN, AI, and hold-to-talk controls while displaying task colors and the focused application sent
by Codex.

The reusable server uses the ECMA-419 `embedded:io/bluetoothle/peripheral` API. Its HID report map, Vendor Report ID 6,
63-byte JSON-RPC framing, device identity, and action names implement Codex Micro compatibility based on behavior
observed in the Vibe Watch reference firmware.

## Simulator

From the repository root:

```sh
npm run build:codex:sim
```

The mock transitions from `PAIRING` to `SECURING` and then `CODEX READY`, supplies six sample task colors, and logs touch
events to the debug console.

## ESP32

The hardware build requires an ESP32 target with BLE and a 320x240 touch display supported by the
`esp32/moddable_two` target.

```sh
cd examples/codex-controller
mcconfig -d -m -p esp32/moddable_two
```

Pair `Vibe Watch #1` in the computer's Bluetooth settings, then open Codex. The header changes to `CODEX READY` after
Codex subscribes to the encrypted vendor input report.

If a previously paired host does not reconnect after changing the report map or identity, forget the device in Bluetooth
settings and pair it again. The simulator validates the UI only; Bluetooth behavior requires an ESP32 build and real
hardware.
