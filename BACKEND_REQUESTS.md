# Magic Track — Backend Requests

**For:** Backend developer (api-magic.milesahead.services)
**From:** Dashboard / kiosk frontend
**Date:** 13 Oct 2026

The Magic Track dashboard (app-magic) and the customer kiosk (`/kiosk`) are now connected to the live API. Everything below was checked against `https://api-magic.milesahead.services` with one test booking (id 1, already deleted).

Orders, appointments and kiosk orders all use the **booking** endpoints. What works today and what we need from you is listed below.

---

## 1. New columns on the `bookings` table: ✅ done (15 Oct 2026)

Thanks! `discount`, `coupon_serial`, `fleet_discount`, `subtotal`, `payment_type` and `payment_status` are now sent by the dashboard and kiosk. **Please confirm the column types.** We send:

| Column | We send | Example |
|---|---|---|
| `discount` | text | `Coupon`, `Loyalty Free`, `Fleet Discount` |
| `coupon_serial` | text | `MT-2041` |
| `fleet_discount` | number (amount taken off) | `50` |
| `subtotal` | number | `650` |
| `payment_type` | text | `Fawran`, `Paylater`, `Partner Credit` |
| `payment_status` | text | `paid` / `unpaid` |

If `discount` or `coupon_serial` is a number column, please change it to VARCHAR. Otherwise the server rejects these values and the order is saved without them.

## 2. Ignore unknown fields instead of failing (recommended)

Please whitelist the allowed fields in `create booking` and `update booking`, and ignore anything else. A new or unexpected field should not crash the insert with a SQL error.

## 3. Security (important)

| Endpoint | Today | Should be |
|---|---|---|
| `POST /api/v1/booking/all-bookings` | Works **without a token** | Admin / Manager token only |
| `GET /api/v1/booking/one-booking-details/:id` | Please check | Admin / Manager token only |
| `POST /api/v1/booking/update-status` | Please check | Admin / Manager token only |
| `PUT /api/v1/booking/update-booking/:id` | Please check | Admin / Manager token only |
| `PUT /api/v1/booking/delete-booking/:id` | Please check | Admin token only |
| `POST /api/v1/booking/booking` | Works without a token | Can stay public. The kiosk needs it. Please add rate limiting. |

Right now anyone with the URL can list every customer's name, phone number and order.

## 4. Manager account

Only an `admin` account exists (`role: "admin"`). The dashboard supports **Admin** and **Manager** (a Manager cannot delete orders). Please create:
- a role named `manager`
- at least one manager login (username + password) for the client

## 5. Postman collection fixes

- **Delete Booking** points to `PUT /api/v1/identity/update-profile` by mistake. The real route, which works, is `PUT /api/v1/booking/delete-booking/:id`.
- The `baseURL` / `base_url` variables are empty. Please set them to `https://api-magic.milesahead.services`.
- The collection is identical to the Miles Ahead one. Please add any Magic Track-specific endpoints when you create them.

## 6. How we store Magic Track data in the existing columns (please confirm this is OK)

| Magic Track field | Booking column | Values |
|---|---|---|
| Order type | `Service` | `car wash` for orders, `appointment` for future appointments |
| Where it came from | `service_type` | `walk-in` (dashboard), `kiosk`, `appointment` |
| Wash stage (queue screen) | `status` | `waiting` → `washing` → `ready` → `collected` (appointments: `scheduled` / `cancelled`). Orders before 15 Oct 2026 have `paid` / `unpaid` here. |
| Payment status | `payment_status` | `unpaid` / `paid` |
| Main service | `package` + `sub_Service` | e.g. `Body Polishing`. For appointments: `Detailing` / `Polishing` / `Graphene` |
| Main service price | `package_price` | price-list price for the vehicle |
| Vehicle type | `car_name` | `Sedan`, `SUV`, `7-Seater`, `Crossover`, `GMC / Large SUV` |
| Number plate | `car_number` | |
| Other services | `add_ons` + `add_ons_price` | comma separated, e.g. `Seat Cover, Floor Mat` |
| Payment method | `payment_method` | `Cash` / `Card` |
| Payment type | `payment_type` (also `payment_channel`) | `Fawran` / `Paylater` / `Partner Credit` |
| Total | `price` | final amount after discount |
| Notes | `special_instructions` | |
| Kiosk queue number | (derived) | `A` + `booking_number` |

If you would rather have a separate appointments table or a dedicated kiosk endpoint, let us know the routes and we will switch.

## 7. Smaller things

- Vehicle images in `/api/v1/vehicle/all` point to `https://api.magictrack.com.qa/...`. Is that domain live?
- Packages / vehicles / add-ons still hold the old Miles Ahead car wash prices. The dashboard uses the Magic Track price list built into the frontend, so these tables are not used now. If the client wants to edit prices from the dashboard later, we will need a price table for each service and vehicle type.
- `GET /` returns `"Hello MilesAhead"`. This is cosmetic only.

---

## 8. Screen ads for the queue display (new, 18 Oct 2026)

The queue screen (`/queue`) runs on a 43" portrait display in the waiting area. Between queue views it plays one ad full screen: a video of the washing process, a picture, and so on. The client manages these ads from the dashboard (**Screen Ads** page). The frontend is built and waiting for these routes. We switch one flag, `BACKEND_HAS_SCREEN_ADS` in `utils/screenAds.js`, when they are live.

**Table `screen_ads`**

| Column | Type | Notes |
|---|---|---|
| `id` | INT, auto increment | |
| `title` | VARCHAR(150) | e.g. "Our washing process" |
| `type` | VARCHAR(10) | `video` or `image` |
| `file_url` | VARCHAR(500) | Full public URL of the uploaded file |
| `seconds` | INT | How long a picture shows. Videos play to the end. |
| `sort_order` | INT | Play order, smallest first |
| `is_active` | TINYINT(1) | 1 = plays on the screen, 0 = hidden |
| `is_deleted` | TINYINT(1) | Soft delete, like bookings |
| `created_at` | DATETIME | |

**Settings:** one value, `queue_seconds` (default 45), which sets how long the queue shows between ads. This can be a one-row `screen_settings` table or a key/value table.

**Routes**

| Route | Auth | Body / response |
|---|---|---|
| `GET /api/v1/screen-ads/active` | **Public** (the display is not logged in) | Active, not deleted, ordered by `sort_order`: `{ success, data: [ {id, title, type, file_url, seconds, sort_order, is_active} ] }` |
| `GET /api/v1/screen-ads/all` | Admin / Manager | Same, including hidden ones |
| `POST /api/v1/screen-ads/add` | Admin / Manager | **multipart**: `file`, `title`, `type`, `seconds`, `sort_order`, `is_active` |
| `PUT /api/v1/screen-ads/update/:id` | Admin / Manager | JSON, any of: `title`, `seconds`, `sort_order`, `is_active` |
| `PUT /api/v1/screen-ads/delete/:id` | Admin | Soft delete |
| `GET /api/v1/screen-ads/settings` | **Public** | `{ success, data: { queue_seconds } }` |
| `PUT /api/v1/screen-ads/settings` | Admin / Manager | JSON `{ queue_seconds }` |

**Uploads**
- Accept `video/mp4`, `video/webm`, `image/jpeg`, `image/png` and `image/webp`, up to **200 MB**. Please raise the nginx `client_max_body_size` and the upload limit to match.
- Serve the files from a public URL with **byte-range support** (`Accept-Ranges: bytes`). Videos need this to stream and loop smoothly on the display. A static folder behind nginx is ideal.
- CORS must allow the dashboard origin, as it already does for bookings.

**Also for the queue display (from section 3):** a public `GET /api/v1/booking/queue-today` returning only `booking_number`, `status` and the last 3 digits of `car_number` for today's car wash orders that are not `collected`. Then the display needs no staff login at all.

---

## 9. Super Admin / Admin logins and delete requests (new, 18 Oct 2026)

The client wants two kinds of dashboard login:
- **Super Admin** sees and changes everything, can delete, and approves delete requests.
- **Admin** enters and updates orders, but **cannot delete**. Instead an Admin sends a **delete request** with a reason, and the Super Admin approves it (the order is deleted) or keeps the order.

**Roles and accounts**
- Please add a role **`super_admin`** and give it to the owner's account.
- Staff accounts get the role **`admin`**.
- The frontend reads `user.role` from `POST /api/v1/identity/login`.
- Until this exists, the frontend treats today's `admin` account as the Super Admin and `manager` accounts as Admins. When the roles are live, we switch one flag (`BACKEND_HAS_SUPER_ADMIN_ROLE` in `app/contexts/AuthContext.js`).
- Please also send us the logins you create for the client (one Super Admin, and Admins as needed).

**Enforce it on the server.** Hiding buttons in the dashboard isn't security:

| Route | Allowed |
|---|---|
| `PUT /api/v1/booking/delete-booking/:id` | **super_admin only** |
| `PUT /api/v1/screen-ads/delete/:id` | super_admin only |
| Create / update bookings, update-status, all-bookings, screen-ads add/update | super_admin and admin |

**New columns on `bookings` for delete requests.** The frontend sends these with `PUT /api/v1/booking/update-booking/:id`:

| Column | Type | Example |
|---|---|---|
| `delete_requested` | TINYINT(1), default 0 | `1` = waiting for the Super Admin, `0` = none or rejected |
| `delete_reason` | VARCHAR(255), nullable | "Entered twice by mistake" |
| `delete_requested_by` | VARCHAR(100), nullable | Username of the Admin |
| `delete_requested_at` | DATETIME, nullable | `2026-10-18 14:05:00` |

**Recommended, so the Super Admin always knows who did what:** an audit log table (`activity_log`: who, action, booking id, old/new values, time), written by the server on every create, update, status change, delete request and delete, plus a `GET` route to read it. With that, we can add an **Activity Log** page for the Super Admin.
