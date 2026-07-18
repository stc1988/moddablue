# HID

The HID module provides reusable Bluetooth Low Energy HID peripheral services. It currently includes a keyboard server
with Report Protocol and Boot Protocol support.

## Include

Include the module manifest from an application:

```json
{
	"include": ["path/to/moddablue/modules/hid/manifest.json"]
}
```

Import the keyboard server through its stable public name:

```ts
import HIDKeyboardServer from "moddablue/hid/keyboard-server";
```

## Basic Usage

```ts
const keyboard = new HIDKeyboardServer({
	deviceName: "My Keyboard",
});

keyboard.onConnectionChanged = (state) => {
	trace(`connected=${state.connected} subscribed=${state.subscribed}\n`);
};

keyboard.onPasskeyRequested = () => {
	// Collect the six digits displayed by the host, then submit them.
	keyboard.submitPasskey(123456);
};

keyboard.notifyKeyCode(HIDKeyboardServer.KEY_CODE.ENTER);
keyboard.notifyCharacter("A");
```

The server advertises automatically when ready and after its last host disconnects. Sending methods return `false`
until a host has paired and subscribed to the input report.

## Sending Keys

```ts
keyboard.notifyKeyCode(HIDKeyboardServer.KEY_CODE.ENTER);
keyboard.notifyKeyCodes(
	[HIDKeyboardServer.KEY_CODE.A, HIDKeyboardServer.KEY_CODE.B],
	HIDKeyboardServer.MODIFIER.LEFT_SHIFT,
);

keyboard.pressKeyCode(HIDKeyboardServer.KEY_CODE.LEFT_ARROW);
keyboard.releaseAll();
```

The keyboard report supports eight modifiers and up to six simultaneous normal key codes. The `notify*` methods send a
press followed by an automatic release. The `press*` methods hold keys until `releaseAll()` is called.

To send text:

```ts
keyboard.typeText("hello\n", {
	intervalMs: 30,
	onComplete(sent) {
		trace(`complete=${sent}\n`);
	},
});
```

Character conversion uses the US keyboard layout. On hosts configured for another physical layout, punctuation may
differ. Explicit key codes are layout-independent.

## Host State

```ts
keyboard.onIndicatorsChanged = (indicators) => {
	const capsLock = (indicators & HIDKeyboardServer.INDICATOR.CAPS_LOCK) !== 0;
	trace(`caps lock=${capsLock}\n`);
};

keyboard.onNotifyError = (error) => {
	trace(`notify failed: ${error.message}\n`);
};
```

The service supports the keyboard LED output report, Report Protocol, and Boot Protocol. It sends input only through a
subscribed report matching the active protocol.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `autoAdvertise` | `true` | Advertise when ready and restart after disconnect. |
| `deviceName` | `"BLE Keyboard"` | GAP and advertising name, up to 29 UTF-8 bytes. |
| `releaseDelayMs` | `20` | Delay before an automatic release report. |
| `batteryLevel` | `100` | Initial Battery Service value from 0 through 100. |
| `manufacturerName` | `"Moddablue"` | Device Information manufacturer string. |
| `modelNumber` | `"BLE HID Keyboard"` | Device Information model string. |
| `firmwareRevision` | `"1.0.0"` | Device Information firmware string. |
| `vendorIdSource` | `2` | PnP ID vendor source: `1` for Bluetooth SIG or `2` for USB-IF. |
| `vendorId` | `0x16c0` | Development PnP vendor ID. Use an ID assigned to your product for distribution. |
| `productId` | `0x05df` | Development PnP product ID. Use an ID assigned to your product for distribution. |
| `productVersion` | `0x0100` | PnP product version in binary-coded decimal form. |

Use `setBatteryLevel()` to update the value returned by Battery Service reads. Use `close()` to stop the BLE server and
clear pending key timers.

## Security

Bonding, authenticated passkey entry, and immediate encryption are enabled. The host displays six digits; the peripheral
must collect those digits and pass the resulting number to `submitPasskey()`. HID discovery data, the mandatory PnP ID,
and report subscriptions require an encrypted connection. If a host no longer reconnects after a report-map, identity,
or security change, forget the keyboard in the host Bluetooth settings and pair it again.

Media controls use the HID Consumer Control usage page and are intentionally not part of this keyboard report.
