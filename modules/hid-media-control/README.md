# HID Media Control Server

Reusable BLE HID Consumer Control peripheral for playback, track navigation, recording, mute, and volume usages with
bonding, battery reporting, and automatic release reports.

The module requires a Moddable SDK target that provides the `embedded:io/bluetoothle/peripheral` GATT server. The
included touchscreen example uses the real BLE service on ESP32 targets and a mock service in the simulator.

Include `manifest.json` and import the public module:

```json
{
	"include": ["path/to/moddablue/modules/hid-media-control/manifest.json"]
}
```

The include path is resolved relative to the application manifest. See
[`examples/hid-media-control/manifest.json`](../../examples/hid-media-control/manifest.json) for a complete platform
configuration.

```ts
import HIDMediaControlServer from "moddablue/hid-media-control";
```

The previous `moddablue/hid-media-control/server` and `moddablue/hid/media-control-server` imports remain available as
compatibility aliases.

## Quick start

```ts
import HIDMediaControlServer, { USAGE } from "moddablue/hid-media-control";

const mediaControl = new HIDMediaControlServer({
	deviceName: "My Media Remote",
});

mediaControl.onConnectionChanged = (state) => {
	if (state.subscribed) mediaControl.notifyUsage(USAGE.PLAY_PAUSE);
};

mediaControl.onNotifyError = (error) => {
	trace(`Media-control notification failed: ${error.message}\n`);
};
```

The host pairs with Just Works bonding; the application does not enter or display a passkey. A BLE connection alone is
not sufficient for sending controls. Wait until `state.subscribed` is `true`.

## Constructor options

`new HIDMediaControlServer(options?)` accepts:

| Option | Default | Description |
| --- | --- | --- |
| `autoAdvertise` | `true` | Start advertising when the GATT server is ready and resume after the last host disconnects. |
| `deviceName` | `"BLE Media Control"` | Advertised and GAP device name, limited to 29 UTF-8 bytes. |
| `releaseDelayMs` | `20` | Delay before `notifyUsage()` sends the empty release report. Must be a non-negative integer. |
| `batteryLevel` | `100` | Initial battery percentage from 0 through 100. |
| `manufacturerName` | `"Moddablue"` | Device Information manufacturer string. |
| `modelNumber` | `"BLE HID Media Control"` | Device Information model string. |
| `firmwareRevision` | `"1.0.0"` | Device Information firmware string. |
| `vendorIdSource` | `2` | PnP ID source: `1` for Bluetooth SIG or `2` for USB-IF. |
| `vendorId` | `0x16c0` | 16-bit PnP vendor ID. |
| `productId` | `0x05df` | 16-bit PnP product ID. |
| `productVersion` | `0x0100` | 16-bit PnP product version. |

Invalid battery levels, release delays, device-name lengths, vendor ID sources, or 16-bit identity values throw
`RangeError` during construction.

## Sending controls

- `notifyUsage(usage)` sends one Consumer Control press and automatically sends a release after `releaseDelayMs`.
- `pressUsage(usage)` sends a press without scheduling a release. Call `releaseAll()` when the control is released.
- `releaseAll()` sends the empty release report and clears an active press for subscribed hosts.

All three methods return `true` when at least one connected host is subscribed and a notification was attempted. A
`true` result does not confirm that the host received or acted on the notification. Asynchronous delivery failures are
reported through `onNotifyError(error)`.

`usage` must be an integer from `0x0000` through `0x03ff`; otherwise the press method throws `RangeError`. Prefer the
exported `USAGE` values:

| Constant | Value | `getUsageName()` result |
| --- | ---: | --- |
| `PLAY` | `0x00b0` | `play` |
| `PAUSE` | `0x00b1` | `pause` |
| `RECORD` | `0x00b2` | `record` |
| `FAST_FORWARD` | `0x00b3` | `fast-forward` |
| `REWIND` | `0x00b4` | `rewind` |
| `SCAN_NEXT_TRACK` | `0x00b5` | `next-track` |
| `SCAN_PREVIOUS_TRACK` | `0x00b6` | `previous-track` |
| `STOP` | `0x00b7` | `stop` |
| `EJECT` | `0x00b8` | `eject` |
| `RANDOM_PLAY` | `0x00b9` | `random-play` |
| `PLAY_PAUSE` | `0x00cd` | `play-pause` |
| `MUTE` | `0x00e2` | `mute` |
| `VOLUME_UP` | `0x00e9` | `volume-up` |
| `VOLUME_DOWN` | `0x00ea` | `volume-down` |

`getUsageName(usage)` returns the table's diagnostic name or `"unknown"` for another value.

## Connection and advertising

- `startAdvertising()` requests advertising and returns whether the GATT server is already ready to start it.
- `stopAdvertising()` cancels automatic advertising and returns whether the GATT server is ready to stop it.
- `isAdvertising()` reports the server's tracked advertising state.
- `isConnected()` reports whether any host is connected.
- `hasSubscribedHost()` reports whether any host subscribed to the Consumer Control input report.
- `getConnectionState()` returns `connected`, `connectionCount`, `subscribed`, and `subscribedReportCount`.
- `close()` cancels pending releases, closes the GATT server, and releases its resources. A closed instance cannot be
  reopened.

`onConnectionChanged(state)` runs after connection, disconnection, subscription, unsubscription, and `close()`.

## Battery

`getBatteryLevel()` returns the current percentage. `setBatteryLevel(level)` accepts an integer from 0 through 100,
throws `RangeError` for another value, and notifies hosts subscribed to the Battery Level characteristic.

## Exported constants and types

The module exports `USAGE` as a named export and as `HIDMediaControlServer.USAGE`. It also exports `getUsageName()` and
the TypeScript types `ConnectionState`, `ConsumerControlUsage`, and `HIDMediaControlServerOptions`.

See [`examples/hid-media-control`](../../examples/hid-media-control/) for a complete application.
