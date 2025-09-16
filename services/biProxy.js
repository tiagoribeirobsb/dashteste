// services/biProxy.js
import MetabaseService from './metabase.js';
import CacheService from './cache.js';
import dotenv from 'dotenv';

dotenv.config();

class BIProxyService {
  constructor() {
    this.metabase = MetabaseService;
    this.cache = CacheService;
    this.isInitialized = false;
    
    console.log('🔗 BI Proxy Service inicializado');
  }

  /**
   * Inicializa o serviço (autentica no Metabase)
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      await this.metabase.authenticate();
      this.isInitialized = true;
      console.log('✅ BI Proxy Service inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar BI Proxy Service:', error.message);
      return false;
    }
  }

  /**
   * Executa um card do Metabase com cache inteligente
   */
  async executeCard(cardId, parameters = {}, tenant = 'default', options = {}) {
    try {
      // Verifica se o serviço está inicializado
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Falha ao inicializar conexão com Metabase');
        }
      }

      // Opções padrão
      const {
        useCache = true,
        forceFresh = false,
        customTTL = null
      } = options;

      // Verifica cache primeiro (se habilitado e não forçando dados frescos)
      if (useCache && !forceFresh) {
        const cachedData = this.cache.get(cardId, parameters, tenant);
        if (cachedData) {
          return {
            success: true,
            data: cachedData.data,
            metadata: {
              cardId,
              tenant,
              parameters,
              fromCache: true,
              cachedAt: cachedData.cachedAt,
              expiresAt: cachedData.expiresAt,
              source: 'cache'
            }
          };
        }
      }

      // Busca dados frescos do Metabase
      console.log(`🔄 Buscando dados frescos do Metabase para card ${cardId} (tenant: ${tenant})`);
      
      const result = await this.metabase.executeCard(cardId, parameters);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao executar card no Metabase');
      }

      // Armazena no cache (se habilitado)
      if (useCache) {
        this.cache.set(cardId, parameters, tenant, result.data, customTTL);
      }

      return {
        success: true,
        data: result.data,
        metadata: {
          cardId,
          tenant,
          parameters,
          fromCache: false,
          fetchedAt: new Date().toISOString(),
          source: 'metabase'
        }
      };

    } catch (error) {
      console.error(`❌ Erro no BI Proxy para card ${cardId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          cardId,
          tenant,
          parameters,
          errorAt: new Date().toISOString(),
          source: 'error'
        }
      };
    }
  }

  /**
   * Obtém informações de um card
   */
  async getCardInfo(cardId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await this.metabase.getCardInfo(cardId);
    } catch (error) {
      console.error(`❌ Erro ao obter info do card ${cardId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gera URL de embed para um card
   */
  async getEmbedUrl(cardId, parameters = {}, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await this.metabase.getEmbedUrl(cardId, parameters, options);
    } catch (error) {
      console.error(`❌ Erro ao gerar embed URL para card ${cardId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gera URL de embed com JWT para fallback
   */
  async generateJWTEmbedUrl(cardId, parameters = {}, tenant = 'default') {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Tenta primeiro obter informações do card
      const cardInfo = await this.metabase.getCardInfo(cardId);
      
      if (!cardInfo) {
        throw new Error(`Card ${cardId} não encontrado`);
      }

      // Gera token JWT para embed público
      const jwtToken = await this.metabase.generateJWTToken(cardId, parameters);
      
      // Constrói URL de embed com JWT
      const baseUrl = process.env.MB_URL || 'http://localhost:3000';
      const embedUrl = `${baseUrl}/embed/question/${jwtToken}#bordered=true&titled=true`;
      
      console.log(`🔐 URL de embed JWT gerada para card ${cardId} (tenant: ${tenant})`);
      return {
        success: true,
        embedUrl,
        jwtToken,
        metadata: {
          cardId,
          tenant,
          timestamp: new Date().toISOString(),
          type: 'jwt-embed'
        }
      };
    } catch (error) {
      console.error(`❌ Erro ao gerar URL de embed JWT para card ${cardId}:`, error.message);
      
      // Fallback para iframe simples
      return this.generateSimpleIframeUrl(cardId, parameters, tenant);
    }
  }

  /**
   * Gera URL de iframe simples como último recurso
   */
  async generateSimpleIframeUrl(cardId, parameters = {}, tenant = 'default') {
    try {
      const baseUrl = process.env.MB_URL || 'http://localhost:3000';
      const queryParams = new URLSearchParams(parameters).toString();
      const embedUrl = `${baseUrl}/question/${cardId}?${queryParams}`;
      
      console.log(`📱 URL de iframe simples gerada para card ${cardId} (tenant: ${tenant})`);
      return {
        success: true,
        embedUrl,
        metadata: {
          cardId,
          tenant,
          timestamp: new Date().toISOString(),
          type: 'simple-iframe'
        }
      };
    } catch (error) {
      console.error(`❌ Erro ao gerar URL de iframe simples para card ${cardId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Executa múltiplos cards em paralelo
   */
  async executeMultipleCards(cardRequests, tenant = 'default', options = {}) {
    try {
      const {
        useCache = true,
        forceFresh = false,
        maxConcurrent = 5
      } = options;

      // Processa em lotes para evitar sobrecarga
      const results = [];
      
      for (let i = 0; i < cardRequests.length; i += maxConcurrent) {
        const batch = cardRequests.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(request => 
          this.executeCard(
            request.cardId, 
            request.parameters || {}, 
            tenant, 
            { useCache, forceFresh, customTTL: request.customTTL }
          )
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const originalRequest = batch[index];
          
          if (result.status === 'fulfilled') {
            results.push({
              ...result.value,
              requestId: originalRequest.requestId || `card_${originalRequest.cardId}`
            });
          } else {
            results.push({
              success: false,
              error: result.reason?.message || 'Erro desconhecido',
              requestId: originalRequest.requestId || `card_${originalRequest.cardId}`,
              metadata: {
                cardId: originalRequest.cardId,
                tenant,
                parameters: originalRequest.parameters || {},
                errorAt: new Date().toISOString(),
                source: 'error'
              }
            });
          }
        });
      }

      return {
        success: true,
        results,
        summary: {
          total: cardRequests.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          fromCache: results.filter(r => r.metadata?.fromCache).length
        }
      };

    } catch (error) {
      console.error('❌ Erro ao executar múltiplos cards:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Invalida cache para um card específico
   */
  invalidateCard(cardId, tenant = null) {
    if (tenant) {
      return this.cache.delete(cardId, {}, tenant);
    } else {
      return this.cache.deleteCard(cardId);
    }
  }

  /**
   * Invalida cache para um tenant específico
   */
  invalidateTenant(tenant) {
    return this.cache.deleteTenant(tenant);
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Testa a conexão com o Metabase
   */
  async testConnection() {
    try {
      return await this.metabase.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém status do serviço
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      metabaseConnected: this.metabase.isAuthenticated(),
      cache: this.cache.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Pré-aquece o cache com cards específicos
   */
  async warmupCache(cardIds, tenant = 'default', parameters = {}) {
    console.log(`🔥 Iniciando pré-aquecimento do cache para ${cardIds.length} cards`);
    
    const results = await this.executeMultipleCards(
      cardIds.map(cardId => ({ cardId, parameters })),
      tenant,
      { useCache: true, forceFresh: true }
    );

    console.log(`🔥 Pré-aquecimento concluído: ${results.summary.successful}/${results.summary.total} cards`);
    
    return results;
  }
}

export default new BIProxyService();