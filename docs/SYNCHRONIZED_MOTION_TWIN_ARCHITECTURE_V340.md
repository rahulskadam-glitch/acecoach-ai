# Synchronized Motion Twin Architecture v3.4

## Data flow

```text
uploaded athlete video
        ↓
frame metrics + phase timeline + repetitions
        ↓
primary repetition selector
        ↓
normalized movement progress (0–100%)
        ├── measured athlete video and pose overlay
        ├── category silhouette interpolation
        └── best-in-class silhouette interpolation
        ↓
phase-specific coaching area
        ↓
directional vector + reference path + cue
```

## Why simulations instead of raw reference synchronization

Raw reference videos differ in:

- frame rate,
- edit points,
- camera angle,
- movement duration,
- athlete handedness,
- tactical intent,
- incoming ball conditions.

Synchronizing by timestamp would be misleading. The motion twins synchronize by normalized movement phase, which is the more defensible comparison for a visual coaching aid.

## Template model

Each supported movement family has four keyframes:

- preparation,
- loading,
- contact,
- recovery.

Pose points are interpolated deterministically between adjacent keyframes. Category and elite templates share the same movement principle but differ conservatively in movement range.

## Marker model

The measured athlete pose can receive directional coaching vectors based on the active phase and the first relevant coaching area. These vectors are qualitative cues and are never presented as precise biomechanical deltas.
