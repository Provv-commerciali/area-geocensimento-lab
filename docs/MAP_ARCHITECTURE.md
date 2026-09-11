# Map architecture — future boundary

OpenLayers is the intended future map engine, subject to the next milestone review. WMS/WFS, provider APIs and cadastral geometry will be isolated behind server-side adapters. Paid provider calls must be explicit user actions with caching/audit controls, never automatic pan/zoom effects. No map dependency or geometry table is present now.
