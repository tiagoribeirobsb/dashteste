/**
 * KPI ECharts Manager - Vendas Dashboard
 * Integração completa com backend REST API (porta 3002)
 * 6 Charts estratégicos conforme análise PDF
 */

// ===== CONFIGURAÇÕES GLOBAIS =====
const API_BASE = 'http://localhost:3002';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos
const CHART_THEME = {
    colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'],
    backgroundColor: '#ffffff',
    textStyle: {
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#2c3e50'
    }
};

// ===== ESTADO GLOBAL =====
let chartInstances = {};
let refreshTimers = {};
let isInitialized = false;

// ===== UTILITÁRIOS DE API =====
async function fetchData(endpoint) {
    try {
        showRefreshIndicator(endpoint);
        const response = await fetch(`${API_BASE}${endpoint}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        hideRefreshIndicator(endpoint);
        return data;
    } catch (error) {
        console.error(`Erro ao buscar ${endpoint}:`, error);
        hideRefreshIndicator(endpoint);
        throw error;
    }
}

function showRefreshIndicator(endpoint) {
    const indicators = {
        '/api/saude-base': 'refresh-saude',
        '/api/concentracao': 'refresh-concentracao',
        '/api/radar-reativacao': 'refresh-radar',
        '/api/vendas-14d': 'refresh-vendas14d',
        '/api/status-pedidos': 'refresh-status',
        '/api/top-clientes': 'refresh-top'
    };
    
    const indicatorId = indicators[endpoint];
    if (indicatorId) {
        const indicator = document.getElementById(indicatorId);
        if (indicator) {
            indicator.style.color = '#e74c3c';
            indicator.style.animation = 'pulse 1s infinite';
        }
    }
}

function hideRefreshIndicator(endpoint) {
    const indicators = {
        '/api/saude-base': 'refresh-saude',
        '/api/concentracao': 'refresh-concentracao',
        '/api/radar-reativacao': 'refresh-radar',
        '/api/vendas-14d': 'refresh-vendas14d',
        '/api/status-pedidos': 'refresh-status',
        '/api/top-clientes': 'refresh-top'
    };
    
    const indicatorId = indicators[endpoint];
    if (indicatorId) {
        const indicator = document.getElementById(indicatorId);
        if (indicator) {
            indicator.style.color = '#27ae60';
            indicator.style.animation = 'none';
        }
    }
}

// ===== FORMATADORES =====
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatPercent(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(value / 100);
}

function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(value);
}

// ===== GESTÃO DE ERROS =====
function showError(containerId, message, retryCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
            <p><strong>Erro ao carregar dados</strong></p>
            <p class="text-muted">${message}</p>
            <button class="retry-btn" onclick="${retryCallback}">
                <i class="fas fa-redo"></i> Tentar Novamente
            </button>
        </div>
    `;
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="loading-skeleton"></div>';
}

// ===== CHART 1: SAÚDE DA BASE =====
async function createSaudeBaseChart() {
    const containerId = 'chart-saude-base';
    
    try {
        showLoading(containerId);
        const data = await fetchData('/api/saude-base');
        
        // Atualizar KPIs
        updateKPI('coverage-30d', formatPercent(data.coverage_30d || 0));
        updateKPI('coverage-90d', formatPercent(data.coverage_90d || 0));
        updateKPI('coverage-360d', formatPercent(data.coverage_360d || 0));
        updateKPI('revenue-at-risk', formatCurrency(data.revenue_at_risk_90d || 0));
        
        // Preparar dados para o chart
        const dates = data.timeline || [];
        const series = [
            {
                name: 'Clientes Ativos',
                type: 'line',
                data: data.active_clients || [],
                smooth: true,
                lineStyle: { width: 3 },
                itemStyle: { color: CHART_THEME.colors[0] }
            },
            {
                name: 'Novos Clientes',
                type: 'line',
                data: data.new_clients || [],
                smooth: true,
                lineStyle: { width: 2 },
                itemStyle: { color: CHART_THEME.colors[1] }
            },
            {
                name: 'Reativados',
                type: 'line',
                data: data.reactivated_clients || [],
                smooth: true,
                lineStyle: { width: 2 },
                itemStyle: { color: CHART_THEME.colors[2] }
            },
            {
                name: 'Em Risco',
                type: 'line',
                data: data.at_risk_clients || [],
                smooth: true,
                lineStyle: { width: 2, type: 'dashed' },
                itemStyle: { color: CHART_THEME.colors[3] }
            }
        ];
        
        const option = {
            title: {
                text: 'Evolução da Base de Clientes',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                formatter: function(params) {
                    let result = `<strong>${params[0].axisValue}</strong><br/>`;
                    params.forEach(param => {
                        result += `${param.marker} ${param.seriesName}: ${formatNumber(param.value)}<br/>`;
                    });
                    return result;
                }
            },
            legend: {
                data: series.map(s => s.name),
                bottom: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLine: { lineStyle: { color: '#e0e0e0' } }
            },
            yAxis: {
                type: 'value',
                axisLine: { lineStyle: { color: '#e0e0e0' } },
                splitLine: { lineStyle: { color: '#f5f5f5' } }
            },
            series: series,
            dataZoom: [
                {
                    type: 'inside',
                    start: 70,
                    end: 100
                }
            ]
        };
        
        renderChart(containerId, option);
        
    } catch (error) {
        showError(containerId, error.message, 'createSaudeBaseChart()');
    }
}

// ===== CHART 2: CONCENTRAÇÃO (PARETO) =====
async function createConcentracaoChart() {
    const containerId = 'chart-concentracao';
    
    try {
        showLoading(containerId);
        const data = await fetchData('/api/concentracao');
        
        // Atualizar KPIs
        updateKPI('hhi-index', (data.hhi_index || 0).toFixed(0));
        updateKPI('top20-share', formatPercent(data.top20_share || 0));
        
        // Preparar dados
        const clients = data.clients || [];
        const revenues = clients.map(c => c.revenue_30d);
        const cumShares = clients.map(c => c.cum_share_pct);
        
        const option = {
            title: {
                text: 'Concentração de Receita (Pareto)',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['Receita 30d', 'Acumulado %'],
                bottom: 0
            },
            xAxis: [
                {
                    type: 'category',
                    data: clients.map(c => c.client_name || `Cliente ${c.client_id}`),
                    axisPointer: { type: 'shadow' },
                    axisLabel: { rotate: 45, fontSize: 10 }
                }
            ],
            yAxis: [
                {
                    type: 'value',
                    name: 'Receita (R$)',
                    position: 'left',
                    axisLabel: { formatter: value => formatCurrency(value) }
                },
                {
                    type: 'value',
                    name: 'Acumulado (%)',
                    position: 'right',
                    min: 0,
                    max: 100,
                    axisLabel: { formatter: '{value}%' }
                }
            ],
            series: [
                {
                    name: 'Receita 30d',
                    type: 'bar',
                    data: revenues,
                    itemStyle: { color: CHART_THEME.colors[0] },
                    tooltip: {
                        formatter: params => `${params.name}<br/>Receita: ${formatCurrency(params.value)}`
                    }
                },
                {
                    name: 'Acumulado %',
                    type: 'line',
                    yAxisIndex: 1,
                    data: cumShares,
                    smooth: true,
                    lineStyle: { width: 3, color: CHART_THEME.colors[3] },
                    itemStyle: { color: CHART_THEME.colors[3] },
                    tooltip: {
                        formatter: params => `${params.name}<br/>Acumulado: ${params.value.toFixed(1)}%`
                    }
                }
            ],
            markLine: {
                data: [
                    { yAxis: 80, lineStyle: { color: '#e74c3c', type: 'dashed' } }
                ]
            }
        };
        
        renderChart(containerId, option);
        
    } catch (error) {
        showError(containerId, error.message, 'createConcentracaoChart()');
    }
}

// ===== CHART 3: RADAR DE REATIVAÇÃO (HEATMAP) =====
async function createRadarReativacaoChart() {
    const containerId = 'chart-radar-reativacao';
    
    try {
        showLoading(containerId);
        const data = await fetchData('/api/radar-reativacao');
        
        // Atualizar KPIs
        updateKPI('clientes-risco', formatNumber(data.clientes_risco || 0));
        updateKPI('potencial-reativacao', formatCurrency(data.potencial_reativacao || 0));
        updateKPI('prioridade-alta', formatNumber(data.prioridade_alta || 0));
        
        // Preparar dados para heatmap
        const clients = data.clients || [];
        const dayRanges = ['0-30', '31-60', '61-90', '91-120', '120+'];
        
        // Transformar dados para formato heatmap
        const heatmapData = [];
        clients.forEach((client, clientIndex) => {
            dayRanges.forEach((range, rangeIndex) => {
                const value = client.revenue_90d || 0;
                heatmapData.push([rangeIndex, clientIndex, value]);
            });
        });
        
        const option = {
            title: {
                text: 'Radar de Reativação - Clientes por Dias sem Compra',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                position: 'top',
                formatter: function(params) {
                    const client = clients[params.value[1]];
                    return `Cliente: ${client?.client_name || 'N/A'}<br/>
                            Dias sem compra: ${dayRanges[params.value[0]]}<br/>
                            Receita 90d: ${formatCurrency(params.value[2])}`;
                }
            },
            grid: {
                height: '60%',
                top: '10%'
            },
            xAxis: {
                type: 'category',
                data: dayRanges,
                splitArea: { show: true }
            },
            yAxis: {
                type: 'category',
                data: clients.map(c => c.client_name || `Cliente ${c.client_id}`).slice(0, 20),
                splitArea: { show: true },
                axisLabel: { fontSize: 10 }
            },
            visualMap: {
                min: 0,
                max: Math.max(...heatmapData.map(d => d[2])),
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '5%',
                inRange: {
                    color: ['#ffffff', '#667eea', '#764ba2']
                },
                formatter: value => formatCurrency(value)
            },
            series: [{
                name: 'Receita',
                type: 'heatmap',
                data: heatmapData,
                label: {
                    show: false
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        renderChart(containerId, option);
        
    } catch (error) {
        showError(containerId, error.message, 'createRadarReativacaoChart()');
    }
}

// ===== CHART 4: VENDAS 14 DIAS (WATERFALL) =====
async function createVendas14DChart() {
    const containerId = 'chart-vendas-14d';
    
    try {
        showLoading(containerId);
        const data = await fetchData('/api/vendas-14d');
        
        // Atualizar KPIs
        updateKPI('var-pct-14d', formatPercent(data.var_pct || 0));
        updateKPI('ticket-medio-14d', formatCurrency(data.ticket_medio_14d || 0));
        updateKPI('orders-14d', formatNumber(data.orders_14d || 0));
        
        // Preparar dados waterfall
        const dailyData = data.daily_variations || [];
        const waterfallData = [];
        
        // Valor inicial
        waterfallData.push({
            name: 'Receita Anterior',
            value: data.rev_14d_anterior || 0,
            itemStyle: { color: '#95a5a6' }
        });
        
        // Variações diárias
        dailyData.forEach(day => {
            waterfallData.push({
                name: day.date,
                value: day.variation,
                itemStyle: { 
                    color: day.variation >= 0 ? '#27ae60' : '#e74c3c' 
                }
            });
        });
        
        // Valor final
        waterfallData.push({
            name: 'Receita Atual',
            value: data.rev_14d_atual || 0,
            itemStyle: { color: '#3498db' }
        });
        
        const option = {
            title: {
                text: 'Vendas Últimos 14 Dias - Análise Waterfall',
                textStyle: { fontSize: 14, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: function(params) {
                    const param = params[0];
                    return `${param.name}<br/>Valor: ${formatCurrency(Math.abs(param.value))}`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: waterfallData.map(d => d.name),
                axisLabel: { rotate: 45, fontSize: 10 }
            },
            yAxis: {
                type: 'value',
                axisLabel: { formatter: value => formatCurrency(value) }
            },
            series: [
                {
                    name: 'Vendas',
                    type: 'bar',
                    data: waterfallData,
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 1
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                },
                // Linha MA7
                {
                    name: 'MA7',
                    type: 'line',
                    data: data.ma7_data || [],
                    smooth: true,
                    lineStyle: { 
                        color: '#f39c12',
                        width: 2,
                        type: 'dashed'
                    },
                    symbol: 'circle',
                    symbolSize: 4
                }
            ]
        };
        
        renderChart(containerId, option);
        
    } catch (error) {
        showError(containerId, error.message, 'createVendas14DChart()');
    }
}

// ===== CHART 5: STATUS PEDIDOS =====
async function createStatusPedidosChart() {
    const stackedContainerId = 'chart-status-pedidos';
    const donutContainerId = 'chart-status-donut';
    
    try {
        showLoading(stackedContainerId);
        showLoading(donutContainerId);
        
        const data = await fetchData('/api/status-pedidos');
        
        // Atualizar KPIs
        updateKPI('conversion-paid', formatPercent(data.conversion_paid || 0));
        updateKPI('conversion-delivered', formatPercent(data.conversion_delivered || 0));
        
        // Chart Stacked Column (evolução diária)
        const dailyData = data.daily_evolution || [];
        const dates = dailyData.map(d => d.date);
        const statusTypes = ['paid', 'shipped', 'delivered', 'cancelled'];
        const statusNames = ['Pago', 'Enviado', 'Entregue', 'Cancelado'];
        const statusColors = ['#3498db', '#f39c12', '#27ae60', '#e74c3c'];
        
        const stackedSeries = statusTypes.map((status, index) => ({
            name: statusNames[index],
            type: 'bar',
            stack: 'total',
            data: dailyData.map(d => d[status] || 0),
            itemStyle: { color: statusColors[index] }
        }));
        
        const stackedOption = {
            title: {
                text: 'Evolução Diária dos Status',
                textStyle: { fontSize: 12, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: {
                data: statusNames,
                bottom: 0,
                textStyle: { fontSize: 10 }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '20%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: { fontSize: 9, rotate: 45 }
            },
            yAxis: {
                type: 'value'
            },
            series: stackedSeries
        };
        
        // Chart Donut (mix atual)
        const currentMix = data.current_mix || {};
        const donutData = statusTypes.map((status, index) => ({
            name: statusNames[index],
            value: currentMix[status] || 0,
            itemStyle: { color: statusColors[index] }
        }));
        
        const donutOption = {
            title: {
                text: 'Mix Atual (14d)',
                textStyle: { fontSize: 12, fontWeight: 'normal' },
                left: 'center',
                top: 10
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            series: [{
                name: 'Status',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '60%'],
                data: donutData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                label: {
                    fontSize: 10
                }
            }]
        };
        
        renderChart(stackedContainerId, stackedOption);
        renderChart(donutContainerId, donutOption);
        
    } catch (error) {
        showError(stackedContainerId, error.message, 'createStatusPedidosChart()');
        showError(donutContainerId, error.message, 'createStatusPedidosChart()');
    }
}

// ===== CHART 6: TOP 20 CLIENTES =====
async function createTopClientesChart() {
    const barContainerId = 'chart-top-clientes-bar';
    const scatterContainerId = 'chart-top-clientes-scatter';
    
    try {
        showLoading(barContainerId);
        showLoading(scatterContainerId);
        
        const data = await fetchData('/api/top-clientes');
        
        // Atualizar KPIs
        updateKPI('clientes-volume', formatNumber(data.clientes_volume || 0));
        updateKPI('clientes-premium', formatNumber(data.clientes_premium || 0));
        updateKPI('aov-medio', formatCurrency(data.aov_medio || 0));
        
        const clients = data.clients || [];
        
        // Chart Horizontal Bar (receita 30d)
        const barOption = {
            title: {
                text: 'Top 20 - Receita 30d',
                textStyle: { fontSize: 12, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: params => {
                    const param = params[0];
                    return `${param.name}<br/>Receita: ${formatCurrency(param.value)}`;
                }
            },
            grid: {
                left: '20%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                axisLabel: { formatter: value => formatCurrency(value) }
            },
            yAxis: {
                type: 'category',
                data: clients.map(c => c.client_name || `Cliente ${c.client_id}`).slice(0, 20),
                axisLabel: { fontSize: 9 }
            },
            series: [{
                name: 'Receita 30d',
                type: 'bar',
                data: clients.map(c => c.revenue_30d).slice(0, 20),
                itemStyle: { 
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: CHART_THEME.colors[0] },
                        { offset: 1, color: CHART_THEME.colors[1] }
                    ])
                }
            }]
        };
        
        // Chart Scatter (orders vs AOV)
        const scatterData = clients.map(c => [
            c.orders_30d || 0,
            c.aov_30d || 0,
            c.revenue_30d || 0,
            c.client_name || `Cliente ${c.client_id}`
        ]);
        
        const scatterOption = {
            title: {
                text: 'Perfil: Volume vs Premium',
                textStyle: { fontSize: 12, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    const [orders, aov, revenue, name] = params.value;
                    return `${name}<br/>
                            Pedidos: ${formatNumber(orders)}<br/>
                            AOV: ${formatCurrency(aov)}<br/>
                            Receita: ${formatCurrency(revenue)}`;
                }
            },
            grid: {
                left: '10%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: 'Pedidos 30d',
                nameLocation: 'middle',
                nameGap: 25
            },
            yAxis: {
                type: 'value',
                name: 'AOV 30d',
                nameLocation: 'middle',
                nameGap: 40,
                axisLabel: { formatter: value => formatCurrency(value) }
            },
            series: [{
                name: 'Clientes',
                type: 'scatter',
                data: scatterData,
                symbolSize: function(data) {
                    return Math.sqrt(data[2]) / 100; // Size baseado na receita
                },
                itemStyle: {
                    color: CHART_THEME.colors[2],
                    opacity: 0.7
                },
                emphasis: {
                    itemStyle: {
                        opacity: 1,
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        renderChart(barContainerId, barOption);
        renderChart(scatterContainerId, scatterOption);
        
    } catch (error) {
        showError(barContainerId, error.message, 'createTopClientesChart()');
        showError(scatterContainerId, error.message, 'createTopClientesChart()');
    }
}

// ===== UTILITÁRIOS DE CHART =====
function renderChart(containerId, option) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Dispose existing chart
    if (chartInstances[containerId]) {
        chartInstances[containerId].dispose();
    }
    
    // Create new chart
    const chart = echarts.init(container, null, {
        renderer: 'canvas',
        useDirtyRect: false
    });
    
    chart.setOption(option);
    chartInstances[containerId] = chart;
    
    // Responsive resize
    const resizeObserver = new ResizeObserver(() => {
        chart.resize();
    });
    resizeObserver.observe(container);
    
    // Window resize fallback
    window.addEventListener('resize', () => {
        setTimeout(() => chart.resize(), 100);
    });
}

function updateKPI(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// ===== FUNÇÕES PRINCIPAIS =====
async function initVendasDashboard() {
    if (isInitialized) return;
    
    try {
        // Atualizar timestamp
        updateLastUpdate();
        
        // Inicializar todos os charts
        await Promise.allSettled([
            createSaudeBaseChart(),
            createConcentracaoChart(),
            createRadarReativacaoChart(),
            createVendas14DChart(),
            createStatusPedidosChart(),
            createTopClientesChart()
        ]);
        
        // Configurar auto-refresh
        setupAutoRefresh();
        
        isInitialized = true;
        console.log('Dashboard de Vendas inicializado com sucesso');
        
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
    }
}

function setupAutoRefresh() {
    // Clear existing timers
    Object.values(refreshTimers).forEach(timer => clearInterval(timer));
    refreshTimers = {};
    
    // Setup new timers
    const refreshFunctions = [
        createSaudeBaseChart,
        createConcentracaoChart,
        createRadarReativacaoChart,
        createVendas14DChart,
        createStatusPedidosChart,
        createTopClientesChart
    ];
    
    refreshFunctions.forEach((fn, index) => {
        refreshTimers[`chart_${index}`] = setInterval(fn, REFRESH_INTERVAL);
    });
    
    // Update timestamp timer
    refreshTimers.timestamp = setInterval(updateLastUpdate, 60000); // 1 minuto
}

function updateLastUpdate() {
    const element = document.getElementById('lastUpdate');
    if (element) {
        const now = new Date();
        element.textContent = `Atualizado: ${now.toLocaleTimeString('pt-BR')}`;
    }
}

async function refreshAllCharts() {
    try {
        updateLastUpdate();
        
        await Promise.allSettled([
            createSaudeBaseChart(),
            createConcentracaoChart(),
            createRadarReativacaoChart(),
            createVendas14DChart(),
            createStatusPedidosChart(),
            createTopClientesChart()
        ]);
        
        console.log('Todos os charts foram atualizados');
        
    } catch (error) {
        console.error('Erro ao atualizar charts:', error);
    }
}

// ===== CLEANUP =====
function cleanup() {
    // Dispose all charts
    Object.values(chartInstances).forEach(chart => {
        if (chart && typeof chart.dispose === 'function') {
            chart.dispose();
        }
    });
    chartInstances = {};
    
    // Clear all timers
    Object.values(refreshTimers).forEach(timer => clearInterval(timer));
    refreshTimers = {};
    
    isInitialized = false;
}

// ===== EVENT LISTENERS =====
window.addEventListener('beforeunload', cleanup);

// ===== EXPORT FUNCTIONS =====
window.initVendasDashboard = initVendasDashboard;
window.refreshAllCharts = refreshAllCharts;
window.createSaudeBaseChart = createSaudeBaseChart;
window.createConcentracaoChart = createConcentracaoChart;
window.createRadarReativacaoChart = createRadarReativacaoChart;
window.createVendas14DChart = createVendas14DChart;
window.createStatusPedidosChart = createStatusPedidosChart;
window.createTopClientesChart = createTopClientesChart;