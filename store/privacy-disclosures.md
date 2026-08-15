# Store privacy and data-safety worksheet

Validate these answers against the production deployment before submission.

## Data collected

| Data | Required | Purpose | Linked to account | User deletion |
| --- | --- | --- | --- | --- |
| Email address and account identifier | Yes | Authentication and account management | Yes | Delete account |
| Name, age, country, playing level, dominant side, and coaching goals | Yes/partly optional | Personalization and age-appropriate coaching | Yes | Reset profile or delete account |
| Uploaded tennis videos | Yes for analysis | Video analysis, playback, and user-requested reports | Yes | Delete individual video or account |
| Derived pose, movement, and report data | Yes for analysis | Coaching, progress, reliability, and reassessment | Yes | Delete account |
| Height, weight, mobility considerations, and training context | Optional | Body-relative presentation and practice context | Yes | Reset profile or delete account |
| Product feedback and support messages | Optional | Support and product improvement | Yes | Delete account / support request |
| Diagnostic app and browser context | Support flow only | Troubleshooting | Yes | Delete account / support request |

## Data use declarations

- App functionality: Yes
- Product personalization: Yes
- Developer analytics: Only if production telemetry is enabled and disclosed
- Advertising: No
- Third-party advertising: No
- Cross-app tracking: No
- Sale of personal data: No
- Optional model improvement: Only after the separate opt-in shown in Account

## Security and user controls

- Data is encrypted in transit over HTTPS.
- Supabase Row Level Security and ownership checks restrict account data.
- Media playback and downloads use time-limited signed URLs.
- Users can delete individual videos in My Videos.
- Users can permanently delete their account and associated data from Account.
- Raw uploaded media is not used for model improvement without explicit opt-in.
- The initial store release is intended for players aged 13 and older.

## Reviewer notes

- Camera permission is used only when the player chooses Record video.
- Microphone permission accompanies video capture; audio is not used for technique scoring.
- Photo-library access is used only when the player chooses a video.
- Athlentra is educational sports coaching, not medical diagnosis or treatment.
