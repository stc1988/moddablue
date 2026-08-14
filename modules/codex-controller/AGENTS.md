# Codex Controller Module Agent Guide

- Keep the UI-independent application contract and protocol value types in `CodexControllerService.ts`.
- Keep ECMA-419 BLE transport, HID framing, and JSON-RPC conversion in `HIDCodexControllerServer.ts`.
- Keep the public imports `moddablue/codex-controller/service` and `moddablue/codex-controller/server` stable.
- Keep UI and provider adapters in `examples/codex-controller/`.
