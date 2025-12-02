const Settings = require('../models/Settings');

/**
 * Maintenance mode middleware to check settings and block requests during maintenance
 * @async
 * @function maintenanceMode
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @description Checks if maintenance mode is enabled and blocks non-admin requests
 * Special features:
 * - Allows admin routes to pass through during maintenance
 * - Allows health check endpoint to pass through
 * - Returns maintenance mode message to users when enabled
 * - Caches settings for performance (refreshes every 30 seconds)
 */

let cachedSettings = null;
let lastFetch = 0;
const CACHE_DURATION = 30000; // 30 seconds

const maintenanceMode = async (req, res, next) => {
  try {
    // Allow admin routes, login, and health check to pass through
    // NOTE: req.path is ONLY the path part (e.g. "/api/auth/login"), never the full URL
    if (
      req.path.startsWith('/api/admin') || 
      req.path === '/health' ||
      req.path === '/api/auth/login'
    ) {
      return next();
    }

    // Check cache first
    const now = Date.now();
    if (!cachedSettings || (now - lastFetch) > CACHE_DURATION) {
      cachedSettings = await Settings.getSettings();
      lastFetch = now;
    }

    // If maintenance mode is enabled, selectively block critical write operations
    const isMaintenanceEnabled = cachedSettings && 
      (cachedSettings.maintenanceMode === true || // Legacy boolean support
       (cachedSettings.maintenanceMode && cachedSettings.maintenanceMode.enabled === true)); // New object format

    if (isMaintenanceEnabled) {
      const method = req.method.toUpperCase();
      const path = req.path;

      // Only consider non-GET/HEAD requests for blocking
      if (method !== 'GET' && method !== 'HEAD') {
        let shouldBlock = false;

        // 1) Booking related actions (create booking, update status, add messages)
        if (path.startsWith('/api/bookings')) {
          shouldBlock = true;
        }

        // 2) Wallet / money related actions
        if (path === '/api/auth/add-to-wallet') {
          shouldBlock = true;
        }

        // 3) Credential / profile changes
        if (path === '/api/auth/change-password' || path === '/api/auth/profile') {
          shouldBlock = true;
        }

        // If any of the above matched, block the request
        if (shouldBlock) {
          const maintenanceMessage = cachedSettings.maintenanceMode && 
            typeof cachedSettings.maintenanceMode === 'object' && 
            cachedSettings.maintenanceMode.message 
              ? cachedSettings.maintenanceMode.message 
              : 'System is currently under maintenance. Please try again later.';

          return res.status(503).json({
            success: false,
            message: maintenanceMessage,
            maintenanceMode: true,
            estimatedDowntime: 'We apologize for the inconvenience. The system will be back online shortly.'
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('Maintenance mode middleware error:', error);
    // If there's an error checking maintenance mode, allow the request to proceed
    next();
  }
};

const clearMaintenanceCache = () => {
  cachedSettings = null;
  lastFetch = 0;
  console.info('Maintenance cache cleared');
};

module.exports = { maintenanceMode, clearMaintenanceCache };