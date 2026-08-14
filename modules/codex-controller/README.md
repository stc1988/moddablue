# Codex Controller

Composite BLE HID peripheral implementing Codex Micro-compatible Vendor Report ID 6 framing, JSON-RPC transport,
device state responses, typed device-to-host input APIs, and host-to-device state conversion.

The module also exports the UI-independent service contract used by simulator mocks. Include `manifest.json`; its BLE
server is added only for ESP32 targets.

```json
{
	"include": ["path/to/moddablue/modules/codex-controller/manifest.json"]
}
```

```ts
import HIDCodexControllerServer from "moddablue/codex-controller/server";
import type { CodexControllerService, HIDKeyEvent, RadialPosition } from "moddablue/codex-controller/service";
import { HID_KEY, LIGHTING_EFFECT } from "moddablue/codex-controller/service";
```

The previous `moddablue/hid/codex-controller-service` and `moddablue/hid/codex-controller-server` imports remain
available as compatibility aliases.

## Development boundaries

- Keep the UI-independent application contract and protocol value types in `CodexControllerService.ts`.
- Keep ECMA-419 BLE transport, HID framing, and JSON-RPC conversion in `HIDCodexControllerServer.ts`.
- Keep the public imports `moddablue/codex-controller/service` and `moddablue/codex-controller/server` stable.
- Keep UI and provider adapters in `examples/codex-controller/`.

## Codex Micro controls

Codex Micro provides the following physical controls. The 320x240 controller example represents all of them with six
compact agent keys, five action buttons, microphone control, a four-direction joystick test pad, and a rotary-knob test
area.

| Control | Count | Identifiers or directions | Behavior |
| --- | ---: | --- | --- |
| Agent key | 6 | `AG00` through `AG05` | Selects one of six agent slots. Each key receives its color from Codex. |
| Action button | 5 | `ACT06`, `ACT07`, `ACT08`, `ACT09`, `ACT12` | Invokes the corresponding Codex action. |
| Microphone | 2 | `ACT10`, `ACT11` | The paired microphone controls used for hold-to-talk. |
| Joystick | 1 | Up, down, left, right | Provides four-direction navigation. |
| Rotary knob | 1 | Clockwise, counter-clockwise | Rotates in either direction and can also be pressed. The press supports short-press and long-press operations. |

### Agent key colors

Codex sends agent-key color state with `v.oai.thstatus`. The physical keys, wire keys, status IDs, and application
indexes all use zero-based agent slots:

| Physical key | Wire key | Status `id` | Application index |
| --- | --- | ---: | ---: |
| `AG00` | `AG00` | `0` | `0` |
| `AG01` | `AG01` | `1` | `1` |
| `AG02` | `AG02` | `2` | `2` |
| `AG03` | `AG03` | `3` | `3` |
| `AG04` | `AG04` | `4` | `4` |
| `AG05` | `AG05` | `5` | `5` |

Each status entry may contain the key color, brightness, lighting effect, and effect speed. See
[Codex-to-device notifications](./PROTOCOL.md#codex-to-device-notifications) for the message format.

### Joystick and knob transport

The transport already exposes normalized joystick positions as `v.oai.rad`. Encoder rotation uses `ENC_CW` and
`ENC_CC`, and encoder press/release uses `ENC_CLK`. A hardware adapter can distinguish a short press from a long press
by the interval between the `ENC_CLK` press and release events; there is no separate long-press wire key.

The example maps joystick right, down, left, and up to normalized angles `0`, `0.25`, `0.5`, and `0.75` at distance `1`,
then sends distance `0` when released. The knob test area emits one `act: 2` event for each rotation detent. Its push
control sends the usual `ENC_CLK` press and release events and displays `SHORT` or `LONG` locally using a 500 ms
threshold.

See [Protocol](./PROTOCOL.md) for the wire format and complete application API.
