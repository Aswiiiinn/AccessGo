# Database Model Documentation

## User (accounts.User)

Extends Django's `AbstractUser`.

| Field      | Type        | Notes                        |
|------------|-------------|------------------------------|
| id         | BigInt PK   | Auto                         |
| username   | CharField   | Unique                       |
| email      | EmailField  |                              |
| role       | CharField   | `user` or `admin`            |
| bio        | TextField   | Optional                     |
| avatar     | ImageField  | Uploaded to `avatars/`       |
| created_at | DateTime    | Auto                         |
| updated_at | DateTime    | Auto                         |

Index: `role`

---

## AccessibilityLocation (accessibility.AccessibilityLocation)

| Field         | Type         | Notes                                              |
|---------------|--------------|----------------------------------------------------|
| id            | BigInt PK    |                                                    |
| name          | CharField    |                                                    |
| location_type | CharField    | station, bus_stop, entrance, pathway, other        |
| address       | CharField    | Optional                                           |
| latitude      | DecimalField | 9 digits, 6 decimal places                         |
| longitude     | DecimalField | 9 digits, 6 decimal places                         |
| description   | TextField    | Optional                                           |
| is_active     | BooleanField | Default True                                       |
| created_at    | DateTime     | Auto                                               |
| updated_at    | DateTime     | Auto                                               |

Indexes: `(latitude, longitude)`, `location_type`

> Coordinates stored as Decimal for precision. Designed for PostGIS migration — replace with `PointField` and `ST_DWithin` when ready.

---

## AccessibilityAttribute (accessibility.AccessibilityAttribute)

| Field          | Type      | Notes                                                              |
|----------------|-----------|--------------------------------------------------------------------|
| id             | BigInt PK |                                                                    |
| location       | FK        | → AccessibilityLocation (CASCADE)                                  |
| attribute_type | CharField | elevator, ramp, tactile_paving, accessible_toilet, hearing_loop, braille_signage, step_free, other |
| is_available   | BooleanField | Default True                                                    |
| notes          | TextField | Optional                                                           |
| created_at     | DateTime  | Auto                                                               |
| updated_at     | DateTime  | Auto                                                               |

Unique constraint: `(location, attribute_type)`

---

## AccessibilityReport (reports.AccessibilityReport)

| Field                | Type         | Notes                                      |
|----------------------|--------------|--------------------------------------------|
| id                   | BigInt PK    |                                            |
| author               | FK           | → User (CASCADE)                           |
| location             | FK           | → AccessibilityLocation (CASCADE)          |
| title                | CharField    |                                            |
| description          | TextField    |                                            |
| category             | CharField    | Populated by AI classifier                 |
| issue                | CharField    | Populated by AI classifier                 |
| accessibility_impact | CharField    | low, medium, high, critical                |
| status               | CharField    | pending, verified, rejected, resolved      |
| ai_classification    | JSONField    | Raw AI output, nullable                    |
| created_at           | DateTime     | Auto                                       |
| updated_at           | DateTime     | Auto                                       |

Indexes: `status`, `author`, `location`
Default ordering: `-created_at`

---

## ReportImage (reports.ReportImage)

| Field       | Type      | Notes                        |
|-------------|-----------|------------------------------|
| id          | BigInt PK |                              |
| report      | FK        | → AccessibilityReport (CASCADE) |
| image       | ImageField| Uploaded to `reports/`       |
| uploaded_at | DateTime  | Auto                         |

---

## ReportClassification (reports.ReportClassification)

| Field               | Type      | Notes                                      |
|---------------------|-----------|--------------------------------------------|
| id                  | BigInt PK |                                            |
| report              | OneToOne  | → AccessibilityReport (CASCADE), unique    |
| suggested_category  | CharField | AI suggestion (validated against allowed)   |
| suggested_severity  | CharField | AI suggestion (low/medium/high/critical)   |
| keywords            | JSONField | List of strings                            |
| summary             | TextField | Short AI summary                           |
| confidence_score    | Float     | Nullable (0..1)                            |
| ai_provider         | CharField | e.g. `gemini`                              |
| model_name          | CharField | Configured model id                        |
| classification_status | CharField | pending, completed, failed               |
| error_message       | TextField | Failure reason (if any)                    |
| created_at          | DateTime  | Auto                                       |
| updated_at          | DateTime  | Auto                                       |

Indexes: `classification_status`, `report`. One classification per report; reprocessing updates the same record. AI suggestions do not overwrite user report fields.

| Field      | Type      | Notes                              |
|------------|-----------|------------------------------------|
| id         | BigInt PK |                                    |
| report     | FK        | → AccessibilityReport (CASCADE)    |
| verifier   | FK        | → User (CASCADE)                   |
| vote       | CharField | `confirm` or `dispute`             |
| comment    | TextField | Optional                           |
| created_at | DateTime  | Auto                               |

Unique constraint: `(report, verifier)` — one vote per user per report.
