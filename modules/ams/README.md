# Apple Media Service module

Provides a BLE GATT client for Apple Media Service (AMS) and a short-lived peripheral server used for initial pairing
with an iPhone. It does not depend on Piu or an application-specific model.

## Include

Include only the APIs the application uses:

```json
{
	"include": [
		"../../modules/ams/manifest-client.json",
		"../../modules/ams/manifest-pairing-server.json"
	]
}
```

`manifest-client.json` exposes `moddablue/ams/client`; `manifest-pairing-server.json` exposes
`moddablue/ams/pairing-server`. The aggregate `manifest.json` includes both for compatibility.

The manifest exposes these module imports:

```js
import { AMSClient, RemoteCommandID } from "moddablue/ams/client";
import AMSPairingServer from "moddablue/ams/pairing-server";
```

See [`examples/ams-media-player/services/AMSMusicPlayerService.ts`](../../examples/ams-media-player/services/AMSMusicPlayerService.ts)
for a working example of the `AMSClient` delegate callbacks and state format.

Each focused manifest includes only its required Moddable BLE role. The client manifest also includes `TextDecoder`.

## Pairing And Connection Sequence

```mermaid
sequenceDiagram
    participant App as Application
    participant Pairing as AMSPairingServer
    participant Client as AMSClient
    participant Phone as iOS device

    App->>Pairing: new AMSPairingServer({ onPaired })
    Pairing->>Phone: Advertise AMS solicitation UUID
    Phone->>Pairing: Connect and establish security
    Pairing->>Phone: Disconnect after pairing
    Pairing-->>App: onPaired(address)
    App->>Client: connect(address)
    Client->>Phone: GATT connection and security
    par Read peer identity
        Client->>Phone: Read GAP 1800 / Device Name 2A00
        Phone-->>Client: Device Name
        Client-->>App: onAMSDeviceNameChanged(name)
    and Discover AMS
        Client->>Phone: Discover AMS service and characteristics
        Client->>Phone: Subscribe and select entity updates
        Client-->>App: onAMSConnected(address)
        Client-->>App: onAMSStateChanged(state)
    end
```

Failure to read the GAP Device Name is non-fatal and does not stop AMS discovery. The Player entity `NAME` attribute is
the media player or app name, not the peer device name.

## Characteristics

| Characteristic | UUID | Usage |
| --- | --- | --- |
| Remote Command | `9B3C81D8-57B1-4A8A-B8DF-0E56F7CA51C2` | Subscribe to receive the supported-command list, then write command IDs to control playback. |
| Entity Update | `2F7CABCE-808D-411F-9A0C-BB92BA96C102` | Subscribe to player and track notifications, then write entity/attribute request lists to select updates. |
| Entity Attribute | `C6B2F38C-23AB-46D8-A6AB-A3A870BBD5D7` | Do not subscribe. Write `{ entityID, attributeID }`, then read to retrieve complete text when an update is truncated. |

The client requests a larger GATT MTU before security and discovery. Metadata longer than the negotiated payload may
still be partial because the current embedded BLE client API does not expose repeated read-blob offsets.

## Delegate Callbacks

- `onAMSConnected(address)` — the secure connection, required discovery, subscriptions, and entity update selection are ready
- `onAMSDeviceNameChanged(name)` — the GAP Device Name was read successfully
- `onAMSStateChanged(state)` — player, playback, or track state changed
- `onAMSError(error)` — connection or required AMS discovery failed
