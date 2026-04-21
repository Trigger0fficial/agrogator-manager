document.addEventListener('DOMContentLoaded', () => {
    RequestDetailPage.init();
});

const RequestDetailPage = {
    requestId: null,
    request: null,
    user: null,
    cropsProperties: [],
    relationsByUser: null, // { drivers:[], trucks:[], trailer:[] ... }
    autotrainConfig: {
        isOpen: false,
        trains: [], // [{ truckId, trailerId, driverId }]
        initialSnapshot: null,
        hasChanges: false,
        readyVolume: null,
        pick: { trainIndex: -1, kind: '', search: '' },
        isSaving: false,
        isLoadingRelations: false
    },
    directory: {
        isOpen: false,
        tab: 'trucks', // trucks | trailer | drivers
        search: ''
    },
    autotrainFilters: {
        search: '',
        truckReg: '',
        trailerReg: '',
        driver: ''
    },

    init() {
        this.requestId = this.getRequestId();
        this.bindEvents();
        if (!this.requestId) {
            this.showError('Не удалось определить идентификатор заявки.');
            return;
        }
        this.load();
    },

    getRequestId() {
        const el = document.getElementById('requestId');
        const value = el ? String(el.value || '').trim() : '';
        if (value) return value;
        const fromUrl = window.location.pathname.match(/\/request\/([^/]+)\/?$/);
        return fromUrl && fromUrl[1] ? fromUrl[1] : '';
    },

    bindEvents() {
        document.getElementById('requestBackBtn')?.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/order/my-lots/';
            }
        });

        document.querySelectorAll('[data-view-btn]').forEach((btn) => {
            btn.addEventListener('click', () => this.setView(btn.getAttribute('data-view-btn') || 'cards'));
        });

        document.getElementById('rqInfoModalClose')?.addEventListener('click', () => this.closeInfoModal());
        document.getElementById('rqInfoModalOverlay')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'rqInfoModalOverlay') this.closeInfoModal();
        });

        // Autotrain config modal
        document.getElementById('addAutotrainBtn')?.addEventListener('click', () => this.openAutotrainConfigModal());
        document.getElementById('rqAutotrainModalClose')?.addEventListener('click', () => this.closeAutotrainConfigModal());
        document.getElementById('rqAutotrainCancelBtn')?.addEventListener('click', () => this.closeAutotrainConfigModal());
        document.getElementById('rqAutotrainModalOverlay')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'rqAutotrainModalOverlay') this.closeAutotrainConfigModal();
        });
        document.getElementById('rqAddTrainRowBtn')?.addEventListener('click', () => this.addTrainRow());
        document.getElementById('rqAutotrainSaveBtn')?.addEventListener('click', () => this.saveAutotrainConfig());

        // Pick modal
        document.getElementById('rqPickModalClose')?.addEventListener('click', () => this.closePickModal());
        document.getElementById('rqPickModalOverlay')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'rqPickModalOverlay') this.closePickModal();
        });
        document.getElementById('rqPickSearchInput')?.addEventListener('input', (e) => {
            this.autotrainConfig.pick.search = String(e.target?.value || '');
            this.renderPickModal();
        });

        // Volume input (inside autotrain modal)
        document.getElementById('rqReadyVolumeInput')?.addEventListener('input', (e) => {
            const raw = String(e.target?.value || '');
            const cleaned = this.sanitizeDecimalInputString(raw);
            if (cleaned !== raw) e.target.value = cleaned;
            this.autotrainConfig.readyVolume = cleaned.trim() === '' ? null : this.parseMaybeNumber(cleaned);
            this.updateAutotrainSaveAvailability();
        });

        // Directory modal
        document.getElementById('rqOpenDirectoryBtn')?.addEventListener('click', () => this.openDirectoryModal());
        document.getElementById('rqDirectoryModalClose')?.addEventListener('click', () => this.closeDirectoryModal());
        document.getElementById('rqDirectoryModalOverlay')?.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'rqDirectoryModalOverlay') this.closeDirectoryModal();
        });
        document.getElementById('rqDirectorySearchInput')?.addEventListener('input', (e) => {
            this.directory.search = String(e.target?.value || '');
            this.renderDirectory();
        });
        document.querySelectorAll('[data-dir-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-dir-tab') || 'trucks';
                this.setDirectoryTab(tab);
            });
        });
    },

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
    },

    parseMaybeNumber(v) {
        const s = String(v || '').trim();
        if (!s) return null;
        const n = Number(s.replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    },

    setView(view) {
        document.querySelectorAll('[data-view-btn]').forEach((btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-view-btn') === view);
        });
        document.querySelectorAll('[data-view]').forEach((el) => {
            el.classList.toggle('is-active', el.getAttribute('data-view') === view);
        });
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

    async fetchRequestById(id) {
        const headers = await this.getAuthHeaders();
        if (!headers) throw new Error('Не удалось получить токен авторизации');
        const url = API_CONFIG.BASE_URL + '/moderators-module/lots-requests/admin/' + encodeURIComponent(id);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (response.status === 401 || response.status === 403) {
                if (typeof logout === 'function') logout();
                throw new Error('Сессия истекла, войдите снова');
            }
            if (!response.ok) throw new Error('Не удалось загрузить заявку');
            const text = await response.text();
            if (!text) throw new Error('Пустой ответ от сервера');
            const json = JSON.parse(text);
            return json && typeof json === 'object' && json.data ? json.data : json;
        } catch (e) {
            throw new Error(e && e.message ? e.message : 'Не удалось загрузить заявку');
        }
    },

    async fetchUserById(userId) {
        if (!userId) return null;
        const headers = await this.getAuthHeaders();
        if (!headers) return null;
        const url = API_CONFIG.BASE_URL + '/moderators-module/all-by-user?id=' + encodeURIComponent(userId);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (response.status === 401 || response.status === 403) {
                if (typeof logout === 'function') logout();
                return null;
            }
            if (!response.ok) return null;
            const text = await response.text();
            if (!text) return null;
            const json = JSON.parse(text);
            const data = json && typeof json === 'object' && json.data ? json.data : json;
            return data || null;
        } catch (_) {
            return null;
        }
    },

    async fetchAllRelationsByUserId(usersId) {
        const id = String(usersId || '').trim();
        if (!id) return null;
        const headers = await this.getAuthHeaders();
        if (!headers) return null;
        const url = API_CONFIG.BASE_URL + '/moderators-module/lots-requests/admin/all-relations-by-user-id/' + encodeURIComponent(id);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (response.status === 401 || response.status === 403) {
                if (typeof logout === 'function') logout();
                return null;
            }
            if (!response.ok) return null;
            const text = await response.text();
            if (!text) return null;
            const json = JSON.parse(text);
            return json && typeof json === 'object' ? json : null;
        } catch (_) {
            return null;
        }
    },

    async patchUpdateLotsRequest(dto) {
        const headers = await this.getAuthHeaders();
        if (!headers) return { ok: false, status: 0 };
        const url = API_CONFIG.BASE_URL + '/moderators-module/lots-requests/admin/update';
        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(dto || {}),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (response.status === 401 || response.status === 403) {
                if (typeof logout === 'function') logout();
            }
            return { ok: response.ok, status: response.status };
        } catch (_) {
            return { ok: false, status: 0 };
        }
    },

    async fetchCropsAllRelations() {
        const headers = await this.getAuthHeaders();
        if (!headers) return [];
        try {
            const response = await fetch(API_CONFIG.BASE_URL + '/farmer/crops/all-relations', {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (!response.ok) return [];
            const json = await response.json();
            return Array.isArray(json?.cropsProperty) ? json.cropsProperty : [];
        } catch (_) {
            return [];
        }
    },

    parseNum(v) {
        if (v === null || v === undefined || v === '') return 0;
        const n = Number(String(v).replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    },

    formatNum(v) {
        const n = this.parseNum(v);
        return n.toLocaleString('ru-RU');
    },

    formatDateTime(v) {
        if (!v) return '—';
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return String(v);
        return d.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    },

    escapeHtml(v) {
        return String(v || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    normalizeDocumentUrl(url) {
        const raw = String(url || '').trim();
        if (!raw || raw === '-' || raw === 'null' || raw === 'undefined') return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        if (raw.startsWith('/')) return `${window.location.origin}${raw}`;
        return '';
    },

    buildDocLink(url, label) {
        const href = this.normalizeDocumentUrl(url);
        if (!href) {
            return `<span class="rq-doc-link is-disabled" style="cursor:not-allowed;"><i class="fas fa-file-circle-xmark"></i>${this.escapeHtml(label)}</span>`;
        }
        return `<a class="rq-doc-link" href="${this.escapeHtml(href)}" target="_blank" rel="noopener"><i class="fas fa-file-arrow-up-right"></i>${this.escapeHtml(label)}</a>`;
    },

    getStatusName() {
        return (
            this.request?.lotsRequestStatus?.name ||
            this.request?.status?.name ||
            this.request?.status ||
            '—'
        );
    },

    async load() {
        try {
            this.request = await this.fetchRequestById(this.requestId);
            const userId = this.request?.usersId || this.request?.userId || this.request?.user?.id || '';
            const [user, props] = await Promise.all([
                this.fetchUserById(userId),
                this.fetchCropsAllRelations()
            ]);
            this.user = user;
            this.cropsProperties = Array.isArray(props) ? props : [];
            this.render();
            this.enableAutotrainControls();
            this.enableDirectoryControls();
            document.getElementById('rqLoading').style.display = 'none';
            document.getElementById('rqError').style.display = 'none';
            document.getElementById('rqLayout').style.display = '';
            document.getElementById('rqAutotrainSection').style.display = '';
        } catch (e) {
            this.showError(e && e.message ? e.message : 'Ошибка загрузки данных.');
        }
    },

    enableAutotrainControls() {
        const btn = document.getElementById('addAutotrainBtn');
        if (btn) btn.disabled = false;
    },

    enableDirectoryControls() {
        const btn = document.getElementById('rqOpenDirectoryBtn');
        if (btn) btn.disabled = false;
    },

    showError(text) {
        const errorEl = document.getElementById('rqError');
        const txt = document.getElementById('rqErrorText');
        if (txt) txt.textContent = text || 'Не удалось загрузить заявку.';
        if (errorEl) errorEl.style.display = '';
        const loading = document.getElementById('rqLoading');
        const layout = document.getElementById('rqLayout');
        if (loading) loading.style.display = 'none';
        if (layout) layout.style.display = 'none';
        const autoSection = document.getElementById('rqAutotrainSection');
        if (autoSection) autoSection.style.display = 'none';
    },

    renderCounterparty() {
        const user = this.user || {};
        const ep = user?.entrepreneurProfile || user?.data?.entrepreneurProfile || null;
        const jp = user?.juridicalProfile || user?.data?.juridicalProfile || null;
        const profile = ep || jp || {};
        const fio = [profile.lastName, profile.firstName, profile.patronymic || profile.middleName].filter(Boolean).join(' ').trim() || 'Контрагент';
        const company = profile.organizationName || profile.legalName || profile.companyName || 'Организация не указана';
        const volume = this.request?.readyToTransportVolume ?? this.request?.readyToTransport ?? this.request?.volume ?? this.request?.tons ?? 0;
        const rowsPrimary = [
            ['Телефон', user?.phone || profile?.phone || profile?.mobilePhone || '—'],
            ['Email', user?.email || profile?.email || '—'],
            ['ИНН', profile?.inn || '—'],
            ['ОГРН / ОГРНИП', profile?.ogrn || profile?.ogrnip || '—'],
            ['Юридический адрес', profile?.legalAddress || '—']
        ];
        const rowsFinance = [
            ['Банк', profile?.bankName || '—'],
            ['БИК', profile?.bik || '—'],
            ['Расчетный счет', profile?.checkingAccount || '—'],
            ['Корреспондентский счет', profile?.correspondentAccount || '—'],
            ['Дата рождения', this.formatAnyValue(profile?.dateOfBirth)]
        ];

        const html =
            `<div class="rq-party-shell">` +
                `<div class="rq-party-hero">` +
                    `<div class="rq-party-avatar"><i class="fas fa-user"></i></div>` +
                    `<div>` +
                        `<p class="rq-party-name">${this.escapeHtml(fio)}</p>` +
                        `<div class="rq-party-sub">${this.escapeHtml(company)}</div>` +
                    `</div>` +
                    `<div class="rq-party-volume"><span class="k">Готов перевезти</span><span class="v"><i class="fas fa-truck-ramp-box"></i>${this.escapeHtml(this.formatNum(volume))} т</span></div>` +
                `</div>` +
                `<div class="rq-party-section">` +
                    `<h4 class="rq-party-section-title"><i class="fas fa-address-card"></i> Контактные данные</h4>` +
                    `<div class="rq-party-grid">` +
                        rowsPrimary.map((x) => `<div class="rq-party-item"><span class="k">${this.escapeHtml(x[0])}</span><span class="v">${this.escapeHtml(x[1])}</span></div>`).join('') +
                    `</div>` +
                `</div>` +
                `<div class="rq-party-section">` +
                    `<h4 class="rq-party-section-title"><i class="fas fa-landmark"></i> Финансовый профиль</h4>` +
                    `<div class="rq-party-grid">` +
                        rowsFinance.map((x) => `<div class="rq-party-item"><span class="k">${this.escapeHtml(x[0])}</span><span class="v">${this.escapeHtml(x[1])}</span></div>`).join('') +
                    `</div>` +
                `</div>` +
                `<div class="rq-object-actions">` +
                    `<button type="button" class="btn rq-object-btn rq-object-btn--crop" id="rqOpenCropBtn"><i class="fas fa-seedling"></i> О культуре</button>` +
                    `<button type="button" class="btn rq-object-btn rq-object-btn--loading" id="rqOpenLoadingPointBtn"><i class="fas fa-warehouse"></i> О точке загрузки</button>` +
                    `<button type="button" class="btn rq-object-btn rq-object-btn--unloading" id="rqOpenUnloadingPointBtn"><i class="fas fa-map-pin"></i> О точке выгрузки</button>` +
                `</div>` +
            `</div>`;

        const el = document.getElementById('rqCounterparty');
        if (el) {
            el.innerHTML = html;
            document.getElementById('rqOpenCropBtn')?.addEventListener('click', () => this.openObjectModal('crop'));
            document.getElementById('rqOpenLoadingPointBtn')?.addEventListener('click', () => this.openObjectModal('loading'));
            document.getElementById('rqOpenUnloadingPointBtn')?.addEventListener('click', () => this.openObjectModal('unloading'));
        }
    },
    isIdKey(key) {
        const k = String(key || '').toLowerCase();
        return k === 'id' || k.endsWith('id') || k.includes('_id') || k.includes('uuid') || k.includes('guid');
    },

    prettifyKey(key) {
        const map = {
            uniqueCode: 'Публичный ID',
            usersId: 'Пользователь',
            cargoType: 'Тип груза',
            brand: 'Марка',
            model: 'Модель',
            trailerType: 'Тип прицепа',
            trucksType: 'Тип транспорта',
            truckBrand: 'Марка',
            truckModel: 'Модель',
            deleted_at: 'Удалено',
            cropsType: 'Тип культуры',
            cropsStatus: 'Статус культуры',
            cropsOriginRegion: 'Регион происхождения',
            cropsShelfLife: 'Срок хранения',
            cropsShelfLifeType: 'Единица срока хранения',
            yearOfHarvest: 'Год урожая',
            qualityDocument: 'Документы качества',
            loadingPointsType: 'Тип точки',
            unloadingPointsType: 'Тип точки',
            roadSurfaceType: 'Покрытие дороги',
            loadingMethod: 'Способ погрузки',
            unloadingMethod: 'Способ выгрузки',
            transportType: 'Тип транспорта',
            transportTypeName: 'Тип транспорта (текст)',
            loadingPointDistanceFromScales: 'Расстояние до весов',
            maxSiteCapacity: 'Вместимость площадки',
            maxSiteHeight: 'Макс. высота площадки',
            avgLoadingTimePerTruck: 'Среднее время погрузки',
            avgUnloadingTimePerTruck: 'Среднее время выгрузки',
            truckPerDay: 'Машин в сутки',
            tonsPerDay: 'Тонн в сутки',
            isTrawls: 'Тралы',
            name: 'Название',
            address: 'Адрес',
            latitude: 'Широта',
            longitude: 'Долгота',
            created_at: 'Дата создания',
            isArchived: 'В архиве',
            isInSaleRequest: 'В заявке продажи',
            reviewMessage: 'Комментарий модератора',
            photo: 'Фото',
            registerNumber: 'Гос. номер',
            year: 'Год выпуска',
            length: 'Длина',
            width: 'Ширина',
            height: 'Высота',
            clearance: 'Клиренс',
            tonnage: 'Грузоподъемность',
            firstName: 'Имя',
            lastName: 'Фамилия',
            patronymic: 'Отчество',
            phone: 'Телефон',
            passportSerial: 'Серия паспорта',
            passportNumber: 'Номер паспорта',
            issued: 'Кем выдан',
            code: 'Код подразделения',
            date: 'Дата выдачи',
            driverLicenseSerial: 'Серия ВУ',
            driverLicenseNumber: 'Номер ВУ'
        };
        return map[key] || String(key || '').replace(/_/g, ' ').replace(/([a-zа-я])([A-ZА-Я])/g, '$1 $2');
    },

    formatAnyValue(v) {
        if (v === null || v === undefined || v === '') return '—';
        if (typeof v === 'boolean') return v ? 'Да' : 'Нет';
        if (typeof v === 'number') {
            // Годы и короткие целые показываем без разбиения пробелами.
            if (Number.isInteger(v) && Math.abs(v) < 10000) return String(v);
            return this.formatNum(v);
        }
        if (typeof v === 'string') {
            const s = String(v).trim();
            if (/^\d{4}-\d{2}-\d{2}T/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) {
                return this.formatDateTime(s);
            }
            return s;
        }
        if (Array.isArray(v)) return v.length ? v.map((x) => this.formatAnyValue(x)).join(', ') : '—';
        if (typeof v === 'object') {
            if (v.name) return String(v.name);
            if (v.uniqueCode) return String(v.uniqueCode);
            return Object.entries(v)
                .filter(([k]) => !this.isIdKey(k))
                .map(([k, val]) => `${this.prettifyKey(k)}: ${this.formatAnyValue(val)}`)
                .join(' | ') || '—';
        }
        return String(v);
    },

    buildRowsFromObject(obj, opts = {}) {
        const rows = [];
        const skip = new Set(opts.skipKeys || []);
        Object.entries(obj || {}).forEach(([key, value]) => {
            if (skip.has(key) || this.isIdKey(key)) return;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (value.name || value.uniqueCode) {
                    rows.push({ label: this.prettifyKey(key), value: this.formatAnyValue(value) });
                    return;
                }
            }
            if (Array.isArray(value)) {
                if (!value.length) {
                    rows.push({ label: this.prettifyKey(key), value: '—' });
                    return;
                }
                if (key === 'cropsPropertyValue') return;
                rows.push({ label: this.prettifyKey(key), value: this.formatAnyValue(value) });
                return;
            }
            rows.push({ label: this.prettifyKey(key), value: this.formatAnyValue(value) });
        });
        return rows;
    },

    renderWorkScheduleFull(schedule, sectionTitle) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const names = { monday: 'Понедельник', tuesday: 'Вторник', wednesday: 'Среда', thursday: 'Четверг', friday: 'Пятница', saturday: 'Суббота', sunday: 'Воскресенье' };
        const rows = days.map((key) => {
            const value = schedule && schedule[key] ? String(schedule[key]).trim() : '';
            return `<tr><td>${this.escapeHtml(names[key])}</td><td>${this.escapeHtml(value || 'Выходной')}</td></tr>`;
        }).join('');
        return `<div class="deal-modal-section"><div class="deal-modal-section-title">${this.escapeHtml(sectionTitle || 'Режим работы')}</div><table class="deal-modal-schedule"><thead><tr><th>День</th><th>Время</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    },

    buildInfoSection(title, rows) {
        let html = `<div class="deal-modal-section"><div class="deal-modal-section-title">${this.escapeHtml(title)}</div>`;
        (rows || []).forEach((r) => {
            html += `<div class="deal-modal-item"><span class="deal-modal-item-label">${this.escapeHtml(r.label)}</span><span class="deal-modal-item-value">${this.escapeHtml(r.value)}</span></div>`;
        });
        return `${html}</div>`;
    },

    openObjectModal(kind) {
        const lotsData = this.request?.lotsData || {};
        const crop = lotsData.cropsData || {};
        const loading = lotsData.loadingPointsData || {};
        const unloading = lotsData.unloadingPointsData || {};
        let title = 'Информация';
        let html = '<p class="deal-modal-empty">Нет данных</p>';

        if (kind === 'loading') {
            title = 'О точке загрузки';
            const generalRows = [
                { label: 'Название', value: loading.name || '—' },
                { label: 'Адрес', value: loading.address || '—' },
                { label: 'Тип', value: loading.loadingPointsType?.name || '—' },
                { label: 'Покрытие', value: loading.roadSurfaceType?.name || '—' },
                { label: 'Способ погрузки', value: (Array.isArray(loading.loadingMethod) && loading.loadingMethod.length) ? loading.loadingMethod.map((x) => x?.name).filter(Boolean).join(', ') : '—' },
                { label: 'Расстояние до весов', value: loading.loadingPointDistanceFromScales ?? '—' },
                { label: 'Вместимость', value: loading.maxSiteCapacity ?? '—' },
                { label: 'Высота', value: loading.maxSiteHeight ?? '—' }
            ];
            const generalHtml = this.buildInfoSection('Общая информация', generalRows);
            const scheduleHtml = this.renderWorkScheduleFull(loading.loadingPointsWorkSchedule, 'Режим работы');
            html =
                '<div class="deal-modal-declarations">' +
                '<div class="deal-modal-tab-btns"><button type="button" class="deal-modal-tab-btn is-active" data-tab="general">Общая информация</button><button type="button" class="deal-modal-tab-btn" data-tab="schedule">Режим работы</button></div>' +
                `<div class="deal-modal-tab-panel is-active" data-tab="general">${generalHtml}</div>` +
                `<div class="deal-modal-tab-panel" data-tab="schedule">${scheduleHtml}</div>` +
                '</div>';
        } else if (kind === 'unloading') {
            title = 'О точке выгрузки';
            const generalRows = [
                { label: 'Название', value: unloading.name || '—' },
                { label: 'Адрес', value: unloading.address || '—' },
                { label: 'Тип', value: unloading.unloadingPointsType?.name || '—' },
                { label: 'Покрытие', value: unloading.roadSurfaceType?.name || '—' },
                { label: 'Способ разгрузки', value: (Array.isArray(unloading.unloadingMethod) && unloading.unloadingMethod.length) ? unloading.unloadingMethod.map((x) => x?.name).filter(Boolean).join(', ') : '—' },
                { label: 'Транспорт', value: (Array.isArray(unloading.transportType) && unloading.transportType.length) ? unloading.transportType.map((x) => x?.name).filter(Boolean).join(', ') : (unloading.transportTypeName || '—') },
                { label: 'Расстояние до весов', value: unloading.loadingPointDistanceFromScales ?? '—' },
                { label: 'Вместимость', value: unloading.maxSiteCapacity ?? '—' },
                { label: 'Высота', value: unloading.maxSiteHeight ?? '—' }
            ];
            const generalHtml = this.buildInfoSection('Общая информация', generalRows);
            const scheduleHtml = this.renderWorkScheduleFull(unloading.unloadingPointsWorkSchedule, 'Режим работы');
            html =
                '<div class="deal-modal-declarations">' +
                '<div class="deal-modal-tab-btns"><button type="button" class="deal-modal-tab-btn is-active" data-tab="general">Общая информация</button><button type="button" class="deal-modal-tab-btn" data-tab="schedule">Режим работы</button></div>' +
                `<div class="deal-modal-tab-panel is-active" data-tab="general">${generalHtml}</div>` +
                `<div class="deal-modal-tab-panel" data-tab="schedule">${scheduleHtml}</div>` +
                '</div>';
        } else {
            title = 'О культуре';
            const generalRows = [
                { label: 'ID культуры', value: crop.uniqueCode || '—' },
                { label: 'Культура', value: crop.cropsType?.name || '—' },
                { label: 'Регион происхождения', value: crop.cropsOriginRegion?.name || '—' },
                { label: 'Год урожая', value: crop.yearOfHarvest ?? '—' },
                { label: 'Срок хранения', value: (crop.cropsShelfLife != null) ? `${crop.cropsShelfLife} ${crop.cropsShelfLifeType?.name || ''}`.trim() : '—' }
            ];
            const qualityValues = Array.isArray(crop.cropsPropertyValue) ? crop.cropsPropertyValue : [];
            const cropTypeId = crop?.cropsType?.id;
            const orderedProps = cropTypeId
                ? this.cropsProperties.filter((p) => p?.cropsType?.id === cropTypeId)
                : [];
            const qualityRows = (orderedProps.length ? orderedProps : qualityValues.map((x) => x?.cropsProperty).filter(Boolean))
                .map((prop) => {
                    const valueObj = qualityValues.find((x) => x?.cropsProperty?.id === prop?.id);
                    const value = valueObj?.value;
                    const unit = prop?.unit ? ` ${prop.unit}` : '';
                    return { label: prop?.name || 'Показатель', value: value != null ? `${value}${unit}` : 'Не заполнено' };
                });
            if (!qualityRows.length) qualityRows.push({ label: 'Показатели', value: 'Нет данных' });
            const generalHtml = this.buildInfoSection('Общая информация', generalRows);
            const qualityHtml = this.buildInfoSection('Показатель качества', qualityRows);
            html =
                '<div class="deal-modal-declarations">' +
                '<div class="deal-modal-tab-btns"><button type="button" class="deal-modal-tab-btn is-active" data-tab="general">Общая информация</button><button type="button" class="deal-modal-tab-btn" data-tab="quality">Показатель качества</button></div>' +
                `<div class="deal-modal-tab-panel is-active" data-tab="general">${generalHtml}</div>` +
                `<div class="deal-modal-tab-panel" data-tab="quality">${qualityHtml}</div>` +
                '</div>';
        }
        this.openInfoModal(title, html);
    },

    openInfoModal(title, bodyHtml) {
        const overlay = document.getElementById('rqInfoModalOverlay');
        const titleEl = document.getElementById('rqInfoModalTitle');
        const bodyEl = document.getElementById('rqInfoModalBody');
        if (!overlay || !titleEl || !bodyEl) return;
        titleEl.textContent = title || 'Информация';
        bodyEl.innerHTML = bodyHtml || '';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        bodyEl.querySelectorAll('.deal-modal-tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab') || '';
                bodyEl.querySelectorAll('.deal-modal-tab-btn').forEach((b) => b.classList.remove('is-active'));
                bodyEl.querySelectorAll('.deal-modal-tab-panel').forEach((p) => p.classList.remove('is-active'));
                btn.classList.add('is-active');
                const panel = bodyEl.querySelector(`.deal-modal-tab-panel[data-tab="${tab}"]`);
                if (panel) panel.classList.add('is-active');
            });
        });
    },

    closeInfoModal() {
        const overlay = document.getElementById('rqInfoModalOverlay');
        const bodyEl = document.getElementById('rqInfoModalBody');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        if (bodyEl) bodyEl.innerHTML = '';
    },

    buildSearchText(row) {
        const truck = row?.trucks || row?.truck || row?.tractor || {};
        const trailer = row?.trailer || {};
        const driver = row?.drivers || row?.driver || {};
        return [
            row?.uniqueCode || row?.publicId || row?.number || '',
            truck?.brand?.name || truck?.brand || '',
            truck?.model?.name || truck?.model || '',
            truck?.registerNumber || truck?.regNumber || truck?.registrationNumber || '',
            trailer?.registerNumber || trailer?.regNumber || trailer?.registrationNumber || '',
            [driver?.lastName, driver?.firstName, driver?.patronymic, driver?.middleName].filter(Boolean).join(' ')
        ].join(' ').toLowerCase();
    },

    renderFieldsFromObject(obj, titleMap = {}, skipKeys = []) {
        const skip = new Set(skipKeys);
        return Object.entries(obj || {})
            .filter(([k, v]) => {
                if (skip.has(k)) return false;
                if (this.isIdKey(k)) return false;
                if (v === undefined || v === null || String(v) === '') return false;
                const key = String(k || '').toLowerCase();
                const str = String(v || '').trim().toLowerCase();
                const looksLikeDocField = key.includes('photo') || key.includes('document') || key.includes('url') || key.includes('file');
                const looksLikeLinkValue = str.startsWith('http://') || str.startsWith('https://') || str.startsWith('s3://') || str.startsWith('s3/');
                if (looksLikeDocField || looksLikeLinkValue) return false;
                return true;
            })
            .map(([k, v]) => {
                const label = titleMap[k] || this.prettifyKey(k);
                const value = this.formatAnyValue(v);
                return `<div class="rq-field-item"><span class="k">${this.escapeHtml(label)}</span><span class="v">${this.escapeHtml(value)}</span></div>`;
            })
            .join('');
    },

    buildCompactCard(row, index) {
        const truck = row?.trucks || row?.truck || row?.tractor || {};
        const trailer = row?.trailer || {};
        const driver = row?.drivers || row?.driver || {};
        const fio = [driver?.lastName, driver?.firstName, driver?.patronymic, driver?.middleName].filter(Boolean).join(' ') || '—';
        const title = row?.uniqueCode || row?.publicId || `Автопоезд ${index + 1}`;
        const truckBrand = truck?.brand?.name || truck?.brand || truck?.truckBrand?.name || truck?.truckBrand || 'Не указана';
        const truckModel = truck?.model?.name || truck?.model || truck?.truckModel?.name || truck?.truckModel || 'Не указана';
        const truckBrandModel = `${truckBrand} ${truckModel}`.trim();
        const trailerType = (
            trailer?.trailerType?.name ||
            trailer?.type?.name ||
            trailer?.type ||
            trailer?.unloadingMethod?.name ||
            (Array.isArray(trailer?.cargoType) ? trailer.cargoType.map((x) => x?.name).filter(Boolean).join(', ') : '') ||
            trailer?.bodyType?.name ||
            trailer?.bodyType ||
            'Не указан'
        );
        return (
            `<article class="rq-train-card">` +
                `<div class="rq-train-head">` +
                    `<h4 class="rq-train-title"><i class="fas fa-truck-fast"></i>${this.escapeHtml(title)}</h4>` +
                    `<span class="rq-train-chip"><i class="fas fa-hashtag"></i>${this.escapeHtml(String(index + 1))}</span>` +
                `</div>` +
                `<div class="rq-train-grid">` +
                    `<div class="rq-train-split">` +
                        `<p class="rq-train-split-head"><i class="fas fa-truck"></i>Транспорт</p>` +
                        `<div class="rq-row"><span class="k">Марка / модель</span><span class="v">${this.escapeHtml(truckBrandModel)}</span></div>` +
                        `<div class="rq-row"><span class="k">Гос. номер</span><span class="v">${this.escapeHtml(truck?.registerNumber || truck?.regNumber || truck?.registrationNumber || '—')}</span></div>` +
                    `</div>` +
                    `<div class="rq-train-split">` +
                        `<p class="rq-train-split-head"><i class="fas fa-trailer"></i>Прицеп</p>` +
                        `<div class="rq-row"><span class="k">Гос. номер</span><span class="v">${this.escapeHtml(trailer?.registerNumber || trailer?.regNumber || trailer?.registrationNumber || '—')}</span></div>` +
                        `<div class="rq-row"><span class="k">Тип прицепа</span><span class="v">${this.escapeHtml(trailerType)}</span></div>` +
                    `</div>` +
                    `<div class="rq-train-split">` +
                        `<p class="rq-train-split-head"><i class="fas fa-id-card"></i>Водитель</p>` +
                        `<div class="rq-row"><span class="k">ФИО</span><span class="v">${this.escapeHtml(fio)}</span></div>` +
                        `<div class="rq-row"><span class="k">Телефон</span><span class="v">${this.escapeHtml(driver?.phone || '—')}</span></div>` +
                    `</div>` +
                `</div>` +
                `<div class="rq-card-actions">` +
                    `<button type="button" class="btn rq-action-btn rq-action-btn--edit" disabled><i class="fas fa-gear"></i> Изменить конфигурацию</button>` +
                    `<button type="button" class="btn rq-action-btn rq-action-btn--delete" disabled><i class="fas fa-trash"></i> Удалить</button>` +
                `</div>` +
            `</article>`
        );
    },

    buildDetailedCard(row, index) {
        const truck = row?.trucks || row?.truck || row?.tractor || {};
        const trailer = row?.trailer || {};
        const driver = row?.drivers || row?.driver || {};
        const title = row?.uniqueCode || row?.publicId || `Автопоезд ${index + 1}`;
        const driverFull = Object.assign({}, driver, {
            fio: [driver?.lastName, driver?.firstName, driver?.patronymic, driver?.middleName].filter(Boolean).join(' ') || '—'
        });
        const renderDocItems = (items) => {
            const list = Array.isArray(items) ? items : [];
            return `<div class="rq-doc-grid">` + list.map((item) => (
                `<div class="rq-doc-item">` +
                    `<span class="k">${this.escapeHtml(item.label)}</span>` +
                    this.buildDocLink(item.url, item.linkLabel || 'Открыть файл') +
                `</div>`
            )).join('') + `</div>`;
        };
        const truckDocs = renderDocItems([
            { label: 'ПТС (лицевая)', url: truck?.vehiclePassportPhotoFront || truck?.stsDocument || truck?.stsUrl },
            { label: 'ПТС (оборот)', url: truck?.vehiclePassportPhotoBack || truck?.ptsDocument || truck?.ptsUrl },
            { label: 'Фото транспорта', url: truck?.truckPhoto }
        ]);
        const trailerDocs = renderDocItems([
            { label: 'ПТС прицепа (лицевая)', url: trailer?.vehiclePassportPhotoFront || trailer?.stsDocument || trailer?.stsUrl },
            { label: 'ПТС прицепа (оборот)', url: trailer?.vehiclePassportPhotoBack }
        ]);
        const driverDocs = renderDocItems([
            { label: 'Фото водителя', url: driver?.driverPhoto || driver?.passportDocument || driver?.passportUrl },
            { label: 'ВУ (лицевая)', url: driver?.driverLicensePhotoFront || driver?.driverLicenseDocument || driver?.driverLicenseUrl },
            { label: 'ВУ (оборот)', url: driver?.driverLicensePhotoBack }
        ]);

        return (
            `<article class="rq-detail-card">` +
                `<div class="rq-detail-head">` +
                    `<h4><i class="fas fa-diagram-project"></i>${this.escapeHtml(title)}</h4>` +
                    `<span class="rq-detail-index"><i class="fas fa-hashtag"></i>${this.escapeHtml(String(index + 1))}</span>` +
                `</div>` +
                `<div class="rq-split">` +
                    `<div class="rq-block rq-block--truck">` +
                        `<div class="rq-block-head"><i class="fas fa-truck"></i> Транспорт</div>` +
                        `<div class="rq-block-body">` +
                            `<div class="rq-detail-grid">` +
                                this.renderFieldsFromObject(truck, {
                                registerNumber: 'Гос. номер',
                                vehiclePassportPhotoFront: 'ПТС лицевая',
                                vehiclePassportPhotoBack: 'ПТС оборот',
                                truckPhoto: 'Фото транспорта'
                            }, ['id', 'usersId', 'deleted_at']) +
                            `</div>` +
                            `<div class="rq-detail-doc-section"><div class="rq-detail-doc-title">Документы транспорта</div>` +
                                truckDocs +
                            `</div>` +
                        `</div>` +
                    `</div>` +
                    `<div class="rq-block rq-block--trailer">` +
                        `<div class="rq-block-head"><i class="fas fa-trailer"></i> Прицеп</div>` +
                        `<div class="rq-block-body">` +
                            `<div class="rq-detail-grid">` +
                                this.renderFieldsFromObject(trailer, {
                                registerNumber: 'Гос. номер'
                            }, ['id', 'usersId', 'deleted_at']) +
                            `</div>` +
                            `<div class="rq-detail-doc-section"><div class="rq-detail-doc-title">Документы прицепа</div>` +
                                trailerDocs +
                            `</div>` +
                        `</div>` +
                    `</div>` +
                    `<div class="rq-block rq-block--driver">` +
                        `<div class="rq-block-head"><i class="fas fa-id-card"></i> Водитель</div>` +
                        `<div class="rq-block-body">` +
                            `<div class="rq-detail-grid">` +
                                this.renderFieldsFromObject(driverFull, {
                                fio: 'ФИО',
                                driverLicenseSerial: 'Серия ВУ',
                                driverLicenseNumber: 'Номер ВУ'
                            }, ['id', 'usersId', 'deleted_at']) +
                            `</div>` +
                            `<div class="rq-detail-doc-section"><div class="rq-detail-doc-title">Документы водителя</div>` +
                                driverDocs +
                            `</div>` +
                        `</div>` +
                    `</div>` +
                `</div>` +
                `<div class="rq-card-actions">` +
                    `<button type="button" class="btn rq-action-btn rq-action-btn--edit" disabled><i class="fas fa-gear"></i> Изменить конфигурацию</button>` +
                    `<button type="button" class="btn rq-action-btn rq-action-btn--delete" disabled><i class="fas fa-trash"></i> Удалить</button>` +
                `</div>` +
            `</article>`
        );
    },

    renderAutotrains() {
        const source = Array.isArray(this.request?.tractorTrailer) ? this.request.tractorTrailer : [];
        const list = source;

        const countEl = document.getElementById('rqAutotrainCount');
        if (countEl) countEl.innerHTML = `<i class="fas fa-layer-group"></i> Автопоездов: ${list.length}`;

        const cardsEl = document.getElementById('rqCards');
        const detailsEl = document.getElementById('rqDetails');

        if (cardsEl) {
            cardsEl.innerHTML = list.length
                ? list.map((x, i) => this.buildCompactCard(x, i)).join('')
                : '<div class="rq-train-card"><div class="rq-row"><span class="k">Автопоезда</span><span class="v">Нет данных</span></div></div>';
        }
        if (detailsEl) {
            detailsEl.innerHTML = list.length
                ? list.map((x, i) => this.buildDetailedCard(x, i)).join('')
                : '<div class="rq-detail-card"><div class="rq-row"><span class="k">Автопоезда</span><span class="v">Нет данных</span></div></div>';
        }
    },

    renderSummary() {
        const status = this.getStatusName();
        const createdAt = this.formatDateTime(this.request?.created_at || this.request?.createdAt);
        const count = Array.isArray(this.request?.tractorTrailer) ? this.request.tractorTrailer.length : 0;
        const lot = this.request?.lots || {};
        const distanceMeters = this.parseNum(lot?.distance);
        const distanceKm = distanceMeters > 0 ? (distanceMeters / 1000) : 0;
        const route = [lot?.fromRegion || '', lot?.toRegion || ''].filter(Boolean).join(' -> ') || '—';

        const createdEl = document.getElementById('sumCreated');
        const statusEl = document.getElementById('sumStatus');
        const countEl = document.getElementById('sumCount');
        const coeffEl = document.getElementById('sumTransportCoeff');
        const distanceEl = document.getElementById('sumDistanceKm');
        const routeEl = document.getElementById('sumRoute');
        const startLabelEl = document.getElementById('sumStartLabel');
        const startEl = document.getElementById('sumStartDate');
        const endRowEl = document.getElementById('sumEndRow');
        const endEl = document.getElementById('sumEndDate');
        const priceEl = document.getElementById('sumPricePerTon');
        if (createdEl) createdEl.textContent = createdAt;
        if (statusEl) statusEl.textContent = status || '—';
        if (countEl) countEl.textContent = String(count);
        if (coeffEl) coeffEl.textContent = lot?.transportCoefficient ? String(lot.transportCoefficient) : '—';
        if (distanceEl) distanceEl.textContent = distanceKm > 0 ? this.formatNum(Math.round(distanceKm * 100) / 100) : '—';
        if (routeEl) routeEl.textContent = route;
        const hasStartDate = Boolean(lot?.startDate);
        const hasEndDate = Boolean(lot?.deadline);
        if (hasStartDate || hasEndDate) {
            if (startLabelEl) startLabelEl.textContent = 'Дата начала';
            if (startEl) startEl.textContent = this.formatDateTime(lot?.startDate);
            if (endEl) endEl.textContent = this.formatDateTime(lot?.deadline);
            if (endRowEl) endRowEl.style.display = '';
        } else {
            const daysNum = this.parseNum(lot?.daysToUnloading);
            if (startLabelEl) startLabelEl.textContent = 'Кол-во дней';
            if (startEl) startEl.textContent = daysNum > 0 ? `${this.formatNum(daysNum)} дн.` : '—';
            if (endRowEl) endRowEl.style.display = 'none';
        }
        if (priceEl) priceEl.textContent = lot?.pricePerTon ? `${this.formatNum(lot.pricePerTon)} ₽` : '—';

        const actions = document.getElementById('sumActions');
        if (!actions) return;
        const isProcessing = String(status || '').toLowerCase().includes('обработ');
        actions.innerHTML = isProcessing
            ? (
                '<button type="button" class="btn btn-outline" disabled><i class="fas fa-rotate-left"></i> Отправить на доработку</button>' +
                '<button type="button" class="btn btn-primary" disabled><i class="fas fa-check-circle"></i> Согласовать</button>'
            )
            : '<button type="button" class="btn btn-outline" disabled><i class="fas fa-lock"></i> Действия недоступны</button>';
    },

    render() {
        const code = this.request?.uniqueCode || this.request?.number || this.requestId || '—';
        const status = this.getStatusName();
        const codeEl = document.getElementById('rqCode');
        const subtitleEl = document.getElementById('rqSubtitle');
        if (codeEl) codeEl.textContent = String(code);
        if (subtitleEl) subtitleEl.textContent = `Статус: ${status || '—'}`;

        this.renderCounterparty();
        this.renderAutotrains();
        this.renderSummary();
    }
    ,

    // ---- Autotrain configuration flow ----
    normalizeId(v) {
        if (!v) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v.id) return String(v.id);
        return '';
    },

    getAutotrainUsageIndex() {
        // { truck: Map<id, number[]>, trailer: Map<id, number[]>, driver: Map<id, number[]> }
        const make = () => new Map();
        const idx = { truck: make(), trailer: make(), driver: make() };
        const push = (map, id, n) => {
            const key = String(id || '').trim();
            if (!key) return;
            if (!map.has(key)) map.set(key, []);
            const arr = map.get(key);
            if (!arr.includes(n)) arr.push(n);
        };

        const useDraft = this.isAutotrainConfigModalOpen() && Array.isArray(this.autotrainConfig?.trains) && this.autotrainConfig.trains.length;
        if (useDraft) {
            this.autotrainConfig.trains.forEach((t, i) => {
                const n = i + 1;
                push(idx.truck, t?.truckId, n);
                push(idx.trailer, t?.trailerId, n);
                push(idx.driver, t?.driverId, n);
            });
            return idx;
        }

        const source = Array.isArray(this.request?.tractorTrailer) ? this.request.tractorTrailer : [];
        source.forEach((row, i) => {
            const n = i + 1;
            push(idx.truck, this.normalizeId(row?.trucks || row?.truck || row?.tractor), n);
            push(idx.trailer, this.normalizeId(row?.trailer), n);
            push(idx.driver, this.normalizeId(row?.drivers || row?.driver), n);
        });
        return idx;
    },

    formatUsageNote(list) {
        const nums = Array.isArray(list) ? list.slice().sort((a, b) => a - b) : [];
        if (!nums.length) return '';
        return `Используется в автопоезде: ${nums.join(', ')}`;
    },

    extractInitialTrainsFromRequest() {
        const source = Array.isArray(this.request?.tractorTrailer) ? this.request.tractorTrailer : [];
        const trains = source.map((row) => ({
            truckId: this.normalizeId(row?.trucks || row?.truck || row?.tractor),
            trailerId: this.normalizeId(row?.trailer),
            driverId: this.normalizeId(row?.drivers || row?.driver)
        })).filter((t) => t.truckId || t.trailerId || t.driverId);
        return trains.length ? trains : [{ truckId: '', trailerId: '', driverId: '' }];
    },

    openAutotrainConfigModal() {
        const overlay = document.getElementById('rqAutotrainModalOverlay');
        if (!overlay) return;
        this.autotrainConfig.isOpen = true;
        this.autotrainConfig.trains = this.extractInitialTrainsFromRequest();
        const initialVolume = this.request?.readyToTransportVolume ?? this.request?.readyToTransport ?? this.request?.volume ?? null;
        this.autotrainConfig.readyVolume = (initialVolume === null || initialVolume === undefined || initialVolume === '') ? null : this.parseMaybeNumber(initialVolume);
        this.syncAutotrainVolumeInput();
        this.autotrainConfig.initialSnapshot = this.getAutotrainConfigSnapshot();
        this.autotrainConfig.hasChanges = false;
        this.autotrainConfig.isSaving = false;
        this.renderAutotrainEditor();
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        const modal = document.getElementById('rqAutotrainModal');
        if (modal) modal.scrollTop = 0;

        // Lazy-load relations for picker
        this.ensureRelationsLoaded();
    },

    syncAutotrainVolumeInput() {
        const el = document.getElementById('rqReadyVolumeInput');
        if (!el) return;
        const v = this.autotrainConfig.readyVolume;
        el.value = v == null ? '' : String(v);
    },

    closeAutotrainConfigModal() {
        const overlay = document.getElementById('rqAutotrainModalOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        this.autotrainConfig.isOpen = false;
        this.closePickModal();
    },

    async ensureRelationsLoaded() {
        if (this.relationsByUser) return;
        if (this.autotrainConfig.isLoadingRelations) return;
        const usersId = this.request?.usersId || this.request?.userId || '';
        if (!usersId) return;
        this.autotrainConfig.isLoadingRelations = true;
        const data = await this.fetchAllRelationsByUserId(usersId);
        this.autotrainConfig.isLoadingRelations = false;
        if (data) this.relationsByUser = data;
        // picker rerender if opened
        if (this.isPickModalOpen()) this.renderPickModal();
        if (this.isAutotrainConfigModalOpen()) this.renderAutotrainEditor();
    },

    addTrainRow() {
        this.autotrainConfig.trains.push({ truckId: '', trailerId: '', driverId: '' });
        this.renderAutotrainEditor();
    },

    removeTrainRow(index) {
        if (this.autotrainConfig.trains.length <= 1) {
            this.autotrainConfig.trains = [{ truckId: '', trailerId: '', driverId: '' }];
        } else {
            this.autotrainConfig.trains.splice(index, 1);
        }
        this.renderAutotrainEditor();
    },

    setTrainField(index, kind, id) {
        const row = this.autotrainConfig.trains[index];
        if (!row) return;
        if (kind === 'truck') row.truckId = String(id || '');
        if (kind === 'trailer') row.trailerId = String(id || '');
        if (kind === 'driver') row.driverId = String(id || '');
        this.renderAutotrainEditor();
    },

    clearTrainField(index, kind) {
        this.setTrainField(index, kind, '');
    },

    updateAutotrainSaveAvailability() {
        const saveBtn = document.getElementById('rqAutotrainSaveBtn');
        const addRowBtn = document.getElementById('rqAddTrainRowBtn');
        const canSaveByRules = this.hasAtLeastOneCompleteTrain();
        const currentSnapshot = this.getAutotrainConfigSnapshot();
        const hasChanges = this.autotrainConfig.initialSnapshot != null ? currentSnapshot !== this.autotrainConfig.initialSnapshot : true;
        this.autotrainConfig.hasChanges = hasChanges;
        if (saveBtn) {
            saveBtn.style.display = canSaveByRules ? '' : 'none';
            saveBtn.disabled = !(canSaveByRules && hasChanges);
        }
        if (addRowBtn) {
            addRowBtn.disabled = !canSaveByRules;
            addRowBtn.style.opacity = canSaveByRules ? '' : '0.65';
            addRowBtn.style.cursor = canSaveByRules ? '' : 'not-allowed';
        }
    },

    isTrainComplete(t) {
        return Boolean(t && t.truckId && t.trailerId && t.driverId);
    },

    hasAtLeastOneCompleteTrain() {
        return this.autotrainConfig.trains.some((t) => this.isTrainComplete(t));
    },

    renderAutotrainEditor() {
        const listEl = document.getElementById('rqTrainEditorList');
        const saveBtn = document.getElementById('rqAutotrainSaveBtn');
        const hint = document.getElementById('rqConfigHint');
        const addRowBtn = document.getElementById('rqAddTrainRowBtn');
        if (!listEl) return;

        const getById = (kind, id) => {
            const rel = this.relationsByUser || {};
            const list = kind === 'driver'
                ? (Array.isArray(rel.drivers) ? rel.drivers : [])
                : kind === 'trailer'
                    ? (Array.isArray(rel.trailer) ? rel.trailer : [])
                    : (Array.isArray(rel.trucks) ? rel.trucks : []);
            return list.find((x) => String(x?.id || '') === String(id || '')) || null;
        };

        const buildSelected = (kind, id) => {
            const obj = getById(kind, id);
            if (!obj) {
                return (
                    `<div class="rq-slot-selected">` +
                        `<div class="name">${this.escapeHtml('Выбрано: ' + String(id || '').slice(0, 8) + '…')}</div>` +
                        `<div class="meta">Объект не найден в справочнике (возможно, удалён)</div>` +
                        `<div class="rq-slot-selected-actions">` +
                            `<button type="button" class="rq-slot-action" data-slot-change="${this.escapeHtml(kind)}"><i class="fas fa-rotate"></i> Изменить</button>` +
                            `<button type="button" class="rq-slot-action rq-slot-action--danger" data-slot-clear="${this.escapeHtml(kind)}"><i class="fas fa-trash"></i> Удалить</button>` +
                        `</div>` +
                    `</div>`
                );
            }

            if (kind === 'driver') {
                const fio = [obj.lastName, obj.firstName, obj.patronymic].filter(Boolean).join(' ') || '—';
                const phone = obj.phone ? `Тел: ${obj.phone}` : '';
                return (
                    `<div class="rq-slot-selected">` +
                        `<div class="name">${this.escapeHtml(fio)}</div>` +
                        `<div class="meta">${this.escapeHtml(phone || ('ID: ' + (obj.uniqueCode || obj.id)))}</div>` +
                        `<div class="rq-slot-selected-actions">` +
                            `<button type="button" class="rq-slot-action" data-slot-change="driver"><i class="fas fa-rotate"></i> Изменить</button>` +
                            `<button type="button" class="rq-slot-action rq-slot-action--danger" data-slot-clear="driver"><i class="fas fa-trash"></i> Удалить</button>` +
                        `</div>` +
                    `</div>`
                );
            }

            const reg = obj.registerNumber || '—';
            const brandName = obj?.brand?.name || obj?.truckBrand?.name || obj?.truckBrand || '';
            const modelName = obj?.model?.name || obj?.truckModel?.name || obj?.truckModel || '';
            const brandModel = [brandName, modelName].filter(Boolean).join(' ');
            const unloadingType =
                obj?.unloadingMethod?.name ||
                (Array.isArray(obj?.unloadingMethod) ? obj.unloadingMethod.map((x) => x?.name).filter(Boolean).join(', ') : '') ||
                obj?.trailerType?.name ||
                obj?.type?.name ||
                obj?.bodyType?.name ||
                '';
            const tonnageVal = obj?.tonnage != null ? String(obj.tonnage) : '';
            const extra = kind === 'truck'
                ? ([
                    obj.year != null ? `Год: ${obj.year}` : '',
                    `Гос. номер: ${reg}`
                ].filter(Boolean).join(' • '))
                : ([
                    unloadingType ? `Тип выгрузки: ${unloadingType}` : '',
                    tonnageVal ? `Грузоподъемность: ${tonnageVal} т` : ''
                ].filter(Boolean).join(' • '));
            // В верхнем заголовке слота уже есть "Тягач/Прицеп", поэтому внутри показываем только значения.
            const title = kind === 'truck' ? (brandModel || reg || 'Тягач') : reg;
            return (
                `<div class="rq-slot-selected">` +
                    `<div class="name">${this.escapeHtml(title)}</div>` +
                    `<div class="meta">${this.escapeHtml(extra)}</div>` +
                    `<div class="rq-slot-selected-actions">` +
                        `<button type="button" class="rq-slot-action" data-slot-change="${this.escapeHtml(kind)}"><i class="fas fa-rotate"></i> Изменить</button>` +
                        `<button type="button" class="rq-slot-action rq-slot-action--danger" data-slot-clear="${this.escapeHtml(kind)}"><i class="fas fa-trash"></i> Удалить</button>` +
                    `</div>` +
                `</div>`
            );
        };

        const buildEmpty = (kind) => {
            const textMap = { truck: 'транспорт', trailer: 'прицеп', driver: 'водителя' };
            const iconMap = { truck: 'fa-truck', trailer: 'fa-trailer', driver: 'fa-id-card' };
            return (
                `<div class="rq-slot-empty">` +
                    `<div class="ic"><i class="fas ${iconMap[kind] || 'fa-plus'}"></i></div>` +
                    `<div class="t">Вы еще не добавили ${this.escapeHtml(textMap[kind] || 'объект')}</div>` +
                    `<div class="s">Нажмите кнопку ниже, чтобы выбрать из справочника</div>` +
                    `<button type="button" class="rq-slot-add-btn" data-slot-add="${this.escapeHtml(kind)}">` +
                        `<i class="fas fa-plus"></i> Добавить` +
                    `</button>` +
                `</div>`
            );
        };

        listEl.innerHTML = this.autotrainConfig.trains.map((t, i) => {
            const isCompact = Boolean(t?.truckId || t?.trailerId || t?.driverId);
            const rowHtml =
                `<div class="rq-train-editor-card${isCompact ? ' is-compact' : ''}" data-train-index="${this.escapeHtml(String(i))}">` +
                    `<div class="rq-train-editor-head">` +
                        `<h4><i class="fas fa-hashtag"></i> Автопоезд ${this.escapeHtml(String(i + 1))}</h4>` +
                        `<div class="rq-train-editor-actions">` +
                            `<button type="button" class="rq-mini-btn rq-mini-btn--danger" data-train-remove="${this.escapeHtml(String(i))}"><i class="fas fa-trash"></i> Удалить автопоезд</button>` +
                        `</div>` +
                    `</div>` +
                    `<div class="rq-train-editor-body">` +
                        `<div class="rq-train-editor-grid">` +
                            `<div class="rq-slot" data-slot-kind="truck">` +
                                `<p class="rq-slot-title" data-kind="truck"><i class="fas fa-truck"></i> Тягач</p>` +
                                (t.truckId ? buildSelected('truck', t.truckId) : buildEmpty('truck')) +
                            `</div>` +
                            `<div class="rq-slot" data-slot-kind="trailer">` +
                                `<p class="rq-slot-title" data-kind="trailer"><i class="fas fa-trailer"></i> Прицеп</p>` +
                                (t.trailerId ? buildSelected('trailer', t.trailerId) : buildEmpty('trailer')) +
                            `</div>` +
                            `<div class="rq-slot" data-slot-kind="driver">` +
                                `<p class="rq-slot-title" data-kind="driver"><i class="fas fa-id-card"></i> Водитель</p>` +
                                (t.driverId ? buildSelected('driver', t.driverId) : buildEmpty('driver')) +
                            `</div>` +
                        `</div>` +
                    `</div>` +
                `</div>`;
            return rowHtml;
        }).join('');

        // Bind actions inside editor
        listEl.querySelectorAll('[data-train-remove]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.getAttribute('data-train-remove'));
                if (Number.isFinite(idx)) this.removeTrainRow(idx);
            });
        });
        listEl.querySelectorAll('[data-slot-add]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const card = btn.closest('[data-train-index]');
                const idx = card ? Number(card.getAttribute('data-train-index')) : -1;
                const kind = btn.getAttribute('data-slot-add') || '';
                if (!Number.isFinite(idx) || idx < 0) return;
                this.openPickModal(idx, kind);
            });
        });
        listEl.querySelectorAll('[data-slot-change]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const card = btn.closest('[data-train-index]');
                const idx = card ? Number(card.getAttribute('data-train-index')) : -1;
                const kind = btn.getAttribute('data-slot-change') || '';
                if (!Number.isFinite(idx) || idx < 0) return;
                this.openPickModal(idx, kind);
            });
        });
        listEl.querySelectorAll('[data-slot-clear]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const card = btn.closest('[data-train-index]');
                const idx = card ? Number(card.getAttribute('data-train-index')) : -1;
                const kind = btn.getAttribute('data-slot-clear') || '';
                if (!Number.isFinite(idx) || idx < 0) return;
                this.clearTrainField(idx, kind);
            });
        });

        this.updateAutotrainSaveAvailability();
        if (hint) hint.innerHTML = '';
    },

    isPickModalOpen() {
        const overlay = document.getElementById('rqPickModalOverlay');
        return Boolean(overlay && overlay.classList.contains('is-open'));
    },

    openPickModal(trainIndex, kind) {
        const overlay = document.getElementById('rqPickModalOverlay');
        if (!overlay) return;
        const k = (kind === 'driver' || kind === 'trailer' || kind === 'truck') ? kind : 'truck';
        this.autotrainConfig.pick.trainIndex = Number(trainIndex);
        this.autotrainConfig.pick.kind = k;
        this.autotrainConfig.pick.search = '';
        const input = document.getElementById('rqPickSearchInput');
        if (input) input.value = '';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        this.renderPickModal();
        this.ensureRelationsLoaded();
        setTimeout(() => input?.focus(), 0);
    },

    closePickModal() {
        const overlay = document.getElementById('rqPickModalOverlay');
        const grid = document.getElementById('rqPickGrid');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        if (grid) grid.innerHTML = '';
    },

    openDirectoryModal() {
        const overlay = document.getElementById('rqDirectoryModalOverlay');
        if (!overlay) return;
        this.directory.isOpen = true;
        this.directory.tab = 'trucks';
        this.directory.search = '';
        const input = document.getElementById('rqDirectorySearchInput');
        if (input) input.value = '';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        this.ensureRelationsLoaded();
        this.renderDirectory();
        setTimeout(() => input?.focus(), 0);
    },

    closeDirectoryModal() {
        const overlay = document.getElementById('rqDirectoryModalOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        this.directory.isOpen = false;
    },

    setDirectoryTab(tab) {
        const t = tab === 'drivers' ? 'drivers' : (tab === 'trailer' ? 'trailer' : 'trucks');
        this.directory.tab = t;
        document.querySelectorAll('[data-dir-tab]').forEach((btn) => {
            btn.classList.toggle('is-active', (btn.getAttribute('data-dir-tab') || '') === t);
        });
        const input = document.getElementById('rqDirectorySearchInput');
        if (input) {
            input.placeholder = t === 'drivers' ? 'Поиск по ФИО' : 'Поиск по гос. номеру / модели';
        }
        this.renderDirectory();
    },

    renderDirectory() {
        const grid = document.getElementById('rqDirectoryGrid');
        const countEl = document.getElementById('rqDirectoryCount');
        if (!grid) return;
        if (!this.relationsByUser && this.autotrainConfig.isLoadingRelations) {
            grid.innerHTML = '<div class="rq-loading" style="min-height:180px;grid-column:1/-1;"><i class="fas fa-spinner fa-spin"></i><p>Загружаем справочник...</p></div>';
            if (countEl) countEl.textContent = 'Найдено: —';
            return;
        }
        if (!this.relationsByUser) {
            grid.innerHTML = '<div class="rq-error" style="min-height:180px;grid-column:1/-1;"><i class="fas fa-triangle-exclamation"></i><p>Не удалось загрузить справочник пользователя.</p></div>';
            if (countEl) countEl.textContent = 'Найдено: 0';
            return;
        }
        const tab = this.directory.tab || 'trucks';
        const list = tab === 'drivers'
            ? (Array.isArray(this.relationsByUser.drivers) ? this.relationsByUser.drivers : [])
            : tab === 'trailer'
                ? (Array.isArray(this.relationsByUser.trailer) ? this.relationsByUser.trailer : [])
                : (Array.isArray(this.relationsByUser.trucks) ? this.relationsByUser.trucks : []);

        const needle = String(this.directory.search || '').trim().toLowerCase();
        const filtered = needle
            ? list.filter((x) => this.buildPickSearchHay(tab === 'drivers' ? 'driver' : (tab === 'trailer' ? 'trailer' : 'truck'), x).includes(needle))
            : list.slice();
        if (countEl) countEl.textContent = 'Найдено: ' + String(filtered.length);
        if (!filtered.length) {
            grid.innerHTML = '<div class="rq-detail-card" style="grid-column:1/-1;"><div class="rq-row"><span class="k">Результат</span><span class="v">Ничего не найдено</span></div></div>';
            return;
        }
        const kind = tab === 'drivers' ? 'driver' : (tab === 'trailer' ? 'trailer' : 'truck');
        const usage = this.getAutotrainUsageIndex();
        grid.innerHTML = filtered.map((obj) => {
            const id = String(obj?.id || '');
            const usedIn = usage[kind]?.get(id) || [];
            const usedNote = this.formatUsageNote(usedIn);
            if (kind === 'driver') {
                const fio = [obj.lastName, obj.firstName, obj.patronymic].filter(Boolean).join(' ') || '—';
                const phone = obj.phone || '—';
                return (
                    `<div class="rq-pick-card${usedIn.length ? ' is-used' : ''}">` +
                        `<div class="title">${this.escapeHtml(fio)}</div>` +
                        `<div class="sub">${this.escapeHtml('Телефон: ' + phone)}</div>` +
                        `<div class="chips">` +
                            `<span class="rq-pick-chip"><i class="fas fa-id-badge"></i>${this.escapeHtml(String(obj.uniqueCode || '').trim() || String(obj.code || '').trim() || id.slice(0, 8))}</span>` +
                        `</div>` +
                        (usedNote ? `<div class="rq-pick-used-note"><i class="fas fa-link"></i><strong>${this.escapeHtml(usedNote)}</strong></div>` : '') +
                        `<div class="rq-pick-card-actions">` +
                            `<button type="button" class="rq-pick-action-btn" data-dir-info="${this.escapeHtml(id)}"><i class="fas fa-circle-info"></i>Подробнее</button>` +
                        `</div>` +
                    `</div>`
                );
            }
            const reg = obj.registerNumber || obj.regNumber || obj.registrationNumber || '—';
            const year = obj.year != null ? String(obj.year) : '';
            const code = String(obj.uniqueCode || '').trim() || id.slice(0, 8);
            const brandName = obj?.brand?.name || obj?.truckBrand?.name || obj?.truckBrand || '';
            const modelName = obj?.model?.name || obj?.truckModel?.name || obj?.truckModel || '';
            const brandModel = [brandName, modelName].filter(Boolean).join(' ');
            const unloadingType =
                obj?.unloadingMethod?.name ||
                (Array.isArray(obj?.unloadingMethod) ? obj.unloadingMethod.map((x) => x?.name).filter(Boolean).join(', ') : '') ||
                obj?.trailerType?.name ||
                obj?.type?.name ||
                obj?.bodyType?.name ||
                '';
            const tonnageVal = obj?.tonnage != null ? String(obj.tonnage) : '';
            const sub = kind === 'truck'
                ? `Год: ${year || '—'}`
                : [
                    unloadingType ? `Тип выгрузки: ${unloadingType}` : '',
                    tonnageVal ? `Грузоподъемность: ${tonnageVal} т` : ''
                ].filter(Boolean).join(' • ') || '—';
            const title = kind === 'truck' ? (brandModel || reg || 'Тягач') : 'Прицеп';
            return (
                `<div class="rq-pick-card${usedIn.length ? ' is-used' : ''}">` +
                    `<div class="title">${this.escapeHtml(title)}</div>` +
                    `<div class="sub">${this.escapeHtml(sub)}</div>` +
                    `<div class="chips">` +
                        (kind === 'truck'
                            ? `<span class="rq-pick-chip"><i class="fas fa-calendar"></i>${this.escapeHtml(year || '—')}</span>` +
                              `<span class="rq-pick-chip"><i class="fas fa-rectangle-list"></i>${this.escapeHtml(reg)}</span>`
                            : `<span class="rq-pick-chip"><i class="fas fa-hashtag"></i>${this.escapeHtml(code)}</span>` +
                              `<span class="rq-pick-chip"><i class="fas fa-rectangle-list"></i>${this.escapeHtml(reg)}</span>`) +
                    `</div>` +
                    (usedNote ? `<div class="rq-pick-used-note"><i class="fas fa-link"></i><strong>${this.escapeHtml(usedNote)}</strong></div>` : '') +
                    `<div class="rq-pick-card-actions">` +
                        `<button type="button" class="rq-pick-action-btn" data-dir-info="${this.escapeHtml(id)}"><i class="fas fa-circle-info"></i>Подробнее</button>` +
                    `</div>` +
                `</div>`
            );
        }).join('');

        const byId = new Map(filtered.map((x) => [String(x?.id || ''), x]));
        grid.querySelectorAll('[data-dir-info]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-dir-info') || '';
                const obj = byId.get(id) || null;
                if (!obj) return;
                this.openObjectInfoModalReadonly(kind, obj);
            });
        });
    },

    openObjectInfoModalReadonly(kind, obj) {
        this.openObjectInfoModal(kind, obj, { selectable: false, closePick: false });
    },

    getPickListAndPlaceholder(kind) {
        const rel = this.relationsByUser || {};
        if (kind === 'driver') {
            return { items: Array.isArray(rel.drivers) ? rel.drivers : [], placeholder: 'Поиск по ФИО' };
        }
        if (kind === 'trailer') {
            return { items: Array.isArray(rel.trailer) ? rel.trailer : [], placeholder: 'Поиск по гос. номеру' };
        }
        return { items: Array.isArray(rel.trucks) ? rel.trucks : [], placeholder: 'Поиск по модели/номеру' };
    },

    buildPickSearchHay(kind, obj) {
        if (!obj) return '';
        if (kind === 'driver') {
            return [obj.lastName, obj.firstName, obj.patronymic].filter(Boolean).join(' ').toLowerCase();
        }
        // trucks/trailer
        const brandName = obj?.brand?.name || obj?.truckBrand?.name || obj?.truckBrand || '';
        const modelName = obj?.model?.name || obj?.truckModel?.name || obj?.truckModel || '';
        const trailerRegister = obj.registerNumber || obj.regNumber || obj.registrationNumber || '';
        return [
            trailerRegister,
            obj.uniqueCode || '',
            brandName,
            modelName,
            obj.year != null ? String(obj.year) : ''
        ].filter(Boolean).join(' ').toLowerCase();
    },

    isAutotrainConfigModalOpen() {
        const overlay = document.getElementById('rqAutotrainModalOverlay');
        return Boolean(overlay && overlay.classList.contains('is-open'));
    },

    getAutotrainConfigSnapshot() {
        const trains = Array.isArray(this.autotrainConfig.trains) ? this.autotrainConfig.trains : [];
        return JSON.stringify({
            readyToTransportVolume: this.autotrainConfig.readyVolume,
            tractorTrailer: trains.map((t) => ({
            truckId: String(t?.truckId || ''),
            trailerId: String(t?.trailerId || ''),
            driverId: String(t?.driverId || '')
            }))
        });
    },

    renderPickModal() {
        const titleEl = document.getElementById('rqPickModalTitle');
        const gridEl = document.getElementById('rqPickGrid');
        const countEl = document.getElementById('rqPickCount');
        const input = document.getElementById('rqPickSearchInput');
        if (!gridEl) return;
        const kind = this.autotrainConfig.pick.kind || 'truck';
        const idx = this.autotrainConfig.pick.trainIndex;
        const titleMap = { truck: 'Выберите транспорт', trailer: 'Выберите прицеп', driver: 'Выберите водителя' };
        if (titleEl) titleEl.textContent = titleMap[kind] || 'Выбор';

        const { items, placeholder } = this.getPickListAndPlaceholder(kind);
        if (input) input.placeholder = placeholder;

        if (!this.relationsByUser && this.autotrainConfig.isLoadingRelations) {
            gridEl.innerHTML = '<div class="rq-loading" style="min-height:180px;"><i class="fas fa-spinner fa-spin"></i><p>Загружаем справочник...</p></div>';
            if (countEl) countEl.textContent = 'Найдено: —';
            return;
        }
        if (!this.relationsByUser) {
            gridEl.innerHTML = '<div class="rq-error" style="min-height:180px;"><i class="fas fa-triangle-exclamation"></i><p>Не удалось загрузить справочник пользователя.</p></div>';
            if (countEl) countEl.textContent = 'Найдено: 0';
            return;
        }

        const needle = String(this.autotrainConfig.pick.search || '').trim().toLowerCase();
        const filtered = needle
            ? items.filter((x) => this.buildPickSearchHay(kind, x).includes(needle))
            : items.slice();

        if (countEl) countEl.textContent = 'Найдено: ' + String(filtered.length);

        if (!filtered.length) {
            gridEl.innerHTML = '<div class="rq-detail-card" style="grid-column: 1 / -1;"><div class="rq-row"><span class="k">Результат</span><span class="v">Ничего не найдено</span></div></div>';
            return;
        }

        const usage = this.getAutotrainUsageIndex();
        const cardHtml = (obj) => {
            const objId = String(obj.id || '');
            const usedIn = usage[kind]?.get(objId) || [];
            const usedNote = this.formatUsageNote(usedIn);
            if (kind === 'driver') {
                const fio = [obj.lastName, obj.firstName, obj.patronymic].filter(Boolean).join(' ') || '—';
                const phone = obj.phone || '—';
                return (
                    `<div class="rq-pick-card${usedIn.length ? ' is-used' : ''}">` +
                        `<div class="title">${this.escapeHtml(fio)}</div>` +
                        `<div class="sub">${this.escapeHtml('Телефон: ' + phone)}</div>` +
                        `<div class="chips">` +
                            `<span class="rq-pick-chip"><i class="fas fa-id-badge"></i>${this.escapeHtml(String(obj.uniqueCode || '').trim() || String(obj.id || '').slice(0, 8))}</span>` +
                        `</div>` +
                        (usedNote ? `<div class="rq-pick-used-note"><i class="fas fa-link"></i><strong>${this.escapeHtml(usedNote)}</strong></div>` : '') +
                        `<div class="rq-pick-card-actions">` +
                            `<button type="button" class="rq-pick-action-btn rq-pick-action-btn--primary" data-pick-select="${this.escapeHtml(objId)}"><i class="fas fa-check"></i>Выбрать</button>` +
                            `<button type="button" class="rq-pick-action-btn" data-pick-info="${this.escapeHtml(objId)}"><i class="fas fa-circle-info"></i>Подробнее</button>` +
                        `</div>` +
                    `</div>`
                );
            }
            const reg = obj.registerNumber || obj.regNumber || obj.registrationNumber || '—';
            const year = obj.year != null ? String(obj.year) : '';
            const code = String(obj.uniqueCode || '').trim() || String(obj.id || '').slice(0, 8);
            const brandName = obj?.brand?.name || obj?.truckBrand?.name || obj?.truckBrand || '';
            const modelName = obj?.model?.name || obj?.truckModel?.name || obj?.truckModel || '';
            const brandModel = [brandName, modelName].filter(Boolean).join(' ');
            const unloadingType =
                obj?.unloadingMethod?.name ||
                (Array.isArray(obj?.unloadingMethod) ? obj.unloadingMethod.map((x) => x?.name).filter(Boolean).join(', ') : '') ||
                obj?.trailerType?.name ||
                obj?.type?.name ||
                obj?.bodyType?.name ||
                '';
            const tonnageVal = obj?.tonnage != null ? String(obj.tonnage) : '';
            const sub = kind === 'truck'
                ? `Год: ${year || '—'}`
                : [
                    unloadingType ? `Тип выгрузки: ${unloadingType}` : '',
                    tonnageVal ? `Грузоподъемность: ${tonnageVal} т` : ''
                ].filter(Boolean).join(' • ') || '—';
            const title = kind === 'truck' ? (brandModel || reg || 'Тягач') : 'Прицеп';
            return (
                `<div class="rq-pick-card${usedIn.length ? ' is-used' : ''}">` +
                    `<div class="title">${this.escapeHtml(title)}</div>` +
                    `<div class="sub">${this.escapeHtml(sub)}</div>` +
                    `<div class="chips">` +
                        (kind === 'truck'
                            ? `<span class="rq-pick-chip"><i class="fas fa-calendar"></i>${this.escapeHtml(year || '—')}</span>` +
                              `<span class="rq-pick-chip"><i class="fas fa-rectangle-list"></i>${this.escapeHtml(reg)}</span>`
                            : `<span class="rq-pick-chip"><i class="fas fa-hashtag"></i>${this.escapeHtml(code)}</span>` +
                              `<span class="rq-pick-chip"><i class="fas fa-rectangle-list"></i>${this.escapeHtml(reg)}</span>`) +
                    `</div>` +
                    (usedNote ? `<div class="rq-pick-used-note"><i class="fas fa-link"></i><strong>${this.escapeHtml(usedNote)}</strong></div>` : '') +
                    `<div class="rq-pick-card-actions">` +
                        `<button type="button" class="rq-pick-action-btn rq-pick-action-btn--primary" data-pick-select="${this.escapeHtml(objId)}"><i class="fas fa-check"></i>Выбрать</button>` +
                        `<button type="button" class="rq-pick-action-btn" data-pick-info="${this.escapeHtml(objId)}"><i class="fas fa-circle-info"></i>Подробнее</button>` +
                    `</div>` +
                `</div>`
            );
        };

        gridEl.innerHTML = filtered.map(cardHtml).join('');
        const byId = new Map(filtered.map((x) => [String(x?.id || ''), x]));

        gridEl.querySelectorAll('[data-pick-select]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-pick-select') || '';
                if (!id) return;
                if (!Number.isFinite(idx) || idx < 0) return;
                this.setTrainField(idx, kind, id);
                this.closePickModal();
            });
        });

        gridEl.querySelectorAll('[data-pick-info]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-pick-info') || '';
                if (!id) return;
                const obj = byId.get(id) || null;
                if (!obj) {
                    this.openInfoModal('Информация', '<p class="deal-modal-empty" style="margin-top:0.45rem;">Объект не найден.</p>');
                    return;
                }
                this.openAutotrainObjectInfoModal(kind, obj);
            });
        });
    },

    openAutotrainObjectInfoModal(kind, obj) {
        this.openObjectInfoModal(kind, obj, { selectable: true, closePick: true });
    },

    openObjectInfoModal(kind, obj, opts = {}) {
        const selectable = opts.selectable === true;
        const closePick = opts.closePick !== false;
        if (closePick) this.closePickModal();

        const titleMap = { truck: 'Информация о транспорте', trailer: 'Информация о прицепе', driver: 'Информация о водителе' };
        const title = titleMap[kind] || 'Информация';

        const getReg = (o) => o?.registerNumber || o?.regNumber || o?.registrationNumber || '';
        const getFio = (o) => [o?.lastName, o?.firstName, o?.patronymic].filter(Boolean).join(' ') || '';

        const docFieldMap = {
            truck: ['vehiclePassportPhotoFront', 'vehiclePassportPhotoBack', 'truckPhoto'],
            trailer: ['vehiclePassportPhotoFront', 'vehiclePassportPhotoBack'],
            driver: ['driverPhoto', 'driverLicensePhotoFront', 'driverLicensePhotoBack']
        };

        const docsList = (() => {
            if (kind === 'truck') {
                return [
                    { label: 'ПТС (лицевая)', url: obj.vehiclePassportPhotoFront, icon: 'id-card' },
                    { label: 'ПТС (оборот)', url: obj.vehiclePassportPhotoBack, icon: 'id-card' },
                    { label: 'Фото транспорта', url: obj.truckPhoto, icon: 'image' }
                ];
            }
            if (kind === 'trailer') {
                return [
                    { label: 'ПТС прицепа (лицевая)', url: obj.vehiclePassportPhotoFront, icon: 'id-card' },
                    { label: 'ПТС прицепа (оборот)', url: obj.vehiclePassportPhotoBack, icon: 'id-card' }
                ];
            }
            return [
                { label: 'Фото водителя', url: obj.driverPhoto, icon: 'image' },
                { label: 'ВУ (лицевая)', url: obj.driverLicensePhotoFront, icon: 'id-card' },
                { label: 'ВУ (оборот)', url: obj.driverLicensePhotoBack, icon: 'id-card' }
            ];
        })();

        // Показываем все поля кроме `id`. URL/файлы логично унести в раздел документов.
        const excludedDocKeys = new Set(docFieldMap[kind] || []);
        const skipForGeneral = (key) => {
            const k = String(key || '');
            if (k === 'id') return true;
            // Поле пользователя в "Подробнее" не показываем.
            if (k === 'usersId') return true;
            // Для тягача: "Код" и повтор марка/модель убираем из общего блока,
            // оставляем марка/модель только в заголовке.
            if (kind === 'truck') {
                if (k === 'uniqueCode' || k === 'brand' || k === 'model') return true;
            }
            if (excludedDocKeys.has(key)) return true;
            const lk = String(key || '').toLowerCase();
            // Не показываем прямые ссылки на файлы/фото в "общих данных"
            if (lk.includes('photo') || lk.includes('document') || lk.includes('url') || lk.includes('file')) return true;
            return false;
        };

        const entries = Object.entries(obj || {})
            .filter(([k, v]) => !skipForGeneral(k))
            .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== '');

        const preferredOrder = (() => {
            if (kind === 'driver') {
                return [
                    'uniqueCode', 'lastName', 'firstName', 'patronymic',
                    'phone', 'passportSerial', 'passportNumber', 'issued', 'code', 'date',
                    'driverLicenseSerial', 'driverLicenseNumber'
                ];
            }
            if (kind === 'truck') {
                return ['uniqueCode', 'registerNumber', 'year', 'brand', 'model', 'trucksType', 'truckPhoto'];
            }
            return ['uniqueCode', 'registerNumber', 'length', 'width', 'height', 'tonnage', 'clearance'];
        })();

        const byKey = new Map(entries.map(([k, v]) => [k, v]));
        const orderedKeys = [];
        preferredOrder.forEach((k) => { if (byKey.has(k) && !orderedKeys.includes(k)) orderedKeys.push(k); });
        entries.forEach(([k]) => { if (!orderedKeys.includes(k)) orderedKeys.push(k); });

        const generalFieldsHtml = (orderedKeys.length
            ? orderedKeys.map((k) => {
                const v = byKey.get(k);
                const label = this.prettifyKey(k);
                return (
                    `<div class="rq-obj-field">` +
                        `<span class="k">${this.escapeHtml(label)}</span>` +
                        `<span class="v">${this.escapeHtml(this.formatAnyValue(v))}</span>` +
                    `</div>`
                );
            }).join('')
            : `<p class="deal-modal-empty">Нет данных</p>`);

        const docsHtml = (() => {
            const visibleDocs = docsList.filter((d) => d && d.url);
            if (!visibleDocs.length) return `<p class="deal-modal-empty">Нет документов</p>`;
            return (
                `<div class="rq-obj-docs-row">` +
                    visibleDocs.map((d) => (
                        `<div class="rq-obj-doc">` +
                            `<span class="k">${this.escapeHtml(d.label)}</span>` +
                            this.buildDocLink(d.url, 'Открыть файл') +
                        `</div>`
                    )).join('') +
                `</div>`
            );
        })();

        const heroKindClass = kind === 'truck' ? 'rq-obj-hero--truck' : (kind === 'trailer' ? 'rq-obj-hero--trailer' : 'rq-obj-hero--driver');
        const heroIcon = kind === 'truck' ? 'fa-truck' : (kind === 'trailer' ? 'fa-trailer' : 'fa-id-card');
        const heroK = kind === 'truck' ? 'Транспорт' : (kind === 'trailer' ? 'Прицеп' : 'Водитель');

        const regText = getReg(obj);
        const yearText = obj?.year != null ? String(obj.year) : '';
        const uniqueCode = obj?.uniqueCode != null ? String(obj.uniqueCode) : '';
        const brandName = obj?.brand?.name || obj?.truckBrand?.name || obj?.truckBrand || '';
        const modelName = obj?.model?.name || obj?.truckModel?.name || obj?.truckModel || '';
        const brandModel = [brandName, modelName].filter(Boolean).join(' ');
        const fioText = getFio(obj);

        const heroTitle =
            kind === 'driver'
                ? fioText || '—'
                : (kind === 'truck' ? (brandModel || '—') : (regText || uniqueCode || '—'));

        const heroSub =
            kind === 'driver'
                ? (obj?.phone ? `Телефон: ${obj.phone}` : '')
                : (kind === 'truck'
                    ? (yearText ? `Год: ${yearText}` : '')
                    : (yearText ? `Год: ${yearText}` : ''));

        const body =
            `<div class="rq-obj-modal">` +
                `<div class="rq-obj-hero ${heroKindClass}">` +
                    `<div class="rq-obj-hero-left">` +
                        `<div class="rq-obj-hero-icon"><i class="fas ${heroIcon}"></i></div>` +
                        `<div>` +
                            `<span class="rq-obj-hero-k">${this.escapeHtml(heroK)}</span>` +
                            `<h3 class="rq-obj-hero-title">${this.escapeHtml(heroTitle)}</h3>` +
                            (heroSub ? `<div class="rq-obj-hero-sub">${this.escapeHtml(heroSub)}</div>` : '') +
                        `</div>` +
                    `</div>` +
                `</div>` +

                `<section class="rq-obj-section">` +
                    `<div class="rq-obj-section-title"><i class="fas fa-list-ul"></i> Все данные</div>` +
                    `<div class="rq-obj-grid">${generalFieldsHtml}</div>` +
                `</section>` +

                `<section class="rq-obj-section">` +
                    `<div class="rq-obj-section-title"><i class="fas fa-file-arrow-up"></i> Документы</div>` +
                    `${docsHtml}` +
                `</section>` +

                (selectable
                    ? (
                        `<div style="display:flex;justify-content:flex-end;gap:0.6rem;flex-wrap:wrap;">` +
                            `<button type="button" class="btn btn-primary" id="rqInfoModalPickBtn"><i class="fas fa-check"></i> Выбрать</button>` +
                        `</div>`
                    )
                    : ''
                ) +
            `</div>`;

        this.openInfoModal(title, body);
        if (selectable) {
            const pickBtn = document.getElementById('rqInfoModalPickBtn');
            pickBtn?.addEventListener('click', () => {
                if (!Number.isFinite(this.autotrainConfig.pick.trainIndex) || this.autotrainConfig.pick.trainIndex < 0) return;
                const trainIndex = this.autotrainConfig.pick.trainIndex;
                this.setTrainField(trainIndex, kind, String(obj.id || ''));
                this.closePickModal();
                this.closeInfoModal();
            });
        }
    },

    async saveAutotrainConfig() {
        if (this.autotrainConfig.isSaving) return;
        if (!this.hasAtLeastOneCompleteTrain()) return;
        if (!this.autotrainConfig.hasChanges) return;
        const saveBtn = document.getElementById('rqAutotrainSaveBtn');
        const originalHtml = saveBtn ? saveBtn.innerHTML : null;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохраняем...';
        }
        this.autotrainConfig.isSaving = true;

        const currentVolume = this.autotrainConfig.readyVolume != null
            ? this.autotrainConfig.readyVolume
            : (this.request?.readyToTransportVolume ?? this.request?.readyToTransport ?? this.request?.volume ?? 0);
        const payload = {
            id: String(this.requestId || this.request?.id || ''),
            readyToTransportVolume: currentVolume,
            // Отправляем только заполненные автопоезда: тягач + прицеп + водитель.
            // Пустые/незаполненные строки не должны попадать в конфигурацию.
            tractorTrailer: this.autotrainConfig.trains
                .filter((t) => this.isTrainComplete(t))
                .map((t) => ({
                    trucks: String(t.truckId || ''),
                    trailer: String(t.trailerId || ''),
                    drivers: String(t.driverId || '')
                }))
        };

        const result = await this.patchUpdateLotsRequest(payload);
        this.autotrainConfig.isSaving = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            if (originalHtml != null) saveBtn.innerHTML = originalHtml;
        }
        if (result && result.ok) {
            // Reload request to reflect server-side state
            try {
                this.request = await this.fetchRequestById(this.requestId);
                // Обновляем всю деталку, чтобы "Готов перевезти" и остальные поля стали актуальными.
                this.render();
            } catch (_) { /* ignore */ }
            this.closeAutotrainConfigModal();
            return;
        }

        const hint = document.getElementById('rqConfigHint');
        if (hint) hint.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Не удалось сохранить конфигурацию. Попробуйте еще раз.';
    }
};
