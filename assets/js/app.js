// ============================================
// إعدادات API
// ============================================
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzbLYN6pSJqGD_pnJz9icsqGHoT3PEXHlKra4CHk4xxxb-Y9Y6QHwTBRZU0Sm1Z9IAq/exec',
    ITEMS_PER_PAGE: 25
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
    setupAccessibility();
});

// إعداد تحسينات إمكانية الوصول
function setupAccessibility() {
    // إضافة skip link dynamically
    const skipLink = document.createElement('a');
    skipLink.href = '#mainContent';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'تخطي إلى المحتوى الرئيسي';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // تحسين إدارة التركيز للـ modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('shown.bs.modal', function() {
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) firstFocusable.focus();
        });
    });
}

// ============================================
// دوال API
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
        showToast('حدث خطأ في الاتصال بالخادم', 'danger');
        throw error;
    }
}

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
        const [data, stats, categories] = await Promise.all([
            fetchAPI('getAll'),
            fetchAPI('getStats'),
            fetchAPI('getCategories')
        ]);
        
        allData = data;
        filteredData = [...allData];
        
        updateStats(stats);
        updateCategoryFilter(categories);
        renderTable();
        
    } catch (error) {
        console.error('Load Error:', error);
    } finally {
        showLoading(false);
    }
}

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
    
    const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map((item, index) => {
        const rowNum = startIndex + index + 1;
        const name = escapeHtml(item.Name || '-');
        const address = escapeHtml(item.Address || '-');
        const phone = escapeHtml(item.Phone || '-');
        const category = escapeHtml(item.Category || '-');
        const rating = item.Rating || '0';
        const reviews = formatNumber(item.Reviews || 0);
        const website = item.Website ? truncate(item.Website, 30) : '';
        
        return `
            <tr>
                <td><span class="badge bg-light text-light">${rowNum}</span></td>
                <td>
                    <span class="fw-bold text-light">${name}</span>
                    ${website ? `<br><small class="website-link"><i class="bi bi-globe ms-1" aria-hidden="true"></i><a href="${escapeHtml(item.Website)}" target="_blank" rel="noopener">${website}</a></small>` : ''}
                </td>
                <td>
                    <span class="d-flex align-items-center">
                        <i class="bi bi-geo-alt text-info ms-2" aria-hidden="true"></i>
                        <span class="text-light">${truncate(address, 40)}</span>
                    </span>
                </td>
                <td>
                    <a href="tel:${item.Phone}" class="phone-link" aria-label="اتصال بـ ${phone}">
                        <i class="bi bi-telephone ms-1" aria-hidden="true"></i>
                        ${phone}
                    </a>
                </td>
                <td><span class="category-badge">${category}</span></td>
                <td>
                    <span class="rating-badge" aria-label="التقييم ${rating} من 5">
                        <i class="bi bi-star-fill ms-1" aria-hidden="true"></i>
                        ${rating}
                    </span>
                </td>
                <td>
                    <span class="badge bg-light" aria-label="${reviews} مراجعة">
                        <i class="bi bi-chat-dots ms-1" aria-hidden="true"></i>
                        ${reviews}
                    </span>
                </td>
                <td>
                    <div class="d-flex gap-1" role="group" aria-label="إجراءات السجل">
                        <button class="btn-action btn-view" onclick="viewRecord(${item.rowIndex})" 
                                aria-label="عرض تفاصيل ${name}">
                            <i class="bi bi-eye" aria-hidden="true"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="editRecord(${item.rowIndex})" 
                                aria-label="تعديل ${name}">
                            <i class="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteRecord(${item.rowIndex})" 
                                aria-label="حذف ${name}">
                            <i class="bi bi-trash3" aria-hidden="true"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    renderPagination();
}

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
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;"
               aria-label="الصفحة السابقة" ${currentPage === 1 ? 'aria-disabled="true" tabindex="-1"' : ''}>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </a>
        </li>
    `;
    
    // أرقام الصفحات
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;" aria-label="الصفحة 1">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link" aria-hidden="true">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isCurrent = i === currentPage;
        html += `
            <li class="page-item ${isCurrent ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i}); return false;"
                   aria-label="الصفحة ${i}" ${isCurrent ? 'aria-current="page"' : ''}>${i}</a>
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link" aria-hidden="true">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;" aria-label="الصفحة ${totalPages}">${totalPages}</a></li>`;
    }
    
    // زر التالي
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;"
               aria-label="الصفحة التالية" ${currentPage === totalPages ? 'aria-disabled="true" tabindex="-1"' : ''}>
                <i class="bi bi-chevron-left" aria-hidden="true"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredData.length / CONFIG.ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    
    // إعادة التركيز للجدول لتحسين تجربة قارئ الشاشة
    document.getElementById('dataTable').focus();
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
    
    // إعلان النتائج لقارئات الشاشة
    announceResults(filteredData.length);
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
    
    showToast('تم إعادة تعيين الفلاتر', 'info');
}

// إعلان النتائج لقارئات الشاشة
function announceResults(count) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'visually-hidden';
    announcement.textContent = `تم العثور على ${count} نتيجة`;
    document.body.appendChild(announcement);
    
    setTimeout(() => announcement.remove(), 1000);
}

// ============================================
// عرض التفاصيل
// ============================================

function viewRecord(rowIndex) {
    const item = allData.find(r => r.rowIndex === rowIndex);
    if (!item) return;
    
    const modalBody = document.getElementById('viewModalBody');
    
    modalBody.innerHTML = `
        <article>
            <header class="mb-4">
                <h3 class="modal-title-name mb-3">
                    <i class="bi bi-building ms-2" aria-hidden="true"></i>
                    ${escapeHtml(item.Name || '-')}
                </h3>
            </header>
            
            <div class="row">
                <div class="col-md-6 mb-4">
                    <dl>
                        <dt><i class="bi bi-geo-alt ms-2" aria-hidden="true"></i>العنوان</dt>
                        <dd>${escapeHtml(item.Address || '-')}</dd>
                        
                        <dt><i class="bi bi-telephone ms-2" aria-hidden="true"></i>الهاتف</dt>
                        <dd><a href="tel:${item.Phone}" class="modal-link">${escapeHtml(item.Phone || '-')}</a></dd>
                        
                        <dt><i class="bi bi-globe ms-2" aria-hidden="true"></i>الموقع</dt>
                        <dd>${item.Website ? `<a href="${item.Website}" target="_blank" rel="noopener noreferrer" class="modal-link">${escapeHtml(item.Website)}</a>` : '-'}</dd>
                        
                        <dt><i class="bi bi-tag ms-2" aria-hidden="true"></i>الفئة</dt>
                        <dd><span class="category-badge">${escapeHtml(item.Category || '-')}</span></dd>
                    </dl>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="rating-box">
                        <div class="rating-stars mb-2" aria-hidden="true">
                            ${generateStars(item.Rating)}
                        </div>
                        <p class="rating-value">${item.Rating || '0'}</p>
                        <p class="rating-count">${formatNumber(item.Reviews || 0)} مراجعة</p>
                    </div>
                </div>
            </div>
            
            <hr class="modal-divider">
            
            <section aria-labelledby="reviewsHeading">
                <h3 id="reviewsHeading" class="section-title">
                    <i class="bi bi-chat-quote ms-2" aria-hidden="true"></i>المراجعات
                </h3>
                
                ${renderReviewItem(item, 1)}
                ${renderReviewItem(item, 2)}
                ${renderReviewItem(item, 3)}
                
                ${!item['Review 1 Text'] && !item['Review 2 Text'] && !item['Review 3 Text'] ? 
                    '<p class="no-reviews">لا توجد مراجعات</p>' : ''}
            </section>
            
            ${item['keywords Research'] ? `
                <hr class="modal-divider">
                <section aria-labelledby="keywordsHeading">
                    <h3 id="keywordsHeading" class="section-title">
                        <i class="bi bi-key ms-2" aria-hidden="true"></i>الكلمات المفتاحية
                    </h3>
                    <p class="keywords-box">${escapeHtml(item['keywords Research'])}</p>
                </section>
            ` : ''}
        </article>
    `;
    
    new bootstrap.Modal(document.getElementById('viewModal')).show();
}

function renderReviewItem(item, num) {
    const text = item[`Review ${num} Text`];
    if (!text) return '';
    
    const score = item[`Review ${num} Score`];
    const date = item[`Review ${num} Date`];
    
    return `
        <article class="review-card">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="review-score ${getScoreClass(score)}" aria-label="التقييم ${score || '-'} من 5">
                    <i class="bi bi-star-fill ms-1" aria-hidden="true"></i>${score || '-'}
                </span>
                <time class="text-muted" datetime="${date}">${formatDate(date)}</time>
            </div>
            <p class="mb-0">${escapeHtml(text)}</p>
        </article>
    `;
}

// ============================================
// إضافة وتعديل
// ============================================

function editRecord(rowIndex) {
    const item = allData.find(r => r.rowIndex === rowIndex);
    if (!item) return;
    
    document.getElementById('addModalTitle').innerHTML = '<i class="bi bi-pencil-fill ms-2" aria-hidden="true"></i>تعديل السجل';
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
    document.getElementById('addModalTitle').innerHTML = '<i class="bi bi-plus-circle-fill ms-2" aria-hidden="true"></i>إضافة سجل جديد';
}

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
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
    overlay.setAttribute('aria-hidden', !show);
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
    
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = 'toast show';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="toast-header bg-${type} text-white">
            <i class="bi bi-${icons[type]} ms-2" aria-hidden="true"></i>
            <strong class="me-auto">إشعار</strong>
            <button type="button" class="btn-close btn-close-white order-first" data-bs-dismiss="toast" aria-label="إغلاق"></button>
        </div>
        <div class="toast-body">${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        const toastEl = document.getElementById(id);
        if (toastEl) toastEl.remove();
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