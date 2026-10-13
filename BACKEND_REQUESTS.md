# Magic Track — Backend Requests

**For:** Backend developer (api-magic.milesahead.services)
**From:** Dashboard / kiosk frontend
**Date:** 13 Oct 2026

The Magic Track dashboard (app-magic) and the customer kiosk (`/kiosk`) are now connected to the live API. Everything below was checked against `https://api-magic.milesahead.services` with one test booking (id 1, already deleted).

Orders, appointments and kiosk orders all use the **booking** endpoints. What works today and what we need from you is listed below.

---

## 1. New columns on the `bookings` table (needed)

The booking create/update endpoints write every field they receive straight into the table. Sending a field that has no column fails the whole request:

```
POST /api/v1/booking/booking  →  {"success":false,"message":"Unknown column 'payment_type' in 'field list'"}
```

So the dashboard currently **does not send** these, and the data is lost. Please add:

| Column | Type | Example | Used for |
|---|---|---|---|
| `discount` | VARCHAR(50), nullable | `Coupon`, `Loyalty Free`, `Fleet Discount` | Discount chosen on the order |
| `coupon_serial` | VARCHAR(100), nullable | `MT-2041` | Coupon serial number (a coupon gives 50% off) |
| `subtotal` | DECIMAL(10,2), nullable | `650.00` | Price before the discount (`price` stays the final total) |

Tell us when they are live. We switch one flag in the frontend (`BACKEND_HAS_DISCOUNT_FIELDS` in `utils/carWashApi.js`) and start sending them.

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
| Payment status | `status` | `unpaid` / `paid` (appointments: `scheduled` / `cancelled`) |
| Main service | `package` + `sub_Service` | e.g. `Body Polishing`. For appointments: `Detailing` / `Polishing` / `Graphene` |
| Main service price | `package_price` | price-list price for the vehicle |
| Vehicle type | `car_name` | `Sedan`, `SUV`, `7-Seater`, `Crossover`, `GMC / Large SUV` |
| Number plate | `car_number` | |
| Other services | `add_ons` + `add_ons_price` | comma separated, e.g. `Seat Cover, Floor Mat` |
| Payment method | `payment_method` | `Cash` / `Card` |
| Payment type | `payment_channel` | `Fawran` / `Paylater` / `Partner Credit` |
| Total | `price` | final amount after discount |
| Notes | `special_instructions` | |
| Kiosk queue number | (derived) | `A` + `booking_number` |

If you would rather have a separate appointments table or a dedicated kiosk endpoint, let us know the routes and we will switch.

## 7. Smaller things

- Vehicle images in `/api/v1/vehicle/all` point to `https://api.magictrack.com.qa/...`. Is that domain live?
- Packages / vehicles / add-ons still hold the old Miles Ahead car wash prices. The dashboard uses the Magic Track price list built into the frontend, so these tables are not used now. If the client wants to edit prices from the dashboard later, we will need a price table for each service and vehicle type.
- `GET /` returns `"Hello MilesAhead"`. This is cosmetic only.
