# Game workspace contract

- The game consumes only approved exported assets.
- The game must not depend on Workshop preview state.
- The game must not read transient runtime-only asset paths.
- The game must treat the exported manifest as the source of truth.
- If the export contract changes, stop and request a handoff from the Workshop Lead.
