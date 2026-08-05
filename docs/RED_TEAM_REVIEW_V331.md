# Internal Red-Team Review — AceCoach AI v3.3.1

This is an internal engineering and UX review, not an independent penetration test or biomechanics validation.

## Failure mode addressed

### Running the wrong project root

**Risk:** Extracting the ZIP inside the existing `web` folder creates `C:\workspace\web\web`, while `npm run dev` continues to run the older outer project.

**Mitigation:** The package includes explicit path instructions, `/version`, `public/version.json`, and `VERIFY_INSTALL_V331.ps1`.

### Three-panel layout not appearing on normal desktops

**Risk:** The previous `2xl:grid-cols-3` breakpoint required a viewport of approximately 1536px, so common laptop/desktop screens displayed vertically stacked panels.

**Mitigation:** The comparison now uses `xl:grid-cols-3`, activating at common desktop widths.

### Reference studio buried in a long report

**Risk:** Even when present, the visual comparison could be overlooked below movement maps and filmstrips.

**Mitigation:** The studio now appears immediately after movement and reliability confirmation, with a visible release banner and highlighted navigation button.

### External reference video unavailable

**Risk:** YouTube or governing-body embeds can be blocked or removed.

**Mitigation:** Source links and explicit unavailable states remain visible; the product never substitutes a wrong movement reference.

### Misleading peer or elite claims

**Risk:** Category and elite videos could be interpreted as validated percentiles or exact normative biomechanics.

**Mitigation:** The UI states that the category layer is criterion-based and the elite layer is a visual exemplar, not a percentile or compulsory template.
