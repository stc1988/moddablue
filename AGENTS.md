# Agent Guide

This is the repository-wide guide for coding agents and maintainers. Keep protocol-specific implementation details in
the closest nested `AGENTS.md`, and keep user-facing usage documentation in README files.

## Repository Shape

```text
modules/                 Reusable BLE protocol modules
├─ ams/
└─ ancs/
examples/                Independently buildable applications
├─ ams-media-player/
└─ ancs-notifications/
```

Each module exposes a `manifest.json` that applications include. Each example has its own README and `manifest.json` and
must remain buildable from its directory.

## Documentation Routing

Read only the documentation relevant to the task unless a cross-module change requires broader context:

- AMS protocol, GATT, or pairing work: `modules/ams/README.md` and `modules/ams/AGENTS.md`
- ANCS protocol, notification, or pairing work: `modules/ancs/README.md` and `modules/ancs/AGENTS.md`
- AMS media-player UI or adapter work: `examples/ams-media-player/README.md` and its nested `AGENTS.md`
- ANCS example application work: `examples/ancs-notifications/README.md`

Do not load another protocol's detailed documentation merely because it exists in the repository. Consult both module
guides only when changing shared BLE abstractions, repository structure, or cross-module conventions.

## Repository-Wide Rules

- Keep reusable protocol, GATT, and pairing implementation in `modules/<service>/`.
- Keep UI and application-specific state adapters in `examples/<example>/`.
- Give every module a manifest, README, and stable `moddablue/<service>/...` import names.
- Keep examples buildable from their own directories; manifests must not depend on the repository name.
- Add every module and example to the tables in the top-level README.
- Document hardware requirements and a verified `mcconfig` command in each example README.
- Prefer descriptive example directory names such as `<service>-<purpose>`.
- Do not introduce a shared abstraction until at least two modules need the same stable behavior.

## Validation

- Run `npm run check` before handing work back.
- Run `npm run typecheck` and report any pre-existing typing gaps separately from new errors.
- For simulator validation, run `npm run build:sim -- -t build`.
- For hardware-module changes, build the affected example for a supported ESP32 target.
- Use `npm run debug:sim` for simulator debugging.
- Do not use `mcrun` unless a later task explicitly changes the workflow.
