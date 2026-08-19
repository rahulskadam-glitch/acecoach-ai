# AceCoach AI - Video Recording Master Guide & Quality Standards

**Author**: Senior Biomechanics Specialist & Tennis Computer Vision Architecture  
**Target Audience**: Athletes, Coaches, and Video Analysts  

---

## 1. Executive Summary

To achieve **99%+ AI tracking accuracy** for joint angles, kinetic chain timing ($\Delta t$), segment Joules ($E = \frac{1}{2} I \omega^2$), and Rotator Cuff deceleration torque ($T = I \cdot \alpha$), the quality of the video recording is paramount. 

Our computer vision engine extracts 33 full-body anatomical landmarks, triangulates 3D joint centers against court geometry, and computes high-order derivatives ($\text{deg/s}^2$). Clean video input directly dictates the precision of the resulting analysis.

---

## 2. The 6 Golden DO's for Video Recording

### 1. Solo Athlete in Frame
- **Rule**: Exactly **ONE** player must be visible in the hitting area.
- **Why**: Multiple people walking across the background or coaches standing in the hitting corridor create overlapping bounding boxes that degrade landmark confidence.

### 2. Full Body Visibility (Head-to-Toe)
- **Rule**: Keep the athlete's entire body visible from the initial unit turn to the follow-through and recovery.
- **Why**: Cropping the feet prevents base-width normalization and knee flexion calculation; cropping the top prevents racket-drop tracking and serve trophy-pose calculation.

### 3. Court Lines Visible for 3D Scale
- **Rule**: Frame the player with baseline or singles/doubles alley lines visible.
- **Why**: Court geometry serves as a known metric reference (78 ft court length / 27 ft singles width), allowing the vision engine to calibrate real-world distances, strike corridors, and ball trajectories.

### 4. Optimal Distance & Camera Height
- **Distance**: 15–20 feet (4.5–6 meters) away from the athlete.
- **Height**: Chest/waist height (3–4 feet / 1.0–1.2 meters), mounted on a steady tripod or court fence mount.
- **Why**: Extreme low angles (phone on the ground) or extreme high angles introduce perspective distortion in joint angle measurements.

### 5. High Frame Rate (60 FPS or 120 FPS)
- **Rule**: Set your smartphone camera to **1080p at 60 FPS** (or 120 FPS slow-motion).
- **Why**: A tennis racket travels at 60–100+ mph during forward swing. 30 FPS only captures ~1 frame during the critical 30ms contact window, causing motion blur. 60–120 FPS provides crystal-clear frames for velocity derivatives.

### 6. Clean 1–3 Repetitions (5–15 Seconds)
- **Rule**: Trim clips to 5–15 seconds containing 1 to 3 clean repetitions of the stroke.
- **Why**: Eliminates dead time, ball retrieval, and background noise, accelerating cloud processing and delivering focused insights.

---

## 3. The 5 DON'TS to Avoid

| Mistake | Impact on AI Engine |
| :--- | :--- |
| **1. Multiple People in Background** | Pose tracker switches between targets, causing jitter in speed curves. |
| **2. Cropped Limbs / Racket** | Fails closed on torso coil or knee load metrics due to missing keypoints. |
| **3. Steep Upward/Downward Angles** | Distorts 2D-to-3D inverse kinematics and spinal flexion calculations. |
| **4. Direct Backlighting / Sun Glare** | Silhouettes the player, blinding limb contrast and occluding wrists/elbows. |
| **5. 5–10 Minute Uncut Videos** | Large upload times and unsegmented clips that dilute stroke focus. |

---

## 4. Video File Sizing & Technical Specifications

### Is 50 MB Sufficient?
**Yes, 50 MB is more than sufficient for 95%+ of video uploads.**

- A standard 10-second clip recorded at **1080p 60 FPS** (H.264/H.265 at ~20 Mbps bitrate) produces a file size of **~25 MB**.
- Even a 15-second clip at 1080p 60 FPS is **~38 MB**, well within the 50 MB threshold.

### Supporting 4K & High-Speed Slow-Motion:
For athletes using flagship smartphones (iPhone 14/15/16 Pro, Samsung S23/S24) recording in **4K 60 FPS** or **1080p 120 FPS**, file sizes for 15–20 seconds can reach **80 MB – 180 MB**. 

Our cloud upload architecture and Next.js server actions are engineered to support file sizes up to **500 MB** (`MAX_VIDEO_BYTES = 500 * 1024 * 1024`), ensuring ultra-high-definition capture without downscaling.

---

## 5. Technical Specification Matrix

| Parameter | Recommended (Optimal) | Minimum Required | System Limit |
| :--- | :--- | :--- | :--- |
| **Duration** | 5 – 15 seconds (1–3 strokes) | 1.0 second | 30.25 seconds |
| **Resolution** | 1080p Full HD (1920×1080) | 720p HD (1280×720) | 4K UHD (3840×2160) |
| **Frame Rate** | 60 FPS or 120 FPS | 24 FPS (30 FPS standard) | 240 FPS |
| **File Size** | 15 MB – 45 MB | ~2 MB | 500 MB |
| **Codecs** | H.264, H.265 (HEVC), ProRes | Standard web video | MP4, MOV, WebM, M4V |
