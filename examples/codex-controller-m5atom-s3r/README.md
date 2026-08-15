# M5 AtomS3R Codex controller

A hardware-only Codex controller for the M5 AtomS3R. The 128x128 display shows a microphone icon surrounded by a
five-pixel BLE status frame. The AtomS3R button controls push-to-talk, an M5Stack Unit ByteButton supplies the six agent
keys and two action keys, and M5Chain JoyStick and Encoder devices provide navigation and encoder input.

The application reuses the `moddablue/codex-controller/server` BLE HID implementation. It includes the ByteButton and
M5Chain drivers directly from their Git repositories, following their `main` branches.

## Hardware

- M5 AtomS3R
- M5Stack Unit ByteButton connected to the AtomS3R Port A I2C pins
- Atom Chain Base connected to an M5Chain JoyStick and M5Chain Encoder

The ByteButton driver uses the target's default I2C bus. The M5Chain manifest supplies the AtomS3R UART pins used by the
Atom Chain Base (`TX=5`, `RX=6`).

## Controls

| Hardware control | Codex input or feedback |
| --- | --- |
| AtomS3R button | Microphone hold (`ACT10` and `ACT11`) |
| ByteButton 0 through 5 | `AG00` through `AG05` press and release |
| ByteButton LEDs 0 through 5 | Agent color and brightness from `onAgentStatus`; non-black/non-white colors receive a 25% brightness boost |
| ByteButton 6 and 7 | `ACT06` and `ACT07` press and release; LED 6 stays green and LED 7 stays red at about 50% brightness |
| M5Chain JoyStick | Four-direction radial input; right, down, left, and up use angles `0`, `0.25`, `0.5`, and `0.75` |
| M5Chain JoyStick LED | Ambient color and brightness from `onAmbientStatus` |
| M5Chain JoyStick push | `ACT08` press and release |
| M5Chain Encoder rotation | `ENC_CW` and `ENC_CC` detents |
| M5Chain Encoder push | `ENC_CLK` press and release |

The joystick uses a 15% center dead zone and selects the axis with the greatest magnitude. Returning to the dead zone
sends the radial center position. M5Chain key state is polled every 30 ms so press duration is preserved instead of
converting the devices' click events into pulses.

## Display

The screen contains no status text. Its outer frame indicates the current BLE state:

- Orange: not connected
- Cyan: BLE connected but the Codex vendor report is not subscribed
- Green: Codex subscribed and ready for controller input

The microphone icon changes color while the AtomS3R button is held. ByteButton LED 8 remains off. The JoyStick LED
retains partial ambient updates and applies the latest state when the device connects; `OFF` turns it off, while other
effects are displayed as a static color.

## Build

Set up the Moddable SDK and ESP-IDF environment, then build from this directory:

```sh
mcconfig -d -m -p esp32/m5atom_s3r -t build
```

To build through the repository script:

```sh
npm run build:codex:m5atom-s3r
```

The first build needs network access to clone `moddable-unit_hmi` and `moddable-m5chain`. Clean builds fetch their
current `main` branches again.

Pair `Vibe Watch #1` in the computer's Bluetooth settings, then open Codex. If a previously paired host does not
reconnect after a BLE report-map or identity change, forget the device and pair it again.

Focused-application notifications are written to the Moddable debug channel as
`[codex-controller-m5atom-s3r] focused app changed name=<appName>`. Attach xsbug or xsdb to view `trace()` output.

## Hardware verification

After flashing, verify that the frame advances from orange to cyan to green, the AtomS3R button sends microphone press
and release, ByteButton keys and agent LEDs follow their mappings, the joystick sends four directions and center, and
every encoder detent and push is delivered. Disconnect a chain device while holding its key to confirm that a release
event is sent.
