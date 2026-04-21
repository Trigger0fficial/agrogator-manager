document.addEventListener('DOMContentLoaded', () => {
    LotDetailPage.init();
});

const LotDetailPage = {
    lotId: null,
    lot: null,
    isLoading: false,
    partyView: 'farmer', // farmer | exporter
    relatedView: 'requests', // requests | deals
    relatedFilters: {
        requests: { status: '', volumeStart: null, volumeEnd: null, vehiclesStart: null, vehiclesEnd: null, search: '' },
        deals: { status: '', volumeStart: null, volumeEnd: null, vehiclesStart: null, vehiclesEnd: null, search: '' }
    },

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
        document.getElementById('lotRequestInfoModalClose')?.addEventListener('click', () => this.closeRequestInfoModal());
        const requestOverlay = document.getElementById('lotRequestInfoModalOverlay');
        if (requestOverlay) {
            requestOverlay.addEventListener('click', (e) => {
                if (e.target === requestOverlay) this.closeRequestInfoModal();
            });
        }

        document.getElementById('openCropBtn')?.addEventListener('click', () => this.openCropModal());
        document.getElementById('openPartyPointBtn')?.addEventListener('click', () => {
            if (this.partyView === 'exporter') this.openUnloadingPointModal();
            else this.openLoadingPointModal();
        });
        document.getElementById('partySwitchFarmer')?.addEventListener('click', () => this.setPartyView('farmer'));
        document.getElementById('partySwitchExporter')?.addEventListener('click', () => this.setPartyView('exporter'));
        document.getElementById('lotRequestsTabBtn')?.addEventListener('click', () => this.setRelatedView('requests'));
        document.getElementById('lotDealsTabBtn')?.addEventListener('click', () => this.setRelatedView('deals'));
        document.getElementById('lotRelatedStatusFilter')?.addEventListener('change', (e) => {
            const f = this.getCurrentRelatedFilterState();
            f.status = String(e.target.value || '');
            this.renderRelatedCards();
        });
        document.getElementById('lotRelatedStatusSelectBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleStatusDropdown();
        });
        document.addEventListener('click', (e) => {
            const wrap = document.getElementById('lotRelatedStatusSelectWrap');
            if (!wrap) return;
            if (!wrap.contains(e.target)) this.closeStatusDropdown();
        });
        const onRangeInput = (id, field, integerOnly) => {
            document.getElementById(id)?.addEventListener('input', (e) => {
                const raw = String(e.target.value || '');
                const cleaned = integerOnly
                    ? raw.replace(/[^\d]/g, '')
                    : raw.replace(',', '.').replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
                if (cleaned !== raw) e.target.value = cleaned;
                const n = this.parseNumericValue(cleaned);
                const f = this.getCurrentRelatedFilterState();
                f[field] = cleaned.trim() === '' ? null : n;
                this.renderRelatedCards();
            });
        };
        onRangeInput('lotRelatedVolumeStart', 'volumeStart', false);
        onRangeInput('lotRelatedVolumeEnd', 'volumeEnd', false);
        onRangeInput('lotRelatedVehiclesStart', 'vehiclesStart', true);
        onRangeInput('lotRelatedVehiclesEnd', 'vehiclesEnd', true);
        document.getElementById('lotRelatedSearchInput')?.addEventListener('input', (e) => {
            const f = this.getCurrentRelatedFilterState();
            f.search = String(e.target.value || '');
            this.renderRelatedCards();
        });
        document.getElementById('lotRelatedResetFiltersBtn')?.addEventListener('click', () => {
            this.relatedFilters[this.relatedView] = { status: '', volumeStart: null, volumeEnd: null, vehiclesStart: null, vehiclesEnd: null, search: '' };
            this.syncRelatedFiltersControls();
            this.renderRelatedCards();
        });

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

    setRelatedView(next) {
        this.relatedView = next === 'deals' ? 'deals' : 'requests';
        const reqBtn = document.getElementById('lotRequestsTabBtn');
        const dealBtn = document.getElementById('lotDealsTabBtn');
        if (reqBtn) {
            reqBtn.classList.toggle('is-active', this.relatedView === 'requests');
            reqBtn.setAttribute('aria-selected', this.relatedView === 'requests' ? 'true' : 'false');
        }
        if (dealBtn) {
            dealBtn.classList.toggle('is-active', this.relatedView === 'deals');
            dealBtn.setAttribute('aria-selected', this.relatedView === 'deals' ? 'true' : 'false');
        }
        this.syncRelatedFiltersControls();
        this.renderRelatedCards();
    },

    getCurrentRelatedFilterState() {
        return this.relatedFilters[this.relatedView];
    },

    openStatusDropdown() {
        const list = document.getElementById('lotRelatedStatusSelectList');
        const btn = document.getElementById('lotRelatedStatusSelectBtn');
        if (!list || !btn) return;
        list.classList.add('is-open');
        btn.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
    },

    closeStatusDropdown() {
        const list = document.getElementById('lotRelatedStatusSelectList');
        const btn = document.getElementById('lotRelatedStatusSelectBtn');
        if (!list || !btn) return;
        list.classList.remove('is-open');
        btn.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
    },

    toggleStatusDropdown() {
        const list = document.getElementById('lotRelatedStatusSelectList');
        if (!list) return;
        if (list.classList.contains('is-open')) this.closeStatusDropdown();
        else this.openStatusDropdown();
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

    parseNumericValue(v) {
        const n = parseFloat(String(v != null ? v : '').replace(',', '.'));
        return isNaN(n) ? null : n;
    },

    formatDateTime(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }) + ' ' + d.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (_) {
            return '—';
        }
    },

    normalizeStatusName(v) {
        return String(v || '').trim().toLowerCase();
    },

    getRequestStatusTone(statusName) {
        const n = this.normalizeStatusName(statusName);
        if (n.includes('отклон')) return 'rejected';
        if (n.includes('правк') || n.includes('доработ')) return 'rework';
        if (n.includes('обработ') || n.includes('вниман')) return 'attention';
        return 'neutral';
    },

    getDealStatusTone(statusName) {
        const n = this.normalizeStatusName(statusName);
        if (n.includes('отклон')) return 'rejected';
        if (n.includes('заверш')) return 'finish';
        if (n.includes('рабоч')) return 'process';
        if (n.includes('ожидает')) return 'wait';
        return 'neutral';
    },

    getToneLabelClass(tone) {
        return 'tone-' + String(tone || 'neutral');
    },

    getDealStageIndex(statusName) {
        const n = this.normalizeStatusName(statusName);
        if (n.includes('ожидает') && n.includes('начал')) return 1;
        if (n.includes('рабоч')) return 2;
        if (n.includes('ожидает') && n.includes('заверш')) return 3;
        if (n.includes('заверш')) return 4;
        return 1;
    },

    normalizeDocumentUrl(url) {
        const raw = String(url || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        // s3/file и s3://... напрямую в браузере не открываются корректно.
        return '';
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
            if (!text) return null;
            const parsed = JSON.parse(text);
            // Бек может вернуть как сам объект лота, так и обертку { data: {...} }.
            if (parsed && parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
                return parsed.data;
            }
            return parsed;
        } catch (e) {
            console.error('fetchLotById error', e);
            return null;
        }
    },

    async fetchUserById(userId) {
        const id = String(userId || '').trim();
        if (!id) return null;
        const headers = await this.getAuthHeaders();
        if (!headers) return null;
        const url = API_CONFIG.BASE_URL + '/moderators-module/all-by-user?id=' + encodeURIComponent(id);
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (res.status === 401 || res.status === 403) {
                if (typeof logout === 'function') logout();
                return null;
            }
            if (!res.ok) return null;
            const text = await res.text();
            if (!text) return null;
            const parsed = JSON.parse(text);
            if (parsed && parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) return parsed.data;
            return parsed;
        } catch (e) {
            console.error('fetchUserById error', e);
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
        this.setRelatedView(this.relatedView);
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
        const requests = Array.isArray(lot.lotsRequest) ? lot.lotsRequest : [];
        const dealsList = Array.isArray(lot.transporterDeals) ? lot.transporterDeals : [];
        let attention = 0;
        let rework = 0;
        let rejected = 0;
        requests.forEach((req) => {
            const name = (req && req.lotsRequestStatus && req.lotsRequestStatus.name) || '';
            const tone = this.getRequestStatusTone(name);
            if (tone === 'attention') attention += 1;
            else if (tone === 'rework') rework += 1;
            else if (tone === 'rejected') rejected += 1;
        });

        const elAttention = document.getElementById('lotReqAttention');
        const elRework = document.getElementById('lotReqRework');
        const elRejected = document.getElementById('lotReqRejected');
        const elDeals = document.getElementById('lotReqDeals');
        if (elAttention) elAttention.textContent = String(attention);
        if (elRework) elRework.textContent = String(rework);
        if (elRejected) elRejected.textContent = String(rejected);
        if (elDeals) elDeals.textContent = String(dealsList.length);

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

    getRelatedItems() {
        return this.getRelatedItemsByView(this.relatedView);
    },

    getRelatedItemsByView(view) {
        const lot = this.lot || {};
        const source = (lot && lot.data && typeof lot.data === 'object') ? lot.data : lot;
        const raw = view === 'deals'
            ? (Array.isArray(source.transporterDeals) ? source.transporterDeals : [])
            : (Array.isArray(source.lotsRequest) ? source.lotsRequest : []);
        return raw.filter((x) => x && typeof x === 'object');
    },

    getRelatedStatusName(item, isDeals) {
        return isDeals
            ? ((item.transporterDealsStatus && item.transporterDealsStatus.name) || '')
            : ((item.lotsRequestStatus && item.lotsRequestStatus.name) || '');
    },

    getRelatedTrailers(item, isDeals) {
        return isDeals
            ? (Array.isArray(item.tractorTrailerTransporterDeals) ? item.tractorTrailerTransporterDeals : [])
            : (Array.isArray(item.tractorTrailer) ? item.tractorTrailer : []);
    },

    getRelatedVolumeNum(item, isDeals) {
        return this.parseNumericValue(isDeals ? item.volume : item.readyToTransportVolume);
    },

    buildRelatedSearchText(item, isDeals) {
        const trailers = this.getRelatedTrailers(item, isDeals);
        const parts = [
            item.uniqueCode || '',
            this.getRelatedStatusName(item, isDeals) || ''
        ];
        trailers.forEach((row) => {
            const truck = row && row.trucks ? row.trucks : {};
            const trailer = row && row.trailer ? row.trailer : {};
            const driver = row && row.drivers ? row.drivers : {};
            parts.push(
                truck.uniqueCode || '',
                trailer.uniqueCode || '',
                (truck.brand && truck.brand.name) || '',
                (truck.model && truck.model.name) || '',
                [driver.lastName, driver.firstName, driver.patronymic].filter(Boolean).join(' ')
            );
        });
        return parts.join(' ').toLowerCase();
    },

    filterRelatedItems(items, isDeals) {
        const f = this.getCurrentRelatedFilterState();
        const statusNeedle = this.normalizeStatusName(f.status || '');
        const searchNeedle = String(f.search || '').trim().toLowerCase();
        return items.filter((item) => {
            const statusName = this.getRelatedStatusName(item, isDeals);
            const statusNormalized = this.normalizeStatusName(statusName);
            if (statusNeedle && statusNormalized !== statusNeedle) return false;

            const volume = this.getRelatedVolumeNum(item, isDeals);
            if (f.volumeStart != null && (volume == null || volume < f.volumeStart)) return false;
            if (f.volumeEnd != null && (volume == null || volume > f.volumeEnd)) return false;

            const vehicles = this.getRelatedTrailers(item, isDeals).length;
            if (f.vehiclesStart != null && vehicles < f.vehiclesStart) return false;
            if (f.vehiclesEnd != null && vehicles > f.vehiclesEnd) return false;

            if (searchNeedle) {
                const hay = this.buildRelatedSearchText(item, isDeals);
                if (!hay.includes(searchNeedle)) return false;
            }
            return true;
        });
    },

    countActiveRelatedFilters() {
        const f = this.getCurrentRelatedFilterState();
        let n = 0;
        if (String(f.status || '').trim()) n++;
        if (f.volumeStart != null || f.volumeEnd != null) n++;
        if (f.vehiclesStart != null || f.vehiclesEnd != null) n++;
        if (String(f.search || '').trim()) n++;
        return n;
    },

    updateRelatedSelectedFiltersCount() {
        const el = document.getElementById('lotRelatedSelectedCount');
        if (!el) return;
        el.innerHTML = 'Выбрано фильтров: <strong>' + String(this.countActiveRelatedFilters()) + '</strong>';
    },

    syncRelatedFiltersControls() {
        const f = this.getCurrentRelatedFilterState();
        const volumeStart = document.getElementById('lotRelatedVolumeStart');
        const volumeEnd = document.getElementById('lotRelatedVolumeEnd');
        const vehiclesStart = document.getElementById('lotRelatedVehiclesStart');
        const vehiclesEnd = document.getElementById('lotRelatedVehiclesEnd');
        const searchInput = document.getElementById('lotRelatedSearchInput');
        const statusValue = document.getElementById('lotRelatedStatusSelectValue');
        if (statusValue) {
            statusValue.textContent = String(f.status || '').trim() || 'Все статусы';
        }
        if (volumeStart) volumeStart.value = f.volumeStart == null ? '' : String(f.volumeStart);
        if (volumeEnd) volumeEnd.value = f.volumeEnd == null ? '' : String(f.volumeEnd);
        if (vehiclesStart) vehiclesStart.value = f.vehiclesStart == null ? '' : String(f.vehiclesStart);
        if (vehiclesEnd) vehiclesEnd.value = f.vehiclesEnd == null ? '' : String(f.vehiclesEnd);
        if (searchInput) searchInput.value = String(f.search || '');
        this.updateRelatedSelectedFiltersCount();
    },

    renderRelatedStatusesOptions(items, isDeals) {
        const list = document.getElementById('lotRelatedStatusSelectList');
        if (!list) return;
        const selected = String(this.getCurrentRelatedFilterState().status || '');
        const statuses = [];
        items.forEach((item) => {
            const name = this.getRelatedStatusName(item, isDeals);
            if (name && !statuses.includes(name)) statuses.push(name);
        });
        const all = [''].concat(statuses);
        list.innerHTML = all.map((name) => {
            const label = name || 'Все статусы';
            const isSelected = (name || '') === selected;
            return (
                '<button type="button" class="lot-status-option' + (isSelected ? ' is-selected' : '') + '" data-status-option="' + this.escapeHtml(name) + '">' +
                    '<span class="lot-status-option-dot" aria-hidden="true"></span>' +
                    '<span>' + this.escapeHtml(label) + '</span>' +
                '</button>'
            );
        }).join('');
        list.querySelectorAll('[data-status-option]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-status-option') || '';
                const f = this.getCurrentRelatedFilterState();
                f.status = val;
                this.closeStatusDropdown();
                this.syncRelatedFiltersControls();
                this.renderRelatedCards();
            });
        });
    },

    renderRelatedCards() {
        const grid = document.getElementById('lotRelatedGrid');
        if (!grid) return;
        const allItems = this.getRelatedItems();
        const isDeals = this.relatedView === 'deals';
        this.renderRelatedStatusesOptions(allItems, isDeals);
        this.syncRelatedFiltersControls();
        const items = this.filterRelatedItems(allItems, isDeals);
        if (!items.length) {
            grid.innerHTML =
                '<div class="lot-related-empty">' +
                    '<div class="lot-related-empty-icon"><i class="fas ' + (isDeals ? 'fa-handshake' : 'fa-layer-group') + '"></i></div>' +
                    '<h4>Пока нет ' + (isDeals ? 'сделок' : 'заявок') + '</h4>' +
                    '<p>' + (isDeals ? 'Сделки появятся после обработки заявок и согласования условий.' : 'Заявки от перевозчиков отобразятся здесь автоматически.') + '</p>' +
                '</div>';
            return;
        }
        grid.innerHTML = items.map((item) => {
            const status = isDeals
                ? ((item.transporterDealsStatus && item.transporterDealsStatus.name) || '—')
                : ((item.lotsRequestStatus && item.lotsRequestStatus.name) || '—');
            const tone = isDeals ? this.getDealStatusTone(status) : this.getRequestStatusTone(status);
            const trailers = this.getRelatedTrailers(item, isDeals);
            const vehiclesCount = trailers.length;
            const volumeRaw = isDeals ? item.volume : item.readyToTransportVolume;
            const volumeNum = this.parseNumericValue(volumeRaw);
            const volumeText = volumeNum == null ? '—' : (this.formatNumber(volumeNum) + ' т');
            const createdAtText = this.formatDateTime(item.created_at);
            if (!isDeals) {
                const from = this.escapeHtml((this.lot && this.lot.fromRegion) || '—');
                const to = this.escapeHtml((this.lot && this.lot.toRegion) || '—');
                return (
                    '<article class="lot-related-card lot-related-card--request">' +
                        '<div class="lot-request-layout">' +
                            '<div class="lot-request-head">' +
                                '<span class="lot-request-idline">№ ' + this.escapeHtml(item.uniqueCode || '—') + '</span>' +
                                '<span class="lot-top-meta" style="justify-self:center;"><i class="fas fa-calendar-alt"></i> ' + this.escapeHtml(createdAtText) + '</span>' +
                                '<span style="justify-self:end;"><span class="lot-status-chip ' + this.escapeHtml(this.getToneLabelClass(tone)) + '">' + this.escapeHtml(status) + '</span></span>' +
                            '</div>' +
                            '<div class="lot-request-route">' +
                                '<span class="point">' + from + '</span>' +
                                '<span class="arrow"><i class="fas fa-arrow-right"></i></span>' +
                                '<span class="point" style="text-align:right;">' + to + '</span>' +
                            '</div>' +
                            '<div class="lot-request-metrics">' +
                                '<div class="lot-request-metric"><span class="k">Количество машин</span><span class="v">' + this.escapeHtml(String(vehiclesCount)) + '</span></div>' +
                                '<div class="lot-request-metric"><span class="k">Готов перевезти</span><span class="v">' + this.escapeHtml(volumeText) + '</span></div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="lot-related-actions">' +
                            '<button type="button" class="btn btn-outline" data-related-info="' + this.escapeHtml(String(item.id || '')) + '"><i class="fas fa-circle-info"></i> О заявке</button>' +
                            '<button type="button" class="btn btn-primary" data-related-open-request="' + this.escapeHtml(String(item.id || '')) + '"><i class="fas fa-chevron-right"></i> Подробнее</button>' +
                        '</div>' +
                    '</article>'
                );
            }

            const stageIndex = this.getDealStageIndex(status);
            const progressWidth = Math.max(5, Math.min(100, Math.round((stageIndex / 4) * 100)));
            const isRejectedDeal = this.getDealStatusTone(status) === 'rejected';
            return (
                '<article class="lot-related-card lot-related-card--deal">' +
                    '<div class="lot-deal-layout">' +
                        '<div class="lot-deal-head">' +
                            '<span class="lot-deal-idline">№ ' + this.escapeHtml(item.uniqueCode || '—') + '</span>' +
                            '<span class="lot-top-meta" style="justify-self:center;"><i class="fas fa-calendar-alt"></i> ' + this.escapeHtml(createdAtText) + '</span>' +
                            '<span style="justify-self:end;"><span class="lot-status-chip ' + this.escapeHtml(this.getToneLabelClass(tone)) + '">' + this.escapeHtml(status) + '</span></span>' +
                        '</div>' +
                        (isRejectedDeal
                            ? '<div class="lot-deal-rejected-line"><i class="fas fa-ban" style="margin-right:0.4rem;"></i> Отклонена</div>'
                            : (
                                '<div class="lot-deal-progress"><span class="lot-deal-progress-fill" style="width:' + String(progressWidth) + '%;"></span></div>' +
                                '<div class="lot-deal-stages">' +
                                    '<span class="lot-deal-stage ' + (stageIndex >= 1 ? 'is-active' : '') + '">Старт</span>' +
                                    '<span class="lot-deal-stage ' + (stageIndex >= 2 ? 'is-active' : '') + '">Работа</span>' +
                                    '<span class="lot-deal-stage ' + (stageIndex >= 3 ? 'is-active' : '') + '">Финиш</span>' +
                                    '<span class="lot-deal-stage ' + (stageIndex >= 4 ? 'is-active' : '') + '">Закрыта</span>' +
                                '</div>'
                            )
                        ) +
                        '<div class="lot-deal-metrics">' +
                            '<div class="lot-deal-metric"><span class="k">Автопоезда</span><span class="v">' + this.escapeHtml(String(vehiclesCount)) + '</span></div>' +
                            '<div class="lot-deal-metric"><span class="k">Объем сделки</span><span class="v">' + this.escapeHtml(volumeText) + '</span></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="lot-related-actions">' +
                        '<button type="button" class="btn btn-outline" data-related-info="' + this.escapeHtml(String(item.id || '')) + '"><i class="fas fa-circle-info"></i> О сделке</button>' +
                        '<button type="button" class="btn btn-primary" data-related-more disabled><i class="fas fa-chevron-right"></i> Подробнее</button>' +
                    '</div>' +
                '</article>'
            );
        }).join('');

        grid.querySelectorAll('[data-related-info]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-related-info') || '';
                const target = items.find((x) => x && String(x.id || '') === String(id));
                if (target) this.openRelatedInfoModal(target, isDeals);
            });
        });
        grid.querySelectorAll('[data-related-open-request]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-related-open-request') || '';
                if (!id) return;
                window.location.href = '/order/request/' + encodeURIComponent(id) + '/';
            });
        });
    },

    async openRelatedInfoModal(item, isDeals) {
        const list = isDeals
            ? (Array.isArray(item.tractorTrailerTransporterDeals) ? item.tractorTrailerTransporterDeals : [])
            : (Array.isArray(item.tractorTrailer) ? item.tractorTrailer : []);

        const overlay = document.getElementById('lotRequestInfoModalOverlay');
        if (!overlay) return;
        const title = document.getElementById('lotRequestInfoModalTitle');
        const bodyEl = document.getElementById('lotRequestInfoModalBody');
        const modalRoot = document.getElementById('lotRequestInfoModal');
        if (title) title.textContent = isDeals ? 'Информация о сделке' : 'Информация о заявке';
        if (modalRoot) {
            modalRoot.classList.remove('lot-request-modal', 'lot-deal-modal', 'lot-rich-modal');
            modalRoot.classList.add(isDeals ? 'lot-deal-modal' : 'lot-request-modal');
            modalRoot.classList.add('lot-rich-modal');
        }
        if (bodyEl) {
            bodyEl.innerHTML =
                '<div class="lot-related-loading">' +
                    '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i>' +
                    '<span>Загрузка информации о контрагенте...</span>' +
                '</div>';
        }
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');

        const renderDocLink = (url, label, icon) => {
            const href = this.normalizeDocumentUrl(url);
            if (!href) {
                return '<span class="lot-doc-link is-disabled"><i class="fas fa-' + this.escapeHtml(icon || 'file') + '"></i> ' + this.escapeHtml(label) + ' (недоступно)</span>';
            }
            return '<a class="lot-doc-link" href="' + this.escapeHtml(href) + '" target="_blank" rel="noopener noreferrer"><i class="fas fa-' + this.escapeHtml(icon || 'file') + '"></i> ' + this.escapeHtml(label) + '</a>';
        };

        const renderDocs = (docEntries) => {
            const links = (Array.isArray(docEntries) ? docEntries : []).map((entry) => renderDocLink(entry.url, entry.label, entry.icon)).filter(Boolean);
            if (!links.length) return '<span class="deal-modal-item-value">Нет документов</span>';
            return '<div class="lot-doc-links">' + links.join('') + '</div>';
        };

        const renderAutotrainCard = (row, index) => {
            const truck = row && row.trucks ? row.trucks : {};
            const trailer = row && row.trailer ? row.trailer : {};
            const driver = row && row.drivers ? row.drivers : {};
            const driverFio = [driver.lastName, driver.firstName, driver.patronymic].filter(Boolean).join(' ') || '—';
            const truckName = [truck.brand && truck.brand.name, truck.model && truck.model.name].filter(Boolean).join(' ') || '—';
            const trailerCargo = Array.isArray(trailer.cargoType) ? trailer.cargoType.map((c) => c && c.name).filter(Boolean).join(', ') : '—';
            const truckDocs = renderDocs([
                { url: truck.vehiclePassportPhotoFront, label: 'ПТС (лицевая)', icon: 'id-card' },
                { url: truck.vehiclePassportPhotoBack, label: 'ПТС (оборот)', icon: 'id-card' },
                { url: truck.truckPhoto, label: 'Фото грузовика', icon: 'image' }
            ]);
            const trailerDocs = renderDocs([
                { url: trailer.vehiclePassportPhotoFront, label: 'ПТС прицепа (лицевая)', icon: 'id-card' },
                { url: trailer.vehiclePassportPhotoBack, label: 'ПТС прицепа (оборот)', icon: 'id-card' }
            ]);
            const driverDocs = renderDocs([
                { url: driver.driverLicensePhotoFront, label: 'Права (лицевая)', icon: 'id-card' },
                { url: driver.driverLicensePhotoBack, label: 'Права (оборот)', icon: 'id-card' },
                { url: driver.driverPhoto, label: 'Фото водителя', icon: 'image' }
            ]);
            return (
                '<article class="lot-autotrain-card">' +
                    '<h4>Автопоезд #' + this.escapeHtml(String(index + 1)) + '</h4>' +
                    '<div class="lot-autotrain-block">' +
                        '<h5 class="lot-autotrain-block-title">Грузовик</h5>' +
                        '<div class="lot-autotrain-kv">' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Публичный ID</span><span class="deal-modal-item-value">' + this.escapeHtml(truck.uniqueCode || '—') + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Гос. номер</span><span class="deal-modal-item-value">' + this.escapeHtml(truck.registerNumber || '—') + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Марка/модель</span><span class="deal-modal-item-value">' + this.escapeHtml(truckName) + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Тип транспорта</span><span class="deal-modal-item-value">' + this.escapeHtml((truck.trucksType && truck.trucksType.name) || '—') + '</span></div>' +
                        '</div>' +
                        '<div class="deal-modal-item"><span class="deal-modal-item-label">Документы и фото</span>' + truckDocs + '</div>' +
                    '</div>' +
                    '<div class="lot-autotrain-block">' +
                        '<h5 class="lot-autotrain-block-title">Прицеп</h5>' +
                        '<div class="lot-autotrain-kv">' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Публичный ID</span><span class="deal-modal-item-value">' + this.escapeHtml(trailer.uniqueCode || '—') + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Гос. номер</span><span class="deal-modal-item-value">' + this.escapeHtml(trailer.registerNumber || '—') + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Грузоподъемность</span><span class="deal-modal-item-value">' + this.escapeHtml(trailer.tonnage != null ? String(trailer.tonnage) + ' т' : '—') + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Способ выгрузки</span><span class="deal-modal-item-value">' + this.escapeHtml((trailer.unloadingMethod && trailer.unloadingMethod.name) || '—') + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Типы груза</span><span class="deal-modal-item-value">' + this.escapeHtml(trailerCargo) + '</span></div>' +
                        '</div>' +
                        '<div class="deal-modal-item"><span class="deal-modal-item-label">Документы</span>' + trailerDocs + '</div>' +
                    '</div>' +
                    '<div class="lot-autotrain-block">' +
                        '<h5 class="lot-autotrain-block-title">Водитель</h5>' +
                        '<div class="lot-autotrain-kv">' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">ФИО</span><span class="deal-modal-item-value">' + this.escapeHtml(driverFio) + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Телефон</span><span class="deal-modal-item-value">' + this.escapeHtml(driver.phone || '—') + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">Паспорт</span><span class="deal-modal-item-value">' + this.escapeHtml((driver.passportSerial && driver.passportNumber) ? (driver.passportSerial + ' ' + driver.passportNumber) : '—') + '</span></div>' +
                            '<div class="deal-modal-item"><span class="deal-modal-item-label">ВУ</span><span class="deal-modal-item-value">' + this.escapeHtml((driver.driverLicenseSerial && driver.driverLicenseNumber) ? (driver.driverLicenseSerial + ' ' + driver.driverLicenseNumber) : '—') + '</span></div>' +
                        '</div>' +
                        '<div class="deal-modal-item"><span class="deal-modal-item-label">Документы и фото</span>' + driverDocs + '</div>' +
                    '</div>' +
                '</article>'
            );
        };

        const renderAutotrainCompactCard = (row, index) => {
            const truck = row && row.trucks ? row.trucks : {};
            const trailer = row && row.trailer ? row.trailer : {};
            const driver = row && row.drivers ? row.drivers : {};
            const truckName = [truck.brand && truck.brand.name, truck.model && truck.model.name].filter(Boolean).join(' ') || '—';
            const driverFio = [driver.lastName, driver.firstName, driver.patronymic].filter(Boolean).join(' ') || '—';
            const trailerType = (trailer.unloadingMethod && trailer.unloadingMethod.name) || '—';
            return (
                '<article class="lot-autotrain-compact-card">' +
                    '<div class="lot-autotrain-compact-head">' +
                        '<span class="lot-autotrain-compact-title"><i class="fas fa-truck"></i> Автопоезд #' + this.escapeHtml(String(index + 1)) + '</span>' +
                        '<span class="lot-status-chip tone-neutral">ID ' + this.escapeHtml(String((row && row.id) || '—').slice(0, 6)) + '</span>' +
                    '</div>' +
                    '<div class="lot-autotrain-compact-grid">' +
                        '<div class="lot-autotrain-compact-row"><span class="k">Марка/модель</span><span class="v">' + this.escapeHtml(truckName) + '</span></div>' +
                        '<div class="lot-autotrain-compact-row"><span class="k">Гос. номер тягача</span><span class="v">' + this.escapeHtml(truck.registerNumber || '—') + '</span></div>' +
                        '<div class="lot-autotrain-compact-row"><span class="k">Гос. номер прицепа</span><span class="v">' + this.escapeHtml(trailer.registerNumber || '—') + '</span></div>' +
                        '<div class="lot-autotrain-compact-row"><span class="k">Тип прицепа</span><span class="v">' + this.escapeHtml(trailerType) + '</span></div>' +
                        '<div class="lot-autotrain-compact-row"><span class="k">Водитель</span><span class="v">' + this.escapeHtml(driverFio) + '</span></div>' +
                    '</div>' +
                '</article>'
            );
        };

        const status = isDeals
            ? ((item.transporterDealsStatus && item.transporterDealsStatus.name) || '—')
            : ((item.lotsRequestStatus && item.lotsRequestStatus.name) || '—');
        const tone = isDeals ? this.getDealStatusTone(status) : this.getRequestStatusTone(status);
        const volumeRaw = isDeals ? item.volume : item.readyToTransportVolume;
        const volumeNum = this.parseNumericValue(volumeRaw);
        const volumeText = volumeNum == null ? '—' : (this.formatNumber(volumeNum) + ' т');
        const createdAtText = this.formatDateTime(item.created_at);
        const userData = await this.fetchUserById(item.usersId);
        const profile = userData && userData.entrepreneurProfile ? userData.entrepreneurProfile : null;
        const counterpartyCard = profile
            ? (
                '<section class="lot-partner-card">' +
                    '<div class="lot-partner-head">' +
                        '<h4 class="lot-partner-title"><i class="fas fa-user-tie"></i> Контрагент</h4>' +
                        '<span class="lot-status-chip tone-process">ИП</span>' +
                    '</div>' +
                    '<div class="lot-partner-grid">' +
                        '<div class="lot-partner-item"><span class="k">Организация</span><span class="v">' + this.escapeHtml(profile.organizationName || '—') + '</span></div>' +
                        '<div class="lot-partner-item"><span class="k">ИНН</span><span class="v">' + this.escapeHtml(profile.inn || '—') + '</span></div>' +
                        '<div class="lot-partner-item"><span class="k">ФИО</span><span class="v">' + this.escapeHtml([profile.lastName, profile.firstName, profile.patronymic].filter(Boolean).join(' ') || '—') + '</span></div>' +
                        '<div class="lot-partner-item"><span class="k">ОГРНИП</span><span class="v">' + this.escapeHtml(profile.ogrnip || '—') + '</span></div>' +
                        '<div class="lot-partner-item"><span class="k">Телефон</span><span class="v">' + this.escapeHtml((userData && userData.phone) || '—') + '</span></div>' +
                        '<div class="lot-partner-item"><span class="k">Email</span><span class="v">' + this.escapeHtml((userData && userData.email) || '—') + '</span></div>' +
                    '</div>' +
                '</section>'
            )
            : (
                '<section class="lot-partner-card">' +
                    '<h4 class="lot-partner-title"><i class="fas fa-user-tie"></i> Контрагент</h4>' +
                    '<p class="deal-modal-empty" style="margin-top:0.45rem;">Не удалось получить данные предпринимателя.</p>' +
                '</section>'
            );

        const profileName = profile
            ? ([profile.lastName, profile.firstName, profile.patronymic].filter(Boolean).join(' ') || profile.organizationName || '—')
            : 'Контрагент не найден';
        const dossierMeta =
            '<div class="lot-rich-meta-line">' +
                '<span class="lot-rich-meta-created"><i class="fas fa-calendar-alt"></i> Создано: ' + this.escapeHtml(createdAtText) + '</span>' +
                '<span class="lot-status-chip ' + this.escapeHtml(this.getToneLabelClass(tone)) + '">' + this.escapeHtml(status) + '</span>' +
            '</div>';
        const dossierCard =
            '<section class="lot-dossier-card">' +
                '<div class="lot-dossier-shell">' +
                    '<section class="lot-dossier-primary">' +
                        '<div class="lot-dossier-titleline">' +
                            '<span class="title">Профиль контрагента</span>' +
                            '<div class="lot-dossier-head-volume">' +
                                '<span class="k">' + (isDeals ? 'Объем сделки' : 'Готов перевезти') + '</span>' +
                                '<span class="v"><i class="fas fa-weight-hanging"></i> ' + this.escapeHtml(volumeText) + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="lot-dossier-head">' +
                            '<div class="lot-dossier-avatar"><i class="fas fa-user"></i></div>' +
                            '<div>' +
                                '<h4 class="lot-dossier-fio">' + this.escapeHtml(profileName) + '</h4>' +
                                '<div class="lot-dossier-org">' + this.escapeHtml((profile && profile.organizationName) || '—') + '</div>' +
                            '</div>' +
                        '</div>' +
                    '</section>' +
                    '<div class="lot-dossier-kpi-strip">' +
                        '<div class="lot-dossier-kpi"><span class="k">ИНН</span><span class="v">' + this.escapeHtml((profile && profile.inn) || '—') + '</span></div>' +
                        '<div class="lot-dossier-kpi"><span class="k">ОГРНИП</span><span class="v">' + this.escapeHtml((profile && profile.ogrnip) || '—') + '</span></div>' +
                        '<div class="lot-dossier-kpi focus"><span class="k">Публичный ID</span><span class="v">№ ' + this.escapeHtml(item.uniqueCode || '—') + '</span></div>' +
                    '</div>' +
                    '<div class="lot-dossier-contact-bar">' +
                        '<div class="lot-dossier-contact-pill"><span class="k">Телефон</span><span class="v">' + this.escapeHtml((userData && userData.phone) || '—') + '</span></div>' +
                        '<div class="lot-dossier-contact-pill"><span class="k">Email</span><span class="v">' + this.escapeHtml((userData && userData.email) || '—') + '</span></div>' +
                    '</div>' +
                    '<div class="lot-dossier-legal">' +
                        '<h5 class="lot-dossier-legal-title"><i class="fas fa-scale-balanced"></i> Юридический профиль</h5>' +
                        '<div class="lot-dossier-legal-grid">' +
                            '<div class="lot-dossier-legal-item"><span class="k">Юр. адрес</span><span class="v">' + this.escapeHtml((profile && profile.legalAddress) || '—') + '</span></div>' +
                            '<div class="lot-dossier-legal-item"><span class="k">Организация</span><span class="v">' + this.escapeHtml((profile && profile.organizationName) || '—') + '</span></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="lot-dossier-finance">' +
                        '<button type="button" class="lot-dossier-finance-toggle" data-finance-toggle>' +
                            '<span><i class="fas fa-landmark" style="margin-right:0.4rem;"></i> Финансовый профиль</span>' +
                            '<i class="fas fa-chevron-down"></i>' +
                        '</button>' +
                        '<div class="lot-dossier-finance-body" data-finance-body>' +
                            '<div class="lot-dossier-finance-grid">' +
                                '<div class="lot-dossier-item"><span class="k">Банк</span><span class="v">' + this.escapeHtml((profile && profile.bankName) || '—') + '</span></div>' +
                                '<div class="lot-dossier-item"><span class="k">БИК</span><span class="v">' + this.escapeHtml((profile && profile.bik) || '—') + '</span></div>' +
                                '<div class="lot-dossier-item"><span class="k">Расчетный счет</span><span class="v">' + this.escapeHtml((profile && profile.checkingAccount) || '—') + '</span></div>' +
                                '<div class="lot-dossier-item"><span class="k">Корр. счет</span><span class="v">' + this.escapeHtml((profile && profile.correspondentAccount) || '—') + '</span></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</section>';

        const transportSection =
            '<section class="lot-rich-section">' +
                '<h4 class="lot-rich-section-title"><i class="fas fa-truck-fast"></i> ' + (isDeals ? 'Состав автопоездов по сделке' : 'Состав автопоездов по заявке') + '</h4>' +
                (list.length
                    ? (
                        '<div class="lot-autotrain-toolbar">' +
                            '<span class="lot-autotrain-count"><i class="fas fa-layer-group"></i> Автопоездов: ' + this.escapeHtml(String(list.length)) + '</span>' +
                            '<div class="lot-autotrain-view-switch">' +
                                '<button type="button" class="lot-autotrain-view-btn is-active" data-autotrain-view-btn="cards"><i class="fas fa-grip-horizontal"></i> Карточки</button>' +
                                '<button type="button" class="lot-autotrain-view-btn" data-autotrain-view-btn="details"><i class="fas fa-list"></i> Детально</button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="lot-autotrain-view is-active" data-autotrain-view="cards">' +
                            '<div class="lot-autotrain-cards-grid">' + list.map(renderAutotrainCompactCard).join('') + '</div>' +
                        '</div>' +
                        '<div class="lot-autotrain-view" data-autotrain-view="details">' +
                            '<div class="lot-autotrain-list">' + list.map(renderAutotrainCard).join('') + '</div>' +
                        '</div>'
                    )
                    : '<p class="deal-modal-empty">Нет данных по автопоездам.</p>'
                ) +
            '</section>';

        const body = isDeals
            ? (dossierMeta + dossierCard + transportSection)
            : (dossierMeta + dossierCard + transportSection);

        if (bodyEl) {
            bodyEl.innerHTML = body;
            bodyEl.querySelectorAll('[data-finance-toggle]').forEach((toggleBtn) => {
                toggleBtn.addEventListener('click', () => {
                    const wrapper = toggleBtn.closest('.lot-dossier-finance');
                    if (!wrapper) return;
                    const bodyBlock = wrapper.querySelector('[data-finance-body]');
                    if (!bodyBlock) return;
                    const open = bodyBlock.classList.toggle('is-open');
                    toggleBtn.classList.toggle('is-open', open);
                });
            });
            bodyEl.querySelectorAll('[data-autotrain-view-btn]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const target = btn.getAttribute('data-autotrain-view-btn') || 'cards';
                    bodyEl.querySelectorAll('[data-autotrain-view-btn]').forEach((b) => {
                        b.classList.toggle('is-active', b === btn);
                    });
                    bodyEl.querySelectorAll('[data-autotrain-view]').forEach((viewEl) => {
                        const key = viewEl.getAttribute('data-autotrain-view') || '';
                        viewEl.classList.toggle('is-active', key === target);
                    });
                });
            });
        }
    },

    closeRequestInfoModal() {
        const overlay = document.getElementById('lotRequestInfoModalOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
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

