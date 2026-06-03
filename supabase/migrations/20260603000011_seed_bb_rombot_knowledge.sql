-- PR #6 RAG ingest: 10 muscle docs + 3 program docs into rombot_knowledge (bodybuilding)
DELETE FROM public.rombot_knowledge WHERE sport = 'bodybuilding';

INSERT INTO public.rombot_knowledge (sport, topic, chunk, source_citation, tags) VALUES
('bodybuilding', 'ROMRxBB - Quads Exercise Library: Overview', '# ROMRxBB - Quads Exercise Library
### Stretch-Mediated Hypertrophy Edition | Rectus Femoris, Vastus Lateralis, Vastus Medialis, Vastus Intermedius

> **Science Basis:** This library applies long-muscle-length (LML) hypertrophy principles per Milo Wolf, Mike Israetel (RP Strength), and Jeff Nippard. The quadriceps contain two functionally distinct muscles: the **vasti** (VL, VM, VI - single-joint, cross only the knee) and the **rectus femoris** (bi-articular - crosses both hip and knee). This distinction is critical for programming: squats and leg presses stimulate the vasti effectively, but **rectus femoris growth requires dedicated single-joint knee extension with the hip in a more extended position**. 2024 research confirms a reclined (40deg hip flexion) leg extension position produces ~15.8% rectus femoris hypertrophy vs. ~10.9% upright - directly via the lengthened muscle principle. SFR ratings calibrated per Israetel''s framework and Nippard''s 2024 quad tier list. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3][^4][^5][^6][^7]

***', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: ROM Hierarchy for Quads - Top 5 Limiters', 'Ranked by how severely the limitation restricts **hypertrophic stimulus** (not just injury risk):[^8][^9][^10]

| Rank | ROM Limiter | Joint / Movement | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------------|------------------------|
| **1** | **Knee Flexion (Depth)** | Tibiofemoral joint | **Critical** - quadriceps reach their fully lengthened position only at deep knee flexion (~130-145deg+); every degree of restricted knee flexion directly shortens the quad''s loaded stretch range and reduces hypertrophic stimulus[^11][^8][^10] | All Squats, Hack Squat, Leg Press, Sissy Squat, Bulgarian Split Squat |
| **2** | **Ankle Dorsiflexion** | Talocrural joint | **High** - restricted dorsiflexion limits forward tibial travel and prevents the knee from tracking over the toe at depth; directly truncates achievable knee flexion, forcing the lifter to reduce squat depth or adopt excessive forward trunk lean[^12][^9][^13][^14] | Back Squat, Front Squat, Hack Squat, Goblet Squat, Leg Press |
| **3** | **Hip Flexion** | Coxofemoral joint | **High** - affects rectus femoris length specifically (bi-articular); the rectus femoris is lengthened when the hip is *extended*; a limited hip flexion ROM forces an upright torso squat pattern that biases the vasti but shortens the rectus femoris[^1][^2][^4] | Leg Extension (hip angle), Bulgarian Split Squat, Reverse Nordic, Sissy Squat |
| **4** | **Thoracic Extension / Hip Hinge** | T-spine + hip | **Medium** - limits upright torso maintenance in front squats and goblet squats; kyphotic posture at depth causes early squat termination and reduces total knee flexion achieved[^8][^9] | Front Squat, Goblet Squat, Hack Squat, Zercher Squat |
| **5** | **Hip Adductor / Groin Flexibility** | Hip joint | **Low-Medium** - limits squat stance width; forces a narrower stance that can restrict depth or shift load from quads to hip extensors; affects sumo-style leg press and wide-stance squat variations[^8][^15] | Wide Stance Squat, Sumo Leg Press, Bulgarian Split Squat |

***', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: Exercise Library', '### Barbell Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **High Bar Back Squat** | Barbell | Vastus Lateralis, Vastus Medialis, Vastus Intermedius | Glutes, Adductors, Rectus Femoris (minor) | High | Ankle dorsiflexion + knee flexion depth; hip flexion for torso position[^8][^10] | Hips below parallel (~120-140deg knee flexion); thighs past parallel to floor | Standing, knees at full extension, hips locked out | **High (A-Tier)** | ① Heels elevated 1-2 cm (plates or heel raised shoes) if ankle mobility limits depth; ② Knees track over toes - push them forward; ③ Descend until hips pass parallel[^8][^10] | ⚠️ Butt wink / depth cutoff: stopping at parallel removes the deepest 20-30deg of knee flexion - the most lengthened quad position; vasti growth severely limited[^8][^10] |
| **Low Bar Back Squat** | Barbell | Glutes, Vasti (less quad-dominant) | Hamstrings, Adductors, Rectus Femoris | High | Ankle dorsiflexion + forward lean from low bar position limits quad recruitment[^8][^10] | Hip crease at or below parallel | Standing lockout | **Medium (B-Tier for Quads)** | ① Low bar = more hip-dominant; ② Intentionally less quad-focused than high bar; ③ Use when quad volume is coming from isolation exercises[^8][^5] | ⚠️ Excessive forward lean (inherent to low bar) further reduces quad-to-glute stimulus ratio; not ideal as primary quad builder[^5][^7] |
| **Front Squat** | Barbell | Vastus Lateralis, Vastus Medialis, Vastus Intermedius, Rectus Femoris | Upper Back, Core | High | Ankle dorsiflexion + thoracic extension (upright torso required)[^8][^9] | Hips below parallel (~130deg+ knee flexion) with upright torso | Full standing lockout, bar in rack position | **High (A-Tier)** | ① Elbows high throughout; ② Heel elevation fixes almost all depth issues; ③ Upright torso - brace before descending[^8][^10] | Forward lean (thoracic or hip limitation) causes bar dump forward - immediately ends the set below full depth ⚠️[^8] |
| **Zercher Squat** | Barbell | Vasti, Rectus Femoris | Glutes, Biceps, Core | High | Ankle dorsiflexion + thoracic extension - similar demands to front squat[^8][^10] | Hip crease below parallel, elbows in elbow crease position | Full standing extension | **Medium-High** | ① Bar in elbow crease forces upright torso (front squat-like mechanics); ② Good ankle mobility needed for depth; ③ Slower learning curve than other variations[^8] | Torso caving forward due to elbow pain/discomfort at bar position - shortens depth prematurely ⚠️ |
| **Barbell Lunge (Walking / Stationary)** | Barbell | Vasti, Rectus Femoris | Glutes, Hamstrings | High | Hip flexion + knee flexion; stride length determines quad vs. glute bias[^16][^17] | Front knee at ~90deg, back knee near floor (~130deg front knee flexion) | Standing, full hip extension, front leg lockout | **Medium-High** | ① Keep front shin vertical - don''t let knee shoot past toe excessively; ② Upright torso biases quads; ③ Full descent - back knee near floor[^16][^17] | ⚠️ Stride too long removes forward knee travel - minimizes quad involvement and shifts to glute/hip extension dominant pattern[^16] |

***', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Goblet Squat** | Dumbbell | Vasti, Rectus Femoris | Glutes, Core, Adductors | High | Ankle dorsiflexion + knee flexion - DB counterbalance actually aids depth vs. barbell[^8][^10] | Hips below parallel, torso upright, DB held at chest | Standing, full extension, DB returns to chest | **High (A-Tier)** | ① DB counterweight allows deeper depth - use it; ② Elbows press inside knees at bottom to improve hip/ankle ROM; ③ Heels on small plates if ankle restricted[^8][^10] | Stopping at parallel rather than using DB counterbalance advantage to reach below-parallel depth ⚠️[^8] |
| **Dumbbell Bulgarian Split Squat (RFESS)** | Dumbbell | Vasti, Rectus Femoris | Glutes, Hip Flexors | High | Hip flexion + knee flexion; rear foot elevation increases rectus femoris stretch via hip extension of back leg[^18][^19][^17] | Front knee at ~100deg+, back hip approaching full extension (rectus femoris of rear leg lengthened at hip AND knee) | Standing, front leg fully extended, hips through | **High (S-Tier)** | ① Front foot placement: shin vertical or slightly forward at bottom; ② Rear foot on pad - not too high; ③ Torso slightly forward for quad emphasis, more upright for glute emphasis[^18][^17] | ⚠️ Rear foot too high - forces hip of trailing leg into excessive flexion, reducing rectus femoris stretch; stride too long shifts to hip-dominant pattern[^18][^19] |
| **Dumbbell Step-Up** | Dumbbell | Vasti, Glutes | Rectus Femoris, Hamstrings | Medium-High | Hip and knee flexion depth - box height determines ROM[^16] | Standing on ground, knee at ~90deg as stepping up | Top of box, full hip and knee extension | **Medium** | ① Box height = ~knee height; ② Drive through the heel of the working leg - not the toe push-off; ③ Full extension at top before stepping down[^16] | Pushing off with trailing toe - removes quad stimulus from working leg entirely ⚠️ |
| **Dumbbell Lunge (Stationary)** | Dumbbell | Vasti, Rectus Femoris | Glutes, Hamstrings | High | Knee flexion + hip flexion - same mechanics as barbell lunge with lower spinal load[^16] | Front knee ~90deg, back knee near floor | Standing, full hip and knee extension of front leg | **Medium-High** | ① Vertical front shin = quad emphasis; ② Full descent - back knee grazes floor; ③ Drive front heel to return to start[^16] | Partial descent (back knee doesn''t approach floor) - shortens quad ROM and reduces loaded stretch position ⚠️[^16] |
| **Dumbbell Sissy Squat (Assisted)** | Dumbbell | Rectus Femoris, Vastus Medialis | Rectus Femoris (large), Hip Flexors | High | Knee flexion + hip extension; balance limitation reduces load potential[^20][^21] | Full knee flexion (~140deg+), body leaning back, hips fully extended; rectus femoris fully lengthened at both joints | Upright kneeling-like position, knee fully extended | **High (A-Tier)** | ① Hold DB on chest to add load; ② Hips stay locked in extension throughout (no sitting back); ③ Control eccentric - deepest ROM possible[^20][^21] | ⚠️ Hips flexing backward as knee flexes - unloads rectus femoris and removes the unique dual-joint stretch that makes this exercise superior for RF hypertrophy[^20] |

***', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: Exercise Library - Cable Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Cable Squat (Low Cable, Belt or Handle)** | Cable | Vasti, Rectus Femoris | Glutes, Core | High | Ankle dorsiflexion + knee flexion; cable angle provides constant tension[^22][^10] | Hips below parallel, cable at hip/waist level, deep knee flexion | Standing, full extension, cable tension maintained | **Medium-High** | ① Cable attachment at low pulley to belt or handles held at chest; ② Full depth - same cues as goblet squat; ③ Lean slightly away from pulley for vertical shin[^10] | Partial depth negates the only advantage (constant tension) over barbell squat ⚠️[^10] |
| **Cable Leg Extension (Ankle Attachment)** | Cable | Rectus Femoris, Vasti | Hip Flexors (stabilizer) | High | Knee extension ROM + hip position; cable provides constant tension unlike dumbbell[^4][^10] | Knee fully flexed (~90deg+), hip in neutral or slightly extended | Knee fully extended, quad fully contracted | **High (A-Tier)** | ① Standing or seated (seated with hip extended = rectus femoris bias); ② Full knee flexion at start; ③ Slow eccentric back to full stretch position[^4][^10] | ⚠️ Cable at high tension only in shortened (extended knee) position if band-like resistance profile - ensure angle keeps tension in flexed knee position[^23] |
| **Cable Pull-Through (Squat Variation)** | Cable | Vasti, Glutes | Hamstrings, Core | High | Hip flexion + knee flexion; hip hinge variation with quad component[^15][^10] | Hip hinge, knees bent, cable at low pulley between legs | Full standing, hip and knee extension | **Medium** | ① Low pulley; ② Hip hinge back - not just knee bend; ③ Drive through heels, extend hips and knees simultaneously[^10] | Treating as a pure hip hinge with minimal knee bend - removes quad recruitment from the movement ⚠️ |
| **Single-Leg Cable Squat (Pistol-Assisted)** | Cable | Vasti, Rectus Femoris | Glutes, Core | High | Ankle dorsiflexion + single-leg balance; cable reduces balance demand[^10] | Single-leg deep knee flexion (hip below parallel) | Full single-leg extension | **High (A-Tier)** | ① Cable provides counterbalance - allows deeper depth; ② Free leg extended in front; ③ Drive heel down and forward to prevent ankle ROM limitation[^10] | ⚠️ Insufficient depth (parallel only) removes the lengthened quad position - defeats the purpose of the advanced unilateral movement[^10] |

***', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Hack Squat Machine** | Machine | Vasti, Rectus Femoris | Glutes, Adductors | High | Ankle dorsiflexion (heel plate elevation helps); machine tracks forward tibia naturally[^24][^25][^26] | Deep knee flexion (~130-145deg+), hips below knees at full depth; feet low on platform | Hips fully extended, knees near lock-out, back on pad | **High (S-Tier - Best Quad Exercise)** | ① Feet LOW on platform (increases knee flexion range); ② Heels elevated via plate/wedge if ankle mobility limited; ③ Descend until hamstrings contact calves[^5][^7][^25] | ⚠️ Stopping at 90deg knee flexion - removes 40-50deg of the most lengthened quad range; also: feet too high shifts emphasis to glutes and hamstrings[^24][^25] |
| **Leg Press (45deg Sled)** | Machine | Vasti (all), Rectus Femoris | Glutes, Adductors | High | Ankle dorsiflexion + knee flexion; platform angle limits full depth vs. hack squat[^15][^27] | Knees fully bent (~130deg+), sled at bottom, feet shoulder-width, feet LOW on platform | Full sled extension - stop 5deg short of knee lockout | **High (A-Tier)** | ① Feet low and shoulder-width; ② Full depth - knees to chest; ③ Tilt pad fully back (recline) for upright torso and deep knee flexion[^15][^27] | ⚠️ Partial ROM - stopping sled short of full knee flexion; also: feet too high shifts load from quad to glute; heels floating off platform[^15] |
| **Seated Leg Extension (Reclined)** | Machine | Rectus Femoris (primary bias), Vastus Lateralis, Vastus Medialis | None (isolated) | High | Knee flexion depth + **hip flexion angle** - the single most science-supported ROM variable for RF hypertrophy[^1][^2][^3][^23] | Knee fully flexed (start position at ~130deg+), back reclined to ~40deg hip flexion (not 90deg upright) | Knee at full extension - quad fully contracted; but do NOT lock out if targeting lengthened-position growth[^23] | **High (S-Tier)** | ① Recline backrest to ~40deg hip flexion (lean back) - 15.8% more RF growth vs. upright[^2]; ② Place foam pad behind shin pad to maximize start-position knee flexion; ③ Pad on lowest shin, slow eccentric to full knee flexion[^23] | ⚠️ Upright seated position (90deg hip flexion) shortens the rectus femoris at the hip - reduces RF hypertrophy by ~30% compared to reclined; also: machine limiting to only 90deg knee flexion halves the loaded stretch range[^1][^2][^23] |
| **Pendulum Squat** | Machine | Vasti, Rectus Femoris | Glutes, Adductors | High | Ankle dorsiflexion (less demanding than hack squat due to shoulder pad mechanics); knee flexion depth[^5][^7][^10] | Deep knee flexion in pendulum arc (~130-145deg), shoulder pads loaded, feet on plate | Full standing extension via pendulum arc | **High (S-Tier)** | ① Let the machine''s pendulum arc guide movement - don''t fight it; ② Feet low and forward; ③ Full depth - same protocol as hack squat[^5][^7] | Stopping short of full depth - same error as hack squat; unique to pendulum: fighting the arc path creates inefficient leverage ⚠️[^5] |
| **Belt Squat (Cable or Machine)** | Machine | Vasti, Rectus Femoris | Glutes, Core | High | Ankle dorsiflexion + knee flexion; belt minimizes spinal load - ideal for high frequency quad work[^5][^7][^10] | Hip below parallel, deep knee flexion (~130deg+), torso uprig...', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: Exercise Library - Bodyweight Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Bodyweight Squat (Full Depth)** | Bodyweight | Vasti, Rectus Femoris | Glutes, Adductors | High | Ankle dorsiflexion + knee flexion - same limitations as barbell, without load[^8][^10] | Hip below parallel, deep knee flexion (~130deg+) | Standing, full extension | **Low (C-Tier - no load)** | ① Full depth always; ② Heels stay down; ③ Use as warm-up or mobility drill - not primary hypertrophy tool[^8] | ⚠️ Not achieving full depth despite no external load - confirms ankle or hip flexion limitation that carries over to all loaded variations[^8] |
| **Reverse Nordic Curl** | Bodyweight | Rectus Femoris (primary) | Vastus Medialis (secondary) | High | Knee flexion depth + hip extension - hip must stay extended throughout (hips cannot flex backward)[^28][^29][^30] | Kneeling position, body leaning fully back, knee at maximum flexion (~130deg+), hip in full extension | Upright kneeling, knee fully extended - rectus femoris shortened at knee | **High (A-Tier)** | ① Hips locked forward throughout (no sitting back); ② Lean back as far as controllable; ③ Slow controlled eccentric - use band or bench as safety net for beginners[^28][^29][^30] | ⚠️ Hips dropping back as body descends - immediately shortens rectus femoris at the hip, removing the bi-articular stretch that is the entire hypertrophy purpose of this exercise[^28][^30] |
| **Sissy Squat (Bodyweight)** | Bodyweight | Rectus Femoris, Vastus Medialis | Hip Flexors | High | Knee flexion + hip extension maintained simultaneously; balance limits load progression[^20][^21] | Full knee flexion (~140deg+), body fully reclined, hips in full extension | Upright position, knees extended, hips through | **High (A-Tier)** | ① Hold a support (rack) initially; ② Hips must NOT flex backward - maintain full hip extension; ③ Deepest ROM possible with control[^20][^21] | Same as dumbbell sissy squat: hips flexing back removes the bi-articular stretch on rectus femoris - converts to a partial squat rather than a true quad isolation ⚠️[^20] |
| **Wall Sit (Isometric)** | Bodyweight | Vasti (isometric) | Glutes | Low-Medium | Knee flexion angle - 90deg isometric is mid-range training; deeper angles increase quad demand[^10] | Held at ~90deg knee flexion (or deeper for more quad demand) | Static hold at chosen angle | **Low (C-Tier)** | ① For lengthened-position benefit: hold at 100-120deg knee flexion, not 90deg; ② Timer-based progression; ③ Best used for metabolite-driven fatigue sets[^10] | Holding at 90deg instead of deeper angles - keeps quad in mid-range; no loaded stretch benefit for hypertrophy ⚠️ |
| **Jump Squat** | Bodyweight | Vasti, Rectus Femoris | Glutes, Calves | Medium-High | Knee flexion + explosive concentric; power-focused, not hypertrophy-optimal[^10] | Quarter-to-half squat at takeoff | Full extension at takeoff / peak jump height | **Low (D-Tier for Hypertrophy)** | ① Drop to quarter-squat and explode; ② Land softly with knee tracking over toe; ③ Better used for power/athletic performance, not hypertrophy[^10] | ⚠️ Full-depth jump squat is joint-stressful with minimal hypertrophy advantage; better replaced by weighted quad-focused variations[^10] |

***', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: SFR Quick Reference - Quads Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best Quad Exercise** | Hack Squat Machine | High | Deep knee flexion, forward tibia, easy overload, spine-free[^5][^7][^24] |
| **S** | Pendulum Squat | High | Superior arc mechanics, deep knee flexion, constant tension[^5][^7] |
| **S** | Seated Leg Extension (Reclined, 40deg Hip) | High | Only exercise targeting rectus femoris at full bi-articular length[^1][^2][^23] |
| **A - Excellent** | Dumbbell Bulgarian Split Squat | High | Unilateral deep knee flexion + rear-leg RF stretch[^18][^19][^17] |
| **A** | Belt Squat | High | Full quad ROM with zero spinal load[^5][^7] |
| **A** | Goblet Squat | High | DB counterbalance enables deeper squat for many lifters[^8][^10] |
| **A** | Front Squat | High | Most upright squat = max quad recruitment with depth[^8][^10] |
| **A** | Leg Press (Low Foot, Full Depth) | High | Heavy overload + deep knee flexion[^15][^27] |
| **A** | Smith Machine Squat (Foot Forward) | High | Foot forward = unique knee-over-toe ROM advantage[^8][^10] |
| **A** | Reverse Nordic Curl | High | Best bodyweight rectus femoris + bi-articular stretch[^28][^29][^30] |
| **A** | Sissy Squat (Loaded) | High | Maximum rectus femoris bi-articular stretch[^20][^21] |
| **A** | Single-Leg Cable Squat | High | Unilateral quad depth with balance assist[^10] |
| **A** | Single-Leg Leg Press | High | Unilateral quad tracking and depth[^15][^10] |
| **B - Good** | High Bar Back Squat | High | Foundational compound; ankle ROM often limits depth[^8][^10] |
| **B** | Cable Leg Extension | High | Constant tension upgrade vs. machine[^4][^10] |
| **B** | Zercher Squat | Medium-High | Upright torso forces quad ROM[^8] |
| **B** | Dumbbell Sissy Squat | High | Loaded RF stretch - technique demanding[^20][^21] |
| **C - Moderate** | Low Bar Back Squat | Medium | Hip-dominant; poor standalone quad builder[^5][^7] |
| **C** | Dumbbell Lunge | Medium-High | Good quad ROM if executed correctly[^16] |
| **C** | Barbell Lunge | Medium-High | Same; higher spinal load than dumbbell[^16][^17] |
| **C** | Dumbbell Step-Up | Medium | Box height dependent; moderate quad ROM[^16] |
| **D - Limited** | Jump Squat | Low | Power tool, not hypertrophy tool[^10] |
| **D** | Wall Sit | Low | Mid-range isometric only; no loaded stretch benefit[^10] |

***', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: Key Science Notes', '**Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus (not just injury risk):**[^31][^2][^11]

- ⚠️ **Leg Extension (Upright / 90deg Hip Position):** The rectus femoris is bi-articular; with hips at 90deg flexion, the RF is already shortened at the hip, meaning the lengthened knee position provides far less total muscle stretch. 2024 research shows a 40deg hip flexion position produces up to **15.8% RF hypertrophy vs. 10.9%** for upright - purely from the added hip extension component lengthening the RF further[^2][^3][^1]
- ⚠️ **Any Squat Stopping at Parallel:** The vasti''s most lengthened position is at >90deg knee flexion; stopping at 90deg removes the entire bottom ROM where mechanical tension is highest and mTOR signaling is strongest; going from parallel to ass-to-grass dramatically increases quad hypertrophy stimulus[^11][^10][^8]
- ⚠️ **Hack Squat / Leg Press with Feet Too High:** Every centimeter of foot elevation on the platform reduces the achievable knee flexion angle and shifts load from quads to glutes/hamstrings - directly reducing quad-specific lengthened stimulus[^25][^15]
- ⚠️ **Reverse Nordic Curl with Hip Flexion:** The moment the hips flex backward during the lean, the rectus femoris is shortened at the hip - removing the bi-articular stretch that provides the unique RF hypertrophy stimulus; the hips must stay locked forward throughout[^28][^30]
- ⚠️ **Rectus Femoris Gap in Squat/Leg Press Programs:** Research confirms squats and leg presses produce **+1.1% rectus femoris volume vs. +13.2% from leg extensions** (a 12x difference); any quad program without dedicated single-joint knee extension work is systematically undertraining the RF - a direct ROM-based hypertrophy gap[^4][^6]

**The Central Insight for Quad LML Training:** The two functional classes of quad muscles require completely different exercises. The vasti need *deep knee flexion under load* (hack squats, pendulum squats, leg press). The rectus femoris needs *simultaneous knee flexion AND hip extension* - isolated by leg extensions, reverse Nordics, and sissy squats. Programs addressing both classes produce superior quad development.[^6][^10][^4]

---', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Quads Exercise Library: References', '1. [The effects of hip flexion angle on quadriceps femoris ...](https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2444713) - This study compared the effects of 90deg versus 40deg hip flexion in the leg extension exercise on quadr...

2. [New Research Says This Leg Extension Hack Could Lead ...](https://www.menshealth.com/uk/building-muscle/train-smarter/a62003690/new-research-leg-extension-hack/) - More evidence proves that training muscles in the stretched position could lead to enhanced hypertro...

3. [Position 🅱️ led to greater rectus femoris hypertrophy ...](https://www.facebook.com/muscleandmotion/posts/-which-is-better-for-rectus-femoris-hypertrophy-%EF%B8%8F-or-%EF%B8%8Frecent-research-by-larsen-/1058564152301209/) - The researchers suggest that the greater muscle length achieved in the rectus femoris with a 40deg hip...

4. [Why leg extensions are a better quad exercise than squats](https://mennohenselmans.com/why-leg-extensions-are-a-better-quad-exercise-than-squats/) - Leg extensions are the more complete quad exercise compared to squats. See, the problem with squats ...

5. [Jeff Nippard Uses Science to Rank 20 of the Best & Worst ...](https://generationiron.com/jeff-nippard-quad-exercises/) - On July 2, 2024, Nippard released a YouTube video showcasing his top twenty quad exercises, categori...

6. [Hot off the Press 🔥 🦵 Single-joint knee extension (KE) and ...](https://www.facebook.com/physiomeetsscience/posts/hot-off-the-press-%F0%9D%97%9B%F0%9D%98%86%F0%9D%97%BD%F0%9D%97%B2%F0%9D%97%BF%F0%9D%98%81%F0%9D%97%BF%F0%9D%97%BC%F0%9D%97%BD%F0%9D%97%B5%F0%9D%97%B6%F0%9D%97%B0-%F0%9D%97%98%F0%9D%97%B3%F0%9D%97%B3%F0%9D%97%B2%F0%9D%97%B0%F0%9D%98%81%F0%9D%98%80-%F0%9D%97%BC%F0%9D%97%B3-%F0%9D%97%A6%F0%9D%97%B6%F0%9D%97%BB%F0%9D%97%B4%F0%9D%97%B9%F0%9D%97%B2-%F0%9D%98%83%F0%9D%97%B2%F0%9D%97%BF%F0%9D%98%80%F0%9D%98%82%F0%9D%98%80-%F0%9D%97%A0%F0%9D%98%82%F0%9D%97%B9%F0%9D%98%81%F0%9D%97%B6-%F0%9D%97%9D%F0%9D%97%BC%F0%9D%97%B6%F0%9D%97%BB%F0%9D%98%81-%F0%9D%97%98%F0%9D%98%85%F0%9D%97%B2%F0%9D%97%BF%F0%9D%97%B0%F0%9D%97%B6%F0%9D%98%80%F0%9D%97%B2-%F0%9D%97%94-%F0%9D%97%97/1710789730227474/) - ✓ Discussion The review confirms that quadriceps strengthening, as part of lower limb exercise progr...

7. [The 20 Best (and Worst) Quad Exercises, Ranked by ...](https://barbend.com/news/best-quad-exercises-ranking-best-to-worst-jeff-nippard/) - Jeff Nippard ranked 20 of the most common leg day variations using a color-coded tier spectrum from ...

8. [A Biomechanical Review of the Squat Exercise - PMC - NIH](https://pmc.ncbi.nlm.nih.gov/articles/PMC10987311/) - In general, elevating the heels during squatting facilitates a greater degree of forward tibia incli...

9. [Effect of Limited Ankle Dorsiflexion on Lower Limbs and ...](https://www.sciencedirect.com/science/article/abs/pii/S0161475425000843) - Our study demonstrated that limited ankle DF ROM is related to greater anterior pelvis tilt, hip and...

10. [How To Grow Your Quads](https://e3rehab.com/how-to-grow-your-quads/) - In this blog, I''m going to teach you everything you need to know about how to grow your quads! Looki...

11. [Lengthened Partials Explained](https://www.fitnesssimplified.org/training/lengthened-partials-a-new-muscle-growth-amp-mobility-hack) - A May 2021 study [5] tested leg extensions done with a full range of motion, final range of motion (...

12. [How To Improve Your Ankle Mobility With Targeted ...](https://www.gowod.app/blog/how-to-improve-ankle-mobili...', 'ROMRx Bodybuilding KB - Quads.md', ARRAY['bodybuilding','quads','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: Overview', '# ROMRxBB - Back Exercise Library
### Stretch-Mediated Hypertrophy Edition | Latissimus Dorsi, Mid Traps, Rhomboids, Spinal Erectors, Teres Major

> **Science Basis:** This library applies long-muscle-length (LML) hypertrophy principles per Milo Wolf, Mike Israetel (RP Strength), and Jeff Nippard. Training the back at lengthened positions (full scapular protraction + shoulder overhead or in extension) drives superior or equivalent hypertrophy vs. contraction-focused training. For back training, this means **allowing full scapular protraction and shoulder elevation at the stretch position of every row and pulldown** - not just moving the arm, but letting the thoracic spine round into the stretch. SFR ratings are calibrated per Israetel''s Stimulus-to-Fatigue framework. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3][^4][^5][^6]

***', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: ROM Hierarchy for Back - Top 5 Limiters', 'Ranked by how severely the limitation restricts **hypertrophic stimulus** (not just injury risk):[^7][^8][^9]

| Rank | ROM Limiter | Joint / Movement | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------------|------------------------|
| **1** | **Shoulder Flexion (Overhead)** | Glenohumeral joint | **Critical** - limits how far overhead the arm travels in the stretched position of pulldowns and pullovers; the lat cannot reach full length without ~150-180deg shoulder flexion[^7][^10][^11] | Lat Pulldown, Pull-Up, Pullover, Straight-Arm Pulldown |
| **2** | **Scapular Protraction** | Scapulothoracic joint | **High** - blocking protraction at the bottom of rows prevents the lat, rhomboid, and mid-trap from entering their full lengthened position; losing up to 30-40% of total ROM[^4][^5][^12] | All Row Variations, Chest-Supported Row, Cable Row |
| **3** | **Hip Flexion / Hip Hinge Mobility** | Hip joint + hamstrings | **High** - limits the torso angle on bent-over rows and RDL-pattern exercises; insufficient hip flexion forces lumbar rounding as a compensation, shifting load off back and to spinal erectors[^13][^14] | Barbell Row, Dumbbell Row, T-Bar Row, Good Mornings |
| **4** | **Thoracic Extension** | T-spine (T4-T10) | **Medium-High** - kyphotic thoracic spine prevents full scapular retraction at peak contraction and compresses the lat stretch position; directly limits mid-trap and rhomboid activation at end range[^15][^16] | All Row Variations, Barbell Row, Machine Row |
| **5** | **Elbow Flexion / Forearm Supination** | Elbow joint | **Low-Medium** - limited supination shortens the biceps contribution, forcing forearm into a mechanical disadvantage and reducing the ability to complete full elbow ROM; affects peak contraction on close-grip work[^17][^18] | Close-Grip Pulldown, Underhand Row, Chin-Up |

***', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: Exercise Library', '### Barbell Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Barbell Bent-Over Row (Overhand)** | Barbell | Lat, Mid Trap, Rhomboid | Biceps, Rear Delt, Erectors | Medium-High | Hip flexion (torso angle) + scapular protraction at stretch[^19][^14] | Arms fully extended, scapulae protracted, torso ~45deg; shoulder at ~90deg flexion/extension | Elbows pulled past torso, scapulae fully retracted | **High (A-Tier)** | ① Torso 45-70deg - not upright; ② Let scapulae protract fully at arm extension; ③ Elbows at 45deg for lat+trap blend[^20][^21] | ⚠️ Not allowing scapular protraction at bottom removes the loaded stretch - eliminates primary hypertrophy stimulus for lats and mid-traps[^4][^5] |
| **Barbell Bent-Over Row (Underhand / Supinated)** | Barbell | Lat (lower fibers), Biceps | Mid Trap, Rhomboid, Rear Delt | Medium-High | Hip flexion + limited forearm supination range[^17][^21] | Arms extended, supinated grip, scapulae protracted at torso ~45deg | Elbows pulled to hips, scapulae retracted | **High (A-Tier)** | ① Supinated grip drives elbows down and in - biases lower lat; ② Full scapular protraction at stretch; ③ Control eccentric to full arm extension[^21] | Grip rotates to neutral under load - loses the supination advantage and shifts to overhand mechanics ⚠️[^17] |
| **Pendlay Row** | Barbell | Lat, Mid Trap, Rhomboid, Erectors | Biceps, Rear Delt | Medium-High | Hip flexion (torso ~parallel to floor required) + scapular protraction[^14][^22] | Bar rests on floor with torso parallel; arms extended, full scapular protraction | Elbows pulled past torso at parallel - full scapular retraction | **Medium-High** | ① Torso parallel to floor each rep; ② Bar returns to floor with controlled eccentric; ③ Explosive concentric with intentional scap retraction at top[^14][^22] | Torso rising on each rep - gradually becomes an upright row, progressively reducing lat bias ⚠️[^19] |
| **T-Bar Row (Landmine)** | Barbell | Lat, Mid Trap, Rhomboid | Biceps, Rear Delt, Erectors | Medium-High | Hip flexion + scapular protraction; fixed angle limits eccentric depth[^20][^23] | Arms extended with chest near pad, scapulae protracted | Elbows behind torso at full retraction | **High (A-Tier)** | ① Use chest-supported variant if available for higher SFR; ② Allow full arm extension at bottom; ③ Dual grip positions - close for lat width, wider for mid-back thickness[^20][^24] | ⚠️ Half-rep rowing (elbows only pulled to torso level) removes peak contraction in rhomboids and mid-traps[^25] |
| **Rack Pull (Below Knee)** | Barbell | Spinal Erectors, Traps (Upper), Lats | Glutes, Hamstrings | Medium | Hip flexion + thoracic extension; partial ROM of deadlift[^14][^22] | Bar set 2-4" below kneecap; hip hinge, neutral spine | Standing lockout, full hip extension, scapulae depressed | **Medium** | ① Use as erector/trap overload tool; ② Full scapular depression at lockout - shrug up; ③ Brace before breaking bar off rack[^14][^22] | Lumbar rounding in starting position due to limited hip hinge - eliminates spinal erector pre-tension ⚠️[^13] |

***', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Single-Arm Dumbbell Row (Bench-Supported)** | Dumbbell | Lat, Mid Trap | Biceps, Rear Delt | High | Shoulder extension + scapular protraction; bench height limits how far arm can drop[^26][^27] | Arm fully extended toward floor, shoulder protracted forward and "dropped" into stretch | DB pulled to hip, elbow behind torso, scapulae retracted | **High (A-Tier)** | ① Allow shoulder to drop/protract fully at bottom; ② Pull elbow toward hip - not shoulder; ③ No torso rotation[^26][^27] | ⚠️ Shoulder NOT allowed to protract at stretch position - removes 30-40deg of lat ROM and eliminates the loaded stretch advantage[^26][^27] |
| **Dumbbell Chest-Supported Row** | Dumbbell | Mid Trap, Rhomboid, Lat | Rear Delt, Biceps | High | Scapular protraction + thoracic extension; bench angle limits stretch depth[^28][^29] | Arms hanging fully, shoulders protracted and elevated off bench | Elbows pulled past torso level, scapulae fully retracted | **High (S-Tier)** | ① Full arm hang at bottom - don''t grip the bench; ② Allow shoulder blades to spread apart (protract) fully; ③ Lead with elbows back and up[^20][^28][^29] | Not allowing full arm extension at bottom - shortens ROM by 30-40% and removes loaded mid-back stretch ⚠️[^4][^28] |
| **Incline Dumbbell Row (Prone)** | Dumbbell | Lat, Mid Trap | Rhomboid, Rear Delt, Biceps | High | Scapular protraction + glenohumeral extension at ~45deg bench[^29][^23] | Arms hanging toward floor, full scapular protraction with incline ~45deg | DB pulled to hips, elbows past torso, scapulae retracted | **High (A-Tier)** | ① Set bench to 30-45deg; ② Full arm hang with shoulder forward-drop at start; ③ Drive elbows toward hips, not shoulders[^29][^23] | Partial eccentric - not letting arms drop to full extension due to fatigue; eliminates lat stretch position ⚠️[^26] |
| **Dumbbell Pullover (Back-Focus)** | Dumbbell | Lat, Serratus, Long Head Triceps | Teres Major, Pec (costal) | High | Shoulder flexion overhead - primary ROM limiter for full lat stretch[^30][^10] | DB overhead at ~160-180deg shoulder flexion (arm behind head) | DB over chest, shoulder in ~90deg of extension | **Medium-High** | ① Straight arm (slight bend); ② Reach as far overhead as shoulder flexion allows; ③ Keep ribcage down - no lumbar hyperextension[^30][^10] | ⚠️ Limited overhead shoulder flexion prevents DB reaching behind head - removes 50%+ of lat stretch ROM; lumbar extension compensates, reducing lat load[^10] |
| **Dumbbell Shrug** | Dumbbell | Upper Trap | Levator Scapulae, Mid Trap | Low | Cervical/thoracic lateral flexion; neck position limits clean trap isolation[^31][^16] | Arms fully extended, scapulae depressed (trap fully stretched) | Scapulae fully elevated - full upward trap shrug | **Medium** | ① Full depression hold at bottom for max stretch; ② Straight vertical elevation - no elbow bend; ③ Pause 1-2 sec at top[^31][^16] | Partial shrug - elbows bent or torso heaving, removing load from trap and converting to an upright row ⚠️ |
| **Dumbbell Romanian Deadlift** | Dumbbell | Spinal Erectors, Hamstrings, Glutes | Lat (stabilizer), Mid Trap | High | Hamstring flexibility + hip hinge depth; limits how far hips can hinge without spinal rounding[^13][^14] | DBs at mid-shin level, hi...', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: Exercise Library - Cable Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Seated Cable Row (Close Grip / V-Bar)** | Cable | Lat (lower fibers), Mid Trap, Rhomboid | Biceps, Rear Delt | High | Scapular protraction + thoracic flexion - Dr. Mike Israetel cues: "round your FULL back at the bottom"[^5][^12] | Torso forward, full spinal flexion, scapulae fully protracted, arms extended | Elbows pulled past torso, scapulae fully retracted, upright torso | **High (A-Tier)** | ① Full spinal + scapular protraction at bottom; ② Pull elbows down and in toward hips (lat bias); ③ Don''t lean back - upright torso at peak[^5][^12] | ⚠️ Refusing to let back round at bottom and locking scapulae early removes the loaded stretch - the key hypertrophy stimulus; pure arm pull becomes dominant[^5][^12] |
| **Seated Cable Row (Wide Grip)** | Cable | Mid Trap, Rhomboid, Rear Delt | Lat, Biceps | High | Scapular protraction + shoulder horizontal abduction range[^21][^16] | Arms wide, scapulae protracted, cables at shoulder height | Elbows pulled wide and back, scapulae fully retracted | **High (A-Tier)** | ① Wide bar/rope attachment; ② Pull elbows out and back - not down; ③ Think "touching shoulder blades together" as cue[^21][^16] | Pulling with narrow-elbow path on a wide-grip setup - negates trap/rhomboid bias; switches to lat row mechanics ⚠️[^21] |
| **Standing Cable Row / Low Cable Row** | Cable | Lat, Mid Trap, Rhomboid | Biceps, Rear Delt, Core | High | Scapular protraction + shoulder extension; stance limits how far arm can extend[^32][^33] | Arms fully extended forward, shoulder protracted, slight hip hinge | Elbows pulled past torso, scapulae retracted, hips stable | **High (A-Tier)** | ① Single-arm or dual; ② Full arm extension and scapular protraction at start; ③ Pull elbow to hip, not to shoulder[^32][^33] | Short ROM - arm only travels from 90deg to contracted; loses loaded stretch at full arm extension ⚠️[^32] |
| **Lat Pulldown (Wide Overhand, to Chest)** | Cable | Lat (thoracic + iliac fibers) | Teres Major, Biceps, Mid Trap | High | Shoulder flexion overhead - limits how far arms can rise in stretched position[^7][^34][^9] | Arms fully extended overhead (shoulder at ~150deg flexion), scapulae elevated | Bar touches upper chest, elbows pointing down, scapulae depressed | **High (S-Tier)** | ① Allow arms to fully extend overhead and FEEL lat stretch; ② Pull to upper chest - not chin; ③ Lead with elbows down, chest up[^9][^18] | ⚠️ Limited shoulder flexion = arms cannot rise fully overhead; shrugging compensates; lat stretch is incomplete before rep begins - removes top-end ROM ⚠️[^7][^34] |
| **Lat Pulldown (Close Grip / Neutral)** | Cable | Lat (lower fibers), Teres Major | Biceps, Mid Trap | High | Shoulder flexion overhead + elbow flexion depth[^18][^35] | Arms fully extended overhead with neutral grip, scapulae elevated | Bar/handles pulled to upper chest, elbows tucked at sides | **High (A-Tier)** | ① Neutral V-bar or close grip; ② Pull bar to sternum - elbow tuck toward hips; ③ Full arm extension at top with scapular elevation[^18][^35] | Stopping arm extension early at top - only reaching 90deg instead of full overhead; cuts 30-40deg of lat stretch ⚠️[^36] |
| **Straight-Arm Cable Pulldown** | Cable | Lat (all fibers), Serratus, Teres Major | Triceps (long h...', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Machine Chest-Supported Row** | Machine | Mid Trap, Rhomboid, Lat | Rear Delt, Biceps | High | Scapular protraction - machine limits how far forward arms travel at stretch[^28][^25][^24] | Arms fully extended, chest against pad, scapulae fully protracted and "spread apart" | Elbows pulled past torso level, scapulae fully retracted and squeezed | **High (S-Tier)** | ① Full arm extension at stretch - don''t choke up on handles; ② Allow scapulae to fully spread/protract; ③ 3 grip positions - alternate for width vs. thickness bias[^20][^38][^24] | ⚠️ Locking scapulae in retraction throughout = eliminates the loaded stretch - the primary hypertrophy advantage of this exercise vs. barbell rows[^4][^25] |
| **Machine Lat Pulldown (Plate-Loaded or Selectorized)** | Machine | Lat, Teres Major | Biceps, Mid Trap, Rear Delt | High | Shoulder flexion overhead - same fundamental limitation as cable pulldown[^34][^9] | Arms overhead at full extension (150-180deg shoulder flexion), scapulae elevated | Handles pulled to upper chest, scapulae depressed and retracted | **High (S-Tier)** | ① Seat height: thighs secured, chest tall; ② Full arm extension overhead with lat stretch before each rep; ③ Pull to upper chest - lead with elbows[^20][^9] | ⚠️ Not completing the top-end stretch (limited shoulder flexion) removes the lengthened position entirely - only the contracted portion of the lat is trained[^7][^34] |
| **Machine Row (Hammer Strength / Plate-Loaded)** | Machine | Lat, Mid Trap, Rhomboid | Biceps, Rear Delt | High | Scapular protraction + shoulder extension; machine cam limits stretch depth[^20][^28] | Chest on pad, arms extended forward, scapulae protracted | Handles pulled to sides with elbows past torso, scapulae fully retracted | **High (A-Tier)** | ① Full arm extension with chest firm against pad; ② Unilateral mode: greater ROM per arm than bilateral; ③ Omni-grip approach - try different handle angles per set[^20][^38] | Partial range - arms pulled back only to 90deg elbow bend; misses 30-40deg of peak contraction ROM in rhomboids and mid-trap ⚠️[^20] |
| **Seated Row Machine (Cable or Cam)** | Machine | Mid Trap, Lat, Rhomboid | Biceps, Rear Delt | High | Scapular protraction; machine typically enforces upright torso, limiting forward lean[^17][^31] | Arms fully extended, scapulae protracted, upright torso | Elbows pulled past torso at scapular full retraction | **High (A-Tier)** | ① Don''t cheat with torso lean - machine seat should fix position; ② Full arm extension at stretch; ③ Close grip = lat emphasis; wide grip = mid-back emphasis[^17][^31][^21] | ⚠️ Torso rocking backward generates momentum - shortens effective ROM and shifts load off back onto erectors and hips[^32] |
| **Machine Shrug (Plate-Loaded or Smith)** | Machine | Upper Trap | Levator Scapulae, Mid Trap | Low | Cervical flexion limits how far shoulder can elevate before neck stress[^31][^16] | Arms fully extended, scapulae fully depressed (trap at full length) | Full upward scapular elevation - trap fully contracted | **Medium** | ① Full depression pause at bottom; ② Straight vertical path only; ③ 1-2 sec hold at top for peak trap contraction[^31][^16] | Not achieving full scapular depression at start - trap never reache...', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: SFR Quick Reference - Back Exercises Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best Bang for Buck** | Machine Chest-Supported Row | High | Full ROM mid-back, eliminates lower back fatigue, easy to overload[^20][^28] |
| **S** | Machine Lat Pulldown (Plate-Loaded) | High | Deep lat stretch + easy overload, tracks progress clearly[^20][^9] |
| **S** | Seated Cable Row (Close Grip) | High | Full-spine protraction stretch + constant tension throughout ROM[^5][^12] |
| **A - Excellent** | Dumbbell Chest-Supported Row | High | Maximum mid-back stretch + arm hang freedom[^20][^29] |
| **A** | Lat Pulldown (Wide/Medium, to Chest) | High | Best lat width exercise; full overhead stretch when mobility allows[^18][^9] |
| **A** | Barbell Bent-Over Row (Overhand) | High | Heavy load + full stretch; foundational compound[^20][^21] |
| **A** | Barbell Bent-Over Row (Underhand) | High | Lower lat bias + strong biceps integration[^17][^21] |
| **A** | Single-Arm DB Row | High | Full stretch with shoulder protraction, unilateral ROM freedom[^26][^27] |
| **A** | Straight-Arm Cable Pulldown | High | Isolates lat through full shoulder flexion arc[^7][^9] |
| **A** | Cable Pullover (Kneeling) | High | Constant tension lat stretch + no lower back demand[^38][^9] |
| **A** | Cable Single-Arm Row | High | Full ROM row without torso compensation[^32][^37] |
| **A** | Hammer Strength Row (Unilateral) | High | Machine stability + full arm extension ROM[^20][^38] |
| **A** | T-Bar Row (Chest-Supported) | High | Heavy load + controlled mid-back stretch[^20][^24] |
| **B - Good** | Seated Cable Row (Wide Grip) | High | Mid-trap and rhomboid thickness focus[^21][^16] |
| **B** | Face Pull (Rope Cable) | Medium-High | Rear delt + trap + external rotator blend[^15][^31] |
| **B** | Incline Dumbbell Row (Prone) | High | Chest-supported alternative with DB freedom[^29][^23] |
| **B** | Lat Pulldown (Close Grip / Neutral) | High | Lower lat emphasis + elbow tuck ROM[^18][^35] |
| **B** | Dumbbell Pullover | Medium-High | Overhead lat stretch, but pec co-activation reduces isolation[^30][^10] |
| **B** | Low Row Machine | High | Lower lat focus with stable platform[^8][^9] |
| **C - Moderate** | Pendlay Row | Medium-High | Full reset = full protraction stretch, but high erector demand[^14][^22] |
| **C** | Dumbbell RDL | Medium-High | Erector + posterior chain; not a pure back exercise[^13][^14] |
| **C** | Machine Shrug | Medium | Limited ROM; upper trap only[^31][^16] |
| **C** | Dumbbell Shrug | Medium | Moderate trap isolation; lower SFR than rows[^31][^16] |
| **D - Limited** | Rack Pull | Medium | Partial ROM; mostly erector/trap overload tool[^14][^22] |

***', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: Key Science Notes', '**Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus (not just injury risk):**[^2][^4][^1]

- ⚠️ **Lat Pulldown / Pull-Up (arms not reaching full overhead extension):** If shoulder flexion limits the arm from traveling past 120deg, the lat never reaches its fully lengthened position - the primary driver of LML hypertrophy for vertical pulls[^34][^7]
- ⚠️ **All Row Variations (scapulae locked in retraction):** Preventing full scapular protraction at the bottom of every row removes the loaded stretch from the mid-back musculature; Mike Israetel explicitly cues "round your full back" at the bottom of cable rows to ensure this stretch[^5][^12]
- ⚠️ **Straight-Arm Cable Pulldown (stops at 90deg shoulder flexion):** The critical loaded stretch occurs between 90-150deg of shoulder flexion; truncating to 90deg converts this into a partial movement with minimal hypertrophy advantage over a contracted-position exercise[^9][^7]
- ⚠️ **Chest-Supported Row (scapulae locked in retraction):** Research confirms that allowing scapular protraction in the stretched position enhances mechanical tension and hypertrophy potential - locking the scapula eliminates this[^4][^28]
- ⚠️ **Single-Arm DB Row (shoulder not protracted at bottom):** Failure to let the shoulder drop and protract at the bottom position eliminates the full lat length advantage that distinguishes this exercise from machine alternatives[^26][^27]

**Lengthened Partials Application:** For all High-SFR back exercises, after full-ROM failure, finish with **bottom-half partials in the stretched position** (arms extended, scapulae protracted) - consistent with evidence supporting superior hypertrophy from lengthened vs. shortened partial sets.[^1][^2]

---', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Back Exercise Library: References', '1. [Does longer-muscle length resistance training cause greater ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC12869050/) - Our results suggest that both muscle size and fascicle length increases may be greater following LML...

2. [Our systematic review on longer muscle length training ...](https://www.instagram.com/p/DG6AkhKIZcz/) - Training at longer muscle lengths tends to produce more muscle growth, particularly in the vastus la...

3. [Stimulus to Fatigue Ratio: Definition and Examples](https://hevycoach.com/glossary/stimulus-fatigue/) - It refers to a specific exercise''s stimulative effect to drive adaptations (eg, muscle growth) versu...

4. [Scapular protraction during chest-supported rows isn''t a flaw](https://www.instagram.com/reel/DL1vK-DILEW/) - This stretch-loaded position enhances mechanical tension and muscle hypertrophy potential. Locking t...

5. [CABLE ROW TIPS ⬇️ 1.) Round your upper, middle, and ...](https://www.tiktok.com/@drmikeisraetel/video/7433870820805545259) - CABLE ROW TIPS ⬇️ 1.) Round your upper, middle, and lower back fully at the bottom 2.) Let your shou...

6. [The Complete Hypertrophy Training Guide: Build Muscle Fast](https://rpstrength.com/blogs/articles/complete-hypertrophy-training-guide) - The SFR is a formal way of stating that the best growth comes from exercises that stimulate the most...

7. [The Ultimate Guide to Lat Pulldowns - Maximize Your Lat ...](https://www.conorharris.com/blog/the-ultimate-guide-to-lat-pulldowns-how-to-maximize-your-lat-training) - The problem is, most people, especially the average lifter, don''t have genuine shoulder flexion rang...

8. [Differential activation of parts of the latissimus dorsi with ...](https://pubmed.ncbi.nlm.nih.gov/24462394/) - Seventeen male subjects performed four isometric exercises: shoulder extension, adduction, internal ...

9. [The Biomechanics of the Lat Pulldown: Muscles Worked, ...](https://blog.nasm.org/biomechanics-of-the-lat-pulldown) - This blog provides relevant research discussing various grip positions, the muscles worked with the ...

10. [How to Improve Your Overhead Shoulder Mobility](https://www.youtube.com/watch?v=pqChOpLBR-U) - Lat Stretch: The kneeling position in this stretch places the hips in flexion, which helps limit ext...

11. [The Latissiums Dorsi restricts shoulder flexion ...](https://www.facebook.com/ofcourseonline/posts/the-latissiums-dorsi-restricts-shoulder-flexion-and-shoulder-flexion-is-required/828495509941139/) - The Latissiums Dorsi restricts shoulder flexion, and shoulder flexion is required for optimal Serrat...

12. [CABLE ROW TIPS ⬇️ 1.) Round your upper, middle, and ...](https://www.tiktok.com/@drmikeisraetel/video/7536595351210347789) - CABLE ROW TIPS ⬇️ 1.) Round your upper, middle, and lower back fully at the bottom. 2.) Let your sho...

13. [Hip Hinge Showdown/Analysis : r/naturalbodybuilding](https://www.reddit.com/r/naturalbodybuilding/comments/1mw9xwy/hip_hinge_showdownanalysis/) - I found that keeping these hinges 10 reps or less fatigues the erectors less and allows you to keep ...

14. [How to Master the Hip Hinge](https://www.ironmaster.com/blog/2026/02/26/how-to-master-the-hip-hinge/) - Most athletes blame their spinal erectors when their lower back tightens up during deadlifts or RDLs...

15. [How to Improve Your Shoulder Range of Motion](https://e3rehab.com/shoulder-range-of-motion/) - Do you want to improve your shoulder range of motion? Learn how to increase flexion, extension, exte...
...', 'ROMRx Bodybuilding KB - Back.md', ARRAY['bodybuilding','back','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: Overview', '# ROMRxBB - Biceps Exercise Library
### Stretch-Mediated Hypertrophy Edition | Biceps Brachii (Long Head / Short Head), Brachialis, Brachioradialis

> **Critical Science Context - The Biceps Controversy:** The biceps are one of the most debated muscles in LML (long-muscle-length) hypertrophy research. Unlike quads and hamstrings, the biceps may not respond to the same *titin-based passive tension* mechanism at long muscle lengths because their sarcomeres may not extend far onto the descending limb of the length-tension curve. **However**, 3 of 3 direct studies comparing shorter vs. longer muscle length training in the elbow flexors *all* showed favorable results for longer-length training. A 2025 RCT found the incline curl produced greater *proximal* (upper) biceps growth (11.2% vs. 8.3%) while the preacher curl produced greater *distal* (lower) growth (10.3% vs. 6.4%). Training the bottom 0-50deg of elbow flexion (lengthened) produces *triple* the distal growth vs. the top 80-130deg (shortened). **Practical conclusion:** Both the lengthened position (Bayesian cable curl, incline curl) and the mid-range contracted position (preacher curl, machine curl) are valuable - and they train different regions of the same muscle. Neither replaces the other. SFR ratings per Nippard''s 2024 biceps tier list and Henselmans'' framework. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3][^4][^5][^6][^7]

***', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: ROM Hierarchy for Biceps - Top 5 Limiters', 'Ranked by severity of impact on **hypertrophic stimulus**:

| Rank | ROM Limiter | Joint / Movement | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------------|------------------------|
| **1** | **Shoulder (Glenohumeral) Position - Extension vs. Flexion** | Glenohumeral joint | **Critical** - the biceps is bi-articular; shoulder extension (arm behind body) *lengthens* the long head at the shoulder, producing the greatest loaded stretch. Shoulder flexion (elbow forward/up) *shortens* the long head at the shoulder, reducing tension during the key stretched position[^3][^8][^7][^9]. The distinction between facing-away (lengthened) and facing-toward (shortened) cable curls captures this entirely | Bayesian Cable Curl, Incline Curl, Preacher Curl, Spider Curl, Concentration Curl |
| **2** | **Elbow Flexion Range (Full Extension → Full Flexion)** | Humeroulnar joint | **High** - evidence shows training the 0-50deg of elbow flexion (bottom range, arm nearly straight) produces *triple* the distal hypertrophy vs. training the 80-130deg range (top, nearly flexed)[^7]; cutting the bottom range (not fully extending the elbow at the start) removes the most stimulus-dense portion of the ROM | All curl variations; most pronounced in Bayesian Curl, Incline Curl, Preacher Curl |
| **3** | **Forearm Supination** | Radioulnar joint | **High** - the biceps is a powerful supinator; full supination (pinky side of hand rotates outward) at the peak of the curl maximizes biceps peak contraction; neutral (hammer) grip eliminates supination and shifts load from biceps to brachialis[^10][^11][^12]. Partial supination throughout = partial biceps peak contraction | All DB curls; especially concentration curl, incline curl, preacher curl |
| **4** | **Elbow Position (Forward Drift During Curl)** | Glenohumeral joint (secondary) | **Medium-High** - when the elbow drifts forward (anterior) of the body during a curl, the shoulder begins to flex, which *shortens* the biceps long head at the shoulder; this is the mechanism by which "cheating" reduces the lengthened stimulus. Elbows must stay at or behind the body for maximum long-head tension[^8][^7][^9] | Standing Curl, Cable Curl, Bayesian Curl, Incline Curl |
| **5** | **Wrist Neutral / Radial Deviation** | Radiocarpal joint | **Low-Medium** - excessive wrist extension or radial deviation under load reduces the ability to supinate fully; also creates injury risk (forearm tendons) that prematurely limits ROM. EZ bar partially addresses this; fully straight bar maximizes supination but may cause discomfort[^3][^5][^13] | Barbell Curl (straight bar), EZ Bar Curl, Reverse Curl |

***', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: Exercise Library', '### Barbell Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Barbell Curl (Standard)** | Barbell | Biceps Brachii (both heads) | Brachialis, Brachioradialis | High | Elbow flexion ROM + wrist supination; elbows at sides[^5][^7] | Elbow at full extension (~0deg), arms at sides - long head stretched at shoulder | Elbow at full flexion (~145deg), wrists supinated, biceps fully contracted | **Medium-High (B-Tier)** | ① Full ROM - complete elbow extension at start; ② Keep elbows locked at sides (no elbow drift forward); ③ Supinate wrists (turn pinkies out) at top[^5][^9] | ⚠️ Elbows drifting forward as bar rises - converts to front raise / shortens long head at shoulder; also: partial reps (stopping short of full extension) removes bottom-range lengthened stimulus[^7] |
| **EZ Bar Curl** | Barbell (EZ) | Biceps Brachii (both heads) | Brachialis, Brachioradialis | High | Elbow flexion ROM; semi-supinated grip reduces wrist supination vs. straight bar[^3][^5] | Elbow at full extension (~0deg) | Elbow at full flexion (~145deg) | **High (A-Tier)** | ① Semi-supinated grip reduces wrist discomfort vs. straight bar; ② Full extension at bottom; ③ Control eccentric - don''t let bar drop[^3][^5] | Partial ROM at bottom - not fully extending elbows; also less supination than straight bar reduces biceps peak contraction ⚠️[^5] |
| **Close-Grip Barbell Curl** | Barbell | Biceps Long Head (bias) | Brachialis, Biceps Short Head | High | Elbow flexion ROM + shoulder position; narrow grip biases long head[^9][^12] | Full elbow extension, hands ~6-8" apart | Full elbow flexion (~145deg), long head emphasized | **Medium-High (B-Tier)** | ① Grip inside shoulder width; ② Elbows stay at sides - not drifting forward; ③ Full extension at start[^9][^12] | Elbows drifting forward under the bar - defeats the long-head bias by shortening at the shoulder ⚠️[^9] |
| **Drag Curl (Barbell)** | Barbell | Biceps Long Head (bias) | Biceps Short Head, Brachialis | High | Elbow flexion + shoulder extension; bar stays close to torso throughout, keeping elbows behind body[^5][^9][^12] | Bar at hip level, elbows behind body - long head maximally stretched at shoulder | Bar at upper chest, elbows behind body - maximum long head contraction | **Medium-High (C-Tier per Nippard)** | ① Bar drags up torso surface - maintains elbow-behind-body position; ② Limited shoulder ROM reduces long head length change; ③ More effective as a finisher than primary builder[^5][^9] | Bar drifting away from body - elbows swing forward, converting this to a standard curl and removing the long-head-bias mechanism ⚠️[^9] |
| **Reverse Curl (Barbell)** | Barbell | Brachialis, Brachioradialis | Biceps Brachii (reduced) | High | Elbow flexion ROM; pronated grip eliminates biceps supination function[^13][^10][^14] | Full elbow extension, pronated (palms down) grip | Full elbow flexion, pronated throughout | **Medium (B-Tier for Brachialis)** | ① Palms face down throughout; ② Wrist stays neutral (no curling wrist to cheat weight up); ③ Full ROM critical - brachialis responds well to complete elbow flexion[^13][^10] | ⚠️ Wrist extending/flexing to help raise weight - removes brachialis focus and stresses forearm flexor tendons; also: partial ROM at bottom skips brachialis lengthened position[^13]...', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Standing Dumbbell Curl** | Dumbbell | Biceps Brachii (both heads) | Brachialis, Brachioradialis | High | Elbow flexion + wrist supination; same shoulder position cues as barbell curl[^5][^9] | Elbow at full extension, arm at side | Elbow at full flexion (~145deg), wrist supinated | **High (A-Tier)** | ① Full elbow extension at start; ② Supinate wrist as you curl (neutral at bottom, fully supinated at top); ③ Alternate or bilateral - both equally effective[^5][^9] | Partial ROM at bottom (not fully extending elbow) ⚠️; also: elbow drift forward removes long-head shoulder-extension component[^9] |
| **Incline Dumbbell Curl (45deg-60deg)** | Dumbbell | Biceps Long Head (proximal bias), Biceps Brachii | Brachialis | High | Shoulder extension position - bench angle determines stretch depth; arm hangs behind body[^2][^5][^6][^9] | Arm hanging straight behind body at incline - long head stretched at shoulder joint in extension (~-20 to -30deg shoulder) | Elbow at full flexion, wrist supinated | **High (A-Tier)** | ① Bench at 45-60deg (not 90deg - 90deg = standard curl); ② Let arm hang *fully* behind body - don''t hold the arm forward; ③ Full supination at top[^2][^6][^9] | ⚠️ Bringing elbow forward at the start - removes the shoulder-extension long-head stretch that is the entire purpose; 11.2% proximal biceps growth vs. 8.3% for preacher curl depends on this full shoulder-extended start position[^2][^6] |
| **Lying Flat Bench DB Curl** | Dumbbell | Biceps Brachii (long head extreme stretch) | Brachialis | High | Shoulder extension - flat bench forces maximum shoulder extension stretch; most extreme long-head lengthened position available with DBs[^5][^9] | Arm fully hanging below bench level - maximum long head shoulder extension | Elbow at full flexion above chest | **High (A-Tier)** | ① Lie face-up, arms off bench sides hanging down; ② Full hang at bottom for extreme stretch; ③ Light load required - stretch position is maximally demanding[^5][^9] | Not letting arm fully hang below bench level - defeats the entire purpose of the flat bench variation vs. standard curl ⚠️[^5] |
| **Hammer Curl (Dumbbell)** | Dumbbell | Brachialis, Brachioradialis, Biceps Brachii (reduced) | Forearm Flexors | High | Elbow flexion ROM; neutral grip prevents supination - brachialis dominant[^3][^5][^10][^12] | Elbow at full extension, neutral grip (thumb up) | Elbow at full flexion (~145deg), neutral grip maintained | **High (A-Tier)** | ① Neutral grip throughout - no rotation; ② Full extension at start; ③ "Thumb faces ceiling at top" to ensure neutral grip maintained at peak[^5][^10][^12] | ⚠️ Supinating at top - converts to a standard curl; also: elbow drift forward reduces brachialis loading in lengthened position[^10] |
| **Preacher Curl (Dumbbell)** | Dumbbell | Biceps Brachii (distal bias / short head) | Brachialis | High | Elbow extension at bottom - preacher locks shoulder in flexed position, shortening long head at hip; tension is highest at bottom stretch (distal region)[^2][^3][^5][^6] | Elbow at near-full extension on pad - preacher bench locks shoulder into ~40-60deg flexion; long head shortened at shoulder but distal region maximally loaded | Elbow at full flexion (~145deg) | **High (S-Tier per N...', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: Exercise Library - Cable Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Bayesian Cable Curl (Face-Away, Low Pulley)** | Cable | Biceps Long Head (primary), Biceps Brachii | Brachialis | High | Shoulder extension - arm behind body is the key ROM variable; elbow must NOT drift forward[^3][^5][^8][^15][^7] | Arm extended behind body (~-20 to -30deg shoulder extension), cable pulling from low pulley - long head fully stretched at shoulder AND elbow | Elbow at full flexion, lean slightly forward to maintain cable tension at top | **High (S-Tier - Best Biceps Exercise per Nippard and Henselmans)** | ① Facing away from cable, 1-2 steps forward for shoulder-extension stretch; ② Elbow stays behind body throughout (never drifts forward); ③ Lean torso slightly forward at top to prevent cable slack - gives peak contraction[^3][^5][^8][^15][^7] | ⚠️ Elbow drifting forward as the curl reaches mid-range - immediately shortens the long head at the shoulder and removes the defining benefit of this exercise; also: standing too close to the stack (no stretch at start)[^8][^15][^7] |
| **Standard Cable Curl (Low Pulley, Facing)** | Cable | Biceps Brachii (both heads) | Brachialis | High | Elbow flexion ROM; facing cable means least tension at bottom (full extension) where tension cable is most slack[^5][^7] | Elbow at full extension, facing pulley - cable nearly slack at lengthened position | Elbow at full flexion - peak tension here | **High (A-Tier)** | ① Use low pulley; ② Full elbow extension at bottom - even if tension is minimal; ③ Elbows at sides, no forward drift[^5][^7] | ⚠️ Only training mid-range (elbow 45-90deg) because tension is highest there - misses the full ROM and reduces distal hypertrophic stimulus[^7] |
| **High Cable Curl (Overhead Cable Curl)** | Cable | Biceps Short Head (bias), Biceps Brachii | Brachialis | Medium-High | Shoulder flexion position; elbow elevated - long head shortened at shoulder; emphasizes short head and distal region[^5][^7][^9] | Arm at full extension overhead - elbow at full extension, shoulder at ~90deg flexion | Elbow at full flexion, hand approaching head | **Medium (B-Tier)** | ① Cable set at ~head height or above; ② Full elbow extension at start; ③ Good short-head finisher - not a primary builder[^5][^7] | Elbow not fully extending at start - misses the short-head stretched position that is the purpose of this variation ⚠️[^5] |
| **Single-Arm Cable Curl (Low Pulley, Supinated)** | Cable | Biceps Brachii (both heads) | Brachialis | High | Elbow flexion ROM; constant tension throughout provides advantage over DB at bottom[^5][^7] | Elbow at full extension, arm at side, cable at low pulley | Elbow at full flexion, wrist supinated | **High (A-Tier)** | ① Low pulley; ② Full extension at start; ③ Supinate wrist as elbow flexes - maximize biceps peak contraction[^5][^7] | Partial ROM at bottom (arm not fully extending) - misses constant-tension advantage at the stretched position vs. dumbbell ⚠️[^7] |
| **Cable Preacher Curl (Low Pulley, Pad)** | Cable | Biceps Brachii (distal bias) | Brachialis | High | Elbow extension at bottom - same shoulder-flexion locked position as DB preacher curl; cable adds constant tension[^3][^5] | Elbow at near-full extension on preacher pad - consistent tension vs. DB preacher | Elbow at full flexio...', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Machine Preacher Curl** | Machine | Biceps Brachii (distal / short head bias) | Brachialis | High | Elbow extension at bottom + pad contact; machine cam provides improved resistance curve vs. free weight preacher curl[^3][^5][^6] | Elbow at near-full extension on pad - shoulder locked in ~50deg flexion | Elbow at full flexion, peak contraction | **High (S-Tier per Nippard)** | ① Full extension at bottom - most important cue; ② Upper arm flat against pad throughout; ③ Slow eccentric back to full extension - this is where distal growth is maximized[^3][^5] | ⚠️ Stopping short of full extension at bottom - same error as DB preacher curl but more common on machines because the weight stack allows partial reps easily; removes the distal-growth stretch that makes this S-tier[^2][^3][^6] |
| **Machine Curl (Cam-Based)** | Machine | Biceps Brachii (both heads) | Brachialis | High | Elbow flexion ROM; cam mechanism provides better resistance profile through full ROM vs. DB[^5] | Elbow at full extension, arms in machine pad - variable shoulder position | Elbow at full flexion | **Medium-High (A-Tier)** | ① Full extension at start - pad locked arm position ensures consistent ROM; ② Slow eccentric; ③ Cam provides resistance in lengthened position unlike free-weight curls[^5] | Partial range - not fully extending elbow at start due to machine plate selection habits ⚠️[^5] |
| **Scott Curl (Machine / Barbell on Vertical Pad)** | Machine / Barbell | Biceps Brachii (distal) | Brachialis | High | Elbow extension at bottom - vertical pad removes tension at bottom unlike 45deg preacher pad[^5] | Elbow at near-full extension on vertical pad - ZERO tension at full extension (gravity drops tension) | Elbow at full flexion | **Medium (C-Tier per Nippard)** | ① Only use when preacher pad is unavailable; ② Understand: vertical pad drops tension at full extension - there IS no loaded stretch; ③ Emphasize peak contraction instead[^5] | ⚠️ Choosing Scott Curl over 45deg preacher curl - vertical pad removes tension at bottom (lengthened position), directly reducing hypertrophic stimulus that makes the 45deg version S-tier; this is the defining ROM limitation of this exercise[^5] |

***', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: Exercise Library - Bodyweight Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Chin-Up (Supinated Grip)** | Bodyweight | Biceps Brachii (supinated), Latissimus Dorsi | Brachialis, Brachioradialis, Rear Delt | High | Shoulder depression + elbow flexion; lats are often the true limiting factor before biceps are fatigued[^5] | Arms at full extension overhead, elbows straight - biceps fully lengthened at shoulder and elbow | Chin above bar, elbows fully flexed, supinated | **Medium-High (B-Tier for Biceps)** | ① Full dead hang at bottom - elbows fully extended; ② Supinated grip (underhand) maximizes biceps involvement; ③ Biceps rarely the limiting factor - use weighted chins or isolation work to direct more stimulus to biceps[^5] | Not achieving full dead hang at bottom - cuts the lengthened biceps position; also: using wide grip which shifts load entirely to lats ⚠️[^5] |
| **Resistance Band Curl** | Bodyweight / Band | Biceps Brachii | Brachialis | High | Elbow flexion ROM; band resistance profile increases as elbow flexes (highest at contracted, lowest at stretched)[^5] | Elbow at full extension - minimal tension at this critical lengthened position | Elbow at full flexion - peak tension | **Low-Medium (C-Tier)** | ① Stand on band for consistent anchor; ② Full extension at start (accept minimal tension); ③ Best used as finisher or travel substitute[^5] | ⚠️ Band resistance profile is the *inverse* of what LML hypertrophy science recommends - lowest tension at the stretched position, highest at the contracted; upgrade to cable or DB for primary volume[^5][^7] |
| **TRX / Ring Curl** | Bodyweight | Biceps Brachii, Brachialis | Forearm Flexors, Core | High | Elbow flexion + body lean angle; more horizontal body = more load[^5] | Arms extended, body angled away from anchor | Arms fully flexed, body pulled to vertical | **Medium (B-Tier)** | ① Body angle controls load - more horizontal = harder; ② Full arm extension at start; ③ Supinate throughout for biceps emphasis[^5] | Not achieving full elbow extension at start - removes lengthened position of the exercise ⚠️[^5] |

***', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: SFR Quick Reference - Biceps Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best Overall** | Bayesian Cable Curl (Face-Away) | High | Only exercise loading biceps at full shoulder-extension + elbow-extension lengthened position simultaneously[^3][^5][^8][^7] |
| **S** | Machine Preacher Curl | High | Locked position + machine cam resistance curve + distal biceps loading[^3][^5] |
| **S** | Dumbbell Preacher Curl (45deg) | High | Distal biceps loaded stretch: 10.3% growth at distal site[^2][^6] |
| **S** | Preacher Hammer Curl | High | Best brachialis exercise with preacher-pad stretch loading[^3][^5] |
| **A - Excellent** | EZ Bar Curl | High | Best barbell-based wrist-friendly biceps compound[^3][^5] |
| **A** | Incline Dumbbell Curl | High | Proximal biceps: 11.2% growth; long-head shoulder-extension bias[^2][^6] |
| **A** | Lying Flat Bench DB Curl | High | Extreme long-head shoulder extension - most stretch of any DB variation[^5] |
| **A** | Hammer Curl (Dumbbell) | High | Best standalone brachialis builder[^5][^10] |
| **A** | Inverse Zottman Curl | High | Combines brachialis concentric + lengthened biceps eccentric[^3][^5] |
| **A** | Cheat Curl (EZ or Barbell) | High | Heavier eccentric overload in lengthened position - requires strict eccentric[^5] |
| **A** | Cable Preacher Curl | High | Constant tension upgrade vs. free-weight preacher[^3][^5] |
| **A** | Single-Arm Cable Curl | High | Constant tension at lengthened position vs. DB curl[^5][^7] |
| **A** | Rope Hammer Curl (Cable) | High | Best brachialis/brachioradialis cable option[^5][^13] |
| **A** | Dumbbell Zottman Curl | Medium-High | Full elbow flexor development in one movement[^5][^13] |
| **B - Good** | Standing Dumbbell Curl | High | Reliable; versatile; no strict eccentric limitation[^5][^9] |
| **B** | Standard Barbell Curl | Medium-High | High overload potential; suboptimal resistance profile[^3][^5] |
| **B** | High Cable Curl | Medium | Short-head finisher; shoulder-flexed position[^5] |
| **B** | Chin-Up | Medium-High | Lats usually limiting factor before biceps[^5] |
| **B** | Concentration Curl | Medium-High | Good peak contraction; short-head bias[^5][^12] |
| **B** | Cross-Body Cable Curl | Medium-High | Long-head bias variation[^5][^9] |
| **C - Moderate** | Close-Grip Barbell Curl | Medium-High | Long-head bias; basic variation[^9][^12] |
| **C** | Scott Curl | Medium | Tension drops at full extension - inferior to 45deg preacher[^5] |
| **C** | Drag Curl | Medium-High | Elbow-behind-body cue; limited muscle-length change[^5][^9] |
| **C** | TRX / Ring Curl | Medium | Good bodyweight option; load progression limited[^5] |
| **D - Limited** | Resistance Band Curl | Low-Medium | Inverse resistance profile - highest tension where biceps is shortest[^5][^7] |

***', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: Key Science Notes - What the Research Actually Says', '**The Biceps Stretch-Mediated Debate: Resolved:**

- The biceps MAY lack the titin-based passive tension mechanism that drives stretch-mediated hypertrophy in larger muscles; its sarcomeres may not sufficiently extend onto the descending limb of the length-tension curve[^1]
- **However:** All 3 direct studies comparing longer vs. shorter elbow flexor training show favorable results for *longer* muscle length training[^4]
- Training the bottom 0-50deg of elbow flexion produces **triple the distal hypertrophic growth** vs. top 80-130deg[^7]
- **Practical resolution:** Both positions produce distinct regional growth. The lengthened position (Bayesian, incline curl) builds the proximal/mid biceps and long head; the preacher position builds the distal biceps and short head. Together they build the complete biceps[^2][^6]

**⚠️ Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus:**

- ⚠️ **Bayesian Cable Curl with Elbow Drift:** Any forward drift of the elbow converts this from a lengthened-position exercise to a standard cable curl - entirely removing the shoulder-extension mechanism responsible for its S-tier status[^8][^15][^7]
- ⚠️ **Preacher Curl (Any Variant) with Partial Bottom Extension:** Research shows the most growth-stimulating load is at the bottom of the ROM (distal hypertrophy, 10.3% growth); stopping short of full extension removes this stimulus entirely[^6][^2]
- ⚠️ **Resistance Band Curl:** The band''s resistance profile is the *inverse* of LML hypertrophy science - maximum resistance is in the contracted (shortened) position, minimum resistance in the stretched (lengthened) position; this directly reduces stimulus where the science says it should be highest[^5][^7]
- ⚠️ **Scott Curl vs. 45deg Preacher Curl:** Vertical pad removes ALL tension at full extension (gravity acts along the arm, not against it); the 45deg preacher pad maintains meaningful tension at the bottom; this is a direct ROM-based hypertrophy difference between near-identical exercises[^5]
- ⚠️ **Any Curl Stopping Short of Full Elbow Extension:** Evidence consistently shows the 0-50deg range (nearly fully extended elbow) is the highest-stimulus zone; partial reps skipping full extension leave the most hypertrophy-productive range of the curl completely untrained[^4][^7]

---', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Biceps Exercise Library: References', '1. [Is it true that the biceps don''t benefit from stretch-mediated ...](https://www.facebook.com/groups/StrongerByScienceCommunity/posts/3216739368604434/) - The implied claim that "the biceps never benefit from stretch- mediated hypertrophy" cannot be true.

2. [Distinct muscle growth and strength adaptations after ...](https://pubmed.ncbi.nlm.nih.gov/39809454/) - We observed a greater increase in the proximal elbow flexor thickness in the incline biceps curl com...

3. [Jeff Nippard Ranks the Best and Worst Bicep Exercises](https://generationiron.com/jeff-nippard-ranks-bicep-exercises/) - Nippard''s top-rated "S-tier" exercises include the 45-degree preacher curl and the face-away Bayesia...

4. [Do the biceps respond to "stretch-mediated hypertrophy"? ...](https://www.youtube.com/watch?v=bohcXsKIPOU) - We have three studies comparing shorter to longer muscle length training in the elbow flexors all th...

5. [The Best Biceps Exercises According To Science](https://www.lowkickmma.com/the-best-biceps-exercises-according-to-science-the-only-list-youll-need/) - The tier list provides practical guidance for bicep workouts and biceps exercises selection. Nippard...

6. [Incline Curls vs Preacher Curls: Which is Best for Muscle ...](https://www.menshealth.com/uk/building-muscle/a63522473/incline-curls-vs-preacher-curls/) - For example, the preacher curl group had greater strength gains compared to the incline curl group p...

7. [Bayesian curls: the best biceps builder](https://mennohenselmans.com/bayesian-curls/) - Bayesian curls are a cable biceps curl performed facing away from the cable station. During the exer...

8. [The faceaway cable curl, or the bayesian cable curl as some ...](https://www.instagram.com/reel/DTJkOMZkYfG/?hl=en) - Biceps ➡️ a curl hardest in lengthened position. Facing away from a cable tower, or leaning back on ...

9. [Peak Workout (Long Head Bicep Exercises) Size & ...](https://builtwithscience.com/workouts/bicep-peak-workout/) - Thus, the best "peak exercises" are the ones that emphasize the long head over the short head. And i...

10. [Hammer Curl vs. Bicep Curl: Which Is Best for Bigger Biceps?](https://legionathletics.com/hammer-curls-vs-bicep-curls/) - Older research suggests hammer curls emphasize the brachialis and brachioradialis, two small muscles...

11. [Anatomic and biomechanical analysis of the short and long ...](https://pubmed.ncbi.nlm.nih.gov/21813298/) - The short head bundle of the distal biceps tendon is more efficient at elbow flexion, and the long h...

12. [Best Long Head Bicep Exercises for Muscle Growth](https://www.kettlebellkings.com/blogs/default-blog/best-long-head-bicep-exercises) - Maximize biceps peak by targeting the long head. Learn key exercises, training tips, and common mist...

13. [Reverse Curl vs. Hammer Curl: Which Bicep Exercise Wins?](https://communitystrengthaustin-personaltraining.com/blog/reverse-curl-vs-hammer-curl/) - Reverse curls are great for functional strength (e.g., lifting or pulling). Hammer curls are ideal f...

14. [Hammer curls vs Reverse curls : r/naturalbodybuilding](https://www.reddit.com/r/naturalbodybuilding/comments/1irvfsv/hammer_curls_vs_reverse_curls/) - For me, both of these exercises can cause injury. Much prefer hammer preacher curls with a superior ...

15. [Bayesian (Face Away) Cable Curls - Everything You Need ...](https://fitnessdrum.com/bayesian-face-away-cable-curls/) - Bayesian (Face Away) Cable Curl Benefits. Loads the Bicep in the Stret...', 'ROMRx Bodybuilding KB - Biceps.md', ARRAY['bodybuilding','biceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: Overview', '# ROMRxBB - Calves Exercise Library
### Stretch-Mediated Hypertrophy Edition | Gastrocnemius (Medial / Lateral Head), Soleus

> **The Most Unique ROM Science in the Entire ROMRxBB Series:** Calves are the only major muscle group where **lengthened partial ROM has been shown to produce MORE hypertrophy than full ROM** in a direct comparison. A 2023 study (42 women, 8 weeks) split calf training into three groups: (1) lengthened partials only (bottom stretch pocket), (2) full ROM, (3) shortened partials (top/contracted pocket). Results: **Lengthened partials = +15.2% medial gastrocnemius growth vs. +6.7% for full ROM vs. +3.4% for shortened partials**. This makes the *stretch position* - and spending maximal time there - the most critical ROM variable for calf hypertrophy, not total ROM coverage. Additionally: a landmark 2023 study confirms that **standing (knee-straight) calf raises produce 12.4% lateral gastrocnemius and 9.2% medial gastrocnemius growth vs. 1.7% and 0.6% for seated (knee-bent)**. The seated calf raise trains the soleus equally to standing - but produces essentially *zero* gastrocnemius growth. The programming conclusion: standing calf raises are the higher-priority exercise for most lifters; seated raises add soleus volume with no gastrocnemius cost. SFR ratings calibrated per current evidence and Nippard''s framework. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3][^4][^5][^6][^7][^8]

***', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]);

INSERT INTO public.rombot_knowledge (sport, topic, chunk, source_citation, tags) VALUES
('bodybuilding', 'ROMRxBB - Calves Exercise Library: ROM Hierarchy for Calves - Top 5 Limiters', 'Ranked by severity of impact on **hypertrophic stimulus** (not just injury risk):

| Rank | ROM Limiter | Joint / Movement | Muscle Affected | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------|----------------------|------------------------|
| **1** | **Ankle Dorsiflexion (Heel Drop Depth at Stretch)** | Talocrural joint (ankle) | Gastrocnemius, Soleus | **Critical** - the stretch position is the highest-stimulus zone for calf growth; every degree of dorsiflexion below neutral that can be achieved under load represents MORE loaded gastrocnemius length; performing calf raises on flat ground (no heel drop below neutral) removes the entire bottom stretch ROM and reduces gastrocnemius hypertrophy dramatically[^1][^9][^10][^8] | All calf raises performed on flat ground (no step/platform) |
| **2** | **Knee Flexion (Bi-articular Gastrocnemius Lengthening)** | Tibiofemoral joint | Gastrocnemius (bi-articular) | **Critical** - the gastrocnemius crosses the knee; when the knee is straight (extended), the gastrocnemius is lengthened at the knee AND must produce force across both joints; when the knee bends, the gastrocnemius shortens at the knee and its contribution drops dramatically; this is the mechanism explaining 12.4% vs. 1.7% lateral gastrocnemius growth from standing vs. seated calf raises[^2][^4][^5] | Seated leg press toe press, seated calf raise machine, any bent-knee calf raise |
| **3** | **Hip Flexion (Donkey Position)** | Coxofemoral joint | Gastrocnemius (Long Head of gastrocnemius origin) | **High** - the gastrocnemius originates on the posterior femoral condyles; hip hinging forward (donkey calf raise position) places slight additional stretch on the gastrocnemius origin above the knee, marginally increasing total gastrocnemius length vs. standing upright; this is the mechanical basis for the donkey calf raise''s reputation as a superior gastrocnemius builder[^11][^12][^13] | Donkey Calf Raise, Machine Donkey Calf Raise, Bent-Over Calf Raise |
| **4** | **Achilles Tendon Flexibility / Plantar Flexion Stiffness** | Ankle + Achilles complex | Gastrocnemius, Soleus | **Medium-High** - limited calf/Achilles flexibility restricts both the depth of the stretch (reduced dorsiflexion range) AND the height of the plantarflexion (reduced peak contraction); this limits hypertrophic stimulus at BOTH ends of the calf raise ROM[^14][^15][^10] | All calf raise variations; progressive dorsiflexion mobility work directly increases the productive ROM window |
| **5** | **Ball-of-Foot Contact Area (Platform Width/Angle)** | Foot mechanics | Gastrocnemius, Soleus | **Medium** - the amount of foot surface on the platform affects stability and how deep the heel can drop; too much foot on the platform (heel past the edge) prevents adequate dorsiflexion; too little foot (toes only) creates instability and limits plantarflexion height; optimal = just the ball of foot on the edge[^10][^11] | All standing calf raise variations on step/platform |

***', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: Exercise Library', '### Machine Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Standing Calf Raise Machine** | Machine | Gastrocnemius (Medial + Lateral), Soleus | Tibialis Posterior, Peroneus | High | Ankle dorsiflexion depth - heel must drop below platform level; knee MUST stay straight[^2][^5][^10] | Heel fully dropped below platform level (~+20-30deg of dorsiflexion past neutral) - gastrocnemius at maximum length | Heel elevated to maximum plantarflexion (~50deg+) | **High (S-Tier - Best Overall Calf Exercise)** | ① Heel drops BELOW platform level at bottom - this is non-negotiable; ② 2-sec pause at full stretch; ③ Knee stays straight throughout[^2][^5][^10] | ⚠️ Starting rep from neutral ankle (no heel drop below platform) - removes the entire bottom ROM where 15.2% growth was produced; also: knee bending reduces gastrocnemius activation from 12.4% to 1.7% growth potential[^1][^5] |
| **Seated Calf Raise Machine (Knee-Bent)** | Machine | Soleus (primary), Gastrocnemius (minimal) | Tibialis Posterior | Medium-High | Knee flexion angle - bent knee purposely shortens gastrocnemius, making this a soleus-only exercise[^2][^4][^5] | Heel fully dropped below platform; soleus lengthened at ankle with knee at ~90deg | Heel raised to maximum plantarflexion | **High (A-Tier - for Soleus)** | ① Accept: this builds soleus, NOT gastrocnemius - the bent knee is the mechanism[^2][^4]; ② Full heel drop at bottom; ③ Add to standing calf raises for complete calf development[^4][^10] | ⚠️ Thinking this replaces standing calf raises - seated produces 0.6% medial gastrocnemius growth vs. 9.2% from standing; they are complementary, not interchangeable[^5] |
| **Donkey Calf Raise Machine** | Machine | Gastrocnemius (Medial + Lateral bias) | Soleus | High | Ankle dorsiflexion + hip flexion - bent-forward torso provides additional gastrocnemius stretch at the origin[^11][^12][^13] | Heel fully dropped, torso bent forward (~90deg) - maximum gastrocnemius stretch from both ankle AND hip hinge | Heel at maximum plantarflexion | **High (S-Tier)** | ① Hip hinge ~90deg - not standing upright; ② Heel drops below platform at bottom; ③ Controlled 2-sec eccentric to full stretch[^11][^12][^13] | Not hinging at the hip (standing upright) - removes the extra gastrocnemius lengthening at the origin; converts to a standard standing calf raise ⚠️[^11][^12] |
| **Leg Press Toe Press (Standing ROM / Knee Straight)** | Machine | Gastrocnemius, Soleus | Tibialis Posterior | High | Ankle dorsiflexion - foot plate must be at sufficient angle for heel to drop well below neutral; knee must stay straight[^3][^4][^10] | Heel dropped as far as foot plate allows - gastrocnemius under full eccentric stretch | Toes pressed forward to full plantarflexion | **High (A-Tier per Nippard)** | ① Knees straight (or very slight bend) throughout; ② Full heel drop on eccentric - don''t stop at neutral; ③ Push through ball of foot only (not full heel contact)[^3][^4][^10] | ⚠️ Bending knees during the press - removes gastrocnemius lengthening (same seated vs. standing issue); also: not achieving full heel drop - loses the lengthened partial advantage[^4][^5] |
| **Smith Machine Calf Raise (On Step)** | Machine | Gastrocnemius, Soleus | Tibialis Posterior | High | Ankle dorsiflexion - bar provides st...', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: Exercise Library - Barbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Barbell Standing Calf Raise (On Step)** | Barbell | Gastrocnemius, Soleus | Spinal Erectors (load bearing) | High | Ankle dorsiflexion + spinal load; bar on back limits how much spinal load is tolerable at pure calf focus[^10] | Heel dropped below step, bar on traps, knee straight | Heel at full plantarflexion height | **Medium-High (B-Tier)** | ① Use a squat rack - safety bars catch bar if lost; ② Stand on plates or step inside rack; ③ Balance limitation makes this less practical than machine for calf focus[^10] | Performing on flat ground (no step) - removes all dorsiflexion depth; also: balance limitation causes early rep termination before ROM limit is hit ⚠️[^10] |
| **Seated Barbell Calf Raise (Knee-Bent, On Step)** | Barbell | Soleus (primary), Gastrocnemius (minimal) | Tibialis Posterior | Medium-High | Ankle dorsiflexion + balance; bar on quads requires towel or pad; knee at ~90deg ensures soleus isolation[^2][^4] | Heel dropped below step, knee at 90deg, bar on quad | Heel at maximum plantarflexion, knee stays bent | **Medium (B-Tier)** | ① Towel or pad on quads for bar comfort; ② Feet on plates or step for ROM; ③ Knee stays at 90deg throughout[^2][^4] | Knee extending during rep - reduces soleus isolation by re-engaging gastrocnemius; not using a step removes heel drop depth ⚠️[^4] |
| **Barbell Donkey Calf Raise (Weighted, Bent Over)** | Barbell | Gastrocnemius (hip-flexed stretch bonus) | Soleus | High | Ankle dorsiflexion + hip flexion + balance; bar can be loaded on hip/low back or partner sits on hips (traditional)[^11][^12] | Heel dropped below platform, torso hinged ~90deg, bar on hips | Heel at full plantarflexion, torso hinged throughout | **High (A-Tier)** | ① Hip hinge to ~90deg onto support (bench/rack); ② Load at hips via belt or barbell pad; ③ Full heel drop at bottom[^11][^12] | Not maintaining hip hinge (torso coming upright) - removes the unique gastrocnemius-origin stretch mechanism of donkey position ⚠️[^12] |

***', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Single-Leg Dumbbell Calf Raise (On Step)** | Dumbbell | Gastrocnemius (Medial + Lateral), Soleus | Balance/stabilizer complex | High | Ankle dorsiflexion - single leg demands greater stability; contralateral DB is preferred[^10] | Heel dropped below step level at full dorsiflexion | Heel at maximum single-leg plantarflexion | **High (A-Tier)** | ① DB in same hand as working leg (ipsilateral) OR use free hand on rack for balance and DB in working-leg-side hand; ② Full heel drop; ③ 2-sec pause at stretch[^10] | Not dropping heel below step - same stretched-position error as bilateral standing; especially acute single-leg due to balance distraction ⚠️[^10] |
| **Bilateral Dumbbell Standing Calf Raise (On Step)** | Dumbbell | Gastrocnemius, Soleus | None | High | Ankle dorsiflexion - same as all standing calf raises; DBs add load without machine required[^10] | Heels dropped below step | Heels at full plantarflexion | **High (A-Tier)** | ① Both heels drop simultaneously; ② DBs at sides; ③ Full stretch pause[^10] | Not using a step - flat-floor dumbbell calf raises have zero dorsiflexion range and zero hypertrophic stretch stimulus ⚠️[^10] |
| **Seated Dumbbell Calf Raise (Knee-Bent)** | Dumbbell | Soleus | Gastrocnemius (minimal) | Medium-High | Ankle dorsiflexion + balance on stool or bench; DBs on knees[^2][^4] | Heel dropped below floor or step, knee at ~90deg | Heel at full plantarflexion | **Medium-High (A-Tier for Soleus)** | ① Feet on plates or steps; ② DB on quad; ③ Knee stays at 90deg[^2][^4] | Knee extending under load - gastrocnemius takes over, reducing soleus isolation ⚠️[^4] |
| **Dumbbell Donkey Calf Raise (Single-Leg Bent Over)** | Dumbbell | Gastrocnemius | Soleus | High | Ankle dorsiflexion + hip flexion; single-leg increases gastrocnemius demand per rep[^11][^12] | Heel dropped, torso hinged, single-leg - maximum gastrocnemius stretch | Single-leg heel fully raised | **High (A-Tier)** | ① Lean torso forward ~90deg onto support (rack or bench); ② Full single-leg heel drop; ③ DB for ipsilateral load if needed[^11][^12] | Same hip-hinge abandonment error as machine donkey version ⚠️[^12] |

***', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: Exercise Library - Cable Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Cable Standing Calf Raise (Ankle Attachment, Step)** | Cable | Gastrocnemius, Soleus | None | High | Ankle dorsiflexion - cable provides constant tension at the stretch position unlike body weight (which provides zero tension at heel-drop position due to gravity)[^10] | Heel dropped below step - cable tension maintained throughout eccentric | Heel at full plantarflexion | **High (A-Tier)** | ① Attach ankle cuff to low pulley; ② Step on plate/step for heel drop; ③ Constant tension advantage: cable gives resistance at the bottom stretch unlike free weight[^10] | ⚠️ No step - cable tension becomes irrelevant without the dorsiflexion range that creates the lengthened position[^10] |
| **Cable Seated Calf Raise (Ankle Attachment)** | Cable | Soleus (primary), Gastrocnemius (minimal) | None | Medium-High | Ankle dorsiflexion + knee position; seated cable variant replicates soleus-focused machine[^2][^4] | Heel dropped, knee at ~90deg, cable at low pulley | Heel at full plantarflexion with knee bent | **Medium-High** | ① Knee stays at 90deg (soleus isolation intent); ② Feet elevated on step or plates; ③ Low pulley ankle cuff[^2][^4] | Knee extending reduces soleus isolation ⚠️[^4] |
| **Resistance Band Calf Raise (On Step)** | Cable / Band | Gastrocnemius, Soleus | None | High | Band resistance profile: similar to cable but less consistent tension - better than free weight at the stretch[^10] | Heel dropped below step under band resistance | Heel at full plantarflexion | **Medium (B-Tier)** | ① Band around arch of foot attached below; ② Full heel drop; ③ Functional substitute when machine unavailable[^10] | Short ROM - not using a step limits the entire exercise to zero dorsiflexion range ⚠️[^10] |

***', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: Exercise Library - Bodyweight Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Bodyweight Donkey Calf Raise (Bent Over, Two-Leg)** | Bodyweight | Gastrocnemius | Soleus | High | Ankle dorsiflexion + hip flexion - bodyweight version of the gold standard[^11][^12][^13] | Heel dropped below step, torso hinged ~90deg | Heels fully raised, hip hinge maintained | **High (A-Tier - for bodyweight options)** | ① Lean torso onto bench/rack; ② Full heel drop below step/platform; ③ Hip hinge must be maintained throughout[^11][^12][^13] | Not hinging at hip (torso upright) or not using a step - eliminates both gastrocnemius-specific advantages of this variation ⚠️[^12] |
| **Single-Leg Bodyweight Calf Raise (On Step)** | Bodyweight | Gastrocnemius, Soleus | Balance complex | High | Ankle dorsiflexion - step required; single-leg makes bodyweight more challenging[^10] | Heel dropped below step | Heel at full single-leg plantarflexion | **High (A-Tier - best home/bodyweight calf option)** | ① Use stair edge or weight plates; ② Full heel drop - pause at bottom; ③ Free hand lightly touches wall (balance only, not for unloading)[^10] | Not using a step - flat floor bodyweight calf raises produce essentially no loaded stretch stimulus ⚠️[^10] |
| **Bilateral Bodyweight Calf Raise (On Step)** | Bodyweight | Gastrocnemius, Soleus | None | High | Ankle dorsiflexion - step required[^10] | Heels dropped below step | Heels at full plantarflexion | **Medium (B-Tier - insufficient load for intermediate+)** | ① Use step or stair; ② Full heel drop; ③ Progress to single-leg or add load quickly[^10] | Flat floor - zero ROM benefit; insufficient challenge for intermediate lifters without additional load ⚠️[^10] |
| **Jump Rope / Skipping** | Bodyweight | Gastrocnemius, Soleus | Tibialis Anterior | Low | Ankle plantarflexion only (no dorsiflexion under load) | None - no meaningful stretch position | Repeated short plantarflexion impacts | **Low (D-Tier for Hypertrophy)** | ① Better for conditioning than hypertrophy; ② No loaded stretch position = no stretch-mediated hypertrophy; ③ Use for warm-up or conditioning only[^10] | ⚠️ Not a hypertrophy tool - the entire length-tension ROM is absent; replace with any loaded calf raise variation for muscle building[^10] |
| **Wall Calf Stretch (Loaded Eccentric Hold)** | Bodyweight | Gastrocnemius, Soleus (eccentric/isometric) | Achilles Tendon | High | Ankle dorsiflexion - passive stretch produces minimal hypertrophy stimulus vs. loaded eccentric[^14][^15] | Heel on ground, toes up on wall - maximum passive gastrocnemius stretch | N/A (static stretch / isometric) | **Low (C-Tier for Hypertrophy, but A-Tier for ROM)** | ① Best used as mobility work to *increase* ROM for calf raises, not as a primary hypertrophy tool; ② 30-90 second holds; ③ The direct benefit: more dorsiflexion ROM = more loaded stretch in calf raises[^14][^15] | Using this as a substitute for loaded calf training - static stretching alone produces minimal muscle growth; its value is unlocking more range for loaded exercise[^14] |

***', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: SFR Quick Reference - Calves Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best Exercise** | Standing Calf Raise Machine (Full Stretch Pause) | High | 12.4% lateral + 9.2% medial gastroc growth; highest gastrocnemius + soleus stimulus simultaneously[^2][^5] |
| **S** | Donkey Calf Raise Machine | High | Additional hip-hinge gastrocnemius-origin stretch beyond standing variant[^11][^12] |
| **A - Excellent** | Leg Press Toe Press (Knee Straight) | High | Nippard S-Tier; gravity + machine allows very heavy gastrocnemius overload[^3][^4] |
| **A** | Seated Calf Raise Machine | High | Best soleus isolation; equal soleus growth to standing with zero gastrocnemius dilution[^2][^4][^5] |
| **A** | Single-Leg DB Calf Raise (On Step) | High | Unilateral load enables heavier stimulus per leg than bilateral[^10] |
| **A** | Dumbbell Donkey Calf Raise | High | Bodyweight-accessible donkey position with unilateral load option[^11][^12] |
| **A** | Smith Machine Calf Raise (On Step) | High | Stable heavy overload with full ROM; excellent for high-rep sets to failure[^10] |
| **A** | Barbell Donkey Calf Raise | High | Loaded donkey position with barbell at hip for heavy overload[^11][^12] |
| **A** | Single-Leg Bodyweight Calf Raise (On Step) | High | Best home/travel option; full ROM on step is the key variable[^10] |
| **A** | Cable Standing Calf Raise (On Step) | High | Constant tension at stretch position - advantage over free weight[^10] |
| **B - Good** | Barbell Standing Calf Raise (On Step) | Medium-High | High load potential; balance limits ROM focus[^10] |
| **B** | Bilateral DB Standing Calf Raise (On Step) | High | Reliable; step is required[^10] |
| **B** | Seated DB Calf Raise | Medium-High | Soleus substitute when machine unavailable[^2][^4] |
| **B** | Bodyweight Donkey Calf Raise | High | Good gastrocnemius ROM; load limited[^11][^12] |
| **B** | Resistance Band Calf Raise (On Step) | Medium | Functional substitute; less consistent tension[^10] |
| **C - Moderate** | Bilateral BW Calf Raise (On Step) | Medium | Good ROM; load too low for intermediate+[^10] |
| **C** | Seated Barbell Calf Raise | Medium | Adequate soleus tool; requires padding setup[^2][^4] |
| **C** | Cable Seated Calf Raise | Medium-High | Soleus option with constant tension[^2][^4] |
| **C** | Wall Calf Stretch | Low | ROM tool, not hypertrophy driver[^14][^15] |
| **D - Limited** | Flat Floor Any Calf Raise | Low | Zero dorsiflexion = zero loaded stretch = no stretch-mediated hypertrophy[^1][^10] |
| **D** | Jump Rope | Low | No loaded stretch position; conditioning only[^10] |

***', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: Key Science Notes', '**The Calf Stretch Position Insight - The Defining Finding:**[^6][^8][^1]

Barbosa et al. 2023 (42 women, 8 weeks, 3x/week) directly compared: (1) Lengthened Partials (bottom half only - heel well below neutral), (2) Full ROM, (3) Shortened Partials (top half only). MRI results:
- **Lengthened Partials: +15.2% medial gastrocnemius, +14.9% lateral gastrocnemius**
- Full ROM: +6.7% medial, +7.3% lateral
- Shortened Partials: +3.4% medial, +6.2% lateral

The implication: pausing at the bottom of the calf raise (full dorsiflexion / maximal stretch under load) is not optional - it is the primary mechanism. Top-of-rep squeezes contribute comparatively little. Programming prescription: emphasize time in the stretched position, slow eccentrics, and deep heel drops above all else.[^8][^1][^6]

**Standing vs. Seated - Directly Resolved:**[^2][^4][^5]

Kinoshita et al. 2023:
- Standing (knee-straight): **+12.4% lateral gastrocnemius, +9.2% medial gastrocnemius, +2.1% soleus** (all significant)
- Seated (knee-bent): **+1.7% lateral gastrocnemius, +0.6% medial gastrocnemius, +2.9% soleus** (only soleus significant)

Conclusion: Standing calf raises are definitively superior for gastrocnemius growth. Seated raises match standing for *soleus* growth but should be added as a secondary exercise, not a replacement. Programming should be standing-first, seated-supplemental - never seated-only.[^4][^5][^2]

**⚠️ Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus:**

- ⚠️ **Any Calf Raise on Flat Ground (No Step/Platform):** Without a raised surface, the heel cannot drop below neutral - the ankle starts at 0deg dorsiflexion. This is the equivalent of only doing the top half of a curl (shortened partials = +3.4% growth). No step = no hypertrophy-productive ROM. This applies to ALL calf raise variations regardless of equipment[^10][^1][^8]
- ⚠️ **Leg Press Toe Press with Bent Knees:** Bending the knees on the leg press toe press removes the gastrocnemius''s knee-extension lengthening mechanism - directly converting a gastrocnemius exercise to a soleus-only exercise; 12.4% → ~1.7% gastrocnemius growth potential[^5][^2]
- ⚠️ **Seated Calf Raise Prioritized Over Standing:** If a lifter does only seated calf raises due to misunderstanding their purpose, they will produce essentially zero gastrocnemius growth (0.6%) while spending full calf volume on soleus only; this is the single most common programming error in calf training[^2][^4][^5]
- ⚠️ **Donkey Calf Raise Without Hip Hinge:** Performing the donkey calf raise with upright torso removes the hip hinge that provides the extra gastrocnemius-origin stretch - converting it to a standard standing calf raise with an awkward setup[^11][^12]
- ⚠️ **Shortened Partial Calf Raises as Primary Volume:** Training only the top half of the calf raise (contracted position) produces the weakest hypertrophic response across all ROM options (+3.4%) - directly opposing the most effective stimulus (bottom/lengthened position)[^1][^6][^8]

**Programming Prescription:**

A complete calf program built on current evidence:[^4][^5][^10][^1][^2]
1. **Primary volume:** Standing machine or donkey calf raise - gastrocnemius + soleus, deep heel drop with 2-sec bottom pause
2. **Secondary volume:** Seated calf raise machine - soleus supplementation
3. **ROM technique priority:** Deep heel drop below platform > full ROM > shortened partial; time in stretched position is the #1 technique variable
4. **Load range:** 6-30 rep ran...', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Calves Exercise Library: References', '1. [Greater Gastrocnemius Muscle Hypertrophy After Partial ...](https://pubmed.ncbi.nlm.nih.gov/37015016/) - The current results suggest that calf training performed at longer muscle lengths may optimize gastr...

2. [extended versus seated/knee-flexed plantarflexion (calf - ...](https://www.facebook.com/e3rehab/posts/because-the-gastrocnemius-crosses-the-knee-joint-whereas-the-soleus-does-not-it-/1493961142739696/) - It seems like the seated and standing calf raises target the soleus and the gastrocnemius respective...

3. [Compilation of Jeff Nippard''s (1) favorite exercises from ...](https://www.reddit.com/r/JeffNippard/comments/1ow5r0h/compilation_of_jeff_nippards_1_favorite_exercises/) - Compilation of Jeff Nippard''s (1) favorite exercises from TML and (2) S-tier exercises from Youtube,...

4. [Seated versus Straight Leg Calf Raises](https://www.fitnesssimplified.org/training/seated-versus-straight-leg-calf-raises) - Straight leg calf raises (ie standing calf raises) train the gastrocnemius and soleus equally. Seate...

5. [Triceps surae muscle hypertrophy is greater after standing ...](https://pubmed.ncbi.nlm.nih.gov/38156065/) - Conclusion: Standing calf-raise was by far more effective, therefore recommended, than seated calf-r...

6. [Partial range of motion (ROM) training beats full ...](https://www.facebook.com/MennoHenselmans/posts/partial-range-of-motion-rom-training-beats-full-rom-training-for-calf-growth-new/806799547478803/) - Partial range of motion (ROM) training beats full ROM training for calf growth, new study finds

A n...

7. [Lengthened partials, the latest training concept](https://www.absolutebalance.com.au/lengthened-partials-the-latest-training-concept) - The study concluded that participants who did partial ROM during the exercise had higher levels of m...

8. [What Range of Motion Is Best For Calf Growth LASTEST ...](https://www.instagram.com/reel/C-P700fRcDR/?hl=en) - This specific study suggests that the calves may benefit from training with partial range of motion ...

9. [Calves 101 - 1. I''ll explain a few things 2. "Why the hold ...](https://www.instagram.com/reel/DYfDeBcNxPr/) - Stretch-Mediated Hypertrophy: Research shows that training a muscle under load at its longest length...

10. [How To Grow Your Calves](https://e3rehab.com/how-to-grow-your-calves/) - The idea is that knee-bent calf raises isolate the soleus because the knee-bent position puts the ga...

11. [What Is the Donkey Calf Raise](https://gmwdfitness.com/blogs/news/what-is-the-donkey-calf-raise) - The donkey calf raise is a variation of the traditional calf raise exercise, but it targets the calv...

12. [The Best Exercise For Skinny Calves](https://www.menshealth.com/fitness/a19526353/donkey-calf-raise/) - The donkey calf raise might be the best exercise for building your calf muscles. Watch the video to ...

13. [Donkey Calf Raise: Exercise Guide, Video, Techniques ...](https://fitwill.app/exercise/0284/donkey-calf-raise/) - Donkey Calf Raise is a bent-over calf exercise that loads the gastrocnemius and soleus while the tru...

14. [Effects of Stretching the Gastrocnemius Muscle](https://footandankleinstitute.com/wp-content/uploads/2022/09/effects-of-stretching-on-the-gastrocnemius-muscle.pdf) - At the conclusion ofthe study, the amouT''lt of Increased ankle dorsiflexion with knee extended and f...

15. [Eight weeks of eccentric training at long-muscle length ...](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00859.2024...', 'ROMRx Bodybuilding KB - Calves.md', ARRAY['bodybuilding','calves','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: Overview', '# ROMRxBB - Chest Exercise Library
### Stretch-Mediated Hypertrophy Edition | Pectoralis Major (All Heads)

> **Science Basis:** This library is built on stretch-mediated / long-muscle-length hypertrophy principles per Milo Wolf, Mike Israetel (RP Strength), and Jeff Nippard. Training the pec at long muscle lengths (deep stretch under load) produces superior or equal hypertrophy vs. contraction-focused training across the current body of evidence. SFR ratings are calibrated per Israetel''s Stimulus-to-Fatigue framework. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3][^4][^5]

***', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: ROM Hierarchy for Chest - Top 5 Limiters', 'Ranked by how severely the limitation restricts **hypertrophic stimulus** (not just injury risk):[^6][^7][^8]

| Rank | ROM Limiter | Joint / Movement | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------------|------------------------|
| **1** | **Shoulder Horizontal Abduction** | Glenohumeral joint | **Critical** - directly limits depth of loaded pec stretch; the #1 hypertrophy bottleneck for all chest work[^7][^9] | DB Fly, DB Press, Pec Deck, Cable Fly |
| **2** | **Shoulder External Rotation** | Glenohumeral joint | **High** - insufficient ER locks out the incline pressing groove, forcing anterior delt compensation; blocks clavicular head recruitment[^10][^11] | Incline Press, Low-to-High Cable Fly |
| **3** | **Thoracic Extension** | T-spine (T4-T8) | **High** - kyphotic T-spine prevents full scapular retraction and reduces pec "pre-stretch" depth in all supine pressing[^12][^13] | All bench variants, Dips |
| **4** | **Shoulder Flexion** | Glenohumeral joint | **Medium** - limits overhead range; restricts costal head recruitment in dips and pullover variations[^14][^15] | Dips, Pullovers, Landmine Press |
| **5** | **Elbow / Wrist Position** | Elbow joint | **Low-Medium** - excessive elbow flare shortens pec arc; ulnar deviation shifts load to wrist/shoulder[^16][^17] | Barbell Press, Push-Ups, Machine Press |

***', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: Exercise Library', '### Barbell Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Flat Barbell Bench Press** | Barbell | Pec Major (Sternal) | Ant. Deltoid, Triceps | Medium | Shoulder horizontal abduction - bar path stops at chest[^8][^9] | Bar touches chest (~90deg shoulder horizontal abduction) | Arms locked out above sternum | **High** | ① Touch chest every rep; ② Retract scapula before unracking; ③ Bar path travels slight arc toward face[^8][^18] | Short ROM - bar bounced off chest, losing 20-30deg of stretch in the lengthened position ⚠️[^8] |
| **Incline Barbell Bench Press** | Barbell | Pec Major (Clavicular) | Ant. Deltoid, Triceps | Medium | Shoulder external rotation + horizontal abduction[^19][^20] | Bar touches upper chest (~30-45deg bench, ~100deg shoulder horiz. abd.) | Arms locked above clavicular head | **High** | ① Set bench 30-45deg; ② Elbows at ~45-60deg flare (not 90deg); ③ Touch sternum-to-collarbone zone[^20][^21] | Bench angle >45deg - shifts to anterior delt; drastically reduces clavicular head stretch ⚠️[^21] |
| **Decline Barbell Bench Press** | Barbell | Pec Major (Costal/Lower Sternal) | Triceps, Ant. Deltoid | Medium-Low | Limited ROM vs. flat; shoulder horizontal abduction[^20][^22] | Bar touches lower sternum (~80deg shoulder horiz. abd.) | Arms locked above lower chest | **Medium** | ① Secure feet first; ② Bar to lower sternum below nipple line; ③ Controlled eccentric to full touch[^23][^20] | Excessive arch converting decline to pseudo-flat press; also limited stretch depth vs. dumbbell variation[^22] |
| **Wide-Grip Flat Barbell Press** | Barbell | Pec Major (Sternal/Mid) | Ant. Deltoid, Triceps (less) | Medium | Shoulder horizontal abduction (wide = slightly more adduction range) | Bar to chest, elbows flared ~75deg | Arms extended, shoulder-width apart | **High** | ① Grip 1.5-2x shoulder width; ② Elbows slightly flared for greater adduction arc; ③ Controlled 3-sec eccentric[^8] | Grip too narrow converts to close-grip press - shifts load to triceps, reduces pec stimulus ⚠️[^24] |
| **Barbell Floor Press** | Barbell | Pec Major (Sternal) | Triceps (dominant), Ant. Deltoid | Low | Floor blocks shoulder horizontal abduction at ~70deg[^22] | Elbows touch floor (~70deg horizontal abduction) | Arms locked overhead | **Low** | ① Used for strength/tricep work, not stretch-mediated hypertrophy; ② Keep scapula retracted; ③ Pause at bottom[^22] | ⚠️ Floor eliminates bottom ROM - nearly zero loaded stretch on pec; low SFR for pure hypertrophy |

***', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Flat Dumbbell Bench Press** | Dumbbell | Pec Major (Sternal) | Ant. Deltoid, Triceps | High | Shoulder horizontal abduction (DBs allow below chest level)[^8][^14] | DBs at or below rib cage level (~100-110deg horizontal abduction) | Arms fully extended, DBs above sternum | **High** | ① Allow DBs to travel outside shoulder width past rib cage; ② Retract scapula, chest up; ③ Controlled 3-sec descent to full stretch[^8][^14] | Dumbbells not allowed past rib cage - matches barbell ROM, wasting the key advantage ⚠️[^8] |
| **Incline Dumbbell Bench Press** | Dumbbell | Pec Major (Clavicular) | Ant. Deltoid, Triceps | High | Shoulder external rotation + horizontal abduction[^25][^26] | DBs below shoulder level, elbows slightly behind torso (30-45deg bench) | Arms extended above clavicular head | **High** | ① Bench 30-45deg; ② Lower until elbows are at or slightly below chest height; ③ Neutral or pronated grip[^25][^26] | Over-shortening the eccentric to match barbell depth - eliminates below-chest loaded stretch ⚠️[^22] |
| **Flat Dumbbell Fly** | Dumbbell | Pec Major (Sternal/Mid) | Biceps (stabilizer), Ant. Deltoid | High | Shoulder horizontal abduction - the most stretch-accessible chest exercise with free weights[^9][^5] | Arms abducted to ~160-170deg (elbows level or below bench, arms in a wide arc) | DBs meet over sternum, arms nearly straight | **High** | ① Slight elbow bend (~15-20deg) throughout; ② Pause 1-2 sec in deep stretch; ③ Arc motion - don''t press[^5][^14] | ⚠️ Arms allowed to drop straight = shoulder capsule stress and loss of pec tension; also: not going deep enough cuts the primary growth stimulus |
| **Incline Dumbbell Fly** | Dumbbell | Pec Major (Clavicular) | Ant. Deltoid, Biceps (stabilizer) | High | Shoulder horizontal abduction + external rotation[^26][^25] | Arms abducted and slightly below chest level (~30-45deg bench incline) | DBs meet over upper chest | **High** | ① Set bench 30-45deg; ② Lower in arc until elbows are at bench level or slightly below; ③ Think "hugging a barrel"[^26][^25] | Elbows not tracking at bench height - arms drop straight down, loading anterior capsule not pec fibers ⚠️[^26] |
| **Decline Dumbbell Fly** | Dumbbell | Pec Major (Costal/Lower Sternal) | Triceps (stabilizer), Ant. Deltoid | High | Shoulder horizontal abduction (decline reduces shoulder stress in bottom) | Arms in wide arc, elbows level with bench at ~15-30deg decline | DBs meet over lower chest | **Medium-High** | ① 15-30deg decline; ② Let arms travel wide for full costal head stretch; ③ Pause at deepest stretch[^23][^20] | Bench decline too steep (>30deg) shifts tension toward anterior delt; bottom position rushed ⚠️ |
| **Dumbbell Pullover** | Dumbbell | Pec Major (Costal/Sternal) + Lat | Lat, Serratus, Triceps (long head) | High | Shoulder flexion (overhead mobility required)[^15][^27] | DB behind head (shoulder at ~160-180deg flexion) | DB returned to over chest | **Medium** | ① Straight arms (slight bend only); ② Stretch arm only as far as shoulder flexion allows; ③ Lead with elbows back over chest[^15][^28] | ⚠️ Elbow flare biases lats over pec - keep slight elbow bend and focus on leading with pec; limited pec isolation makes SFR moderate[^22] |
| **Dumbbell Guillot...', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: Exercise Library - Cable Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Standing Cable Fly (Mid-Cable)** | Cable | Pec Major (Sternal/Mid) | Ant. Deltoid, Biceps (stabilizer) | High | Shoulder horizontal abduction - cable height determines bias[^29][^30] | Arms spread wide behind torso, cables at chest height (~110-120deg horizontal abduction) | Handles meet in front of sternum, arms nearly straight | **High (S-Tier)** | ① Cables at shoulder height for mid-pec; ② Lean forward 10-15deg; ③ Biceps touch pec at contraction - go past midline[^31][^29] | Standing too far from machine removes loaded stretch - cables go slack at start ⚠️[^29] |
| **Low-to-High Cable Fly** | Cable | Pec Major (Clavicular/Upper) | Ant. Deltoid | High | Shoulder horizontal abduction + upward shoulder flexion | Arms at hip height and wide (~120deg horizontal abduction), cables set at hip level | Handles meet above sternum at eye level | **High** | ① Cables at hip/lowest pulley; ② Arc upward from hip to eye level; ③ Keep elbows soft, scapula retracted[^29][^30] | Cables set too high biases ant. delt not upper pec; elbows dropping below wrists removes pec tension ⚠️[^31] |
| **High-to-Low Cable Fly** | Cable | Pec Major (Costal/Lower) | Triceps (stabilizer), Serratus | High | Shoulder horizontal adduction from abducted position (cable above head) | Arms above shoulder height, cables at top pulley (~130deg shoulder horiz. abd.) | Handles meet below sternum or cross midline | **High** | ① Cables above head; ② Arc downward from above shoulder to below sternum; ③ Arms soft-elbow throughout[^29][^30] | Pulling straight down converts to a tricep pushdown - maintain arc path, not vertical line ⚠️[^29] |
| **Seated Cable Fly (Incline Bench)** | Cable | Pec Major (Sternal/Mid) | Ant. Deltoid, Biceps (stabilizer) | High | Shoulder horizontal abduction - bench limits how far back arms travel but opens up constant tension[^32] | Arms spread to sides of bench, cables at shoulder height (~110deg horizontal abduction) | Handles meet in front of chest with arms nearly straight | **High (S-Tier)** | ① Half foam roller behind mid-back to enhance stretch; ② Cables at shoulder height; ③ Chest up throughout - no shoulder rolling forward[^32][^22] | Allowing shoulders to round forward at peak contraction = anterior delt dominates finish position ⚠️[^32] |
| **Cable Crossover (Cross-Body)** | Cable | Pec Major (Sternal + all heads) | Ant. Deltoid, Biceps | High | Shoulder horizontal abduction + full horizontal adduction past midline[^29][^24] | Arms spread wide in starting position (~120deg horizontal abduction) | Handles crossed past midline, biceps touching chest | **High** | ① One foot forward (staggered stance); ② Cross hands past midline - bicep to opposite pec; ③ Squeeze shoulders down at peak[^29][^24] | Stopping at midline cuts the peak contraction - half the pec''s ROM is from midline to crossed position ⚠️[^31][^24] |
| **Cable Press (Flat / Standing)** | Cable | Pec Major (Sternal) | Triceps, Ant. Deltoid | Medium | Shoulder horizontal abduction - cable press limits eccentric depth vs. free weight | Arms pulled back to chest-level with cables (~90deg shoulder horiz. abd.) | Arms fully extended in front of chest | **Medium-High** | ① Lean into imaginary bench; ② Cables at chest height; ③ Push forw...', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Machine Chest Press (Converging)** | Machine | Pec Major (Sternal) | Triceps, Ant. Deltoid | Medium-High | Shoulder horizontal abduction - machine cam/path may limit full eccentric stretch[^18][^34] | Handles at chest level, elbows behind torso in machine groove (~100deg horiz. abd.) | Arms fully extended, handles meet in converging arc | **High (S-Tier)** | ① Adjust seat so handles align with mid-chest; ② Full eccentric - elbows behind torso; ③ Descending resistance machines preferred[^10][^18][^22] | Seat too high forces shoulder into impingement at bottom; not reaching full eccentric depth removes loaded stretch ⚠️[^18] |
| **Pec Deck / Machine Fly** | Machine | Pec Major (Sternal/Mid) | Ant. Deltoid (minimal), Biceps (minimal) | High | Shoulder horizontal abduction - machine guides full arc; internal shoulder rotation can limit start[^35][^36] | Pads/handles at or behind torso (~110-120deg horizontal abduction) | Pads/handles together at midline or past | **High (S-Tier)** | ① Seat height: handles at chest level; ② Full ROM - let arms travel as far back as machine allows; ③ Pause 1 sec in stretched position[^35][^36][^37] | Seat too low shifts stress to upper traps; not completing full arc cuts bottom-end loaded stretch ⚠️[^36] |
| **Incline Machine Chest Press** | Machine | Pec Major (Clavicular) | Ant. Deltoid, Triceps | Medium-High | Shoulder external rotation + horizontal abduction (machine-guided)[^19][^20] | Handles at upper-chest height with elbows behind torso at ~30-45deg incline | Arms extended on incline path | **High** | ① Adjust incline to 30-45deg; ② Full eccentric to elbows behind torso; ③ Drive handles up and together[^20][^38] | Partial eccentric to avoid shoulder discomfort - removes entire loaded-stretch benefit ⚠️[^6] |
| **Smith Machine Bench Press (Flat)** | Machine | Pec Major (Sternal) | Triceps, Ant. Deltoid | Medium | Shoulder horizontal abduction - fixed bar path restricts natural arc[^34][^39] | Bar to chest (~90-100deg horiz. abd.) - less natural than free barbell | Arms extended, bar locked in Smith path | **High** | ① Adjust foot placement to alter bar path; ② Touch chest with controlled eccentric; ③ Scapula retracted throughout[^34][^39] | Fixed bar path may require foot/stance adjustments - failure to do so creates shoulder impingement at bottom ⚠️[^34] |
| **Smith Machine Incline Press** | Machine | Pec Major (Clavicular) | Ant. Deltoid, Triceps | Medium | Fixed bar path + shoulder external rotation[^23][^22] | Bar to upper chest at 30-45deg incline | Arms extended on incline Smith path | **High** | ① Same adjustments as flat Smith; ② Position bench so bar path aligns with upper chest; ③ Full eccentric to bar on chest[^23][^22] | Bench angle misaligned with Smith bar path creates shoulder shear - always set up alignment before loading ⚠️ |
| **Cable Press-Around Machine** | Machine | Pec Major (Sternal + all fibers) | Serratus, Ant. Deltoid | High | Shoulder horizontal adduction - requires moving through full crossbody arc[^40][^22] | Arms wide in start position (~120deg horizontal abduction) | Arms adducted past midline and "wrapped around" body | **High (A-Tier)** | ① Unique arc targets fibers missed by standard press path; ② Keep arms soft-be...', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: Exercise Library - Bodyweight Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Standard Push-Up** | Bodyweight | Pec Major (Sternal) | Ant. Deltoid, Triceps, Serratus | Medium | Floor limits shoulder horizontal abduction - chest hits floor[^5][^14] | Chest to floor (elbows at ~90deg, ~100deg horizontal abduction) | Arms fully extended | **Medium (C-Tier)** | ① Hands slightly wider than shoulder-width; ② Full chest-to-floor contact; ③ Elbows at 45deg (not 90deg)[^5][^14] | Partial ROM - stopping before chest reaches floor eliminates the only loaded stretch available ⚠️[^14] |
| **Deficit Push-Up** | Bodyweight + Handles/Plates | Pec Major (Sternal) | Ant. Deltoid, Triceps, Serratus | High | Shoulder horizontal abduction - handles allow below-floor depth, the key upgrade[^5][^14] | Chest drops below hand level (~110-120deg horizontal abduction) | Arms fully extended | **Medium-High** | ① Use push-up handles, plates, or parallettes; ② Drop chest 3-4 inches below handle height; ③ Pause 1 sec at deepest stretch[^5][^14] | Not going low enough negates the entire advantage over standard push-up ⚠️[^5] |
| **Weighted Push-Up** | Bodyweight + Weight Plate | Pec Major (Sternal) | Ant. Deltoid, Triceps, Serratus | Medium | Same as standard push-up - floor still limits depth[^14][^22] | Chest to floor with added load | Arms extended, additional load on back | **Medium** | ① Plate centered on T-spine; ② Partner places/removes weight; ③ Same cues as standard push-up[^14][^22] | ⚠️ Weight without increased depth only adds load - does not improve stretch position; combine with deficit for best SFR |
| **Chest Dip (Forward Lean)** | Parallel Bars | Pec Major (Costal/Lower Sternal) | Triceps, Ant. Deltoid | High | Shoulder flexion - dip depth limited by shoulder mobility[^41][^17][^14] | Full depth with 15-20deg forward lean, elbows at ~100deg (~120deg shoulder flexion) | Arms locked, slight forward lean maintained | **High (A-Tier)** | ① Lean torso forward 15-20deg; ② Elbows flare slightly outward; ③ Lower until shoulders are at or below elbow height[^17][^14] | Upright torso = tricep dip not chest dip; ⚠️ not descending to full stretch point eliminates costal head loaded stretch[^41][^17] |
| **Banded Push-Up** | Resistance Band | Pec Major (Sternal) | Ant. Deltoid, Triceps | Medium | Floor still limits depth; band adds resistance in lengthened position if anchored correctly[^22] | Chest to floor with band-added tension at bottom | Arms extended, band provides accommodating resistance | **Medium (B-Tier)** | ① Band across upper back anchored to hands; ② Max tension at chest-floor contact; ③ Explosive concentric[^22] | Band providing most resistance at top (contracted position) - defeats stretch-emphasis; anchor for bottom-end loading ⚠️[^22] |

***', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: SFR Quick Reference - Exercises Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best Bang for Buck** | Machine Chest Press (Converging) | High | Loaded stretch + easy overload + constant tension[^22] |
| **S** | Seated Cable Fly (Incline Bench) | High | Deep pec stretch with constant cable tension[^32][^22] |
| **S** | Pec Deck Machine Fly | High | Maximum horizontal adduction arc under load[^35][^37] |
| **A - Excellent** | Flat Dumbbell Bench Press | High | Below-rib-cage loaded stretch advantage[^8][^14] |
| **A** | Incline Dumbbell Bench Press | High | Clavicular head + deep DB stretch[^25][^22] |
| **A** | Flat Dumbbell Fly | High | Maximum eccentric stretch for sternal pec[^9][^5] |
| **A** | Incline Dumbbell Fly | High | Clavicular head isolation with deep stretch[^26][^25] |
| **A** | Chest Dip (Weighted, Forward Lean) | High | Costal head, maximal loaded stretch, compound[^17][^14] |
| **A** | Standing Cable Fly (Mid) | High | Constant tension + deep stretch + crossbody adduction[^29][^22] |
| **A** | Cable Crossover (Cross-Body) | High | Full ROM including terminal adduction past midline[^29][^24] |
| **A** | Barbell Bench Press (Wide) | High | High load + full ROM compound movement[^8][^42] |
| **A** | Incline Barbell Bench Press | High | Clavicular head + heavy load potential[^19][^20] |
| **A** | Low-to-High Cable Fly | High | Upper pec bias with constant tension[^29][^30] |
| **A** | High-to-Low Cable Fly | High | Lower/costal pec bias with constant tension[^29][^30] |
| **B - Good** | Incline Machine Chest Press | High | Guided groove for clavicular head work[^20][^38] |
| **B** | Smith Machine Bench Press | High | Stability advantage; good hypertrophy tool[^34][^22] |
| **B** | Deficit Push-Up | Medium-High | Enhanced stretch vs. floor push-up[^5][^14] |
| **B** | Decline Dumbbell Fly | Medium-High | Costal head isolation[^23][^20] |
| **B** | Cable Press-Around | High | Unique fiber recruitment through terminal adduction[^40][^22] |
| **C - Moderate** | Decline Barbell Bench Press | Medium | Lower chest with reduced ROM vs. DB variant[^20][^22] |
| **C** | Dumbbell Pullover | Medium | Overhead costal stretch but poor pec isolation[^15][^22] |
| **C** | Assisted Dip Machine | Medium-High | Lower chest access without dip skill barrier[^41][^17] |
| **C** | Standard Push-Up | Medium | Floor limits stretch; easy to scale volume[^5][^14] |
| **D - Limited** | Barbell Floor Press | Low | No loaded stretch; strength/tricep tool only[^22] |
| **D** | Weighted Push-Up (no deficit) | Medium | Load without depth improvement ⚠️[^14][^22] |

***', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: Key Science Notes', '**Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus (not just injury risk):**[^5][^6]

- ⚠️ **Barbell Bench Press (bounce/short ROM):** Removing bottom 20deg cuts the loaded stretch - the region with highest mechanical tension and mTOR signaling[^7][^8]
- ⚠️ **Pec Deck / Cable Fly (half-arc):** Stopping before full horizontal abduction (arms behind body plane) eliminates the peak stretch stimulus; studies show bottom-position partials produce ~3x more hypertrophy than top-position partials[^5]
- ⚠️ **Dip (upright torso):** Removes costal head from the movement entirely; forward lean is non-negotiable for chest stimulus[^41][^17]
- ⚠️ **Cable Crossover (stop at midline):** The terminal adduction phase (midline → opposite shoulder) is where the pec reaches peak contraction - truncating this halves the contraction ROM[^29][^24]
- ⚠️ **Incline Press > 45deg:** Shifts from clavicular head to anterior deltoid; reduces pec stimulus by an estimated 40-60%[^19][^21]

**Lengthened Partials Application:** For all high-SFR exercises, after full-ROM failure, finish with bottom-half partials (lengthened partials) - evidence supports superior hypertrophy from lengthened vs. shortened partial sets.[^43][^1][^6][^5]

---', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Chest Exercise Library: References', '1. [Do Lengthened Partials Really Stimulate Stretch-Mediated ...](https://www.strongerbyscience.com/stretch-mediated-hypertrophy/) - This suggests that most of the hypertrophy observed was truly stretch-mediated, as even denervated m...

2. [Is stretch-mediated hypertrophy irrelevant for trained lifters ...](https://mennohenselmans.com/stretch-mediated-hypertrophy-relevance/) - Stretch-mediated hypertrophy is often defined as the additional muscle growth gained from training m...

3. [Stimulus to Fatigue Ratio: Definition and Examples](https://hevycoach.com/glossary/stimulus-fatigue/) - It refers to a specific exercise''s stimulative effect to drive adaptations (eg, muscle growth) versu...

4. [The Complete Hypertrophy Training Guide: Build Muscle Fast](https://rpstrength.com/blogs/articles/complete-hypertrophy-training-guide) - The SFR is a formal way of stating that the best growth comes from exercises that stimulate the most...

5. [Long-Muscle-Length Training (Aka Stretch-Mediated ...](https://outlift.com/long-muscle-length-training/) - Long-muscle-length training (often confused with stretch-mediated hypertrophy) is one of the most po...

6. [Optimizing Resistance Training Technique to Maximize ... - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10801605/) - This narrative review aims to synthesize existing evidence on what constitutes proper RT exercise te...

7. [Research shows that chest hypertrophy depends less on " ...](https://www.instagram.com/p/DPzqjgCkddG/) - Research shows that chest hypertrophy depends less on "how much" you press and more on where you loa...

8. [Complete Chest Training Guide](https://rpstrength.com/blogs/articles/chest-hypertrophy-training-tips) - When designing any week of chest training, make sure it includes horizontal pressing, incline pressi...

9. [Bench press vs. flys: which is better for the pecs? [Study ...](https://mennohenselmans.com/bench-press-vs-flys/) - First, using full ROM can stimulate more stretch-mediated hypertrophy. However, flys actually achiev...

10. [Arm path is the most important for biasing regions of the chest ...](https://www.instagram.com/reel/DO9eXx-jjow/?hl=en) - If you can find the angle between shoulder flexion and horizontal adduction, that will be the best w...

11. [Pectoralis major | Chris Beardsley](https://www.patreon.com/posts/pectoralis-major-61681802) - The pectoralis major is the main chest muscle with three main regions (clavicular, sternal, and cost...

12. [Optimizing Thoracic Spine Mobility with Corrective Exercise](https://blog.nasm.org/ces/optimizing-thoracic-spine-mobility-with-corrective-exercise) - We''ll investigate how to assess thoracic spine motion and cover a variety of modalities, such as SMR...

13. [How Can Limited Thoracic Mobility Affect My Low Back and ...](https://symmetryptmiami.com/how-can-limited-thoracic-mobility-affect-my-low-back-and-shoulder-pain/) - It may also lead to rotator cuff injuries. Decreased mobility in the thoracic segments causes the sh...

14. [The Best Chest Exercises for Building Muscle](https://bonytobeastly.com/best-chest-exercises/) - The three best chest exercises are the bench press, push-up, and dip. They work your pecs along with...

15. [Dumbbell pullover: For pecs or lats?](https://www.ironmaster.com/blog/2021/02/03/dumbbell-pullover-for-pecs-or-lats/) - I will now enumerate the steps in doing dumbbell pullovers for lat hypertrophy and strength: Hold th...

16. [STOP Doing Chest Flyes Like This (5 Mistakes S...', 'ROMRx Bodybuilding KB - Chest.md', ARRAY['bodybuilding','chest','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: Overview', '# ROMRxBB - Hamstrings & Glutes Exercise Library
### Stretch-Mediated Hypertrophy Edition | Biceps Femoris (Long/Short Head), Semitendinosus, Semimembranosus, Gluteus Maximus, Gluteus Medius, Gluteus Minimus

> **Science Basis:** The posterior chain requires a split programming approach because hamstrings and glutes have fundamentally different ROM requirements and respond to different loading patterns. **Hamstrings are bi-articular** - they cross both the hip and knee - meaning full hamstring length requires *simultaneous hip flexion AND knee extension*. **Hip thrusts do not cause hamstring hypertrophy** per Plotkin et al. 2023. The seated leg curl produces **14.1% total hamstring hypertrophy vs. 9.3% for the prone leg curl** due to the lengthened hip position. For **glutes**, both hip thrusts and squats produce similar gluteus maximus hypertrophy, but the hip thrust produces ~75% more glute activation at matched loads. SFR ratings calibrated per Israetel''s framework and Nippard''s 2025 glute tier list. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3][^4][^5][^6][^7][^8]

***', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: ROM Hierarchy for Hamstrings & Glutes - Top 5 Limiters', 'Ranked by severity of impact on **hypertrophic stimulus** (not just injury risk):

| Rank | ROM Limiter | Joint / Movement | Muscle Affected | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------|----------------------|------------------------|
| **1** | **Hamstring Flexibility (Hip Flexion at Extended Knee)** | Coxofemoral joint + knee | Biceps Femoris Long Head, Semitendinosus, Semimembranosus | **Critical** - tight hamstrings directly cap how far the hip can hinge with a neutral spine; every inch of lost RDL depth is a direct reduction in the lengthened loaded stretch for the bi-articular hamstrings[^9][^10] | RDL, Stiff-Leg Deadlift, Good Morning, Nordic Curl, 45deg Back Extension |
| **2** | **Hip Flexion (Seated / Hip-Flexed Knee Curl Position)** | Coxofemoral joint | Biceps Femoris Long Head, Semitendinosus, Semimembranosus | **Critical** - hip flexion during knee curls places the bi-articular hamstrings at their longest position; seated (hip-flexed) leg curls produce **14.1% vs. 9.3% total hamstring hypertrophy** compared to prone (hip-extended) variants[^11][^4][^5] | Seated Leg Curl, Nordic Curl |
| **3** | **Hip Extension ROM (Glute-Specific)** | Coxofemoral joint | Gluteus Maximus, Gluteus Medius | **High** - the glute is lengthened at deep hip flexion (bottom of squat or lunge) and contracted at full hip extension; limited hip extension from hip flexor tightness prevents full glute contraction in hip thrusts and reduces the pelvic tilt range needed for deep glute stretch in squats/lunges[^2][^12] | Hip Thrust, Barbell Squat, Bulgarian Split Squat, Cable Kickback |
| **4** | **Knee Flexion Depth** | Tibiofemoral joint | Hamstrings (knee-flexion component), Gastrocnemius | **Medium-High** - limits the peak contraction range of all knee-flexion-based hamstring exercises; inadequate knee flexion prevents the hamstring from reaching full contractile ROM in leg curls[^1][^13] | Leg Curl (all variants), Nordic Curl, GHD Curl |
| **5** | **Anterior Pelvic Tilt / Lumbar Neutral Spine** | Lumbar spine + pelvis | Gluteus Maximus (stretch position), Hamstrings | **Medium** - posterior pelvic tilt under load (butt wink, lumbar rounding on RDL) both signals the end of productive range AND shifts load to spinal erectors, actively reducing the hamstring/glute stimulus[^9][^10] | RDL, Stiff-Leg Deadlift, Good Morning, Bulgarian Split Squat |

***', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: Exercise Library', '### Barbell Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Romanian Deadlift (RDL)** | Barbell | Biceps Femoris LH, Semitendinosus, Semimembranosus, Glute Max | Spinal Erectors, Adductor Magnus | High | Hamstring flexibility + neutral lumbar spine[^9][^10] | Hips fully hinged, bar at mid-shin, neutral spine - hamstring stretched from hip to knee | Standing lockout, full hip extension, glutes contracted | **High (A-Tier)** | ① Push hips back - not down; ② Bar traces down thighs to mid-shin; ③ Stop at the point of lumbar rounding - that IS your ROM[^9][^10] | ⚠️ Lumbar rounds before reaching full hamstring stretch - signals hamstring flexibility is the ROM limiter; depth is capped, not chosen; increases with consistent hamstring stretching[^9] |
| **Stiff-Leg Deadlift (SLDL)** | Barbell | Biceps Femoris LH, Semitendinosus, Semimembranosus | Spinal Erectors, Glute Max | High | Hamstring flexibility - stricter knee position than RDL increases hamstring demand[^1][^10] | Bar to floor (for flexible lifters), hips fully hinged, knees nearly locked | Standing lockout, full hip extension | **High (A-Tier)** | ① Less knee bend than RDL (stiffer = more hamstring demand); ② Full descent to floor if flexibility allows; ③ Same lumbar cue as RDL[^1][^10] | ⚠️ Same lumbar compensation as RDL but more acute - stiffer knee magnifies the impact of limited hamstring flexibility on depth[^10] |
| **Barbell Good Morning** | Barbell | Biceps Femoris LH, Semitendinosus, Spinal Erectors | Glute Max, Adductor Magnus | High | Hamstring flexibility + thoracic extension; bar on back increases torque at hip compared to RDL[^1][^14] | Torso near parallel to floor, hips fully hinged, knees slightly bent | Upright, full hip extension | **Medium-High** | ① Bar on upper traps, not neck; ② Hip hinge to parallel (or hamstring ROM limit); ③ Brace hard - higher erector demand than RDL[^1][^14] | Excessive lumbar flexion due to tight hamstrings - higher injury risk than RDL at same depth; ROM strictly dictated by hamstring flexibility ⚠️[^14] |
| **Barbell Hip Thrust** | Barbell | Gluteus Maximus | Glute Med/Min, Hamstrings (minimal), Quads | Medium | Hip extension ROM + anterior pelvic tilt at top; bar weight limits loaded stretch depth[^2][^6][^8] | Hips dropped toward floor, ~90deg hip flexion (loaded stretch of glute max) | Full hip extension - hips parallel to floor, pelvis posteriorly tilted, glutes squeezed | **High (B-Tier per Nippard, but Strong Evidence for Glute Growth)** | ① Bench edge at upper back / shoulder blade level; ② Drive hips to full extension - PAUSE 1-2 sec at top; ③ Posterior pelvic tilt at peak - tuck pelvis under[^2][^6][^8] | ⚠️ Not achieving full hip extension / not posteriorly tilting pelvis at top - glute peak contraction requires pelvic control, not just hip height; also: sitting too far from bench removes the full range of hip flexion at bottom[^2][^8] |
| **Barbell Back Squat (Glute Focus)** | Barbell | Gluteus Maximus, Adductor Magnus | Vasti, Hamstrings (minimal), Spinal Erectors | High | Ankle dorsiflexion + knee flexion depth; deep squat required for glute stretch[^15][^6] | Hips well below parallel (120-140deg knee flexion) - maximum glute stretch at depth | Standing lockout, hips extended, glutes squeezed | **High (A-...', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Dumbbell RDL (Romanian Deadlift)** | Dumbbell | Biceps Femoris LH, Semitendinosus, Semimembranosus, Glute Max | Spinal Erectors, Adductor Magnus | High | Hamstring flexibility - same as barbell but lower spinal load allows focus on form[^9][^10] | Hips hinged, DBs at mid-shin - hamstrings at full length | Standing, full hip extension | **High (A-Tier)** | ① DBs can travel outside knee line → potential for slightly more ROM than barbell; ② Same lumbar neutral rule; ③ Single-arm variation (contralateral hold) improves anti-rotation and glute activation[^16][^10] | Same as barbell RDL: lumbar rounding before max hamstring stretch is reached ⚠️[^9][^10] |
| **Dumbbell Single-Leg RDL** | Dumbbell | Biceps Femoris LH, Semimembranosus, Glute Max (ipsilateral) | Glute Med, Core, Spinal Erectors | High | Hamstring flexibility + balance; single-leg stance significantly increases stability demand[^16][^10] | Standing leg hip hinge to horizontal or below, floating leg extends behind; full hamstring stretch | Standing upright, full single-leg hip extension | **High (A-Tier)** | ① Hold one DB in opposite hand of working leg (contralateral load) for superior hip stability[^16]; ② Hinge until torso is parallel or below; ③ Grip support with free hand to reduce balance demand if needed[^16][^10] | ⚠️ Balance demand shortens ROM - using a rack or wall for support specifically increases hamstring stretch depth and hypertrophy stimulus[^16] |
| **Dumbbell Hip Thrust (Single-Leg or Bilateral)** | Dumbbell | Gluteus Maximus | Glute Med/Min, Hamstrings (minimal) | Medium | Hip extension ROM + load limitation; DB on hip limits progression[^2][^3] | Hips at ~90deg flexion, shoulder on bench | Full hip extension, DB resting on hip crease | **Medium-High (Single-Leg: A-Tier per Nippard)** | ① Single-leg version: S-Tier per Nippard[^3]; ② Same pelvic tuck cue as barbell version; ③ 1-2 sec hold at top[^2][^3] | Not posteriorly tilting pelvis at top - glute peak contraction missed ⚠️[^2] |
| **Dumbbell Bulgarian Split Squat (Glute Focus)** | Dumbbell | Gluteus Maximus, Adductor Magnus | Vasti, Glute Med, Hip Flexors (stretch) | High | Hip flexion depth + hip flexor flexibility of rear leg; front foot elevation increases glute stretch[^2][^3][^17] | Front leg hip crease at or below knee, rear hip in full extension - glute max fully stretched at depth | Standing, front hip fully extended, hips through | **High (S-Tier for Glutes)** | ① Front foot elevation (4-6 inch) increases glute ROM further; ② Torso slightly forward increases glute bias vs. quad; ③ Descend until rear knee near floor[^2][^3][^17] | ⚠️ Stopping short of full depth - removes the loaded glute stretch that is the defining advantage of this exercise; short ROM converts this to a mid-range quad exercise[^2][^17] |
| **Dumbbell Walking Lunge** | Dumbbell | Gluteus Maximus, Vasti | Glute Med, Hamstrings, Adductors | High | Hip flexion depth + balance; stride length determines glute vs. quad emphasis[^2][^3] | Front knee ~90deg, back knee near floor, full glute max stretch | Full standing hip extension as striding forward | **High (S-Tier for Glutes per Nippard)** | ① Longer stride = more glute; ② Back knee must reach floor; ③ Torso upright (slight forwa...', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: Exercise Library - Cable Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Cable Kickback (Hip Extension)** | Cable | Gluteus Maximus | Glute Med (minor), Hamstrings (minor) | Medium-High | Hip extension ROM; cable height determines tension curve[^3][^19][^20] | Leg forward at hip-level (~90deg hip flexion), cable attached at ankle - glute at full stretch | Leg extended behind body, hip at full extension - 1-2 sec glute squeeze | **High (A-Tier)** | ① Lean torso 45-60deg forward (not upright) for consistent cable tension arc; ② Arc leg back-and-up (not pure kickback); ③ Squeeze glute at top - don''t hyperextend lumbar[^3][^19][^20] | ⚠️ Upright torso creates tension only at end-range; most of the ROM is unloaded; also: "kicking" vs. "swinging back in an arc" recruits quad instead of glute[^20] |
| **Cable Pull-Through (Hip Hinge)** | Cable | Gluteus Maximus, Biceps Femoris LH | Adductor Magnus, Spinal Erectors | High | Hamstring flexibility + hip hinge depth; cable at low pulley between legs[^2][^3] | Full hip hinge forward, arms reaching through legs, cable at low pulley - glute and hamstring at max stretch | Standing, full hip extension, glutes squeezed | **High (B-Tier)** | ① Stand far enough from cable for resistance at bottom of hinge; ② Hip hinge (not knee bend); ③ Drive hips forward, glutes contract at lockout[^2][^3] | Short hip hinge (torso doesn''t reach parallel) - removes glute/hamstring loaded stretch; converts to a mini hip extension ⚠️[^2] |
| **Cable Hip Abduction (Glute Med)** | Cable | Gluteus Medius, Gluteus Minimus | TFL, Glute Max (minor) | Medium | Hip abduction - limited by adductor flexibility and cable angle[^2][^3] | Working leg crossed in front of standing leg (~20deg hip adduction) - glute med fully stretched | Working leg raised to 45-60deg hip abduction - glute med fully contracted | **Medium-High (B-Tier per Nippard)** | ① Slight torso lean away from cable; ② Lead with heel abduction - not knee; ③ Controlled eccentric to adducted starting position[^2][^3] | Not reaching the adducted crossed-leg starting position - misses the loaded stretch for the glute med ⚠️[^3] |
| **Cable RDL (Low Pulley)** | Cable | Biceps Femoris LH, Semitendinosus, Glute Max | Spinal Erectors, Adductor Magnus | High | Hamstring flexibility - same hip hinge limitation as barbell; cable provides constant tension[^1][^9] | Full hip hinge, cable at low pulley - hamstrings at stretch; constant tension maintained | Standing, full hip extension | **High (A-Tier)** | ① Low pulley, bar or rope; ② Hip hinge identical to barbell RDL; ③ Constant tension is the unique advantage - maintain cable tension at top[^1][^9] | Hamstring flexibility limitation identical to barbell variant - ROM limited by neutral-spine threshold ⚠️[^9] |
| **Cable Standing Hip Extension (Glute Focused)** | Cable | Gluteus Maximus | Hamstrings (long head), Glute Med | Medium | Hip flexion at stretch (forward lean position) + hip extension range[^2][^19] | Leg at ~90deg hip flexion (thigh horizontal forward), cable at ankle - glute fully loaded in stretch | Leg extended behind at ~20-30deg hip hyperextension | **Medium-High** | ① Lean torso forward at 45deg for consistent cable tension; ② Straight leg extension (not bent knee kickback); ③ Glute squeeze + 1-sec hold at extension[^2][^19] | Bent ...', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Seated Leg Curl (Hip-Flexed)** | Machine | Biceps Femoris LH, Semitendinosus, Semimembranosus | Gastrocnemius (minor) | High | Knee flexion depth + hamstring flexibility; hip-flexed position is the KEY variable - lengthens bi-articular hamstrings at the hip[^11][^4][^5] | Knee at or near full extension (~0deg), hip at ~90deg flexion - hamstrings at full length; pad on distal shin | Knee fully flexed (~130deg+), hamstrings fully contracted | **High (S-Tier - Best Hamstring Exercise)** | ① Seat reclined to full back position (maximize hip flexion for RF + hamstring length); ② Lap pad tight on thighs; ③ Full ROM - knee to full extension at stretch, full flexion at contraction; slow 3-sec eccentric[^11][^13][^5] | ⚠️ Upright seated position (less hip flexion) reduces the lengthened hamstring stimulus - recline the backrest fully; also: not completing full knee extension at start removes the loaded stretch entirely[^4][^5] |
| **Prone Leg Curl (Hip-Extended)** | Machine | Biceps Femoris LH (short + long), Semitendinosus | Gastrocnemius, Sartorius | High | Knee flexion depth; hip-extended position shortens bi-articular hamstrings at hip - less stretch[^11][^21][^4] | Knee at full extension (~0deg), hip in neutral - less hamstring lengthening than seated | Knee at full flexion (~130deg+), heels near glutes | **Medium-High (B-Tier)** | ① Pad on distal shin; ② Full ROM - knee to full extension; ③ Slow eccentric; good second exercise after seated curl for contraction emphasis[^21][^13] | Partial knee flexion at peak - not fully flexing to full ROM; hip elevation off pad at top removes hamstring isolation ⚠️[^21] |
| **Machine Hip Thrust (Glute Drive / Nautilus)** | Machine | Gluteus Maximus | Glute Med/Min, Hamstrings (minimal) | Medium | Hip extension ROM - machine allows easier heavy overload than barbell version[^2][^3][^17] | Hips at ~90deg flexion, shoulders against pad | Full hip extension - 1-2 sec squeeze | **High (S-Tier per Nippard)** | ① Machine provides better load management than barbell version; ② Full hip extension + posterior pelvic tilt at top; ③ 1-2 sec glute squeeze[^2][^3][^17] | Not posteriorly tilting pelvis at top - glute contracts most when pelvis is tucked under, not when the hips are merely elevated ⚠️[^2] |
| **Machine Hip Abduction** | Machine | Gluteus Medius, Gluteus Minimus | TFL, Glute Max (upper) | Medium | Hip adduction at stretch position - machine travel determines ROM[^2][^3][^17] | Pads together (full hip adduction) - glute med at maximum stretch | Pads spread to maximum - glute med fully contracted | **High (S-Tier - Best Upper Glute Exercise per Nippard)** | ① Full adduction at start (pads touching) for loaded stretch; ② Slow eccentric back to pads-together position; ③ Upright torso isolates glute med[^2][^3][^17] | Starting from a partially abducted position - removes the loaded stretch entirely and trains only through the contracted portion of the ROM ⚠️[^3] |
| **45deg Back Extension (Glute/Hamstring Bias)** | Machine | Gluteus Maximus, Biceps Femoris LH | Spinal Erectors, Semimembranosus | High | Hip flexion depth - pad height determines which muscles are emphasized[^22][^23][^24][^25] | Torso perpendicular to floor (full hip flexion); pad at upper ...', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: Exercise Library - Bodyweight Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Nordic Hamstring Curl** | Bodyweight | Biceps Femoris LH, Semitendinosus | Semimembranosus, Gastrocnemius, Glutes (stabilizer) | High | Knee flexion through full ROM - bodyweight provides massive eccentric load at the lengthened position[^26][^27][^28] | Knees at full extension (body leaning far forward, horizontal or below) - hamstrings at maximum eccentric stretch | Upright kneeling, knees fully flexed | **High (A-Tier for Biceps Femoris LH)** | ① Eccentric-only first (lower to floor, stand up); ② Hips stay extended throughout - no hip flexion; ③ Progress to full concentric only after ~8 reps of full eccentric[^26][^27][^28] | ⚠️ Hips flexing during the descent - unloads the bi-articular hamstrings at the hip; the hips must stay fully extended to maintain full hamstring length during the eccentric[^1][^27] |
| **Glute Bridge (Bodyweight)** | Bodyweight | Gluteus Maximus | Glute Med/Min, Hamstrings, Erectors | Medium | Hip extension ROM - no external load limits hypertrophy potential significantly[^2][^3] | Hips at floor, ~90deg hip flexion | Hips extended, pelvis posteriorly tilted, glutes contracted | **Low-Medium (C-Tier)** | ① Same glute cues as hip thrust; ② Posterior pelvic tilt at top; ③ Progress to loaded barbell hip thrust when bodyweight becomes easy[^2][^3] | Hyperextending lumbar at the top instead of posteriorly tilting pelvis - removes peak glute contraction ⚠️[^2] |
| **Bodyweight Bulgarian Split Squat** | Bodyweight | Gluteus Maximus, Vasti | Glute Med, Hip Flexors | High | Hip flexion depth - same ROM as loaded version but without external load[^2][^3] | Same as dumbbell version - front leg deep, rear hip near full extension | Front leg standing, full hip extension | **Medium** | ① Front-foot elevation if available; ② Full depth - rear knee grazes floor; ③ Good warm-up/technique primer before loaded version[^2] | Same depth error as loaded version ⚠️[^2] |
| **Donkey Kick (Hip Extension)** | Bodyweight | Gluteus Maximus | Glute Med (minor), Hamstrings (minor) | Medium | Hip extension range - very limited load capacity; ROM is decent but overload is the primary issue[^3] | Leg forward at 90deg hip flexion | Leg extended behind at hip extension | **Low (D-Tier per Nippard)** | ① Bend knee 90deg and kick heel toward ceiling; ② Glute contraction at top; ③ Better replaced by cable kickback for any load[^3] | ⚠️ No meaningful load = poor hypertrophy stimulus regardless of ROM quality; upgrade to cable version immediately[^3] |

***', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: SFR Quick Reference - Hamstrings & Glutes Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | Muscle | SFR | Key Strength |
|---|---|---|---|---|
| **S - Best Exercise** | Seated Leg Curl (Reclined) | Hamstrings | High | Lengthened position at BOTH joints (hip flexed + knee extended start)[^11][^4][^5] |
| **S** | Machine Hip Thrust (Glute Drive) | Glute Max | High | Best glute isolation machine; easy heavy overload[^2][^3] |
| **S** | Machine Hip Abduction | Glute Med | High | Best upper glute exercise; loaded stretch to full adduction[^2][^3][^17] |
| **S** | 45deg Back Extension (Loaded) | Glute Max + Ham | High | Full hip hinge ROM + loaded glute-hamstring stretch[^17][^23][^24] |
| **S** | Smith Machine Lunge (Front-Foot Elevated) | Glute Max | High | Front-foot elevation creates deepest glute loaded stretch in any lunge[^3][^17] |
| **A - Excellent** | Romanian Deadlift (Barbell) | Hamstrings + Glute Max | High | Heavy loaded hamstring/glute stretch; foundational compound[^9][^10] |
| **A** | Nordic Hamstring Curl | Biceps Femoris LH | High | Massive bi-articular eccentric overload in lengthened position[^26][^27][^28] |
| **A** | GHD Hip Extension | Glute Max + Hamstrings | High | Deepest loaded hip hinge position available[^1][^22] |
| **A** | Dumbbell Bulgarian Split Squat | Glute Max | High | Deep glute stretch + unilateral ROM freedom[^2][^3][^17] |
| **A** | Dumbbell Walking Lunge | Glute Max | High | S-Tier per Nippard - full stride/depth requirement[^3] |
| **A** | Dumbbell Step-Up | Glute Max | High | Highest glute EMG activation in research[^2][^18] |
| **A** | Dumbbell Single-Leg RDL | Hamstrings + Glute Max | High | Full uni hamstring/glute stretch; contralateral load advantage[^16][^10] |
| **A** | GHD Hamstring Curl | All Hamstrings | High | Simultaneous hip hinge + knee flexion - unique dual-joint loading[^1][^14] |
| **A** | Cable Kickback | Glute Max | High | Full hip extension arc under constant cable tension[^3][^19][^20] |
| **A** | Single-Leg DB Hip Thrust | Glute Max | High | S-Tier per Nippard for glute isolation[^3] |
| **B - Good** | Prone Leg Curl | Hamstrings | Medium-High | Good secondary curl; lower stretch than seated[^11][^21][^4] |
| **B** | Barbell Hip Thrust | Glute Max | High | Study-proven +9.3% glute growth add-on to compound programs[^18][^6] |
| **B** | Barbell Back Squat (Glute focus) | Glute Max | High | Compound; similar glute growth to hip thrust at depth[^6][^7] |
| **B** | Cable Pull-Through | Glute Max + Hamstrings | High | Hip hinge pattern; good teaching tool for posterior chain[^2][^3] |
| **C - Moderate** | Sumo Deadlift | Glute Max + Adductors | Medium-High | Good glute/adductor builder; limited by adductor flexibility[^1][^3] |
| **C** | Dumbbell Hip Thrust (Bilateral) | Glute Max | Medium | Load limitation reduces SFR vs. machine/barbell[^2][^3] |
| **C** | Glute Bridge (Bodyweight) | Glute Max | Low-Medium | No load ceiling; better replaced by any loaded variant[^2][^3] |
| **D - Limited** | Donkey Kick | Glute Max | Low | No overload potential; replace with cable kickback[^3] |

***', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: Key Science Notes', '**Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus (not just injury risk):**[^2][^4][^1]

- ⚠️ **Seated Leg Curl (Upright Position):** The seated leg curl''s entire hypertrophy advantage over the prone variant comes from the hip-flexed position lengthening the bi-articular hamstrings; reclining the backrest is NOT optional - it is the mechanism. Upright seated position negates ~30% of the lengthened-position advantage[^11][^4][^5]
- ⚠️ **RDL Depth Limited by Hamstring Flexibility:** Unlike most exercises where partial ROM is a technique error, the RDL''s productive ROM is *mechanically capped* by hamstring flexibility. Forcing depth beyond neutral spine actively reduces stimulus and increases injury risk. The prescription is: improve hamstring flexibility over time to progressively increase ROM[^9][^10]
- ⚠️ **Hip Thrust Not Reaching Full Hip Extension + Posterior Pelvic Tilt:** Simply raising the hips parallel to the floor is not peak contraction for the glute max; the pelvis must also *posteriorly tilt* (tucked under) at the top to fully shorten the muscle. Missing this position reduces peak contraction quality significantly[^8][^2]
- ⚠️ **Nordic Hamstring Curl with Hip Flexion:** Any hip flexion during the Nordic descent immediately shortens the bi-articular hamstrings at the hip - directly reducing the eccentric lengthened stimulus that makes this exercise uniquely effective[^27][^1]
- ⚠️ **Hip Thrusts for Hamstrings:** Research definitively shows hip thrusts (and squats, lunges, leg press) produce **no meaningful hamstring hypertrophy**. Hamstring programs relying solely on hip hinge/thrust patterns systematically undertrain the hamstrings. Dedicated knee-flexion exercises (seated leg curl, Nordic, GHD curl) are non-negotiable for hamstring development[^14][^1]

**The Central Programming Insight:** Complete posterior chain development requires four exercise categories, each targeting a distinct ROM profile:[^29][^1][^2]
1. **Hip hinge / lengthened hamstring work** - RDL, good morning, SLDL (hamstrings at full hip flexion + extended knee)
2. **Hip-flexed knee curl work** - Seated leg curl, Nordic (hamstrings at both joints under load)
3. **Hip extension / glute max work** - Hip thrust, machine hip thrust, 45deg back extension (glute from full stretch to full contraction)
4. **Abduction / upper glute work** - Machine hip abduction, cable hip abduction (glute med/min isolation)

---', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Hamstrings & Glutes Exercise Library: References', '1. [How To Grow Your Hamstrings](https://e3rehab.com/how-to-grow-your-hamstrings/) - Maximizing the growth and strength of the hamstrings requires a combination of hip extension and kne...

2. [Complete Glute Training Guide](https://rpstrength.com/blogs/articles/glute-hypertrophy-training-tips) - Build strong, powerful glutes with this comprehensive, science-based training guide from Dr. Mike Is...

3. [Jeff Nippard Ranks 25 Glute Exercises From Best To Worst](https://generationiron.com/jeff-nippard-25-glute-exercises-best-worst/) - B-Tier Exercises · Barbell Hip Thrust · Glute Bridge · Cable Hip Abduction · Curtsy Lunge · Deadlift...

4. [Hypertrophy and hamstring protection: seated vs prone leg ...](https://sci-sport.com/en/hypertrophy-and-hamstring-protection-seated-prone-leg-curl/) - After the first phase of the protocol, total hamstring hypertrophy increased by 14.1% for the seated...

5. [Lying Leg Curls vs Seated Leg Curls](https://www.fitnesssimplified.org/training/seated-versus-lying-leg-curls) - Seated leg curls train your hamstrings in a more stretched position than lying leg curls · Seated le...

6. [Hip thrust and back squat training elicit similar gluteus muscle ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC10349977/) - We examined how set-volume equated resistance training using either the back squat (SQ) or hip thrus...

7. [Hip thrust and back squat training elicit similar gluteus ...](https://mennohenselmans.com/new-study-hip-thrust-and-back-squat-training-elicit-similar-gluteus-muscle-hypertrophy-and-transfer-similarly-to-the-deadlift/) - In our new study, we compared how effective squats and hip thrusts are to stimulate lower body growt...

8. [Hip Thrust vs. Squat: The EMG Research That Changed ...](https://inara.technology/blog/hip-thrust-vs-squat-emg) - The hip thrust produces approximately 75% more gluteus maximus activation than the squat at matched ...

9. [Romanian Deadlift Limited by Flexibility: Complete Fix](https://simplmobility.com/blog/romanian-deadlift-limited-by-flexibility) - As you hinge forward, your hamstrings lengthen progressively. The straighter your knees stay, the mo...

10. [Romanian deadlift](https://www.physio-pedia.com/Romanian_deadlift) - The deadlift is a strengthening exercise where a loaded barbell is lifted off the ground from a stab...

11. [Greater Hamstrings Muscle Hypertrophy but Similar Damage ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC7969179/) - Hamstrings muscle size can be more effectively increased by seated than prone leg curl training, sug...

12. [The impact of resistance training on gluteus maximus ...](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1542334/full) - This systematic review aims to examine and synthesize the existing literature regarding gluteus maxi...

13. [Prone Leg Curl vs. Seated Leg Curl: Which Is Better for ...](https://www.ritfitsports.com/blogs/article/prone-leg-curl-vs-seated-leg-curl-which-is-better) - The seated leg curl is usually the better first choice for hamstring growth because it trains the ha...

14. [Exercise selection for the hamstrings: a guide](https://www.strongerbyscience.com/exercise-selection-hamstrings/) - Among curl options, the seated leg curl seems most effective overall, with lying curls and Nordics o...

15. [Best Glute Max Exercises According to the Research](https://rise-rsp.com/best-glute-max-exercises-according-to-the-research/) - The BHT appears to be the easiest GMax exercise to increas...', 'ROMRx Bodybuilding KB - HamstringsGlutes.md', ARRAY['bodybuilding','hamstringsglutes','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: Overview', '# ROMRxBB - Shoulders Exercise Library
### Stretch-Mediated Hypertrophy Edition | Anterior Deltoid, Medial Deltoid, Posterior Deltoid

> **Science Basis:** This library applies long-muscle-length (LML) hypertrophy principles per Milo Wolf, Mike Israetel (RP Strength), and Jeff Nippard. The deltoid''s three heads have distinct fiber origins, moment arms, and ROM requirements - meaning training all three heads requires completely different loading angles and stretch positions. For medial (lateral) delts specifically, the most undertrained position is the *arm-at-side (adducted) stretched position*, which is largely ignored by traditional overhead pressing and only emphasized by arm-behind-body cable lateral raise variations. SFR ratings calibrated per Israetel''s framework and Nippard''s 2024 shoulder tier list. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3][^4][^5][^6][^7]

***', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]);

INSERT INTO public.rombot_knowledge (sport, topic, chunk, source_citation, tags) VALUES
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: ROM Hierarchy for Shoulders - Top 5 Limiters', 'Ranked by how severely the limitation restricts **hypertrophic stimulus** (not just injury risk):[^8][^5][^7]

| Rank | ROM Limiter | Joint / Movement | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------------|------------------------|
| **1** | **Shoulder Adduction (Arm-to-Side Range)** | Glenohumeral joint | **Critical** - the medial delt reaches its fully lengthened position only when the arm is *below* the body in the adducted position; standard lateral raises do not reach this stretch unless using cables set at a raised height or side-lying variations[^1][^6][^9] | Lateral Raise (all), Cable Lateral Raise, Side-Lying Lateral Raise |
| **2** | **Shoulder External Rotation** | Glenohumeral joint | **High** - limits the overhead press bottom position depth and the arm path during Arnold press rotation; restricted ER prevents the deltoid from being fully lengthened in the frontal/sagittal plane at the bottom of pressing exercises[^10][^11][^12] | Overhead Press, Arnold Press, Dumbbell Press |
| **3** | **Shoulder Horizontal Abduction** | Glenohumeral joint | **High** - restricts how far the arm can travel *behind* the body on rear delt flys and reverse crossovers; limits the loaded stretch on posterior deltoid isolation exercises[^13][^14][^15] | Rear Delt Fly, Reverse Cable Crossover, Reverse Pec Deck |
| **4** | **Shoulder Internal Rotation** | Glenohumeral joint | **Medium** - upright rows and behind-neck pressing require internal rotation at high abduction angles; limitation creates impingement risk and truncated ROM at the medial delt peak[^16][^17][^18] | Upright Row, Behind-Neck Press, Wide-Grip Cable Upright Row |
| **5** | **Thoracic Extension** | T-spine (T4-T8) | **Medium** - limits the ability to "chest up" and pack the scapulae at the start of pressing movements; a flat/kyphotic T-spine shortens the front delt''s effective pressing ROM and reduces overhead lockout depth[^19][^20] | Overhead Barbell Press, Seated Machine Press, Arnold Press |

***', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: Exercise Library', '### Barbell Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Barbell Overhead Press (Standing)** | Barbell | Anterior Deltoid, Medial Deltoid | Triceps, Upper Trap, Serratus | High | Shoulder external rotation + thoracic extension at bottom[^19][^20] | Bar at upper chest, elbows slightly forward, ~90deg shoulder flexion/abduction | Arms fully locked overhead, elbows at ears | **High (A-Tier)** | ① Bar path: slight arc - over face at top, clavicle at bottom; ② Elbows slightly forward (not flared) at bottom; ③ Full lockout overhead[^19][^20] | Elbows flared excessively at bottom removes anterior delt stretch and impinges shoulder; partial ROM overhead eliminates lockout ⚠️[^20] |
| **Seated Barbell Overhead Press** | Barbell | Anterior Deltoid, Medial Deltoid | Triceps, Upper Trap | High | Shoulder external rotation; seated removes hip drive, increasing shoulder demand[^7][^11] | Bar lowered to upper chest, elbows at ~90deg shoulder abduction | Arms fully locked overhead | **High (A-Tier)** | ① Touch upper chest every rep; ② Slight arch in mid-back, glutes and upper back on pad; ③ Drive elbows forward to keep shoulder safe at bottom[^7][^11] | ⚠️ Bar not lowered to chest - partial press from forehead removes the lengthened position and reduces anterior delt stimulus by ~30-40%[^11] |
| **Behind-the-Neck Barbell Press** | Barbell | Medial Deltoid, Posterior Deltoid, Anterior Deltoid | Triceps, Upper Trap | High | Shoulder external rotation + horizontal abduction (requires high shoulder mobility)[^21][^22] | Bar behind neck at ear level, elbows flared wide; shoulder in externally rotated, abducted position | Arms fully locked overhead | **High (shoulder mobile athletes only)** | ① Requires strong shoulder ER mobility pre-requisite; ② Wide grip (~1.5x shoulder width); ③ Control eccentric - don''t drop bar to neck[^21][^22] | ⚠️ Performing with insufficient shoulder ER mobility - forces internal rotation at impingement angles (70-120deg abduction) and truncates ROM[^18][^22] |
| **Barbell Upright Row (Wide Grip)** | Barbell | Medial Deltoid, Upper Trap | Biceps, Anterior Delt, Supraspinatus | Medium | Shoulder internal rotation + abduction; elbows capped at shoulder height to avoid impingement zone[^16][^17] | Arms at sides, barbell at hip level | Elbows at shoulder height (~90deg abduction) - do NOT go higher | **Medium** | ① Wide grip (~1.5x shoulder width); ② Pull elbows *out and up* - not straight up; ③ Stop when elbows reach shoulder height[^17] | ⚠️ Pulling above 90deg shoulder abduction enters impingement zone (70-120deg) and reduces productive ROM - loads shift to trap not delt[^17] |
| **Barbell High Pull (Hang)** | Barbell | Posterior Deltoid, Upper Trap, Medial Delt | Biceps, Erectors, Rhomboids | High | Hip hinge + shoulder horizontal abduction + elbow flexion - explosive multi-joint ROM[^23][^24] | Hip hinge, bar at hip level; full hip/shoulder flexion at stretch | Bar at chest height, elbows flared, full hip extension | **Medium** | ① Explosive hip drive initiates pull; ② Elbows travel wide and high; ③ Rear delt bias achieved by keeping elbows above bar[^23][^24] | Converting to a trap-dominant shrug vs. a shoulder-dominant high pull - elbows not leading the bar upward ⚠️[^23] |

***', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Seated Dumbbell Overhead Press** | Dumbbell | Anterior Deltoid, Medial Deltoid | Triceps, Upper Trap | High | Shoulder external rotation at bottom; DBs allow wider path than barbell[^11][^25] | DBs at shoulder level, elbows slightly outside shoulders (~90deg abduction), palms forward | Arms fully extended overhead, DBs above head, slight convergence | **High (A-Tier)** | ① DBs lower to shoulder level - elbows at 90deg; ② Slight arch, upper back on pad; ③ Press straight up without dumbbells touching at top[^11][^25] | ⚠️ DBs only lowered to eye level - eliminates the stretched anterior/medial delt position; essentially a half-press[^11] |
| **Arnold Press** | Dumbbell | Anterior Deltoid, Medial Deltoid, Posterior Deltoid | Triceps, Upper Trap, Rotator Cuff | High | Shoulder external rotation throughout the rotation arc[^26][^12] | DBs at chin/chest level, palms facing body, elbows forward (~shoulder flexion position, ~60deg) | Arms fully extended overhead, palms facing forward | **High (A-Tier)** | ① Rotation begins when DBs pass forehead level (not earlier); ② Elbows drive forward at start, then out as you rotate; ③ One fluid arc - not two separate movements[^12][^25] | Rotating too early (elbows flaring wide at bottom) skips the anterior delt stretch phase and removes the unique ROM advantage of this exercise ⚠️[^12] |
| **Dumbbell Lateral Raise (Standing)** | Dumbbell | Medial Deltoid | Upper Trap, Anterior Delt (minor) | Medium | Shoulder adduction - dumbbell returns to full side (zero tension at bottom)[^27][^9] | Arms at sides (full adduction) - but zero tension at this position with DBs | Arms raised to shoulder height (~90deg shoulder abduction) - peak medial delt contraction | **Medium (C-Tier vs. cable)** | ① Lead with elbows, not hands; ② Thumb slightly up (or level) - not tilted down; ③ Scapular plane (arms 30deg in front of body)[^27][^28] | ⚠️ Zero tension at bottom (arm-at-side) position - the medial delt''s most lengthened and mechanically important position receives no load with dumbbells[^1][^6] |
| **Side-Lying Dumbbell Lateral Raise** | Dumbbell | Medial Deltoid | Anterior Delt (minor) | Medium-High | Shoulder adduction - lying position creates tension throughout the loaded stretch[^4][^29] | Arm hanging toward floor in full adduction (~0deg abduction) - dumbbell provides load in this stretched position | Arm raised to ~90deg abduction (shoulder height) | **High (A-Tier)** | ① Lie on side on bench; ② Full arm hang toward floor to maximize loaded stretch at bottom; ③ Raise arm to 90deg - no higher[^4][^29] | Lying too upright (near-seated position) removes the benefit of gravity loading the arm-at-side stretch position ⚠️[^29] |
| **Dumbbell Rear Delt Fly (Bent-Over)** | Dumbbell | Posterior Deltoid | Rhomboid, Mid Trap, Teres Minor | High | Shoulder horizontal abduction - limits how far arm travels behind body[^14][^15] | Arms hanging below chest, torso ~45deg, shoulder in neutral horizontal position | Arms raised to ~45deg abduction with elbows slightly flared (elbows at ~45deg, not 90deg) | **High (A-Tier)** | ① Torso ~45deg (not horizontal); ② Elbows flared at 45deg - NOT 90deg (maximizes rear delt ROM vs. trap); ③ External rotate at top - thumbs point upward[^1...', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: Exercise Library - Cable Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Single-Arm Cable Lateral Raise (Arm Behind Body)** | Cable | Medial Deltoid | Upper Trap, Anterior Delt (minor) | High | Shoulder adduction - cable position (raised off floor) loads the arm in the fully adducted stretched position[^1][^31][^6] | Arm crosses slightly behind body (adducted past centerline) with cable tension (~5-10deg behind neutral) | Arm raised to ~90deg shoulder abduction - peak medial delt contraction | **High (S+ Tier - Best Shoulder Exercise)** | ① Cable set 1-2 settings above floor (raised height = more tension at stretched position); ② Arm starts behind body - cross cable in front; ③ Lean slightly away for lat-to-cable perpendicular tension[^2][^4][^31] | Cable set at floor (no tension at arm-at-side position) - removes the primary hypertrophy advantage over dumbbells ⚠️[^1][^31] |
| **Cable Lateral Raise (Bilateral / Crossover)** | Cable | Medial Deltoid | Upper Trap, Anterior Delt | High | Shoulder adduction; cable crossover from front provides tension through bottom stretch[^6][^9] | Arms crossed at chest (full adduction, cables from front provide constant tension) | Arms raised to shoulder height (~90deg abduction) at sides | **High (A-Tier)** | ① Start with arms crossed at chest (full adduction = max stretch under load); ② Arc out to shoulder height; ③ Slow eccentric back to crossed position[^6][^9] | Starting with arms at sides (not crossed) removes the loaded stretch at bottom - mimics dumbbell resistance curve ⚠️[^6] |
| **Reverse Cable Crossover (High-to-Low / Rear Delt)** | Cable | Posterior Deltoid | Rhomboid, Mid Trap, Teres Minor | High | Shoulder horizontal abduction + arm crossing past midline[^2][^30][^32] | Arms crossed at midline or slightly past - cables from high pulleys (shoulder to overhead height); rear delt fully stretched | Arms extended wide at ~45deg abduction, elbows slightly bent, full horizontal abduction | **High (S-Tier)** | ① Cables from high pulley or shoulder height; ② Arms cross past midline at start to force rear delt stretch; ③ Arc out and slightly down - elbows soft[^2][^30][^32] | ⚠️ Arms not crossed at start - removing the stretch advantage; stopping at shoulder-width instead of full crossover eliminates the loaded stretch position for posterior delt[^32] |
| **Cable Front Raise** | Cable | Anterior Deltoid | Pec Clavicular, Medial Delt (minor) | Medium | Shoulder flexion - cable provides constant tension vs. dumbbell zero-tension at bottom[^30][^33] | Arm at side, cable at hip level - constant tension from cable at arm-at-side position (~0deg shoulder flexion) | Arm raised to shoulder height or slightly above (~90-120deg shoulder flexion) | **Medium (B-Tier)** | ① Cable at low pulley; ② Full arm extension at bottom; ③ Raise to eye level - scapular plane preferred over straight front[^30][^33] | Only a mild step above dumbbell front raise due to constant tension; still largely redundant for lifters who press; SFR modest[^2] |
| **Cable Face Pull (Rope)** | Cable | Posterior Deltoid, Mid/Lower Trap, Rear Delt | External Rotators, Biceps | Medium-High | Shoulder horizontal abduction + external rotation - elbows-high position most limiting[^10][^34] | Arms extended forward, shoulder in neutral horizontal position, cable at...', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Machine Shoulder Press (Converging/Plate-Loaded)** | Machine | Anterior Deltoid, Medial Deltoid | Triceps, Upper Trap | High | Shoulder external rotation at bottom - machine cam limits eccentric depth[^2][^37][^4] | Handles at shoulder level, elbows ~90deg of shoulder abduction; machine groove | Arms fully extended overhead - full lockout | **High (A-Tier)** | ① Adjust seat so handles align with shoulder level, not above; ② Full eccentric - handles to shoulder height; ③ Full lockout at top[^2][^4] | Seat set too high places handles above shoulders at start - removes bottom-end shoulder stretch and loads rotator cuff instead ⚠️[^2] |
| **Reverse Pec Deck (Machine Rear Delt Fly)** | Machine | Posterior Deltoid | Rhomboid, Mid Trap, Teres Minor | High | Shoulder horizontal abduction - machine locks arms at 90deg abduction, restricting optimal rear delt angle[^13][^4] | Arms together in front (~0deg horizontal abduction); machine provides loaded stretch at full arm forward position | Arms spread wide to machine limits (~90deg horizontal abduction) - full scapular retraction | **High (S-Tier)** | ① Seat height: handles at shoulder level; ② Full arm extension toward center at stretch; ③ Lead elbows out and back - 45deg arm angle better than 90deg[^2][^4][^13] | ⚠️ Machine locks into 90deg abduction - rear delt peak hypertrophy occurs in 45-60deg abduction zone per pre-script research; note this structural limitation[^13] |
| **Smith Machine Overhead Press** | Machine | Anterior Deltoid, Medial Deltoid | Triceps, Upper Trap | High | Same as barbell: shoulder external rotation at bottom; fixed bar path[^7][^11] | Bar at upper chest, elbows slightly forward, fixed Smith path | Arms fully extended, bar overhead | **High (B-Tier vs. free weight)** | ① Position bench and feet to allow natural shoulder tracking despite fixed bar path; ② Full range to chest; ③ Use when stabilizer fatigue limits free bar work[^7][^11] | Fixed Smith bar path doesn''t match individual shoulder biomechanics - forces compensatory ROM patterns that can truncate the natural bottom-end stretch ⚠️[^11] |
| **Lateral Raise Machine** | Machine | Medial Deltoid | Upper Trap, Anterior Delt | Medium | Shoulder adduction - machine provides constant tension but fixed arm position may not match shoulder mechanics[^27][^6] | Arms at sides in pad start position - machine provides tension at or near arm-at-side | Arms raised to ~90deg shoulder abduction - peak medial contraction | **High (A-Tier)** | ① Adjust seat so elbow pad aligns with shoulder pivot point (crucial); ② Full arm drop at bottom to loaded stretch; ③ Control eccentric[^27][^6] | ⚠️ Seat misalignment - elbow pads above or below the shoulder pivot create a lever mismatch that reduces effective ROM by 30-40% and causes compensatory trap recruitment[^27] |
| **Pec Deck Rear Delt (Reverse Grip)** | Machine | Posterior Deltoid | Rhomboid, Mid Trap | High | Shoulder horizontal abduction; same structural limitation as standard reverse pec deck re: arm angle[^13][^4] | Arms together, reverse grip on pec deck handles - shoulder in full forward horizontal position | Arms spread wide, elbows at ~45deg angle at peak | **High (A-Tier)** | ① Sit facing pad; ② Use handles or elbow pa...', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: SFR Quick Reference - Shoulders Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | Head | SFR | Key Strength |
|---|---|---|---|---|
| **S+ - Best Shoulder Exercise** | Single-Arm Cable Lateral Raise (Arm Behind Body) | Medial | High | Loads medial delt at fully lengthened arm-at-side stretch[^2][^4][^31] |
| **S** | Reverse Pec Deck | Posterior | High | Best rear delt machine; easy overload, deep stretch[^2][^4] |
| **S** | Reverse Cable Crossover | Posterior | High | Loaded stretch via crossed-arm starting position[^2][^30][^32] |
| **A - Excellent** | Machine Shoulder Press | Anterior/Medial | High | Guided press; easy overload with deep stretch[^2][^4] |
| **A** | Seated Dumbbell Press | Anterior/Medial | High | Free movement path + deeper eccentric than barbell[^2][^4][^11] |
| **A** | Arnold Press | Anterior/Medial/Posterior | High | Full ROM rotation hits all three heads through unique arc[^26][^25][^12] |
| **A** | Side-Lying Lateral Raise | Medial | High | Loaded stretch at arm-at-side using gravity[^4][^29] |
| **A** | Face Pull (Rope Cable) | Posterior | High | Rear delt + external rotator; essential for shoulder health[^10][^34] |
| **A** | Cable Rear Delt Pull (Single, High Pulley) | Posterior | High | 45deg abduction = optimal rear delt moment arm[^13][^36] |
| **A** | Incline Dumbbell Rear Delt Fly | Posterior | High | Gravity stretch at bottom + chest support removes cheating[^14][^15] |
| **A** | Lean-Away Cable Lateral Raise | Medial | High | Enhanced stretch vs. standard cable raise[^31][^33] |
| **A** | Lateral Raise Machine (Adjusted) | Medial | High | Constant tension + loaded stretch with correct seat height[^27][^6] |
| **A** | Barbell Overhead Press (Standing) | Anterior/Medial | High | Compound overload; foundational pressing[^19][^20] |
| **A** | Landmine Press | Anterior/Upper Pec | High | Unique diagonal vector; shoulder-friendly heavy overload[^38][^19] |
| **B - Good** | Seated Barbell Overhead Press | Anterior/Medial | High | Full range with spotter; strict form[^7][^11] |
| **B** | Cable Lateral Raise (Bilateral Crossover) | Medial | High | Loaded at bottom via crossed-arm start[^6][^9] |
| **B** | Dumbbell Bent-Over Rear Delt Fly | Posterior | High | Good isolation but technique-dependent[^14][^15] |
| **B** | Cable Upright Row (Rope) | Medial/Upper Trap | Medium-High | More shoulder-safe than barbell version[^17][^35] |
| **C - Moderate** | Standing Dumbbell Lateral Raise | Medial | Medium | Zero tension at bottom - poor resistance curve[^1][^6] |
| **C** | Cable Front Raise | Anterior | Medium | Constant tension upgrade on dumbbell; still redundant[^30][^33] |
| **C** | Barbell Upright Row | Medial/Upper Trap | Medium | ROM hard cap + impingement risk reduces SFR[^16][^17] |
| **D - Limited** | Dumbbell Front Raise | Anterior | Low | Redundant + zero bottom tension; F-tier per Nippard[^2][^30] |
| **D** | Behind-Neck Barbell Press | Medial/Posterior | Medium (with mobility) | High ROM demand limits access; injury risk high for most[^21][^18] |

***', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: Key Science Notes', '**Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus (not just injury risk):**[^39][^5][^8]

- ⚠️ **Dumbbell Lateral Raise (arm returns to side):** The medial delt reaches its most stretched and mechanically loaded position at arm-at-side (~0deg abduction), but the dumbbell has **zero tension** at this position; research confirms this is why cable laterals with raised pulley position produce superior lateral delt hypertrophy by keeping tension through the stretched position[^6][^1][^39]
- ⚠️ **Any Overhead Press Stopped at 90deg (Partial):** Stopping at eye/forehead level rather than descending to shoulder level eliminates the most lengthened anterior/medial delt position - the bottom of the ROM provides the most mechanical tension and mTOR stimulus[^19][^11]
- ⚠️ **Rear Delt Fly with 90deg Elbow Flare (not 45deg):** The posterior delt has its greatest moment arm in the 45-60deg abduction zone (not 90deg); exercises locking arms at 90deg are biomechanically sub-optimal for posterior delt and preferentially load the rhomboids and mid-traps instead[^13]
- ⚠️ **Upright Row Above 90deg Shoulder Abduction:** The medial delt is adequately loaded up to 90deg abduction; above that, the movement enters the impingement zone AND mechanically shifts to upper trap dominance, actively removing medial delt from the movement[^16][^17]
- ⚠️ **Reverse Pec Deck Machine Structural Limitation:** The machine locks arms at 90deg abduction - but per biomechanical analysis, the rear delt''s peak force production is in 45-60deg abduction; note this in programming as a limiter of peak contraction quality despite being S-tier for general hypertrophy and ease of use[^4][^13]

**The Key Insight for Shoulder LML Training:** Unlike most muscle groups, the medial delt''s fully lengthened position (arm at side) is largely unavailable to dumbbell exercises due to zero gravity resistance at that position. This is why the cable lateral raise with a raised pulley - or side-lying dumbbell raise - are mechanically superior for medial delt hypertrophy: they apply meaningful load precisely where the dumbbell cannot.[^1][^39][^6]

---', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Shoulders Exercise Library: References', '1. [Try this lateral raise variant to stimulate stretch-mediated ...](https://www.youtube.com/watch?v=ZpSMEgdyYa4) - Training muscle groups at long muscle lengths results in more muscle hypertrophy than training damag...

2. [Jeff Nippard Ranks 21 of the Best and Worst Shoulder ...](https://fitnessvolt.com/jeff-nippard-ranks-best-worst-shoulder-exercises/) - Fitness coach Nippard broke down each exercise using his own criteria, revealing which movements are...

3. [Stimulus to Fatigue Ratio: Definition and Examples](https://hevycoach.com/glossary/stimulus-fatigue/) - 1. Pick Exercises Carefully · 2. Pick the Correct Weights · 3. Start With Less Volume · 4. Limit the...

4. [Bodybuilding Shoulder Exercises Tier List](https://barbend.com/news/best-worst-shoulder-exercises-tier-list/) - On Sep. 10, 2024, coach and content creator Jeff Nippard ranked 20 of the most popular shoulder exer...

5. [Deltoids](https://www.patreon.com/posts/deltoids-61681834) - The internal moment arm lengths of the anterior and middle deltoids both increase with increasing sh...

6. [The ONLY 2 Deltoid Exercises That Widened My Shoulders](https://builtwithscience.com/fitness-tips/only-2-deltoid-exercises/) - This is the optimal arm path for lateral raises, as it maximizes tension on your side delts and prov...

7. [Front vs Back and Barbell vs Machine Overhead Press - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9354811/) - Performing back overhead press enhances the excitation of medial and posterior and partly anterior d...

8. [Beyond full ROM: 3 Lessons about stretch-mediated ...](https://mennohenselmans.com/stretch-mediated-hypertrophy-rom/) - Many programs fail to stimulate stretch-mediated hypertrophy. Make sure your program puts the muscle...

9. [Cable Lateral Raise vs Dumbbell: Which Exercise Better ...](https://dumbbellsdirect.com/blogs/dumbbells-comparison-alternatives/cable-lateral-raise-vs-dumbbell) - The short answer: cables give constant tension, dumbbells give freedom - both are gold. Stick around...

10. [How to Improve Your Shoulder Range of Motion](https://e3rehab.com/shoulder-range-of-motion/) - Do you want to improve your shoulder range of motion? Learn how to increase flexion, extension, exte...

11. [Dumbbell Shoulder Press Vs Barbell Shoulder Press](https://muscularstrength.com/article/dumbbell-shoulder-press-barbell-shoulder-press) - For anterior deltoid recruitment, the seated dumbbell press had 11% greater muscle activation then t...

12. [Stop F*cking Up The Arnold Press (PROPER FORM!)](https://www.youtube.com/watch?v=ris9tKqMwgU) - The Arnold press to build big front delts, meaty middle delts and explosive rear delts.

13. [Magnify posterior deltoid hypertrophy by exploiting the ...](https://blog.pre-script.com/grow-your-delts-by-leveraging-surrounding-structure-and-function/) - For training purposes, the deltoid is broken down into these three divisions: Anterior; Medial; Post...

14. [How to Grow Your Rear Delts FAST (3 Simple Techniques)](https://www.youtube.com/watch?v=FqfYvaRgKyM) - I''m going to show you how to grow your rear delts fast with three simple tips that you can apply rig...

15. [How To Grow Your Rear Delts Fast (4 Key Exercises You'' ...](https://builtwithscience.com/fitness-tips/rear-delts/) - In this article, you''ll learn about the importance of developing your rear delts, and three key exer...

16. [Stop Doing Upright Rows | Do This Instead](https://learn.athleanx.com/articles/shoulders-for-men/upright-row-most-da...', 'ROMRx Bodybuilding KB - Shoulders.md', ARRAY['bodybuilding','shoulders','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: Overview', '# ROMRxBB - Triceps Exercise Library
### Stretch-Mediated Hypertrophy Edition | Triceps Long Head, Lateral Head, Medial Head

> **The Single Most Supported Finding in Hypertrophy Research for This Muscle Group:** A landmark 2022 study published in the *European Journal of Sport Science* found that overhead triceps extensions produced **~40% more total triceps hypertrophy** than cable pushdowns - even when the overhead group used *less absolute load*. This directly demonstrates stretch-mediated hypertrophy in the triceps long head. The mechanism: the triceps long head is **bi-articular** (crosses both shoulder and elbow); shoulder flexion (arm overhead) stretches the long head at the shoulder joint, placing it in a fully lengthened position before the elbow even begins extending. The lateral and medial heads are single-joint and respond to elbow extension regardless of shoulder position. The central programming implication: prioritize overhead-position exercises for long head development, and add side-or-behind-body exercises as secondary for lateral/medial head isolation. SFR ratings per Nippard''s 2024 triceps tier list. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3][^4][^5][^6][^7][^8]

***', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: ROM Hierarchy for Triceps - Top 5 Limiters', 'Ranked by severity of impact on **hypertrophic stimulus** (not just injury risk):

| Rank | ROM Limiter | Joint / Movement | Muscle Affected | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------|----------------------|------------------------|
| **1** | **Shoulder Flexion (Arm Overhead Position)** | Glenohumeral joint | Triceps Long Head (bi-articular) | **Critical** - the long head makes up ~55-60% of total triceps mass; placing the arm overhead stretches it at the shoulder, putting it in its fully lengthened position. The 40% greater hypertrophy of overhead vs. neutral-arm extensions is *purely* a function of this shoulder position[^1][^4][^6][^9]. Any limitation in shoulder flexion (mobility, pain, impingement) directly prevents the long head from reaching its fully stretched position | Overhead Cable Ext, DB Overhead Ext, EZ Bar Overhead, Skull Crusher (arm angle), Dumbbell Pullover Ext |
| **2** | **Elbow Flexion at Stretch Position (Depth of Eccentric)** | Humeroulnar joint | All 3 heads | **High** - regardless of shoulder position, the elbow must reach full flexion to place the triceps (especially the long head) in its maximally lengthened position; cutting the eccentric short (not allowing elbows to bend fully) directly reduces the loaded stretch amplitude; this is the most common error across ALL triceps exercises[^1][^5][^10] | All skull crushers, overhead extensions, dumbbell kickbacks, all pushdown variations |
| **3** | **Shoulder Mobility / Impingement (Overhead Restriction)** | Glenohumeral joint + AC joint | Triceps Long Head | **High** - limited shoulder flexion or impingement prevents reaching full overhead ROM, forcing accommodation (elbows flare out, torso compensates); any overhead position below true vertical significantly reduces long head lengthening[^1][^5][^9] | All overhead extension variations |
| **4** | **Elbow Full Extension at Peak Contraction** | Humeroulnar joint | Lateral Head, Medial Head, Long Head | **Medium-High** - all three heads of the triceps are maximally contracted at full elbow extension (0deg); intentionally stopping reps short of lockout (common with pushdowns and machine extensions) reduces peak contraction quality and stimulus for lateral and medial heads[^2][^11][^12] | Cable Pushdowns, Machine Tricep Extension, Dips, Close-Grip Bench Press |
| **5** | **Wrist Neutral / Elbow Valgus Position** | Radiocarpal joint + humeroulnar joint | All heads (load transfer issue) | **Medium** - excessive elbow flare (valgus) during pressing or skull crushers shifts load from triceps to pectorals and anterior deltoid; wrist extension under load can also force early termination of the ROM due to discomfort; EZ bar mitigates wrist issues but slightly reduces ROM vs. straight bar[^13][^14][^15] | All pressing variations (CGBP, dips), all skull crusher variants, EZ bar curl |

***', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: Exercise Library', '### Barbell Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Close-Grip Bench Press (CGBP)** | Barbell | Triceps (all heads), Lateral + Medial bias | Pectorals, Anterior Deltoid | High | Elbow flexion depth + elbow flare control; shoulder position neutral (arm at side)[^14][^15] | Bar touching lower chest/sternum, elbows at ~45deg to torso, full elbow flexion | Bar fully extended, elbow at lockout | **High (A-Tier)** | ① Grip shoulder-width or slightly inside (not too narrow); ② Elbows tucked to sides - no flare; ③ Full ROM - bar touches sternum, full extension at top[^14][^15] | ⚠️ Elbow flare converts to standard bench press - removes triceps focus and reduces ROM depth; also: stopping short of chest removes the loaded triceps stretch[^15] |
| **EZ Bar Skull Crusher (Flat Bench)** | Barbell (EZ) | Triceps Long Head (primary), Lateral Head | Triceps Medial Head | High | Elbow flexion at bottom; shoulder position fixed at ~90deg flexion (arm vertical) - partial long head lengthening, not full overhead stretch[^13][^5] | Elbows at full flexion (~130-140deg), bar near forehead - arm at ~90deg shoulder flexion | Elbows at full extension, arms vertical | **High (A-Tier)** | ① Elbows point toward ceiling throughout; ② Let bar descend behind head (not to forehead) for greater shoulder flexion and long head stretch[^13][^5]; ③ Slow eccentric - max stimulus at bottom stretch[^13] | ⚠️ Bar goes to forehead (not behind head) - keeps shoulder at 90deg instead of moving past vertical; this is the difference between partial and full long head stretch; also: elbows flaring out shifts load from long head to lateral[^13] |
| **EZ Bar Skull Crusher (Decline Bench)** | Barbell (EZ) | Triceps Long Head | Triceps Lateral Head, Medial Head | High | Elbow flexion + decline angle changes shoulder position; decline reduces shoulder flexion angle slightly[^13][^5] | Elbows fully flexed, bar behind head on decline - long head stretch enhanced by head-below-bench position | Elbows fully extended, arms perpendicular to bench | **High (A-Tier)** | ① Decline (15-30deg) increases long head stretch vs. flat bench due to gravity/head position; ② Full elbow flexion behind head; ③ Same slow eccentric[^13][^5] | Head positioning above bench (insufficient decline) reduces the long-head advantage of this variation ⚠️[^13] |
| **JM Press** | Barbell | Triceps (all heads) | Pectorals, Anterior Deltoid | High | Elbow flexion + shoulder angle; hybrid between CGBP and skull crusher[^3][^11] | Bar descends to ~chin height, elbows forward at ~45deg - intermediate long head stretch | Full elbow extension, elbows locked out | **High (A-Tier)** | ① Elbows travel forward toward feet as bar descends; ② Stop bar at chin/neck level (not to forehead or chest); ③ Best used as heavy triceps compound[^3][^11] | Elbows staying fixed (skull crusher pattern) or going fully back (bench press pattern) - misses the specific JM Press elbow path that is its unique stimulus[^3] |
| **Barbell Overhead Triceps Extension (Standing / Seated)** | Barbell | Triceps Long Head (primary) | Lateral Head, Medial Head | High | Shoulder flexion - elbows must stay pointed forward and vertical; arm must be truly overhead[^1][^4][^5] | Elbows fully flexed, bar behind head, shoulders fully elevated -...', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Dumbbell Skull Crusher (Flat Bench)** | Dumbbell | Triceps Long Head, Lateral Head | Medial Head | High | Elbow flexion + shoulder position; DBs can travel slightly behind head (more long head stretch than bar)[^13][^16] | Elbows fully flexed, DBs beside/behind head - similar long head stretch to EZ bar but slightly more ROM due to DB freedom | Elbows fully extended, DBs above chest | **High (A-Tier)** | ① DBs travel alongside head (not to forehead) - more ROM than bar[^13]; ② Elbows point toward ceiling; ③ Slow eccentric to stretch[^13][^16] | DBs going to forehead instead of alongside/behind head - same error as EZ bar variant; caps the long head stretch ⚠️[^13] |
| **Dumbbell Overhead Triceps Extension (Two-Hand)** | Dumbbell | Triceps Long Head (primary) | Lateral Head, Medial Head | High | Shoulder flexion - same overhead requirement as barbell version; single DB held overhead[^1][^5][^6] | Elbows fully flexed, DB behind head, arms vertical - long head fully stretched | Arms fully extended overhead, DB above head | **High (A-Tier)** | ① Hold DB with both hands around one end; ② Elbows stay close to head (not flaring); ③ Full elbow flexion at bottom[^1][^5] | ⚠️ Same elbow flare error as barbell version; also: limited depth at bottom because DB hits back of head - use a lighter DB or sit at edge of bench to allow deeper descent[^5] |
| **Single-Arm Dumbbell Overhead Extension** | Dumbbell | Triceps Long Head (isolated, unilateral) | Lateral Head, Medial Head | High | Shoulder flexion + side lean; single arm version often allows deeper ROM than bilateral[^2][^5] | Elbow fully flexed, DB behind head, arm truly vertical | Arm fully extended overhead | **High (A-Tier)** | ① Support elbow with opposite hand for stability; ② True overhead arm position - not angled; ③ Full elbow flexion at bottom - let the stretch happen[^2][^5] | Arm angling forward (shoulder partially flexed, not fully elevated) - reduces long head lengthening ⚠️[^5] |
| **Lying Dumbbell Triceps Extension (Pullover-Ext)** | Dumbbell | Triceps Long Head | Lats, Lateral Head | High | Shoulder flexion + elbow flexion; can extend arm into full overhead position on flat bench while lying[^2][^17] | Elbow fully flexed, arm extended back above/behind head while lying - long head maximally lengthened at both shoulder and elbow | Arm extended at ceiling, elbow locked out | **High (A-Tier per Nippard)** | ① Flat bench; arm starts from straight overhead (past vertical - long head bias); ② Let arm travel behind head during eccentric; ③ Neutral grip (palms facing each other) reduces elbow stress[^2][^17] | ⚠️ Starting position too far forward (arm not going past vertical behind head) - misses the extreme long head stretch that makes this variation uniquely valuable[^17] |
| **Dumbbell Kickback** | Dumbbell | Triceps Lateral Head (peak contraction), Medial Head | Long Head (minimal) | Medium | Elbow extension at peak; shoulder in ~90deg extension behind body - loads ONLY at lockout since gravity is perpendicular at bottom[^2][^3][^8] | Elbow at full flexion, arm at side - minimal tension here (gravity works vertically, arm horizontal) | Arm fully extended behind body - peak tension | **Low (F-Tier per Nippard - Worst Exercise)** |...', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: Exercise Library - Cable Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Overhead Cable Triceps Extension (Rope, Face-Away)** | Cable | Triceps Long Head (primary), All Heads | None | High | Shoulder flexion - arm must be truly overhead; elbow must fully flex at stretch; this is the #1 most science-supported triceps exercise[^1][^18][^4][^6] | Elbows fully flexed, hands behind head, shoulder in full flexion (~180deg) - long head maximally stretched at both joints | Arms fully extended forward/overhead, elbows locked | **High (S-Tier - Best Triceps Exercise per Science and Nippard)** | ① Stand tall facing away from low/mid pulley; ② Elbows stay fixed beside head - no flare; ③ Full elbow flexion at stretch - let hands descend behind head as deep as possible[^1][^18][^4][^8] | ⚠️ Elbows flaring outward removes the overhead position and long head stretch - the single most important ROM cue for this exercise; also: cable pulley too high reduces the stretch position at the bottom[^18][^10] |
| **Single-Arm Overhead Cable Extension** | Cable | Triceps Long Head (unilateral) | Lateral Head, Medial Head | High | Same shoulder flexion + elbow flexion as bilateral version; unilateral allows deeper individual ROM[^2][^3][^19] | Single elbow fully flexed, arm overhead from low cable | Single arm fully extended overhead | **High (S-Tier per Nippard)** | ① Single arm provides greater ROM freedom vs. bilateral; ② Support free hand against knee or thigh; ③ Full stretch at bottom - elbow past 90deg[^2][^3][^19] | ⚠️ Same elbow flare and insufficient elbow flexion at stretch as bilateral version[^19] |
| **Cable Rope Pushdown (Neutral Shoulder)** | Cable | Triceps Lateral Head (primary), Medial Head | Long Head (reduced - shortened shoulder position) | High | Elbow extension to full lockout; shoulder neutral (arm at side) reduces long head involvement[^2][^3][^20] | Elbows at ~90deg or less, hands near chest/chin - limited long head lengthening | Elbows fully extended at sides, rope ends spread | **Medium-High (A-Tier)** | ① Spread rope ends at lockout - maximize lateral head contraction; ② Full lockout on every rep; ③ Elbows stay fixed at sides (no elbow drift forward)[^2][^3][^20] | ⚠️ Elbows drifting forward as weight increases - this shortens the triceps in the lengthened position and removes lateral head isolation; also: not fully locking out reduces peak lateral/medial head contraction[^2] |
| **Cable Bar Pushdown (Pronated Grip)** | Cable | Triceps Lateral Head, Medial Head | Long Head (minor) | High | Elbow extension; straight bar maximizes wrist pronation - better stability than rope for some lifters[^2][^3][^8] | Elbows at ~90deg, bar near chin - neutral shoulder position | Elbows fully extended | **High (A-Tier per Nippard)** | ① Bar provides more stability for heavier loads vs. rope; ② Full lockout; ③ Elbows fixed at sides[^2][^3][^8] | Partial lockout (stopping at 20-30deg short of full extension) - removes peak lateral head contraction ⚠️[^2] |
| **Reverse Grip Cable Pushdown (Supinated)** | Cable | Triceps Medial Head (primary) | Lateral Head, Long Head | High | Elbow extension; supinated grip shifts recruitment to medial head at lockout[^3][^12][^21] | Elbows at ~90deg, hands near chin, supinated grip | Elbows fully extended, supinated - medial head fully c...', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Machine Tricep Extension (Overhead, Shoulder-Flexed)** | Machine | Triceps Long Head (primary), All Heads | None | High | Shoulder flexion - machine must be set to overhead/inclined arm position to lengthen long head; many machines allow this adjustment[^2][^5][^9] | Elbows fully flexed, arms overhead or inclined forward - long head loaded in stretch | Elbows fully extended | **High (A-Tier)** | ① Set machine to overhead/inclined arm position (not neutral-arm); ② Full elbow flexion at stretch; ③ Slow eccentric to stretch position[^2][^5] | ⚠️ Using neutral-arm machine position instead of overhead - eliminates the long head lengthening mechanism and converts to a glorified pushdown[^5] |
| **Machine Tricep Pushdown (Cam)** | Machine | Triceps Lateral Head, Medial Head | Long Head (minor) | High | Elbow extension; cam mechanism provides superior resistance profile vs. cable at end range[^2][^3] | Handles at chin/chest level, elbows at ~90deg | Full elbow extension, handles at sides | **High (A-Tier)** | ① Full lockout on every rep; ② Elbows fixed at sides; ③ Controlled eccentric[^2][^3] | Partial lockout - peak lateral/medial head contraction requires full elbow extension ⚠️[^2] |
| **Machine Dip (Assisted or Weighted)** | Machine | Triceps (all heads), Lateral Head (emphasis) | Pectorals, Anterior Deltoid | High | Elbow flexion depth + shoulder position; forward lean changes pec vs. tricep emphasis[^3][^22] | Elbows fully flexed, body at lowest position - triceps at maximum stretch | Arms fully extended, elbows locked | **High (A-Tier)** | ① Upright torso = tricep emphasis; forward lean = chest emphasis; ② Full depth - elbows to 90deg+; ③ Full lockout at top[^3][^22] | Not reaching full depth at bottom - removes triceps lengthened stretch; also: forward lean combined with full depth can cause shoulder impingement ⚠️[^22] |
| **Smith Machine Close-Grip Bench Press** | Machine | Triceps (all heads), Lateral Head | Pectorals | High | Elbow flexion + bar path; Smith fixes bar path - allows lifter to focus entirely on triceps ROM[^14][^15] | Bar at lower chest/sternum, elbows at ~45deg tuck | Full elbow extension, bar locked out | **Medium-High (A-Tier)** | ① Same grip and elbow position as barbell CGBP; ② Smith path removes balance demand - use for higher rep triceps focus; ③ Full ROM - bar to chest and full lockout[^14][^15] | Same as barbell CGBP: partial ROM at bottom and elbow flare ⚠️[^15] |

***', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: Exercise Library - Bodyweight Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Parallel Bar Dips (Triceps Focus)** | Bodyweight | Triceps (all heads), Lateral Head | Pectorals, Anterior Deltoid | High | Elbow flexion depth + shoulder position; upright torso is the key variable for triceps vs. pec bias[^3][^20][^22] | Elbows at full flexion (~90deg-100deg), body at bottom - all three heads at stretch | Arms fully extended, elbows locked out at top | **High (A-Tier)** | ① Stay upright (no forward lean) for triceps bias; ② Full depth - elbows to 90deg+; ③ Full lockout at top[^3][^20][^22] | ⚠️ Leaning forward excessively (chest dip form) converts this to a pec-dominant movement; also: not achieving full depth removes triceps loaded stretch[^3][^22] |
| **Diamond Push-Up** | Bodyweight | Triceps (all heads), Medial Head | Pectorals, Anterior Deltoid | High | Elbow flexion at bottom - narrow hand position places greater elbow flexion demand[^20][^16][^22] | Chest near hands, elbows fully flexed - all triceps heads at stretch | Arms fully extended, elbows locked | **Medium (B-Tier)** | ① Hands form diamond under chest; ② Full depth - chest touches or near-touches hands; ③ Elbows track toward ribs (not flaring)[^20][^16] | Partial depth (not lowering chest to hands) removes triceps stretch ⚠️[^16] |
| **Pike Push-Up / Decline Push-Up** | Bodyweight | Triceps (overhead position), Long Head | Anterior Deltoid, Pectorals | High | Shoulder flexion - elevated feet increase shoulder flexion and long head lengthening vs. flat push-up[^5][^20] | Arms fully flexed, head near floor, hips elevated - overhead-like position for long head | Arms fully extended | **Medium (B-Tier)** | ① Feet elevated 12-18" for long head bias; ② Keep hips high throughout; ③ Full depth - head near floor[^5][^20] | Not elevating feet - removes the quasi-overhead shoulder position that biases the long head ⚠️[^5] |
| **Bench Dip** | Bodyweight | Triceps (all heads) | Anterior Deltoid, Pectorals | Medium-High | Elbow flexion + shoulder extension behind body[^3][^22] | Elbows fully flexed, body at lowest dip position | Arms fully extended, hands on bench, body elevated | **Low-Medium (C-Tier per Nippard)** | ① Keep back close to bench; ② Full depth (elbows 90deg+); ③ Add load on lap for progression - still limited vs. machine/cable alternatives[^3][^22] | ⚠️ Shoulders internally rotating and protacting at depth - poor shoulder mechanics at the loaded stretch makes this potentially harmful without adequate shoulder health; better replaced by parallel bar dip[^3][^22] |

***', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: SFR Quick Reference - Triceps Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best Triceps Exercise** | Overhead Cable Extension (Rope/Bar, Face-Away) | High | 40% more hypertrophy vs. pushdowns; long head maximally loaded in overhead position[^1][^4][^6] |
| **S** | Single-Arm Overhead Cable Extension | High | Unilateral S-tier per Nippard - superior long head ROM and isolation[^2][^19] |
| **A - Excellent** | EZ Bar Skull Crusher (Decline) | High | Long head bias; decline enhances stretch vs. flat bench[^13][^5] |
| **A** | EZ Bar Skull Crusher (Flat, Behind Head) | High | Full long head stretch when bar goes behind head[^13] |
| **A** | Close-Grip Bench Press | High | Best compound triceps overloading movement[^14][^15] |
| **A** | JM Press | High | Heavy compound with intermediate elbow path[^3][^11] |
| **A** | Parallel Bar Dips (Upright) | High | Bodyweight compound; full ROM across all three heads[^3][^22] |
| **A** | Lying DB Triceps Extension (Pullover-Ext) | High | Extreme long head stretch from behind-head arm position[^2][^17] |
| **A** | Single-Arm DB Overhead Extension | High | Full ROM + unilateral long head isolation[^2][^5] |
| **A** | Cable Bar Pushdown | High | Stable heavy lateral/medial head work + full lockout[^2][^3][^8] |
| **A** | Cable Rope Pushdown | High | Lateral head peak contraction with rope spread[^2][^3] |
| **A** | Reverse Grip Cable Pushdown | High | Best medial head isolation[^3][^12][^21] |
| **A** | Katana Cable Extension | High | Unique long head arc loading[^2][^3] |
| **A** | Cable Kickback (Low Pulley) | High | Constant tension lateral head kickback - vastly superior to DB[^2][^3] |
| **A** | Machine Tricep Extension (Overhead Position) | High | Overhead machine = overhead cable benefits[^2][^5] |
| **A** | Dumbbell Skull Crusher | High | More ROM than EZ bar at bottom - DBs pass alongside head[^13][^16] |
| **B - Good** | Barbell Overhead Triceps Extension | Medium-High | Good long head; wrist stress limits loading[^1][^5] |
| **B** | Tate Press | Medium-High | Medial head variety; limited overload[^3][^12] |
| **B** | Machine Dip | Medium-High | Guided dip with overload potential[^3][^22] |
| **B** | Machine Tricep Pushdown (Cam) | High | Cam provides good resistance curve[^2][^3] |
| **B** | Diamond Push-Up | Medium | Decent bodyweight option; limited load ceiling[^20][^16] |
| **C - Moderate** | Bench Dip | Low-Medium | Poor shoulder mechanics; limited ROM utility[^3][^22] |
| **C** | Pike Push-Up | Medium | Good overhead bodyweight substitute[^5][^20] |
| **F - Avoid** | Dumbbell Kickback | Low | Zero tension in stretched position - direct ROM-based hypertrophy failure[^2][^3][^8] |

***', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: Key Science Notes', '**The Definitive Finding - Overhead vs. Neutral Position:**[^4][^6][^1]

The 2022 Maeo et al. study in the *European Journal of Sport Science* performed a within-subject design (one arm does overhead extensions, the other does pushdowns) for 12 weeks. MRI showed the overhead arm gained **~40% more triceps volume** (20% vs. 14%). This happened even though the overhead group used *lighter absolute loads*. The mechanism is purely the lengthened long head position: the bi-articular long head (~55-60% of triceps mass) is stretched at both the shoulder (fully elevated) AND the elbow (fully flexed) simultaneously.[^6][^23][^1][^4]

**⚠️ Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus:**

- ⚠️ **Dumbbell Kickback:** Zero tension in the lengthened position (elbow flexed, arm at side) because gravity acts vertically and the arm is horizontal - no resistance at the stretch. The entire stimulus occurs only at the contracted (arm fully extended) position. Replace with cable kickback at low pulley for constant tension[^2][^3][^8]
- ⚠️ **Any Overhead Extension with Elbow Flare:** Elbows flaring outward during overhead extensions moves the arm out of shoulder flexion - the long head shortens at the shoulder, converting the exercise to a neutral-position extension. This can halve the long head hypertrophic stimulus[^5][^10]
- ⚠️ **Skull Crushers to Forehead (Not Behind Head):** Bar traveling to the forehead keeps the shoulder at 90deg flexion; allowing the bar to travel behind the head increases shoulder flexion past 90deg and significantly increases long head loading. This is the single most common ROM error in skull crusher execution[^13][^5]
- ⚠️ **Cable Kickback with HIGH Pulley:** Recreates the dumbbell kickback''s zero-tension-at-stretch problem; the pulley must be at the LOW position to maintain tension throughout the elbow-flexed starting position[^3][^2]
- ⚠️ **Pushdowns Without Full Lockout:** The lateral and medial heads are mono-articular (cross only the elbow); their peak contraction requires complete elbow extension. Consistently stopping reps 10-20deg short of lockout substantially reduces the peak stimulus for both heads[^20][^2]

**Programming Implication - The 3-Category Framework:**[^2][^3][^5]
1. **Overhead position (long head priority):** Overhead cable extension, skull crusher to behind head, DB overhead extension
2. **Neutral position (lateral + medial head):** Pushdowns (rope/bar), CGBP, machine extension
3. **Behind-body arc (lateral peak contraction):** Cable kickback (low pulley), katana extension

A complete triceps program covers all three categories. Over-indexing on pushdowns alone leaves the long head systematically undertrained - which is the most common triceps programming error in hypertrophy training.[^8][^2]

---', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Triceps Exercise Library: References', '1. [Triceps brachii hypertrophy is substantially greater after ...](https://pubmed.ncbi.nlm.nih.gov/35819335/) - Triceps brachii muscle hypertrophy was substantially greater after cable elbow extension training pe...

2. [Jeff Nippard Ranks The 20 Best and Worst Triceps ...](https://fitnessvolt.com/jeff-nippard-ranks-the-20-best-and-worst-triceps-exercises/) - Nippard ranked 20 common tricep exercises, offering his insights into the best and worst movements f...

3. [Using Science, Jeff Nippard Ranks the Best and Worst ...](https://barbend.com/news/jeff-nippard-ranks-best-and-worst-triceps-exercises/) - Using Science, Jeff Nippard Ranks the Best and Worst Triceps Exercises · Cable Triceps Pressdown · O...

4. [Triceps brachii hypertrophy is substantially greater after ...](https://onlinelibrary.wiley.com/doi/10.1080/17461391.2022.2100279) - Triceps brachii hypertrophy was substantially greater after elbow extension training performed in th...

5. [How Does the Range of Motion Influence Long Head Triceps](https://www.southmag.com/how-does-the-range-of-motion-influence-long-head-triceps-development/) - Overhead movements like dumbbell or cable extensions not only flex the shoulder but also elongate th...

6. [If you want to build bigger triceps, overhead extensions are ...](https://www.businessinsider.com/build-triceps-arm-muscle-with-overhead-extensions-according-to-science-2022-7) - Overhead extensions were shown to build 40% more muscle size than tricep pushdowns, according to a n...

7. [The different role of each head of the triceps brachii muscle in ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC6136322/) - The long head contributes to elbow extension more at shoulder elevation and the medial head takes ov...

8. [Jeff Nippard ranked 20 triceps exercises and crowned ...](https://www.facebook.com/officialgymmemes/posts/jeff-nippard-ranked-20-triceps-exercises-and-crowned-overhead-cable-extensions-s/1240861161515869/) - Overhead cable extensions emerge as the S-tier champion by placing the long head under maximal stret...

9. [Triceps Grow Better at Longer Lengths](https://www.patreon.com/posts/triceps-grow-at-84925433) - Research has shown that the long head of the triceps has an optimal length-tension relationship in t...

10. [Tricep overhead extension : r/JeffNippard](https://www.reddit.com/r/JeffNippard/comments/1n6ar7z/tricep_overhead_extension/) - I think it''s the best tricep exercise to grow your triceps. Triceps are in a deep stretch at the bot...

11. [Targeting the Lateral Head of the Tricep: Techniques](https://www.gymreapers.com/blogs/news/targeting-the-lateral-head-of-the-tricep) - Some of the best lateral tricep head exercises include rope and straight bar pushdowns, JM press, tr...

12. [12 Best Medial Head Tricep Exercises for Huge Arms](https://ca.ironbullstrength.com/blogs/training/medial-head-tricep-exercises) - The three ways to isolate the medial (along with the lateral) triceps head are to: Use a reverse gri...

13. [The Skull Crushers Hypertrophy Guide](https://outlift.com/skull-crushers/) - Skull crushers are one of the best exercises for building bigger triceps, and they''re quite good for...

14. [What Muscles Does Close Grip Bench Press Work?](https://www.performancelab.com/blogs/fitness/what-does-close-grip-bench-work) - The close grip bench press narrows your hand position to shift more work onto the triceps while stil...

15. [Close Grip Bench Press](https://www.nasm.org/resource-center/exercise-library/cl...', 'ROMRx Bodybuilding KB - Triceps.md', ARRAY['bodybuilding','triceps','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: Overview', '# ROMRxBB - Core Exercise Library

### Stretch-Mediated Hypertrophy Edition | Rectus Abdominis, External Obliques, Internal Obliques, Transverse Abdominis, Erector Spinae

**Critical Science Context - Core Hypertrophy vs. Core Stability:** The core has a dual function: (1) **spinal flexion/rotation** (hypertrophy-oriented: rectus abdominis, obliques) and (2) **anti-extension / anti-rotation** (stability-oriented: transverse abdominis, multifidus). For ROMRxBB purposes, this library prioritizes exercises that drive **visual hypertrophy** of the rectus abdominis and obliques via loaded spinal flexion and rotation. Stability/anti-extension exercises (planks, Pallof press, ab wheel) are included because they train the rectus abdominis in a highly *lengthened position under maximal anti-extension tension* - which may produce superior hypertrophy despite not being flexion-based. The loaded cable crunch is the most direct parallel to other muscle group compound movements: it provides consistent progressive overload, full spinal flexion ROM, and a peak-to-stretch gradient that machines cannot easily replicate. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.\[^1\]\[^2\]\[^3\]\[^4\]

---', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: ROM Hierarchy for Core - Top 5 Limiters', 'Ranked by severity of impact on **hypertrophic stimulus**:

| Rank | ROM Limiter | Joint / Movement | Muscle Affected | Impact on Hypertrophy | Most Affected Exercises |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **1** | **Spinal Flexion Range (Lumbar \+ Thoracic)** | Lumbar / thoracic spine | Rectus Abdominis | **Critical** - the rectus abdominis shortens maximally during full spinal flexion (ribcage to pelvis); any limitation in lumbar/thoracic flexion ROM directly reduces how much the rectus abdominis can contract; performing crunches with minimal spinal curl (neck-bob crunches, no lumbar involvement) produces a fraction of the stimulus of full spinal flexion\[^3\]\[^4\]\[^5\] | Cable Crunch, Machine Crunch, Decline Sit-Up, Weighted Crunch, Ab Wheel Rollout |
| **2** | **Hip Flexor Flexibility (Pelvis Position / Anterior Tilt)** | Coxofemoral joint \+ pelvis | Rectus Abdominis, Lower Obliques | **High** - tight hip flexors lock the pelvis into anterior tilt (arched lower back), shortening the rectus abdominis at its origin and reducing achievable spinal flexion ROM; this is the primary mechanism causing "lower ab" weakness in people with tight hip flexors\[^6\]\[^3\] | Hanging Leg Raise, Cable Crunch, Decline Sit-Up, Reverse Crunch |
| **3** | **Shoulder Flexion / Thoracic Extension (Ab Wheel / Rollout)** | Glenohumeral joint \+ T-spine | Rectus Abdominis (anti-extension), External Obliques | **High** - the ab wheel rollout places the rectus abdominis in its most *lengthened* position under load (arms overhead, hips extended); limited shoulder flexion or thoracic extension caps how far the rollout can extend, directly limiting the loaded stretch depth\[^1\]\[^2\]\[^7\]\[^8\] | Ab Wheel Rollout, Barbell Rollout, TRX Fallout, Dragon Flag |
| **4** | **Rotational Thoracic ROM (Trunk Rotation)** | T-spine rotation | External Obliques, Internal Obliques | **Medium-High** - oblique fiber orientation runs diagonally; limited thoracic rotation restricts how far rotational exercises (woodchops, cable rotations, bicycle crunches) can travel; cutting the rotation range short removes the oblique''s fully shortened contracted position\[^9\]\[^10\]\[^11\]\[^12\] | Cable Woodchop, Russian Twist, Bicycle Crunch, Cable Rotation |
| **5** | **Hip Flexion Depth (Hanging / Leg Raise ROM)** | Coxofemoral joint | Rectus Abdominis (lower fibers), Hip Flexors, Obliques | **Medium** - hanging leg raises and reverse crunches are the best lower ab / hip flexion loading tools; limited hip flexion (hip flexor weakness, not tightness) prevents reaching full hip flexion (pelvis posteriorly tilted and thighs at or past parallel), directly reducing lower rectus abdominis peak contraction\[^6\]\[^9\] | Hanging Leg Raise, Captain''s Chair Raise, Reverse Crunch, V-Up |

---', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: Exercise Library', '### Cable Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Cable Crunch (Kneeling, Rope)** | Cable | Rectus Abdominis | External Obliques, Hip Flexors | High | Spinal flexion ROM - hips must stay fixed; only the spine should flex\[^3\]\[^4\]\[^5\] | Spine fully extended, torso upright, cable at stretch - RA fully lengthened | Spine fully flexed, ribcage pulled toward pelvis - peak RA contraction | **High (S-Tier - Best Overall Ab Exercise)** | ① Hips stay locked (no hip flexion drive); ② Curl ribcage toward pelvis - not bowing head to floor; ③ Full stretch at top: allow spine to fully extend before next rep\[^3\]\[^4\]\[^5\] | ⚠️ Hinging at the hips instead of curling the spine - converts to hip flexion and removes RA spinal flexion stimulus entirely; also: insufficient ROM at top (no spinal extension) removes the lengthened stretch position\[^3\]\[^5\] |
| **Cable Crunch (Seated, Bench)** | Cable | Rectus Abdominis | External Obliques | High | Spinal flexion - seated position removes hip-flex cheat mechanism; cable attached behind on bench\[^13\]\[^3\] | Seated upright, rope behind head, spine extended - RA at full length | Spine curled forward, ribcage to lap - peak contraction | **High (A-Tier)** | ① Sit on end of bench facing away from cable; ② Rope behind head; ③ Same ribcage-to-pelvis cue - pure spinal flexion\[^13\]\[^3\] | Using lat pulldown momentum at top - allows cable to extend the spine more than RA ROM can handle, losing control of the stretch position ⚠️\[^3\] |
| **Oblique Cable Crunch (Kneeling)** | Cable | External Obliques, Internal Obliques | Rectus Abdominis | High | Lateral spinal flexion \+ rotation - oblique fiber angle requires lateral crunch pattern, not straight-down\[^6\]\[^13\]\[^9\] | Spine in slight lateral extension toward the loaded side - obliques at full stretch | Lateral spinal flexion, elbow toward opposite hip | **High (A-Tier)** | ① Crunch diagonally to opposite knee - not straight down; ② Hip stays fixed on weighted side; ③ Full lateral extension at top for stretch\[^6\]\[^9\] | ⚠️ Straight-down crunch with oblique cable setup - hits RA instead of obliques; the diagonal path is the entire mechanism\[^6\]\[^9\] |
| **Cable Woodchop (High-to-Low)** | Cable | External Obliques (ipsilateral), Internal Obliques (contralateral) | Rectus Abdominis, Glutes | High | Thoracic rotation ROM \+ shoulder flexion; cable set at high position\[^9\]\[^10\]\[^12\] | Arms extended toward high cable - obliques at full stretch on loaded side | Arms pulled to opposite low hip - obliques fully contracted | **High (A-Tier)** | ① Arms stay extended (elbows locked) - rotation comes from torso; ② Feet planted, rotation from T-spine; ③ Full arc: top to opposite low hip\[^9\]\[^10\]\[^12\] | Bending arms - converts to a lat pulldown/row and removes oblique rotation; also: twisting hips instead of thoracic spine ⚠️\[^12\] |
| **Cable Woodchop (Low-to-High)** | Cable | Internal Obliques (ipsilateral), External Obliques (contralateral) | Rectus Abdominis, Glutes | High | Thoracic rotation ROM; cable at low position - upward diagonal chop\[^13\]\[^9\]\[^12\] | Arms toward low cable - obliques at stretch | Arms extended to opposite high diagonal | **High (A-Tier)** | ① Sa...', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Ab Crunch Machine (Cam-Based)** | Machine | Rectus Abdominis | External Obliques | High | Spinal flexion ROM \+ machine pad position; cam provides superior resistance curve to bodyweight crunch\[^6\]\[^3\] | Machine at full extension (arms/pad back) - RA at full length | Machine fully flexed - ribcage and pelvis at minimum distance | **High (A-Tier)** | ① Full extension at start - let the machine stretch the spine; ② Pure spinal curl - not hip flexion; ③ Slow 2-sec eccentric back to stretch\[^6\]\[^3\] | Jerking through the machine range (not full extension at start) - removes loaded stretch position and converts to shortened-range crunch ⚠️\[^3\] |
| **Decline Bench Ab Machine / Decline Sit-Up** | Machine | Rectus Abdominis, Hip Flexors | External Obliques | High | Spinal flexion \+ decline angle increases ROM at stretch position; weight at chest extends RA range\[^6\]\[^16\] | Supine on decline, torso fully extended (head toward floor) - RA maximally lengthened | Torso fully upright at top, ribcage close to pelvis | **High (A-Tier)** | ① Full supine extension at bottom; ② Hold weight at chest or overhead (harder); ③ Curl to full upright - not just partial lift\[^6\]\[^16\] | ⚠️ Not fully extending at bottom - decline''s unique advantage is the loaded stretch below horizontal; partial ROM from neutral removes this entirely\[^16\] |
| **Captain''s Chair Leg Raise** | Machine | Rectus Abdominis (lower), Hip Flexors | External Obliques, Iliopsoas | High | Hip flexion depth \+ posterior pelvic tilt - arms support body on pads\[^6\]\[^9\] | Legs hanging straight down - RA and hip flexors at full length | Knees at chest, lumbar posteriorly tilted - maximum lower RA contraction | **High (A-Tier)** | ① Posterior pelvic tilt before lifting legs (flatten lower back against pad); ② Knees to chest - not just thighs parallel; ③ Add weight (DB between feet) for progressive overload\[^6\]\[^9\] | ⚠️ Swinging legs without posterior pelvic tilt - hip flexors dominate and lower RA receives minimal stimulus; also: stopping at thigh parallel removes the peak RA contraction at full knee-to-chest position\[^6\]\[^9\] |
| **Roman Chair Sit-Up (Hyperextension Bench)** | Machine | Rectus Abdominis, Hip Flexors | External Obliques, Erectors | High | Spinal flexion from hip-secured position - full spinal extension at start provides maximum RA stretch\[^6\] | Torso fully extended (horizontal or below horizontal) - RA fully lengthened | Torso fully upright or past vertical - RA fully contracted | **High (A-Tier)** | ① Hold weight at chest or behind head; ② Full extension at bottom - let the bench take torso to horizontal or below; ③ Curl to full upright\[^6\] | Not reaching full extension at bottom - removes the maximum RA stretch that is the unique advantage of this machine over a flat floor sit-up ⚠️\[^6\] |
| **Belt Squat / Machine Hip Flexion (Standing)** | Machine | Hip Flexors, Rectus Abdominis (lower) | Iliopsoas | High | Hip flexion ROM - drive knee to chest against belt resistance\[^6\] | Hip at full extension, leg hanging - hip flexors lengthened | Knee at chest, hip fully flexed | **Medium (B-Tier)** | ① Pull knee as high as possible (full hip flexion); ② Ma...', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: Exercise Library - Barbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Barbell Rollout (Ab Wheel Equivalent)** | Barbell | Rectus Abdominis (anti-extension), External Obliques | Lats, Serratus Anterior | High | Shoulder flexion \+ thoracic extension - arms must travel overhead; lumbar must stay neutral throughout\[^1\]\[^2\]\[^7\]\[^8\] | Arms fully extended overhead, body near-horizontal - RA at maximum anti-extension stretch | Arms at 90deg overhead, body in plank start position - RA in shortened anti-extension | **High (S-Tier - Best Anti-Extension Ab Exercise)** | ① Start on knees; ② Extend arms as far as possible while maintaining neutral lumbar (posterior pelvic tilt throughout); ③ Progress distance over time - do NOT sacrifice lumbar neutral for more range\[^1\]\[^2\]\[^7\] | ⚠️ Lumbar hyperextension at full rollout - the spine arches instead of staying neutral; this shifts load to erectors and REMOVES the RA anti-extension tension that is the exercise''s entire stimulus\[^2\]\[^7\] |
| **Weighted Decline Sit-Up (Barbell / Plate)** | Barbell | Rectus Abdominis, Hip Flexors | External Obliques | High | Spinal flexion \+ decline angle; plate held overhead increases lever arm and RA demand\[^6\]\[^16\] | Torso fully extended on decline bench - RA at maximum loaded stretch | Torso fully upright, plate overhead or at chest | **High (A-Tier)** | ① Full extension at bottom; ② Progressive overload: start with plate on chest, progress to overhead; ③ Control eccentric - slow stretch\[^6\]\[^16\] | ⚠️ Plate at chest (not overhead) reduces lever arm - overhead position dramatically increases RA loading for same weight\[^6\] |
| **Good Morning (Spinal Flexion Variation - Light Load)** | Barbell | Erector Spinae, Glutes (primary), Hamstrings | Rectus Abdominis (stabilizer) | High | Hamstring flexibility \+ spinal neutral - this is primarily a posterior chain compound\[^17\]\[^18\] | Hip fully hinged, torso near parallel - erectors and hamstrings at full stretch | Full standing hip extension - erectors shortened | **Low for Core (D-Tier)** | ① Not a primary ab exercise; ② Erectors respond to anti-flexion demand, not spinal flexion; ③ Better back extension movements exist for erector hypertrophy\[^17\] | Over-flexing the lumbar under load - shifts from erector training to injury risk ⚠️\[^17\] |

---', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Weighted Crunch (DB or Plate on Chest)** | Dumbbell | Rectus Abdominis | External Obliques | Medium | Spinal flexion - limited to upper lumbar without decline; flat floor limits full extension at bottom\[^6\]\[^3\] | Flat on floor, arms/weight on chest - RA partially lengthened (not full extension) | Spine curled, ribcage toward pelvis | **Medium (B-Tier)** | ① Weight on chest or overhead; ② Full spinal curl - don''t neck-bob; ③ Progress to decline bench to increase stretch ROM\[^6\]\[^3\] | ⚠️ Neck-bobbing (head only, no spinal curl) - pure neck movement with zero RA involvement; also: flat floor limits how lengthened the RA can be vs. decline\[^3\] |
| **Dumbbell Side Bend** | Dumbbell | External Obliques, Internal Obliques (ipsilateral) | Quadratus Lumborum | Medium-High | Lateral spinal flexion - side bend range determines oblique stretch vs. contraction\[^9\] | Torso tilting toward DB (lateral flexion toward weight) - contralateral obliques at stretch | Torso tilting away from DB - ipsilateral obliques at full contraction | **Medium-High (B-Tier)** | ① Controlled lateral tilt to both sides - stretch is when tilting TOWARD the weight; ② Full ROM - controlled stretch side; ③ Keep movement in the frontal plane (no rotation)\[^9\] | ⚠️ Using two DBs simultaneously - each side works against the other''s gravity, eliminating the stretch-to-contract ROM the exercise requires; must use single DB\[^9\] |
| **Dumbbell Russian Twist (Weighted)** | Dumbbell | External Obliques, Internal Obliques (rotation) | Rectus Abdominis | Medium | Thoracic rotation ROM \+ seated balance; DB held with extended arms increases lever arm\[^9\]\[^10\] | Torso twisted to opposite side from DB - obliques at stretch | Torso twisted toward DB - obliques contracted | **Medium (B-Tier)** | ① Arms extended (harder) or bent (easier); ② Touch DB to floor on each side for full rotation ROM; ③ Feet elevated for more RA involvement\[^9\]\[^10\] | Not reaching floor with DB on each side - short ROM reduces oblique stretch and contraction range ⚠️\[^9\] |
| **Dumbbell Rollout (DB on Floor)** | Dumbbell | Rectus Abdominis (anti-extension) | Lats, Serratus Anterior | High | Shoulder flexion \+ thoracic extension - same mechanism as barbell rollout; hex dumbbells required\[^2\]\[^7\] | Arms fully extended overhead - RA at maximum anti-extension stretch | Arms at 90deg in front | **High (A-Tier)** | ① Hex DBs required; ② Same lumbar-neutral principle as barbell rollout; ③ Progress distance gradually\[^2\]\[^7\] | Same lumbar hyperextension error as barbell rollout ⚠️\[^2\] |
| **Dumbbell Woodchop (Single DB, Both Hands)** | Dumbbell | External Obliques, Internal Obliques | Rectus Abdominis, Glutes | High | Thoracic rotation ROM - DB provides gravity-based resistance; less smooth than cable\[^9\]\[^10\]\[^12\] | Arms reaching to DB position diagonally | Arms pulled through diagonal arc | **Medium-High (B-Tier - Cable preferred for constant tension)** | ① Full diagonal arc - high to low OR low to high; ② Arms extended throughout; ③ T-spine rotation, not hip rotation\[^9\]\[^12\] | Hip rotation instead of thoracic rotation - glutes dominate instead of obliques ⚠️\[^9\] |

---', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: Exercise Library - Bodyweight Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Hanging Leg Raise (Straight Leg)** | Bodyweight | Rectus Abdominis (lower), Hip Flexors | External Obliques | High | Hip flexion depth \+ posterior pelvic tilt; bar grip and shoulder strength can limit hang time\[^6\]\[^9\]\[^19\] | Legs hanging straight down - RA and hip flexors at full length | Legs at or past horizontal, pelvis posteriorly tilted - lower RA and hip flexors contracted | **High (S-Tier)** | ① Dead hang start - full extension; ② Posterior pelvic tilt before raising legs (lower back flattens, pelvis tucks under); ③ Raise legs to horizontal or above - add ankle weights for overload\[^6\]\[^9\]\[^19\] | ⚠️ Swinging legs without posterior pelvic tilt - hip flexors dominate; lower RA receives minimal stimulus; also: stopping at thigh-parallel removes the peak contraction position for lower RA\[^6\]\[^19\] |
| **Hanging Knee Raise** | Bodyweight | Rectus Abdominis (lower, modified), Hip Flexors | External Obliques | Medium-High | Hip flexion \+ grip endurance; bent knee reduces lever arm and posterior pelvic tilt demand\[^6\]\[^9\] | Legs hanging - RA at full length | Knees to chest, pelvis tilted under - RA contracted | **High (A-Tier - Beginner to Intermediate)** | ① Posterior pelvic tilt - same cue; ② Knees to chest at top; ③ Progress to straight leg version\[^6\]\[^9\] | Not progressing to straight leg - bent knee significantly reduces the stimulus vs. straight leg for intermediate lifters ⚠️\[^6\] |
| **Ab Wheel Rollout** | Bodyweight | Rectus Abdominis (anti-extension), External Obliques | Lats, Serratus Anterior, Triceps | High | Shoulder flexion \+ thoracic extension - identical to barbell rollout\[^1\]\[^20\]\[^2\]\[^7\]\[^8\] | Fully extended - body near-horizontal, arms overhead - RA maximally lengthened in anti-extension | Kneeling start position - arms at 90deg | **High (S-Tier)** | ① Posterior pelvic tilt and glute squeeze before rollout begins; ② Extend as far as lumbar neutral permits; ③ Progress by increasing distance over a training cycle\[^1\]\[^20\]\[^2\]\[^7\] | ⚠️ Lumbar hyperextension - the most universal ab wheel error; the lower back must stay neutral throughout; if lumbar arches, reduce the range of motion until neutral can be maintained at full extension\[^20\]\[^2\]\[^7\] |
| **Bicycle Crunch** | Bodyweight | External Obliques, Internal Obliques, Rectus Abdominis | Hip Flexors | Medium-High | Thoracic rotation \+ spinal flexion - two simultaneous ROM demands\[^6\]\[^9\]\[^10\] | Torso extended, legs near-straight - RA and obliques at relative stretch | Torso rotated and curled toward bent knee - obliques and RA contracted | **Medium-High (A-Tier for Obliques)** | ① Posterior pelvic tilt first; ② Rotate torso fully - not just elbow to knee; focus on oblique contraction side; ③ Slow and controlled - not a race\[^6\]\[^9\]\[^10\] | Rushing the motion (high-rep speed) removes all ROM benefit; also: neck pulling instead of oblique rotation ⚠️\[^9\]\[^10\] |
| **V-Up** | Bodyweight | Rectus Abdominis, Hip Flexors | External Obliques | High | Spinal flexion \+ simultaneous hip flexion - most demanding full-ROM bodyweight ab exercise\[^6\] | Fully supine, arms overhead, legs extended - RA at maximum length | ...', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: SFR Quick Reference - Core Ranked by Hypertrophy Priority', '| Priority Tier | Exercise | SFR | Key Strength |
| :---- | :---- | :---- | :---- |
| **S - Best Overall** | Cable Crunch (Kneeling, Rope) | High | Best progressive overload \+ full spinal flexion ROM \+ loaded stretch\[^3\]\[^4\] |
| **S** | Ab Wheel Rollout | High | Maximum RA anti-extension load in fully lengthened position\[^1\]\[^2\]\[^7\] |
| **S** | Hanging Leg Raise (Straight Leg) | High | Best lower RA \+ hip flexor activation; full hip-to-ankle load\[^6\]\[^9\] |
| **S** | Dragon Flag | High | Most advanced - extreme anti-extension overload for RA (advanced only)\[^6\]\[^1\] |
| **A - Excellent** | Cable Woodchop (High-to-Low) | High | Best oblique rotational exercise with constant tension\[^9\]\[^10\]\[^12\] |
| **A** | Oblique Cable Crunch | High | Best loaded lateral oblique isolation\[^6\]\[^13\]\[^9\] |
| **A** | Decline Weighted Sit-Up | High | Full RA stretch via decline \+ progressive load\[^6\]\[^16\] |
| **A** | Roman Chair Sit-Up (Loaded) | High | Full RA stretch from hip-secured position below horizontal\[^6\] |
| **A** | Ab Crunch Machine | High | Cam resistance curve; full ROM stretch at start\[^6\]\[^3\] |
| **A** | Captain''s Chair Leg Raise (Weighted) | High | Lower RA \+ hip flexor with progressive load\[^6\]\[^9\] |
| **A** | Cable Woodchop (Low-to-High) | High | Complementary oblique diagonal\[^13\]\[^9\]\[^12\] |
| **A** | Hanging Knee Raise | High | Best starting point before straight leg\[^6\]\[^9\] |
| **A** | V-Up | High | Full bodyweight RA ROM - both ends simultaneously\[^6\] |
| **A** | Bicycle Crunch | Medium-High | Best oblique \+ RA combined bodyweight exercise\[^6\]\[^9\] |
| **A** | Standing Cable Crunch (Bent Over) | High | Heavier load capacity than kneeling; hip hinge adds stretch\[^13\]\[^3\] |
| **A** | Cable Seated Crunch (Bench) | High | Hip-flexion cheat eliminated\[^13\]\[^3\] |
| **A** | Barbell Rollout | High | Heavy rollout with barbell - more load than ab wheel\[^2\]\[^7\] |
| **B - Good** | Dumbbell Rollout | High | Good rollout substitute\[^2\]\[^7\] |
| **B** | Weighted DB Crunch | Medium | Load limited vs. cable/machine; decline version preferred\[^6\]\[^3\] |
| **B** | Dumbbell Side Bend (Unilateral) | Medium-High | Good lateral oblique stretch\[^9\] |
| **B** | Dumbbell Woodchop | Medium-High | Good oblique tool; cable preferred\[^9\]\[^12\] |
| **B** | Hollow Body Rock | Medium | Isometric RA and TVA\[^21\] |
| **B** | Cable Pallof Press | Medium | Best TVA / anti-rotation tool\[^14\]\[^15\] |
| **C - Moderate** | Russian Twist (Weighted DB) | Medium | Oblique rotation; ROM limited without full floor-touch\[^9\] |
| **C** | Bodyweight Crunch | Low-Medium | No progressive overload; replace with weighted version\[^6\] |
| **C** | Plank | Low-Medium | Anti-extension isometric; requires significant modification to be hypertrophy-productive\[^21\] |
| **C** | L-Sit | Medium | Isometric hip flexor \+ RA; limited hypertrophy ceiling\[^6\] |

---', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: Key Science Notes', '**The Anti-Extension Principle for Core Hypertrophy:**\[^2\]\[^7\]\[^1\]

Ab wheel rollouts, barbell rollouts, and dragon flags train the RA in a *lengthened* position under maximal tension - exactly what the LML hypertrophy research prescribes. These exercises may be superior to spinal flexion exercises for RA proximal hypertrophy specifically, because the RA must produce maximum force against hip extension (gravity) while fully extended. The stretch position here is not a passive stretch but an active high-tension lengthened position - the ideal stimulus condition per Milo Wolf''s framework.\[^22\]\[^23\]

**⚠️ Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus:**

- ⚠️ **Cable Crunch with Hip Hinge:** The single most common cable crunch error directly eliminates RA spinal flexion and converts the exercise to hip flexion (a hip flexor exercise); 100% of the stimulus is lost when this occurs\[^3\]\[^5\]  
- ⚠️ **Hanging Leg Raise Without Posterior Pelvic Tilt:** Without posterior pelvic tilt, the pelvis stays in anterior tilt throughout and the hip flexors (psoas, iliacus, rectus femoris) do 95% of the work; the lower RA never actually shortens; this is the mechanism behind people feeling hanging leg raises "only in the hip flexors"\[^6\]\[^9\]  
- ⚠️ **Ab Wheel Rollout with Lumbar Hyperextension:** The moment the lower back arches, the RA loses anti-extension tension and the exercise becomes a loaded spinal extension - directly harming the lumbar and removing the RA stimulus simultaneously; reduce ROM until neutral lumbar can be maintained at full rollout\[^20\]\[^7\]\[^2\]  
- ⚠️ **Decline Sit-Up Starting at Neutral (Not Full Extension):** The decline bench''s entire hypertrophy advantage over flat floor sit-ups is the lengthened stretch position below horizontal; starting reps from the neutral (seated) position removes this advantage completely\[^16\]\[^6\]  
- ⚠️ **Woodchop with Bent Arms / Hip Rotation:** Bending the arms converts the woodchop to a lat pulldown/row; rotating from the hips instead of the thoracic spine converts it to a hip-dominant rotation - both errors remove oblique spinal rotation stimulus\[^9\]\[^12\]  
- ⚠️ **Neck-Bob Crunches:** Pulling the neck instead of curling the spine produces zero rectus abdominis stimulus; the cervical spine moves, the thoracic and lumbar spines remain static - the RA never shortens meaningfully\[^5\]\[^3\]

**Programming Framework - Four-Category Core Approach:**\[^6\]\[^9\]\[^1\]\[^3\]

1. **Upper RA (spinal flexion):** Cable crunch, machine crunch, decline weighted sit-up - full spinal flexion under load  
2. **Lower RA / Hip Flexion:** Hanging leg raise, captain''s chair, V-up - hip flexion with posterior pelvic tilt  
3. **Obliques (rotation):** Cable woodchop, oblique cable crunch, bicycle crunch - rotational and lateral flexion  
4. **RA Lengthened Anti-Extension:** Ab wheel rollout, barbell rollout, dragon flag - maximum RA stretch under tension

---', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Core Exercise Library: References', '1. [I''m a huge fan of anti-extension moves within ab training, for a ...](https://www.instagram.com/reel/CuW1e5Xsk9Q/) \- Chief among them: you''re training your abs to maintain tension in a lengthened position, and you''re ...  
     
2. [Fix Your Ab Rollouts with Eccentric Isometrics](https://www.advancedhumanperformance.com/blog/fix-your-ab-rollouts-with-eccentric-isometrics) \- Dr. Joel Seedman, Ph.D. The abdominal rollout movement is one of the most effective anti-extension a...  
     
3. [How To Do Cable Crunches for Abs](https://learn.athleanx.com/articles/abs-for-men/cable-cruches) \- Learn how to do the cable crunches for stronger abs and what makes them important for abdominal musc...  
     
4. [Learn the Cable Crunch to Build Yourself a Strong ...](https://barbend.com/cable-crunch/) \- The cable crunch is one of the best tools for the job. It''s weighted, controlled, and well-suited to...  
     
5. [How to PROPERLY Cable Crunch to Shape Your Abs (How to ...](https://www.youtube.com/watch?v=AV5PmZJIrrw&vl=en) \- Learn how to squeeze into that core and I find by starting with that hip flexion and then driving in...  
     
6. [3 Best Ab Exercises and Workouts for a Defined Six Pack](https://legionathletics.com/ab-workouts/) \- The oblique cable crunch, air bicycle, and ab wheel rollout are among my favorites. We''ll be looking...  
     
7. [How To Do Ab Wheel Rollouts](https://www.puregym.com/exercises/abs/ab-wheel-rollouts/) \- The ab wheel rollout is a challenging core exercise that involves maintaining a neutral spine while ...  
     
8. [9 Exercises to Build A Rock Solid Core](https://movementenhanced.com.au/9-exercises-to-build-a-rock-solid-core/) \- The Ab Wheel Rollout is an advanced exercise to build anti-extension strength. When performing this ...  
     
9. [The Best Science-Based Oblique Workout For V-Cut Abs](https://builtwithscience.com/workouts/oblique-workout/) \- 1\) High To Low Cable Woodchoppers ... One of the best oblique ab exercises to start your oblique ab ...  
     
10. [How To Get Ripped Obliques: 3 BEST Oblique Exercises You ...](https://www.youtube.com/watch?v=P7iESCcoIaI) \- ... crunches and oblique twists, you need to incorporate into ... One of the best obliques ab exerci...  
      
11. [Cable Twist Up-Down: Exercise Guide, Video, Techniques ...](https://fitwill.app/exercise/0862/cable-twist-up-down/) \- Cable Twist Up-Down is a standing diagonal cable chop that trains the trunk to resist and create rot...  
      
12. [Cable Chops - Form, Muscles Worked, and Variations](https://barbend.com/cable-chop/) \- The cable chop is a movement that can increase core strength, address sport specific training needs,...  
      
13. [9 Best Cable Ab Workouts and Exercises For A Strong Core](https://www.garagegymreviews.com/cable-ab-workouts) \- Looking to take your core training to the next level? Cable ab workouts prove that you can do plenty...  
      
14. [How To Do The Pallof Press \- Cable & Band Variations (Sets ...](https://www.youtube.com/watch?v=0WtwA3p_OmQ) \- In this video we''re gonna demo it both with a traditional cable and with a band variation so you can...  
      
15. [Cable Pallof Press \- Exercise Guide](https://motra.com/exercises/cablePallofPress) \- Attach a single handle to a cable machine at chest height. Stand perpendicular to the machine with f...  
      
16. [Decline Crunch: How-to, Tips, Variations & Mistakes](https://www.hevyapp.com/exercises/how-to-decline-crunch/) \- Both ex...', 'ROMRx Bodybuilding KB - Core.md', ARRAY['bodybuilding','core','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: Overview', '# ROMRxBB - Forearms Exercise Library
### Stretch-Mediated Hypertrophy Edition | Flexors (FCR, FCU, FDS, FDP) · Extensors (ECR, ECU, ED) · Brachioradialis · Pronator Teres · Supinator

> **Critical Anatomy Context - The Forearm Is Three Separate Muscles Groups:** Unlike most body parts in this series, "forearms" contains three functionally distinct muscle populations that require different exercises: **(1) Wrist Flexors** (flexor carpi radialis/ulnaris, flexor digitorum superficialis/profundus) - trained with wrist flexion; **(2) Wrist Extensors** (extensor carpi radialis/ulnaris, extensor digitorum communis) - trained with wrist extension; **(3) Brachioradialis** - trained with elbow flexion in neutral-to-pronated forearm position (hammer curl / reverse curl). These three groups have separate MEV/MRV landmarks and can be trained on the same day or split without issue. The most frequent hypertrophy programming error is training only one of the three (most commonly only brachioradialis via hammer curls) and neglecting wrist flexion/extension entirely. A critical Israetel/RP insight: **the standard bench wrist curl produces active insufficiency at peak contraction before wrist ROM is exhausted** - the cable wrist curl is mechanically superior because it maintains resistance at the lengthened (bottom stretch) position where gravity provides none. Exercises where limited ROM **directly reduces hypertrophic stimulus** are flagged with ⚠️.[^1][^2][^3]

***', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: ROM Hierarchy for Forearms - Top 5 Limiters', '| Rank | ROM Limiter | Joint / Movement | Muscle Affected | Impact on Hypertrophy | Most Affected Exercises |
|------|------------|-----------------|----------------|----------------------|------------------------|
| **1** | **Wrist Flexion Range (Full Fingertip Extension at Bottom)** | Radiocarpal/wrist joint | Flexor Carpi Radialis, Flexor Carpi Ulnaris, FDS, FDP | **Critical** - the full wrist flexion ROM starts with fingers *open/extended* (bar in fingertips), then closes the fingers and curls the wrist to full flexion; cutting this short by starting with a closed fist removes the finger flexor portion and at least 30-40deg of loaded wrist ROM; RP explicitly notes: "It''s easy to make tiny cuts to ROM when wrist curling, and you can seem to hit lots of PRs in a row by making such cuts - but you''re not maximizing hypertrophy"[^1][^2][^4] | Barbell Wrist Curl, DB Wrist Curl, Cable Wrist Curl, Behind-the-Back Wrist Curl |
| **2** | **Wrist Extension Range at the Top of Curl (Loaded Stretch)** | Radiocarpal/wrist joint | Wrist Flexors (lengthened stretch position) | **High** - the bottom of the wrist curl (wrist in extension / dropped position) represents the lengthened position for the flexors; gravity provides NO resistance at this position during bench wrist curls, making it the most under-loaded part of the ROM; cable wrist curls resolve this by maintaining tension at the stretch; this is the #1 mechanical deficiency of gravity-based forearm curls[^2] | DB Bench Wrist Curl, Barbell Bench Wrist Curl - both partially resolved by cable variations |
| **3** | **Elbow Flexion Position (Brachioradialis Mechanical Advantage)** | Elbow (humeroulnar) joint + forearm rotation | Brachioradialis | **High** - the brachioradialis is monoarticular and its line of pull is mechanically optimal when the forearm is in the neutral-to-pronated range; supinated grip reduces brachioradialis contribution significantly; fully extended elbow (arm hanging straight) reduces the brachioradialis''s moment arm; elbow at 90deg with neutral grip = peak brachioradialis activation[^2][^5][^6] | Hammer Curl, Reverse Curl, Cable Rope Curl - elbow must be brought through full 0deg-130deg for full stimulus |
| **4** | **Forearm Rotation (Pronation / Supination Full Arc)** | Proximal and distal radioulnar joints | Pronator Teres, Supinator | **Medium-High** - these muscles are primarily trained through forearm rotation; limited pronation/supination ROM reduces the stretch-to-contraction arc that produces hypertrophic tension; most common in stiff-wristed lifters who only train elbow flexion[^7][^8][^9][^10] | Dumbbell Pronation/Supination, Wrist Roller (full rotation), Sledgehammer Pronation |
| **5** | **Wrist Extension Range (for Extensor Hypertrophy)** | Radiocarpal/wrist joint | Extensor Carpi Radialis/Ulnaris, Extensor Digitorum | **Medium** - the wrist extensors are trained with reverse wrist curls; their stretch position is wrist fully flexed (dropped), which is opposite to the flexors; limited wrist extension range caps the peak contraction of the extensors; the extensors are rarely limited by flexibility but commonly limited by joint discomfort at extremes of wrist extension[^2][^11][^4] | Reverse Wrist Curl (Barbell/DB/Cable), Wrist Extension over Bench |

***', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]);

INSERT INTO public.rombot_knowledge (sport, topic, chunk, source_citation, tags) VALUES
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: Exercise Library', '### Cable Exercises

| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Cable Wrist Curl (One-Hand, Low Pulley)** | Cable | Wrist Flexors (FCR, FCU, FDS, FDP) | Pronator Teres | High | Wrist flexion - cable attachment allows tension at the fully extended (stretched) wrist position, resolving the primary deficiency of gravity-based wrist curls[^2] | Wrist fully extended (dropped), fingers open, cable pulling hand downward - flexors at maximum loaded stretch | Wrist fully flexed, fist closed, forearm pronated | **High (S-Tier - Best Forearm Flexor Exercise per Israetel)** | ① Stand with back to low cable, arm at side; ② Start: open fingers fully and let wrist extend fully toward floor; ③ Curl: close fingers first, then flex wrist to full contraction[^2][^4] | ⚠️ Not opening fingers at the bottom - starts rep from partial wrist extension, removing the fully loaded stretch the cable uniquely provides; also: too heavy prevents full ROM[^2] |
| **Cable Reverse Wrist Curl (One-Hand, Low Pulley)** | Cable | Wrist Extensors (ECR, ECU, ED) | Pronator Teres, Anconeus | High | Wrist extension - cable maintains tension at flexed (dropped) wrist - the stretch for extensors[^2] | Wrist fully flexed (dropped) - extensors fully lengthened under cable tension | Wrist fully extended (raised), knuckles up | **High (A-Tier - Best Extensor Exercise)** | ① Forearm pronated (palm down) on support; ② Full wrist drop at bottom; ③ Curl knuckles up to full wrist extension[^2][^11] | Not reaching full wrist drop at bottom - partial ROM removes extensor stretch position ⚠️[^2] |
| **Cable Hammer Curl (Rope, Low Pulley)** | Cable | Brachioradialis (primary), Brachialis | Biceps Brachii, Wrist Flexors | High | Elbow flexion 0-130deg + neutral forearm rotation throughout; rope maintains constant tension profile vs. dumbbell[^2][^12] | Arm fully extended at bottom - brachioradialis at full length | Elbow fully flexed (~130deg), neutral grip at shoulder height | **High (S-Tier)** | ① Neutral grip (palms facing each other) throughout - do NOT supinate; ② Full arm extension at bottom; ③ Rope allows slight wrist curl at top for added brachioradialis peak contraction[^2][^12] | ⚠️ Supinating the wrist at top - shifts load to biceps brachii and reduces brachioradialis stimulus; also: elbows flaring removes elbow flexion axis[^2][^12] |
| **Cable Reverse Curl (Straight Bar or EZ Attachment)** | Cable | Brachioradialis, Wrist Extensors | Brachialis, Biceps Brachii | High | Elbow flexion + pronated forearm - pronation reduces biceps mechanical advantage and maximizes brachioradialis and extensor demand[^2][^5] | Arm fully extended, pronated grip - brachioradialis and extensors at full length | Elbow at full flexion, pronated grip maintained | **High (A-Tier)** | ① Pronated (overhand) grip; ② Keep wrist straight - no wrist flexion cheat; ③ Control the eccentric to maximize loaded stretch[^2][^5] | ⚠️ Wrist flexing under load - partial wrist curl converts some brachioradialis demand to wrist flexor; also: elbow flare at top shortens the ROM[^2][^5] |
| **Cable Wrist Roller (Rope Wind)** | Cable | Wrist Flexors AND Extensors (alternating), Pronator Teres, Supinator | Brachioradialis, Grip | High | Full pronation-to-supination arc with added wrist flexion-extension; the cable ro...', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: Exercise Library - Barbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Barbell Standing Wrist Curl (Behind-the-Back)** | Barbell | Wrist Flexors (FCR, FCU, FDS) | Pronator Teres | High | Wrist flexion - standing position with bar behind hips allows more ROM than bench variation; fingers can fully open at bottom[^1][^13][^4] | Bar in fingertips, wrist fully extended - flexors at maximum stretch | Wrist fully flexed, fingers curled tight around bar | **High (S-Tier per RP Strength)** | ① Bar behind hips, arms at sides; ② Let bar roll to fingertips at bottom (full extension); ③ Curl fingers first, then wrist - full contraction at top[^1][^13] | ⚠️ Not letting bar roll to fingertips - removes the finger-closing portion of the movement and reduces ROM by ~40%; most common wrist curl form error[^1][^13] |
| **Barbell Bench Wrist Curl (Forearms on Bench, Overhang)** | Barbell | Wrist Flexors (FCR, FCU) | FDS, Pronator Teres | High | Wrist flexion - forearms resting on bench; known limitation: gravity provides zero tension at the stretched (fully extended wrist) position[^2][^4] | Wrist dropped fully off bench edge - partial stretch (gravity provides no tension here) | Wrist fully flexed, fingers curled | **Medium-High (B-Tier)** | ① Wrists off bench edge; ② Fingers open at bottom (even if gravity doesn''t load it); ③ Full wrist flexion at top with brief hold[^1][^2] | ⚠️ Wrists not hanging over bench edge - entire lengthened position is removed; gravity cannot load the wrist drop; cable preferred for this reason[^2] |
| **Barbell Reverse Wrist Curl (Forearms on Bench, Pronated)** | Barbell | Wrist Extensors (ECR, ECU, ED) | Pronator Teres | High | Wrist extension - forearms pronated on bench; extensors have less insufficiency issue than flexors in this position[^2][^11] | Wrist dropped toward floor (full wrist flexion) - extensors at full length | Wrist raised (full wrist extension), knuckles up | **High (A-Tier)** | ① Forearms fully supported on bench, wrists over edge; ② Full wrist drop at bottom; ③ Raise knuckles to full extension - hold briefly[^2][^11] | Not reaching full wrist drop - partial stretch reduces extensor loading ⚠️[^2][^11] |
| **Barbell Reverse Curl** | Barbell | Brachioradialis, Brachialis, Wrist Extensors | Biceps Brachii (suppressed) | High | Elbow flexion 0-130deg + pronated forearm - EZ bar reduces wrist discomfort vs. straight bar[^2][^5][^4] | Arms fully extended, pronated grip - brachioradialis at full length | Elbow fully flexed, wrists straight | **High (A-Tier)** | ① Pronated grip - stay pronated throughout; ② Straight wrist (no wrist curl cheat); ③ Full arm extension at bottom for complete brachioradialis stretch[^2][^5] | ⚠️ Wrists flexing at top - reduces brachioradialis peak contraction and shifts load to flexors; EZ bar recommended to reduce wrist strain[^2][^5] |
| **Barbell Isometric Hold (Towel Grip Variation)** | Barbell | Finger Flexors (FDP, FDS), Grip/Intrinsic Hand Muscles | Brachioradialis, Wrist Flexors | Low (isometric) | Grip endurance - no dynamic ROM; dynamic training is superior for hypertrophy; useful for grip strength only[^2][^4] | N/A - isometric | N/A - isometric | **Low (C-Tier for Hypertrophy)** | ① Towels wrapped around bar add grip challenge; ② 30-45 sec holds; ③ Not a hypertrophy priority - use for gr...', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: Exercise Library - Dumbbell Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Dumbbell Wrist Curl (One-Hand, on Bench)** | Dumbbell | Wrist Flexors (FCR, FCU, FDS) | Pronator Teres | High | Wrist flexion - same gravity limitation as barbell bench version; single DB allows better wrist ROM and can be loaded unilaterally[^1][^13][^4] | Wrist dropped fully, fingers open, DB in fingertips | Wrist fully flexed, fingers curled tight around DB | **High (A-Tier)** | ① Forearm flat on thigh or bench; ② DB in fingertips at bottom; ③ Single-arm allows focus on full ROM quality[^1][^13][^4] | ⚠️ DB starting in palm (closed fist) - removes finger flexor contribution and reduces full ROM by ~40%[^1][^13] |
| **Dumbbell Standing Wrist Curl** | Dumbbell | Wrist Flexors (FCR, FCU) | FDS, Pronator Teres | High | Wrist flexion; standing version offers more consistent tension profile than bench variation[^1][^13] | DB in fingertips, wrist dropped - same limitation as bench: no gravity at stretch | Wrist fully flexed at top | **High (A-Tier per RP)** | ① Arms at sides, DB in fingertips at bottom; ② Curl fingers then wrist; ③ Progress consistently - this is Nippard''s S-Tier wrist curl variation[^14][^4][^15] | Same fingertip-to-fist ROM truncation ⚠️[^1][^13] |
| **Dumbbell Hammer Curl** | Dumbbell | Brachioradialis, Brachialis | Biceps Brachii, Wrist Flexors | High | Elbow flexion 0-130deg; neutral grip (palms facing body) maintained throughout[^2][^12][^6] | Arm fully extended, neutral grip - brachioradialis at full length | Elbow fully flexed, DB at shoulder height | **High (S-Tier per Nippard)** | ① Neutral grip (palms facing each other) - do NOT supinate; ② Full arm extension at bottom; ③ Control the eccentric - 2-sec lower[^2][^12][^14] | ⚠️ Wrist supinating at top - shifts stimulus from brachioradialis to biceps; very common; the neutral wrist is the entire mechanism of this exercise[^2][^12] |
| **Dumbbell Reverse Curl** | Dumbbell | Brachioradialis, Wrist Extensors | Brachialis, Biceps Brachii | High | Elbow flexion + maintained pronation[^2][^5] | Arms fully extended, pronated grip | Elbow fully flexed, pronated | **High (A-Tier)** | ① Pronated grip throughout; ② Straight wrist; ③ EZ bar or DB - DB allows independent wrist angle per arm[^2][^5] | Wrist flexing mid-rep ⚠️[^2][^5] |
| **Dumbbell Pronation/Supination (Elbow at 90deg)** | Dumbbell | Pronator Teres (pronation phase), Supinator (supination phase) | Brachioradialis | High | Full forearm rotation arc - hold at end of each position briefly[^8][^9][^16] | Fully supinated (palm up) - pronator teres at stretch | Fully pronated (palm down) - pronator teres at peak contraction | **Medium-High (B-Tier)** | ① Elbow fixed at 90deg, forearm unsupported; ② Full supination to full pronation arc - windshield wiper motion; ③ Slow and controlled - momentum defeats the exercise[^8][^9][^16] | Short arc (only going to neutral from either end) - removes stretch position of either pronator teres or supinator ⚠️[^8][^9] |
| **Dumbbell Reverse Wrist Curl (One-Hand, on Bench)** | Dumbbell | Wrist Extensors (ECR, ECU, ED) | Pronator Teres | High | Wrist extension - pronated forearm on bench, wrist over edge[^2][^11] | Wrist dropped fully (flexed) - extensors at maximum stretch | Wrist fully extended (raised), knuckles up | **High (A-T...', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: Exercise Library - Machine Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Machine Wrist Curl (Cam-Based)** | Machine | Wrist Flexors (FCR, FCU, FDS) | Pronator Teres | High | Wrist flexion - machine cam provides better resistance curve than gravity at the stretched position; eliminates the gravity-at-bottom limitation[^1][^2] | Machine at full extension (wrist fully extended) - cam provides resistance at stretch | Machine at full flexion - wrist fully contracted | **High (A-Tier)** | ① Full extension at start - allow machine to pull wrist to stretched position; ② Curl to full contraction; ③ Slow eccentric[^1][^2] | Not reaching full extension at start - removes the machine''s primary advantage over free weight versions ⚠️[^2] |
| **Machine Reverse Wrist Curl** | Machine | Wrist Extensors (ECR, ECU, ED) | Pronator Teres | High | Wrist extension - cam maintains resistance at wrist flexed (stretched) position[^2][^11] | Wrist fully flexed at machine start - extensors at loaded stretch | Wrist fully extended at machine contraction point | **High (A-Tier)** | ① Full flexion at bottom; ② Raise wrist to full extension; ③ Slow eccentric[^2][^11] | Not using full wrist drop at start ⚠️[^2] |
| **Machine Hammer Curl / Neutral Grip Machine Curl** | Machine | Brachioradialis, Brachialis | Biceps Brachii | High | Elbow flexion - machine cam provides resistance profile improvement over gravity for brachioradialis at extended elbow position[^2][^12] | Arm fully extended on pad - brachioradialis at full length | Elbow fully flexed | **High (A-Tier)** | ① Neutral grip (palms facing each other) on machine; ② Full arm extension; ③ Machine stability allows focus on brachioradialis contraction[^2][^12] | Supinating at top of machine - forearm rotation on a neutral-grip machine defeats brachioradialis loading ⚠️[^2] |
| **Wrist Roller (Plate Loaded)** | Machine | Wrist Flexors (wind-up phase), Wrist Extensors (reverse phase), Pronator Teres, Supinator | Brachioradialis, Grip, Anterior Deltoid | High | Full wrist rotation + elbow flexion; standing on elevated surface allows full cable unwind; arms must stay close to body[^2][^4] | Rope fully extended - wrist at end-range extension in target direction | Rope fully wound - wrist at full flexion in target direction | **High (A-Tier - Especially for Volume and Metabolic Stress)** | ① Stand on elevated platform; ② Arms slightly bent and at sides (NOT extended forward); ③ Roll forward AND backward for flexors AND extensors[^2][^4] | ⚠️ Arms extended forward - anterior delts fatigue before forearms; elbows must stay at or near 90deg[^4] |
| **Hand Gripper (Captain of Crush / Heavy Grips)** | Machine | Flexor Digitorum Profundus, Flexor Digitorum Superficialis | Wrist Flexors, Intrinsic Hand Muscles | High | Full open-to-close finger flexion arc; fully opening gripper to widest position is the ROM cue most lifters skip[^1][^2] | Gripper fully open - finger flexors at maximum stretch | Gripper fully closed - held for 1 sec | **Medium-High (B-Tier for Finger Flexors Specifically)** | ① Open gripper FULLY at start - hold briefly in open position; ② Close to full closure; ③ Train 10-20 rep range per Israetel; avoid cheap grippers[^1][^2] | ⚠️ Not fully opening gripper between reps - removes the stretched position that recruits the fast moto...', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: Exercise Library - Bodyweight Exercises', '| Exercise Name | Equipment | Primary Muscle | Secondary Muscle | ROM Demand | Key ROM Limitation | Stretch Position | Peak Contraction | Hypertrophy Rating (SFR) | Technique Cues (3 max) | Common ROM Error |
|---|---|---|---|---|---|---|---|---|---|---|
| **Dead Hang (Pull-Up Bar)** | Bodyweight | Finger Flexors (FDP, FDS), Wrist Flexors (isometric) | Brachioradialis, Lats | Low (isometric) | Grip endurance - no wrist ROM; isometric under bodyweight; superior to farmer carry for shoulder health[^2][^19] | N/A - isometric hang | N/A - isometric | **Low (C-Tier for Hypertrophy, A-Tier for Grip Endurance)** | ① Full dead hang - shoulders not shrugged; ② Add weight for progressive overload; ③ Use for grip endurance and shoulder health, not primary forearm mass builder[^2][^19] | ⚠️ Dead hang as primary forearm hypertrophy tool - same isometric limitation as farmer carry; Israetel''s explicit note: dynamic training grows muscles, isometrics do not[^2] |
| **Towel Pull-Up** | Bodyweight | Finger Flexors, Wrist Flexors, Brachioradialis | Lats, Biceps | Medium | Grip width and friction - towels require constant dynamic grip adjustment throughout the pull; elbow flexion ROM same as pull-up[^4] | Hanging - finger flexors and wrist under constant towel-resistance load | Top of pull-up - elbows fully flexed | **Medium (B-Tier)** | ① Towels draped over pull-up bar; ② Full hang at bottom; ③ Forearms the limiting factor - use chalk; control eccentric[^4] | Arms not fully extended at bottom - forearm loaded portion is compressed ⚠️[^4] |
| **Resistance Band Wrist Curl** | Bodyweight | Wrist Flexors (FCR, FCU) | FDS | High | Wrist flexion - band provides increasing resistance toward peak contraction (progressive resistance = peaks at contraction, low at stretch - opposite of what cable solves)[^13] | Wrist fully extended, band under foot - band provides minimal tension at stretch | Wrist fully flexed - band at maximum tension | **Medium (B-Tier)** | ① Band under foot; ② Full wrist drop at bottom; ③ Functional substitute when cable unavailable[^13] | Not fully dropping wrist at bottom ⚠️[^13] |
| **Resistance Band Reverse Wrist Curl** | Bodyweight | Wrist Extensors (ECR, ECU, ED) | Pronator Teres | High | Wrist extension - band resistance profile same limitation as flexor version[^13][^11] | Wrist fully flexed - extensors at stretch | Wrist fully extended | **Medium (B-Tier)** | ① Band under foot, pronated grip; ② Full wrist drop; ③ Substitute when machine unavailable[^13][^11] | Not reaching full drop ⚠️[^13] |
| **Plate Pinch (Index+Thumb or Full-Hand)** | Bodyweight | Pinch Flexors (Finger Flexors + Adductor Pollicis + FPL) | FDP, FDS | Low (isometric) | Pinch grip endurance - static hold; different from power grip; useful for digit flexor specialization[^4] | N/A - isometric | N/A - isometric | **Low (C-Tier for Hypertrophy, B-Tier for Pinch Strength)** | ① Two plates face-together (smooth sides out); ② Hold as long as possible; ③ Progress from 2x10 lb to 2x25 lb plates[^4] | Using full-hand grip instead of pinch - converts from digit-isolation to standard farmer carry ⚠️[^4] |

***', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: SFR Quick Reference - Forearms Ranked by Hypertrophy Priority', '*(Organized by muscle group - all three require independent programming)*', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: SFR Quick Reference - Forearms Ranked by Hypertrophy Priority - Wrist Flexors', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best** | Cable Wrist Curl (One-Hand, Low Pulley) | High | Only option that loads the stretched wrist position; resolves gravity limitation of all bench/standing variants[^2] |
| **S** | Barbell Standing Behind-the-Back Wrist Curl | High | Israetel''s #1 barbell flexor exercise; full fingertip-to-fist ROM[^1][^13] |
| **A** | Dumbbell Standing Wrist Curl | High | Nippard S-Tier; full ROM with unilateral focus[^14][^4][^15] |
| **A** | Machine Wrist Curl | High | Cam provides resistance at stretch - best machine option[^1][^2] |
| **A** | Dumbbell Bench Wrist Curl (One-Hand) | High | Excellent if fingertip ROM maintained[^1][^13][^4] |
| **B** | Barbell Bench Wrist Curl | Medium-High | Good load; gravity limitation at stretch; fingertip ROM critical[^2] |
| **B** | Resistance Band Wrist Curl | Medium | Functional substitute; reversed resistance profile vs. cable[^13] |', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: SFR Quick Reference - Forearms Ranked by Hypertrophy Priority - Wrist Extensors', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best** | Cable Reverse Wrist Curl (One-Hand) | High | Constant tension at stretch; best extensor exercise[^2] |
| **A** | Barbell Reverse Wrist Curl (Bench) | High | Extensors have less insufficiency issue; reliable overload[^2][^11] |
| **A** | Machine Reverse Wrist Curl | High | Cam advantage for extensors[^2][^11] |
| **A** | Dumbbell Reverse Wrist Curl | High | Unilateral extensor work[^2][^11] |
| **B** | Wrist Roller (Reverse phase) | High | Both flexors and extensors; metabolic stress emphasis[^2][^4] |', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: SFR Quick Reference - Forearms Ranked by Hypertrophy Priority - Brachioradialis', '| Priority Tier | Exercise | SFR | Key Strength |
|---|---|---|---|
| **S - Best** | Cable Hammer Curl (Rope) | High | Constant tension + neutral grip; Nippard/Israetel consensus best brachioradialis exercise[^2][^14] |
| **S** | Dumbbell Hammer Curl | High | Simple, heavy, progressive; Nippard S-Tier[^14][^4][^15] |
| **A** | Barbell Reverse Curl (EZ Bar) | High | Heavy brachioradialis load; wrist discomfort reduced with EZ bar[^2][^5] |
| **A** | Cable Reverse Curl | High | Constant tension at full arm extension[^2][^5] |
| **A** | Machine Hammer/Neutral Curl | High | Cam advantage; stability for isolation[^2][^12] |
| **B** | Dumbbell Reverse Curl | High | Slightly less load than barbell; good alternative[^2][^5] |
| **C** | Farmer''s Carry | Low | Grip strength only; isometric = suboptimal hypertrophy[^2] |
| **C** | Dead Hang | Low | Grip endurance; isometric = suboptimal hypertrophy[^2] |

***', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: Key Science Notes', '**The Cable vs. Gravity Problem - Why Most Wrist Curls Underperform:**[^2]

Israetel (RP Strength) identifies this as the central mechanical deficiency in forearm training: when performing wrist curls with free weights on a bench, gravity provides no resistance at the fully dropped (stretched) wrist position. This means the exercise is loaded only through the mid-range to peak contraction - a "shortened partial" profile. The cable wrist curl (low pulley, back to cable, arm at side) resolves this by pulling the hand downward and backward, maintaining resistance at the fully extended wrist. This makes the cable variation *mechanically superior to any gravity-based wrist curl* at any weight, not just as a convenience substitute. The analogy in this series is the seated leg curl (trained at hip-flexed position) vs. prone leg curl - the resistance profile matters as much as the exercise choice.

**Three Separate Training Prescriptions Required:**[^3][^1][^2]

The most common forearm programming error: treating "forearms" as one muscle group, training only brachioradialis (hammer curls from arm training), and leaving flexors and extensors completely untrained. Israetel''s RP framework prescribes:
- **Wrist Flexors:** 3-6 sets/week → scale to 8-24 sets/week MAV; best trained after pull/bicep work (warm-up benefit)
- **Wrist Extensors:** 5-10 sets/week → scale to 8-24 sets/week MAV; can be done any time, any day
- **Brachioradialis:** Often already at MEV from compound pulling; add 2-3 sets of hammer/reverse curls per session for hypertrophy focus

**⚠️ Exercises where limited ROM DIRECTLY reduces hypertrophic stimulus:**[^4][^1][^2]

- ⚠️ **Wrist Curl Starting With Closed Fist:** Beginning reps with the DB/bar in the palm (fist closed) instead of in the fingertips removes 30-40% of the wrist flexion ROM; the fingertip → palm portion is where the finger flexors fire and where the early wrist extension is loaded; this directly reduces FDS/FDP stimulus and shortens the total flexor ROM[^13][^1][^4]
- ⚠️ **Hammer Curl With Wrist Supination at Top:** Supinating the wrist at the peak of a hammer curl converts the exercise from a brachioradialis-dominant movement to a biceps-dominant movement; the brachioradialis is mechanically disadvantaged in supination; the neutral grip throughout is the entire mechanism[^12][^2]
- ⚠️ **Isometric Holds as Primary Forearm Training (Farmer Carry, Dead Hang):** These produce grip strength via neural adaptation and connective tissue toughening but negligible myofibrillar hypertrophy; Israetel (RP): "isometric training, like merely holding on to a barbell, is suboptimal for hypertrophy"; the forearms need dynamic ROM with progressive overload[^2]
- ⚠️ **Barbell Bench Wrist Curl Without Fingertip Rollout:** If the wrist never drops fully and the bar stays in the palm, the loaded ROM is only the top ~60% of wrist flexion - the loaded stretch position is entirely absent due to gravity[^1][^2]
- ⚠️ **Wrist Roller With Arms Fully Extended:** Arms fully extended forward loads the anterior deltoid as the limiting factor before the forearms are adequately challenged; arms at or near 90deg elbow flexion keeps delts sub-maximal and forearms as the primary limiter[^4][^2]

**Programming Summary - The Three-Category Approach:**[^15][^3][^1][^2]
1. **Wrist Flexors:** Cable wrist curl or behind-the-back barbell wrist curl - 3-6 sets per session, 10-20 reps; train after pulling work for warm wrist joints
2. **Wrist Extensors:** Rever...', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'ROMRxBB - Forearms Exercise Library: References', '1. [Forearm Training Guide: Volume, Exercises & Hypertrophy ...](https://rpstrength.com/blogs/articles/forearm-hypertrophy-training-tips) - Struggling with weak forearms? Dr. Mike Israetel shares proven methods for forearm hypertrophy, incl...

2. [Forearm Training, Demystified](https://rpstrength.com/blogs/articles/forearm-training-demystified) - My opinion is that for effective hypertrophy training it is best to treat all flexors primarily as o...

3. [How To Grow HUGE Forearms (Best Exercises and Program)](https://www.youtube.com/watch?v=EcLfndWlYB0) - The ALL NEW RP Hypertrophy App: your ultimate guide to training for maximum muscle growth-https://rp...

4. [How To Build Huge Forearms: Optimal Training Explained (5 ...](https://www.youtube.com/watch?v=MfMxT_jXcPE) - In this video we''re looking at proper technique on a variety of different forearm and grip exercises...

5. [Reverse Curl Exercise Tutorial | Fast Track Forearm Growth ...](https://www.youtube.com/watch?v=ypfd1kaI1AU) - It''s going to be very simple movements and isolation exercises utilizing flexion and extension of yo...

6. [Understanding the Role of Hammer Curls in Brachialis Bias](https://www.tiktok.com/@ryjewers/video/7426849831815171334?lang=en) - Hammer curls serve as an overall exercise for elbow flexors, shifting the emphasis to the Brachiorad...

7. [Flexor-Pronator Mass Training Exercises Selectively Activate ...](https://ijspt.scholasticahq.com/article/68073-flexor-pronator-mass-training-exercises-selectively-activate-forearm-musculature) - The findings of the current study suggest that ulnar deviation and pronation exercise using resistan...

8. [Best Exercises for Stronger Pronator Teres: Simple Tips ...](https://gym-mikolo.com/blogs/home-gym/best-exercises-for-stronger-pronator-teres-simple-tips-for-forearm-strength) - Grip a hammer or bar at one end. Rotate your wrist inward (pronation) and outward (supination). Focu...

9. [How Do You Build Your Pronator Muscle?](https://thepronator.com/blogs/news/how-do-you-build-your-pronator-muscle) - Exercises to Build the Pronator Muscles · 1. Pronation and Supination with a Dumbbell · 2. Hammer Cu...

10. [Forearm Pronation & Supination -- Forearm pronation and ...](https://www.instagram.com/reel/DEKB_HlN86h/?hl=en) - Supination is mainly driven by the biceps brachii and the supinatormuscle, both of which work togeth...

11. [Barbell Reverse Wrist Curl: Exercise Guide, Video ...](https://fitwill.app/exercise/3029/barbell-reverse-wrist-curl/) - Barbell Reverse Wrist Curl is a forearm isolation exercise performed with a pronated grip and the fo...

12. ["Why aren''t we doing Hammer Curls for the Brachialis" was ...](https://www.instagram.com/reel/DBXCew1P_Vb/) - In summary I would use a supinated curl to better bias the biceps. I would use a neutral grip curl l...

13. [The 5 Best Exercises To Increase Forearm Size And Strength](https://builtwithscience.com/fitness-tips/forearm-exercises/) - If you want to know which exercises you should be doing to increase forearm size and strength, read ...

14. [Jeff Nippard on Instagram: "Started training forearms more ...](https://www.instagram.com/reel/DQmShjjDiaN/?hl=en) - Best I can do is C-tier. Dumbbell wrist curls. Simple, basic, tried and true muscle builder for the ...

15. [The forearms are one of those muscles most people skip ...](https://www.facebook.com/jeffnippard/posts/the-forearms-are-one-of-those-muscles-most-people-skip-yet-theyre-one-of-the-onl/144282464720268...', 'ROMRx Bodybuilding KB - Forearms.md', ARRAY['bodybuilding','forearms','exercise_library']::text[]),
('bodybuilding', 'Beginner Hypertrophy Program: Program Overview', '**Training Age:** 0-1 year of consistent resistance training  
**Frequency:** 3 days per week (e.g., Monday, Wednesday, Friday)  
**Primary Goal:** Increase skeletal muscle cross-sectional area (CSA) and lean mass  
**Training Split:** Alternating Full Body A / Full Body B  
**Effort Target:** 0-2 reps in reserve (RIR) on most working sets  
**Rest Periods:**

- Compound lifts: 2-3 minutes  
- Isolation lifts: 60-90 seconds

### Weekly Structure

- **Week 1:** Day A / Day B / Day A  
- **Week 2:** Day B / Day A / Day B  
- *(Repeat this two-week alternating pattern)*

---', 'ROMRx Bodybuilding Program - Beginner_Hypertrophy.md', ARRAY['bodybuilding','tier_beginner','training_program']::text[]),
('bodybuilding', 'Beginner Hypertrophy Program: Day A - Full Body A', '### 1\. Back Squat or Leg Press

- **Sets x Reps:** 3 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, glutes, hamstrings

### 2\. Flat Barbell or Dumbbell Bench Press

- **Sets x Reps:** 3 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Pectorals, anterior deltoids, triceps

### 3\. Lat Pulldown or Assisted Pull-Up

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Latissimus dorsi, biceps

### 4\. Romanian Deadlift (RDL)

- **Sets x Reps:** 2 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Hamstrings, glutes, lower back

### 5\. Seated Cable Row or Chest-Supported Row

- **Sets x Reps:** 2 x 8-12  
- **Rest:** 90-120 seconds  
- **Target:** Mid-back, rhomboids, biceps

### 6\. Standing Dumbbell Lateral Raise

- **Sets x Reps:** 2 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Lateral deltoids

### 7\. Cable or Dumbbell Biceps Curl

- **Sets x Reps:** 2 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Biceps brachii

### 8\. Cable or Rope Triceps Press-Down

- **Sets x Reps:** 2 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Triceps brachii

---', 'ROMRx Bodybuilding Program - Beginner_Hypertrophy.md', ARRAY['bodybuilding','tier_beginner','training_program']::text[]),
('bodybuilding', 'Beginner Hypertrophy Program: Day B - Full Body B', '### 1\. Leg Press or Hack Squat

- **Sets x Reps:** 3 x 10-12  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, glutes

### 2\. Incline Dumbbell Bench Press or Machine Press

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Upper pectorals, anterior deltoids, triceps

### 3\. Chest-Supported Row or One-Arm Dumbbell Row

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Upper back, latissimus dorsi, biceps

### 4\. Hip Thrust or Glute Bridge

- **Sets x Reps:** 2 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Glutes, hamstrings

### 5\. Leg Curl (Seated or Lying)

- **Sets x Reps:** 2 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Hamstrings

### 6\. Seated Dumbbell Shoulder Press

- **Sets x Reps:** 2 x 8-12  
- **Rest:** 90-120 seconds  
- **Target:** Deltoids (all heads), triceps

### 7\. Cable Lateral Raise (Light)

- **Sets x Reps:** 2 x 12-15  
- **Rest:** 60-90 seconds  
- **Target:** Lateral deltoids

### 8\. Hanging Knee Raise or Cable Crunch

- **Sets x Reps:** 2 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Abdominals

---', 'ROMRx Bodybuilding Program - Beginner_Hypertrophy.md', ARRAY['bodybuilding','tier_beginner','training_program']::text[]),
('bodybuilding', 'Beginner Hypertrophy Program: Progression Guidelines', '### 1\. Load Selection

Use a weight that allows you to complete all prescribed repetitions with **good form** while leaving **0-2 reps in reserve** (you could perform 0-2 more reps before failure).

### 2\. When to Increase Load

When you can complete the **top end of the rep range** for all sets at the target RIR (0-2) for **two consecutive training sessions**, increase the load by the smallest available increment (typically 2.5-5 lbs for upper body, 5-10 lbs for lower body).

### 3\. Managing Load Increases

If your reps drop more than approximately 3 repetitions below the target range after a load increase, keep the load the same for the next 1-2 sessions until performance stabilizes.

### 4\. Session-to-Session Goals

Aim to increase either **repetitions** (within the prescribed range) or **load** on at least one exercise per training session.

---', 'ROMRx Bodybuilding Program - Beginner_Hypertrophy.md', ARRAY['bodybuilding','tier_beginner','training_program']::text[]),
('bodybuilding', 'Beginner Hypertrophy Program: Evidence-Based Supplements', '### Creatine Monohydrate

- **Dosage:** 3-5 g daily, any time of day  
- **Evidence:** Small but consistent increases in muscle mass and strength when combined with resistance training (meta-analytic effect size \~0.11 for direct hypertrophy measures)

### Protein Powder (Whey/Casein/Blend)

- **Dosage:** Use as needed to reach total daily protein intake of **1.6-2.2 g/kg body weight**  
- **Evidence:** Morton et al. (2018) meta-analysis established a plateau in resistance training-induced fat-free mass gains at approximately 1.6 g/kg/day

---', 'ROMRx Bodybuilding Program - Beginner_Hypertrophy.md', ARRAY['bodybuilding','tier_beginner','training_program']::text[]),
('bodybuilding', 'Beginner Hypertrophy Program: Training Notes', '- **Weekly Volume:** This program delivers approximately 8-10 sets per large muscle group and 6-8 sets per smaller muscle group per week, consistent with beginner volume recommendations.  
    
- **Frequency:** Each muscle group is trained 2-3 times per week through the alternating full-body split, aligning with research showing superior hypertrophy from higher frequencies in beginners.  
    
- **Sex Differences:** Research shows that relative hypertrophy rates are similar between males and females. This program is appropriate for both sexes; load selection will differ based on individual strength levels.  
    
- **Deload:** Beginners typically do not require planned deload weeks in the first 8-12 weeks of training. If performance plateaus or fatigue accumulates, take 2-3 rest days before resuming.

---

**Program designed based on peer-reviewed hypertrophy research including:**

- Schoenfeld et al. (2017, 2019, 2021\) - Volume, frequency, and repetition continuum meta-analyses  
- Morton et al. (2018) - Protein intake systematic review and meta-analysis  
- Robinson et al. (2024) - Proximity to failure dose-response meta-analysis  
- Refalo et al. (2025) - Sex differences in hypertrophy meta-analysis', 'ROMRx Bodybuilding Program - Beginner_Hypertrophy.md', ARRAY['bodybuilding','tier_beginner','training_program']::text[]),
('bodybuilding', 'Intermediate Hypertrophy Program: Program Overview', '**Training Age:** 1-3 years of consistent resistance training  
**Frequency:** 4 days per week (e.g., Monday, Tuesday, Thursday, Friday)  
**Primary Goal:** Increase skeletal muscle CSA and lean mass with higher weekly volume  
**Training Split:** Upper 1 / Lower 1 / Upper 2 / Lower 2  
**Effort Target:** Mostly 1-2 RIR, occasionally 0 RIR on last isolation sets  
**Rest Periods:**

- Compound lifts: 2-3 minutes  
- Isolation lifts: 60-90 seconds

### Weekly Structure

- **Day 1 - Upper 1 (Heavier Focus)**  
- **Day 2 - Lower 1 (Heavier Focus)**  
- **Day 3 - Upper 2 (Moderate/Higher Reps)**  
- **Day 4 - Lower 2 (Moderate/Higher Reps)**

---', 'ROMRx Bodybuilding Program - Intermediate_Hypertrophy.md', ARRAY['bodybuilding','tier_intermediate','training_program']::text[]),
('bodybuilding', 'Intermediate Hypertrophy Program: Day 1 - Upper 1 (Heavier Focus)', '### 1\. Barbell Bench Press

- **Sets x Reps:** 4 x 5-8  
- **Rest:** 2-3 minutes  
- **Target:** Pectorals, anterior deltoids, triceps

### 2\. Weighted Pull-Up or Lat Pulldown

- **Sets x Reps:** 4 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Latissimus dorsi, biceps, upper back

### 3\. Incline Dumbbell Press

- **Sets x Reps:** 3 x 8-10  
- **Rest:** 2-3 minutes  
- **Target:** Upper pectorals, deltoids, triceps

### 4\. Chest-Supported Row or Cable Row

- **Sets x Reps:** 3 x 8-10  
- **Rest:** 2-3 minutes  
- **Target:** Mid-back, rhomboids, biceps

### 5\. Seated Dumbbell Shoulder Press

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Deltoids (all heads), triceps

### 6\. Cable Lateral Raise

- **Sets x Reps:** 3 x 12-15  
- **Rest:** 60-90 seconds  
- **Target:** Lateral deltoids

### 7\. EZ-Bar Curl

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 60-90 seconds  
- **Target:** Biceps brachii

### 8\. Cable Triceps Press-Down

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 60-90 seconds  
- **Target:** Triceps brachii

---', 'ROMRx Bodybuilding Program - Intermediate_Hypertrophy.md', ARRAY['bodybuilding','tier_intermediate','training_program']::text[]),
('bodybuilding', 'Intermediate Hypertrophy Program: Day 2 - Lower 1 (Heavier Focus)', '### 1\. Back Squat (High-Bar or Low-Bar)

- **Sets x Reps:** 4 x 5-8  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, glutes, hamstrings

### 2\. Romanian Deadlift

- **Sets x Reps:** 3 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Hamstrings, glutes, lower back

### 3\. Leg Press

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, glutes

### 4\. Leg Curl (Seated or Lying)

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Hamstrings

### 5\. Standing Calf Raise

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Gastrocnemius

### 6\. Ab Wheel, Cable Crunch, or Hanging Leg Raise

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Abdominals

---', 'ROMRx Bodybuilding Program - Intermediate_Hypertrophy.md', ARRAY['bodybuilding','tier_intermediate','training_program']::text[]),
('bodybuilding', 'Intermediate Hypertrophy Program: Day 3 - Upper 2 (Moderate/Higher Reps)', '### 1\. Overhead Press (Barbell or Dumbbell)

- **Sets x Reps:** 3 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Deltoids, triceps

### 2\. Weighted Pull-Up / Lat Pulldown (Different Grip from Day 1\)

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Latissimus dorsi, biceps

### 3\. Machine or Dumbbell Chest Press (Different Angle from Day 1\)

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Pectorals, deltoids, triceps

### 4\. One-Arm Dumbbell Row or Chest-Supported Row

- **Sets x Reps:** 3 x 10-12  
- **Rest:** 2-3 minutes  
- **Target:** Latissimus dorsi, mid-back, biceps

### 5\. Cable Lateral Raise

- **Sets x Reps:** 3 x 12-15  
- **Rest:** 60-90 seconds  
- **Target:** Lateral deltoids

### 6\. Cable Fly (High-to-Low or Low-to-High)

- **Sets x Reps:** 2-3 x 12-15  
- **Rest:** 60-90 seconds  
- **Target:** Pectorals

### 7\. Dumbbell Curl (Incline or Hammer)

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Biceps brachii

### 8\. Overhead Cable or Dumbbell Triceps Extension

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Triceps brachii (long head emphasis)

---', 'ROMRx Bodybuilding Program - Intermediate_Hypertrophy.md', ARRAY['bodybuilding','tier_intermediate','training_program']::text[]),
('bodybuilding', 'Intermediate Hypertrophy Program: Day 4 - Lower 2 (Moderate/Higher Reps)', '### 1\. Deadlift Variant (Conventional, Sumo, or Trap Bar)

- **Sets x Reps:** 3 x 3-6  
- **Rest:** 2-3 minutes  
- **Target:** Full posterior chain

**OR (Alternative)**

### 1\. Hip Thrust

- **Sets x Reps:** 3 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Glutes, hamstrings

### 2\. Front Squat or Hack Squat

- **Sets x Reps:** 3 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, core

### 3\. Bulgarian Split Squat or Walking Lunge

- **Sets x Reps:** 3 x 8-12 per leg  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, glutes (unilateral)

### 4\. Leg Extension

- **Sets x Reps:** 2-3 x 12-15  
- **Rest:** 60-90 seconds  
- **Target:** Quadriceps

### 5\. Seated Calf Raise

- **Sets x Reps:** 3 x 12-20  
- **Rest:** 60-90 seconds  
- **Target:** Soleus

### 6\. Plank or Side Plank Variations

- **Sets x Time:** 3 x 30-60 seconds  
- **Rest:** 60-90 seconds  
- **Target:** Core stability

---', 'ROMRx Bodybuilding Program - Intermediate_Hypertrophy.md', ARRAY['bodybuilding','tier_intermediate','training_program']::text[]),
('bodybuilding', 'Intermediate Hypertrophy Program: Progression Guidelines', '### 1\. Effort Calibration

Keep most sets at **1-2 RIR**. On the last set of isolation exercises, you may occasionally train to **0 RIR** (technical failure).

### 2\. Double Progression

Use a **double progression** model:

- Select a rep range for each exercise (e.g., 8-12)  
- When you can complete all prescribed sets at the **top of the range** while maintaining target RIR, **increase the load** by the smallest increment next session  
- Work back up through the rep range with the new load

### 3\. Volume Progression (Optional)

If recovery is consistently excellent for 2-3 weeks (based on sleep quality, soreness levels, and performance trends), you may add **1 set per week** to one or two priority muscle groups until you reach approximately **14-18 sets per week** for those muscles.

**Example:** Add 1 set to quadriceps on Lower 1 (making exercise \#3 go from 3 to 4 sets) OR add 1 set to back work on Upper 1\.

### 4\. Deload Protocol

If performance stalls or regresses across multiple sessions, or fatigue accumulates noticeably, implement a **deload week**:

- Reduce total sets by approximately 40-50%  
- Keep the same loads  
- Stop all sets at 3-4 RIR  
- Resume normal programming the following week

---', 'ROMRx Bodybuilding Program - Intermediate_Hypertrophy.md', ARRAY['bodybuilding','tier_intermediate','training_program']::text[]),
('bodybuilding', 'Intermediate Hypertrophy Program: Evidence-Based Supplements', '### Creatine Monohydrate

- **Dosage:** 3-5 g daily, any time of day  
- **Evidence:** Meta-analytic data shows small but consistent increases in muscle mass and strength when combined with resistance training

### Protein Powder (Whey/Casein/Blend)

- **Dosage:** Use as needed to reach total daily protein intake of **1.6-2.2 g/kg body weight**  
- **Evidence:** Morton et al. (2018) systematic review and meta-regression established a plateau in resistance training-induced hypertrophy at \~1.6 g/kg/day, with a plausible upper CI around 2.2 g/kg/day

---', 'ROMRx Bodybuilding Program - Intermediate_Hypertrophy.md', ARRAY['bodybuilding','tier_intermediate','training_program']::text[]),
('bodybuilding', 'Intermediate Hypertrophy Program: Training Notes', '- **Weekly Volume:** This program delivers approximately 12-16 sets per major muscle group per week, consistent with intermediate volume recommendations from Schoenfeld et al. (2017) dose-response meta-analysis.  
    
- **Frequency:** Each muscle group is trained **2x per week** through the upper/lower split, aligning with research showing superior hypertrophy outcomes from twice-weekly training frequencies versus once-weekly.  
    
- **Rep Range Rationale:** The program uses predominantly 5-15 reps per set, within the evidence-based effective range for hypertrophy (Schoenfeld et al. 2021 repetition continuum analysis).  
    
- **Sex Differences:** Research shows similar relative hypertrophy responses between males and females when training variables are controlled (Refalo et al. 2025). This program is appropriate for both sexes.

---

**Program designed based on peer-reviewed hypertrophy research including:**

- Schoenfeld et al. (2017) - Resistance training volume dose-response meta-analysis  
- Schoenfeld et al. (2021) - Repetition continuum and hypertrophy meta-analysis  
- Morton et al. (2018) - Protein intake systematic review and meta-analysis  
- Robinson et al. (2024) - Proximity to failure dose-response for hypertrophy  
- Grgic et al. (2018) - Training frequency meta-analysis', 'ROMRx Bodybuilding Program - Intermediate_Hypertrophy.md', ARRAY['bodybuilding','tier_intermediate','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Program Overview', '**Training Age:** 3+ years of consistent resistance training  
**Frequency:** 5 days per week  
**Primary Goal:** Maximize skeletal muscle hypertrophy with higher volume and targeted specialization  
**Training Split:**

- Day 1 - Push  
- Day 2 - Pull  
- Day 3 - Legs  
- Day 4 - Upper (Specialization)  
- Day 5 - Lower & Arms (Specialization)

**Effort Target:** Mostly 0-2 RIR; some isolation sets at 0 RIR  
**Weekly Volume:** \~16-22 sets per major muscle group (20-24 sets for priority muscles)  
**Rest Periods:**

- Compound lifts: 2-3 minutes  
- Isolation lifts: 60-90 seconds

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Day 1 - Push', '### 1\. Barbell Bench Press

- **Sets x Reps:** 4 x 5-8  
- **Rest:** 2-3 minutes  
- **Target:** Pectorals, anterior deltoids, triceps

### 2\. Incline Dumbbell Press

- **Sets x Reps:** 3 x 8-10  
- **Rest:** 2-3 minutes  
- **Target:** Upper pectorals, deltoids, triceps

### 3\. Seated Barbell or Dumbbell Shoulder Press

- **Sets x Reps:** 3 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Deltoids (all heads), triceps

### 4\. Weighted Dips or Machine Chest Press

- **Sets x Reps:** 3 x 8-10  
- **Rest:** 2-3 minutes  
- **Target:** Pectorals, triceps

### 5\. Cable Lateral Raise

- **Sets x Reps:** 3-4 x 12-18  
- **Rest:** 60-90 seconds  
- **Target:** Lateral deltoids

### 6\. Cable Fly or Pec Deck

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Pectorals

### 7\. Overhead Cable or EZ-Bar Triceps Extension

- **Sets x Reps:** 3 x 10-12  
- **Rest:** 60-90 seconds  
- **Target:** Triceps brachii (long head emphasis)

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Day 2 - Pull', '### 1\. Weighted Pull-Ups or Heavy Lat Pulldown

- **Sets x Reps:** 4 x 6-8  
- **Rest:** 2-3 minutes  
- **Target:** Latissimus dorsi, biceps

### 2\. Barbell Row (Pendlay or Bent-Over) or T-Bar Row

- **Sets x Reps:** 4 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Upper back, mid-back, biceps

### 3\. Chest-Supported Row or Seated Cable Row

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Mid-back, rhomboids

### 4\. Single-Arm Lat Pulldown or Straight-Arm Pulldown

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 90-120 seconds  
- **Target:** Latissimus dorsi (stretch emphasis)

### 5\. Rear Delt Fly (Machine or Cable)

- **Sets x Reps:** 3-4 x 12-20  
- **Rest:** 60-90 seconds  
- **Target:** Posterior deltoids

### 6\. Barbell or EZ-Bar Curl

- **Sets x Reps:** 3 x 8-12  
- **Rest:** 60-90 seconds  
- **Target:** Biceps brachii

### 7\. Incline Dumbbell Curl or Hammer Curl

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Biceps brachii (long head or brachialis)

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Day 3 - Legs', '### 1\. Back Squat or Front Squat

- **Sets x Reps:** 4 x 5-8  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, glutes, hamstrings

### 2\. Romanian Deadlift

- **Sets x Reps:** 3 x 6-10  
- **Rest:** 2-3 minutes  
- **Target:** Hamstrings, glutes, lower back

### 3\. Leg Press (Quad-Biased Stance)

- **Sets x Reps:** 3-4 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, glutes

### 4\. Walking Lunge or Bulgarian Split Squat

- **Sets x Reps:** 3 x 8-12 per leg  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps, glutes (unilateral)

### 5\. Leg Curl (Seated or Lying)

- **Sets x Reps:** 3-4 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Hamstrings

### 6\. Standing or Donkey Calf Raise

- **Sets x Reps:** 3-4 x 8-12  
- **Rest:** 60-90 seconds  
- **Target:** Gastrocnemius

### 7\. Ab Exercise of Choice

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Abdominals

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Day 4 - Upper (Specialization)', '**Purpose:** Add extra volume to priority upper body muscles while maintaining stimulus for others.

### 1\. Incline Barbell or Machine Press

- **Sets x Reps:** 3-4 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Upper pectorals (priority)

### 2\. Cable or Machine Row

- **Sets x Reps:** 3-4 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Upper back (priority)

### 3\. Dumbbell Lateral Raise

- **Sets x Reps:** 4 x 12-20  
- **Rest:** 60-90 seconds  
- **Target:** Lateral deltoids (priority)

### 4\. Lat-Focused Pulldown or Pull-Over

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 90-120 seconds  
- **Target:** Latissimus dorsi

### 5\. Pec Fly (Different Angle from Day 1\)

- **Sets x Reps:** 3 x 12-15  
- **Rest:** 60-90 seconds  
- **Target:** Pectorals

### 6\. Biceps Isolation (e.g., Preacher Curl)

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Biceps brachii

### 7\. Triceps Isolation (e.g., Cable Press-Down, Different Attachment)

- **Sets x Reps:** 3 x 10-15  
- **Rest:** 60-90 seconds  
- **Target:** Triceps brachii

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]);

INSERT INTO public.rombot_knowledge (sport, topic, chunk, source_citation, tags) VALUES
('bodybuilding', 'Advanced Hypertrophy Program: Day 5 - Lower & Arms (Specialization)', '**Purpose:** Add extra volume to priority lower body and arm muscles.

### 1\. Hack Squat or Front Squat

- **Sets x Reps:** 3-4 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Quadriceps (priority)

### 2\. Hip Thrust or Glute Bridge

- **Sets x Reps:** 3-4 x 8-12  
- **Rest:** 2-3 minutes  
- **Target:** Glutes (priority)

### 3\. Leg Extension

- **Sets x Reps:** 3 x 12-15  
- **Rest:** 60-90 seconds  
- **Target:** Quadriceps

### 4\. Leg Curl (Alternative Machine/Angle from Day 3\)

- **Sets x Reps:** 3 x 12-15  
- **Rest:** 60-90 seconds  
- **Target:** Hamstrings

### 5\. Seated Calf Raise

- **Sets x Reps:** 3-4 x 12-20  
- **Rest:** 60-90 seconds  
- **Target:** Soleus

### 6\. Superset: EZ-Bar Curl \+ Cable Press-Down

- **Sets x Reps:** 3 supersets x 10-15 reps each  
- **Rest:** 90-120 seconds between supersets  
- **Target:** Biceps and triceps (arm emphasis)

### 7\. Optional Extra Set for Lagging Muscle

- **Sets x Reps:** 1-2 x 12-15  
- **Rest:** 60-90 seconds  
- **Notes:** Add one or two extra sets to your most lagging muscle group (e.g., additional lateral raises, extra glute work, or hamstring curls)

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Progression Guidelines', '### 1\. Effort Calibration

Keep most work at **0-2 RIR**. On isolation movements, you may occasionally push to **0 RIR** (technical failure) on the last set.

### 2\. Load Progression

Use **double progression**:

- When you hit the top of the prescribed rep range on all sets at target RIR, increase load by the smallest increment  
- Work back through the range with the new load

### 3\. Volume Management

Track **weekly sets per muscle group** and aim for:

- **16-20 sets/week** for non-priority muscles  
- **20-24 sets/week** for one or two priority muscles (only if recovery allows)

**Priority muscle selection:** Choose 1-2 muscle groups to emphasize based on physique goals (e.g., chest \+ back, or glutes \+ side delts). Allocate extra sets on Days 4 and 5 to these areas.

### 4\. Deload Protocol

When performance plateaus or regresses for more than 1-2 weeks, or fatigue accumulates noticeably, implement a **1-week deload**:

- Reduce total sets by approximately **50%**  
- Keep loads similar to normal training  
- Stop all sets at **3 RIR**  
- Resume normal volume the following week

### 5\. Auto-Regulation

Advanced trainees should develop skill in auto-regulating volume:

- If a session feels unusually difficult (poor sleep, high life stress), reduce sets by 20-30% that day  
- If recovery is excellent and performance is trending up, small volume additions (\~1 set/week to priority muscles) may be appropriate

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Evidence-Based Supplements', '### Creatine Monohydrate

- **Dosage:** 3-5 g daily, any time of day  
- **Evidence:** Meta-analyses of RCTs show small but consistent increases in direct measures of muscle hypertrophy (effect size \~0.11) and strength when combined with resistance training

### Protein Powder (Whey/Casein/Blend)

- **Dosage:** Use as needed to reach total daily protein intake of **1.6-2.2 g/kg body weight** from all sources  
- **Evidence:** Morton et al. (2018) meta-regression of 49 RCTs (1,863 participants) established a plateau in FFM gains at \~1.6 g/kg/day, with plausible upper bound around 2.2 g/kg/day

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Training Notes', '### Volume Rationale

This program delivers approximately **16-24 sets per muscle group per week**, with higher volumes reserved for priority muscles. This aligns with:

- Schoenfeld et al. (2017) dose-response meta-analysis showing a graded relationship between volume and hypertrophy  
- Emerging evidence that advanced trainees may benefit from higher volumes (up to \~20+ sets/muscle/week) when recovery is managed

### Frequency

Each major muscle group is trained **2-3 times per week**:

- Push muscles (chest/delts/triceps): Days 1, 4  
- Pull muscles (back/biceps): Days 2, 4  
- Legs: Days 3, 5

This frequency is consistent with meta-analytic findings (Schoenfeld et al. 2016, Grgic et al. 2018\) showing superior hypertrophy from higher weekly training frequencies.

### Repetition Ranges

The program emphasizes **5-20 reps per set**, within the broad effective range for hypertrophy. Schoenfeld et al. (2021) repetition continuum analysis found similar hypertrophy across 6-20+ reps when sets are taken to similar proximity to failure.

### Proximity to Failure

The program prescribes mostly **0-2 RIR** across all sets. Robinson et al. (2024) meta-analysis found greater hypertrophy when sets are taken closer to failure (0-3 RIR vs. 4+ RIR), with maximal effect around 0-2 RIR.

### Sex Differences

Advanced female and male trainees show similar relative hypertrophy responses when training variables are controlled (Refalo et al. 2025). This program is appropriate for both sexes. Absolute load selection will differ based on individual strength levels.

### Recovery Considerations

Advanced trainees require strategic recovery management:

- Prioritize **7-9 hours of sleep per night** (research shows reduced MPS, testosterone, and GH with insufficient sleep)  
- Maintain a **slight caloric surplus** (\~5-10% above maintenance) for optimal lean mass gains  
- Implement deload weeks when fatigue accumulates or performance stalls  
- Monitor training volume and cut back if recovery markers worsen

---', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]),
('bodybuilding', 'Advanced Hypertrophy Program: Specialization Strategies', '### Option A: Chest & Back Priority

- Day 4: Add 1 set to exercises \#1 and \#2  
- Day 5: Keep lower body as prescribed  
- Total volume: Chest \~20-22 sets/week, Back \~22-24 sets/week

### Option B: Glutes & Delts Priority

- Day 4: Add 1 set to exercise \#3 (lateral raises)  
- Day 5: Add 1 set to exercise \#2 (hip thrust)  
- Total volume: Glutes \~20-22 sets/week, Delts \~22-24 sets/week

### Option C: Quads & Arms Priority

- Day 4: Add 1 set to exercises \#6 and \#7 (biceps/triceps)  
- Day 5: Add 1 set to exercise \#1 (hack squat)  
- Total volume: Quads \~22-24 sets/week, Arms \~20-22 sets/week

**Note:** Choose only 1-2 priority muscle groups at a time. Attempting to prioritize too many areas simultaneously will exceed recovery capacity.

---

**Program designed based on peer-reviewed hypertrophy research including:**

- Schoenfeld et al. (2017) - Volume dose-response meta-analysis  
- Schoenfeld et al. (2016, 2018\) - Frequency meta-analyses  
- Schoenfeld et al. (2021) - Repetition continuum meta-analysis  
- Robinson et al. (2024) - Proximity to failure dose-response  
- Morton et al. (2018) - Protein intake meta-analysis  
- Refalo et al. (2025) - Sex differences meta-analysis  
- Bhasin et al. (1996) - Testosterone dose-response (informing enhanced vs. natural volume tolerances)', 'ROMRx Bodybuilding Program - Advanced_Hypertrophy.md', ARRAY['bodybuilding','tier_advanced','training_program']::text[]);
