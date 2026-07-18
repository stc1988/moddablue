# HID Keyboard

This example turns a 320x240 ESP32 touchscreen into a BLE HID keyboard peripheral. Its touch UI uses Moddable's
responsive keyboard and sends each key with a single tap.

Reference: [Moddable keyboard](https://github.com/Moddable-OpenSource/moddable/tree/public/examples/piu/keyboard)

## Simulator

From the repository root:

```sh
npm run build:hid:sim
```

To launch it with the debugger:

```sh
npm run debug:hid:sim
```

The simulator uses `MockHIDKeyboardServer`. It changes from **PAIRING** to **AUTH CODE** without opening Bluetooth.
Enter `123456` on the touch keyboard and tap **OK** to continue to **CONNECTED**. Touching a key then writes the
simulated HID input to the debugger:

```text
[hid-keyboard/mock] key="A" modifiers=0
[hid-keyboard/mock] key="\r" modifiers=0
```

The mock validates the touch UI and application flow only. Sending input to another desktop application still requires
an ESP32 running the real BLE service.

## Hardware

- An ESP32 target supported by the Moddable SDK
- A 320x240 display and touch controller
- The verified target is Moddable Two

## Build

From this directory:

```sh
mcconfig -d -m -p esp32/moddable_two
```

Pair **Moddablue Keyboard** in the host operating system. When the host displays a six-digit pairing code, the keyboard
automatically switches to its numeric layout. Enter that code on the touchscreen and tap **OK**. The header changes
from **PAIRING** to **AUTH CODE**, then **CONNECTED** once the host subscribes to keyboard input. Focus a text field and
tap the on-screen keys to type.

The keyboard supports:

- Letters with Shift
- Numbers and common symbols through the `.?123` key
- Space, Backspace, and Enter
- Single-tap input without row expansion

Forget and pair the keyboard again after changing its HID report map or security configuration.

On macOS, remove **Moddablue Keyboard** from **System Settings > Bluetooth** before installing a build that changes the
PnP ID or encrypted GATT attributes. Restart the device, pair it again, and wait for these messages:

```text
[moddablue/hid] connected
[moddablue/hid] passkey action=input
[moddablue/hid] passkey submitted
[moddablue/hid] secured encrypted=true authenticated=true bonded=true keySize=16
[moddablue/hid] input report subscribed
```

The ESP32 build enables NimBLE repeat-pairing deletion. If macOS has forgotten the keyboard while an older bond remains
in ESP32 NVS, the stack removes that stale bond and retries pairing instead of leaving the connection unsecured.

## BLE Input Mapping

The touch keyboard sends its `onKeyUp` characters directly to the reusable HID service:

```ts
server.notifyCharacter(key);
```

Character conversion uses a US keyboard layout. On a host configured for a different physical layout, punctuation can
produce different symbols. Applications that require layout-independent keys should use `notifyKeyCode()`.
