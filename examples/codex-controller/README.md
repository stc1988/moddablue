# Codex controller

A 320x240 touch controller that connects to the Codex desktop app over Bluetooth Low Energy. It provides six task
buttons, ACT06, ACT07, ACT08, ACT09, ACT12, and hold-to-talk controls while displaying task colors and the focused
application sent by Codex.

The reusable server uses the ECMA-419 `embedded:io/bluetoothle/peripheral` API. Its HID report map, Vendor Report ID 6,
63-byte JSON-RPC framing, device identity, and action names implement Codex Micro compatibility based on behavior
observed in the Vibe Watch reference firmware.

The UI, simulator mock, and BLE provider share the UI-independent
`moddablue/codex-controller/service` contract from `modules/codex-controller/`.

The screen includes a four-direction joystick test pad and a rotary-knob test area alongside the compact `AG00` through
`AG05` keys. Joystick presses send full-distance normalized radial positions and return to center on release. The knob
area sends counter-clockwise and clockwise detents, while its push control reports `SHORT` or `LONG` on screen using a
500 ms threshold. See [Codex Micro controls](../../modules/codex-controller/README.md#codex-micro-controls) for the
complete control map.

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

The hardware server logs connection state, controller input, task-lighting updates, ambient-lighting updates, and
focused-app changes by default. Routine device-status requests and response bookkeeping are omitted. Set `debug: true`
in the `CodexControllerServiceProvider` options in `main.ts` to additionally log complete RPC JSON, individual HID
report subscriptions, and every completed BLE notification.

If a previously paired host does not reconnect after changing the report map or identity, forget the device in Bluetooth
settings and pair it again. The simulator validates the UI only; Bluetooth behavior requires an ESP32 build and real
hardware.
