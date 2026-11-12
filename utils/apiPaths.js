// Magic Track backend. Override with NEXT_PUBLIC_API_URL in .env.local if needed.
export const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api-magic.milesahead.services";

export const API_PATHS = {
    AUTH: {
        SIGNUP_REQUEST_OTP: "/api/v1/signup/request-otp",
        LOGIN_REQUEST_OTP: "/api/v1/login/request-otp",
        SIGNUP_VERIFY_OTP: "/api/v1/signup/verify-otp",
        LOGIN_VERIFY_OTP: "/api/v1/login/verify-otp",
        GOOGLE_AUTH: "/api/v1/auth/google",
        APPLE_AUTH: "/api/v1/auth/apple",
        REFRESH_TOKEN: "/api/v1/refresh-token",
    },

    ROLES: {
        ADD_ROLE: "/api/v1/add-role",
        GET_ALL_ROLES: "/api/v1/role-details",
        GET_ROLE_BY_ID: (roleId) => `/api/v1/role-one-details/${roleId}`,
        UPDATE_ROLE: (roleId) => `/api/v1/update-role-details/${roleId}`,
        DELETE_ROLE: (roleId) => `/api/v1/delete-role-details/${roleId}`,
    },

    CARS: {
        ADD_CAR: "/api/v1/user/add-car",
        GET_ALL_CARS: "/api/v1/user/cars",
        GET_CAR_BY_ID: (carId) => `/api/v1/user/car-one-details/${carId}`,
        UPDATE_CAR: (carId) => `/api/v1/user/update-car-details/${carId}`,
        DELETE_CAR: (carId) => `/api/v1/user/delete-car-details/${carId}`, // NOTE: In postman this endpoint was wrong; fixed
    },

    RATING_TIP: {
        ADD_RATING_TIP: "/api/v1/rating_tip",
        GET_ALL_RATING_TIP: "/api/v1/all-rating_tip",
        GET_RATING_BY_DRIVER: (driverId) => `/api/v1/rating_tip-driver?driver_id=${driverId}`,
        GET_RATING_BY_ID: (ratingId) => `/api/v1/rating_tip/${ratingId}`,
        UPDATE_RATING: (ratingId) => `/api/v1/update-rating_tip/${ratingId}`,
        DELETE_RATING: (ratingId) => `/api/v1/delete-rating_tip/${ratingId}`,
    },

    DRIVER_AUTH: {
        REGISTER: "/api/v1/identity/register",
        LOGIN: "/api/v1/identity/login",
    },

    DRIVER_MANAGEMENT: {
        GET_PROFILE: (id) => `/api/v1/identity/profile/${id}`,
        GET_CHAUFFEUR_PROFILE: (id) => `/api/v1/profile/${id}`,
        UPDATE_PROFILE: (id) => `/api/v1/identity/update-profile/${id}`,
        DELETE_PROFILE: (id) => `/api/v1/identity/delete-profile/${id}`,
        GET_ALL_USERS: "/api/v1/identity/all-users",
    },

    USER_MANAGEMENT: {
        GET_USER_PROFILE: (id) => `/api/v1/auth/profile/${id}`,
        UPDATE_USER_PROFILE: (id) => `/api/v1/auth/update-profile/${id}`,
        DELETE_USER_PROFILE: (id) => `/api/v1/auth/delete-profile/${id}`,
        GET_ALL_USERS: "/api/v1/auth/all-users",
    },

    // Car wash pricing. NOTE: the Postman collection lists these as
    // /package/all etc, but the real paths carry the /api/v1 prefix like
    // everything else — verified against the live API.
    PACKAGES: {
        GET_ALL: "/api/v1/package/all",
        GET_ONE: (id) => `/api/v1/package/one/${id}`,
        ADD: "/api/v1/package/add",
        UPDATE: (id) => `/api/v1/package/update/${id}`,
        DELETE: (id) => `/api/v1/package/delete/${id}`,
    },

    VEHICLES: {
        GET_ALL: "/api/v1/vehicle/all",
        GET_ONE: (id) => `/api/v1/vehicle/one/${id}`,
        ADD: "/api/v1/vehicle/add",
        UPDATE: (id) => `/api/v1/vehicle/update/${id}`,
        DELETE: (id) => `/api/v1/vehicle/delete/${id}`,
    },

    ADDONS: {
        GET_ALL: "/api/v1/addon/all",
        GET_ONE: (id) => `/api/v1/addon/one/${id}`,
        ADD: "/api/v1/addon/add",
        UPDATE: (id) => `/api/v1/addon/update/${id}`,
        DELETE: (id) => `/api/v1/addon/delete/${id}`,
    },

    BOOKING: {
        UPDATE_BOOKING: (bookingId) => `/api/v1/booking/update-booking/${bookingId}`,
        CREATE_BOOKING: "/api/v1/booking/booking",
        UPDATE_STATUS: "/api/v1/booking/update-status",
        GET_ALL_BOOKINGS: "/api/v1/booking/all-bookings",
        GET_BOOKING_BY_ID: (bookingId) => `/api/v1/booking/one-booking-details/${bookingId}`,
        GET_RECENT_BOOKINGS: "/api/v1/booking/recent",
        // NOTE: Not in the Postman collection (its "Delete Booking" request
        // points at identity/update-profile by mistake). Verified on the live
        // Magic Track API: PUT /api/v1/booking/delete-booking/:id works.
        DELETE_BOOKING: (bookingId) => `/api/v1/booking/delete-booking/${bookingId}`,
        // Receipt PDF for the customer's WhatsApp message; returns { url }.
        UPLOAD_RECEIPT: (bookingId) => `/api/v1/booking/receipt/${bookingId}`,
    },

    ACTIVITY_LOG: {
        GET_ALL: "/api/v1/activity-log",
    },

    // WhatsApp broadcast (Super Admin only)
    BROADCAST: {
        SETTINGS: "/api/v1/broadcast/settings",
        SETTINGS_CHECK: "/api/v1/broadcast/settings/check",
        AUDIENCE_PREVIEW: "/api/v1/broadcast/audience-preview",
        SEND: (id) => `/api/v1/broadcast/send/${id}`,
        RECIPIENTS: (id) => `/api/v1/broadcast/recipients/${id}`,
        GET_ALL: "/api/v1/broadcast/all",
        ADD: "/api/v1/broadcast/add",
        UPDATE: (id) => `/api/v1/broadcast/update/${id}`,
        DELETE: (id) => `/api/v1/broadcast/delete/${id}`,
        OPT_OUTS: "/api/v1/broadcast/opt-outs",
        OPT_OUT_DELETE: (phone) => `/api/v1/broadcast/opt-outs/delete/${encodeURIComponent(phone)}`,
        TEMPLATES: "/api/v1/broadcast/templates",
        TEMPLATE_ADD: "/api/v1/broadcast/templates/add",
        TEMPLATE_UPDATE: (id) => `/api/v1/broadcast/templates/update/${id}`,
        TEMPLATE_DELETE: (id) => `/api/v1/broadcast/templates/delete/${id}`,
        TEMPLATE_SUBMIT: (id) => `/api/v1/broadcast/templates/submit/${id}`,
        TEMPLATE_SYNC: "/api/v1/broadcast/templates/sync",
        TEMPLATE_TEST: (id) => `/api/v1/broadcast/templates/test/${id}`,
    },

    // Inventory: wash supplies and products for sale
    INVENTORY: {
        ITEMS: "/api/v1/inventory/items",
        ITEM_ADD: "/api/v1/inventory/items/add",
        ITEM_UPDATE: (id) => `/api/v1/inventory/items/update/${id}`,
        ITEM_DELETE: (id) => `/api/v1/inventory/items/delete/${id}`,
        MOVEMENTS: "/api/v1/inventory/movements",
        MOVEMENT_ADD: "/api/v1/inventory/movements/add",
        SUMMARY: "/api/v1/inventory/summary",
        CONSUMPTION: "/api/v1/inventory/consumption",
        MACHINERY: "/api/v1/inventory/machinery",
        MACHINE_ADD: "/api/v1/inventory/machinery/add",
        MACHINE_UPDATE: (id) => `/api/v1/inventory/machinery/update/${id}`,
        MACHINE_DELETE: (id) => `/api/v1/inventory/machinery/delete/${id}`,
    },

    // Customers + vehicles (job cards link to these)
    CUSTOMERS: {
        SEARCH: "/api/v1/customers/search",
        ADD: "/api/v1/customers/add",
        ONE: (id) => `/api/v1/customers/${id}`,
        UPDATE: (id) => `/api/v1/customers/update/${id}`,
        VEHICLE_ADD: (id) => `/api/v1/customers/${id}/vehicles/add`,
        VEHICLE_UPDATE: (id) => `/api/v1/customers/vehicles/update/${id}`,
    },

    // Job cards: the work order for one visit
    JOB_CARDS: {
        GET_ALL: "/api/v1/job-cards",
        ONE: (id) => `/api/v1/job-cards/${id}`,
        ADD: "/api/v1/job-cards/add",
        UPDATE: (id) => `/api/v1/job-cards/update/${id}`,
        STATUS: (id) => `/api/v1/job-cards/status/${id}`,
        TECHNICIANS: "/api/v1/job-cards/technicians",
    },

    // Running costs: bills, rent, salaries (Super Admin only)
    EXPENSES: {
        GET_ALL: "/api/v1/expenses",
        SUMMARY: "/api/v1/expenses/summary",
        BILL: (id) => `/api/v1/expenses/bill/${id}`,
        ADD: "/api/v1/expenses/add",
        UPDATE: (id) => `/api/v1/expenses/update/${id}`,
        DELETE: (id) => `/api/v1/expenses/delete/${id}`,
    },
};
