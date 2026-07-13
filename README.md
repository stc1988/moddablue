# Moddablue

Moddablue is a collection of Bluetooth Low Energy services and applications built with the
[Moddable SDK](https://github.com/Moddable-OpenSource/moddable).

It provides independently buildable examples for using BLE with Moddable, including media and notification integration
with iPhone.

## Modules

| Module | Import | Description |
| --- | --- | --- |
| [`ams`](modules/ams/) | `moddablue/ams/*` | AMS GATT client and peripheral server for pairing |
| [`ancs`](modules/ancs/) | `moddablue/ancs/*` | ANCS connection, notification retrieval, and notification actions |

Each module has its own `manifest.json` and can be included from an application's manifest. See the module README files
for public APIs and include examples.

## Examples

| Example | Service | Target | Description |
| --- | --- | --- | --- |
| [`ams-media-player`](examples/ams-media-player/) | Apple Media Service (AMS) | simulator / ESP32 | 240x320 Piu media player. The simulator uses a mock service. |
| [`ancs-notifications`](examples/ancs-notifications/) | Apple Notification Center Service (ANCS) | ESP32 | Retrieves iPhone notifications and performs notification actions. |

Each example has its own `manifest.json`, includes reusable implementations from `modules/`, and can be built
independently. See each example's README for hardware requirements, usage, and limitations.

## Getting Started

### AMS media player in the simulator

```sh
npm install
npm run build:sim
```

To start the debugger:

```sh
npm run debug:sim
```

### ANCS notifications on ESP32

```sh
cd examples/ancs-notifications
mcconfig -d -m -p esp32/moddable_two
```

## Development

Run repository-wide static checks:

```sh
npm run check
npm run typecheck
```

To apply automatic formatting and safe fixes:

```sh
npm run check:write
```

Implementation responsibilities, validation rules, and relevant Moddable SDK references are documented in
[`AGENTS.md`](AGENTS.md).

## Adding a Module and Example

Add reusable BLE protocol logic under `modules/<service-name>/` together with a manifest and README. Add a usage example
under `examples/<example-name>/` with its own `manifest.json` and README, then include the module manifest. Keep UI and
application-specific state adapters in the example.

## License

Source code is provided under the [MIT License](LICENSE). Bundled fonts and other third-party assets remain subject to
their respective licenses. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for details.
