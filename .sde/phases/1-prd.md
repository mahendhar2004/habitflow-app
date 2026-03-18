# Phase 1: PRD — HabitFlow

**Date:** 2026-03-18
**Author:** PM Agent (SDE Plugin)
**Status:** In Progress
**Phase:** 1 of 13

---

## 1. Problem Statement

People who want to build lasting habits are underserved by the current app market. Apps like Habitica trade aesthetic quality for gamification clutter, while Streaks trades depth for minimalism. Both fail the same user: the goal-driven individual who wants to track 3–7 habits daily, stay motivated through visual feedback, and actually enjoy opening the app each morning. The result is abandonment, typically within the first two weeks, because the feedback loop is either ugly, boring, or too complex to maintain. If HabitFlow does not exist, these users either bounce between mediocre apps or give up entirely on structured habit tracking. HabitFlow solves this by combining premium visual design — dark mode, haptics, animations, gradient cards — with a tight data-driven feedback loop (streaks, heatmaps, completion rates) that rewards consistency and makes daily tracking feel like a ritual worth repeating.

---

## 2. Goals and Success Metrics (SMART)

| Goal | Metric | Baseline | Target | Timeline |
|------|--------|----------|--------|----------|
| Drive daily active usage | % of registered users who log at least 1 habit per day (DAU/registered) | 0% (new product) | 40% | 60 days post-launch |
| Reduce early abandonment | % of users still active on Day 14 (D14 retention) | 0% (new product) | 35% | 90 days post-launch |
| Validate premium UX quality | Average app store rating | 0 (new product) | 4.5+ stars | 90 days post-launch |
| Confirm offline works reliably | Sync error rate on reconnect | 0% (new product) | <0.5% of sync events | 60 days post-launch |
| Test premium conversion willingness | % of active users who unlock a premium feature | 0% (new product) | 8% | 90 days post-launch |
| Establish core engagement loop | Average streak length for users active 7+ days | 0% (new product) | 5+ days | 60 days post-launch |

---

## 3. User Personas

### Persona 1: Alex, Ambitious Professional
- **Role:** Product manager or software engineer, 25–40
- **Goals:** Track 4–6 professional and health habits (gym, reading, deep work blocks, water intake). Wants to see weekly progress without spending more than 60 seconds per day in the app.
- **Frustrations:** Existing apps are either too gamey (Habitica) or too bare (plain checkboxes). Wants the app to feel as polished as the tools they use at work (Linear, Notion, Stripe).
- **Tech literacy:** High. Comfortable with gestures, settings, and advanced views.
- **Usage frequency:** Daily, typically morning and evening.
- **Success looks like:** Alex opens the app in under 5 seconds, checks off three habits with a satisfying swipe gesture, sees a clean weekly streak summary, and closes the app — all in under 30 seconds.

### Persona 2: Maya, Wellness Seeker
- **Role:** Yoga instructor or nutritionist, 20–35, health-focused
- **Goals:** Track morning and evening routines (meditation, journaling, supplements, stretching). Values calm, beautiful interfaces that align with her wellness aesthetic.
- **Frustrations:** Apps feel either clinical (medical-grade) or childish (pixel art games). Wants something that looks like it belongs on her aesthetic phone home screen.
- **Tech literacy:** Medium. Uses apps naturally but does not explore settings deeply.
- **Usage frequency:** Twice daily — morning routine and evening wind-down.
- **Success looks like:** Maya's home screen shows her five daily habits in a dark glassmorphism card layout. She completes them with haptic taps, sees a satisfying completion animation, and receives a gentle push reminder if she forgets her evening check-in.

### Persona 3: Jordan, Self-Improver
- **Role:** University student or early-career professional, 18–30, productivity-obsessed
- **Goals:** Build 3–5 growth habits (study blocks, no-scroll mornings, exercise). Motivated heavily by streaks, progress graphs, and visual evidence of consistency — the "GitHub green square" for habits.
- **Frustrations:** Streak-breaking feels punishing, not instructive. Wants data (completion rates, best streaks, monthly heatmaps) without needing a spreadsheet.
- **Tech literacy:** Medium-High. Will explore all app features, likely to share screenshots of streak milestones.
- **Usage frequency:** Daily, often multiple times as they build new habits.
- **Success looks like:** Jordan hits a 30-day streak on "no phone before 9am," sees a celebration animation, and shares their monthly heatmap as a screenshot to social media.

---

## 4. Feature Requirements (MoSCoW)

### Must Have — MVP (ship nothing without this)

| ID | Feature | Rationale |
|----|---------|-----------|
| M1 | Email/password authentication (register, login, logout, token refresh) | Gate to all personalized data |
| M2 | Create, edit, archive, and delete habits (name, icon, color, frequency: daily/weekly/specific days) | Core data model |
| M3 | Daily habit log screen — swipe-to-complete gesture with haptic feedback | Primary daily interaction |
| M4 | Streak counter per habit (current streak, best streak) | Primary retention mechanic |
| M5 | Offline-first local storage (expo-sqlite + Drizzle ORM) — habits loggable with no internet | Non-negotiable per constraints |
| M6 | Background sync — local changes push to backend on reconnect | Data integrity |
| M7 | Local push notifications — daily reminder per habit at user-set time | Habit formation trigger |
| M8 | Progress heatmap per habit (last 90 days, GitHub-style) | Core feedback loop for Self-Improver |
| M9 | Home dashboard showing today's habits, completion ring (X of N complete today) | At-a-glance daily view |
| M10 | Dark mode UI as default, with light mode option | Non-negotiable per design direction |
| M11 | 50+ curated habit icons, custom gradient card colors per habit | Premium design baseline |
| M12 | Celebration animation on streak milestones (7, 14, 30, 60, 100 days) | Retention and delight |

### Should Have — Important but not blocking MVP

| ID | Feature | Rationale |
|----|---------|-----------|
| S1 | Weekly and monthly summary stats per habit (completion rate %, longest streak) | Feeds Self-Improver persona's data need |
| S2 | Habit categories (Health, Mind, Work, Other) with visual grouping | Organization for Ambitious Professional |
| S3 | Reorder habits via drag-and-drop | UX quality expected at premium tier |
| S4 | Habit notes — optional text note per completion log | Depth for journaling use case |
| S5 | Onboarding flow — 3-screen intro + "add your first habit" guided step | Reduces activation drop-off |
| S6 | Spring animations (Reanimated 3) on all screen transitions and card interactions | Premium feel differentiator |

### Could Have — Cut if time-pressured

| ID | Feature | Rationale |
|----|---------|-----------|
| C1 | Premium tier — unlock additional themes (light gradient, AMOLED, pastel) | Monetization test |
| C2 | Premium tier — unlock full analytics (monthly trends, best day of week, skip rate) | Monetization test |
| C3 | Habit templates library (Morning Routine, Fitness, Study) — one-tap setup | Activation accelerator |
| C4 | Export habit data as CSV | Power user request, low volume |
| C5 | Widget (iOS/Android) showing today's habit count | Retention surface, complex to build |

### Won't Have This Release

| ID | Feature | Rationale |
|----|---------|-----------|
| W1 | Social features (friends, accountability partners, public streaks) | Requires moderation infrastructure not in scope |
| W2 | Apple Sign-In or Google OAuth | Added complexity, email is sufficient for MVP scale |
| W3 | Habit scheduling beyond daily/weekly (e.g., every 3 days, X times per week counts) | Complicates streak math; defer to v2 |
| W4 | In-app purchases / payment processing | No Stripe integration in this release |
| W5 | Web dashboard for habit management | Mobile-first; web is a future platform |

---

## 5. User Stories with BDD Acceptance Criteria

### AUTH-1: Account Registration

```
As Alex (Ambitious Professional),
I want to create an account with my email and password,
So that my habits and streaks are saved and synced across devices.

Acceptance Criteria:
GIVEN I am on the registration screen
WHEN I enter a valid email and a password of 8+ characters and tap "Create Account"
THEN my account is created and I am navigated to the onboarding flow
AND a JWT access token and refresh token are stored securely in device SecureStore
AND I receive a welcome email within 2 minutes

GIVEN I enter an email that is already registered
WHEN I tap "Create Account"
THEN I see an inline error: "An account with this email already exists. Log in instead?"
AND I am NOT navigated away from the registration screen

GIVEN my device loses network during registration submission
WHEN the request times out (>10 seconds)
THEN I see an error banner: "No connection. Please try again."
AND my entered email is preserved in the form field
```

### AUTH-2: Login and Token Refresh

```
As any authenticated user,
I want to stay logged in across app restarts without re-entering my password,
So that the app opens directly to my habits every time.

Acceptance Criteria:
GIVEN I have previously logged in and my refresh token is valid (<30 days old)
WHEN I open the app
THEN I am navigated directly to the home dashboard without seeing a login screen
AND a new access token is silently fetched in the background

GIVEN my refresh token has expired (>30 days)
WHEN I open the app
THEN I am navigated to the login screen
AND I see a message: "Your session expired. Please log in again."
```

### HABIT-1: Create a Habit

```
As Maya (Wellness Seeker),
I want to create a new habit with a name, icon, color, and schedule,
So that I can track my morning meditation consistently.

Acceptance Criteria:
GIVEN I am on the habits screen and tap the "+" button
WHEN I enter a habit name (1–50 characters), select an icon from the 50+ icon picker, choose a gradient color, and set frequency to "Daily"
THEN the habit appears on my home dashboard immediately
AND the habit is persisted to local storage before the API call completes (optimistic write)
AND the habit syncs to the backend within 5 seconds when online

GIVEN I tap "Save" without entering a habit name
THEN I see an inline validation error: "Give your habit a name"
AND the save action is blocked

GIVEN I am offline when I create the habit
WHEN I regain internet connectivity
THEN the habit syncs to the server automatically with no user action required
AND no duplicate habit is created if the sync retries
```

### HABIT-2: Log a Habit Completion

```
As Jordan (Self-Improver),
I want to mark a habit complete with a swipe gesture,
So that logging feels fast and satisfying rather than a chore.

Acceptance Criteria:
GIVEN today's habit list is showing and I have incomplete habits
WHEN I swipe a habit card to the right
THEN the habit is marked complete for today with a checkmark animation
AND the device vibrates with a medium haptic impact
AND the completion ring on the home dashboard increments (e.g., "3 of 5")
AND the completion is written to local storage immediately (offline-safe)

GIVEN I have already completed all habits for today
WHEN I view the home dashboard
THEN I see a full completion state with a celebration visual (confetti burst)
AND the completion ring shows "5 of 5" with a filled state

GIVEN I accidentally swipe a habit complete
WHEN I tap the completed habit within 5 seconds
THEN an "Undo" option is visible
AND tapping "Undo" reverts the completion for today
AND the streak is NOT broken by the undo action
```

### STREAK-1: Streak Tracking and Milestone Celebration

```
As Jordan (Self-Improver),
I want to see my current and best streak per habit and receive a celebration when I hit a milestone,
So that I stay motivated to maintain consistency.

Acceptance Criteria:
GIVEN I have completed a habit every day for 7 consecutive days
WHEN I log today's completion
THEN the streak counter shows "7" with a flame icon
AND a full-screen celebration animation (confetti + haptic pattern) plays for 2 seconds
AND the milestone "7-Day Streak" is recorded in my habit history

GIVEN I miss a day (do not log a daily habit before midnight local time)
WHEN I open the app the next day
THEN the streak resets to 0
AND I see the streak displayed as "0" with no celebration animation
AND my best streak is NOT reset — it retains the highest ever streak value

GIVEN I have a weekly habit (e.g., "Long run" set to Sundays only)
WHEN I miss a Sunday
THEN only the weekly habit streak resets
AND daily habits are not affected
```

### OFFLINE-1: Offline Habit Logging

```
As Alex (Ambitious Professional),
I want to log habits while on an airplane with no internet,
So that my streak is not broken by connectivity issues.

Acceptance Criteria:
GIVEN my device has no internet connection
WHEN I open the app
THEN the home dashboard loads from local storage in under 1 second
AND all habits and their current streaks are visible and accurate

GIVEN I am offline and log 3 habits
WHEN I regain internet connectivity (WiFi or cellular)
THEN all 3 completions are synced to the backend within 30 seconds automatically
AND no user action is required to trigger sync
AND no completion is lost or duplicated during sync

GIVEN I create a new habit offline AND edit an existing habit offline before syncing
WHEN I reconnect
THEN both operations are synced in order
AND if a conflict exists (same habit edited on two devices), last-write-wins with a conflict timestamp logged server-side
```

### NOTIF-1: Daily Habit Reminder

```
As Maya (Wellness Seeker),
I want a reminder notification at a time I choose for each habit,
So that I don't forget my evening journaling routine.

Acceptance Criteria:
GIVEN I am setting up or editing a habit
WHEN I enable "Daily Reminder" and set the time to 9:00 PM
THEN a local notification is scheduled on the device for 9:00 PM every day the habit is due
AND the notification body reads: "Time for [Habit Name]" with the habit icon

GIVEN I have already completed a habit today
WHEN 9:00 PM arrives and the reminder fires
THEN the notification is NOT shown (habit is already done)

GIVEN I disable notifications for a habit
WHEN I tap "Save"
THEN all scheduled local notifications for that habit are cancelled immediately
AND I receive no further reminders for that habit
```

### ONBOARDING-1: First-Time User Activation

```
As a new user (any persona),
I want a guided first-time experience that leads me to add my first habit,
So that I understand the product's value before I decide whether to keep it.

Acceptance Criteria:
GIVEN I complete registration for the first time
WHEN I am navigated past the welcome screen
THEN I see a 3-screen onboarding carousel (value props: Track, Celebrate, Grow)
AND each screen has a skip option visible at all times

GIVEN I complete or skip the onboarding carousel
WHEN I reach the main app
THEN I see an empty state with a prominent "Add your first habit" call to action
AND tapping it opens the habit creation sheet pre-filled with a suggested name ("Morning Meditation") as placeholder text

GIVEN I add my first habit
WHEN I return to the home dashboard
THEN the empty state is replaced by the habit card
AND I see a tooltip pointing to the swipe gesture: "Swipe right to complete"
AND the tooltip auto-dismisses after 5 seconds or on first swipe
```

---

## 6. Non-Functional Requirements

| Category | Requirement | Standard |
|----------|------------|---------|
| App cold start | Time from tap to home dashboard visible | < 1.5 seconds on a mid-range Android device (Pixel 4a class) |
| API response time | p95 latency for all authenticated endpoints | < 200ms |
| API response time | p99 latency for sync endpoint | < 500ms |
| Offline availability | App fully functional with no network | 100% of core flows (log, view, create, streak) |
| Sync reliability | Completion events lost during offline period | < 0.5% of sync events |
| Animation frame rate | All Reanimated 3 animations | 60fps on iPhone 12+ and Pixel 6+ |
| Uptime | Backend API availability | 99.5% monthly (3.65 hrs downtime/month acceptable at MVP scale) |
| Auth security | Token storage | JWT stored in expo-secure-store only, never AsyncStorage |
| Auth security | Access token expiry | 15 minutes |
| Auth security | Refresh token expiry | 30 days, rotated on each use |
| Password security | Hashing algorithm | bcrypt, minimum 12 rounds |
| Data security | Transport | HTTPS only, TLS 1.2+, HSTS headers |
| Input validation | All API inputs | Validated with class-validator, reject unknown fields |
| Rate limiting | Auth endpoints (login, register) | 10 requests per IP per minute |
| Rate limiting | Sync endpoint | 60 requests per user per minute |
| Mobile platform support | iOS | iOS 15+ |
| Mobile platform support | Android | Android 9+ (API level 28+) |
| Bundle size | Initial JS bundle | < 2.5 MB (measured via expo-bundle-analyzer) |
| Accessibility | Touch target size | Minimum 44x44 pt per Apple HIG |
| Accessibility | Color contrast | WCAG 2.1 AA (4.5:1 for text on dark backgrounds) |
| Error logging | All unhandled exceptions | Captured with stack trace and user ID to server log |
| Logging format | All backend logs | Structured JSON with: timestamp, level, correlationId, userId, method, path |

---

## 7. Edge Cases and Error States

### Habit Creation
- **Empty name:** Inline validation error before submit fires. "Give your habit a name."
- **Name > 50 characters:** Character counter shown at 40+. Submit blocked at 51+.
- **Duplicate habit name:** Allow duplicates (user may want "Morning Walk" and "Evening Walk").
- **Offline create, then delete before sync:** Local deletion removes the pending create from the sync queue. No orphan record created on server.

### Habit Completion Logging
- **Double-tap race condition:** Completion for a given habit+date is idempotent. Second write is a no-op (upsert by habit_id + date).
- **Midnight boundary:** Habit completion window is calendar date in the user's local timezone, not UTC. Missing this causes streak breaks for users in UTC+5:30 or similar.
- **Undo after sync:** If a completion has already synced to backend, undo sends a DELETE completion request. If offline during undo, the deletion is queued in the sync queue ahead of any future completions.

### Streak Calculation
- **Timezone change (user travels):** Streak is calculated based on local device timezone at time of logging. Timezone stored with each completion record.
- **Habit frequency change (daily -> specific days):** Streak resets to 0 on frequency change. User is warned with a dialog: "Changing frequency will reset your current streak. Continue?"
- **App not opened for 3 days:** User sees all three days as missed. Streaks reset. No backdating of completions is possible in MVP.

### Sync Conflicts
- **Same habit edited on two devices before sync:** Last-write-wins based on `updatedAt` timestamp. No merge UI in MVP.
- **Completion logged on two devices for same habit+date offline:** Idempotent upsert — no duplicate logged.
- **Backend unavailable during sync:** Sync retries with exponential backoff: 5s, 15s, 60s, then queued for next app open. No data loss.

### Notifications
- **Notification permission denied:** Reminder toggle is disabled with an inline prompt: "Enable notifications in Settings to use reminders." Tapping it opens device Settings.
- **Habit deleted with active reminder:** All scheduled local notifications for that habit are cancelled synchronously on delete.
- **App in foreground when notification fires:** In-app banner shown instead of system notification (expo-notifications in-app presentation mode).

### Authentication
- **Refresh token expired:** User sees a non-dismissible modal: "Your session expired. Please log in again." All local data is preserved. Only auth state is cleared.
- **Account deleted server-side:** On next sync, user receives 401, treated same as expired session.
- **Concurrent login on new device:** Both sessions are valid (JWT is stateless). No forced logout of existing session in MVP.

### Empty States
- **No habits created yet:** Home dashboard shows illustrated empty state with "Add your first habit" CTA.
- **No completions in last 90 days (heatmap):** Heatmap shows 90 grey cells. No error.
- **All habits archived:** Home shows empty state: "All your habits are archived. Tap + to start a new one."

---

## 8. Out of Scope (This Release)

1. **Social / community features** — no friends, leaderboards, shared habits, or accountability partners. This requires moderation and social graph infrastructure that is not justified at 100–1000 users.
2. **Payment processing or in-app purchases** — premium tier is scoped as a UI unlock only (local feature flag), not a real payment flow. No Stripe integration.
3. **Apple Sign-In and Google OAuth** — email/password only. Social auth adds App Store review risk and OAuth complexity that is not worth the activation improvement at MVP scale.
4. **Habit backdating** — users cannot log a habit for a past date. This prevents streak abuse and simplifies the data model.
5. **Web application** — HabitFlow is mobile-first (iOS + Android). A web dashboard is a future platform consideration only.

---

## Prioritization Scores (Top MVP Features)

| Feature | Impact (1–5) | Confidence (1–5) | Effort (1–5) | Score |
|---------|-------------|-----------------|-------------|-------|
| Daily log + swipe gesture (M3) | 5 | 5 | 2 | 12.5 |
| Streak counter (M4) | 5 | 5 | 2 | 12.5 |
| Offline-first local storage (M5) | 5 | 5 | 3 | 8.3 |
| Push notifications (M7) | 4 | 5 | 2 | 10.0 |
| Celebration animations (M12) | 4 | 4 | 2 | 8.0 |
| Progress heatmap (M8) | 4 | 4 | 3 | 5.3 |
| Onboarding flow (S5) | 3 | 4 | 2 | 6.0 |
| Weekly/monthly stats (S1) | 3 | 3 | 3 | 3.0 |
| Premium themes (C1) | 2 | 3 | 2 | 3.0 |

Build order: M3 → M4 → M5+M6 → M9 → M1 → M7 → M12 → M8 → S5 → S6

---

## Appendix: Assumptions Carried Forward

1. Users track 3–7 habits. Data model and UI are optimized for this range. Lists of 20+ habits are not a design target.
2. Streaks and visual progress are the primary retention mechanism. Any feature that conflicts with streak clarity is deprioritized.
3. Offline reliability is a hard constraint, not a nice-to-have. Any feature that requires online-only behavior must be explicitly approved.
4. Dark mode is the default and primary design target. Light mode is a secondary skin, not a co-equal design direction.
5. Premium tier is a UI feature flag in MVP — no real payment flow. Conversion data from this release informs whether to invest in real payments.
