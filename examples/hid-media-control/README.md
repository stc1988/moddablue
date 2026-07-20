# HID media control

A 320x240 touch remote that sends Bluetooth Low Energy HID Consumer Control usages. The radial interface provides
play/pause, previous track, next track, volume down, and volume up controls.

The simulator uses a mock service so the complete touch UI and connection states can be tested without BLE hardware.
ESP32 builds use [`HIDMediaControlServer`](../../modules/hid/) from the reusable HID module.

## Simulator

From the repository root:

```sh
npm run build:hid-media:sim
```

To start the debugger:

```sh
npm run debug:hid-media:sim
```

The mock transitions from `PAIRING` to `SECURING` and then `CONNECTED`. Tapping a control prints the corresponding HID
usage to the debug console. The header remains dedicated to the current connection state.

```text
[hid-media-control/mock] action=volume-up usage=0x00e9
```

## ESP32

The hardware build requires an ESP32 target with BLE and a 320x240 touch display supported by the
`esp32/moddable_two` target.

```sh
cd examples/hid-media-control
mcconfig -d -m -p esp32/moddable_two
```

Pair `Moddablue Remote` in the host Bluetooth settings. The media buttons become available after the host subscribes to
the encrypted HID input report. Pairing uses bonding and Just Works because the remote does not require passkey input.

If a previously paired host does not reconnect after changing the report map or identity fields, forget the device in
the host Bluetooth settings and pair it again.
