document.addEventListener('DOMContentLoaded', () => {
    MyDealsManager.init();
});

const MyDealsManager = {
    currentPage: 1,
    limit: 10,
    isLoading: false,
    hasMore: true,

    init() {
        this.dealsGrid = document.getElementById('dealsGrid');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        this.errorState = document.getElementById('errorState');
        this.loadMoreContainer = document.getElementById('loadMoreContainer');
        this.loadMoreBtn = document.getElementById('loadMoreBtn');
        this.retryLoadBtn = document.getElementById('retryLoadBtn');

        this.bindEvents();
        this.loadDeals(this.currentPage);
    },

    bindEvents() {
        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => {
                this.loadDeals(this.currentPage + 1);
            });
        }

        if (this.retryLoadBtn) {
            this.retryLoadBtn.addEventListener('click', () => {
                this.loadDeals(this.currentPage);
            });
        }

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.party-btn-farmer');
            if (btn) {
                const card = btn.closest('.deal-card');
                const userId = card && card.dataset.farmerId;
                if (userId) this.openPartnerModal('Фермер', userId);
                return;
            }
            const btnEx = e.target.closest('.party-btn-exporter');
            if (btnEx) {
                const card = btnEx.closest('.deal-card');
                const userId = card && card.dataset.exporterId;
                if (userId) this.openPartnerModal('Экспортер', userId);
                return;
            }

            const cropBtn = e.target.closest('.route-crop-btn');
            if (cropBtn) {
                const card = cropBtn.closest('.deal-card');
                const dealId = card && card.dataset.id;
                if (dealId) this.openCropModal(dealId);
            }
        });

        const partnerClose = document.getElementById('partnerModalClose');
        const partnerOverlay = document.getElementById('partnerModalOverlay');
        if (partnerClose) partnerClose.addEventListener('click', () => this.closePartnerModal());
        if (partnerOverlay) {
            partnerOverlay.addEventListener('click', (e) => {
                if (e.target === partnerOverlay) this.closePartnerModal();
            });
        }

        const cropClose = document.getElementById('cropModalClose');
        const cropOverlay = document.getElementById('cropModalOverlay');
        if (cropClose) cropClose.addEventListener('click', () => this.closeCropModal());
        if (cropOverlay) {
            cropOverlay.addEventListener('click', (e) => {
                if (e.target === cropOverlay) this.closeCropModal();
            });
        }
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

    async fetchUserById(userId) {
        if (!userId) return null;
        const headers = await this.getAuthHeaders();
        if (!headers) return null;
        const url = API_CONFIG.BASE_URL + '/moderators-module/all-by-user?id=' + encodeURIComponent(userId);
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (res.status === 401 || res.status === 403) {
                if (typeof logout === 'function') logout();
                return null;
            }
            if (!res.ok) return null;
            const text = await res.text();
            if (!text) return null;
            return JSON.parse(text);
        } catch (e) {
            console.error('fetchUserById error', e);
            return null;
        }
    },

    async fetchDealById(dealId) {
        if (!dealId) return null;
        const headers = await this.getAuthHeaders();
        if (!headers) return null;
        const url = API_CONFIG.BASE_URL + '/moderators-module/deals/by-id/' + encodeURIComponent(dealId);
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (res.status === 401 || res.status === 403) {
                if (typeof logout === 'function') logout();
                return null;
            }
            if (!res.ok) return null;
            const text = await res.text();
            if (!text) return null;
            return JSON.parse(text);
        } catch (e) {
            console.error('fetchDealById error', e);
            return null;
        }
    },

    async fetchCropsAllRelations() {
        const headers = await this.getAuthHeaders();
        if (!headers) return window._cropsProperties || [];
        const url = API_CONFIG.BASE_URL + '/farmer/crops/all-relations';
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (!res.ok) return window._cropsProperties || [];
            const data = await res.json();
            const list = data && data.cropsProperty ? data.cropsProperty : [];
            window._cropsProperties = list;
            return list;
        } catch (e) {
            return window._cropsProperties || [];
        }
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

    setPartnerText(idSuffix, text) {
        const el = document.getElementById('partnerModal' + idSuffix);
        if (el) el.textContent = text != null && text !== '' ? text : '—';
    },

    renderPartnerMapInModal(user) {
        if (!user) return;
        const ep = user.entrepreneurProfile || {};
        const jp = user.juridicalProfile || {};
        const profile = ep.id ? ep : jp;
        const verificationName = (user.verificationStatus && user.verificationStatus.name) ? user.verificationStatus.name : (user.isVerified ? 'Верификация пройдена' : '—');

        const avatarWrap = document.getElementById('partnerModalAvatar');
        if (avatarWrap) {
            if (user.avatar && String(user.avatar).trim()) {
                avatarWrap.style.backgroundImage = 'url(' + user.avatar + ')';
                avatarWrap.style.backgroundSize = 'cover';
                avatarWrap.style.backgroundPosition = 'center';
                avatarWrap.innerHTML = '';
            } else {
                avatarWrap.style.backgroundImage = '';
                avatarWrap.innerHTML = '<span class="deal-partner-avatar-placeholder"><i class="fas fa-user"></i><span>Нет фото</span></span>';
            }
        }

        this.setPartnerText('CreatedAt', user.created_at ? this.formatDate(user.created_at) : '—');
        this.setPartnerText('Phone', user.phone || '—');
        this.setPartnerText('Rating', user.rating != null ? String(user.rating) : '—');
        this.setPartnerText('Verification', verificationName);

        this.setPartnerText('LastName', profile.lastName || ep.lastName || '—');
        this.setPartnerText('FirstName', profile.firstName || ep.firstName || '—');
        this.setPartnerText('Patronymic', profile.patronymic || ep.patronymic || '—');
        this.setPartnerText('DateOfBirth', (profile.dateOfBirth || ep.dateOfBirth) ? this.formatDate(profile.dateOfBirth || ep.dateOfBirth) : '—');
        this.setPartnerText('Email', user.email || '—');

        this.setPartnerText('Inn', ep.inn || jp.inn || '—');
        this.setPartnerText('Ogrnip', ep.ogrnip || jp.ogrnip || '—');
        this.setPartnerText('OrgName', ep.organizationName || jp.organizationName || '—');
        this.setPartnerText('LegalAddress', ep.legalAddress || jp.legalAddress || '—');
        this.setPartnerText('BankName', ep.bankName || jp.bankName || '—');
        this.setPartnerText('Bik', ep.bik || jp.bik || '—');
        this.setPartnerText('CorrAccount', ep.correspondentAccount || jp.correspondentAccount || '—');
        this.setPartnerText('CheckingAccount', ep.checkingAccount || jp.checkingAccount || '—');
    },

    async openPartnerModal(roleLabel, userId) {
        const overlay = document.getElementById('partnerModalOverlay');
        const titleEl = document.getElementById('partnerModalTitle');
        const loadingEl = document.getElementById('partnerModalLoading');
        const contentEl = document.getElementById('partnerModalContent');
        if (!overlay || !titleEl) return;

        titleEl.textContent = 'Карта партнёра: ' + roleLabel;
        contentEl && contentEl.querySelector('.partner-modal-error')?.remove();
        if (loadingEl) loadingEl.style.display = 'flex';
        if (contentEl) contentEl.style.display = 'none';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');

        const user = await this.fetchUserById(userId);
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) {
            contentEl.style.display = 'block';
            if (user) {
                contentEl.querySelector('.partner-modal-error')?.remove();
                this.renderPartnerMapInModal(user);
            } else {
                const err = contentEl.querySelector('.partner-modal-error');
                if (!err) {
                    const p = document.createElement('p');
                    p.className = 'partner-modal-error';
                    p.style.cssText = 'padding:1rem;color:var(--text-light);';
                    p.textContent = 'Не удалось загрузить данные пользователя.';
                    contentEl.insertBefore(p, contentEl.firstChild);
                }
            }
        }
    },

    closePartnerModal() {
        const overlay = document.getElementById('partnerModalOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    },

    buildCropModalContent(dealData) {
        const sale = dealData.saleRequest || {};
        const crops = dealData.crops || {};
        const cropsId = crops && crops.id ? String(crops.id) : '';
        const cropsUniqueCode = crops && crops.uniqueCode != null && String(crops.uniqueCode).trim() !== '' ? String(crops.uniqueCode).trim() : '—';
        const cropType = (crops.cropsType) || {};
        const cropTypeId = cropType && cropType.id;
        const region = crops.cropsOriginRegion && crops.cropsOriginRegion.name;
        const shelfLife = crops.cropsShelfLife != null
            ? crops.cropsShelfLife + ' ' + ((crops.cropsShelfLifeType && crops.cropsShelfLifeType.name) ? crops.cropsShelfLifeType.name : '')
            : '—';

        const cultureValues = crops.cropsPropertyValue || [];
        const allProps = window._cropsProperties || [];
        const cultureProperties = cropTypeId ? allProps.filter(p => p.cropsType && p.cropsType.id === cropTypeId) : [];

        const generalItems = [
            { label: 'ID культуры', value: cropsUniqueCode, empty: cropsUniqueCode === '—' },
            { label: 'Культура', value: (cropType && cropType.name) || 'Не заполнено', empty: !(cropType && cropType.name) },
            { label: 'Регион происхождения', value: region || 'Не заполнено', empty: !region },
            { label: 'Год урожая', value: crops.yearOfHarvest != null ? String(crops.yearOfHarvest) : 'Не заполнено', empty: crops.yearOfHarvest == null },
            { label: 'Срок хранения', value: shelfLife !== '—' ? shelfLife : 'Не заполнено', empty: shelfLife === '—' }
        ];

        let generalHtml = '<div class="deal-modal-section"><div class="deal-modal-section-title">Общая информация</div>';
        generalItems.forEach(r => {
            const valClass = r.empty ? ' deal-modal-item-value-empty' : '';
            generalHtml += '<div class="deal-modal-item"><span class="deal-modal-item-label">' + this.escapeHtml(r.label) + '</span><span class="deal-modal-item-value' + valClass + '">' + this.escapeHtml(r.value) + '</span></div>';
        });
        generalHtml += '</div>';

        let qualityHtml = '<div class="deal-modal-section"><div class="deal-modal-section-title">Показатель качества</div>';
        if (cultureProperties.length === 0) {
            qualityHtml += '<p class="deal-modal-empty">Нет данных о показателях качества для данного типа культуры.</p>';
        } else {
            cultureProperties.forEach(prop => {
                const valueObj = cultureValues.find(v => v.cropsProperty && v.cropsProperty.id === prop.id);
                const val = valueObj != null && valueObj.value !== undefined && valueObj.value !== null ? valueObj.value : null;
                const display = val !== null ? (val + (prop.unit ? ' ' + prop.unit : '')) : 'Не заполнено';
                const valClass = val === null ? ' deal-modal-item-value-empty' : '';
                qualityHtml += '<div class="deal-modal-item"><span class="deal-modal-item-label">' + this.escapeHtml(prop.name || '—') + '</span><span class="deal-modal-item-value' + valClass + '">' + this.escapeHtml(display) + '</span></div>';
            });
        }
        qualityHtml += '</div>';

        let html = '<div class="deal-modal-declarations">';
        html += '<div class="deal-modal-tab-btns"><button type="button" class="deal-modal-tab-btn is-active" data-tab="general">Общая информация</button><button type="button" class="deal-modal-tab-btn" data-tab="quality">Показатель качества</button></div>';
        html += '<div class="deal-modal-tab-panel is-active" data-tab="general">' + generalHtml + '</div>';
        html += '<div class="deal-modal-tab-panel" data-tab="quality">' + qualityHtml + '</div>';
        if (cropsId) {
            html += '<div class="deal-crop-go-wrap"><a class="deal-crop-go-btn" href="/verification/detail/quality/' + encodeURIComponent(cropsId) + '/"><i class="fas fa-external-link-alt"></i> Перейти на культуру</a></div>';
        }
        html += '</div>';
        return html;
    },

    bindModalTabSwitcher(rootEl) {
        if (!rootEl) return;
        rootEl.querySelectorAll('.deal-modal-tab-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const tab = this.getAttribute('data-tab');
                rootEl.querySelectorAll('.deal-modal-tab-btn').forEach(b => b.classList.remove('is-active'));
                rootEl.querySelectorAll('.deal-modal-tab-panel').forEach(p => p.classList.remove('is-active'));
                this.classList.add('is-active');
                const panel = rootEl.querySelector('.deal-modal-tab-panel[data-tab="' + tab + '"]');
                if (panel) panel.classList.add('is-active');
            });
        });
    },

    async openCropModal(dealId) {
        const overlay = document.getElementById('cropModalOverlay');
        const titleEl = document.getElementById('cropModalTitle');
        const loadingEl = document.getElementById('cropModalLoading');
        const contentEl = document.getElementById('cropModalContent');
        if (!overlay || !titleEl || !contentEl) return;

        titleEl.textContent = 'Качество культуры';
        contentEl.innerHTML = '';
        if (loadingEl) loadingEl.style.display = 'flex';
        contentEl.style.display = 'none';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');

        // Подтягиваем справочник качественных показателей (как на деталке)
        if (!window._cropsProperties || window._cropsProperties.length === 0) {
            await this.fetchCropsAllRelations();
        }

        // На списке сделок часто нет вложенного crops — берём сделку по id (как на деталке)
        const dealData = await this.fetchDealById(dealId);
        if (loadingEl) loadingEl.style.display = 'none';
        contentEl.style.display = 'block';

        if (!dealData) {
            contentEl.innerHTML = '<p class="deal-modal-empty">Не удалось загрузить данные сделки для культуры.</p>';
            return;
        }

        contentEl.innerHTML = this.buildCropModalContent(dealData);
        this.bindModalTabSwitcher(contentEl);
    },

    closeCropModal() {
        const overlay = document.getElementById('cropModalOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    },

    async loadDeals(page) {
        if (this.isLoading) return;
        this.isLoading = true;

        if (page === 1) {
            this.dealsGrid.innerHTML = '';
            this.loadingState.style.display = 'flex';
            this.emptyState.style.display = 'none';
            this.errorState.style.display = 'none';
            this.loadMoreContainer.style.display = 'none';
        } else {
            this.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
            this.loadMoreBtn.disabled = true;
        }

        try {
            const authData = await getAuthTokens();
            
            if (authData.status !== 200 && authData.status !== 201) {
                if (authData.action === 'redirect_to_auth') {
                    window.location.href = '/account/login/';
                    return;
                }
                throw new Error('Ошибка авторизации');
            }

            const token = authData.data.accessToken;
            const url = `${API_CONFIG.BASE_URL}/moderators-module/deals/to-admin?page=${page}&limit=${this.limit}&orderBy=created_at&orderDirection=ASC`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Обработка полученных данных
            const deals = data.data || [];
            const meta = data.meta || {}; // Предполагаем, что есть мета-данные о пагинации

            if (deals.length > 0) {
                this.renderDeals(deals);
                this.currentPage = page;
                
                // Проверяем, есть ли еще страницы
                // Если API не возвращает meta.totalItems или totalPages, 
                // можно проверить, вернулось ли меньше элементов, чем лимит
                if (deals.length < this.limit) {
                    this.hasMore = false;
                    this.loadMoreContainer.style.display = 'none';
                } else {
                    this.hasMore = true;
                    this.loadMoreContainer.style.display = 'flex';
                }
            } else {
                if (page === 1) {
                    this.emptyState.style.display = 'flex';
                    this.loadMoreContainer.style.display = 'none';
                } else {
                    this.hasMore = false;
                    this.loadMoreContainer.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('Ошибка загрузки сделок:', error);
            if (page === 1) {
                this.errorState.style.display = 'flex';
            } else {
                alert('Не удалось загрузить дополнительные сделки. Попробуйте позже.');
            }
        } finally {
            this.isLoading = false;
            this.loadingState.style.display = 'none';
            
            if (this.loadMoreBtn) {
                this.loadMoreBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Загрузить еще';
                this.loadMoreBtn.disabled = false;
            }
        }
    },

    renderDeals(deals) {
        const dealsHTML = deals.map(deal => this.createDealCard(deal)).join('');
        this.dealsGrid.insertAdjacentHTML('beforeend', dealsHTML);
    },

    createDealCard(deal) {
        const dealId = deal.uniqueCode || deal.id.substring(0, 8);
        const status = deal.dealStatus ? deal.dealStatus.name : 'Неизвестно';
        const statusClass = this.getStatusClass(deal.dealStatus ? deal.dealStatus.id : 0);

        const volume = parseFloat(deal.volume || 0).toLocaleString('ru-RU');
        const price = parseFloat(deal.pricePerTon || 0).toLocaleString('ru-RU');
        const distanceKm = deal.distance != null ? (deal.distance >= 1000 ? (deal.distance / 1000).toFixed(1) + ' км' : deal.distance + ' км') : '—';

        const startDate = deal.startDate ? new Date(deal.startDate).toLocaleDateString('ru-RU') : null;
        const deadline = deal.deadline ? new Date(deal.deadline).toLocaleDateString('ru-RU') : null;
        const createdDate = deal.created_at ? new Date(deal.created_at).toLocaleDateString('ru-RU') : '—';
        const daysToUnloading = deal.daysToUnloading != null ? deal.daysToUnloading : null;

        let timelineText, timelineIcon;
        if (startDate && deadline) {
            timelineText = `${startDate} – ${deadline}`;
            timelineIcon = 'fa-calendar-check';
        } else if (daysToUnloading != null) {
            timelineText = `${daysToUnloading} дней`;
            timelineIcon = 'fa-hourglass-half';
        } else {
            timelineText = '—';
            timelineIcon = 'fa-calendar-check';
        }

        const pricePerTonText = price ? price + ' р/т' : '— р/т';
        const hasDates = startDate && deadline;
        const dealPlateLabel = hasDates ? 'Сроки сделки' : (daysToUnloading != null ? 'Кол-во дней' : 'Сроки сделки');
        const dealPlateValue = hasDates ? `${startDate} – ${deadline}` : (daysToUnloading != null ? `${daysToUnloading} дней` : '—');

        return `
            <div class="deal-card" data-id="${deal.id}" data-farmer-id="${deal.farmerUserId || ''}" data-exporter-id="${deal.exporterUserId || ''}">
                <div class="deal-header">
                    <div class="deal-header-left">
                        <span class="deal-id">#DEAL-${dealId}</span>
                        <span class="deal-created">Создано: ${createdDate}</span>
                    </div>
                    <div class="deal-badge-wrap">
                        <div class="deal-badge ${statusClass}">${status}</div>
                    </div>
                </div>

                <div class="deal-plates">
                    <div class="deal-plate">
                        <span class="deal-plate-label">Способ доставки</span>
                        <span class="deal-plate-value">${deal.deliveryMethod ? deal.deliveryMethod.name : '—'}</span>
                    </div>
                    <div class="deal-plate">
                        <span class="deal-plate-label">Километраж</span>
                        <span class="deal-plate-value">${distanceKm}</span>
                    </div>
                    <div class="deal-plate">
                        <span class="deal-plate-label">Тонны</span>
                        <span class="deal-plate-value">${volume} т</span>
                    </div>
                    <div class="deal-plate">
                        <span class="deal-plate-label">${dealPlateLabel}</span>
                        <span class="deal-plate-value">${dealPlateValue}</span>
                    </div>
                </div>

                <div class="deal-price-block">
                    <div class="deal-price-per-ton">${pricePerTonText}</div>
                    <div class="deal-price-actions">
                        <button type="button" class="deal-btn-link party-btn-farmer">
                            <span>Перейти к фермеру</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button type="button" class="deal-btn-link party-btn-exporter">
                            <span>Перейти к экспортеру</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <div class="deal-actions">
                    <button type="button" class="btn btn-show-farmer route-crop-btn" title="Открыть модалку культуры">
                        <i class="fas fa-seedling"></i> Подробнее о культуре
                    </button>
                    <a href="/order/deal/${deal.id}/" class="btn btn-details btn-deal-go">
                        <i class="fas fa-external-link-alt"></i> Перейти к сделке
                    </a>
                </div>
            </div>
        `;
    },

    getStatusClass(statusId) {
        // Примерное сопоставление ID статусов с классами
        // 6 - Ожидает завершения
        switch (statusId) {
            case 1: return 'active'; // Активная
            case 6: return 'work'; // В работе / Ожидает завершения
            case 10: return 'completed'; // Завершена
            default: return 'search'; // По умолчанию
        }
    }
};
