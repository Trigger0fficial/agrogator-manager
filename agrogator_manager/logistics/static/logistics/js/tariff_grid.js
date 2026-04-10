// Класс для управления тарификационной сеткой
class TariffGridPage {
    constructor() {
        this.tariffData = [];
        this.originalData = [];
        this.isLoading = false;
        this.editMode = false;
        /** При применении из быстрого редактирования — массив { id, coefficient } для PATCH */
        this.pendingPatch = null;
        this.commission = null; // { id, value }

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    // Привязка событий
    bindEvents() {
        const quickEditBtn = document.getElementById('quickEditBtn');
        const editBtn = document.getElementById('editBtn');
        const cancelBtn = document.getElementById('tariffConfirmCancelBtn');
        const submitBtn = document.getElementById('tariffConfirmSubmitBtn');
        const modalOverlay = document.getElementById('tariffConfirmModal');

        if (quickEditBtn) {
            quickEditBtn.addEventListener('click', () => this.openQuickEditModal());
        }

        const quickEditOverlay = document.getElementById('tariffQuickEditModal');
        if (quickEditOverlay) {
            quickEditOverlay.addEventListener('click', (e) => {
                if (e.target === quickEditOverlay) this.closeQuickEditModal();
            });
        }

        document.getElementById('quickEditCancelBtn')?.addEventListener('click', () => this.closeQuickEditModal());
        document.getElementById('quickEditApplyBtn')?.addEventListener('click', () => this.onQuickEditApply());
        document.getElementById('quickEditPlusBtn')?.addEventListener('click', () => this.quickEditGlobalPercent(1));
        document.getElementById('quickEditMinusBtn')?.addEventListener('click', () => this.quickEditGlobalPercent(-1));

        if (editBtn) {
            editBtn.addEventListener('click', () => this.onEditSaveClick());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeConfirmModal());
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.onConfirmSubmit());
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) this.closeConfirmModal();
            });
        }

        // Commission modal
        const commissionEditBtn = document.getElementById('commissionEditBtn');
        const commissionModal = document.getElementById('commissionModal');
        const commissionClose = document.getElementById('commissionModalClose');
        const commissionCancel = document.getElementById('commissionModalCancelBtn');
        const commissionSave = document.getElementById('commissionModalSaveBtn');

        if (commissionEditBtn) commissionEditBtn.addEventListener('click', () => this.openCommissionModal());
        if (commissionClose) commissionClose.addEventListener('click', () => this.closeCommissionModal());
        if (commissionCancel) commissionCancel.addEventListener('click', () => this.closeCommissionModal());
        if (commissionModal) {
            commissionModal.addEventListener('click', (e) => {
                if (e.target === commissionModal) this.closeCommissionModal();
            });
        }
        if (commissionSave) commissionSave.addEventListener('click', () => this.saveCommission());
    }

    // Клик по кнопке «Редактировать» / «Сохранить»
    onEditSaveClick() {
        if (this.editMode) {
            const changes = this.getChanges();
            if (changes.length === 0) {
                this.exitEditMode();
                return;
            }
            this.showConfirmModal(changes);
        } else {
            this.enterEditMode();
        }
    }

    // Вход в режим редактирования
    enterEditMode() {
        if (!this.tariffData.length) return;
        this.editMode = true;
        this.originalData = this.tariffData.map(item => ({
            ...item,
            coefficient: item.coefficient != null ? String(item.coefficient) : ''
        }));
        this.updateEditButton(false); // показываем «Сохранить»
        this.renderTable();
    }

    // Выход из режима редактирования (без сохранения)
    exitEditMode() {
        this.editMode = false;
        this.originalData = [];
        this.updateEditButton(true); // показываем «Редактировать»
        this.renderTable();
    }

    // Обновление вида кнопки (isEdit = показывать «Редактировать»)
    updateEditButton(isEdit) {
        const editBtn = document.getElementById('editBtn');
        if (!editBtn) return;
        const icon = editBtn.querySelector('i');
        const text = editBtn.querySelector('.btn-text');
        if (isEdit) {
            editBtn.classList.remove('btn-save');
            if (icon) icon.className = 'fas fa-cog';
            if (text) text.textContent = 'Редактировать';
        } else {
            editBtn.classList.add('btn-save');
            if (icon) icon.className = 'fas fa-save';
            if (text) text.textContent = 'Сохранить';
        }
    }

    // Сбор изменённых коэффициентов из инпутов
    getChanges() {
        const inputs = document.querySelectorAll('.coefficient-input');
        const changes = [];
        inputs.forEach(input => {
            const id = parseInt(input.dataset.id, 10);
            const newVal = input.value.trim();
            const newNum = newVal === '' ? NaN : parseFloat(newVal.replace(',', '.'));
            const orig = this.originalData.find(item => item.id === id);
            if (!orig) return;
            const oldNum = parseFloat(String(orig.coefficient).replace(',', '.'));
            if (isNaN(newNum) || newNum === oldNum) return;
            changes.push({
                id,
                scaleFrom: orig.scaleFrom,
                scaleTo: orig.scaleTo,
                oldCoefficient: orig.coefficient,
                newCoefficient: newNum
            });
        });
        return changes;
    }

    // Показать модалку подтверждения
    showConfirmModal(changes) {
        const listEl = document.getElementById('tariffConfirmList');
        const modal = document.getElementById('tariffConfirmModal');
        if (!listEl || !modal) return;

        listEl.innerHTML = changes.map(ch => `
            <li>
                <span class="range">${ch.scaleFrom} – ${ch.scaleTo} км</span>
                <span>
                    <span class="old-value">${ch.oldCoefficient}</span>
                    <span> → </span>
                    <span class="new-value">${ch.newCoefficient}</span>
                </span>
            </li>
        `).join('');

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    }

    // Закрыть модалку подтверждения (из таблицы — выход из режима редактирования)
    closeConfirmModal() {
        const modal = document.getElementById('tariffConfirmModal');
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
        this.pendingPatch = null;
        if (this.editMode) this.exitEditMode();
    }

    // Подтвердить сохранение (PATCH) — из таблицы или из быстрого редактирования
    async onConfirmSubmit() {
        let payload;
        if (this.pendingPatch && this.pendingPatch.length > 0) {
            payload = this.pendingPatch;
        } else {
            const changes = this.getChanges();
            if (!changes.length) {
                this.closeConfirmModal();
                return;
            }
            payload = changes.map(ch => ({ id: ch.id, coefficient: ch.newCoefficient }));
        }

        const submitBtn = document.getElementById('tariffConfirmSubmitBtn');
        this.setButtonLoading(submitBtn, true);

        const body = { updateTransportCoefficientOneDto: payload };

        try {
            const result = await this.makeAuthenticatedRequest('/transport-coefficients', {
                method: 'PATCH',
                body: JSON.stringify(body)
            });
            this.setButtonLoading(submitBtn, false);

            if (result === null) {
                alert('Не удалось сохранить изменения. Проверьте авторизацию.');
                return;
            }

            document.getElementById('tariffConfirmModal').classList.remove('is-open');
            document.getElementById('tariffConfirmModal').setAttribute('aria-hidden', 'true');
            this.pendingPatch = null;
            this.editMode = false;
            this.originalData = [];
            this.updateEditButton(true);
            this.closeQuickEditModal();
            await this.loadData();
        } catch (e) {
            this.setButtonLoading(submitBtn, false);
            console.error(e);
            alert('Ошибка при сохранении.');
        }
    }

    setButtonLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn.classList.add('is-loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('is-loading');
            btn.disabled = false;
        }
    }

    // ——— Быстрое редактирование (модалка с процентами) ———

    openQuickEditModal() {
        if (!this.tariffData.length) return;
        const tbody = document.getElementById('tariffQuickEditTableBody');
        const overlay = document.getElementById('tariffQuickEditModal');
        if (!tbody || !overlay) return;

        tbody.innerHTML = this.tariffData.map(item => {
            const coef = item.coefficient != null ? String(item.coefficient) : '';
            return `
                <tr class="quick-edit-row" data-id="${item.id}" data-active="1">
                    <td class="col-from">${this.escapeHtml(String(item.scaleFrom))} км</td>
                    <td class="col-to">${this.escapeHtml(String(item.scaleTo))} км</td>
                    <td class="col-coef">${this.escapeHtml(coef)}</td>
                    <td class="col-pct">
                        <input type="text" class="quick-edit-pct-input" data-id="${item.id}" value="0" inputmode="decimal" />
                    </td>
                    <td class="col-active">
                        <input type="checkbox" class="quick-edit-row-active-check" data-id="${item.id}" checked />
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.quick-edit-row-active-check').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const row = e.target.closest('tr');
                if (!row) return;
                const active = e.target.checked;
                row.dataset.active = active ? '1' : '0';
                row.classList.toggle('quick-edit-row-inactive', !active);
                const input = row.querySelector('.quick-edit-pct-input');
                if (input) input.disabled = !active;
            });
        });

        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeQuickEditModal() {
        const overlay = document.getElementById('tariffQuickEditModal');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    /** Добавить/вычесть 1% у всех активных строк */
    quickEditGlobalPercent(delta) {
        document.querySelectorAll('.tariff-quick-edit-table tbody tr[data-active="1"] .quick-edit-pct-input').forEach(input => {
            const val = parseFloat(String(input.value).replace(',', '.')) || 0;
            const next = Math.round((val + delta) * 100) / 100;
            input.value = next;
        });
    }

    /** Применить быстрые изменения: посчитать новые коэффициенты и открыть модалку подтверждения */
    onQuickEditApply() {
        const rows = document.querySelectorAll('.tariff-quick-edit-table tbody tr[data-active="1"]');
        const changes = [];
        rows.forEach(tr => {
            const id = parseInt(tr.dataset.id, 10);
            const coefCell = tr.querySelector('.col-coef');
            const pctInput = tr.querySelector('.quick-edit-pct-input');
            if (!coefCell || !pctInput) return;
            const oldCoef = parseFloat(String(coefCell.textContent).replace(',', '.').trim());
            const pct = parseFloat(String(pctInput.value).replace(',', '.')) || 0;
            if (pct === 0 || isNaN(oldCoef)) return;
            const newCoef = Math.round(oldCoef * (1 + pct / 100) * 100) / 100;
            const item = this.tariffData.find(r => r.id === id);
            if (!item) return;
            changes.push({
                id,
                scaleFrom: item.scaleFrom,
                scaleTo: item.scaleTo,
                oldCoefficient: oldCoef,
                newCoefficient: newCoef
            });
        });

        if (changes.length === 0) {
            alert('Нет изменений для применения. Укажите процент и убедитесь, что строка активна.');
            return;
        }

        this.pendingPatch = changes.map(ch => ({ id: ch.id, coefficient: ch.newCoefficient }));
        this.showConfirmModal(changes);
    }

    // Загрузка данных
    async loadData() {
        try {
            this.setLoadingState(true);

            const data = await this.loadTariffData();
            if (!data) {
                throw new Error('Не удалось загрузить данные тарификационной сетки');
            }

            this.tariffData = data;
            this.renderData();
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            this.showError();
        } finally {
            this.setLoadingState(false);
        }
    }

    // Загрузка данных тарификационной сетки (GET transport-coefficients)
    async loadTariffData() {
        const data = await this.makeAuthenticatedRequest('/moderators-module/get-transport-coefficients-and-commission');
        if (data == null) {
            throw new Error('Не удалось загрузить данные тарификационной сетки');
        }
        // ожидаем { coefficient: [], commission: { id, value } }
        const list = data && Array.isArray(data.coefficient) ? data.coefficient : [];
        this.commission = data && data.commission ? data.commission : null;
        this.renderCommission();
        return list;
    }

    async makeAuthenticatedRequest(url, options = {}) {
        try {
            const headers = await this.getAuthHeaders();
            if (!headers) return null;
            const fullUrl = `${API_CONFIG.BASE_URL}${url}`;
            const config = {
                method: options.method || 'GET',
                ...options,
                headers: { ...headers, ...options.headers }
            };
            if (!options.body && config.method !== 'GET') {
                // body уже в options
            }
            if (config.body && typeof config.body === 'string' && headers['Content-Type']) {
                // Content-Type уже в headers
            }
            const response = await fetch(fullUrl, {
                ...config,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (response.status === 401 || response.status === 403) {
                if (typeof logout === 'function') logout();
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const contentType = response.headers.get('Content-Type');
            const text = await response.text();
            if (contentType && contentType.includes('application/json') && text) {
                try {
                    return JSON.parse(text);
                } catch (_) {
                    return text;
                }
            }
            return text || null;
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            return null;
        }
    }

    async getAuthHeaders() {
        if (typeof getAuthTokens !== 'function') return null;
        const authResult = await getAuthTokens();
        if (authResult.status === 403 || authResult.status === 409) {
            if (typeof logout === 'function') logout();
            return null;
        }
        if (!authResult.data || !authResult.data.accessToken) return null;
        return {
            'Authorization': `Bearer ${authResult.data.accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    renderData() {
        if (!this.tariffData || this.tariffData.length === 0) {
            this.showEmptyState();
            return;
        }
        this.renderTable();
        this.updateRecordsCount();
    }

    renderCommission() {
        const valEl = document.getElementById('commissionValueText');
        if (!valEl) return;
        const v = this.commission && this.commission.value != null ? String(this.commission.value) : '';
        valEl.textContent = v && v.trim() ? v : '—';
    }

    openCommissionModal() {
        const modal = document.getElementById('commissionModal');
        if (!modal) return;
        const input = document.getElementById('commissionValueInput');
        if (input) input.value = this.commission && this.commission.value != null ? String(this.commission.value) : '';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    }

    closeCommissionModal() {
        const modal = document.getElementById('commissionModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }

    sanitizeDecimalInputString(s) {
        const normalized = String(s || '').replace(/,/g, '.');
        let out = '';
        let dotSeen = false;
        for (let i = 0; i < normalized.length; i++) {
            const c = normalized.charAt(i);
            if (c >= '0' && c <= '9') out += c;
            else if (c === '.' && !dotSeen) { dotSeen = true; out += '.'; }
        }
        return out;
    }

    async saveCommission() {
        const input = document.getElementById('commissionValueInput');
        const btn = document.getElementById('commissionModalSaveBtn');
        const raw = input ? input.value : '';
        const cleaned = this.sanitizeDecimalInputString(raw);
        const n = cleaned ? parseFloat(cleaned) : NaN;
        if (!cleaned || isNaN(n)) {
            alert('Введите числовое значение маржинальности.');
            return;
        }

        this.setButtonLoading(btn, true);
        try {
            const url = '/moderators-module/change-transport-commission?value=' + encodeURIComponent(String(n));
            const result = await this.makeAuthenticatedRequest(url, { method: 'PATCH' });
            this.setButtonLoading(btn, false);
            if (result === null) {
                alert('Не удалось сохранить маржинальность. Проверьте авторизацию.');
                return;
            }
            // Перезагружаем данные, чтобы гарантированно получить актуальное значение
            await this.loadData();
            this.closeCommissionModal();
        } catch (e) {
            this.setButtonLoading(btn, false);
            console.error(e);
            alert('Ошибка при сохранении маржинальности.');
        }
    }

    renderTable() {
        const tableBody = document.getElementById('tariffTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        this.tariffData.forEach((item, index) => {
            const row = this.createTableRow(item, index);
            tableBody.appendChild(row);
        });
    }

    createTableRow(item, index) {
        const row = document.createElement('tr');
        row.className = 'tariff-row';
        const coef = item.coefficient != null ? String(item.coefficient) : '';

        if (this.editMode) {
            row.innerHTML = `
                <td class="col-from">${item.scaleFrom} км</td>
                <td class="col-to">${item.scaleTo} км</td>
                <td class="col-coefficient">
                    <input type="text" class="coefficient-input" data-id="${item.id}" value="${this.escapeHtml(coef)}" inputmode="decimal" />
                </td>
            `;
        } else {
            row.innerHTML = `
                <td class="col-from">${item.scaleFrom} км</td>
                <td class="col-to">${item.scaleTo} км</td>
                <td class="col-coefficient">${this.escapeHtml(coef)}</td>
            `;
        }
        return row;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    updateRecordsCount() {
        const recordsCount = document.getElementById('recordsCount');
        if (recordsCount) {
            const count = this.tariffData.length;
            recordsCount.textContent = `${count} ${this.getRecordWord(count)}`;
        }
    }

    getRecordWord(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'записей';
        if (lastDigit === 1) return 'запись';
        if (lastDigit >= 2 && lastDigit <= 4) return 'записи';
        return 'записей';
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const loadingRow = document.querySelector('.loading-row');
        const emptyState = document.getElementById('emptyState');
        const tableBody = document.getElementById('tariffTableBody');

        if (loading) {
            if (tableBody && !loadingRow) {
                tableBody.innerHTML = `
                    <tr class="loading-row">
                        <td colspan="3" class="loading-cell">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>Загрузка данных...</span>
                            </div>
                        </td>
                    </tr>
                `;
            }
            if (emptyState) emptyState.style.display = 'none';
        } else {
            if (loadingRow) loadingRow.remove();
        }
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.querySelector('.table-container');
        const tableBody = document.getElementById('tariffTableBody');
        if (emptyState) emptyState.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
        if (tableBody) tableBody.innerHTML = '';
        const recordsCount = document.getElementById('recordsCount');
        if (recordsCount) recordsCount.textContent = '0 записей';
    }

    showError() {
        const tableBody = document.getElementById('tariffTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = `
            <tr class="error-row">
                <td colspan="3" class="error-cell">
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Ошибка при загрузке данных. Попробуйте обновить страницу.</span>
                    </div>
                </td>
            </tr>
        `;
        const recordsCount = document.getElementById('recordsCount');
        if (recordsCount) recordsCount.textContent = 'Ошибка загрузки';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TariffGridPage();
});
