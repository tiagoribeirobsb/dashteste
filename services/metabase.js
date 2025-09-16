// services/metabase.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class MetabaseService {
  constructor() {
    this.baseURL = process.env.MB_URL;
    this.username = process.env.MB_USER;
    this.password = process.env.MB_PASS;
    this.token = process.env.MB_TOKEN || null;
    this.tokenExpiry = null;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Autentica no Metabase e obtém token de sessão
   */
  async authenticate() {
    try {
      console.log('🔐 Autenticando no Metabase...');
      
      const response = await this.client.post('/api/session', {
        username: this.username,
        password: this.password
      });

      if (response.data && response.data.id) {
        this.token = response.data.id;
        // Token do Metabase geralmente expira em 14 dias
        this.tokenExpiry = new Date(Date.now() + (14 * 24 * 60 * 60 * 1000));
        
        // Atualiza o header de autorização
        this.client.defaults.headers.common['X-Metabase-Session'] = this.token;
        
        console.log('✅ Autenticação no Metabase realizada com sucesso');
        return this.token;
      } else {
        throw new Error('Resposta de autenticação inválida');
      }
    } catch (error) {
      console.error('❌ Erro na autenticação do Metabase:', error.message);
      throw new Error(`Falha na autenticação: ${error.message}`);
    }
  }

  /**
   * Verifica se o token ainda é válido
   */
  isTokenValid() {
    if (!this.token || !this.tokenExpiry) {
      return false;
    }
    return new Date() < this.tokenExpiry;
  }

  /**
   * Garante que temos um token válido
   */
  async ensureAuthenticated() {
    if (!this.isTokenValid()) {
      await this.authenticate();
    }
    return this.token;
  }

  /**
   * Executa uma query de card do Metabase
   */
  async executeCard(cardId, parameters = {}) {
    try {
      await this.ensureAuthenticated();
      
      console.log(`📊 Executando card ${cardId} com parâmetros:`, parameters);
      
      // Monta a URL com parâmetros se fornecidos
      let url = `/api/card/${cardId}/query`;
      const queryParams = new URLSearchParams();
      
      // Adiciona parâmetros à query
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(`parameters[${key}]`, value);
        }
      });
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await this.client.post(url);
      
      if (response.data) {
        console.log(`✅ Card ${cardId} executado com sucesso`);
        return {
          success: true,
          data: response.data,
          cardId,
          parameters,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Resposta vazia do Metabase');
      }
    } catch (error) {
      console.error(`❌ Erro ao executar card ${cardId}:`, error.message);
      
      // Se erro de autenticação, tenta reautenticar uma vez
      if (error.response?.status === 401) {
        console.log('🔄 Token expirado, tentando reautenticar...');
        this.token = null;
        this.tokenExpiry = null;
        
        try {
          await this.authenticate();
          return await this.executeCard(cardId, parameters);
        } catch (retryError) {
          console.error('❌ Falha na reautenticação:', retryError.message);
        }
      }
      
      return {
        success: false,
        error: error.message,
        cardId,
        parameters,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtém informações de um card
   */
  async getCardInfo(cardId) {
    try {
      await this.ensureAuthenticated();
      
      const response = await this.client.get(`/api/card/${cardId}`);
      
      return {
        success: true,
        data: response.data,
        cardId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Erro ao obter info do card ${cardId}:`, error.message);
      return {
        success: false,
        error: error.message,
        cardId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Gera URL de embed para um card (fallback)
   */
  generateEmbedUrl(cardId, parameters = {}) {
    const params = new URLSearchParams();
    
    // Adiciona parâmetros
    Object.entries(parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    
    const paramString = params.toString() ? `?${params.toString()}` : '';
    return `${this.baseURL}/embed/question/${cardId}${paramString}`;
  }

  /**
   * Gera token JWT para embed público
   */
  async generateJWTToken(cardId, parameters = {}) {
    try {
      await this.ensureAuthenticated();
      
      // Primeiro, verifica se o card existe e está configurado para embed
      const cardInfo = await this.getCardInfo(cardId);
      
      if (!cardInfo.success) {
        throw new Error(`Card ${cardId} não encontrado`);
      }

      // Tenta gerar token JWT através da API do Metabase
      try {
        const response = await this.client.post(
          `/api/embed/card/${cardId}/query`,
          { 
            parameters,
            _embedding_params: {}
          }
        );
        
        if (response.data && response.data.token) {
          console.log(`🔐 Token JWT gerado para card ${cardId}`);
          return response.data.token;
        }
      } catch (embedError) {
        console.warn(`⚠️ Embed JWT não disponível para card ${cardId}, usando fallback`);
      }

      // Fallback: gera um token simples baseado no cardId
      const payload = {
        cardId,
        parameters,
        timestamp: Date.now(),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
      };
      
      // Token simples (em produção, use uma biblioteca JWT adequada)
      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      
      console.log(`🔐 Token fallback gerado para card ${cardId}`);
      return token;
    } catch (error) {
      console.error(`❌ Erro ao gerar token JWT para card ${cardId}:`, error.message);
      throw new Error(`Falha ao gerar token JWT: ${error.message}`);
    }
  }

  /**
   * Testa a conexão com o Metabase
   */
  async testConnection() {
    try {
      const response = await this.client.get('/api/health');
      return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default new MetabaseService();