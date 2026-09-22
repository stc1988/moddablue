# HID Keyboard Server

Reusable BLE HID keyboard peripheral with Report and Boot Protocol support, pairing, bonding, battery reporting, host
LED output, US-layout character conversion, and automatic key-release helpers.

The module requires a Moddable SDK target that provides the `embedded:io/bluetoothle/peripheral` GATT server. The
included touchscreen example uses the real BLE service on ESP32 targets and a mock service in the simulator.

Include `manifest.json` and import the stable public module:

```json
{
	"include": ["path/to/moddablue/modules/hid-keyboard/manifest.json"]
}
```

The include path is resolved relative to the application manifest. For example,
[`examples/hid-keyboard/manifest.json`](../../examples/hid-keyboard/manifest.json) uses
`../../modules/hid-keyboard/manifest.json` from its directory.

```ts
import HIDKeyboardServer from "moddablue/hid-keyboard";
```

The previous `moddablue/hid-keyboard/server` and `moddablue/hid/keyboard-server` imports remain available as
compatibility aliases.

See [`examples/hid-keyboard`](../../examples/hid-keyboard/) for a complete application.

## Quick start

```ts
import HIDKeyboardServer from "moddablue/hid-keyboard";

const keyboard = new HIDKeyboardServer({
	deviceName: "My Keyboard",
});

keyboard.onConnectionChanged = (state) => {
	if (state.subscribed) keyboard.notifyCharacter("A");
};

keyboard.onNotifyError = (error) => {
	trace(`Keyboard notification failed: ${error.message}\n`);
};

keyboard.onPasskeyRequested = () => {
	// Obtain the six-digit code displayed by the host through your application's UI.
	showPasskeyEntry((passkey) => keyboard.submitPasskey(passkey));
};
```

`showPasskeyEntry()` represents application-specific input. The complete touchscreen example implements this flow by
switching to a numeric layout, collecting the host's six-digit code, and passing it to `submitPasskey()`.

`notifyCharacter()` and the other notification methods return `true` when at least one connected host is subscribed to
the input report for the current protocol mode. Delivery errors are asynchronous and are reported through
`onNotifyError`.

## Constructor options

`new HIDKeyboardServer(options?)` accepts:

| Option | Default | Description |
| --- | --- | --- |
| `autoAdvertise` | `true` | Start advertising when the GATT server is ready and resume after the last host disconnects. |
| `deviceName` | `"BLE Keyboard"` | Advertised and GAP device name, limited to 29 UTF-8 bytes. |
| `releaseDelayMs` | `20` | Delay before helpers send the empty key-release report. Must be a non-negative integer. |
| `batteryLevel` | `100` | Initial battery percentage from 0 through 100. |
| `manufacturerName` | `"Moddablue"` | Device Information manufacturer string. |
| `modelNumber` | `"BLE HID Keyboard"` | Device Information model string. |
| `firmwareRevision` | `"1.0.0"` | Device Information firmware string. |
| `vendorIdSource` | `2` | PnP ID source: `1` for Bluetooth SIG or `2` for USB-IF. |
| `vendorId` | `0x16c0` | 16-bit PnP vendor ID. |
| `productId` | `0x05df` | 16-bit PnP product ID. |
| `productVersion` | `0x0100` | 16-bit PnP product version. |

## Sending keys

Character conversion uses a US keyboard layout. Unsupported characters return `false`; use key codes for physical keys
that should not depend on text layout.

- `notifyCharacter(character, modifiers?)` converts one character, sends its press report, then automatically releases
  it after `releaseDelayMs`.
- `notifyKeyCode(keyCode, modifiers?)` sends and automatically releases one HID key code.
- `notifyKeyCodes(keyCodes, modifiers?)` sends and automatically releases up to six simultaneous HID key codes.
- `notifyKey({ character, keyCodes, keyCode, modifiers? })` selects the first provided input in that order and uses the
  corresponding notification helper.
- `pressKeyCode(keyCode, modifiers?)` and `pressKeyCodes(keyCodes, modifiers?)` send a press report without scheduling a
  release. Call `releaseAll()` when the keys should be released.
- `releaseAll()` cancels queued text and sends an empty report to release every key.

Use the exported `KEY_CODE` and `MODIFIER` constants instead of numeric literals:

```ts
import HIDKeyboardServer, { KEY_CODE, MODIFIER } from "moddablue/hid-keyboard";

keyboard.notifyKeyCode(KEY_CODE.C, MODIFIER.LEFT_CONTROL);
```

The keyboard report supports six simultaneous non-modifier keys. Passing more than six throws `RangeError`.

### Typing text

`typeText(text, options?)` queues supported US-layout characters and returns `false` without adding them when no host is
subscribed or any character is unsupported. Its options are:

- `intervalMs`: pause after releasing one character before pressing the next; defaults to `releaseDelayMs`.
- `modifiers`: modifiers ORed into every generated character report.
- `onComplete(sent)`: called with `true` after the final character is released, or `false` if the queue is cancelled by
  `releaseAll()`, loss of all subscribed hosts, or a send failure.

Calls to `typeText()` append to the existing queue. An empty string completes immediately with `true`.

## Connection and advertising

- `startAdvertising()` requests advertising and returns whether the GATT server is already ready to start it.
- `stopAdvertising()` cancels automatic advertising and returns whether the GATT server is ready to stop it.
- `isAdvertising()` reports the server's tracked advertising state.
- `isConnected()` reports whether any host is connected.
- `hasSubscribedHost()` reports whether any host subscribed to an input report.
- `getConnectionState()` returns `connected`, `connectionCount`, `protocolMode`, `subscribed`, and
  `subscribedReportCount`.
- `close()` stops pending work, closes the GATT server, and releases its resources. A closed instance cannot be reopened.

`onConnectionChanged(state)` runs after connection, disconnection, subscription, unsubscription, protocol-mode changes,
and `close()`. A BLE connection alone is not sufficient for typing; wait for `state.subscribed`.

## Pairing, indicators, and battery

The server requests authenticated bonding with passkey input. When `onPasskeyRequested()` runs, collect the six-digit
code displayed by the host and pass its numeric value to `submitPasskey(passkey)`. The method returns `false` if no
passkey request is pending and throws `RangeError` outside 000000 through 999999.

`getIndicators()` returns the most recent host LED output bits, while `hasIndicator(indicator)` tests one of the exported
`INDICATOR` values. `onIndicatorsChanged(indicators)` runs when those bits change.

`getBatteryLevel()` reads the current percentage. `setBatteryLevel(level)` accepts an integer from 0 through 100 and
notifies hosts subscribed to the Battery Level characteristic.

`onNotifyError(error)` reports asynchronous BLE notification failures. A `true` return from a sending method means that
notification was attempted, not that the host received it.

## Exported constants and types

The module exports `KEY_CODE`, `MODIFIER`, `INDICATOR`, and `PROTOCOL_MODE`, both as named exports and as static properties
of `HIDKeyboardServer`. It also exports the TypeScript types `ConnectionState`, `HIDKeyboardServerOptions`, `Indicator`,
`KeyCode`, `KeyOptions`, `Modifier`, `ProtocolMode`, and `TypeTextOptions`.
