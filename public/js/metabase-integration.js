// Integração simplificada com Metabase
class MetabaseIntegration {
  constructor() {
    this.baseUrl = 'http://localhost:3001/bi/card';
    this.cards = new Map();
    this.isLoading = false;
    
    console.log('🔗 Metabase Integration inicializada');
  }

  async init() {
    console.log('🚀 Iniciando integração Metabase...');
    
    try {
      // Aguardar DOM carregar
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      // Carregar todos os cards
      await this.loadAllCards();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      console.log('✅ Integração Metabase inicializada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar integração:', error);
    }
  }

  async loadAllCards() {
    const cardElements = document.querySelectorAll('.metabase-card');
    console.log(`📊 Encontrados ${cardElements.length} cards para carregar`);
    
    if (cardElements.length === 0) {
      console.warn('⚠️ Nenhum card encontrado na página');
      return;
    }

    // Carregar cards em paralelo
    const promises = Array.from(cardElements).map(element => {
      const cardId = element.dataset.cardId;
      const cardType = element.dataset.type;
      const cardTitle = element.dataset.title;
      
      if (!cardId) {
        console.warn('⚠️ Card sem ID encontrado:', element);
        return Promise.resolve();
      }
      
      return this.loadCard(cardId, cardType, cardTitle, element);
    });
    
    await Promise.allSettled(promises);
  }

  async loadCard(cardId, cardType, cardTitle, element) {
    try {
      console.log(`📈 Carregando card ${cardId} (${cardType}): ${cardTitle}`);
      
      // Mostrar spinner
      this.showSpinner(element);
      
      // Fazer requisição
      const response = await fetch(`${this.baseUrl}/${cardId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameters: this.buildParameters()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }
      
      // Renderizar dados
      this.renderCard(element, result.data, cardType);
      
      console.log(`✅ Card ${cardId} carregado com sucesso`);
      
    } catch (error) {
      console.error(`❌ Erro ao carregar card ${cardId}:`, error);
      this.showError(element, error.message);
    }
  }

  buildParameters() {
    // Parâmetros básicos para teste
    return {
      tenant: 'default',
      period: 'month',
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    };
  }

  showSpinner(element) {
    element.innerHTML = `
      <div class="d-flex justify-content-center align-items-center" style="min-height: 200px;">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <span class="ms-2">Carregando dados...</span>
      </div>
    `;
  }

  showError(element, message) {
    element.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center" role="alert">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <div>
          <strong>Erro ao carregar dados:</strong><br>
          ${message}
        </div>
      </div>
    `;
  }

  renderCard(element, data, cardType) {
    switch (cardType) {
      case 'kpi':
        this.renderKPI(element, data);
        break;
      case 'chart':
        this.renderChart(element, data);
        break;
      case 'table':
        this.renderTable(element, data);
        break;
      default:
        this.showError(element, `Tipo de card não suportado: ${cardType}`);
    }
  }

  renderKPI(element, data) {
    const changeClass = data.change >= 0 ? 'text-success' : 'text-danger';
    const changeIcon = data.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    
    let formattedValue = data.value;
    if (data.format === 'currency') {
      formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(data.value);
    } else if (data.format === 'percentage') {
      formattedValue = `${data.value}%`;
    } else if (data.format === 'number') {
      formattedValue = new Intl.NumberFormat('pt-BR').format(data.value);
    }
    
    element.innerHTML = `
      <div class="card h-100">
        <div class="card-body text-center">
          <h3 class="card-title h4 mb-3">${element.dataset.title}</h3>
          <div class="display-4 fw-bold text-primary mb-2">${formattedValue}</div>
          <div class="${changeClass}">
            <i class="fas ${changeIcon} me-1"></i>
            ${Math.abs(data.change)}% vs período anterior
          </div>
        </div>
      </div>
    `;
  }

  renderChart(element, data) {
    const chartId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    element.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${element.dataset.title}</h5>
          <canvas id="${chartId}" style="max-height: 300px;"></canvas>
        </div>
      </div>
    `;
    
    // Aguardar o canvas estar no DOM
    setTimeout(() => {
      const canvas = document.getElementById(chartId);
      if (canvas && window.Chart) {
        new Chart(canvas, {
          type: data.chartType,
          data: data.data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      } else {
        console.warn('Chart.js não encontrado ou canvas não disponível');
      }
    }, 100);
  }

  renderTable(element, data) {
    const headerRow = data.columns.map(col => `<th>${col}</th>`).join('');
    const bodyRows = data.data.map(row => 
      `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');
    
    element.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${element.dataset.title}</h5>
          <div class="table-responsive">
            <table class="table table-striped table-hover">
              <thead class="table-dark">
                <tr>${headerRow}</tr>
              </thead>
              <tbody>
                ${bodyRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Botão atualizar todos
    const refreshBtn = document.getElementById('refresh-all-cards');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('🔄 Atualizando todos os cards...');
        this.loadAllCards();
      });
    }
    
    // Botão limpar cache
    const clearCacheBtn = document.getElementById('clear-cache');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => {
        console.log('🗑️ Limpando cache...');
        // Implementar limpeza de cache se necessário
      });
    }
  }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM carregado, inicializando Metabase Integration...');
  
  const integration = new MetabaseIntegration();
  integration.init().catch(error => {
    console.error('💥 Falha crítica na inicialização:', error);
  });
});

// Exportar para uso global se necessário
window.MetabaseIntegration = MetabaseIntegration;