import axios from "axios";
import { BASE_URL, API_PATHS } from "./apiPaths";

// =======================================
// AXIOS CLIENT SETUP
// =======================================

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// Attach token automatically
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Global error handling with 401/403 support
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Don't handle cancelled requests
        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        const status = error?.response?.status;
        const message =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Something went wrong";

        // Handle authentication errors
        if (status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('userRole');
                // Only redirect if not already on login page
                if (!window.location.pathname.includes('/auth/login')) {
                    window.location.href = '/auth/login';
                }
            }
        }

        return Promise.reject({
            status,
            message,
            data: error?.response?.data,
        });
    }
);

// =======================================
// SERVICES
// =======================================

// ---------- ROLES ----------
export const roleService = {
    addRole: (body) =>
        api.post(API_PATHS.ROLES.ADD_ROLE, body),

    getAllRoles: () =>
        api.get(API_PATHS.ROLES.GET_ALL_ROLES),

    getRoleById: (id) =>
        api.get(API_PATHS.ROLES.GET_ROLE_BY_ID(id)),

    updateRole: (id, body) =>
        api.put(API_PATHS.ROLES.UPDATE_ROLE(id), body),

    deleteRole: (id) =>
        api.put(API_PATHS.ROLES.DELETE_ROLE(id)),
};

// ---------- CARS ----------
export const carService = {
    addCar: (body) =>
        api.post(API_PATHS.CARS.ADD_CAR, body),

    getAllCars: () =>
        api.get(API_PATHS.CARS.GET_ALL_CARS),

    getCarById: (id) =>
        api.get(API_PATHS.CARS.GET_CAR_BY_ID(id)),

    updateCar: (id, body) =>
        api.put(API_PATHS.CARS.UPDATE_CAR(id), body),

    deleteCar: (id) =>
        api.put(API_PATHS.CARS.DELETE_CAR(id)),
};

// ---------- RATING & TIP ----------
export const ratingService = {
    addRatingOrTip: (body) =>
        api.post(API_PATHS.RATING_TIP.ADD_RATING_TIP, body),

    getAllRatings: () =>
        api.get(API_PATHS.RATING_TIP.GET_ALL_RATING_TIP),

    getRatingsByDriver: (driverId) =>
        api.get(API_PATHS.RATING_TIP.GET_RATING_BY_DRIVER(driverId)),

    getRatingById: (id) =>
        api.get(API_PATHS.RATING_TIP.GET_RATING_BY_ID(id)),

    updateRating: (id, body) =>
        api.put(API_PATHS.RATING_TIP.UPDATE_RATING(id), body),

    deleteRating: (id) =>
        api.put(API_PATHS.RATING_TIP.DELETE_RATING(id)),
};

// ---------- DRIVER ----------
export const driverService = {
    register: (body) =>
        api.post(API_PATHS.DRIVER_AUTH.REGISTER, body),

    login: (body) =>
        api.post(API_PATHS.DRIVER_AUTH.LOGIN, body),

    getProfile: (id) =>
        api.get(API_PATHS.DRIVER_MANAGEMENT.GET_PROFILE(id)),

    getChauffeurProfile: (id) =>
        api.get(API_PATHS.DRIVER_MANAGEMENT.GET_CHAUFFEUR_PROFILE(id)),

    updateProfile: (id, body) =>
        api.put(API_PATHS.DRIVER_MANAGEMENT.UPDATE_PROFILE(id), body),

    deleteProfile: (id) =>
        api.put(API_PATHS.DRIVER_MANAGEMENT.DELETE_PROFILE(id)),

    getAllDrivers: (body) =>
        api.post(API_PATHS.DRIVER_MANAGEMENT.GET_ALL_USERS, body),
};

// ---------- USER MANAGEMENT ----------
export const userService = {
    getUserProfile: (id) =>
        api.get(API_PATHS.USER_MANAGEMENT.GET_USER_PROFILE(id)),

    updateUserProfile: (id, body) =>
        api.put(API_PATHS.USER_MANAGEMENT.UPDATE_USER_PROFILE(id), body),

    deleteUserProfile: (id) =>
        api.put(API_PATHS.USER_MANAGEMENT.DELETE_USER_PROFILE(id)),

    getAllUsers: (body) =>
        api.post(API_PATHS.USER_MANAGEMENT.GET_ALL_USERS, body),
};

// ---------- CAR WASH PRICING ----------
// Packages and add-ons take JSON. Vehicles take multipart/form-data because the
// endpoint also accepts an image; we omit the file so the existing image stays.

export const packageService = {
    getAll: () => api.get(API_PATHS.PACKAGES.GET_ALL),

    getOne: (id) => api.get(API_PATHS.PACKAGES.GET_ONE(id)),

    add: (body) => api.post(API_PATHS.PACKAGES.ADD, body),

    update: (id, body) => api.put(API_PATHS.PACKAGES.UPDATE(id), body),

    remove: (id) => api.put(API_PATHS.PACKAGES.DELETE(id)),
};

export const addonService = {
    getAll: () => api.get(API_PATHS.ADDONS.GET_ALL),

    getOne: (id) => api.get(API_PATHS.ADDONS.GET_ONE(id)),

    add: (body) => api.post(API_PATHS.ADDONS.ADD, body),

    update: (id, body) => api.put(API_PATHS.ADDONS.UPDATE(id), body),

    remove: (id) => api.put(API_PATHS.ADDONS.DELETE(id)),
};

export const vehicleService = {
    getAll: () => api.get(API_PATHS.VEHICLES.GET_ALL),

    getOne: (id) => api.get(API_PATHS.VEHICLES.GET_ONE(id)),

    // `body` is a FormData instance. Content-Type is cleared so the browser
    // sets multipart/form-data with the correct boundary.
    add: (body) =>
        api.post(API_PATHS.VEHICLES.ADD, body, {
            headers: { 'Content-Type': undefined },
        }),

    update: (id, body) =>
        api.put(API_PATHS.VEHICLES.UPDATE(id), body, {
            headers: { 'Content-Type': undefined },
        }),

    remove: (id) => api.put(API_PATHS.VEHICLES.DELETE(id)),
};

// ---------- BOOKING ----------
export const bookingService = {
    updateBooking: (id, body) =>
        api.put(API_PATHS.BOOKING.UPDATE_BOOKING(id), body),

    createBooking: (body, config = {}) =>
        api.post(API_PATHS.BOOKING.CREATE_BOOKING, body, config),

    updateStatus: (body) =>
        api.post(API_PATHS.BOOKING.UPDATE_STATUS, body),

    getAllBookings: (body) =>
        api.post(API_PATHS.BOOKING.GET_ALL_BOOKINGS, body),

    getBookingById: (id) =>
        api.get(API_PATHS.BOOKING.GET_BOOKING_BY_ID(id)),

    getRecentBookings: () =>
        api.get(API_PATHS.BOOKING.GET_RECENT_BOOKINGS),

    deleteBooking: (id) =>
        api.put(API_PATHS.BOOKING.DELETE_BOOKING(id)),
};
