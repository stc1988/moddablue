# Codex Controller Protocol

`HIDCodexControllerServer` implements a Codex Micro-compatible device transport for the Codex desktop app. The
implementation was derived from the Vibe Watch reference firmware. It uses standard HID over GATT as its carrier, but
its Vendor Report ID 6 framing and JSON messages are specific to Codex Micro-compatible devices rather than a generic
BLE controller protocol.

This document describes the BLE identity, GATT reports, framing, and JSON messages implemented by the current server.
See the [Application API](./README.md#application-api) for the TypeScript interface used by a Moddable application.

See [Codex Micro controls](./README.md#codex-micro-controls) for the physical agent keys, action and microphone buttons,
four-direction joystick, and pressable rotary knob. The six physical agent keys and their wire values are `AG00`
through `AG05`.

## Wire protocol

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

The server requests immediate Just Works encryption and bonding with no input/output capability. Battery reads and
subscriptions, HID input reads and subscriptions, Vendor Input reads and subscriptions, Vendor Output reads and writes
with response, and Vendor Feature reads and writes require encryption. Vendor Output also advertises write without
response using the corresponding GATT property. A host may cache the name, identity, report map, and bond. Forget the
device on the host and clear the ESP32 NVS bond store when testing incompatible identity, security, or report-map
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

Task, action, and encoder-press controls send a press and a release as separate messages. `act` is `1` while pressed and
`0` when released. Encoder rotation is a one-shot event with `act: 2`; it does not send a separate release.

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

Joystick positions use normalized angle and distance values:

```json
{"m":"v.oai.rad","p":{"a":0.5,"d":1}}
```

Angles increase clockwise in screen coordinates: right is `0`, down is `0.25`, left is `0.5`, and up is `0.75`.
Distance `1` is full travel and distance `0` returns the joystick to center, where angle is ignored.

### Codex-to-device notifications

Messages without an `id` are notifications and do not produce a response.

| Method | Parameters |
| --- | --- |
| `v.oai.thstatus` | Array of agent-state objects |
| `v.oai.rgbcfg` | Object containing `ambient`, `keys`, or both |
| `host.focused_app` | Object containing `appName` |

An agent-state object has the following fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer | Zero-based agent slot, normally `0` through `5`. |
| `c` | integer | RGB color encoded as `0xRRGGBB`. |
| `b` | number | Brightness multiplier. |
| `e` | integer | Effect identifier. |
| `s` | number | Effect speed. |
| `m` | number | Magic-effect parameter. |
| `sk` | integer | Whether key backlighting is synchronized, encoded as `0` or `1`. |
| `sa` | integer | Whether ambient lighting is synchronized, encoded as `0` or `1`. |

The server accepts agent IDs from `0` through `5`, integer colors from `0x000000` through `0xffffff`, integer effects
from `0` through `6`, and `b`, `s`, and `m` values from `0` through `1`. An agent object without a valid `id` is
discarded. Invalid optional fields are omitted while the remaining valid fields are delivered. The `sk` and `sa` flags
are converted to booleans for the application callback. The wire `id` is not exposed in `AgentStatus`; it is converted
to the corresponding `key` (`0` to `AG00` through `5` to `AG05`) so received state uses the same identifier as
`sendAgent()`.

The `ambient` and `keys` objects use the same `c`, `b`, `e`, `s`, and `m` lighting fields and ranges. At least one of
those objects must contain a valid lighting field for `onAmbientStatus` to be invoked. `host.focused_app` requires a
string `appName`.

Example agent, ambient, and focused-application notifications:

```json
{"method":"v.oai.thstatus","params":[{"id":0,"c":16744448,"b":1,"e":0,"s":0}]}
{"method":"v.oai.rgbcfg","params":{"ambient":{"c":255,"b":0.5,"e":1,"s":0.25},"keys":{"c":16711680}}}
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

The current implementation reports `profile_index: 0`, `layer_index: 1`, and `is_charging: false`. Both response
methods report the built-in protocol version `v1.0`; overriding the constructor's `firmwareRevision` changes the Device
Information characteristic but does not change these JSON response values.
