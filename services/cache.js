// services/cache.js
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

class CacheService {
  constructor() {
    // Configurações do cache a partir das variáveis de ambiente
    this.ttl = parseInt(process.env.BI_CACHE_TTL) || 300; // 5 minutos por padrão
    this.maxKeys = parseInt(process.env.BI_CACHE_MAX_SIZE) || 100;
    
    // Inicializa o cache
    this.cache = new NodeCache({
      stdTTL: this.ttl,
      maxKeys: this.maxKeys,
      checkperiod: 60, // Verifica itens expirados a cada 60 segundos
      useClones: false // Melhor performance
    });

    // Estatísticas do cache
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Event listeners para estatísticas
    this.cache.on('set', () => this.stats.sets++);
    this.cache.on('del', () => this.stats.deletes++);
    this.cache.on('expired', () => this.stats.deletes++);

    console.log(`🗄️ Cache inicializado - TTL: ${this.ttl}s, Max Keys: ${this.maxKeys}`);
  }

  /**
   * Gera uma chave única para o cache baseada nos parâmetros
   */
  generateKey(cardId, parameters = {}, tenant = 'default') {
    const paramString = JSON.stringify(parameters, Object.keys(parameters).sort());
    return `metabase:card:${cardId}:tenant:${tenant}:params:${Buffer.from(paramString).toString('base64')}`;
  }

  /**
   * Obtém dados do cache
   */
  get(cardId, parameters = {}, tenant = 'default') {
    const key = this.generateKey(cardId, parameters, tenant);
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      console.log(`🎯 Cache HIT para card ${cardId} (tenant: ${tenant})`);
      return {
        ...value,
        fromCache: true,
        cacheKey: key
      };
    } else {
      this.stats.misses++;
      console.log(`❌ Cache MISS para card ${cardId} (tenant: ${tenant})`);
      return null;
    }
  }

  /**
   * Armazena dados no cache
   */
  set(cardId, parameters = {}, tenant = 'default', data, customTTL = null) {
    const key = this.generateKey(cardId, parameters, tenant);
    const ttl = customTTL || this.ttl;
    
    const cacheData = {
      data,
      cardId,
      parameters,
      tenant,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (ttl * 1000)).toISOString()
    };

    const success = this.cache.set(key, cacheData, ttl);
    
    if (success) {
      console.log(`💾 Dados armazenados no cache para card ${cardId} (tenant: ${tenant}, TTL: ${ttl}s)`);
    } else {
      console.warn(`⚠️ Falha ao armazenar no cache para card ${cardId}`);
    }
    
    return success;
  }

  /**
   * Remove dados específicos do cache
   */
  delete(cardId, parameters = {}, tenant = 'default') {
    const key = this.generateKey(cardId, parameters, tenant);
    const deleted = this.cache.del(key);
    
    if (deleted > 0) {
      console.log(`🗑️ Cache removido para card ${cardId} (tenant: ${tenant})`);
    }
    
    return deleted > 0;
  }

  /**
   * Remove todos os dados de um card específico (todos os tenants e parâmetros)
   */
  deleteCard(cardId) {
    const keys = this.cache.keys();
    const cardKeys = keys.filter(key => key.includes(`card:${cardId}:`));
    
    let deleted = 0;
    cardKeys.forEach(key => {
      if (this.cache.del(key)) {
        deleted++;
      }
    });

    if (deleted > 0) {
      console.log(`🗑️ ${deleted} entradas de cache removidas para card ${cardId}`);
    }

    return deleted;
  }

  /**
   * Remove todos os dados de um tenant específico
   */
  deleteTenant(tenant) {
    const keys = this.cache.keys();
    const tenantKeys = keys.filter(key => key.includes(`tenant:${tenant}:`));
    
    let deleted = 0;
    tenantKeys.forEach(key => {
      if (this.cache.del(key)) {
        deleted++;
      }
    });

    if (deleted > 0) {
      console.log(`🗑️ ${deleted} entradas de cache removidas para tenant ${tenant}`);
    }

    return deleted;
  }

  /**
   * Limpa todo o cache
   */
  flush() {
    this.cache.flushAll();
    console.log('🧹 Cache completamente limpo');
    
    // Reset das estatísticas
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const keys = this.cache.keys();
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      currentKeys: keys.length,
      maxKeys: this.maxKeys,
      ttl: this.ttl,
      keys: keys.map(key => {
        const data = this.cache.get(key);
        return {
          key,
          cardId: data?.cardId,
          tenant: data?.tenant,
          cachedAt: data?.cachedAt,
          expiresAt: data?.expiresAt
        };
      })
    };
  }

  /**
   * Verifica se uma entrada específica existe no cache
   */
  has(cardId, parameters = {}, tenant = 'default') {
    const key = this.generateKey(cardId, parameters, tenant);
    return this.cache.has(key);
  }

  /**
   * Obtém o TTL restante de uma entrada
   */
  getTTL(cardId, parameters = {}, tenant = 'default') {
    const key = this.generateKey(cardId, parameters, tenant);
    return this.cache.getTtl(key);
  }

  /**
   * Atualiza o TTL de uma entrada existente
   */
  updateTTL(cardId, parameters = {}, tenant = 'default', newTTL) {
    const key = this.generateKey(cardId, parameters, tenant);
    return this.cache.ttl(key, newTTL);
  }
}

export default new CacheService();