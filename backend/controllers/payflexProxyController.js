/**
 * PayFlex Proxy Controller
 * Fetches live provider and plan data from PayFlex API
 */

const payFlexService = require('../utils/payflexService');

class PayFlexProxyController {
  /**
   * Get all providers for a service type
   * Returns list of available providers (e.g., MTN, Airtel, GLO for airtime)
   */
  static async getProviders(req, res, next) {
    try {
      const { serviceType } = req.params;

      if (!serviceType) {
        return res.status(400).json({
          error: 'Service type required',
        });
      }

      const validServices = [
        'airtime',
        'data',
        'electricity',
        'cable',
        'internet',
        'education',
        'insurance',
        'giftcard',
        'tax',
      ];

      if (!validServices.includes(serviceType)) {
        return res.status(400).json({
          error: `Invalid service type. Supported: ${validServices.join(', ')}`,
        });
      }

      // Fetch from PayFlex API
      const providers = await payFlexService.getProviders(serviceType);

      return res.status(200).json({
        success: true,
        serviceType,
        providers,
      });
    } catch (error) {
      console.error('Error fetching providers:', error);
      return res.status(500).json({
        error: 'Failed to fetch providers',
        message: error.message,
      });
    }
  }

  /**
   * Get plans/packages for a specific provider and service type
   * Returns list of available plans with pricing (live data from PayFlex)
   */
  static async getPlans(req, res, next) {
    try {
      const { serviceType, providerCode } = req.query;

      if (!serviceType || !providerCode) {
        return res.status(400).json({
          error: 'serviceType and providerCode required as query parameters',
        });
      }

      // Fetch from PayFlex API
      const plans = await payFlexService.getPlans(providerCode, serviceType);

      return res.status(200).json({
        success: true,
        serviceType,
        providerCode,
        plans,
      });
    } catch (error) {
      console.error('Error fetching plans:', error);
      return res.status(500).json({
        error: 'Failed to fetch plans',
        message: error.message,
      });
    }
  }

  /**
   * Search/filter providers by service type (cached)
   */
  static async searchProviders(req, res, next) {
    try {
      const { serviceType, query } = req.query;

      if (!serviceType) {
        return res.status(400).json({
          error: 'Service type required',
        });
      }

      const providers = await payFlexService.getProviders(serviceType);

      // Filter based on search query
      const filtered = query
        ? providers.filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.code.toLowerCase().includes(query.toLowerCase())
          )
        : providers;

      return res.status(200).json({
        success: true,
        serviceType,
        query: query || null,
        providers: filtered,
      });
    } catch (error) {
      console.error('Error searching providers:', error);
      return res.status(500).json({
        error: 'Failed to search providers',
        message: error.message,
      });
    }
  }
}

module.exports = PayFlexProxyController;
