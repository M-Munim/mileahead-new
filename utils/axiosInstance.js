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
                // Only redirect if not already on login page. Never from the customer
                // kiosk or the queue TV: those show their own message instead.
                const path = window.location.pathname;
                const publicScreen = path.startsWith('/kiosk') || path.startsWith('/queue');
                if (!path.includes('/auth/login') && !publicScreen) {
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
    updateBooking: (id, body, config = {}) =>
        api.put(API_PATHS.BOOKING.UPDATE_BOOKING(id), body, config),

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

    deleteBooking: (id, body) =>
        api.put(API_PATHS.BOOKING.DELETE_BOOKING(id), body),

    uploadReceipt: (id, body, config = {}) =>
        api.post(API_PATHS.BOOKING.UPLOAD_RECEIPT(id), body, config),
};

export const activityLogService = {
    getAll: (params) =>
        api.get(API_PATHS.ACTIVITY_LOG.GET_ALL, { params }),
};

// ---------- WHATSAPP BROADCAST ----------
export const broadcastService = {
    getSettings: () => api.get(API_PATHS.BROADCAST.SETTINGS),

    saveSettings: (body) => api.put(API_PATHS.BROADCAST.SETTINGS, body),

    previewAudience: (audience) =>
        api.post(API_PATHS.BROADCAST.AUDIENCE_PREVIEW, { audience }),

    getAll: () => api.get(API_PATHS.BROADCAST.GET_ALL),

    add: (body) => api.post(API_PATHS.BROADCAST.ADD, body),

    update: (id, body) => api.put(API_PATHS.BROADCAST.UPDATE(id), body),

    remove: (id) => api.put(API_PATHS.BROADCAST.DELETE(id)),

    getOptOuts: () => api.get(API_PATHS.BROADCAST.OPT_OUTS),

    addOptOut: (body) => api.post(API_PATHS.BROADCAST.OPT_OUTS, body),

    removeOptOut: (phone) => api.put(API_PATHS.BROADCAST.OPT_OUT_DELETE(phone)),

    getTemplates: () => api.get(API_PATHS.BROADCAST.TEMPLATES),

    addTemplate: (body) => api.post(API_PATHS.BROADCAST.TEMPLATE_ADD, body),

    updateTemplate: (id, body) => api.put(API_PATHS.BROADCAST.TEMPLATE_UPDATE(id), body),

    removeTemplate: (id) => api.put(API_PATHS.BROADCAST.TEMPLATE_DELETE(id)),

    submitTemplate: (id) => api.post(API_PATHS.BROADCAST.TEMPLATE_SUBMIT(id)),

    syncTemplates: () => api.post(API_PATHS.BROADCAST.TEMPLATE_SYNC),

    sendTestTemplate: (id, body) => api.post(API_PATHS.BROADCAST.TEMPLATE_TEST(id), body),

    checkConnection: () => api.post(API_PATHS.BROADCAST.SETTINGS_CHECK),

    send: (id) => api.post(API_PATHS.BROADCAST.SEND(id)),

    getRecipients: (id) => api.get(API_PATHS.BROADCAST.RECIPIENTS(id)),
};

// ---------- INVENTORY ----------
export const inventoryService = {
    getItems: () => api.get(API_PATHS.INVENTORY.ITEMS),

    addItem: (body) => api.post(API_PATHS.INVENTORY.ITEM_ADD, body),

    updateItem: (id, body) => api.put(API_PATHS.INVENTORY.ITEM_UPDATE(id), body),

    removeItem: (id, reason) => api.put(API_PATHS.INVENTORY.ITEM_DELETE(id), { reason }),

    /** params: { item_id, type, from, to, page, limit } */
    getMovements: (params) => api.get(API_PATHS.INVENTORY.MOVEMENTS, { params }),

    /** body: { item_id, type: in|use|sell|adjust, quantity | counted, unit_price, note } */
    addMovement: (body) => api.post(API_PATHS.INVENTORY.MOVEMENT_ADD, body),

    getSummary: (params) => api.get(API_PATHS.INVENTORY.SUMMARY, { params }),

    /** params: { from, to } (both required) */
    getConsumption: (params) => api.get(API_PATHS.INVENTORY.CONSUMPTION, { params }),

    getMachinery: () => api.get(API_PATHS.INVENTORY.MACHINERY),

    addMachine: (body) => api.post(API_PATHS.INVENTORY.MACHINE_ADD, body),

    updateMachine: (id, body) => api.put(API_PATHS.INVENTORY.MACHINE_UPDATE(id), body),

    removeMachine: (id, reason) => api.put(API_PATHS.INVENTORY.MACHINE_DELETE(id), { reason }),
};

// ---------- CUSTOMERS + VEHICLES (job cards) ----------
export const walkInCustomerService = {
    /** q: phone, plate or name → { customers, past_orders } */
    search: (q) => api.get(API_PATHS.CUSTOMERS.SEARCH, { params: { q } }),

    /** body: { name, phone, email?, notes?, vehicle?: { plate, vehicle_type, make, model, color, year } } */
    add: (body) => api.post(API_PATHS.CUSTOMERS.ADD, body),

    getOne: (id) => api.get(API_PATHS.CUSTOMERS.ONE(id)),

    /** The profile: { customer, job_cards, orders, stats } */
    history: (id) => api.get(API_PATHS.CUSTOMERS.HISTORY(id)),

    update: (id, body) => api.put(API_PATHS.CUSTOMERS.UPDATE(id), body),

    addVehicle: (customerId, body) => api.post(API_PATHS.CUSTOMERS.VEHICLE_ADD(customerId), body),

    updateVehicle: (id, body) => api.put(API_PATHS.CUSTOMERS.VEHICLE_UPDATE(id), body),
};

// ---------- JOB CARDS ----------
export const jobCardService = {
    /** params: { status ('active' or one status), search, page, limit } */
    getAll: (params) => api.get(API_PATHS.JOB_CARDS.GET_ALL, { params }),

    getOne: (id) => api.get(API_PATHS.JOB_CARDS.ONE(id)),

    add: (body) => api.post(API_PATHS.JOB_CARDS.ADD, body),

    update: (id, body) => api.put(API_PATHS.JOB_CARDS.UPDATE(id), body),

    /** body: { status, note?, technician?, qc? (ticked checklist keys, needed for ready) } */
    setStatus: (id, body) => api.post(API_PATHS.JOB_CARDS.STATUS(id), body),

    technicians: () => api.get(API_PATHS.JOB_CARDS.TECHNICIANS),

    /** Ready → an order with payment → Delivered. body: { payment_method, payment_type?, payment_status } */
    invoice: (id, body) => api.post(API_PATHS.JOB_CARDS.INVOICE(id), body),

    /** formData: photos (1–6 files), caption? */
    addPhotos: (id, formData) => api.post(API_PATHS.JOB_CARDS.PHOTOS(id), formData, { headers: { 'Content-Type': undefined }, timeout: 120000 }),

    /** The photo file (private: loaded with the login, as a blob). */
    getPhoto: (photoId) => api.get(API_PATHS.JOB_CARDS.PHOTO(photoId), { responseType: 'blob', timeout: 60000 }),

    removePhoto: (photoId) => api.put(API_PATHS.JOB_CARDS.PHOTO_DELETE(photoId)),
};

// ---------- EXPENSES (Super Admin) ----------
// add / update take a FormData (optional "bill" file). Content-Type is cleared
// so the browser sets multipart/form-data with the right boundary.
const MULTIPART = { headers: { 'Content-Type': undefined } };

export const expenseService = {
    /** params: { type, from, to, search, page, limit } */
    getAll: (params) => api.get(API_PATHS.EXPENSES.GET_ALL, { params }),

    getSummary: (params) => api.get(API_PATHS.EXPENSES.SUMMARY, { params }),

    /** The bill file as a Blob (it needs the login, so it can't be a plain link). */
    getBill: (id) => api.get(API_PATHS.EXPENSES.BILL(id), { responseType: 'blob', timeout: 60000 }),

    add: (formData) => api.post(API_PATHS.EXPENSES.ADD, formData, { ...MULTIPART, timeout: 60000 }),

    update: (id, formData) => api.put(API_PATHS.EXPENSES.UPDATE(id), formData, { ...MULTIPART, timeout: 60000 }),

    remove: (id, reason) => api.put(API_PATHS.EXPENSES.DELETE(id), { reason }),
};
