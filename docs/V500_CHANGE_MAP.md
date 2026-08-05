# AceCoach AI v5 change map

| Review-led problem | Platform area | v5 action | User-visible evidence | Status |
|---|---|---|---|---|
| Original video may feel trapped inside analysis | Media ownership | Signed original download, explicit delete, preservation label | Download action in Upload History and Video Library | Implemented |
| Refresh/network interruption causes uncertainty | Upload | Persist safe pending-upload metadata, retry transient upload calls, checksum duplicate protection | Interrupted-upload recovery banner and retry explanation | Implemented foundation |
| Wrong AI destroys trust | Analysis | Keep movement confirmation and score withholding; formalize ReliabilityGate contract | Movement check and Trust Summary | Implemented |
| Too many metrics overwhelm players | Report | Four numbered sections; advanced detail collapsed | Coach Summary, Watch and Compare, Supporting Improvements, Practice and Reassessment | Implemented |
| Primary correction repeats across report | Report view model | Exclude main priority from supporting improvement cards | Main correction appears once | Implemented |
| Player video is cluttered | Comparison | Raw video is clean by default; one optional guide | “Compare one difference” toggle | Implemented |
| Bone-like references are hard to read | Motion twin | Replace constant-width lines with filled tapered limbs and curved torso/pelvis | v5 reference silhouettes and `/version` preview | Implemented |
| Generic body choice is unclear | Profile/report | Player-proportioned selector plus neutral/female/male override; no gender inference | Reference-body selector | Implemented, appearance reconstruction deferred |
| Videos become buried in chat | Library/coach flow | Preserve structured session and dedicated library | `/library`, session-linked practice and sharing | Implemented |
| Practice is disconnected from findings | Practice | First-class Practice destination retaining session link, cue, completion, reassessment | `/practice` | Implemented |
| AI measurements look more certain than they are | Methodology | Validated/Beta/Proxy/Unavailable labels and scientific boundaries | `/methodology` | Implemented |
| Support lacks diagnostic context | Support | Safe server-side request with app/browser/session/job/stage references | `/support` | Implemented after migration 021 |
| Pricing limits can be surprising | Billing | Centralized entitlement matrix and historical-access language | `/pricing` | Implemented as preview; payment disabled |
| Feedback can poison live behavior | Feedback governance | Events and release-decision tables; service-role-only mutation | Migration 021 and traceability docs | Implemented foundation |
| Architecture is route-centric | Architecture | Domain contracts for media, jobs, analysis, practice, billing, observability | `src/platform/*` and `src/features/*` public APIs | Implemented foundation |
| Trained recognition/object tracking requested | Analysis engine | Define adapters and quality gates; do not fabricate capability | Risk register and implementation backlog | Deferred—requires models and validation |
| Player-textured digital twin requested | Motion rendering | Preserve interface and honest fallback; no fake identity reconstruction | Player-proportioned silhouette disclaimer | Deferred—requires segmentation/inpainting/retargeting service |
| Coach annotations and voice-over requested | Coach review | Existing secure share retained; data model and route redesign planned | Risk register | Deferred |
| Live repetition counting requested | Guided practice | Existing check-in workflow retained; real-time CV counting planned | Practice page | Deferred |
