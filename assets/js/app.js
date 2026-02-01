// ============================================
// إعدادات API
// ============================================
const CONFIG = {
    // ضع رابط Web App الخاص بك هنا بعد النشر
    API_URL: 'https://script.google.com/macros/s/AKfycbzbLYN6pSJqGD_pnJz9icsqGHoT3PEXHlKra4CHk4xxxb-Y9Y6QHwTBRZU0Sm1Z9IAq/exec',
    ITEMS_PER_PAGE: 10
};

// ============================================
// متغيرات عامة
// ============================================
let allData = [];
let filteredData = [];
let currentPage = 1;

// ============================================
// تهيئة التطبيق
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

// ============================================
// دوال API
// ============================================

// جلب البيانات من Google Sheets
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
        showToast('حدث خطأ في الاتصال بالخادم', 'danger');
        throw error;
    }
}

// إرسال بيانات POST
async function postAPI(data) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        showToast('حدث خطأ في حفظ البيانات', 'danger');
        throw error;
    }
}

// ============================================
// تحميل البيانات
// ============================================

async function loadData() {
    showLoading(true);
    
    try {
        // جلب البيانات والإحصائيات
        const [data, stats, categories] = await Promise.all([
            fetchAPI('getAll'),
            fetchAPI('getStats'),
            fetchAPI('getCategories')
        ]);
        
        allData = data;
        filteredData = [...allData];
        
        // تحديث الإحصائيات
        updateStats(stats);
        
        // تحديث قائمة الفئات
        updateCategoryFilter(categories);
        
        // عرض البيانات
        renderTable();
        
    } catch (error) {
        console.error('Load Error:', error);
    } finally {
        showLoading(false);
    }
}

// تحديث البيانات
async function refreshData() {
    await loadData();
    showToast('تم تحديث البيانات بنجاح', 'success');
}

// ============================================
// عرض البيانات
// ============================================

function renderTable() {
    const tbody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('d-none');
        document.getElementById('paginationContainer').classList.add('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    document.getElementById('paginationContainer').classList.remove('d-none');
    
    // حساب الصفحات
    const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map((item, index) => `
        <tr>
            <td><span class="badge bg-light text-dark">${startIndex + index + 1}</span></td>
            <td>
                <div class="fw-bold">${escapeHtml(item.Name || '-')}</div>
                ${item.Website ? `<small class="text-muted"><i class="bi bi-globe me-1"></i>${truncate(item.Website, 30)}</small>` : ''}
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <i class="bi bi-geo-alt text-primary me-2"></i>
                    <span>${truncate(escapeHtml(item.Address || '-'), 40)}</span>
                </div>
            </td>
            <td>
                <a href="tel:${item.Phone}" class="text-decoration-none">
                    <i class="bi bi-telephone text-success me-1"></i>
                    ${escapeHtml(item.Phone || '-')}
                </a>
            </td>
            <td><span class="category-badge">${escapeHtml(item.Category || '-')}</span></td>
            <td>
                <span class="rating-badge">
                    <i class="bi bi-star-fill me-1"></i>
                    ${item.Rating || '0'}
                </span>
            </td>
            <td>
                <span class="badge bg-light text-dark">
                    <i class="bi bi-chat-dots me-1"></i>
                    ${formatNumber(item.Reviews || 0)}
                </span>
            </td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn-action btn-view" onclick="viewRecord(${item.rowIndex})" title="عرض">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editRecord(${item.rowIndex})" title="تعديل">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteRecord(${item.rowIndex})" title="حذف">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    renderPagination();
}

// عرض الـ Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / CONFIG.ITEMS_PER_PAGE);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // زر السابق
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    // أرقام الصفحات
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    // زر التالي
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

// الانتقال لصفحة
function goToPage(page) {
    const totalPages = Math.ceil(filteredData.length / CONFIG.ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// البحث والفلترة
// ============================================

function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    
    filteredData = allData.filter(item => {
        const matchesSearch = !query || 
            (item.Name && item.Name.toLowerCase().includes(query)) ||
            (item.Address && item.Address.toLowerCase().includes(query)) ||
            (item.Phone && item.Phone.toLowerCase().includes(query)) ||
            (item.Category && item.Category.toLowerCase().includes(query));
        
        const matchesCategory = !category || item.Category === category;
        
        return matchesSearch && matchesCategory;
    });
    
    currentPage = 1;
    renderTable();
}

function handleCategoryFilter() {
    handleSearch();
}

function handleSort() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredData.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.Name || '').localeCompare(b.Name || '', 'ar');
            case 'rating':
                return (parseFloat(b.Rating) || 0) - (parseFloat(a.Rating) || 0);
            case 'reviews':
                return (parseInt(b.Reviews) || 0) - (parseInt(a.Reviews) || 0);
            default:
                return 0;
        }
    });
    
    renderTable();
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('sortBy').value = 'name';
    
    filteredData = [...allData];
    currentPage = 1;
    renderTable();
}

// ============================================
// عرض التفاصيل
// ============================================

function viewRecord(rowIndex) {
    const item = allData.find(r => r.rowIndex === rowIndex);
    if (!item) return;
    
    const modalBody = document.getElementById('viewModalBody');
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6 mb-4">
                <h4 class="text-primary mb-3">
                    <i class="bi bi-building me-2"></i>
                    ${escapeHtml(item.Name || '-')}
                </h4>
                <p class="mb-2">
                    <i class="bi bi-geo-alt text-muted me-2"></i>
                    <strong>العنوان:</strong> ${escapeHtml(item.Address || '-')}
                </p>
                <p class="mb-2">
                    <i class="bi bi-telephone text-muted me-2"></i>
                    <strong>الهاتف:</strong> 
                    <a href="tel:${item.Phone}">${escapeHtml(item.Phone || '-')}</a>
                </p>
                <p class="mb-2">
                    <i class="bi bi-globe text-muted me-2"></i>
                    <strong>الموقع:</strong> 
                    ${item.Website ? `<a href="${item.Website}" target="_blank">${escapeHtml(item.Website)}</a>` : '-'}
                </p>
                <p class="mb-2">
                    <i class="bi bi-tag text-muted me-2"></i>
                    <strong>الفئة:</strong> 
                    <span class="category-badge">${escapeHtml(item.Category || '-')}</span>
                </p>
            </div>
            <div class="col-md-6 mb-4">
                <div class="bg-light rounded-3 p-4 text-center">
                    <div class="rating-stars mb-2">
                        ${generateStars(item.Rating)}
                    </div>
                    <h2 class="text-primary mb-1">${item.Rating || '0'}</h2>
                    <p class="text-muted mb-0">${formatNumber(item.Reviews || 0)} مراجعة</p>
                </div>
            </div>
        </div>
        
        <hr>
        
        <h5 class="mb-3"><i class="bi bi-chat-quote me-2"></i>المراجعات</h5>
        
        ${item['Review 1 Text'] ? `
            <div class="review-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="review-score ${getScoreClass(item['Review 1 Score'])}">
                        <i class="bi bi-star-fill me-1"></i>${item['Review 1 Score'] || '-'}
                    </span>
                    <small class="text-muted">${formatDate(item['Review 1 Date'])}</small>
                </div>
                <p class="mb-0">${escapeHtml(item['Review 1 Text'])}</p>
            </div>
        ` : ''}
        
        ${item['Review 2 Text'] ? `
            <div class="review-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="review-score ${getScoreClass(item['Review 2 Score'])}">
                        <i class="bi bi-star-fill me-1"></i>${item['Review 2 Score'] || '-'}
                    </span>
                    <small class="text-muted">${formatDate(item['Review 2 Date'])}</small>
                </div>
                <p class="mb-0">${escapeHtml(item['Review 2 Text'])}</p>
            </div>
        ` : ''}
        
        ${item['Review 3 Text'] ? `
            <div class="review-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="review-score ${getScoreClass(item['Review 3 Score'])}">
                        <i class="bi bi-star-fill me-1"></i>${item['Review 3 Score'] || '-'}
                    </span>
                    <small class="text-muted">${formatDate(item['Review 3 Date'])}</small>
                </div>
                <p class="mb-0">${escapeHtml(item['Review 3 Text'])}</p>
            </div>
        ` : ''}
        
        ${!item['Review 1 Text'] && !item['Review 2 Text'] && !item['Review 3 Text'] ? 
            '<p class="text-muted text-center py-3">لا توجد مراجعات</p>' : ''}
        
        ${item['keywords Research'] ? `
            <hr>
            <h5 class="mb-3"><i class="bi bi-key me-2"></i>الكلمات المفتاحية</h5>
            <p class="bg-light rounded p-3">${escapeHtml(item['keywords Research'])}</p>
        ` : ''}
    `;
    
    new bootstrap.Modal(document.getElementById('viewModal')).show();
}

// ============================================
// إضافة وتعديل
// ============================================

function editRecord(rowIndex) {
    const item = allData.find(r => r.rowIndex === rowIndex);
    if (!item) return;
    
    document.getElementById('addModalTitle').innerHTML = '<i class="bi bi-pencil-fill me-2"></i>تعديل السجل';
    document.getElementById('editRowIndex').value = rowIndex;
    
    // ملء الحقول
    document.getElementById('formName').value = item.Name || '';
    document.getElementById('formCategory').value = item.Category || '';
    document.getElementById('formAddress').value = item.Address || '';
    document.getElementById('formPhone').value = item.Phone || '';
    document.getElementById('formWebsite').value = item.Website || '';
    document.getElementById('formRating').value = item.Rating || '';
    document.getElementById('formReviews').value = item.Reviews || '';
    document.getElementById('formKeywords').value = item['keywords Research'] || '';
    
    document.getElementById('formReview1Text').value = item['Review 1 Text'] || '';
    document.getElementById('formReview1Score').value = item['Review 1 Score'] || '';
    document.getElementById('formReview1Date').value = formatDateForInput(item['Review 1 Date']);
    
    document.getElementById('formReview2Text').value = item['Review 2 Text'] || '';
    document.getElementById('formReview2Score').value = item['Review 2 Score'] || '';
    document.getElementById('formReview2Date').value = formatDateForInput(item['Review 2 Date']);
    
    document.getElementById('formReview3Text').value = item['Review 3 Text'] || '';
    document.getElementById('formReview3Score').value = item['Review 3 Score'] || '';
    document.getElementById('formReview3Date').value = formatDateForInput(item['Review 3 Date']);
    
    new bootstrap.Modal(document.getElementById('addModal')).show();
}

async function saveRecord() {
    const form = document.getElementById('recordForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const rowIndex = document.getElementById('editRowIndex').value;
    const record = {
        'Name': document.getElementById('formName').value,
        'Category': document.getElementById('formCategory').value,
        'Address': document.getElementById('formAddress').value,
        'Phone': document.getElementById('formPhone').value,
        'Website': document.getElementById('formWebsite').value,
        'Rating': document.getElementById('formRating').value,
        'Reviews': document.getElementById('formReviews').value,
        'keywords Research': document.getElementById('formKeywords').value,
        'Review 1 Text': document.getElementById('formReview1Text').value,
        'Review 1 Score': document.getElementById('formReview1Score').value,
        'Review 1 Date': document.getElementById('formReview1Date').value,
        'Review 2 Text': document.getElementById('formReview2Text').value,
        'Review 2 Score': document.getElementById('formReview2Score').value,
        'Review 2 Date': document.getElementById('formReview2Date').value,
        'Review 3 Text': document.getElementById('formReview3Text').value,
        'Review 3 Score': document.getElementById('formReview3Score').value,
        'Review 3 Date': document.getElementById('formReview3Date').value
    };
    
    showLoading(true);
    
    try {
        if (rowIndex) {
            await postAPI({ action: 'update', rowIndex: parseInt(rowIndex), record });
            showToast('تم تحديث السجل بنجاح', 'success');
        } else {
            await postAPI({ action: 'add', record });
            showToast('تم إضافة السجل بنجاح', 'success');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
        resetForm();
        await loadData();
        
    } catch (error) {
        console.error('Save Error:', error);
    } finally {
        showLoading(false);
    }
}

function resetForm() {
    document.getElementById('recordForm').reset();
    document.getElementById('editRowIndex').value = '';
    document.getElementById('addModalTitle').innerHTML = '<i class="bi bi-plus-circle-fill me-2"></i>إضافة سجل جديد';
}

// Reset form when modal closes
document.getElementById('addModal').addEventListener('hidden.bs.modal', resetForm);

// ============================================
// الحذف
// ============================================

function deleteRecord(rowIndex) {
    document.getElementById('deleteRowIndex').value = rowIndex;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function confirmDelete() {
    const rowIndex = document.getElementById('deleteRowIndex').value;
    
    showLoading(true);
    
    try {
        await postAPI({ action: 'delete', rowIndex: parseInt(rowIndex) });
        
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        showToast('تم حذف السجل بنجاح', 'success');
        await loadData();
        
    } catch (error) {
        console.error('Delete Error:', error);
    } finally {
        showLoading(false);
    }
}

// ============================================
// دوال مساعدة
// ============================================

function updateStats(stats) {
    document.getElementById('totalRecords').textContent = formatNumber(stats.totalRecords);
    document.getElementById('totalCategories').textContent = formatNumber(stats.totalCategories);
    document.getElementById('avgRating').textContent = stats.averageRating;
    document.getElementById('totalReviews').textContent = formatNumber(stats.totalReviews);
}

function updateCategoryFilter(categories) {
    const select = document.getElementById('categoryFilter');
    select.innerHTML = '<option value="">جميع الفئات</option>';
    
    categories.forEach(cat => {
        select.innerHTML += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
    });
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const id = 'toast-' + Date.now();
    
    const icons = {
        success: 'check-circle-fill',
        danger: 'exclamation-triangle-fill',
        warning: 'exclamation-circle-fill',
        info: 'info-circle-fill'
    };
    
    const html = `
        <div id="${id}" class="toast show" role="alert">
            <div class="toast-header bg-${type} text-white">
                <i class="bi bi-${icons[type]} me-2"></i>
                <strong class="me-auto">إشعار</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
    
    setTimeout(() => {
        const toast = document.getElementById(id);
        if (toast) toast.remove();
    }, 5000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
}

function formatNumber(num) {
    return new Intl.NumberFormat('ar-EG').format(num || 0);
}

function formatDate(date) {
    if (!date) return '-';
    try {
        return new Date(date).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return date;
    }
}

function formatDateForInput(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    } catch {
        return '';
    }
}

function generateStars(rating) {
    const r = parseFloat(rating) || 0;
    const fullStars = Math.floor(r);
    const hasHalf = r % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    
    return '<i class="bi bi-star-fill"></i>'.repeat(fullStars) +
           (hasHalf ? '<i class="bi bi-star-half"></i>' : '') +
           '<i class="bi bi-star"></i>'.repeat(emptyStars);
}

function getScoreClass(score) {
    const s = parseFloat(score) || 0;
    if (s >= 4) return 'score-positive';
    if (s >= 2.5) return 'score-neutral';
    return 'score-negative';
}

