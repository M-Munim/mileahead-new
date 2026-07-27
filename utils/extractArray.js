/**
 * Extracts an array from various API response structures.
 * Handles nested data formats: { data }, { data: { results } }, { data: { data } }, etc.
 */
export function extractArray(response) {
    if (!response?.data) return [];
    if (Array.isArray(response.data)) return response.data;
    if (response.data.data && Array.isArray(response.data.data.results)) {
        return response.data.data.results;
    }
    if (response.data.data && Array.isArray(response.data.data.bookings)) {
        return response.data.data.bookings;
    }
    if (response.data.data && Array.isArray(response.data.data.orders)) {
        return response.data.data.orders;
    }
    if (Array.isArray(response.data.data)) return response.data.data;
    if (Array.isArray(response.data.users)) return response.data.users;
    if (Array.isArray(response.data.drivers)) return response.data.drivers;
    if (Array.isArray(response.data.bookings)) return response.data.bookings;
    if (Array.isArray(response.data.results)) return response.data.results;
    if (Array.isArray(response.data.result)) return response.data.result;
    return [];
}
