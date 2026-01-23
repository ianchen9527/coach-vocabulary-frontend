# Tracking Events

## Session Events

### session_start
**Triggered:** App opens or returns to foreground after 30+ minutes

| Property | Type | Description |
|----------|------|-------------|
| `is_fresh_install` | boolean | First app launch ever |
| `gap_ms` | number? | Milliseconds since last session |

### session_end
**Triggered:** App goes to background

*No properties*

---

## Screen View Events

### screen_view
**Triggered:** User navigates to a new screen

**event_name values:** `home`, `learn`, `practice`, `review`, `analysis`, `login`

*No properties*

---

## Action Events

### button_tap
**Triggered:** User taps main action button on home screen

| Property | Type | Description |
|----------|------|-------------|
| `button_name` | string | `start_analysis`, `start_learn`, `start_practice`, `start_review` |
| `screen` | string | `home` |

### permission_response
**Triggered:** User responds to microphone or notification permission modal

| Property | Type | Description |
|----------|------|-------------|
| `permission_type` | string | `microphone` or `notification` |
| `response` | string | `granted`, `denied`, or `dismissed` |

### login
**Triggered:** Successful login

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | `email` |

### register
**Triggered:** Successful registration

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | `email` |

### logout
**Triggered:** User logs out

*No properties*

### delete_account
**Triggered:** User deletes account

*No properties*

---

## Exercise Events

All exercise events include `exercise_session_id` as a **top-level field** (not in properties).

This UUID groups all events from a single exercise flow (from `exercise_start` to `exercise_complete`/`exercise_abandon`).

**Example query:**
```sql
SELECT * FROM tracking_events
WHERE exercise_session_id = 'abc-123-def'
ORDER BY timestamp;
```

| Top-level Field | Type | Description |
|-----------------|------|-------------|
| `exercise_session_id` | string (UUID) | Unique ID for this exercise flow |

---

### exercise_start
**Triggered:** Exercise session loads successfully (generates new `exercise_session_id`)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `learn`, `practice`, `review`, `analysis` |
| `exercise_count` | number | Total exercises in session |

### exercise_answer
**Triggered:** After each answer submission

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `learn`, `practice`, `review`, `analysis` |
| `word_id` | string | Word being tested |
| `exercise_type` | string | `reading_lv1`, `reading_lv2`, `listening_lv1`, `listening_lv2`, `speaking_lv1`, `speaking_lv2` |
| `correct` | boolean | Answer correctness |
| `response_time_ms` | number? | Time to answer in ms |

### exercise_complete
**Triggered:** User finishes all exercises in session (clears `exercise_session_id` after sending)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `learn`, `practice`, `review`, `analysis` |
| `exercise_count` | number | Total exercises |
| `correct_count` | number | Correct answers |
| `duration_ms` | number | Session duration in ms |

### exercise_abandon
**Triggered:** User taps back and confirms leaving mid-session (clears `exercise_session_id` after sending)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `learn`, `practice`, `review`, `analysis` |
| `current_index` | number | Exercise index when abandoned |
| `total_count` | number | Total exercises |
| `duration_ms` | number | Duration before abandoning in ms |

### question_shown
**Triggered:** Question phase starts (word is displayed)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `learn`, `practice`, `review`, `analysis` |
| `word_id` | string | Word being tested |
| `exercise_type` | string | `reading_lv1`, `reading_lv2`, `listening_lv1`, `listening_lv2`, `speaking_lv1`, `speaking_lv2` |
| `current_index` | number | Current exercise index (0-based) |

### answer_phase_started
**Triggered:** Answer phase begins (options appear or recording UI shown)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `learn`, `practice`, `review`, `analysis` |
| `word_id` | string | Word being tested |
| `exercise_type` | string | `reading_lv1`, `reading_lv2`, `listening_lv1`, `listening_lv2`, `speaking_lv1`, `speaking_lv2` |

### audio_played
**Triggered:** Word audio plays (listening exercises, display phase in learn/review)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `learn`, `practice`, `review` |
| `word_id` | string | Word being played |
| `trigger` | string | `auto` (automatic playback) or `tap` (user-initiated) |

### recording_started
**Triggered:** Microphone starts recording for speaking exercise

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `practice`, `review` |
| `word_id` | string | Word being practiced |

### recording_stopped
**Triggered:** Recording ends

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `practice`, `review` |
| `word_id` | string | Word being practiced |
| `stop_reason` | string | `correct_match` (correct answer detected), `timeout` (time ran out), `manual` (user stopped) |

### speech_recognized
**Triggered:** Speech-to-text result received

| Property | Type | Description |
|----------|------|-------------|
| `mode` | string | `practice`, `review` |
| `word_id` | string | Word being practiced |
| `recognized_text` | string | Transcribed text from speech |
| `is_match` | boolean | Whether the speech matched the expected word |

---

## Error Events

### api_error
**Triggered:** API call fails (excluding `/api/track`)

| Property | Type | Description |
|----------|------|-------------|
| `endpoint` | string | Failed endpoint |
| `status_code` | number | HTTP status (0 for network error) |
| `error_message` | string? | Error detail |
