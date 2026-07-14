# Apple Notification Center Service module

Provides UI-independent pairing, connection, notification retrieval, and notification actions for Apple Notification
Center Service (ANCS).

## Include

Include the module from the application's `manifest.json`:

```json
{
	"include": ["../../modules/ancs/manifest.json"]
}
```

The manifest exposes a high-level service API:

```js
import ANCSService from "moddablue/ancs/service";

const service = new ANCSService(delegate, { deviceName: "My Device" });
service.start();
```

Low-level APIs are also available as `moddablue/ancs/client` and `moddablue/ancs/pairing-server`. See
[`examples/ancs-notifications/main.js`](../../examples/ancs-notifications/main.js) for delegate callbacks and notification
action examples.

Control Point failures defined by ANCS are reported to `onANCSError` as `ANCSControlPointError` instances. Their `code`
property is `unknownCommand`, `invalidCommand`, `invalidParameter`, or `actionFailed`; `status` retains the platform's
numeric GATT status.

The module manifest also includes the Moddable manifests required for BLE central, BLE peripheral, and `TextDecoder`.
