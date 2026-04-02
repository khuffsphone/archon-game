# Slice contract

The game agent must assume the Workshop exports:

- a populated manifest
- approved asset ids
- approved file paths
- thumbnails for image review assets where relevant
- preferred playback paths for audio
- stable metadata needed for runtime loading

Minimum fields expected by the game importer:
- `id`
- `category`
- `type`
- `status`
- `approved_version`
- `current_display_version`
- approved file path or active asset path
- mime type when useful
- timestamps for diagnostics only

Runtime rules:
- the Part 1 consumer is a browser web runtime
- do not depend on React Native / Expo APIs
- do not consume transient Workshop preview state
- fail clearly if approved paths are missing

If the export lacks a stable approved path per asset, stop and escalate back to the Workshop Backend agent.
