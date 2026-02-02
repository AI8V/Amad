// ============================================
// Analytics Configuration
// ============================================
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzbLYN6pSJqGD_pnJz9icsqGHoT3PEXHlKra4CHk4xxxb-Y9Y6QHwTBRZU0Sm1Z9IAq/exec'
};

// ============================================
// Global Variables
// ============================================
let analyticsData = null;
let currentKeyword = 'all';
let categoryChart = null;
let cityChart = null;

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadAnalytics();
    setupAccessibility();
});

function setupAccessibility() {
    // Announce page load completion for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'visually-hidden';
    announcement.id = 'announcer';
    document.body.appendChild(announcement);
}

function announce(message) {
    const announcer = document.getElementById('announcer');
    if (announcer) {
        announcer.textContent = message;
        setTimeout(() => { announcer.textContent = ''; }, 1000);
    }
}

// ============================================
// API Functions
// ============================================
async function fetchAPI(action, params = {}) {
    try {
        const url = new URL(CONFIG.API_URL);
        url.searchParams.append('action', action);
        
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        
        const response = await fetch(url.toString());
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// Data Loading
// ============================================
async function loadAnalytics() {
    showLoading(true);
    
    try {
        analyticsData = await fetchAPI('getAnalytics', { keyword: currentKeyword });
        
        updateSummary(analyticsData.summary);
        renderKeywordButtons(analyticsData.keywords);
        renderCityBadges(analyticsData.cities);
        renderTable(analyticsData);
        renderInsights(analyticsData);
        renderCharts(analyticsData);
        
        announce('تم تحميل التحليلات بنجاح');
        
    } catch (error) {
        console.error('Load Error:', error);
        announce('حدث خطأ في تحميل البيانات');
    } finally {
        showLoading(false);
    }
}

async function refreshData() {
    await loadAnalytics();
    announce('تم تحديث البيانات');
}

// ============================================
// Keyword Selection
// ============================================
function selectKeyword(keyword, btn) {
    currentKeyword = keyword;
    
    // Update button states
    document.querySelectorAll('.keyword-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    
    announce(`تم اختيار: ${keyword === 'all' ? 'جميع الكلمات' : keyword}`);
    
    loadAnalytics();
}

// ============================================
// Rendering Functions
// ============================================
function updateSummary(summary) {
    document.getElementById('totalRecords').textContent = formatNumber(summary.totalRecords);
    document.getElementById('totalCities').textContent = formatNumber(summary.totalCities);
    document.getElementById('totalCategories').textContent = formatNumber(summary.totalCategories);
    document.getElementById('totalKeywords').textContent = formatNumber(summary.totalKeywords);
}

function renderKeywordButtons(keywords) {
    const container = document.getElementById('keywordButtons');
    
    let html = `
        <button class="btn keyword-btn ${currentKeyword === 'all' ? 'active' : ''}" 
                data-keyword="all" 
                onclick="selectKeyword('all', this)"
                aria-pressed="${currentKeyword === 'all'}">
            <i class="bi bi-grid-fill ms-1" aria-hidden="true"></i>
            جميع الكلمات
        </button>
    `;
    
    keywords.forEach(kw => {
        const isActive = currentKeyword === kw;
        html += `
            <button class="btn keyword-btn ${isActive ? 'active' : ''}" 
                    data-keyword="${escapeHtml(kw)}" 
                    onclick="selectKeyword('${escapeHtml(kw)}', this)"
                    aria-pressed="${isActive}">
                ${escapeHtml(kw)}
            </button>
        `;
    });
    
    container.innerHTML = html;
}

function renderCityBadges(cities) {
    const container = document.getElementById('cityBadges');
    container.innerHTML = cities.map(city => 
        `<span class="badge-city" role="listitem">
            <i class="bi bi-geo-alt ms-1" aria-hidden="true"></i>${escapeHtml(city)}
        </span>`
    ).join('');
}

function renderTable(data) {
    const { report, cities } = data;
    const emptyState = document.getElementById('emptyState');
    const tableBody = document.getElementById('tableBody');
    
    if (report.length === 0) {
        emptyState.classList.remove('d-none');
        tableBody.innerHTML = '';
        document.getElementById('tableHeader').innerHTML = '';
        return;
    }
    
    emptyState.classList.add('d-none');
    
    // Build header
    const headerHtml = `
        <tr>
            <th scope="col" rowspan="2" style="min-width: 150px;">الكلمة المفتاحية</th>
            <th scope="col" rowspan="2" style="min-width: 180px;">الفئة</th>
            ${cities.map(city => `
                <th scope="colgroup" colspan="2" class="city-header">${escapeHtml(city)}</th>
            `).join('')}
        </tr>
        <tr>
            ${cities.map(() => `
                <th scope="col" style="min-width: 60px;">العدد</th>
                <th scope="col" style="min-width: 70px;">النسبة</th>
            `).join('')}
        </tr>
    `;
    document.getElementById('tableHeader').innerHTML = headerHtml;
    
    // Group data by keyword and category
    const grouped = {};
    const keywordTotals = {};
    
    report.forEach(item => {
        const key = `${item.keyword}|||${item.category}`;
        if (!grouped[key]) {
            grouped[key] = {
                keyword: item.keyword,
                category: item.category,
                cities: {}
            };
        }
        grouped[key].cities[item.city] = {
            count: item.count,
            percentage: item.percentage
        };
        
        if (!keywordTotals[item.keyword]) {
            keywordTotals[item.keyword] = {};
        }
        if (!keywordTotals[item.keyword][item.city]) {
            keywordTotals[item.keyword][item.city] = 0;
        }
        keywordTotals[item.keyword][item.city] += item.count;
    });
    
    // Build table body
    let bodyHtml = '';
    let currentKw = '';
    
    Object.values(grouped).forEach((item) => {
        const isNewKeyword = item.keyword !== currentKw;
        currentKw = item.keyword;
        
        bodyHtml += `<tr>`;
        
        if (isNewKeyword) {
            const kwRows = Object.values(grouped).filter(g => g.keyword === item.keyword).length;
            bodyHtml += `
                <th scope="row" class="keyword-cell" rowspan="${kwRows}">
                    <i class="bi bi-key ms-1" aria-hidden="true"></i>
                    ${escapeHtml(item.keyword)}
                </th>
            `;
        }
        
        bodyHtml += `<td class="category-cell">${escapeHtml(item.category)}</td>`;
        
        cities.forEach(city => {
            const cityData = item.cities[city] || { count: 0, percentage: 0 };
            const percentClass = getPercentageClass(cityData.percentage);
            
            bodyHtml += `
                <td class="count-cell">${cityData.count}</td>
                <td class="percentage-cell ${percentClass}">${cityData.percentage}%</td>
            `;
        });
        
        bodyHtml += `</tr>`;
    });
    
    // Total rows
    Object.keys(keywordTotals).forEach(kw => {
        bodyHtml += `<tr class="total-row">`;
        bodyHtml += `<td colspan="2"><i class="bi bi-calculator ms-1" aria-hidden="true"></i>إجمالي "${escapeHtml(kw)}"</td>`;
        
        cities.forEach(city => {
            const total = keywordTotals[kw][city] || 0;
            bodyHtml += `
                <td>${total}</td>
                <td>100%</td>
            `;
        });
        
        bodyHtml += `</tr>`;
    });
    
    tableBody.innerHTML = bodyHtml;
}

function renderInsights(data) {
    const { report, cities } = data;
    const container = document.getElementById('insightsContainer');
    
    if (report.length === 0) {
        container.innerHTML = '<p class="no-data-text">لا توجد بيانات كافية للتحليل</p>';
        return;
    }
    
    const insights = [];
    
    // Top category per city
    cities.forEach(city => {
        const cityItems = report.filter(r => r.city === city);
        if (cityItems.length > 0) {
            const topCategory = cityItems.reduce((max, item) => 
                item.percentage > max.percentage ? item : max
            );
            insights.push({
                type: 'success',
                icon: 'trophy',
                text: `<strong>${escapeHtml(city)}</strong>: الأعلى "${escapeHtml(topCategory.category)}" بنسبة <strong>${topCategory.percentage}%</strong>`
            });
        }
    });
    
    // City comparison
    if (cities.length >= 2) {
        const cityTotals = {};
        report.forEach(item => {
            if (!cityTotals[item.city]) cityTotals[item.city] = 0;
            cityTotals[item.city] += item.count;
        });
        
        const maxCity = Object.entries(cityTotals).reduce((max, [city, total]) => 
            total > max.total ? { city, total } : max, { city: '', total: 0 }
        );
        
        insights.push({
            type: 'warning',
            icon: 'graph-up-arrow',
            text: `<strong>${escapeHtml(maxCity.city)}</strong> لديها أكبر عدد من النتائج (${maxCity.total} سجل)`
        });
    }
    
    container.innerHTML = insights.map(insight => `
        <article class="insight-card ${insight.type}" role="listitem">
            <i class="bi bi-${insight.icon} ms-2" aria-hidden="true"></i>
            ${insight.text}
        </article>
    `).join('');
}

function renderCharts(data) {
    const { report, cities } = data;
    
    // Destroy previous charts
    if (categoryChart) categoryChart.destroy();
    if (cityChart) cityChart.destroy();
    
    // Colors
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];
    
    // Category distribution chart
    const categoryTotals = {};
    report.forEach(item => {
        if (!categoryTotals[item.category]) categoryTotals[item.category] = 0;
        categoryTotals[item.category] += item.count;
    });
    
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx && sortedCategories.length > 0) {
        categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: sortedCategories.map(c => c[0]),
                datasets: [{
                    data: sortedCategories.map(c => c[1]),
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            font: { family: 'Cairo' }, 
                            boxWidth: 12,
                            color: '#cbd5e1'
                        }
                    }
                }
            }
        });
    }
    
    // City comparison chart
    const cityTotals = {};
    report.forEach(item => {
        if (!cityTotals[item.city]) cityTotals[item.city] = 0;
        cityTotals[item.city] += item.count;
    });
    
    const cityCtx = document.getElementById('cityChart');
    if (cityCtx && Object.keys(cityTotals).length > 0) {
        cityChart = new Chart(cityCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(cityTotals),
                datasets: [{
                    label: 'عدد السجلات',
                    data: Object.values(cityTotals),
                    backgroundColor: colors.slice(0, Object.keys(cityTotals).length),
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    }
                }
            }
        });
    }
}

// ============================================
// Export Function
// ============================================
function exportToCSV() {
    if (!analyticsData || analyticsData.report.length === 0) {
        announce('لا توجد بيانات للتصدير');
        return;
    }
    
    const { report, cities } = analyticsData;
    
    // Build CSV
    let csv = '\uFEFF'; // BOM for Arabic support
    
    // Header
    csv += 'الكلمة المفتاحية,الفئة';
    cities.forEach(city => {
        csv += `,${city} - العدد,${city} - النسبة`;
    });
    csv += '\n';
    
    // Data rows
    const grouped = {};
    report.forEach(item => {
        const key = `${item.keyword}|||${item.category}`;
        if (!grouped[key]) {
            grouped[key] = { keyword: item.keyword, category: item.category, cities: {} };
        }
        grouped[key].cities[item.city] = { count: item.count, percentage: item.percentage };
    });
    
    Object.values(grouped).forEach(item => {
        csv += `"${item.keyword}","${item.category}"`;
        cities.forEach(city => {
            const cityData = item.cities[city] || { count: 0, percentage: 0 };
            csv += `,${cityData.count},${cityData.percentage}%`;
        });
        csv += '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    
    announce('تم تصدير الملف بنجاح');
}

// ============================================
// Utility Functions
// ============================================
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
    overlay.setAttribute('aria-hidden', !show);
}

function formatNumber(num) {
    return new Intl.NumberFormat('ar-EG').format(num || 0);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getPercentageClass(percentage) {
    if (percentage >= 20) return 'percentage-high';
    if (percentage >= 10) return 'percentage-medium';
    return 'percentage-low';
}