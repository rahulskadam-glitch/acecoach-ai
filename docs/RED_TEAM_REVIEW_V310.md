# Internal Red-Team Review — AceCoach AI v3.1.0

This is an internal adversarial product, engineering, privacy, and scientific-integrity review. It is not an independent penetration test, legal opinion, child-safety certification, or motion-capture validation.

## Risks reviewed and mitigations

### 1. Misleading “best in category” claims

**Risk:** A professional demonstration could be presented as an exact peer or statistical age-group standard.

**Mitigation:** The UI uses “best-practice reference” and “category-matched development lens.” It explicitly states that the comparison is not a percentile, exact body-angle template, or requirement to copy one athlete.

### 2. Copyright and source integrity

**Risk:** Hosting or copying proprietary training footage without permission.

**Mitigation:** The package embeds public governing-body YouTube content using privacy-enhanced embeds and links to official libraries. No third-party video is copied into the package. Future production reference datasets must be licensed.

### 3. Reference mismatch

**Risk:** A forehand reference could be shown for a backhand or unsupported sport.

**Mitigation:** Reference selection is deterministic by sport and confirmed analysis movement. Unsupported movements display an explicit unavailable state rather than a wrong reference.

### 4. Youth access

**Risk:** Removing the product block could be confused with complete legal compliance.

**Mitigation:** Required service-processing consent remains mandatory. A youth-account notice tells operators that public launch still requires guardian and local-market compliance. Raw-media training remains optional and off unless selected.

### 5. Visual overload

**Risk:** More visuals could make the report longer and harder to use.

**Mitigation:** The order is: coach verdict → swing map → key frames → reference studio → annotated playback → practice. Technical and scientific sections are collapsed by default.

### 6. Filmstrip generation failure

**Risk:** Browser CORS or decoding limitations could prevent thumbnail generation.

**Mitigation:** Filmstrip cards fall back to timestamp cards and still jump to the annotated playback. Report generation does not depend on thumbnail success.

### 7. YouTube tracking and availability

**Risk:** Third-party embeds can be blocked, removed, or introduce privacy considerations.

**Mitigation:** Uses `youtube-nocookie.com`; every reference includes a direct official-source link and a graceful non-embed fallback.

### 8. Self-improvement feedback abuse

**Risk:** Unreviewed user feedback could automatically alter coaching logic and degrade safety.

**Mitigation:** Feedback is collected into a service-role-only learning view. It does not automatically retrain, change thresholds, or modify reports. Human governance and versioned evaluation remain required.

### 9. Determinism

**Risk:** Visual changes or feedback could alter biomechanical outputs.

**Mitigation:** Measurement and score computation remain independent of the visual layer. The new engine/report version creates a new context-specific analysis record while the same input and complete runtime manifest remain deterministic.

## Remaining high-priority gaps

- Trained RGB-plus-pose movement classification.
- Racket and ball detection with validated contact timing.
- Licensed age/level reference datasets.
- Phase-synchronized reference playback.
- Marker-based 3D validation.
- Independent coach and biomechanist agreement studies.
- Formal market-specific youth consent and guardian-account design.
- Mobile capture assistant with live framing feedback.
