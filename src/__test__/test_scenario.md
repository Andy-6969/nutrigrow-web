# 📋 NutriGrow — Test Scenario Documentation

> **Total Test Suites:** 15  
> **Total Test Cases:** 536  
> **Status:** ✅ All Passed  
> **Framework:** Jest + @testing-library/react  
> **Last Updated:** 2026-04-18

---

## 📁 Struktur Folder Test

```
src/__test__/
├── __mocks__/
│   └── styleMock.ts          # Mock CSS imports
├── setup.ts                   # Global test setup (mocks: Next.js, recharts, browser APIs)
├── test_scenario.md           # Dokumen ini
│
├── utils/                     # Utility & Data Layer
│   ├── utils.test.ts          # Utility functions
│   ├── constants.test.ts      # Application constants
│   └── mockData.test.ts       # Mock data integrity
│
├── types/                     # Type Validation
│   └── global.types.test.ts   # Interface shape validation
│
├── layout/                    # Layout Component
│   └── dashboard-layout.test.ts
│
├── auth/                      # Authentication
│   └── login.test.ts
│
├── overview/                  # Dashboard Overview
│   └── overview.test.ts
│
├── agri-twin/                 # Digital Twin
│   └── agri-twin.test.ts
│
├── monitoring/                # Sensor Monitoring
│   └── monitoring.test.ts
│
├── eco-savings/               # Eco-Savings Dashboard
│   └── eco-savings.test.ts
│
├── schedules/                 # Schedule Management
│   └── schedules.test.ts
│
├── override/                  # Manual Override
│   └── override.test.ts
│
├── notifications/             # Notification Center
│   └── notifications.test.ts
│
├── devices/                   # Device Management
│   └── devices.test.ts
│
└── settings/                  # Settings Page
    └── settings.test.ts
```

---

## 1. 🔧 Utils — Utility Functions

**File:** `utils/utils.test.ts`  
**Total Tests:** 53

### cn() — Class Name Merger
| # | Scenario | Type | Expected Result |
|---|----------|------|-----------------|
| 1 | Merge multiple string classnames | ✅ Positive | `'foo bar'` |
| 2 | Handle single classname | ✅ Positive | `'foo'` |
| 3 | Handle conditional truthy values | ✅ Positive | `'base active'` |
| 4 | Handle array of classnames | ✅ Positive | `'foo bar'` |
| 5 | Handle object-style classnames | ✅ Positive | `'active'` |
| 6 | Handle mixed types | ✅ Positive | `'foo bar baz'` |
| 7 | Handle empty arguments | ❌ Negative | `''` |
| 8 | Filter out falsy values | ❌ Negative | `'foo'` |
| 9 | Filter out null and undefined | ❌ Negative | `'foo bar'` |
| 10 | Filter out empty strings | ❌ Negative | `'foo bar'` |
| 11 | Handle object with all false | ❌ Negative | `''` |

### formatNumber() — Number Formatter (id-ID)
| # | Scenario | Type | Expected Result |
|---|----------|------|-----------------|
| 1 | Format integer without decimals | ✅ Positive | `'12.450'` |
| 2 | Format with 1 decimal | ✅ Positive | `'34,5'` |
| 3 | Format large numbers | ✅ Positive | `'2.100.000'` |
| 4 | Format zero | ✅ Positive | `'0'` |
| 5 | Format with 2 decimals | ✅ Positive | `'99,12'` |
| 6 | Handle small numbers | ✅ Positive | `'5'` |
| 7 | Handle negative numbers | ❌ Negative | Contains `'500'` |
| 8 | Handle very large numbers | ❌ Negative | `'999.999.999'` |
| 9 | Handle decimal with 0 decimal param | ❌ Negative | `'100'` (rounded) |

### formatCurrency() — Indonesian Rupiah Formatter
| # | Scenario | Type | Expected Result |
|---|----------|------|-----------------|
| 1 | Format billions (M suffix) | ✅ Positive | `'Rp 1.0 M'` |
| 2 | Format millions (Jt suffix) | ✅ Positive | `'Rp 2.1 Jt'` |
| 3 | Format thousands (Rb suffix) | ✅ Positive | `'Rp 5.5 Rb'` |
| 4 | Format small amounts | ✅ Positive | `'Rp 500'` |
| 5 | Format exact million | ✅ Positive | `'Rp 1.0 Jt'` |
| 6 | Format 1.5 billion | ✅ Positive | `'Rp 1.5 M'` |
| 7 | Handle zero | ❌ Negative | `'Rp 0'` |
| 8 | Handle below 1000 | ❌ Negative | `'Rp 999'` |
| 9 | Handle exactly 1000 | ❌ Negative | `'Rp 1.0 Rb'` |
| 10 | Handle below 1 million | ❌ Negative | `'Rp 1000.0 Rb'` |

### formatRelativeTime() — Relative Time
| # | Scenario | Type | Expected Result |
|---|----------|------|-----------------|
| 1 | Less than 1 minute ago | ✅ Positive | `'Baru saja'` |
| 2 | 5 minutes ago | ✅ Positive | `'5 menit lalu'` |
| 3 | 3 hours ago | ✅ Positive | `'3 jam lalu'` |
| 4 | 2 days ago | ✅ Positive | `'2 hari lalu'` |
| 5 | Accept Date object input | ✅ Positive | `'10 menit lalu'` |
| 6 | Older than 7 days | ✅ Positive | Formatted date |
| 7 | Exactly 1 minute (boundary) | ❌ Negative | `'1 menit lalu'` |
| 8 | Exactly 1 hour (boundary) | ❌ Negative | `'1 jam lalu'` |
| 9 | 59 minutes (boundary) | ❌ Negative | `'59 menit lalu'` |
| 10 | Exactly 7 days (boundary) | ❌ Negative | Formatted date |

### getThresholdColor() — Sensor Threshold
| # | Scenario | Type | Expected Result |
|---|----------|------|-----------------|
| 1 | Value within range | ✅ Positive | `'success'` |
| 2 | Value equals low threshold | ✅ Positive | `'success'` |
| 3 | Value equals high threshold | ✅ Positive | `'success'` |
| 4 | Value below low | ✅ Positive | `'danger'` |
| 5 | Value above high | ✅ Positive | `'warning'` |
| 6 | Just below low (29.9) | ❌ Negative | `'danger'` |
| 7 | Just above high (75.1) | ❌ Negative | `'warning'` |
| 8 | Zero value | ❌ Negative | `'danger'` |
| 9 | Negative value | ❌ Negative | `'danger'` |
| 10 | Extreme high value | ❌ Negative | `'warning'` |
| 11 | Decimal thresholds (pH) | ❌ Negative | Varies |

### getSensorStatusColor()
| # | Scenario | Type | Expected Result |
|---|----------|------|-----------------|
| 1 | Success → green | ✅ Positive | `'#10B981'` |
| 2 | Warning → yellow | ✅ Positive | `'#F59E0B'` |
| 3 | Danger → red | ✅ Positive | `'#EF4444'` |
| 4 | Unknown → gray | ❌ Negative | `'#6B7280'` |
| 5 | Empty string → gray | ❌ Negative | `'#6B7280'` |
| 6 | Random string → gray | ❌ Negative | `'#6B7280'` |

---

## 2. 📐 Constants — Application Constants

**File:** `utils/constants.test.ts`  
**Total Tests:** 33

### App Metadata
| # | Scenario | Type | Expected |
|---|----------|------|----------|
| 1 | APP_NAME = 'NutriGrow' | ✅ Positive | `'NutriGrow'` |
| 2 | APP_TAGLINE correct | ✅ Positive | `'Smart Fertigation System'` |
| 3 | APP_VERSION semver format | ✅ Positive | Match `x.x.x` |
| 4 | Default API_BASE_URL | ✅ Positive | `'http://localhost:3001'` |
| 5 | Default WS_URL | ✅ Positive | `'http://localhost:3002'` |
| 6 | APP_NAME not empty | ❌ Negative | `!= ''` |
| 7 | APP_VERSION no alpha chars | ❌ Negative | No letters |

### ZONE_STATUS (4 statuses)
| # | Scenario | Type | Expected |
|---|----------|------|----------|
| 1 | Contains all 4 status types | ✅ Positive | irrigating, idle, delayed, error |
| 2 | Each status has label, color, bg, icon | ✅ Positive | All defined |
| 3 | Valid hex colors | ✅ Positive | Match `#XXXXXX` |
| 4 | Specific status label/color/icon checks | ✅ Positive | Exact values |
| 5 | No unknown status types | ❌ Negative | Not contain 'running', etc. |
| 6 | No empty labels or icons | ❌ Negative | `!= ''` |

### SENSOR_THRESHOLDS (4 sensors)
| # | Scenario | Type | Expected |
|---|----------|------|----------|
| 1 | Contains 4 sensor types | ✅ Positive | soilMoisture, temp, humidity, ph |
| 2 | Each has correct low/high/unit/label | ✅ Positive | Exact values |
| 3 | low < high for all thresholds | ✅ Positive | True |
| 4 | No negative low thresholds | ❌ Negative | >= 0 |
| 5 | No unknown sensor types | ❌ Negative | Not present |

### NAV_ITEMS (9 items)
| # | Scenario | Type | Expected |
|---|----------|------|----------|
| 1 | 9 navigation items | ✅ Positive | Length = 9 |
| 2 | Each has id, label, icon, href | ✅ Positive | All defined |
| 3 | All hrefs start with / | ✅ Positive | True |
| 4 | Unique IDs and hrefs | ✅ Positive | Set sizes match |
| 5 | Overview first, Settings last | ✅ Positive | Correct positions |
| 6 | No empty labels/ids | ❌ Negative | `!= ''` |

---

## 3. 📦 Mock Data — Data Integrity

**File:** `utils/mockData.test.ts`  
**Total Tests:** 76

### mockZones (10 tests)
- 5 zones with all properties, valid statuses, unique IDs
- Contains at least one of each status
- No empty names/crop types, no zero areas

### mockSensorData (10 tests)
- Data for each zone, all fields valid ranges (0-100 moisture, 0-50 temp, 0-14 pH)
- Valid ISO dates, battery <= 100, RSSI < 0

### mockSensorHistory (7 tests)
- 48 data points (every 30min), HH:MM format, starts 00:00, ends 23:30

### mockDevices (10 tests)
- 8 devices, valid types, semver firmware, unique IDs
- Mix of online/offline, battery 0-100, RSSI -100 to 0

### mockEcoSavings (6 tests)
- All savings positive, all trends positive

### mockEcoSavingsHistory (5 tests)
- 7 days (Sen-Min), all values positive

### mockWeather (8 tests)
- Valid temp/humidity/pop ranges, forecast entries

### mockNotifications (8 tests)
- Mix of read/unread, valid types, unique IDs, valid dates

### mockOverrideLogs (6 tests)
- Valid statuses, positive duration, unique IDs

### mockIrrigationLogs (8 tests)
- Valid source/status enums, running logs no ended_at, completed logs have ended_at

---

## 4. 🏗️ Types — Interface Shape Validation

**File:** `types/global.types.test.ts`  
**Total Tests:** 30

| Interface | Tests | Key Validations |
|-----------|-------|-----------------|
| ZoneStatus | 2 | Valid enum values, no invalid |
| Zone | 4 | All string/number types correct |
| SensorData | 2 | Number fields, optional battery/rssi |
| Device | 4 | device_type enum, boolean is_online |
| Notification | 2 | type enum, boolean is_read |
| EcoSavingsData | 1 | All 8 number fields |
| WeatherData | 2 | Correct shape with forecast array |
| OverrideLog | 2 | status enum, optional fields |
| IrrigationLog | 1 | source/status enums |

---

## 5. 📐 Dashboard Layout

**File:** `layout/dashboard-layout.test.ts`  
**Total Tests:** 35

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| Navigation | 4 | 9 items, unique IDs, hrefs start with / |
| Sidebar Collapse | 7 | Start expanded, toggle, width 72/260px, labels show/hide |
| Mobile Menu | 6 | Start closed, open/close, translate-x |
| Dark Mode | 3 | Default light, toggle both ways |
| Notification Badge | 4 | Count=3 unread, hide when all read |
| Active Route | 4 | Detect current path, fallback label |
| App Name/User | 5 | NutriGrow, Pak Budi/Manager |

---

## 6. 🔐 Auth — Login

**File:** `auth/login.test.ts`  
**Total Tests:** 22

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| Form Validation | 7 | Valid email regex, invalid format detection |
| Password Toggle | 4 | Hidden→visible→hidden, input type changes |
| Loading State | 5 | Not loading initially, set on submit, clear after response |
| Error State | 3 | No error initially, clear on submit, display when present |
| Redirect | 4 | → /overview, demo mode accepts all credentials |

---

## 7. 📊 Overview Dashboard

**File:** `overview/overview.test.ts`  
**Total Tests:** 30

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| KPI Cards | 6 | 4 metrics, positive values, correct formatting |
| Zone Cards | 6 | 5 zones with sensor data, status labels |
| Chart Selection | 5 | 4 types with colors/labels, default soil_moisture |
| Weather/Smart Delay | 6 | pop>70% activates delay, boundary at 70/71 |
| Activity Table | 7 | Source/status label mapping, positive volumes |

---

## 8. 🗺️ Agri-Twin (Digital Twin)

**File:** `agri-twin/agri-twin.test.ts`  
**Total Tests:** 31

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| Zone Positions | 6 | Percentage-based, within bounds, positive w/h |
| Selection Logic | 6 | Click select/deselect/switch |
| Detail Panel | 6 | 4 sensors, crop, area, battery, RSSI |
| Name Parsing | 3 | "Zona 1 - Sawah Utara" → "Sawah Utara" |
| Status Mapping | 4 | Colors per status, irrigating pulse |
| Zone List | 4 | All zones with moisture, icon, crop |

---

## 9. 📡 Monitoring

**File:** `monitoring/monitoring.test.ts`  
**Total Tests:** 33

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| Gauge Calculation | 8 | Cap 0-100%, formula validation |
| Status Determination | 12 | Soil/Temp/pH thresholds + color mapping |
| Zone Selection | 6 | Default z1, load sensor data, zone names |
| Time Range | 3 | Accept 24h/7d/30d, reject invalid |
| Per-Zone Data | 7 | z4 danger, z1 success for soil moisture |

---

## 10. 🌿 Eco-Savings

**File:** `eco-savings/eco-savings.test.ts`  
**Total Tests:** 28

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| KPI Data | 8 | Positive savings/trends, reasonable limits |
| Formatting | 4 | Water='12.450', Cost='Rp 2.1 Jt' |
| Weekly History | 9 | 7 days Sen-Min, positive values |
| Period Toggle | 3 | weekly/monthly accepted |
| Chart Data | 3 | Finite numbers for all fields |

---

## 11. 📅 Schedules

**File:** `schedules/schedules.test.ts`  
**Total Tests:** 39

### parseCron() (11 tests)
- Daily/specific days/midnight parsing
- Invalid input defaults to 0

### CRUD (13 tests)
- Toggle active, delete, create, update
- Non-existent ID handling

### Validation (8 tests) + Calendar (7 tests)
- Duration 1-120, unique IDs, 5-part cron
- Daily → 7 days, specific → correct indices

---

## 12. 🔧 Manual Override

**File:** `override/override.test.ts`  
**Total Tests:** 30

### formatTimer() (10 tests)
- 0s→00:00, 1s→00:01, 90s→01:30, 1800s→30:00

### Override Logic (20 tests)
- Requires zone selection, timer=duration×60
- Auto-stop at 0, restrictions during active
- Valid log data with correct zone refs

---

## 13. 🔔 Notifications

**File:** `notifications/notifications.test.ts`  
**Total Tests:** 33

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| Filtering | 7 | All/by type, sum=total, nonexistent=empty |
| Mark Read | 6 | Single/all, idempotent, non-existent no-op |
| Delete | 5 | Remove by ID, preserve others, non-existent no-op |
| Unread Count | 5 | Correct count, decrease on read, non-negative |
| Type Config | 5 | Each type has text-*/bg-* classes |

---

## 14. 📱 Devices

**File:** `devices/devices.test.ts`  
**Total Tests:** 31

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| getBatteryColor | 8 | >60%=green, 31-60%=yellow, ≤30%=red |
| getSignalBars | 10 | 0-4 bars based on RSSI ranges |
| Type Filter | 4 | all/sensor/actuator/gateway |
| Search | 3 | By ID, zone name, case-insensitive |
| Combined | 2 | Filter + search intersection |
| Online/Offline | 3 | Sum=total, both >0 |

---

## 15. ⚙️ Settings

**File:** `settings/settings.test.ts`  
**Total Tests:** 40

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| Tab Navigation | 8 | 4 tabs, default profile, switch |
| Profile Data | 7 | Name/email/role/farm, read-only fields |
| Notification Prefs | 10 | 4 toggles, defaults, isolation |
| Dark Mode | 5 | Default light, toggle, theme attribute |
| Password Change | 6 | 3 fields, match/mismatch/empty validation |
| Language | 3 | Indonesia + English |
| Session | 2 | Browser + IP display |

---

## 🏃 Cara Menjalankan Test

```bash
# Jalankan semua test
npm test

# Jalankan dengan coverage report
npm run test:coverage

# Jalankan test spesifik fitur
npx jest --verbose --testPathPattern="devices"
npx jest --verbose --testPathPattern="schedules"
npx jest --verbose --testPathPattern="monitoring"

# Jalankan test file tertentu
npx jest src/__test__/utils/utils.test.ts --verbose
```

---

## 📊 Ringkasan Cakupan Test per Fitur

| Fitur | File Test | Positive | Negative | Total |
|-------|-----------|----------|----------|-------|
| Utility Functions | `utils/utils.test.ts` | 30 | 23 | 53 |
| Constants | `utils/constants.test.ts` | 23 | 10 | 33 |
| Mock Data | `utils/mockData.test.ts` | 52 | 24 | 76 |
| Type Validation | `types/global.types.test.ts` | 25 | 5 | 30 |
| Dashboard Layout | `layout/dashboard-layout.test.ts` | 27 | 8 | 35 |
| Login/Auth | `auth/login.test.ts` | 15 | 7 | 22 |
| Overview | `overview/overview.test.ts` | 22 | 8 | 30 |
| Agri-Twin | `agri-twin/agri-twin.test.ts` | 24 | 7 | 31 |
| Monitoring | `monitoring/monitoring.test.ts` | 24 | 9 | 33 |
| Eco-Savings | `eco-savings/eco-savings.test.ts` | 21 | 7 | 28 |
| Schedules | `schedules/schedules.test.ts` | 28 | 11 | 39 |
| Override | `override/override.test.ts` | 22 | 8 | 30 |
| Notifications | `notifications/notifications.test.ts` | 22 | 11 | 33 |
| Devices | `devices/devices.test.ts` | 23 | 8 | 31 |
| Settings | `settings/settings.test.ts` | 29 | 11 | 40 |
| **TOTAL** | **15 files** | **387** | **157** | **536** |
