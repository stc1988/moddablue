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

See [Protocol](./PROTOCOL.md) for the wire format and complete application API.
