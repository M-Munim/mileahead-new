export const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.milesahead.services";

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

    BOOKING: {
        UPDATE_BOOKING: (bookingId) => `/api/v1/booking/update-booking/${bookingId}`,
        CREATE_BOOKING: "/api/v1/booking/booking",
        UPDATE_STATUS: "/api/v1/booking/update-status",
        GET_ALL_BOOKINGS: "/api/v1/booking/all-bookings",
        GET_BOOKING_BY_ID: (bookingId) => `/api/v1/booking/one-booking-details/${bookingId}`,
        GET_RECENT_BOOKINGS: "/api/v1/booking/recent",
    },
};
