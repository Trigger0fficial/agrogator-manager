document.addEventListener('DOMContentLoaded', () => {
    LotDetailPage.init();
});

const LotDetailPage = {
    lotId: null,
    lot: null,
    isLoading: false,
    partyView: 'farmer', // farmer | exporter

    init() {
        this.lotId = this.getLotIdFromTemplate();
        this.bindEvents();
        if (!this.lotId) {
            this.setSubtitle('Не указан ID лота.');
            return;
        }
        this.loadLot();
    },

    getLotIdFromTemplate() {
        const el = document.getElementById('lot_id');
        const v = el ? String(el.textContent || '').trim() : '';
        return v || null;
    },

    bindEvents() {
        document.getElementById('lotInfoModalClose')?.addEventListener('click', () => this.closeInfoModal());
        const overlay = document.getElementById('lotInfoModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeInfoModal();
            });
        }

        document.getElementById('openCropBtn')?.addEventListener('click', () => this.openCropModal());
        document.getElementById('openPartyPointBtn')?.addEventListener('click', () => {
            if (this.partyView === 'exporter') this.openUnloadingPointModal();
            else this.openLoadingPointModal();
        });
        document.getElementById('partySwitchFarmer')?.addEventListener('click', () => this.setPartyView('farmer'));
        document.getElementById('partySwitchExporter')?.addEventListener('click', () => this.setPartyView('exporter'));

        document.getElementById('lotEditBtn')?.addEventListener('click', () => {
            if (!this.lot) return;
            openLotPublishModal(this.lot);
            showLotEditPanel();
        });
        document.getElementById('lotPublishBtn')?.addEventListener('click', () => {
            if (!this.lot) return;
            openLotPublishModal(this.lot);
        });

        // modal publish/edit actions
        const lotPublishOverlay = document.getElementById('dealLotPublishOverlay');
        const lotPublishCloseBtn = document.getElementById('dealLotPublishCloseBtn');
        const lotPublishConfirmBtn = document.getElementById('dealLotPublishConfirmBtn');
        const lotPublishEditBtn = document.getElementById('dealLotPublishEditBtn');
        const lotEditCancelBtn = document.getElementById('dealLotEditCancelBtn');
        const lotEditSubmitBtn = document.getElementById('dealLotEditSubmitBtn');

        if (lotPublishCloseBtn) lotPublishCloseBtn.addEventListener('click', closeLotPublishModal);
        if (lotPublishOverlay) {
            lotPublishOverlay.addEventListener('click', (e) => {
                if (e.target !== lotPublishOverlay) return;
                closeLotPublishModal();
            });
        }
        if (lotPublishEditBtn) lotPublishEditBtn.addEventListener('click', showLotEditPanel);
        if (lotEditCancelBtn) lotEditCancelBtn.addEventListener('click', closeLotPublishModal);

        if (lotPublishConfirmBtn) {
            _lotPublishConfirmOriginalHtml = lotPublishConfirmBtn.innerHTML;
            lotPublishConfirmBtn.addEventListener('click', async function () {
                if (!_lotPublishModalLotId) return;
                const btn = this;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>Публикация</span>';
                const result = await goToActiveLot(_lotPublishModalLotId);
                btn.disabled = false;
                if (_lotPublishConfirmOriginalHtml != null) btn.innerHTML = _lotPublishConfirmOriginalHtml;
                if (result && result.ok) {
                    closeLotPublishModal();
                    await LotDetailPage.loadLot();
                    return;
                }
                const errEl = document.getElementById('dealLotPublishError');
                if (errEl) {
                    errEl.textContent = 'Не удалось опубликовать лот. Попробуйте снова.';
                    errEl.style.display = 'block';
                }
            });
        }

        if (lotEditSubmitBtn) {
            _lotEditSubmitOriginalHtml = lotEditSubmitBtn.innerHTML;
            bindDecimalOnlyInputs();
            bindDealLotEditPriceMode();
            lotEditSubmitBtn.addEventListener('click', async function () {
                if (!_lotPublishModalLotId || !_lotPublishModalLot) return;
                const btn = this;
                const errEl = document.getElementById('dealLotEditError');
                if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

                const distanceEl = document.getElementById('dealLotEditDistanceInput');
                const tcEl = document.getElementById('dealLotEditTransportCoeffInput');
                const priceEl = document.getElementById('dealLotEditPricePerTonInput');
                const manualCb = document.getElementById('dealLotEditManualPriceCheckbox');
                const manualPrice = manualCb && manualCb.checked;

                recalcLotEditFields();

                const kmVal = parseLotEditMaybeNumber(distanceEl ? distanceEl.value : '');
                const tcVal = parseLotEditMaybeNumber(tcEl ? tcEl.value : '');
                const priceVal = parseLotEditMaybeNumber(priceEl ? priceEl.value : '');

                if (kmVal == null || kmVal < 1) {
                    if (errEl) {
                        errEl.textContent = kmVal != null && kmVal < 1 ? 'Расстояние не может быть меньше 1 км.' : 'Укажите расстояние не менее 1 км.';
                        errEl.style.display = 'block';
                    }
                    return;
                }

                const dto = { id: _lotPublishModalLotId, distance: kmVal * 1000 };
                if (manualPrice) {
                    if (priceVal != null) dto.pricePerTon = priceVal;
                    if (tcVal != null) dto.transportCoefficient = tcVal;
                } else {
                    if (tcVal != null) dto.transportCoefficient = tcVal;
                }

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>Обновляем</span>';
                const result = await goToUpdateLot(dto);
                btn.disabled = false;
                if (_lotEditSubmitOriginalHtml != null) btn.innerHTML = _lotEditSubmitOriginalHtml;
                if (result && result.ok) {
                    closeLotPublishModal();
                    await LotDetailPage.loadLot();
                    return;
                }
                if (errEl) {
                    errEl.textContent = 'Не удалось обновить лот. Попробуйте снова.';
                    errEl.style.display = 'block';
                }
            });
        }
    },

    setSubtitle(text) {
        const el = document.getElementById('lotSubtitle');
        if (el) el.textContent = text || '—';
    },

    setPartyView(next) {
        this.partyView = (next === 'exporter') ? 'exporter' : 'farmer';
        const bFarmer = document.getElementById('partySwitchFarmer');
        const bExporter = document.getElementById('partySwitchExporter');
        if (bFarmer) {
            bFarmer.classList.toggle('is-active', this.partyView === 'farmer');
            bFarmer.setAttribute('aria-selected', this.partyView === 'farmer' ? 'true' : 'false');
        }
        if (bExporter) {
            bExporter.classList.toggle('is-active', this.partyView === 'exporter');
            bExporter.setAttribute('aria-selected', this.partyView === 'exporter' ? 'true' : 'false');
        }
        const pointBtn = document.getElementById('openPartyPointBtn');
        if (pointBtn) {
            pointBtn.innerHTML = (this.partyView === 'exporter')
                ? '<i class="fas fa-warehouse"></i> Подробнее о точке'
                : '<i class="fas fa-map-marker-alt"></i> Подробнее о точке';
        }
        this.renderPartyBlock();
    },

    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    formatDate(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return isNaN(d.getTime()) ? iso : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (_) { return iso; }
    },

    formatPrice(val) {
        if (val == null || val === '') return '—';
        const n = parseFloat(String(val).replace(',', '.'));
        return isNaN(n) ? String(val) : n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatNumber(val) {
        if (val == null || isNaN(val)) return '—';
        return Number(val).toLocaleString('ru-RU');
    },

    async getAuthHeaders() {
        if (typeof getAuthTokens !== 'function') return null;
        const authResult = await getAuthTokens();
        if (authResult.status === 403 || authResult.status === 409) {
            if (typeof logout === 'function') logout();
            return null;
        }
        if (!authResult.data || !authResult.data.accessToken) return null;
        return { 'Authorization': 'Bearer ' + authResult.data.accessToken, 'Content-Type': 'application/json' };
    },

    async fetchLotById(id) {
        const headers = await this.getAuthHeaders();
        if (!headers) return null;
        const url = API_CONFIG.BASE_URL + '/moderators-module/lots/by-id/' + encodeURIComponent(id);
        try {
            const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000) });
            if (res.status === 401 || res.status === 403) { if (typeof logout === 'function') logout(); return null; }
            if (!res.ok) return null;
            const text = await res.text();
            return text ? JSON.parse(text) : null;
        } catch (e) {
            console.error('fetchLotById error', e);
            return null;
        }
    },

    async loadLot() {
        if (!this.lotId) return;
        this.setSubtitle('Загрузка...');
        const data = await this.fetchLotById(this.lotId);
        if (!data) {
            this.setSubtitle('Не удалось загрузить данные лота.');
            return;
        }
        this.lot = data;
        this.render();
    },

    render() {
        const lot = this.lot || {};
        const u = lot.uniqueCode ? String(lot.uniqueCode) : '—';
        const st = lot.lotsStatus && lot.lotsStatus.name ? lot.lotsStatus.name : '—';

        const titleEl = document.getElementById('lotTitle');
        if (titleEl) titleEl.textContent = u;

        const subtitleBits = [];
        if (st && st !== '—') subtitleBits.push('Статус: ' + st);
        if (lot.created_at) subtitleBits.push('Создан: ' + this.formatDate(lot.created_at));
        this.setSubtitle(subtitleBits.join(' • ') || '—');

        const badge = document.getElementById('lotStatusBadge');
        if (badge) badge.textContent = st;

        const editBtn = document.getElementById('lotEditBtn');
        const pubBtn = document.getElementById('lotPublishBtn');
        const isCreated = String(lot.lotsStatus && lot.lotsStatus.id) === '1' || String(st).toLowerCase().includes('создан');
        if (editBtn) editBtn.style.display = isCreated ? '' : 'none';
        if (pubBtn) pubBtn.style.display = isCreated ? '' : 'none';

        this.setPartyView(this.partyView);
        this.renderRequestsSidebar();
        this.renderLogisticsBlock();
    },

    renderPartyBlock() {
        if (this.partyView === 'exporter') return this.renderExporterBlock();
        return this.renderFarmerBlock();
    },

    renderFarmerBlock() {
        const lot = this.lot || {};
        const farmer = lot.farmerData || {};
        const ep = farmer.entrepreneurProfile || {};
        const jp = farmer.juridicalProfile || {};
        const profile = ep.id ? ep : jp;
        const pName = (profile.organizationName || '').trim() || [profile.lastName, profile.firstName, profile.patronymic].filter(Boolean).join(' ') || '—';
        const point = lot.loadingPointsData || {};

        const el = document.getElementById('partyBlock');
        if (!el) return;
        el.innerHTML =
            this.kvRow([['Фермер', pName], ['Верификация', (farmer.verificationStatus && farmer.verificationStatus.name) || '—']]) +
            this.kvRow([['Телефон', farmer.phone || '—'], ['Email', farmer.email || '—']]) +
            this.kvRow([['Точка погрузки', point.name || '—'], ['Адрес', point.address || '—']]);
    },

    renderExporterBlock() {
        const lot = this.lot || {};
        const exporter = lot.exporterData || {};
        const ep = exporter.entrepreneurProfile || {};
        const jp = exporter.juridicalProfile || {};
        const profile = jp.id ? jp : ep;
        const pName = (profile.organizationName || '').trim() || [profile.lastName, profile.firstName, profile.patronymic].filter(Boolean).join(' ') || '—';
        const point = lot.unloadingPointsData || {};

        const el = document.getElementById('partyBlock');
        if (!el) return;
        el.innerHTML =
            this.kvRow([['Экспортер', pName], ['Верификация', (exporter.verificationStatus && exporter.verificationStatus.name) || '—']]) +
            this.kvRow([['Телефон', exporter.phone || '—'], ['Email', exporter.email || '—']]) +
            this.kvRow([['Точка выгрузки', point.name || '—'], ['Адрес', point.address || '—']]);
    },

    renderRequestsSidebar() {
        const lot = this.lot || {};

        // Если бек начнет отдавать эти значения — подхватим автоматически.
        const pickNum = (...vals) => {
            for (let v of vals) {
                if (v == null) continue;
                const n = parseFloat(String(v).replace(',', '.'));
                if (!isNaN(n)) return n;
            }
            return null;
        };

        const newReq = pickNum(lot.newRequests, lot.requestsNew, lot.applicationsNew, lot.applicationsNewCount);
        const inWork = pickNum(lot.requestsInWork, lot.applicationsInWork, lot.applicationsInWorkCount);
        const deals = pickNum(lot.createdDeals, lot.dealsCreated, lot.dealsCreatedCount);

        const elNew = document.getElementById('lotReqNew');
        const elWork = document.getElementById('lotReqInWork');
        const elDeals = document.getElementById('lotReqDeals');
        if (elNew) elNew.textContent = (newReq == null ? '—' : String(Math.trunc(newReq)));
        if (elWork) elWork.textContent = (inWork == null ? '—' : String(Math.trunc(inWork)));
        if (elDeals) elDeals.textContent = (deals == null ? '—' : String(Math.trunc(deals)));

        const volumeNum = parseFloat(String(lot.volume != null ? lot.volume : '').replace(',', '.'));
        const volumeFilledNum = parseFloat(String(lot.volumeFilled != null ? lot.volumeFilled : '').replace(',', '.'));

        let percent = 0;
        if (!isNaN(volumeNum) && volumeNum > 0 && !isNaN(volumeFilledNum)) {
            percent = (volumeFilledNum / volumeNum) * 100;
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
        }
        const percentRounded = Math.round(percent);
        const percentForWidth = Math.round(percent * 10) / 10;

        document.getElementById('lotVolumeFilledText')?.replaceChildren(document.createTextNode(!isNaN(volumeFilledNum) ? this.formatNumber(volumeFilledNum) : '—'));
        document.getElementById('lotVolumeTotalText')?.replaceChildren(document.createTextNode(!isNaN(volumeNum) ? this.formatNumber(volumeNum) : '—'));
        document.getElementById('lotVolumePercentText')?.replaceChildren(document.createTextNode(String(percentRounded)));
        const fill = document.getElementById('lotVolumeProgressFill');
        if (fill) fill.style.width = String(percentForWidth) + '%';
    },

    renderLogisticsBlock() {
        const lot = this.lot || {};
        const distanceM = parseFloat(String(lot.distance != null ? lot.distance : '').replace(',', '.'));
        const km = !isNaN(distanceM) ? distanceM / 1000 : null;
        const volume = parseFloat(String(lot.volume != null ? lot.volume : '').replace(',', '.'));
        const price = parseFloat(String(lot.pricePerTon != null ? lot.pricePerTon : '').replace(',', '.'));
        const total = !isNaN(volume) && !isNaN(price) ? volume * price : NaN;

        const startDate = lot.startDate ? this.formatDate(lot.startDate) : '';
        const endDate = lot.deadline ? this.formatDate(lot.deadline) : '';
        const hasDates = Boolean(startDate) && Boolean(endDate);
        const dateLabel = hasDates ? 'Дата перевозки' : 'Кол-во дней перевозки';
        const dateValue = hasDates ? (startDate + ' / ' + endDate) : (lot.daysToUnloading != null ? String(lot.daysToUnloading) + ' дн.' : '—');

        const el = document.getElementById('logisticsBlock');
        if (!el) return;
        el.innerHTML =
            this.kvRow([['Культура', lot.cropsName || (lot.cropsData && lot.cropsData.cropsType && lot.cropsData.cropsType.name) || '—'], ['Статус', (lot.lotsStatus && lot.lotsStatus.name) || '—']]) +
            this.kvRow([['Откуда', lot.fromRegion || '—'], ['Куда', lot.toRegion || '—']]) +
            this.kvRow([[dateLabel, dateValue], ['Расстояние', km != null ? (this.formatNumber(Math.round(km * 100) / 100) + ' км') : '—']]) +
            this.kvRow([['Объём', !isNaN(volume) ? (this.formatNumber(volume) + ' т') : '—'], ['Коэф. перевозки', lot.transportCoefficient != null ? this.formatPrice(lot.transportCoefficient) : '—']]) +
            this.kvRow([['Цена за тонну', lot.pricePerTon != null ? (this.formatPrice(lot.pricePerTon) + ' ₽/т') : '—'], ['Общая сумма', !isNaN(total) ? (this.formatPrice(total) + ' ₽') : '—']]);
    },

    kvRow(pairs) {
        const items = (pairs || []).map(([label, value]) => (
            '<div class="lot-kv-item"><span class="lot-kv-label">' + this.escapeHtml(label) + '</span><div class="lot-kv-value">' + this.escapeHtml(value) + '</div></div>'
        )).join('');
        return '<div class="lot-kv-row">' + items + '</div>';
    },

    openInfoModal(title, bodyHtml) {
        const overlay = document.getElementById('lotInfoModalOverlay');
        if (!overlay) return;
        const titleEl = document.getElementById('lotInfoModalTitle');
        const bodyEl = document.getElementById('lotInfoModalBody');
        if (titleEl) titleEl.textContent = title || '—';
        if (bodyEl) bodyEl.innerHTML = bodyHtml || '';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    },

    closeInfoModal() {
        const overlay = document.getElementById('lotInfoModalOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
    },

    openCropModal() {
        const lot = this.lot || {};
        const c = lot.cropsData || null;
        if (!c) {
            this.openInfoModal('Культура', '<p class="deal-modal-empty">Данные культуры отсутствуют.</p>');
            return;
        }
        const props = Array.isArray(c.cropsPropertyValue) ? c.cropsPropertyValue.filter(x => x && x.cropsProperty) : [];
        const renderProp = (pv) => (
            '<div class="deal-modal-item">' +
                '<span class="deal-modal-item-label">' + this.escapeHtml(pv.cropsProperty.name) + '</span>' +
                '<span class="deal-modal-item-value">' + this.escapeHtml(String(pv.value)) + ' ' + this.escapeHtml(pv.cropsProperty.unit || '') + '</span>' +
            '</div>'
        );
        const body =
            '<div class="lot-modal-grid">' +
                '<section class="deal-modal-section">' +
                    '<h4 class="deal-modal-section-title">Общее</h4>' +
                    '<div class="deal-modal-item"><span class="deal-modal-item-label">Публичный ID</span><span class="deal-modal-item-value">' + this.escapeHtml(c.uniqueCode || '—') + '</span></div>' +
                    '<div class="deal-modal-item"><span class="deal-modal-item-label">Культура</span><span class="deal-modal-item-value">' + this.escapeHtml((c.cropsType && c.cropsType.name) || '—') + '</span></div>' +
                    '<div class="deal-modal-item"><span class="deal-modal-item-label">Год урожая</span><span class="deal-modal-item-value">' + this.escapeHtml(String(c.yearOfHarvest || '—')) + '</span></div>' +
                    '<div class="deal-modal-item"><span class="deal-modal-item-label">Регион</span><span class="deal-modal-item-value">' + this.escapeHtml((c.cropsOriginRegion && c.cropsOriginRegion.name) || '—') + '</span></div>' +
                    '<div class="deal-modal-item"><span class="deal-modal-item-label">Статус</span><span class="deal-modal-item-value">' + this.escapeHtml((c.cropsStatus && c.cropsStatus.name) || '—') + '</span></div>' +
                '</section>' +
                '<section class="deal-modal-section">' +
                    '<h4 class="deal-modal-section-title">Показатели качества</h4>' +
                    (props.length ? props.map(renderProp).join('') : '<p class="deal-modal-empty">Нет данных</p>') +
                '</section>' +
            '</div>';
        this.openInfoModal('Культура', body);
    },

    openLoadingPointModal() {
        const p = (this.lot && this.lot.loadingPointsData) || null;
        if (!p) { this.openInfoModal('Точка погрузки', '<p class="deal-modal-empty">Данные отсутствуют.</p>'); return; }
        this.openInfoModal('Точка погрузки', this.renderPointModalBody(p, true));
    },

    openUnloadingPointModal() {
        const p = (this.lot && this.lot.unloadingPointsData) || null;
        if (!p) { this.openInfoModal('Точка выгрузки', '<p class="deal-modal-empty">Данные отсутствуют.</p>'); return; }
        this.openInfoModal('Точка выгрузки', this.renderPointModalBody(p, false));
    },

    renderPointModalBody(p, isLoading) {
        const methods = Array.isArray(p.loadingMethod) ? p.loadingMethod.map(x => x.name).filter(Boolean).join(', ') : '—';
        const unloadMethods = Array.isArray(p.unloadingMethod) ? p.unloadingMethod.map(x => x.name).filter(Boolean).join(', ') : '';
        const transportTypes = Array.isArray(p.transportType) ? p.transportType.map(x => x.name).filter(Boolean).join(', ') : '—';
        const schedule = p.loadingPointsWorkSchedule || p.unloadingPointsWorkSchedule || null;
        const days = [
            ['monday', 'Понедельник'],
            ['tuesday', 'Вторник'],
            ['wednesday', 'Среда'],
            ['thursday', 'Четверг'],
            ['friday', 'Пятница'],
            ['saturday', 'Суббота'],
            ['sunday', 'Воскресенье']
        ];
        const scheduleRows = schedule ? (
            '<table class="deal-modal-schedule">' +
                '<tbody>' +
                    days.map(([key, label]) => (
                        '<tr><th>' + this.escapeHtml(label) + '</th><td>' + this.escapeHtml(schedule[key] || '—') + '</td></tr>'
                    )).join('') +
                '</tbody>' +
            '</table>'
        ) : '<p class="deal-modal-empty">График не указан.</p>';

        const commonSection =
            '<section class="deal-modal-section">' +
                '<h4 class="deal-modal-section-title">Общее</h4>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Публичный ID</span><span class="deal-modal-item-value">' + this.escapeHtml(p.uniqueCode || '—') + '</span></div>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Название</span><span class="deal-modal-item-value">' + this.escapeHtml(p.name || '—') + '</span></div>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Адрес</span><span class="deal-modal-item-value">' + this.escapeHtml(p.address || '—') + '</span></div>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Тип</span><span class="deal-modal-item-value">' + this.escapeHtml(((p.loadingPointsType || p.unloadingPointsType) && (p.loadingPointsType || p.unloadingPointsType).name) || '—') + '</span></div>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Широта</span><span class="deal-modal-item-value">' + this.escapeHtml(p.latitude != null ? String(p.latitude) : '—') + '</span></div>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Долгота</span><span class="deal-modal-item-value">' + this.escapeHtml(p.longitude != null ? String(p.longitude) : '—') + '</span></div>' +
            '</section>';

        const requirementsSection =
            '<section class="deal-modal-section">' +
                '<h4 class="deal-modal-section-title">Требования</h4>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Тип транспорта</span><span class="deal-modal-item-value">' + this.escapeHtml(transportTypes) + '</span></div>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">' + (isLoading ? 'Способ погрузки' : 'Способ выгрузки') + '</span><span class="deal-modal-item-value">' + this.escapeHtml(isLoading ? methods : (unloadMethods || methods || '—')) + '</span></div>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Покрытие дороги</span><span class="deal-modal-item-value">' + this.escapeHtml((p.roadSurfaceType && p.roadSurfaceType.name) || '—') + '</span></div>' +
                '<div class="deal-modal-item"><span class="deal-modal-item-label">Тралы</span><span class="deal-modal-item-value">' + this.escapeHtml(p.isTrawls === true ? 'Да' : (p.isTrawls === false ? 'Нет' : '—')) + '</span></div>' +
            '</section>';

        return (
            '<div class="lot-modal-grid">' +
                commonSection +
                requirementsSection +
            '</div>' +
            '<div class="lot-modal-bottom">' +
                '<section class="deal-modal-section">' +
                    '<h4 class="deal-modal-section-title">График работы</h4>' +
                    scheduleRows +
                '</section>' +
            '</div>'
        );
    }
};

// --- Публикация / редактирование лота (минимальный набор, как на deal_detail) ---
let _lotPublishModalLot = null;
let _lotPublishModalLotId = null;
let _lotPublishConfirmOriginalHtml = null;
let _lotEditSubmitOriginalHtml = null;

function openLotPublishModal(lot) {
    _lotPublishModalLot = lot || null;
    _lotPublishModalLotId = lot && lot.id != null ? String(lot.id) : '';
    const overlay = document.getElementById('dealLotPublishOverlay');
    if (!overlay) return;
    const errEl = document.getElementById('dealLotPublishError');
    if (errEl) errEl.style.display = 'none';

    const publishPanel = document.getElementById('dealLotPublishPanel');
    const editPanel = document.getElementById('dealLotEditPanel');
    if (publishPanel) publishPanel.style.display = '';
    if (editPanel) editPanel.style.display = 'none';

    const editErrEl = document.getElementById('dealLotEditError');
    if (editErrEl) { editErrEl.style.display = 'none'; editErrEl.textContent = ''; }

    const confirmBtn = document.getElementById('dealLotPublishConfirmBtn');
    const editBtn = document.getElementById('dealLotPublishEditBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        if (_lotPublishConfirmOriginalHtml != null) confirmBtn.innerHTML = _lotPublishConfirmOriginalHtml;
    }
    if (editBtn) editBtn.disabled = false;

    resetDealLotEditSubmitButton();
    const modalBox = overlay.querySelector('.accept-modal-content');
    if (modalBox) modalBox.scrollTop = 0;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
}

function closeLotPublishModal() {
    const overlay = document.getElementById('dealLotPublishOverlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    _lotPublishModalLotId = null;
    _lotPublishModalLot = null;
    const publishPanel = document.getElementById('dealLotPublishPanel');
    const editPanel = document.getElementById('dealLotEditPanel');
    if (publishPanel) publishPanel.style.display = '';
    if (editPanel) editPanel.style.display = 'none';
    resetDealLotEditSubmitButton();
}

function sanitizeDecimalInputString(s) {
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

function bindDecimalOnlyInputs() {
    const ids = ['dealLotEditDistanceInput', 'dealLotEditTransportCoeffInput', 'dealLotEditPricePerTonInput'];
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            const next = sanitizeDecimalInputString(el.value);
            if (el.value !== next) el.value = next;
            recalcLotEditFields();
        });
        el.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text') || '';
            const start = el.selectionStart != null ? el.selectionStart : el.value.length;
            const end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
            const merged = el.value.slice(0, start) + paste + el.value.slice(end);
            el.value = sanitizeDecimalInputString(merged);
            recalcLotEditFields();
        });
    });
}

function parseLotEditMaybeNumber(v) {
    const s = String(v || '').trim();
    if (!s) return null;
    const n = parseFloat(s.replace(',', '.'));
    return isNaN(n) ? null : n;
}

function formatLotEditDecimalForInput(n) {
    if (n == null || isNaN(n)) return '';
    const r = Math.round(Number(n) * 1e6) / 1e6;
    return String(r);
}

function formatLotEditAutoPriceHundredths(n) {
    if (n == null || isNaN(n)) return '';
    const r = Math.round(Number(n) * 100) / 100;
    return String(r);
}

function syncLotEditFieldLocks() {
    const manualEl = document.getElementById('dealLotEditManualPriceCheckbox');
    const manual = manualEl && manualEl.checked;
    const priceEl = document.getElementById('dealLotEditPricePerTonInput');
    const tcEl = document.getElementById('dealLotEditTransportCoeffInput');
    const priceWrap = document.getElementById('dealLotEditPriceInputWrap');
    const coeffWrap = document.getElementById('dealLotEditCoeffInputWrap');
    if (!priceEl || !tcEl) return;
    if (manual) {
        priceEl.readOnly = false;
        priceEl.classList.remove('deal-lot-edit-field-locked');
        tcEl.readOnly = true;
        tcEl.classList.add('deal-lot-edit-field-locked');
        if (priceWrap) priceWrap.classList.remove('is-field-locked');
        if (coeffWrap) coeffWrap.classList.add('is-field-locked');
    } else {
        priceEl.readOnly = true;
        priceEl.classList.add('deal-lot-edit-field-locked');
        tcEl.readOnly = false;
        tcEl.classList.remove('deal-lot-edit-field-locked');
        if (priceWrap) priceWrap.classList.add('is-field-locked');
        if (coeffWrap) coeffWrap.classList.remove('is-field-locked');
    }
}

function recalcLotEditFields() {
    const manualEl = document.getElementById('dealLotEditManualPriceCheckbox');
    const manual = manualEl && manualEl.checked;
    const kmEl = document.getElementById('dealLotEditDistanceInput');
    const tcEl = document.getElementById('dealLotEditTransportCoeffInput');
    const priceEl = document.getElementById('dealLotEditPricePerTonInput');
    if (!kmEl || !tcEl || !priceEl) return;
    const km = parseLotEditMaybeNumber(kmEl.value);
    const tc = parseLotEditMaybeNumber(tcEl.value);
    const price = parseLotEditMaybeNumber(priceEl.value);
    if (!manual) {
        if (km != null && tc != null) priceEl.value = formatLotEditAutoPriceHundredths(km * tc);
        else priceEl.value = '';
    } else {
        if (km != null && km > 0 && price != null) tcEl.value = formatLotEditDecimalForInput(price / km);
        else tcEl.value = '';
    }
}

function bindDealLotEditPriceMode() {
    const cb = document.getElementById('dealLotEditManualPriceCheckbox');
    if (!cb) return;
    cb.addEventListener('change', () => {
        syncLotEditFieldLocks();
        recalcLotEditFields();
    });
}

function resetDealLotEditSubmitButton() {
    const btn = document.getElementById('dealLotEditSubmitBtn');
    if (!btn) return;
    btn.disabled = false;
    if (_lotEditSubmitOriginalHtml != null) btn.innerHTML = _lotEditSubmitOriginalHtml;
}

function showLotEditPanel() {
    const publishPanel = document.getElementById('dealLotPublishPanel');
    const editPanel = document.getElementById('dealLotEditPanel');
    if (publishPanel) publishPanel.style.display = 'none';
    if (editPanel) editPanel.style.display = '';
    const distInput = document.getElementById('dealLotEditDistanceInput');
    const tcInput = document.getElementById('dealLotEditTransportCoeffInput');
    const priceInput = document.getElementById('dealLotEditPricePerTonInput');
    const manualCb = document.getElementById('dealLotEditManualPriceCheckbox');
    if (manualCb) manualCb.checked = false;
    const distM = _lotPublishModalLot && _lotPublishModalLot.distance != null ? parseFloat(String(_lotPublishModalLot.distance).replace(',', '.')) : NaN;
    if (distInput) distInput.value = !isNaN(distM) ? formatLotEditDecimalForInput(distM / 1000) : '';
    if (tcInput) tcInput.value = _lotPublishModalLot && _lotPublishModalLot.transportCoefficient != null ? String(_lotPublishModalLot.transportCoefficient) : '';
    if (priceInput) priceInput.value = _lotPublishModalLot && _lotPublishModalLot.pricePerTon != null ? String(_lotPublishModalLot.pricePerTon) : '';
    syncLotEditFieldLocks();
    recalcLotEditFields();
}

async function getAuthHeaders() {
    if (typeof getAuthTokens !== 'function') return null;
    const authResult = await getAuthTokens();
    if (authResult.status === 403 || authResult.status === 409) { if (typeof logout === 'function') logout(); return null; }
    if (!authResult.data || !authResult.data.accessToken) return null;
    return { 'Authorization': 'Bearer ' + authResult.data.accessToken };
}

async function goToActiveLot(lotId) {
    const urlPath = '/moderators-module/lots/go-to-active/' + encodeURIComponent(lotId);
    try {
        const headers = await getAuthHeaders();
        if (!headers) return { ok: false, status: null };
        const response = await fetch(API_CONFIG.BASE_URL + urlPath.replace('/api/', ''), {
            method: 'PATCH',
            headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
        });
        return { ok: response.status === 200, status: response.status };
    } catch (e) {
        console.error('goToActiveLot error', e);
        return { ok: false, status: 0 };
    }
}

async function goToUpdateLot(dto) {
    const urlPath = '/moderators-module/lots/update';
    try {
        const headers = await getAuthHeaders();
        if (!headers) return { ok: false, status: null };
        const response = await fetch(API_CONFIG.BASE_URL + urlPath.replace('/api/', ''), {
            method: 'PATCH',
            headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
            body: JSON.stringify(dto || {}),
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
        });
        return { ok: response.status === 200, status: response.status };
    } catch (e) {
        console.error('goToUpdateLot error', e);
        return { ok: false, status: 0 };
    }
}

