// The identity endpoint (/api/v1/identity/all-users) returns every staff
// account — cleaners/drivers AND the Admin/Manager accounts that log into this
// dashboard. Anything that counts or lists cleaners must drop the dashboard
// accounts first, otherwise managers show up as "Active Cleaners".

const DASHBOARD_ROLE_NAMES = ['admin', 'manager', 'superadmin', 'super admin', 'super_admin'];

/** Best-effort read of an account's role name, whatever shape the API sends. */
export function getAccountRole(account) {
    if (!account) return '';
    const a = account.driver || account;
    const role =
        (typeof a.role === 'object' && a.role !== null
            ? a.role.name || a.role.role_name || a.role.title
            : a.role) ||
        a.role_name ||
        a.roleName ||
        a.user_role ||
        a.user_type ||
        a.type ||
        '';
    return String(role).trim().toLowerCase();
}

/** True for Admin / Manager (dashboard) accounts. */
export function isDashboardAccount(account) {
    return DASHBOARD_ROLE_NAMES.includes(getAccountRole(account));
}

/** True for accounts that do the field work (cleaners / drivers). */
export function isCleanerAccount(account) {
    return !isDashboardAccount(account);
}

/** Same "is active" rule the dashboard has always used for cleaners. */
export function isActiveAccount(d) {
    const status = d.status?.toLowerCase?.();
    const accountStatus = d.accountStatus?.toLowerCase?.();
    const driverStatus = d.driver_status?.toLowerCase?.();
    return status === 'active' || accountStatus === 'active' || driverStatus === 'online' ||
        d.status === 1 || d.is_active === 1 || d.is_active === true ||
        d.active === 1 || d.active === true || d.isActive === 1;
}
