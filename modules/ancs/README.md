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

Each focused manifest includes only its required Moddable BLE role. The client manifest also includes `TextDecoder`.

## Quick start

```js
import ANCSService from "moddablue/ancs";

const service = new ANCSService(
	{
		onANCSStatus(status) {
			trace(`ANCS status=${status}\n`);
		},
		onANCSReady() {
			trace("ANCS subscriptions ready\n");
		},
		onANCSNotification(notification) {
			trace(`${notification.appName}: ${notification.title}\n`);
		},
		onANCSNotificationRemoved(notification) {
			trace(`removed uid=${notification.uid}\n`);
		},
		onANCSError(error) {
			trace(`ANCS error: ${error}\n`);
		},
	},
	{ deviceName: "My Notification Display" },
);

service.start();
```

The service first advertises for a Just Works pairing phase, then reconnects to the bonded iPhone as a central. Keep
the service reachable for the lifetime of the session.

## High-level service API

### Constructor and lifecycle

`new ANCSService(delegate, options?)` accepts an optional delegate and one option:

| Option | Default | Description |
| --- | --- | --- |
| `deviceName` | `"Moddable ANCS"` | GAP Device Name exposed while pairing. |

`start()` begins pairing and reports `"pairing"` through `onANCSStatus`. Calling it again after pairing or connection
has begun has no effect. The current API has no public stop or close method.

After bonding, the service reports `"paired"`, creates the ANCS client, and connects to the saved peer address. It keeps
an application-name cache across client reconnections. A GATT Service Changed indication or a disconnect reported
without an error ends the current session and schedules a reconnect after one second.

### Perform notification actions

`performAction(uid, action)` requests an action for a delivered notification. `uid` should be the notification's
unsigned 32-bit `uid`; `action` is `"positive"` or `"negative"`. The method returns `false` when the client or ANCS
Control Point is not ready, or when the action is invalid. It returns `true` when the write was scheduled, not when the
iPhone has completed the action.

Applications must only perform an action in response to an explicit user request and should check
`hasPositiveAction` or `hasNegativeAction` first.

ANCS Control Point failures are delivered to `onANCSError` as `ANCSControlPointError` objects. Their `code` is
`unknownCommand`, `invalidCommand`, `invalidParameter`, or `actionFailed`; `status` retains the platform's numeric GATT
status.

## Delegate callbacks

All callbacks are optional:

| Callback | When it runs |
| --- | --- |
| `onANCSStatus(status)` | High-level lifecycle changed. Current values are `"pairing"`, `"paired"`, and `"reconnecting"`. |
| `onANCSConnected(address)` | The central transport is ready. Security, discovery, and subscriptions may still be pending. |
| `onANCSReady()` | Security, required characteristic discovery, and Data Source and Notification Source subscriptions are ready. |
| `onANCSNotification(notification)` | An added or modified notification and its requested attributes have been assembled. |
| `onANCSNotificationRemoved(notification)` | A removal event was received. Only event metadata is available. |
| `onANCSServiceChanged(change)` | The peer's GATT database changed. The service disconnects and schedules a reconnect after this callback. |
| `onANCSSessionEnded()` | A previously ready session ended before reconnection. |
| `onANCSError(error)` | Transport, discovery, subscription, response-validation, or Control Point work failed. |

`onANCSConnected` is not the readiness signal; applications should wait for `onANCSReady` before presenting the session
as connected.

### Notification shape

Added and modified notifications have the following fields. Attribute fields are optional because the iPhone can
return an empty value or an error can interrupt retrieval.

| Field | Type | Description |
| --- | --- | --- |
| `uid` | number | Unsigned notification identifier used by `performAction()`. |
| `event` | number | `EventID.added` or `EventID.modified`. |
| `flags` | number | Bit field composed from `EventFlag`. |
| `category` | number | One of the `CategoryID` values. |
| `categoryCount` | number | Number of active notifications in this category reported by iOS. |
| `appIdentifier` | string | Bundle identifier supplied by ANCS. |
| `appName` | string | Resolved display name, falling back to `appIdentifier`. |
| `title` | string | Title, requested with a maximum of 96 bytes. |
| `subtitle` | string | Subtitle, requested with a maximum of 96 bytes. |
| `message` | string | Message, requested with a maximum of 384 bytes. |
| `messageSize` | string | Message size exactly as encoded by ANCS. |
| `date` | string | ANCS date string; the module does not parse it. |
| `positiveActionLabel` | string | Host-provided positive-action label. |
| `negativeActionLabel` | string | Host-provided negative-action label. |
| `hasPositiveAction` | boolean | Whether `EventFlag.positiveAction` is present. |
| `hasNegativeAction` | boolean | Whether `EventFlag.negativeAction` is present. |

A removal callback receives `event`, `flags`, `category`, `categoryCount`, and `uid`; attributes are not fetched for a
removed notification. `onANCSServiceChanged(change)` receives `{ startHandle, endHandle }`.

## Low-level APIs

Most applications should use `ANCSService`. The focused manifests also expose the components used to compose it.

### `moddablue/ancs/client`

```js
import ANCSClient, { ActionID, CategoryID, EventFlag, EventID } from "moddablue/ancs/client";
```

`new ANCSClient(delegate, { appNames? })` accepts an optional shared `Map` for application display-name caching.
`connect(address)` returns `false` when already connected and otherwise starts the connection and returns `true`.
`disconnect()` closes the current GATT client and clears queued work. `performAction(uid, action)` has the same return
semantics as the high-level service and additionally accepts numeric `ActionID` values.

The module exports frozen `ActionID`, `AppAttributeID`, `CategoryID`, `EventFlag`, `EventID`, and
`NotificationAttributeID` objects. Their values follow the ANCS specification:

- `EventID`: `added`, `modified`, and `removed`.
- `EventFlag`: `silent`, `important`, `preExisting`, `positiveAction`, and `negativeAction` bit values.
- `CategoryID`: `other`, `incomingCall`, `missedCall`, `voiceMail`, `social`, `schedule`, `email`, `news`,
  `healthAndFitness`, `businessAndFinance`, `location`, and `entertainment`.
- `ActionID`: `positive` and `negative`.

### `moddablue/ancs/pairing-server`

`new ANCSPairingServer({ deviceName?, onPaired? })` starts advertising automatically. `onPaired(address)` runs after an
encrypted, bonded pairing connection disconnects. The pairing server intentionally remains alive after transitioning
to the central because closing it can shut down the shared NimBLE host. It has no public stop or close method.

## Error and reconnect behavior

Optional GATT Service Changed discovery failures do not prevent ANCS discovery. Required ANCS service or
characteristic failures, subscription failures, response identifier mismatches, and Control Point failures invoke
`onANCSError(error)`.

A disconnect represented by the BLE client as an error-less termination triggers automatic reconnection. An error with
a value is forwarded to the delegate and is not automatically retried by the current implementation. A Service Changed
indication always disconnects and schedules reconnection.

These JavaScript modules do not yet publish TypeScript declarations; the shapes documented here describe their current
public contract.
