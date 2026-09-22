# HID Media Control Server

Reusable BLE Consumer Control peripheral for playback, track navigation, recording, mute, and volume usages with
bonding, battery reporting, and automatic release reports.

Include `manifest.json` and import the stable public module:

```json
{
	"include": ["path/to/moddablue/modules/hid-media-control/manifest.json"]
}
```

```ts
import HIDMediaControlServer from "moddablue/hid-media-control";
```

The previous `moddablue/hid-media-control/server` and `moddablue/hid/media-control-server` imports remain available as
compatibility aliases.

See [`examples/hid-media-control`](../../examples/hid-media-control/) for usage.
