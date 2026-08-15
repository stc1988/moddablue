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

## Application API

Applications use the public TypeScript API exported by `moddablue/codex-controller/server` instead of constructing
Vendor Report frames or parsing JSON messages directly. See [Protocol](./PROTOCOL.md) for the wire format.

The UI-independent `CodexControllerService` interface, event and state types, `HID_KEY`, and `LIGHTING_EFFECT` are also
available from `moddablue/codex-controller/service`. The module manifest exposes the BLE server only on ESP32, so
simulator mocks and other host-independent consumers can share the same contract without loading the hardware server.

### Create the server

```ts
import HIDCodexControllerServer from "moddablue/codex-controller/server";

const server = new HIDCodexControllerServer({
	deviceName: "Vibe Watch #1",
	batteryLevel: 100,
	autoAdvertise: true,
});
```

The constructor accepts the following options:

| Option | Type | Purpose |
| --- | --- | --- |
| `autoAdvertise` | `boolean` | Start advertising when the GATT server becomes ready. Defaults to `true`. |
| `debug` | `boolean` | Additionally log complete RPC JSON, individual HID subscriptions, and notification completion. Defaults to `false`. |
| `deviceName` | `string` | BLE device name, limited to 29 UTF-8 bytes. |
| `batteryLevel` | `number` | Initial battery percentage from `0` through `100`. |
| `manufacturerName` | `string` | Device Information manufacturer name. |
| `modelNumber` | `string` | Device Information model number. |
| `serialNumber` | `string` | Device Information serial number. Defaults to a 16-digit Vibe Watch-compatible value. |
| `firmwareRevision` | `string` | Device Information firmware revision. |
| `vendorIdSource` | `1 \| 2` | PnP vendor source: Bluetooth SIG or USB-IF. |
| `vendorId` | `number` | PnP Vendor ID from `0` through `65535`. |
| `productId` | `number` | PnP Product ID from `0` through `65535`. |
| `productVersion` | `number` | PnP product version from `0` through `65535`. |

### Advertising and connection state

| API | What the application can do |
| --- | --- |
| `startAdvertising()` | Request advertising and return whether it could be started immediately. |
| `stopAdvertising()` | Stop advertising and disable automatic restart after a disconnect. |
| `isAdvertising()` | Check whether the server currently considers itself advertising. |
| `getConnectionState()` | Inspect connection and Vendor Input subscription counts. |
| `onConnectionChanged` | React to connection, disconnection, and subscription changes. |

`getConnectionState()` and `onConnectionChanged` provide this shape:

```ts
type ConnectionState = {
	connected: boolean;
	connectionCount: number;
	subscribed: boolean;
	subscribedReportCount: number;
};
```

A BLE connection alone is not enough to send application messages. `subscribed` becomes `true` after at least one
encrypted connection subscribes to Vendor Input Report ID 6.

### Send commands to Codex

| API | Application-level operation | Wire message |
| --- | --- | --- |
| `sendHID(event)` | Send a known Agent, action, or encoder-press key state using `HID_KEY`. | `v.oai.hid` with `act` `0` or `1` |
| `sendEncoderStep(key)` | Send one clockwise or counter-clockwise encoder detent. | `ENC_CW` or `ENC_CC` with `act: 2` |
| `sendRadial(position)` | Send a normalized joystick position. | `v.oai.rad` with `{a, d}` |
| `sendAgent(index, pressed)` | Convenience API for task slot index `0` through `5`. | `AG00` through `AG05` |
| `sendAction(index, pressed)` | Convenience API for action number `0` through `99`. | `ACT00` through `ACT99` |
| `sendMicrophone(pressed)` | Convenience API for the paired hold-to-talk controls. | Both `ACT10` and `ACT11` |

In an application-defined input handler, pass `true` when a control is pressed and `false` when it is released or
cancelled. `HID_KEY` provides constants for the known Codex Micro controls: `AG00` through `AG05`, `ACT06` through
`ACT12`, `ENC_CLK`, `ENC_CW`, and `ENC_CC`.

```ts
// `pressed` is supplied by the application's hardware or UI input handler.
server.sendHID({ key: HID_KEY.AG00, pressed });
server.sendHID({ key: HID_KEY.ACT06, pressed });
server.sendHID({ key: HID_KEY.ENC_CLK, pressed });

server.sendEncoderStep(HID_KEY.ENC_CW);

server.sendRadial({
	angle: 0.5,
	distance: 1,
});
```

`sendAgent()` and `sendAction()` are convenience alternatives to constructing those keys with `sendHID()`. Do not call
both forms for the same input event. `sendMicrophone()` sends both hold-to-talk actions:

```ts
server.sendAgent(0, pressed); // AG00
server.sendAction(6, pressed); // ACT06
server.sendMicrophone(pressed); // ACT10 and ACT11
```

Encoder rotation is a one-shot event rather than a press/release pair. `HIDKeyEvent.key` is a literal union of `AG00`
through `AG05`, the two-digit action namespace `ACT00` through `ACT99`, and `ENC_CLK`. Only the verified `ACT06` through
`ACT12` controls have `HID_KEY` constants; use `sendAction()` for another two-digit action number. `EncoderStepKey` is
`ENC_CW` or `ENC_CC`. The existing `HID_KEY.ENCODER_PRESS`, `HID_KEY.ENCODER_CLOCKWISE`, and
`HID_KEY.ENCODER_COUNTERCLOCKWISE` names remain available as compatibility aliases. `RadialPosition` exposes the named
`angle` and `distance` properties. The server additionally checks these types and the normalized radial range at
runtime.

Each method returns `true` when at least one report was queued for a subscribed connection. It returns `false` when
there was no eligible connection. A `true` result confirms queueing only; it does not confirm that Codex processed the
message.

### Receive state from Codex

| Callback | Application-level information | Protocol method |
| --- | --- | --- |
| `onAgentStatus` | Task-slot colors, brightness, effect, and speed. | `v.oai.thstatus` |
| `onAmbientStatus` | Ambient color and effect configuration. | `v.oai.rgbcfg` |
| `onFocusedApp` | Name of the focused host application. | `host.focused_app` |
| `onNotifyError` | Error reported while sending a queued BLE notification. | Not a JSON message |

```ts
server.onAgentStatus = status => {
	for (const agent of status)
		trace(`agent=${agent.id} color=${agent.color}\n`);
};

server.onAmbientStatus = status => {
	trace(`ambient=${status.ambient?.color}\n`);
};

server.onFocusedApp = appName => {
	trace(`focused app=${appName}\n`);
};

server.onNotifyError = error => {
	trace(`notify error=${error.message}\n`);
};
```

The server validates the JSON-RPC parameters and converts the compact wire keys into application-facing names:
`c` to `color`, `b` to `brightness`, `e` to `effect`, `s` to `speed`, `m` to `magic`, `sk` to
`syncKeysBacklight`, and `sa` to `syncAmbient`. The `sk` and `sa` integer flags become booleans. Agent IDs are limited
to `0` through `5`, colors to `0x000000` through `0xffffff`, effects to `0` through `6`, and normalized values to
`0` through `1`. Invalid agent entries and invalid optional fields are omitted. Malformed method parameters do not
invoke their callback.

Fields other than `id` are optional in the `AgentStatus` callback type. `AmbientStatus` can contain both `ambient` and
`keys` lighting objects. Missing numeric state fields are interpreted by the controller example UI as zero.

Use `HIDCodexControllerServer.LIGHTING_EFFECT` instead of numeric effect literals. The map provides `OFF`, `SOLID`,
`SNAKE`, `RAINBOW`, `BREATH`, `GRADIENT`, and `SHALLOW_BREATH`, mapped to protocol values `0` through `6`. The exported
`LightingEffect` type is derived from these values, so the runtime map and TypeScript type stay aligned.

### Battery level

```ts
server.setBatteryLevel(75);
const level = server.getBatteryLevel();
```

`setBatteryLevel()` changes the value returned by the Battery service and notifies encrypted subscribers. It also
changes the `battery` field returned by a subsequent `device.status` request. The level must be an integer from `0`
through `100`.

### Close the server

```ts
server.close();
```

`close()` stops advertising and outbound pacing, clears queued reports and connections, and closes the GATT server.

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

See [Protocol](./PROTOCOL.md) for the wire format.
