# Car Wash Orders — Backend API Specification

**Feature:** Car Wash Orders (admin panel)
**Frontend route:** `/orders`
**Prepared for:** Backend / API integration
**Status:** Frontend is built and working on local sample data + `localStorage`. It now needs real API routes to replace the demo data.

---

## 1. Overview

The Car Wash Orders screen lets an admin manage car wash bookings and move each order through its lifecycle as the cleaner reports in. Each order flows through **5 statuses**, and the admin advances it **one step at a time** (one tap = next status). Some transitions also send a push notification to the customer's app.

Right now the frontend holds all orders in a local array (`SAMPLE_ORDERS`) and persists changes to `localStorage`. We need the backend to provide:

1. A **list** endpoint (with status filter, search, counts).
2. A **single order detail** endpoint.
3. A **status transition** endpoint (advance / update status).
4. (Optional) a **create order** endpoint if orders are created from the admin panel too.

The frontend already uses **Axios with a `Bearer <token>` Authorization header** (token from `localStorage`), base URL configured centrally. Please keep these endpoints consistent with that pattern. Responses currently expect the app's standard envelope (`{ success, message, data }`).

---

## 2. Order Lifecycle (statuses)

Orders move through this fixed sequence:

| # | Status key  | Display label           | Status pill color |
|---|-------------|-------------------------|-------------------|
| 1 | `pending`   | Pending Confirmation    | Yellow            |
| 2 | `confirmed` | Confirmed               | Blue              |
| 3 | `enroute`   | Cleaner En Route        | Purple            |
| 4 | `arrived`   | Cleaner Arrived         | Teal              |
| 5 | `completed` | Completed               | Green             |

**Transitions (the only allowed moves):**

| From        | Action button (row / detail)     | To          | Notify customer? |
|-------------|----------------------------------|-------------|------------------|
| `pending`   | Confirm / Confirm Order          | `confirmed` | No               |
| `confirmed` | Mark En Route                    | `enroute`   | No               |
| `enroute`   | Mark Arrived / Mark as Arrived   | `arrived`   | **Yes**          |
| `arrived`   | Mark Completed / Mark as Completed | `completed` | **Yes**        |
| `completed` | — (no action, terminal state)    | —           | —                |

> Transitions are **forward-only and sequential** — an order can only advance to the immediate next status. The backend should reject any out-of-order transition.

When `notify = true`, the transition should trigger a push notification to the customer's app (e.g. "Your cleaner has arrived", "Service completed"). The frontend shows a toast confirming the customer was notified.

Each transition should also **record a timestamp** for that status (see `history` in the data model), which the detail view renders as a progress timeline.

---

## 3. Data Model — Order object

This is the exact shape the frontend consumes today. Field names can be adjusted, but if you change them please tell us so we can update the mapping.

```jsonc
{
  "id": "CW-1042",                    // Order ID / reference number (string, shown as "#CW-1042")
  "status": "pending",                // one of: pending | confirmed | enroute | arrived | completed

  "customer": {
    "name": "Jane Doe",
    "phone": "+974 5511 2233"
  },

  "cleaner": {                        // null until a cleaner is assigned
    "name": "Rajesh (Cleaner)",
    "phone": "+974 3311 9900"
  },

  "package": "Classic Care",          // service package name (see §5)
  "addOn": "Hygiene Plus",            // add-on name, or "—" / null if none
  "vehicle": "Sedan",                 // vehicle type (see §5)
  "location": "Al Waab St",           // service address / area
  "time": "Today, 4:00 PM",           // scheduled slot (display string)
  "bookedAt": "Today · 12:40 PM",     // when the booking was created (display string)
  "total": 55,                        // price total in QAR (number)

  "history": {                        // timestamp per status reached (for the progress timeline)
    "confirmed": "2:10 PM",
    "enroute":   "1:55 PM",
    "arrived":   "12:55 PM",
    "completed": "10:50 AM"
  }
}
```

### Field notes
- **`id`** — displayed as `#CW-1042`. Prefix `CW-` = Car Wash. Backend can use its own ID scheme; we just need a stable string reference.
- **`cleaner`** — `null` when no cleaner is assigned yet. The detail view shows a "No cleaner assigned yet" note in that case. If cleaner assignment happens through this admin panel, we'll need an assign endpoint too (not built on the frontend yet — flag if you want it).
- **`time` / `bookedAt`** — currently free-form display strings. **Preferred:** send real ISO 8601 timestamps (e.g. `"2026-07-24T16:00:00Z"`) and we'll format them on the frontend. Please confirm which you'll send.
- **`history`** — currently a map of `statusKey → time string`. **Preferred:** send ISO timestamps here too.
- **`total`** — numeric, currency is QAR (Qatari Riyal), shown as `QAR 55`.

---

## 4. Endpoints

Suggested paths — adjust to your routing conventions. All require the `Authorization: Bearer <token>` header (admin auth).

### 4.1 List orders
```
GET /car-wash/orders
```
Returns orders plus the per-status counts used by the filter tabs.

**Query params:**
| Param    | Type   | Notes                                                                 |
|----------|--------|-----------------------------------------------------------------------|
| `status` | string | Optional. One of the 5 status keys. Omit or `all` = every status.     |
| `search` | string | Optional. Matches on order id, customer name, phone, location, package.|
| `page`   | number | Optional, for pagination.                                             |
| `limit`  | number | Optional, for pagination.                                            |

> Search + tab filtering are currently done client-side. Server-side is fine too — just return the filtered list. Either way we need the **counts** below computed across the full (unfiltered-by-tab) set.

**Response:**
```jsonc
{
  "success": true,
  "message": "Orders fetched",
  "data": {
    "orders": [ /* array of Order objects — see §3 */ ],
    "counts": {
      "all": 15,
      "pending": 3,
      "confirmed": 4,
      "enroute": 2,
      "arrived": 1,
      "completed": 5
    }
  }
}
```

### 4.2 Get single order
```
GET /car-wash/orders/:id
```
**Response:**
```jsonc
{
  "success": true,
  "message": "Order fetched",
  "data": { /* single Order object — see §3 */ }
}
```

### 4.3 Advance / update order status
```
PATCH /car-wash/orders/:id/status
```
This is the main action endpoint (Confirm, Mark En Route, Mark Arrived, Mark Completed).

**Request body:**
```jsonc
{
  "status": "confirmed"   // the target status the order is moving TO
}
```

**Backend responsibilities on this call:**
1. Validate the transition is the **immediate next** status (reject skips / backward moves → `400`).
2. Set the new status and **stamp `history[status]`** with the current server time.
3. If moving to `arrived` or `completed`, **send the push notification** to the customer.

**Response:**
```jsonc
{
  "success": true,
  "message": "Order status updated",
  "data": { /* updated Order object */ }
}
```

**Error example (invalid transition):**
```jsonc
{ "success": false, "message": "Cannot move order from 'pending' to 'arrived'", "data": null }
```

### 4.4 Create order (optional — confirm if needed)
```
POST /car-wash/orders
```
Only needed if orders can be created from the admin panel. Not currently wired on the frontend. If customer-app bookings create orders on your side, we may not need this. **Please confirm.**

**Request body (if built):**
```jsonc
{
  "customer": { "name": "Jane Doe", "phone": "+974 5511 2233" },
  "package": "Classic Care",
  "addOn": "Hygiene Plus",
  "vehicle": "Sedan",
  "location": "Al Waab St",
  "time": "2026-07-24T16:00:00Z",
  "total": 55
}
```
New orders start at status `pending` with `cleaner = null` and empty `history`.

---

## 5. Reference values (from the current UI)

These are the values currently shown in the demo data. Please confirm the authoritative list on the backend — ideally these come from the **Pricing & Fees Management** module, not hardcoded.

**Service packages:**
- `Quick Shine`
- `Classic Care`
- `Premium Detail`
- `Quick Shine + Hygiene`

**Add-ons:**
- `Hygiene Plus`
- (none) → `"—"` or `null`

**Vehicle types:**
- `Hatchback`
- `Sedan`
- `SUV`
- `4x4`
- `4x4 / Pickup`
- `Van`

> Pricing appears to vary by package **and** vehicle type (e.g. Classic Care is QAR 55 on a Sedan but QAR 65 on a Van). If pricing lives in the Pricing module, the order's `total` should be resolved from there at booking time. Please advise how you want package/vehicle/add-on pricing structured.

---

## 6. Open questions for the backend dev

1. **Timestamps:** OK to send ISO 8601 for `time`, `bookedAt`, and `history`? (Frontend will format.)
2. **Cleaner assignment:** Is assigning a cleaner done here (needs an endpoint) or elsewhere?
3. **Create order:** Do we need §4.4, or are orders created only from the customer app?
4. **Packages / add-ons / vehicle pricing:** Come from the Pricing module, or a dedicated config endpoint?
5. **Push notification:** Confirm the backend owns sending it on `arrived` / `completed` transitions.
6. **Pagination:** Needed now, or is the list small enough to return in full?
7. **Response envelope:** Confirm `{ success, message, data }` matches your other endpoints.

---

*Generated from the current frontend implementation (`app/orders/page.js`). Field names and the status flow reflect exactly what the UI renders today.*
