// routes/metabase.js
import express from 'express';
import BIProxyService from '../services/biProxy.js';

const router = express.Router();

// Middleware para validar tenant
const validateTenant = (req, res, next) => {
  const tenant = req.query.tenant || req.body.tenant || req.headers['x-tenant'] || 'default';
  req.tenant = tenant;
  next();
};

// Middleware para validar card ID
const validateCardId = (req, res, next) => {
  const cardId = req.params.cardId || req.body.cardId;
  
  if (!cardId) {
    return res.status(400).json({
      success: false,
      error: 'Card ID é obrigatório'
    });
  }

  if (isNaN(cardId)) {
    return res.status(400).json({
      success: false,
      error: 'Card ID deve ser um número válido'
    });
  }

  req.cardId = parseInt(cardId);
  next();
};

// Middleware para parsing de parâmetros
const parseParameters = (req, res, next) => {
  let parameters = {};

  // Parâmetros podem vir via query string, body ou header
  if (req.query.parameters) {
    try {
      parameters = JSON.parse(req.query.parameters);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos no query string'
      });
    }
  } else if (req.body.parameters) {
    parameters = req.body.parameters;
  }

  // Adiciona parâmetros individuais do query string
  Object.keys(req.query).forEach(key => {
    if (!['tenant', 'parameters', 'useCache', 'forceFresh', 'customTTL'].includes(key)) {
      parameters[key] = req.query[key];
    }
  });

  req.parameters = parameters;
  next();
};

// Middleware para opções de cache
const parseCacheOptions = (req, res, next) => {
  const options = {
    useCache: req.query.useCache !== 'false', // true por padrão
    forceFresh: req.query.forceFresh === 'true', // false por padrão
    customTTL: req.query.customTTL ? parseInt(req.query.customTTL) : null
  };

  req.cacheOptions = options;
  next();
};

/**
 * GET /api/metabase/cards/:cardId
 * Executa um card específico do Metabase
 */
router.get('/cards/:cardId', 
  validateTenant,
  validateCardId,
  parseParameters,
  parseCacheOptions,
  async (req, res) => {
    try {
      const result = await BIProxyService.executeCard(
        req.cardId,
        req.parameters,
        req.tenant,
        req.cacheOptions
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Erro na rota GET /cards/:cardId:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
);

/**
 * POST /api/metabase/cards/:cardId
 * Executa um card com parâmetros via POST
 */
router.post('/cards/:cardId',
  validateTenant,
  validateCardId,
  parseParameters,
  parseCacheOptions,
  async (req, res) => {
    try {
      const result = await BIProxyService.executeCard(
        req.cardId,
        req.parameters,
        req.tenant,
        req.cacheOptions
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Erro na rota POST /cards/:cardId:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
);

/**
 * POST /api/metabase/cards/batch
 * Executa múltiplos cards em lote
 */
router.post('/cards/batch',
  validateTenant,
  async (req, res) => {
    try {
      const { cards, options = {} } = req.body;

      if (!Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Array de cards é obrigatório'
        });
      }

      // Valida cada card no array
      for (const card of cards) {
        if (!card.cardId || isNaN(card.cardId)) {
          return res.status(400).json({
            success: false,
            error: 'Cada card deve ter um cardId válido'
          });
        }
      }

      const result = await BIProxyService.executeMultipleCards(
        cards,
        req.tenant,
        options
      );

      res.json(result);
    } catch (error) {
      console.error('Erro na rota POST /cards/batch:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/metabase/cards/:cardId/info
 * Obtém informações sobre um card
 */
router.get('/cards/:cardId/info',
  validateCardId,
  async (req, res) => {
    try {
      const result = await BIProxyService.getCardInfo(req.cardId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Erro na rota GET /cards/:cardId/info:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/metabase/cards/:cardId/embed
 * Gera URL de embed para um card
 */
router.get('/cards/:cardId/embed',
  validateTenant,
  validateCardId,
  parseParameters,
  async (req, res) => {
    try {
      const options = {
        theme: req.query.theme || 'light',
        bordered: req.query.bordered !== 'false',
        titled: req.query.titled !== 'false'
      };

      const result = await BIProxyService.getEmbedUrl(
        req.cardId,
        req.parameters,
        options
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Erro na rota GET /cards/:cardId/embed:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/metabase/cards/:cardId/embed/jwt
 * Gera URL de embed com JWT (fallback)
 */
router.get('/cards/:cardId/embed/jwt',
  validateTenant,
  validateCardId,
  parseParameters,
  async (req, res) => {
    try {
      const { cardId } = req.params;
      const { tenant, parameters } = req;

      const result = await BIProxyService.generateJWTEmbedUrl(cardId, parameters, tenant);
      
      res.json(result);
    } catch (error) {
      console.error(`❌ Erro na rota embed JWT para card ${req.params.cardId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        cardId: req.params.cardId
      });
    }
  }
);

/**
 * GET /api/metabase/cards/:cardId/embed/iframe
 * Gera URL de iframe simples (último recurso)
 */
router.get('/cards/:cardId/embed/iframe',
  validateTenant,
  validateCardId,
  parseParameters,
  async (req, res) => {
    try {
      const { cardId } = req.params;
      const { tenant, parameters } = req;

      const result = await BIProxyService.generateSimpleIframeUrl(cardId, parameters, tenant);
      
      res.json(result);
    } catch (error) {
      console.error(`❌ Erro na rota iframe para card ${req.params.cardId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        cardId: req.params.cardId
      });
    }
  }
);

/**
 * DELETE /api/metabase/cache/cards/:cardId
 * Invalida cache de um card específico
 */
router.delete('/cache/cards/:cardId',
  validateTenant,
  validateCardId,
  async (req, res) => {
    try {
      const tenant = req.query.allTenants === 'true' ? null : req.tenant;
      const deleted = BIProxyService.invalidateCard(req.cardId, tenant);

      res.json({
        success: true,
        deleted,
        message: `Cache invalidado para card ${req.cardId}${tenant ? ` (tenant: ${tenant})` : ' (todos os tenants)'}`
      });
    } catch (error) {
      console.error('Erro na rota DELETE /cache/cards/:cardId:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
);

/**
 * DELETE /api/metabase/cache/tenants/:tenant
 * Invalida cache de um tenant específico
 */
router.delete('/cache/tenants/:tenant',
  async (req, res) => {
    try {
      const tenant = req.params.tenant;
      const deleted = BIProxyService.invalidateTenant(tenant);

      res.json({
        success: true,
        deleted,
        message: `Cache invalidado para tenant ${tenant}`
      });
    } catch (error) {
      console.error('Erro na rota DELETE /cache/tenants/:tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/metabase/cache/stats
 * Obtém estatísticas do cache
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = BIProxyService.getCacheStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Erro na rota GET /cache/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

/**
 * GET /api/metabase/status
 * Obtém status do serviço
 */
router.get('/status', async (req, res) => {
  try {
    const status = BIProxyService.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Erro na rota GET /status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

/**
 * POST /api/metabase/test
 * Testa conexão com Metabase
 */
router.post('/test', async (req, res) => {
  try {
    const result = await BIProxyService.testConnection();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erro na rota POST /test:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

/**
 * POST /api/metabase/cache/warmup
 * Pré-aquece o cache com cards específicos
 */
router.post('/cache/warmup',
  validateTenant,
  async (req, res) => {
    try {
      const { cardIds, parameters = {} } = req.body;

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Array de cardIds é obrigatório'
        });
      }

      const result = await BIProxyService.warmupCache(
        cardIds,
        req.tenant,
        parameters
      );

      res.json(result);
    } catch (error) {
      console.error('Erro na rota POST /cache/warmup:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
);

export default router;