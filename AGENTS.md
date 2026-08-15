# Agent Guide

This is the repository-wide guide for coding agents and maintainers. Keep protocol-specific implementation details in
the closest nested `AGENTS.md`, and keep user-facing usage documentation in README files.

## Repository Shape

```text
modules/                 Reusable BLE protocol modules
├─ ams/
├─ ancs/
├─ hid-keyboard/
├─ hid-media-control/
└─ codex-controller/
examples/                Independently buildable applications
├─ assets/               Assets shared by multiple examples
├─ ams-media-player/
├─ ancs-notifications/
├─ hid-keyboard/
├─ hid-media-control/
└─ codex-controller/
```

Each module exposes a `manifest.json` that applications include. Each example has its own README and `manifest.json` and
must remain buildable from its directory.

## Documentation Routing

Read only the documentation relevant to the task unless a cross-module change requires broader context:

- AMS protocol, GATT, or pairing work: `modules/ams/README.md` and `modules/ams/AGENTS.md`
- ANCS protocol, notification, or pairing work: `modules/ancs/README.md` and `modules/ancs/AGENTS.md`
- HID keyboard work: `modules/hid-keyboard/README.md` and `modules/hid-keyboard/AGENTS.md`
- HID media-control work: `modules/hid-media-control/README.md` and `modules/hid-media-control/AGENTS.md`
- Codex controller work and application API: `modules/codex-controller/README.md`; wire protocol work:
  `modules/codex-controller/PROTOCOL.md`
- AMS media-player UI or adapter work: `examples/ams-media-player/README.md` and its nested `AGENTS.md`
- ANCS example application work: `examples/ancs-notifications/README.md`
- HID keyboard example work: `examples/hid-keyboard/README.md`
- HID media-control example work: `examples/hid-media-control/README.md` and its nested `AGENTS.md`

Do not load another protocol's detailed documentation merely because it exists in the repository. Consult the relevant
module guides together only when changing shared BLE abstractions, repository structure, or cross-module conventions.

## Repository-Wide Rules

- Keep reusable protocol, GATT, and pairing implementation in `modules/<service>/`.
- Keep UI and application-specific state adapters in `examples/<example>/`.
- Give every module a manifest, README, and stable `moddablue/<service>/...` import names.
- Keep examples buildable from their own directories; manifests must not depend on the repository name.
- Keep byte-identical assets referenced by multiple examples in `examples/assets/`; keep app-specific assets inside the
  example that owns them.
- Add every module and example to the tables in the top-level README.
- Document hardware requirements and a verified `mcconfig` command in each example README.
- Prefer descriptive example directory names such as `<service>-<purpose>`.
- Do not introduce a shared abstraction until at least two modules need the same stable behavior.

## Documentation Synchronization

- Treat the current implementation, exported types, and manifest as the source of truth when resolving existing
  documentation drift. Do not preserve a documented behavior that the implementation does not provide.
- Update a module's README in the same change whenever its public imports, options, defaults, validation, callbacks,
  return values, or other application-visible behavior changes.
- Update the relevant protocol document in the same change whenever its identity, security, GATT layout, framing,
  limits, timing, message fields, validation, or responses change.
- Update both the README and protocol document when a change affects both the application API and the wire behavior.
- Keep planned or hypothetical behavior out of normative documentation. Clearly label external observations and
  compatibility notes so they are not mistaken for behavior implemented by this repository.
- Before handing work back, compare the affected implementation and documentation together and confirm that examples,
  constants, ranges, defaults, and field names still agree.

## Validation

- Run `npm run check` before handing work back.
- Run `npm run typecheck` and report any pre-existing typing gaps separately from new errors.
