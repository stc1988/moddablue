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
import HIDMediaControlServer from "moddablue/hid-media-control/server";
```

The previous `moddablue/hid/media-control-server` import remains available as a compatibility alias.

See [`examples/hid-media-control`](../../examples/hid-media-control/) for usage.
