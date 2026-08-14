# Codex Controller Example Agent Guide

These instructions apply only to `examples/codex-controller/`.

## Responsibilities

- Keep the 320x240 Piu task and action UI in `main.ts`.
- Use the reusable `moddablue/codex-controller/service` contract from `../../modules/codex-controller/`.
- Keep only platform provider selection and the simulator mock in `services/`.
- Use `MockCodexControllerServer` for simulator builds and the reusable ECMA-419 HID module for ESP32 builds.
- Keep Codex protocol framing and the HID-over-GATT server in `../../modules/codex-controller/`.

## Invariants

- Send a release event for every task or action press, including cancelled touches.
- Preserve six task buttons, FAST, OK, NG, PLAN, AI, and hold-to-talk controls.
- Preserve visible pairing, securing, connected, focused-app, and task-state feedback.
- Keep the UI usable on a 320x240 display with one touch point.
