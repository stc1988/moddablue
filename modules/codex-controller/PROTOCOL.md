# Codex Controller Protocol and Application API

`HIDCodexControllerServer` implements a Codex Micro-compatible device transport for the Codex desktop app. The
implementation was derived from the Vibe Watch reference firmware. It uses standard HID over GATT as its carrier, but
its Vendor Report ID 6 framing and JSON messages are specific to Codex Micro-compatible devices rather than a generic
BLE controller protocol.

This document separates the bytes and messages exchanged on the wire from the TypeScript API used by a Moddable
application:

- [Part 1: Wire protocol](#part-1-wire-protocol) defines BLE identity, GATT reports, framing, and JSON messages.
- [Part 2: Application API](#part-2-application-api) describes what an application can do with
  `HIDCodexControllerServer`.

## Part 1: Wire protocol

### Identity, advertising, and security

The default identity retains the values observed in the Vibe Watch reference firmware so that Codex recognizes the
device as Codex Micro-compatible:

| Field | Default |
| --- | --- |
| Device name | `Vibe Watch #1` |
| Appearance | `0x03c1` (Keyboard) |
| Advertised service | `0x1812` (Human Interface Device) |
| Manufacturer | `VibeWatch` |
| Model | `VibeWatch` |
| Serial number | `0000000000000001` |
| Firmware revision | `v1.0` |
| PnP vendor source | `1` (Bluetooth SIG) |
| Vendor ID | `0x303a` |
| Product ID | `0x8360` |
| Product version | `0x0001` |

The server uses immediate Just Works encryption and bonding. Battery reads and subscriptions, HID input subscriptions,
and all Vendor Report ID 6 access require encryption. A host may cache the name, identity, report map, and bond. Forget
the device on the host and clear the ESP32 NVS bond store when testing incompatible identity, security, or report-map
changes.

### GATT and HID report layout

The peripheral provides GAP (`0x1800`), Device Information (`0x180a`), Battery (`0x180f`), and HID (`0x1812`) services.
The HID Report Reference descriptor (`0x2908`) distinguishes the repeated Report characteristics (`0x2a4d`).

| Report ID | Type | Value length | Purpose |
| --- | --- | ---: | --- |
| 1 | Input | 8 bytes | Keyboard report |
| 2 | Input | 2 bytes | Consumer Control report |
| 3 | Input | 5 bytes | Relative pointer report |
| 6 | Input | 63 bytes | Device-to-Codex vendor messages; Codex subscribes to notifications |
| 6 | Output | 63 bytes | Codex-to-device vendor messages; Codex writes reports |
| 6 | Feature | 63 bytes | Compatibility feature report; no application behavior is assigned |

Application messages use only Vendor Report ID 6. The standard keyboard, Consumer Control, and pointer input
collections are present for Codex Micro report-map compatibility. Vendor Input supports encrypted read and notify;
Vendor Output supports encrypted read, write, and write without response; Vendor Feature supports encrypted read and
write.

### Vendor Report ID 6 framing

The report map declares each Vendor Report value as 63 bytes. The device emits 63-byte input reports. Its output parser
also accepts a shorter write when the declared payload fits in the received value. The HID Report ID is described by the
Report Reference descriptor and is not included in the report value.

| Offset | Size | Meaning |
| ---: | ---: | --- |
| 0 | 1 | Channel. `2` identifies a JSON message. Other channels are ignored. |
| 1 | 1 | Payload length from `0` through `61`. |
| 2 | 61 | UTF-8 payload bytes followed by zero padding. Only the declared payload length is significant. |

For example, a one-report button press begins as follows:

```text
02 2c 7b 22 6d 22 3a 22 76 2e 6f 61 69 2e 68 69 ...
|  |  └─ {"m":"v.oai.hid","p":{"k":"AG00","act":1}}\r\n
|  └─ payload length (44 bytes in this example)
└─ JSON channel
```

JSON longer than 61 bytes is split across consecutive reports. The receiver concatenates only the declared payload
bytes and identifies a complete top-level JSON value while respecting strings and escapes. Protocol messages must be
JSON objects; other top-level JSON values are discarded. CR and LF bytes between messages are ignored. Device-originated
messages end in CRLF for Codex Micro compatibility, following the behavior observed in the Vibe Watch reference.

The largest accepted inbound message is 2048 bytes. An invalid chunk length or oversized message clears the
connection's receive buffer. Device-to-Codex reports are queued and paced 12 ms apart. The debug log distinguishes a
JSON message being queued (`sending RPC message`) from each BLE notification completing (`notification sent`).

### JSON envelope

Inbound messages accept either the long field names or their compact equivalents:

| Meaning | Long name | Compact name |
| --- | --- | --- |
| Method | `method` | `m` |
| Parameters | `params` | `p` |
| Request identifier | `id` | `i` |

Device-originated key events use compact names. Responses use `id`, `method`, and `result`.

Messages fall into three categories:

- A notification has no request identifier and produces no response.
- A request contains an identifier and a method.
- A response contains `id`, `method`, and `result`.

### Device-to-Codex key events

All task and action controls send a press and a release as separate messages. `act` is `1` while pressed and `0` when
released.

```json
{"m":"v.oai.hid","p":{"k":"AG00","act":1}}
```

| Key values | Meaning |
| --- | --- |
| `AG00` through `AG05` | Select task slots 1 through 6. |
| `ACT00` through `ACT99` | Invoke a Codex action. |
| `ACT10` and `ACT11` | Paired hold-to-talk controls. |
| `ENC_CLK` | Encoder press. |
| `ENC_CW` | Encoder clockwise detent. |
| `ENC_CC` | Encoder counter-clockwise detent. |

The controller example assigns `ACT00` to FAST, `ACT01` to OK, `ACT02` to NG, `ACT03` to PLAN, and `ACT04` to AI.
These assignments belong to the example application rather than the framing protocol.

Joystick positions use normalized angle and distance values:

```json
{"m":"v.oai.rad","p":{"a":0.5,"d":1}}
```

### Codex-to-device notifications

Messages without an `id` are notifications and do not produce a response.

| Method | Parameters |
| --- | --- |
| `v.oai.thstatus` | Array of agent-state objects |
| `v.oai.rgbcfg` | Object containing `ambient` |
| `host.focused_app` | Object containing `appName` |

An agent-state object has the following fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer | Zero-based agent slot, normally `0` through `5`. |
| `c` | integer | RGB color encoded as `0xRRGGBB`. |
| `b` | number | Brightness multiplier. |
| `e` | integer | Effect identifier. |
| `s` | number | Effect speed. |

Example agent, ambient, and focused-application notifications:

```json
{"method":"v.oai.thstatus","params":[{"id":0,"c":16744448,"b":1,"e":0,"s":0}]}
{"method":"v.oai.rgbcfg","params":{"ambient":{"c":255,"b":0.5,"e":1,"s":0.25}}}
{"method":"host.focused_app","params":{"appName":"Codex"}}
```

### Codex-to-device requests and responses

A message containing both an identifier and a method is treated as a request. The device applies any recognized
notification behavior first, then returns a response on Vendor Input Report ID 6.

| Request method | `result` payload |
| --- | --- |
| `device.status` | `version`, `profile_index`, `layer_index`, `battery`, and `is_charging` |
| `sys.version` | `version` |
| Any other method | `{"ok":1}` |

```json
{"id":7,"method":"device.status"}
{"id":7,"method":"device.status","result":{"version":"v1.0","profile_index":0,"layer_index":1,"battery":100,"is_charging":false}}
```

The current implementation reports `profile_index: 0`, `layer_index: 1`, and `is_charging: false`.

## Part 2: Application API

This part describes the public TypeScript API exported by `moddablue/codex-controller/server`. Applications use
this API instead of constructing Vendor Report frames or parsing JSON messages directly.

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
| `debug` | `boolean` | Log complete RPC JSON, individual HID subscriptions, and notification completion. Defaults to `false`. |
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
| `sendHID(event)` | Send a typed Agent, action, or encoder event. | `v.oai.hid` with `{k, act, ag?}` |
| `sendRadial(position)` | Send a normalized joystick position. | `v.oai.rad` with `{a, d}` |
| `sendAgent(index, pressed)` | Select task slot 1 through 6 with index `0` through `5`. | `AG00` through `AG05` |
| `sendAction(index, pressed)` | Send action number `0` through `99`. | `ACT00` through `ACT99` |
| `sendMicrophone(pressed)` | Send the paired hold-to-talk controls. | Both `ACT10` and `ACT11` |

Pass `true` for a press and `false` for a release:

```ts
server.sendAgent(0, true);
server.sendAgent(0, false);

server.sendAction(1, true);
server.sendAction(1, false);

server.sendMicrophone(true);
server.sendMicrophone(false);

server.sendHID({
	key: HIDCodexControllerServer.HID_KEY.ENCODER_CLOCKWISE,
	pressed: true,
});

server.sendRadial({
	angle: 0.5,
	distance: 1,
});
```

`HIDKeyEvent.key` is a literal union of `AG00` through `AG05`, `ACT00` through `ACT99`, and `ENC_CLK`, `ENC_CW`, or
`ENC_CC`. Its optional `agent` field is typed as `0 | 1 | 2 | 3 | 4 | 5`. `RadialPosition` exposes the named
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
