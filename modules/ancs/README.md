# Apple Notification Center Service module

Provides UI-independent pairing, connection, notification retrieval, and notification actions for Apple Notification
Center Service (ANCS).

## Include

Include the high-level service from the application's `manifest.json`:

```json
{
	"include": ["../../modules/ancs/manifest-service.json"]
}
```

The manifest exposes a high-level service API:

```js
import ANCSService from "moddablue/ancs";

const service = new ANCSService(delegate, { deviceName: "My Device" });
service.start();
```

The previous `moddablue/ancs/service` import remains available as a compatibility alias. Low-level APIs are available as
`moddablue/ancs/client` and `moddablue/ancs/pairing-server`. See
[`examples/ancs-notifications/main.ts`](../../examples/ancs-notifications/main.ts) for delegate callbacks and notification
action examples.

Use `manifest-client.json` for only the client, `manifest-pairing-server.json` for only the pairing server, or
`manifest-service.json` for the composed service. The aggregate `manifest.json` includes the service and both low-level
imports for compatibility.

Control Point failures defined by ANCS are reported to `onANCSError` as `ANCSControlPointError` instances. Their `code`
property is `unknownCommand`, `invalidCommand`, `invalidParameter`, or `actionFailed`; `status` retains the platform's
numeric GATT status.

Each focused manifest includes only its required Moddable BLE role. The client manifest also includes `TextDecoder`.
