document.addEventListener('DOMContentLoaded', () => {
    MyLotsManager.init();
});

const MyLotsManager = {
    currentPage: 1,
    limit: 10,
    isLoading: false,
    hasMore: true,
    lotsById: {},
    filtersMeta: null,
    activeFilterKey: null,
    filters: {
        lotsStatus: null,
        cargoType: null,
        fromRegion: '',
        toRegion: '',
        distanceStart: null,
        distanceEnd: null,
        volumeStart: null,
        volumeEnd: null,
        priceStart: null,
        priceEnd: null
    },

    init() {
        this.lotsGrid = document.getElementById('lotsGrid');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        this.errorState = document.getElementById('errorState');
        this.loadMoreContainer = document.getElementById('loadMoreContainer');
        this.loadMoreBtn = document.getElementById('loadMoreBtn');
        this.retryLoadBtn = document.getElementById('retryLoadBtn');
        this.filtersChips = document.getElementById('lotsFiltersChips');
        this.filtersPanels = document.getElementById('lotsFiltersPanels');

        this.bindEvents();
        this.initFilters().finally(() => this.loadLots(this.currentPage));
    },

    bindEvents() {
        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => {
                this.loadLots(this.currentPage + 1);
            });
        }
        if (this.retryLoadBtn) {
            this.retryLoadBtn.addEventListener('click', () => {
                this.loadLots(this.currentPage);
            });
        }

        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-lot-action="edit"]');
            if (editBtn) {
                const card = editBtn.closest('.lot-card');
                const lotId = card && card.dataset.id;
                if (lotId && this.lotsById[lotId]) {
                    openLotPublishModal(this.lotsById[lotId]);
                    showLotEditPanel();
                }
                return;
            }
            const detailsBtn = e.target.closest('[data-lot-action="details"]');
            if (detailsBtn) {
                const card = detailsBtn.closest('.lot-card');
                const lotId = card && card.dataset.id;
                if (lotId) {
                    window.location.href = '/order/lot/' + encodeURIComponent(String(lotId)) + '/';
                }
                return;
            }
        });

        // Закрытие модалки / действия — переиспользуем те же IDs, что и на deal_detail
        const lotPublishOverlay = document.getElementById('dealLotPublishOverlay');
        const lotPublishCloseBtn = document.getElementById('dealLotPublishCloseBtn');
        const lotPublishEditBtn = document.getElementById('dealLotPublishEditBtn');
        const lotEditCancelBtn = document.getElementById('dealLotEditCancelBtn');
        const lotEditSubmitBtn = document.getElementById('dealLotEditSubmitBtn');

        if (lotPublishCloseBtn) lotPublishCloseBtn.addEventListener('click', closeLotPublishModal);
        if (lotPublishOverlay) {
            lotPublishOverlay.addEventListener('click', (ev) => {
                if (ev.target !== lotPublishOverlay) return;
                closeLotPublishModal();
            });
        }
        if (lotPublishEditBtn) lotPublishEditBtn.addEventListener('click', showLotEditPanel);
        if (lotEditCancelBtn) lotEditCancelBtn.addEventListener('click', closeLotPublishModal);

        if (lotEditSubmitBtn) {
            // Инициализация логики редактирования (скопировано из deal_detail, но самодостаточно)
            _lotEditSubmitOriginalHtml = lotEditSubmitBtn.innerHTML;
            bindDecimalOnlyInputs();
            bindDealLotEditPriceMode();

            lotEditSubmitBtn.addEventListener('click', async function () {
                if (!_lotPublishModalLotId || !_lotPublishModalLot) return;

                const btn = this;
                const errEl = document.getElementById('dealLotEditError');
                if (errEl) {
                    errEl.textContent = '';
                    errEl.style.display = 'none';
                }

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
                        errEl.textContent =
                            kmVal != null && kmVal < 1
                                ? 'Расстояние не может быть меньше 1 км.'
                                : 'Укажите расстояние не менее 1 км.';
                        errEl.style.display = 'block';
                    }
                    return;
                }

                const dto = { id: _lotPublishModalLotId };
                dto.distance = kmVal * 1000;
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
                    // обновим локальные данные и перерисуем карточку
                    try {
                        const updated = Object.assign({}, _lotPublishModalLot, dto);
                        // dto.distance уже в метрах
                        this._updateLotInMemory(updated);
                    } catch (_) { /* ignore */ }

                    // после успешного обновления — перетянуть relations/плашки фильтров,
                    // чтобы обновились min/max/варианты и счетчики
                    try {
                        await this.fetchLotsFiltersMeta();
                        this.renderFiltersUI();
                        // Перетягиваем список заново, чтобы получить пересчитанные поля с бэка
                        await this.loadLots(1);
                    } catch (_) { /* ignore */ }

                    closeLotPublishModal();
                    return;
                }

                if (errEl) {
                    errEl.textContent = 'Не удалось обновить лот. Попробуйте снова.';
                    errEl.style.display = 'block';
                }
            }.bind(this));
        }
    },

    async initFilters() {
        await this.fetchLotsFiltersMeta();
        this.renderFiltersUI();
    },

    async fetchLotsFiltersMeta() {
        const headers = await this.getAuthHeaders();
        if (!headers) { this.filtersMeta = null; return null; }
        // all-filters зависит от текущих фильтров — передаём их тоже
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '10');
        params.set('orderBy', 'created_at');
        params.set('orderDirection', 'ASC');
        if (this.filters.lotsStatus) params.set('lotsStatus', String(this.filters.lotsStatus));
        if (this.filters.cargoType) params.set('cargoType', String(this.filters.cargoType));
        if ((this.filters.fromRegion || '').trim()) params.set('fromRegion', String(this.filters.fromRegion).trim());
        if ((this.filters.toRegion || '').trim()) params.set('toRegion', String(this.filters.toRegion).trim());
        if (this.filters.distanceStart != null) params.set('distanceStart', String(this.filters.distanceStart * 1000));
        if (this.filters.distanceEnd != null) params.set('distanceEnd', String(this.filters.distanceEnd * 1000));
        if (this.filters.volumeStart != null) params.set('volumeStart', String(this.filters.volumeStart));
        if (this.filters.volumeEnd != null) params.set('volumeEnd', String(this.filters.volumeEnd));
        if (this.filters.priceStart != null) params.set('priceStart', String(this.filters.priceStart));
        if (this.filters.priceEnd != null) params.set('priceEnd', String(this.filters.priceEnd));

        const url = API_CONFIG.BASE_URL + '/moderators-module/lots/all-filters?' + params.toString();
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (res.status === 401 || res.status === 403) {
                if (typeof logout === 'function') logout();
                this.filtersMeta = null;
                return null;
            }
            if (!res.ok) { this.filtersMeta = null; return null; }
            const text = await res.text();
            this.filtersMeta = text ? JSON.parse(text) : null;
            return this.filtersMeta;
        } catch (e) {
            console.error('fetchLotsFiltersMeta error', e);
            this.filtersMeta = null;
            return null;
        }
    },

    renderFiltersUI() {
        if (!this.filtersChips || !this.filtersPanels) return;
        this.filtersChips.classList.add('lots-filters');

        const chips = [
            { key: 'lotsStatus', icon: 'layer-group', label: 'Статус' },
            { key: 'cargoType', icon: 'seedling', label: 'Тип груза' },
            { key: 'regions', icon: 'map-marker-alt', label: 'Регионы' },
            { key: 'distance', icon: 'road', label: 'Расстояние' },
            { key: 'volume', icon: 'weight-hanging', label: 'Объём' },
            { key: 'price', icon: 'ruble-sign', label: 'Цена за тонну' }
        ];

        this.filtersChips.innerHTML = chips.map(c => {
            const valueText = this.getChipValueText(c.key);
            return (
                '<button type="button" class="filter-tab" data-filter-chip="' + this.escapeHtml(c.key) + '">' +
                    '<i class="fas fa-' + this.escapeHtml(c.icon) + '"></i>' +
                    '<span>' + this.escapeHtml(c.label) + '</span>' +
                    (valueText ? ('<span class="chip-value">' + this.escapeHtml(valueText) + '</span>') : '') +
                '</button>'
            );
        }).join('');

        this.filtersPanels.style.display = this.activeFilterKey ? '' : 'none';
        this.filtersPanels.innerHTML = this.activeFilterKey ? this.renderActivePanelHtml(this.activeFilterKey) : '';

        // chip click
        this.filtersChips.querySelectorAll('[data-filter-chip]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-filter-chip');
                this.activeFilterKey = (this.activeFilterKey === key) ? null : key;
                this.updateFiltersUIActiveState();
            });
        });

        this.updateFiltersUIActiveState();
        this.updateSelectedFiltersCount();

        const resetAllBtn = document.getElementById('lotsResetAllBtn');
        if (resetAllBtn) {
            resetAllBtn.onclick = () => {
                this.resetAllFilters();
                this.activeFilterKey = null;
                this.renderFiltersUI();
                this.loadLots(1);
            };
        }
    },

    updateFiltersUIActiveState() {
        if (!this.filtersChips || !this.filtersPanels) return;
        this.filtersChips.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        if (this.activeFilterKey) {
            const activeBtn = this.filtersChips.querySelector('[data-filter-chip="' + this.activeFilterKey + '"]');
            if (activeBtn) activeBtn.classList.add('active');
            this.filtersPanels.style.display = '';
            // Для статуса/типа груза: панель не показываем, делаем выпадающий список
            if (this.activeFilterKey === 'lotsStatus' || this.activeFilterKey === 'cargoType') {
                this.filtersPanels.style.display = 'none';
                this.filtersPanels.innerHTML = '';
                this.openSimpleDropdown(this.activeFilterKey);
            } else {
                this.closeSimpleDropdown();
                this.filtersPanels.innerHTML = this.renderActivePanelHtml(this.activeFilterKey);
                this.bindActivePanelEvents(this.activeFilterKey);
            }
        } else {
            this.closeSimpleDropdown();
            this.filtersPanels.style.display = 'none';
            this.filtersPanels.innerHTML = '';
        }
    },

    updateSelectedFiltersCount() {
        const el = document.getElementById('lotsSelectedFiltersCount');
        if (!el) return;
        let n = 0;
        if (this.filters.lotsStatus) n++;
        if (this.filters.cargoType) n++;
        if ((this.filters.fromRegion || '').trim()) n++;
        if ((this.filters.toRegion || '').trim()) n++;
        if (this.filters.distanceStart != null || this.filters.distanceEnd != null) n++;
        if (this.filters.volumeStart != null || this.filters.volumeEnd != null) n++;
        if (this.filters.priceStart != null || this.filters.priceEnd != null) n++;
        el.innerHTML = 'Выбраны фильтры: <span class="count">' + String(n) + '</span>';
    },

    resetAllFilters() {
        this.filters = {
            lotsStatus: null,
            cargoType: null,
            fromRegion: '',
            toRegion: '',
            distanceStart: null,
            distanceEnd: null,
            volumeStart: null,
            volumeEnd: null,
            priceStart: null,
            priceEnd: null
        };
    },

    closeSimpleDropdown() {
        const dd = document.getElementById('lotsSimpleDropdown');
        if (dd && dd.parentNode) dd.parentNode.removeChild(dd);
    },

    openSimpleDropdown(key) {
        this.closeSimpleDropdown();
        const btn = this.filtersChips && this.filtersChips.querySelector('[data-filter-chip="' + key + '"]');
        if (!btn) return;

        const items = key === 'lotsStatus'
            ? (this.filtersMeta && Array.isArray(this.filtersMeta.lotsStatus) ? this.filtersMeta.lotsStatus : [])
            : (this.filtersMeta && Array.isArray(this.filtersMeta.cargoType) ? this.filtersMeta.cargoType : []);

        const rect = btn.getBoundingClientRect();
        const dd = document.createElement('div');
        dd.id = 'lotsSimpleDropdown';
        dd.style.position = 'absolute';
        dd.style.zIndex = '10050';
        dd.style.minWidth = Math.min(360, Math.max(260, rect.width)) + 'px';
        dd.style.maxWidth = '420px';
        dd.style.left = (rect.left + window.scrollX) + 'px';
        dd.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        dd.style.background = '#fff';
        dd.style.border = '1px solid rgba(148, 163, 184, 0.35)';
        dd.style.borderRadius = '14px';
        dd.style.boxShadow = '0 10px 30px rgba(0,0,0,0.10)';
        dd.style.padding = '0.4rem';
        dd.style.maxHeight = '360px';
        dd.style.overflowY = 'auto';

        const current = key === 'lotsStatus' ? this.filters.lotsStatus : this.filters.cargoType;

        const makeItem = (value, label) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.style.width = '100%';
            b.style.textAlign = 'left';
            b.style.padding = '0.65rem 0.75rem';
            b.style.border = 'none';
            b.style.borderRadius = '12px';
            b.style.background = 'transparent';
            b.style.cursor = 'pointer';
            b.style.fontFamily = 'inherit';
            b.style.fontSize = '0.95rem';
            b.style.fontWeight = (String(current || '') === String(value || '')) ? '900' : '700';
            b.style.color = (String(current || '') === String(value || '')) ? '#1d4ed8' : '#0f172a';
            b.textContent = label;
            b.onmouseenter = () => { b.style.background = 'rgba(15, 23, 42, 0.05)'; };
            b.onmouseleave = () => { b.style.background = 'transparent'; };
            b.onclick = () => {
                if (key === 'lotsStatus') this.filters.lotsStatus = value ? String(value) : null;
                else this.filters.cargoType = value ? String(value) : null;
                this.activeFilterKey = null;
                this.renderFiltersUI();
                this.loadLots(1);
            };
            return b;
        };

        dd.appendChild(makeItem('', 'Не важно'));
        items.forEach(it => dd.appendChild(makeItem(it.id, it.name)));

        document.body.appendChild(dd);

        const onDoc = (ev) => {
            const t = ev.target;
            if (dd.contains(t) || btn.contains(t)) return;
            document.removeEventListener('mousedown', onDoc, true);
            this.activeFilterKey = null;
            this.closeSimpleDropdown();
            this.updateFiltersUIActiveState();
        };
        document.addEventListener('mousedown', onDoc, true);
    },

    getChipValueText(key) {
        if (key === 'lotsStatus') {
            if (!this.filters.lotsStatus) return '';
            const item = this.filtersMeta && Array.isArray(this.filtersMeta.lotsStatus)
                ? this.filtersMeta.lotsStatus.find(x => String(x.id) === String(this.filters.lotsStatus))
                : null;
            return item && item.name ? item.name : String(this.filters.lotsStatus);
        }
        if (key === 'cargoType') {
            if (!this.filters.cargoType) return '';
            const item = this.filtersMeta && Array.isArray(this.filtersMeta.cargoType)
                ? this.filtersMeta.cargoType.find(x => String(x.id) === String(this.filters.cargoType))
                : null;
            return item && item.name ? item.name : String(this.filters.cargoType);
        }
        if (key === 'regions') {
            const a = (this.filters.fromRegion || '').trim();
            const b = (this.filters.toRegion || '').trim();
            if (!a && !b) return '';
            if (a && !b) return 'от ' + a;
            if (!a && b) return 'до ' + b;
            return a + ' → ' + b;
        }
        const fmtRange = (start, end, unit) => {
            if (start == null && end == null) return '';
            if (start != null && end == null) return 'от ' + start + ' ' + unit;
            if (start == null && end != null) return 'до ' + end + ' ' + unit;
            return 'от ' + start + ' ' + unit + ' до ' + end + ' ' + unit;
        };
        if (key === 'distance') return fmtRange(this.filters.distanceStart, this.filters.distanceEnd, 'км');
        if (key === 'volume') return fmtRange(this.filters.volumeStart, this.filters.volumeEnd, 'т');
        if (key === 'price') return fmtRange(this.filters.priceStart, this.filters.priceEnd, '₽');
        return '';
    },

    renderActivePanelHtml(key) {
        if (key === 'lotsStatus') {
            const opts = this.filtersMeta && Array.isArray(this.filtersMeta.lotsStatus) ? this.filtersMeta.lotsStatus : [];
            const optionsHtml = ['<option value="">Не важно</option>'].concat(opts.map(o => (
                '<option value="' + this.escapeHtml(String(o.id)) + '"' +
                    (String(this.filters.lotsStatus || '') === String(o.id) ? ' selected' : '') +
                '>' + this.escapeHtml(o.name) + '</option>'
            ))).join('');
            return (
                '<div class="lots-filter-panel" data-filter-panel="lotsStatus">' +
                    '<div class="lots-filter-panel-title">Статус</div>' +
                    '<div class="lots-filter-row">' +
                        '<div class="field"><label>Статус</label><select id="lotsStatusSelect">' + optionsHtml + '</select></div>' +
                    '</div>' +
                    '<div class="lots-filter-actions">' +
                        '<button type="button" class="btn btn-outline" data-filter-reset>Сбросить</button>' +
                        '<button type="button" class="btn btn-primary" data-filter-apply>Применить</button>' +
                    '</div>' +
                '</div>'
            );
        }
        if (key === 'cargoType') {
            const opts = this.filtersMeta && Array.isArray(this.filtersMeta.cargoType) ? this.filtersMeta.cargoType : [];
            const optionsHtml = ['<option value="">Не важно</option>'].concat(opts.map(o => (
                '<option value="' + this.escapeHtml(String(o.id)) + '"' +
                    (String(this.filters.cargoType || '') === String(o.id) ? ' selected' : '') +
                '>' + this.escapeHtml(o.name) + '</option>'
            ))).join('');
            return (
                '<div class="lots-filter-panel" data-filter-panel="cargoType">' +
                    '<div class="lots-filter-panel-title">Тип груза</div>' +
                    '<div class="lots-filter-row">' +
                        '<div class="field"><label>Тип груза</label><select id="cargoTypeSelect">' + optionsHtml + '</select></div>' +
                    '</div>' +
                    '<div class="lots-filter-actions">' +
                        '<button type="button" class="btn btn-outline" data-filter-reset>Сбросить</button>' +
                        '<button type="button" class="btn btn-primary" data-filter-apply>Применить</button>' +
                    '</div>' +
                '</div>'
            );
        }
        if (key === 'regions') {
            const fromOpts = this.filtersMeta && Array.isArray(this.filtersMeta.fromRegion) ? this.filtersMeta.fromRegion : [];
            const toOpts = this.filtersMeta && Array.isArray(this.filtersMeta.toRegion) ? this.filtersMeta.toRegion : [];
            const fromOptionsHtml = ['<option value="">Не важно</option>'].concat(fromOpts.map(o => (
                '<option value="' + this.escapeHtml(String(o.value)) + '"' +
                    (String(this.filters.fromRegion || '') === String(o.value) ? ' selected' : '') +
                '>' + this.escapeHtml(String(o.value)) + '</option>'
            ))).join('');
            const toOptionsHtml = ['<option value="">Не важно</option>'].concat(toOpts.map(o => (
                '<option value="' + this.escapeHtml(String(o.value)) + '"' +
                    (String(this.filters.toRegion || '') === String(o.value) ? ' selected' : '') +
                '>' + this.escapeHtml(String(o.value)) + '</option>'
            ))).join('');
            return (
                '<div class="lots-filter-panel" data-filter-panel="regions">' +
                    '<div class="lots-filter-panel-title">Регионы</div>' +
                    '<div class="lots-filter-row">' +
                        '<div class="field"><label>Откуда (регион)</label><select id="fromRegionSelect">' + fromOptionsHtml + '</select></div>' +
                        '<div class="field"><label>Куда (регион)</label><select id="toRegionSelect">' + toOptionsHtml + '</select></div>' +
                    '</div>' +
                    '<div class="lots-filter-actions">' +
                        '<button type="button" class="btn btn-outline" data-filter-reset>Сбросить</button>' +
                        '<button type="button" class="btn btn-primary" data-filter-apply>Применить</button>' +
                    '</div>' +
                '</div>'
            );
        }
        const rangePanel = (panelKey, title, unit, startVal, endVal) => (
            '<div class="lots-filter-panel" data-filter-panel="' + panelKey + '">' +
                '<div class="lots-filter-panel-title">' + title + '</div>' +
                '<div class="lots-filter-row">' +
                    '<div class="field"><label>От (' + unit + ')</label><input id="' + panelKey + 'Start" type="text" inputmode="decimal" value="' + this.escapeHtml(startVal != null ? String(startVal) : '') + '"></div>' +
                    '<div class="field"><label>До (' + unit + ')</label><input id="' + panelKey + 'End" type="text" inputmode="decimal" value="' + this.escapeHtml(endVal != null ? String(endVal) : '') + '"></div>' +
                '</div>' +
                '<div class="lots-filter-actions">' +
                    '<button type="button" class="btn btn-outline" data-filter-reset>Сбросить</button>' +
                    '<button type="button" class="btn btn-primary" data-filter-apply>Применить</button>' +
                '</div>' +
            '</div>'
        );
        if (key === 'distance') return rangePanel('distance', 'Расстояние', 'км', this.filters.distanceStart, this.filters.distanceEnd);
        if (key === 'volume') return rangePanel('volume', 'Объём', 'т', this.filters.volumeStart, this.filters.volumeEnd);
        if (key === 'price') return rangePanel('price', 'Цена за тонну', '₽', this.filters.priceStart, this.filters.priceEnd);
        return '';
    },

    bindActivePanelEvents(key) {
        const panel = this.filtersPanels && this.filtersPanels.querySelector('[data-filter-panel]');
        if (!panel) return;

        const parseMaybe = (v) => {
            const s = String(v || '').trim();
            if (!s) return null;
            const n = parseFloat(s.replace(',', '.'));
            return isNaN(n) ? null : n;
        };

        const applyBtn = panel.querySelector('[data-filter-apply]');
        const resetBtn = panel.querySelector('[data-filter-reset]');

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (key === 'lotsStatus') this.filters.lotsStatus = null;
                else if (key === 'cargoType') this.filters.cargoType = null;
                else if (key === 'regions') { this.filters.fromRegion = ''; this.filters.toRegion = ''; }
                else if (key === 'distance') { this.filters.distanceStart = null; this.filters.distanceEnd = null; }
                else if (key === 'volume') { this.filters.volumeStart = null; this.filters.volumeEnd = null; }
                else if (key === 'price') { this.filters.priceStart = null; this.filters.priceEnd = null; }
                this.activeFilterKey = null;
                this.renderFiltersUI();
                this.loadLots(1);
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (key === 'lotsStatus') {
                    const sel = panel.querySelector('#lotsStatusSelect');
                    this.filters.lotsStatus = sel && sel.value ? sel.value : null;
                } else if (key === 'cargoType') {
                    const sel = panel.querySelector('#cargoTypeSelect');
                    this.filters.cargoType = sel && sel.value ? sel.value : null;
                } else if (key === 'regions') {
                    const a = panel.querySelector('#fromRegionSelect');
                    const b = panel.querySelector('#toRegionSelect');
                    this.filters.fromRegion = a && a.value ? String(a.value) : '';
                    this.filters.toRegion = b && b.value ? String(b.value) : '';
                } else if (key === 'distance') {
                    this.filters.distanceStart = parseMaybe(panel.querySelector('#distanceStart')?.value);
                    this.filters.distanceEnd = parseMaybe(panel.querySelector('#distanceEnd')?.value);
                } else if (key === 'volume') {
                    this.filters.volumeStart = parseMaybe(panel.querySelector('#volumeStart')?.value);
                    this.filters.volumeEnd = parseMaybe(panel.querySelector('#volumeEnd')?.value);
                } else if (key === 'price') {
                    this.filters.priceStart = parseMaybe(panel.querySelector('#priceStart')?.value);
                    this.filters.priceEnd = parseMaybe(panel.querySelector('#priceEnd')?.value);
                }

                this.activeFilterKey = null;
                this.renderFiltersUI();
                this.loadLots(1);
            });
        }
    },

    _updateLotInMemory(partial) {
        const id = partial && partial.id != null ? String(partial.id) : '';
        if (!id) return;
        const prev = this.lotsById[id] || {};
        const next = Object.assign({}, prev, partial);
        this.lotsById[id] = next;
        const cardEl = document.getElementById('lotCard_' + id);
        if (cardEl) cardEl.outerHTML = this.renderLotCard(next);
    },

    async getAuthHeaders() {
        if (typeof getAuthTokens !== 'function') return null;
        const authResult = await getAuthTokens();
        if (authResult.status === 403 || authResult.status === 409) {
            if (typeof logout === 'function') logout();
            return null;
        }
        if (!authResult.data || !authResult.data.accessToken) return null;
        return {
            'Authorization': 'Bearer ' + authResult.data.accessToken,
            'Content-Type': 'application/json'
        };
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
        } catch (_) {
            return iso;
        }
    },

    formatNumber(num) {
        if (num == null || isNaN(num)) return '—';
        return Number(num).toLocaleString('ru-RU');
    },

    formatPrice(val) {
        if (val == null || val === '') return '—';
        const n = parseFloat(String(val).replace(',', '.'));
        return isNaN(n) ? String(val) : n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    getLotCultureName(lot) {
        const crops = lot && lot.crops ? lot.crops : null;
        const cropType = crops && crops.cropsType ? crops.cropsType : null;
        return (cropType && cropType.name) || lot.cropsName || '—';
    },

    getLotStatusName(lot) {
        const st = lot && lot.lotsStatus ? lot.lotsStatus : null;
        return (st && st.name) || '—';
    },

    getRegionName(v) {
        if (!v) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'object') return v.name || v.title || v.regionName || '';
        return '';
    },

    renderLotCard(lot) {
        const id = lot && lot.id != null ? String(lot.id) : '';
        const uniqueCode = lot && lot.uniqueCode != null ? String(lot.uniqueCode) : '';
        const statusName = this.getLotStatusName(lot);
        const cultureName = this.getLotCultureName(lot);

        const fromRegion =
            this.getRegionName(lot && lot.fromRegion) ||
            this.getRegionName(lot && lot.fromRegionName) ||
            this.getRegionName(lot && lot.fromRegionTitle) ||
            '';
        const toRegion =
            this.getRegionName(lot && lot.toRegion) ||
            this.getRegionName(lot && lot.toRegionName) ||
            this.getRegionName(lot && lot.toRegionTitle) ||
            '';

        const startDate = lot && lot.startDate ? this.formatDate(lot.startDate) : '';
        const endDate = lot && lot.deadline ? this.formatDate(lot.deadline) : '';
        const daysToUnloading = lot && lot.daysToUnloading != null ? String(lot.daysToUnloading) : '';

        const distanceM = parseFloat(String(lot && lot.distance != null ? lot.distance : '').replace(',', '.'));
        const distanceKm = !isNaN(distanceM) ? (distanceM / 1000) : null;

        const volumeNum = parseFloat(String(lot && lot.volume != null ? lot.volume : '').replace(',', '.'));
        const transportCoeffNum = parseFloat(String(lot && lot.transportCoefficient != null ? lot.transportCoefficient : '').replace(',', '.'));
        const pricePerTonNum = parseFloat(String(lot && lot.pricePerTon != null ? lot.pricePerTon : '').replace(',', '.'));

        const hasAnyRoute = Boolean(fromRegion) || Boolean(toRegion);
        const routeFromText = fromRegion ? fromRegion : '—';
        const routeToText = toRegion ? toRegion : '—';
        const routeHtml = hasAnyRoute
            ? (this.escapeHtml(routeFromText) + '<br>' + this.escapeHtml(routeToText))
            : '—';

        const hasDates = Boolean(startDate) && Boolean(endDate);
        const dateLabel = hasDates ? 'Дата перевозки' : 'Кол-во дней перевозки';
        const dateValueHtml = hasDates
            ? (this.escapeHtml(startDate) + '<br>' + this.escapeHtml(endDate))
            : (daysToUnloading ? (this.escapeHtml(daysToUnloading) + ' дн.') : '—');

        const priceTonText = !isNaN(pricePerTonNum) ? (this.formatPrice(pricePerTonNum) + ' ₽/т') : '—';
        const totalTransportCostNum =
            !isNaN(volumeNum) && !isNaN(pricePerTonNum) ? (volumeNum * pricePerTonNum) : NaN;
        const totalTransportCostText =
            !isNaN(totalTransportCostNum) ? (this.formatPrice(totalTransportCostNum) + ' ₽') : '—';

        return (
            '<div class="lot-card" id="lotCard_' + this.escapeHtml(id) + '" data-id="' + this.escapeHtml(id) + '">' +
                '<div class="lot-header">' +
                    '<div class="lot-title">' +
                        this.escapeHtml(cultureName) +
                        (uniqueCode ? (' <span class="lot-ucode">№ ' + this.escapeHtml(uniqueCode) + '</span>') : '') +
                    '</div>' +
                    '<div class="lot-header-status"><span class="deal-status-badge deal-status-5">' + this.escapeHtml(statusName) + '</span></div>' +
                '</div>' +
                '<div class="lot-body">' +
                    '<div class="lot-pill"><span class="lot-pill-label">Откуда / Куда</span><span class="lot-pill-value">' + routeHtml + '</span></div>' +
                    '<div class="lot-pill"><span class="lot-pill-label">' + this.escapeHtml(dateLabel) + '</span><span class="lot-pill-value">' + dateValueHtml + '</span></div>' +
                    '<div class="lot-pill"><span class="lot-pill-label">Объём</span><span class="lot-pill-value">' + (!isNaN(volumeNum) ? (this.formatNumber(volumeNum) + ' т') : '—') + '</span></div>' +
                    '<div class="lot-pill"><span class="lot-pill-label">Коэф. перевозки</span><span class="lot-pill-value">' + (!isNaN(transportCoeffNum) ? this.formatPrice(transportCoeffNum) : '—') + '</span></div>' +
                    '<div class="lot-pill"><span class="lot-pill-label">Расстояние</span><span class="lot-pill-value">' + (distanceKm != null ? (this.formatNumber(Math.round(distanceKm * 100) / 100) + ' км') : '—') + '</span></div>' +
                    '<div class="lot-pill"><span class="lot-pill-label">Общая сумма</span><span class="lot-pill-value emph">' + this.escapeHtml(totalTransportCostText) + '</span></div>' +
                '</div>' +
                '<div class="lot-price-ton lot-price-ton-bottom">' + this.escapeHtml(priceTonText) + '</div>' +
                '<div class="lot-footer">' +
                    '<div class="lot-actions">' +
                        '<button type="button" class="btn btn-secondary" data-lot-action="edit"><i class="fas fa-edit"></i> Редактировать</button>' +
                        '<button type="button" class="btn btn-primary" data-lot-action="details"><i class="fas fa-chevron-right"></i> Подробнее</button>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    },

    buildLotsQueryParams(page) {
        const p = new URLSearchParams();
        p.set('page', String(page));
        p.set('limit', String(this.limit));
        p.set('orderBy', 'created_at');
        p.set('orderDirection', 'DESC');

        if (this.filters.lotsStatus) p.set('lotsStatus', String(this.filters.lotsStatus));
        if (this.filters.cargoType) p.set('cargoType', String(this.filters.cargoType));
        if ((this.filters.fromRegion || '').trim()) p.set('fromRegion', String(this.filters.fromRegion).trim());
        if ((this.filters.toRegion || '').trim()) p.set('toRegion', String(this.filters.toRegion).trim());

        // distanceStart/distanceEnd: пользователь вводит км, на бэк отправляем метры
        if (this.filters.distanceStart != null) p.set('distanceStart', String(this.filters.distanceStart * 1000));
        if (this.filters.distanceEnd != null) p.set('distanceEnd', String(this.filters.distanceEnd * 1000));
        if (this.filters.volumeStart != null) p.set('volumeStart', String(this.filters.volumeStart));
        if (this.filters.volumeEnd != null) p.set('volumeEnd', String(this.filters.volumeEnd));
        if (this.filters.priceStart != null) p.set('priceStart', String(this.filters.priceStart));
        if (this.filters.priceEnd != null) p.set('priceEnd', String(this.filters.priceEnd));

        return p;
    },

    async fetchLotsPage(page) {
        const headers = await this.getAuthHeaders();
        if (!headers) return { ok: false, data: [] };
        const params = this.buildLotsQueryParams(page);
        const url = API_CONFIG.BASE_URL + '/moderators-module/lots/all?' + params.toString();
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (res.status === 401 || res.status === 403) {
                if (typeof logout === 'function') logout();
                return { ok: false, data: [] };
            }
            if (!res.ok) return { ok: false, data: [] };
            const text = await res.text();
            if (!text) return { ok: true, data: [] };
            const parsed = JSON.parse(text);
            const list = (parsed && Array.isArray(parsed.data)) ? parsed.data : [];
            return { ok: true, data: list };
        } catch (e) {
            console.error('fetchLotsPage error', e);
            return { ok: false, data: [] };
        }
    },

    async loadLots(page) {
        if (this.isLoading) return;
        if (!this.hasMore && page !== 1) return;
        this.isLoading = true;

        if (page === 1) {
            if (this.lotsGrid) this.lotsGrid.innerHTML = '';
            this.currentPage = 1;
            this.hasMore = true;
            this.lotsById = {};
            this.showState('loading');
        } else {
            this.showLoadMoreLoading(true);
        }

        const result = await this.fetchLotsPage(page);
        if (!result.ok) {
            this.isLoading = false;
            this.showLoadMoreLoading(false);
            this.showState('error');
            return;
        }

        const list = result.data || [];
        if (list.length === 0) {
            if (page === 1) this.showState('empty');
            this.hasMore = false;
            this.showLoadMore(false);
            this.isLoading = false;
            return;
        }

        const html = list.map(l => {
            const id = l && l.id != null ? String(l.id) : '';
            if (id) this.lotsById[id] = l;
            return this.renderLotCard(l);
        }).join('');

        if (this.lotsGrid) this.lotsGrid.insertAdjacentHTML('beforeend', html);
        this.currentPage = page;
        this.hasMore = list.length === this.limit;
        this.showState('list');
        this.showLoadMore(this.hasMore);
        this.showLoadMoreLoading(false);
        this.isLoading = false;
    },

    showState(state) {
        const show = (el, yes) => { if (el) el.style.display = yes ? '' : 'none'; };
        show(this.loadingState, state === 'loading');
        show(this.emptyState, state === 'empty');
        show(this.errorState, state === 'error');
        // grid is always visible when not loading, but keep it if has content
    },

    showLoadMore(show) {
        if (!this.loadMoreContainer) return;
        this.loadMoreContainer.style.display = show ? 'flex' : 'none';
    },

    showLoadMoreLoading(loading) {
        if (!this.loadMoreBtn) return;
        if (loading) {
            this.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
            this.loadMoreBtn.disabled = true;
        } else {
            this.loadMoreBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Загрузить еще';
            this.loadMoreBtn.disabled = false;
        }
    }
};

// --- Модалка / редактирование (минимальный набор из deal_detail.js) ---
let _lotPublishModalLot = null;
let _lotPublishModalLotId = null;
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
    if (publishPanel) publishPanel.style.display = 'none';
    if (editPanel) editPanel.style.display = '';

    const editErrEl = document.getElementById('dealLotEditError');
    if (editErrEl) {
        editErrEl.style.display = 'none';
        editErrEl.textContent = '';
    }

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
    resetDealLotEditSubmitButton();
}

function showLotEditPanel() {
    const editPanel = document.getElementById('dealLotEditPanel');
    if (editPanel) editPanel.style.display = '';

    const distInput = document.getElementById('dealLotEditDistanceInput');
    const tcInput = document.getElementById('dealLotEditTransportCoeffInput');
    const priceInput = document.getElementById('dealLotEditPricePerTonInput');
    const manualCb = document.getElementById('dealLotEditManualPriceCheckbox');
    if (manualCb) manualCb.checked = false;

    const distM = _lotPublishModalLot && _lotPublishModalLot.distance != null
        ? parseFloat(String(_lotPublishModalLot.distance).replace(',', '.'))
        : NaN;
    if (distInput) distInput.value = !isNaN(distM) ? formatLotEditDecimalForInput(distM / 1000) : '';
    if (tcInput) tcInput.value = _lotPublishModalLot && _lotPublishModalLot.transportCoefficient != null ? String(_lotPublishModalLot.transportCoefficient) : '';
    if (priceInput) priceInput.value = _lotPublishModalLot && _lotPublishModalLot.pricePerTon != null ? String(_lotPublishModalLot.pricePerTon) : '';

    syncLotEditFieldLocks();
    recalcLotEditFields();
}

async function goToUpdateLot(dto) {
    const urlPath = '/moderators-module/lots/update';
    const headers = await MyLotsManager.getAuthHeaders();
    if (!headers) return { ok: false, status: null };
    try {
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

function sanitizeDecimalInputString(s) {
    const normalized = String(s || '').replace(/,/g, '.');
    let out = '';
    let dotSeen = false;
    for (let i = 0; i < normalized.length; i++) {
        const c = normalized.charAt(i);
        if (c >= '0' && c <= '9') out += c;
        else if (c === '.' && !dotSeen) {
            dotSeen = true;
            out += '.';
        }
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

