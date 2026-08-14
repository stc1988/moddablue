# HID Keyboard Server

Reusable BLE HID keyboard peripheral with Report and Boot Protocol support, pairing, bonding, battery reporting, host
LED output, US-layout character conversion, and automatic key-release helpers.

Include `manifest.json` and import the stable public module:

```json
{
	"include": ["path/to/moddablue/modules/hid-keyboard/manifest.json"]
}
```

```ts
import HIDKeyboardServer from "moddablue/hid-keyboard/server";
```

The previous `moddablue/hid/keyboard-server` import remains available as a compatibility alias.

See [`examples/hid-keyboard`](../../examples/hid-keyboard/) for a complete application.
