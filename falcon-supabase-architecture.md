# ARQUITETURA FALCON DASHBOARD - INTEGRAÇÃO SUPABASE

## 1. ESTRUTURA DE DADOS FALCON

### 📊 Padrões de Dados Identificados

#### CardStatistics.pug - Componentes de Métricas
```javascript
// 1. Weekly Sales Data
weeklyData: {
  value: string,        // "58.4K"
  change: string,       // "+13.6%"
  type: 'increase'|'decrease',
  badge: string,        // "success"|"warning"|"danger"
  color: string         // "primary"|"success"|"warning"|"danger"
}

// 2. Total Orders Data
totalOrders: {
  value: string,        // "58.4K"
  badge: string,        // "+13.6%"
  chartData: number[],  // [20, 40, 100, 120]
  xAxisLabels: string[] // ['Week 4', 'Week 5', 'week 6', 'week 7']
}

// 3. Market Share Data
marketShare: {
  amount: string,       // "26M"
  title: string,        // "Market Share"
  chart: string,        // "echart-market-share"
  data: Array<{
    brand: string,      // "samsung", "Huawei"
    color: string,      // "primary", "info", "300"
    percentage: string  // "33", "29", "20"
  }>
}

// 4. Weather Update Data
weatherData: {
  location: string,     // "São Paulo, SP"
  condition: string,    // "Ensolarado"
  precipitation: string, // "30%"
  temperature: string,  // "28°"
  range: string,        // "30° / 18°"
  icon: string          // "assets/img/icons/weather-icon.png"
}
```

#### CardProjects.pug - Lista de Projetos
```javascript
projects: Array<{
  name: string,         // "IA Bridge", "Reign", "Boots4"
  progress: string,     // "38", "79", "90" (percentage)
  time: string,         // "12:50:00", "25:20:00"
  color: string,        // "primary", "success", "info", "warning", "danger"
  avatar?: {
    initials: string,   // Gerado automaticamente das primeiras letras
    bgColor: string     // Baseado na cor do projeto
  }
}>
```

#### ECharts Configurations - Gráficos
```javascript
// Configuração padrão ECharts (baseada em basic-bar-chart.js)
chartConfig: {
  tooltip: {
    trigger: 'axis',
    padding: [7, 10],
    backgroundColor: utils.getGrays()['100'],
    borderColor: utils.getGrays()['300'],
    textStyle: { color: utils.getColors().dark },
    borderWidth: 1,
    formatter: tooltipFormatter,  // Função customizada do echarts-utils
    transitionDuration: 0,
    axisPointer: { type: 'none' }
  },
  xAxis: {
    type: 'category',
    data: string[],             // ['January', 'February', ...]
    axisLine: {
      lineStyle: {
        color: utils.getGrays()['300'],
        type: 'solid'
      }
    },
    axisTick: { show: false },
    axisLabel: {
      color: utils.getGrays()['400'],
      formatter: value => value.substring(0, 3),  // Trunca labels
      margin: 15
    }
  },
  yAxis: {
    type: 'value',
    boundaryGap: true,
    axisLabel: {
      show: true,
      color: utils.getGrays()['400'],
      margin: 15
    },
    splitLine: {
      show: true,
      lineStyle: { color: utils.getGrays()['200'] }
    },
    axisTick: { show: false },
    axisLine: { show: false }
  },
  series: [{
    type: 'bar',                // 'line', 'bar', 'pie'
    name: string,               // Nome da série
    data: number[],             // [1272, 1301, 1402, ...]
    itemStyle: {
      color: utils.getColor('primary'),
      barBorderRadius: [3, 3, 0, 0]  // Bordas arredondadas
    },
    lineStyle?: {
      color: utils.getColor('primary')
    },
    showSymbol?: false,
    symbol?: 'circle',
    smooth?: false,
    hoverAnimation?: true
  }],
  grid: {
    right: '3%',
    left: '10%',
    bottom: '10%',
    top: '5%'
  }
}

// Função tooltipFormatter (echarts-utils.js)
tooltipFormatter: (params) => {
  let tooltipItem = '';
  params.forEach(el => {
    tooltipItem += `
      <div class='ms-1'>
        <h6 class="text-700">
          <span class="fas fa-circle me-1 fs--2" 
                style="color:${el.borderColor || el.color}"></span>
          ${el.seriesName} : ${typeof el.value === 'object' ? el.value[1] : el.value}
        </h6>
      </div>`;
  });
  return `
    <div>
      <p class='mb-2 text-600'>
        ${window.dayjs(params[0].axisValue).isValid() 
          ? window.dayjs(params[0].axisValue).format('MMMM DD')
          : params[0].axisValue}
      </p>
      ${tooltipItem}
    </div>`;
}
```

#### Dashboard Analytics - CardAudience
```javascript
audienceMetrics: {
  users: {
    value: string,      // "3.9K"
    change: string,     // "+62.0%"
    trend: 'up'|'down'  // Direção da tendência
  },
  sessions: {
    value: string,      // "6.3K"
    change: string,     // "+46.2%"
    trend: 'up'|'down'
  },
  bounceRate: {
    value: string,      // "9.49%"
    change: string,     // "-56.1%"
    trend: 'up'|'down'
  },
  sessionDuration: {
    value: string,      // "4m 03s"
    change: string,     // "-32.2%"
    trend: 'up'|'down'
  }
}
```

---

## 2. PONTOS DE INTEGRAÇÃO ESPECÍFICOS

### 📁 Arquivos de Dados Atuais (Para Substituir)

#### Dados Hardcoded em Templates Pug
```bash
# Localização dos dados estáticos
src/pug/mixins/home/dashboard/CardStatistics.pug
├── marketShareDefault (linha ~15)
├── weatherData (embutido no template)
└── totalOrdersConfig (linha ~65)

src/pug/mixins/home/dashboard/CardProjects.pug
├── projects array (linha ~5)
└── projectsData (hardcoded)

src/pug/mixins/home/dashboard-analytics/CardAudience.pug
├── audienceMetrics (linha ~10)
└── tabsData (hardcoded)
```

#### Variáveis JavaScript em Mixins
```bash
# Arquivos de variáveis para substituir
src/pug/mixins/Variables.pug
├── themeColor object (linha ~25)
├── colors arrays (linha ~20)
└── sitemap data (linha ~35)

src/pug/mixins/home/dashboard/Variables.pug
├── Dados específicos do dashboard
└── Configurações de componentes
```

#### Configurações ECharts
```bash
# Exemplos de gráficos para adaptar
src/js/charts/echarts/examples/
├── basic-bar-chart.js          # Dados: number[]
├── pie-multiple-chart.js       # Dados: {name, value}[]
├── line-area-chart.js          # Dados: séries temporais
└── bubble-chart.js             # Dados: [x, y, size, name, year][]
```

### 🔄 Funções de Formatação (src/js/utils.js)

#### Utilitários de Cores
```javascript
// Funções para usar com dados do Supabase
getColor(name)          // Obtém cor CSS custom property
getColors()             // Retorna objeto com todas as cores
getSoftColors()         // Versões suaves das cores
rgbaColor(color, alpha) // Converte hex para rgba
hexToRgb(hexValue)      // Converte hex para RGB
```

#### Utilitários de Dados
```javascript
// Para processar dados do Supabase
getData(el, data)       // Extrai dados de data-attributes
getRandomNumber(min, max) // Para dados de demonstração
getDates(start, end)    // Gera arrays de datas
getPastDates(duration)  // Datas passadas para gráficos
```

### 🎯 Pontos de Substituição por Calls Supabase

#### 1. Dashboard Principal (index.pug)
```javascript
// ANTES (hardcoded)
var marketShareDefault = {
  title: 'Market Share',
  ammount: '26M',
  data: [/* dados estáticos */]
};

// DEPOIS (Supabase)
const { data: marketShareData } = await supabase
  .from('market_share')
  .select('brand, percentage, color')
  .order('percentage', { ascending: false });
```

#### 2. Projetos em Execução
```javascript
// ANTES
var projects = [/* array estático */];

// DEPOIS
const { data: projectsData } = await supabase
  .from('projects')
  .select('name, progress, estimated_time, status, color')
  .eq('status', 'running')
  .order('progress', { ascending: false });
```

#### 3. Métricas de Audiência
```javascript
// ANTES
var audienceMetrics = {/* objeto estático */};

// DEPOIS
const { data: metricsData } = await supabase
  .from('analytics_metrics')
  .select('metric_type, current_value, previous_value, change_percentage')
  .eq('period', 'current_month');
```

#### 4. Dados de Gráficos ECharts
```javascript
// ANTES
const chartData = [20, 40, 100, 120];
const xAxisData = ['Week 4', 'Week 5', 'week 6', 'week 7'];

// DEPOIS
const { data: chartData } = await supabase
  .from('chart_data')
  .select('period, value')
  .eq('chart_type', 'total_orders')
  .order('period', { ascending: true });

const xAxisData = chartData.map(item => item.period);
const seriesData = chartData.map(item => item.value);
```

---

## 3. SISTEMA DE TEMAS E CORES

### 🎨 CSS Custom Properties (Variáveis CSS)

#### Cores Principais do Falcon
```scss
// Definidas em src/scss/theme/_colors.scss
$primary: #2c7be5;    // --falcon-primary
$secondary: #748194;  // --falcon-secondary  
$success: #00d27a;    // --falcon-success
$info: #27bcfd;       // --falcon-info
$warning: #f5803e;    // --falcon-warning
$danger: #e63757;     // --falcon-danger
$light: #f9fafd;      // --falcon-light
$dark: #0b1727;       // --falcon-dark
```

#### Escala de Cinzas
```scss
// Sistema de grays para backgrounds e textos
$gray-100: #f9fafd;   // --falcon-100
$gray-200: #edf2f9;   // --falcon-200
$gray-300: #d8e2ef;   // --falcon-300
$gray-400: #b6c1d2;   // --falcon-400
$gray-500: #9da9bb;   // --falcon-500
$gray-600: #748194;   // --falcon-600
$gray-700: #5e6e82;   // --falcon-700
$gray-800: #4d5969;   // --falcon-800
$gray-900: #344050;   // --falcon-900
$gray-1000: #232e3c;  // --falcon-1000
$gray-1100: #0b1727;  // --falcon-1100
```

#### Cores Suaves (Soft Colors)
```scss
// Versões com 88% de transparência para backgrounds
--falcon-soft-primary: rgba(44, 123, 229, 0.12);
--falcon-soft-success: rgba(0, 210, 122, 0.12);
--falcon-soft-warning: rgba(245, 128, 62, 0.12);
--falcon-soft-danger: rgba(230, 55, 87, 0.12);
--falcon-soft-info: rgba(39, 188, 253, 0.12);
```

### 🌓 Sistema de Temas (Light/Dark)

#### Configuração de Tema (config.js)
```javascript
var CONFIG = {
  theme: 'light',                    // 'light' | 'dark'
  isNavbarVerticalCollapsed: false,
  isRTL: false,
  isFluid: false,
  navbarStyle: 'transparent',
  navbarPosition: 'vertical'
};

// Aplicação automática do tema
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}
```

#### CSS Custom Properties por Tema
```scss
// Light Theme (src/scss/theme/root/_light.scss)
:root, :root.light {
  --falcon-body-bg: #edf2f9;
  --falcon-body-color: #5e6e82;
  --falcon-border-color: #d8e2ef;
  --falcon-card-bg: #ffffff;
}

// Dark Theme (src/scss/theme/root/_dark.scss)
:root.dark {
  --falcon-body-bg: #0b1727;
  --falcon-body-color: #9da9bb;
  --falcon-border-color: #344050;
  --falcon-card-bg: #232e3c;
}
```

### 🎯 Integração com Dados Dinâmicos do Supabase

#### 1. Cores Baseadas em Status
```javascript
// Mapeamento de status para cores Falcon
const statusColorMap = {
  'active': 'success',      // --falcon-success
  'pending': 'warning',     // --falcon-warning
  'error': 'danger',        // --falcon-danger
  'info': 'info',           // --falcon-info
  'default': 'primary'      // --falcon-primary
};

// Uso com dados do Supabase
const getStatusColor = (status) => {
  return statusColorMap[status] || 'primary';
};
```

#### 2. Gráficos com Cores Dinâmicas
```javascript
// ECharts com cores do sistema Falcon
const chartOptions = {
  color: [
    getColor('primary'),    // #2c7be5
    getColor('success'),    // #00d27a
    getColor('warning'),    // #f5803e
    getColor('danger'),     // #e63757
    getColor('info')        // #27bcfd
  ],
  series: [{
    data: supabaseData.map(item => ({
      name: item.name,
      value: item.value,
      itemStyle: {
        color: getColor(getStatusColor(item.status))
      }
    }))
  }]
};
```

#### 3. Badges e Indicadores Dinâmicos
```javascript
// Geração de badges baseada em dados
const generateBadge = (value, previousValue) => {
  const change = ((value - previousValue) / previousValue * 100).toFixed(1);
  const isPositive = change > 0;
  
  return {
    text: `${isPositive ? '+' : ''}${change}%`,
    color: isPositive ? 'success' : 'danger',
    icon: isPositive ? 'fa-caret-up' : 'fa-caret-down'
  };
};
```

#### 4. Progress Bars com Cores Contextuais
```javascript
// Progress bars com cores baseadas em performance
const getProgressColor = (percentage) => {
  if (percentage >= 80) return 'success';
  if (percentage >= 60) return 'info';
  if (percentage >= 40) return 'warning';
  return 'danger';
};

// Aplicação em projetos do Supabase
projectsData.forEach(project => {
  project.colorClass = getProgressColor(project.progress);
});
```

---

## 4. ESTRUTURA DE INTEGRAÇÃO RECOMENDADA

### 📋 Schema Supabase Sugerido

```sql
-- Tabela de métricas do dashboard
CREATE TABLE dashboard_metrics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  current_value DECIMAL(15,2),
  previous_value DECIMAL(15,2),
  change_percentage DECIMAL(5,2),
  period VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de projetos
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  progress INTEGER CHECK (progress >= 0 AND progress <= 100),
  estimated_time INTERVAL,
  status VARCHAR(20) DEFAULT 'active',
  color VARCHAR(20) DEFAULT 'primary',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de dados de gráficos
CREATE TABLE chart_data (
  id SERIAL PRIMARY KEY,
  chart_type VARCHAR(50) NOT NULL,
  period VARCHAR(50),
  value DECIMAL(15,2),
  label VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de market share
CREATE TABLE market_share (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(50) NOT NULL,
  percentage DECIMAL(5,2),
  color VARCHAR(20) DEFAULT 'primary',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 🔧 Utilitários ECharts Falcon

#### echarts-utils.js - Funções Principais
```javascript
// Função para configurar gráficos com suporte a temas
echartSetOption(chart, userOptions, getDefaultOptions) {
  const themeController = document.body;
  // Merge user options com lodash
  chart.setOption(window._.merge(getDefaultOptions(), userOptions));
  
  // Listener para mudanças de tema
  themeController.addEventListener('clickControl', ({ detail: { control } }) => {
    if (control === 'theme') {
      chart.setOption(window._.merge(getDefaultOptions(), userOptions));
    }
  });
}

// Formatador de tooltip customizado
tooltipFormatter(params) {
  // Suporta formatação de datas com dayjs
  // Exibe múltiplas séries com cores
  // HTML estruturado com classes Bootstrap
}

// Posicionamento de tooltips
getPosition(pos, params, dom, rect, size) {
  return {
    top: pos[1] - size.contentSize[1] - 10,
    left: pos[0] - size.contentSize[0] / 2
  };
}
```

#### Padrão de Inicialização de Gráficos
```javascript
// Exemplo: basic-bar-chart.js
const echartsBasicBarChartInit = () => {
  const $barChartEl = document.querySelector('.echart-basic-bar-chart-example');
  
  if ($barChartEl) {
    // 1. Obter opções do data attribute
    const userOptions = utils.getData($barChartEl, 'options');
    
    // 2. Inicializar gráfico
    const chart = window.echarts.init($barChartEl);
    
    // 3. Dados hardcoded (SUBSTITUIR por Supabase)
    const months = ['January', 'February', /* ... */];
    const data = [1272, 1301, 1402, /* ... */];
    
    // 4. Configuração padrão
    const getDefaultOptions = () => ({
      // Configuração completa do gráfico
    });
    
    // 5. Aplicar configurações
    echartSetOption(chart, userOptions, getDefaultOptions);
  }
};
```

### 🔧 Funções de Integração Supabase

```javascript
// utils/supabase-integration.js
import { createClient } from '@supabase/supabase-js';
import utils from '../js/utils.js';
import { echartSetOption, tooltipFormatter } from '../js/charts/echarts/echarts-utils.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para buscar métricas do dashboard
export const getDashboardMetrics = async () => {
  const { data, error } = await supabase
    .from('dashboard_metrics')
    .select('*')
    .eq('period', 'current_month');
    
  if (error) throw error;
  
  return data.map(metric => ({
    ...metric,
    badge: generateBadge(metric.current_value, metric.previous_value),
    color: getMetricColor(metric.change_percentage)
  }));
};

// Função para buscar projetos ativos
export const getActiveProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('progress', { ascending: false })
    .limit(5);
    
  if (error) throw error;
  
  return data.map(project => ({
    ...project,
    colorClass: utils.getColor(project.color),
    avatar: generateAvatar(project.name)
  }));
};

// Função para dados de gráficos ECharts
export const getChartData = async (chartType) => {
  const { data, error } = await supabase
    .from('chart_data')
    .select('*')
    .eq('chart_type', chartType)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  
  return {
    xAxis: data.map(item => item.period),
    series: data.map(item => item.value),
    colors: data.map((_, index) => {
      const colors = ['primary', 'success', 'info', 'warning', 'danger'];
      return utils.getColor(colors[index % colors.length]);
    })
  };
};
```

// Exemplo: Adaptação de gráfico básico para Supabase
const createSupabaseBarChart = async (chartElement, chartType) => {
  const chart = window.echarts.init(chartElement);
  
  // Buscar dados do Supabase
  const { data: chartData } = await getChartData(chartType);
  
  const getDefaultOptions = () => ({
    tooltip: {
      trigger: 'axis',
      padding: [7, 10],
      backgroundColor: utils.getGrays()['100'],
      borderColor: utils.getGrays()['300'],
      textStyle: { color: utils.getColors().dark },
      formatter: tooltipFormatter
    },
    xAxis: {
      type: 'category',
      data: chartData.xAxis,  // Dados dinâmicos
      axisLabel: {
        color: utils.getGrays()['400']
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: utils.getGrays()['400']
      }
    },
    series: [{
      type: 'bar',
      name: 'Dados',
      data: chartData.series,  // Dados dinâmicos
      itemStyle: {
        color: utils.getColor('primary')
      }
    }]
  });
  
  echartSetOption(chart, {}, getDefaultOptions);
  return chart;
};
```

---

## 5. EXEMPLOS PRÁTICOS DE INTEGRAÇÃO

### 📊 Adaptação de Gráfico Existente

#### ANTES (Hardcoded)
```javascript
// basic-bar-chart.js - Dados estáticos
const months = ['January', 'February', 'March', /* ... */];
const data = [1272, 1301, 1402, /* ... */];

const getDefaultOptions = () => ({
  xAxis: { data: months },
  series: [{ data: data }]
});
```

#### DEPOIS (Supabase)
```javascript
// basic-bar-chart-supabase.js - Dados dinâmicos
const echartsBasicBarChartInit = async () => {
  const $barChartEl = document.querySelector('.echart-basic-bar-chart-example');
  
  if ($barChartEl) {
    const chart = window.echarts.init($barChartEl);
    
    // Buscar dados do Supabase
    const { data: salesData } = await supabase
      .from('monthly_sales')
      .select('month, total_sales')
      .order('month', { ascending: true });
    
    const months = salesData.map(item => item.month);
    const data = salesData.map(item => item.total_sales);
    
    const getDefaultOptions = () => ({
      tooltip: {
        trigger: 'axis',
        formatter: tooltipFormatter,
        backgroundColor: utils.getGrays()['100']
      },
      xAxis: {
        type: 'category',
        data: months,  // Dados dinâmicos
        axisLabel: {
          color: utils.getGrays()['400'],
          formatter: value => value.substring(0, 3)
        }
      },
      series: [{
        type: 'bar',
        name: 'Vendas',
        data: data,  // Dados dinâmicos
        itemStyle: {
          color: utils.getColor('primary'),
          barBorderRadius: [3, 3, 0, 0]
        }
      }]
    });
    
    echartSetOption(chart, {}, getDefaultOptions);
  }
};
```

### 🔄 Real-time Updates

```javascript
// Configuração de updates em tempo real
const setupRealtimeChart = (chartElement, tableName) => {
  const chart = window.echarts.init(chartElement);
  
  // Subscription para mudanças
  const subscription = supabase
    .channel('chart-updates')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: tableName },
        async (payload) => {
          // Recarregar dados e atualizar gráfico
          const newData = await getChartData(tableName);
          chart.setOption({
            xAxis: { data: newData.xAxis },
            series: [{ data: newData.series }]
          });
        }
    )
    .subscribe();
    
  return { chart, subscription };
};
```

### 🎨 Cores Dinâmicas Baseadas em Status

```javascript
// Função para cores baseadas em performance
const getPerformanceColor = (value, target) => {
  const percentage = (value / target) * 100;
  
  if (percentage >= 100) return utils.getColor('success');
  if (percentage >= 80) return utils.getColor('info');
  if (percentage >= 60) return utils.getColor('warning');
  return utils.getColor('danger');
};

// Aplicação em gráfico de barras
const createPerformanceChart = async () => {
  const { data: performanceData } = await supabase
    .from('team_performance')
    .select('team_name, current_value, target_value');
    
  const series = performanceData.map(item => ({
    name: item.team_name,
    value: item.current_value,
    itemStyle: {
      color: getPerformanceColor(item.current_value, item.target_value)
    }
  }));
  
  return {
    series: [{
      type: 'bar',
      data: series
    }]
  };
};
```

---

## 6. IMPLEMENTAÇÃO STEP-BY-STEP

### Fase 1: Preparação ✅
1. ✅ Mapear todos os dados hardcoded
2. ✅ Identificar pontos de integração
3. ✅ Documentar sistema de cores
4. ✅ Analisar utilitários ECharts
5. 🔄 Criar schema Supabase
6. 🔄 Configurar cliente Supabase

### Fase 2: Substituição Gradual
1. 🔄 Substituir dados de CardStatistics
2. 🔄 Integrar CardProjects com Supabase
3. 🔄 Conectar gráficos ECharts (basic-bar-chart primeiro)
4. 🔄 Implementar CardAudience dinâmico
5. 🔄 Adaptar tooltipFormatter para dados reais

### Fase 3: Otimização
1. 🔄 Implementar cache de dados
2. 🔄 Adicionar loading states
3. 🔄 Configurar real-time updates
4. 🔄 Testes de performance
5. 🔄 Otimizar queries Supabase

### Fase 4: Finalização
1. 🔄 Documentação de APIs
2. 🔄 Testes de integração
3. 🔄 Deploy e monitoramento
4. 🔄 Treinamento da equipe

---

## 7. ARQUIVOS PRIORITÁRIOS PARA MODIFICAÇÃO

### 🎯 Alta Prioridade
1. **src/js/charts/echarts/examples/basic-bar-chart.js** - Gráfico mais simples
2. **src/pug/mixins/home/dashboard/CardStatistics.pug** - Métricas principais
3. **src/pug/mixins/home/dashboard/CardProjects.pug** - Lista de projetos
4. **src/js/utils.js** - Adicionar funções Supabase

### 🔄 Média Prioridade
5. **src/pug/mixins/home/dashboard-analytics/CardAudience.pug** - Analytics
6. **src/js/charts/echarts/examples/pie-chart.js** - Market share
7. **src/js/charts/echarts/echarts-utils.js** - Melhorar tooltips

### 📋 Baixa Prioridade
8. Outros gráficos ECharts
9. Componentes secundários
10. Otimizações de performance

---

**STATUS**: Arquitetura completamente mapeada ✅ | Exemplos práticos documentados ✅ | Pronto para integração Supabase 🚀