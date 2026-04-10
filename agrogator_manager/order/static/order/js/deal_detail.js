/**
 * Детальная страница сделки.
 * Запрос: GET /moderators-module/deals/by-id/{dealId}
 * Шаблон и стили — в приложении order, хедер из main/base.html.
 */
(function () {
    function getDealId() {
        const el = document.getElementById('dealId');
        return el ? el.value.trim() : null;
    }

    /**
     * Финальный статус «отклонена», без ложных срабатываний:
     * «отклонения» в «ожидает подтверждения или отклонения», «не отклонена» и т.п.
     */
    function isDealRejectedStatus(statusLower) {
        var s = (statusLower || '').replace(/ё/g, 'е');
        if (!s) return false;
        if (s.indexOf('ожидает подтвержд') !== -1) return false;
        if (s.indexOf('не отклон') !== -1) return false;
        var tokens = s.split(/[^а-яеa-z0-9]+/i).filter(Boolean);
        var w = ['отклонена', 'отклонен', 'отклонено', 'отклонены'];
        for (var i = 0; i < tokens.length; i++) {
            if (w.indexOf(tokens[i]) !== -1) return true;
        }
        return false;
    }

    function isWorkingProcessStatus(dealStatus, statusLower) {
        if (dealStatus && String(dealStatus.id) === '5') return true;
        var s = (statusLower || '').replace(/ё/g, 'е');
        return s.indexOf('рабочий процесс') !== -1;
    }

    async function getAuthHeaders() {
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
    }

    async function fetchDeal(dealId) {
        const headers = await getAuthHeaders();
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
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const text = await res.text();
            if (!text) return null;
            return JSON.parse(text);
        } catch (e) {
            console.error('fetchDeal error', e);
            return null;
        }
    }

    /** Повторная загрузка деталки сделки (после прикрепления / правок документов). */
    async function refreshDealDetail() {
        var id = getDealId();
        if (!id) return null;
        var data = await fetchDeal(id);
        if (data) renderDeal(data);
        return data;
    }

    async function fetchUserById(userId) {
        if (!userId) return null;
        const headers = await getAuthHeaders();
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
    }

    async function fetchCropsAllRelations() {
        var headers = await getAuthHeaders();
        if (!headers) {
            window._cropsProperties = [];
            return [];
        }
        try {
            var res = await fetch(API_CONFIG.BASE_URL + '/farmer/crops/all-relations', {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (!res.ok) {
                window._cropsProperties = [];
                return [];
            }
            var data = await res.json();
            var list = data && data.cropsProperty ? data.cropsProperty : [];
            window._cropsProperties = list;
            return list;
        } catch (e) {
            console.error('fetchCropsAllRelations error', e);
            window._cropsProperties = [];
            return [];
        }
    }

    /**
     * PATCH go-to-sign — тот же шаблон, что sendToAccept на странице качества культур
     * (quality_detail.js: fetch + BASE_URL + path.replace('/api/', ''), headers + Content-Type, body {}).
     */
    async function goToSign(dealId) {
        var urlPath = '/moderators-module/deals/go-to-sign/' + encodeURIComponent(dealId);
        try {
            var headers = await getAuthHeaders();
            if (!headers) return false;
            // go-to-sign может работать дольше (генерация/подготовка документов),
            // поэтому ставим увеличенный таймаут, иначе запрос будет прерываться на клиенте.
            var response = await fetch(API_CONFIG.BASE_URL + urlPath.replace('/api/', ''), {
                method: 'PATCH',
                headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_GO_TO_SIGN || 300000)
            });
            if (response.status === 401 || response.status === 403) {
                if (typeof logout === 'function') logout();
                return false;
            }
            if (!response.ok) {
                console.error('goToSign HTTP ошибка, статус:', response.status);
                return false;
            }
            try {
                var text = await response.text();
                if (text) JSON.parse(text);
            } catch (parseErr) {
                /* как при 204 / пустом теле — успех без JSON */
            }
            return true;
        } catch (e) {
            console.error('Ошибка запроса goToSign ' + urlPath + ':', e);
            return false;
        }
    }

    /**
     * PATCH go-to-finish — отправка завершающих документов на подписание в Контур.Диадок.
     * Возвращает { ok: true } при 200, { ok: false, status: 409 } при 409, иначе { ok: false }.
     */
    async function goToFinish(dealId) {
        var urlPath = '/moderators-module/deals/go-to-finish/' + encodeURIComponent(dealId);
        try {
            var headers = await getAuthHeaders();
            if (!headers) return { ok: false };
            var response = await fetch(API_CONFIG.BASE_URL + urlPath.replace('/api/', ''), {
                method: 'PATCH',
                headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_GO_TO_SIGN || 300000)
            });
            if (response.status === 401 || response.status === 403) {
                if (typeof logout === 'function') logout();
                return { ok: false };
            }
            if (response.status === 409) return { ok: false, status: 409 };
            if (!response.ok) {
                console.error('goToFinish HTTP ошибка, статус:', response.status);
                return { ok: false };
            }
            try {
                var text = await response.text();
                if (text) JSON.parse(text);
            } catch (parseErr) { /* 204 / пустое тело */ }
            return { ok: true };
        } catch (e) {
            console.error('Ошибка запроса goToFinish ' + urlPath + ':', e);
            return { ok: false };
        }
    }

    var _pendingFinishImbalanceBtn = null;

    function finishDocsCoverBothSides(docs) {
        var list = Array.isArray(docs) ? docs : [];
        var hasFarmer = list.some(function (d) { return d.finishDocumentTo !== 'exporter'; });
        var hasExporter = list.some(function (d) { return d.finishDocumentTo === 'exporter'; });
        return { hasFarmer: hasFarmer, hasExporter: hasExporter, balanced: hasFarmer && hasExporter };
    }

    function performGoToFinishWithButton(btn) {
        var id = getDealId();
        if (!id || !btn) return;
        var originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Отправка...</span>';
        goToFinish(id).then(function (result) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            if (result.ok) {
                openFinishSuccessModal();
                if (typeof refreshDealDetail === 'function') refreshDealDetail();
            } else if (result.status === 409) {
                openFinish409Modal();
            }
        });
    }

    async function rejectDealByAgrogator(dealId) {
        var urlPath = '/moderators-module/deals/reject-deal-by-agrogator/' + encodeURIComponent(dealId);
        try {
            var headers = await getAuthHeaders();
            if (!headers) return false;
            var response = await fetch(API_CONFIG.BASE_URL + urlPath.replace('/api/', ''), {
                method: 'PATCH',
                headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });
            if (response.status === 401 || response.status === 403) {
                if (typeof logout === 'function') logout();
                return false;
            }
            if (!response.ok) {
                console.error('rejectDealByAgrogator HTTP ошибка, статус:', response.status);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Ошибка запроса rejectDealByAgrogator ' + urlPath + ':', e);
            return false;
        }
    }

    function parseUserForCard(user) {
        if (!user) return { fio: '—', company: '—', inn: '—' };
        var ep = user.entrepreneurProfile || {};
        var jp = user.juridicalProfile || {};
        var profile = ep.id ? ep : jp;
        var parts = [profile.lastName || ep.lastName, profile.firstName || ep.firstName, profile.patronymic || ep.patronymic].filter(Boolean);
        var fio = parts.length ? parts.join(' ') : (user.email || '—');
        var company = ep.organizationName || jp.organizationName || '—';
        var inn = ep.inn || jp.inn || '—';
        return { fio: fio, company: company, inn: inn };
    }

    function setParticipantCard(role, data, user) {
        var prefix = role === 'Farmer' ? 'dealRoleFarmer' : 'dealRoleExporter';
        setText(prefix + 'Fio', data.fio);
        setText(prefix + 'Company', data.company);
        setText(prefix + 'Inn', data.inn);
        var avatarEl = document.getElementById(prefix + 'Avatar');
        if (avatarEl) {
            if (user && user.avatar && String(user.avatar).trim()) {
                avatarEl.style.backgroundImage = 'url(' + user.avatar + ')';
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
                avatarEl.className = 'participant-card-avatar';
                avatarEl.innerHTML = '';
            } else {
                avatarEl.style.backgroundImage = '';
                avatarEl.className = 'participant-card-avatar participant-card-avatar-no-photo';
                var iconClass = role === 'Farmer' ? 'fas fa-tractor' : 'fas fa-building';
                avatarEl.innerHTML = '<i class="' + iconClass + '" aria-hidden="true"></i>';
            }
        }
    }

    function setPartnerText(idSuffix, text) {
        var el = document.getElementById('dealPartner' + idSuffix);
        if (el) el.textContent = text != null && text !== '' ? text : '—';
    }

    function renderPartnerFarmerQuality(d) {
        var contentEl = document.getElementById('dealPartnerQualityContent');
        if (!contentEl) return;
        if (!d) {
            contentEl.innerHTML = '<div class="deal-partner-quality-plaque-inner"><p class="deal-partner-quality-empty">Нет данных о культуре.</p></div>';
            return;
        }
        var sale = d.saleRequest || {};
        var crops = d.crops || {};
        var cropsId = crops && crops.id ? String(crops.id) : '';
        var cropsUniqueCode = crops && crops.uniqueCode != null && String(crops.uniqueCode).trim() !== '' ? String(crops.uniqueCode).trim() : '—';
        var cropType = crops.cropsType || {};
        var cropTypeId = cropType && cropType.id;
        var region = crops.cropsOriginRegion && crops.cropsOriginRegion.name;
        var shelfLife = crops.cropsShelfLife != null ? crops.cropsShelfLife + ' ' + (crops.cropsShelfLifeType && crops.cropsShelfLifeType.name ? crops.cropsShelfLifeType.name : '') : '—';
        var cultureValues = crops.cropsPropertyValue || [];
        var allProps = window._cropsProperties || [];
        var cultureProperties = cropTypeId ? allProps.filter(function (p) { return p.cropsType && p.cropsType.id === cropTypeId; }) : [];

        var qualityDocs = [];
        if (Array.isArray(crops.qualityDocument)) qualityDocs = crops.qualityDocument;
        else if (Array.isArray(crops.qualityDocuments)) qualityDocs = crops.qualityDocuments;
        else if (Array.isArray(sale.qualityDocument)) qualityDocs = sale.qualityDocument;
        else if (Array.isArray(sale.qualityDocuments)) qualityDocs = sale.qualityDocuments;

        function formGroup(label, value) {
            return '<div class="form-group"><label class="form-label">' + escapeHtml(label) + '</label><div class="form-value">' + escapeHtml(value) + '</div></div>';
        }
        function formRow(items) {
            var html = '<div class="form-row">';
            for (var i = 0; i < items.length; i++) {
                html += formGroup(items[i][0], items[i][1]);
            }
            if (items.length === 1) html += '<div class="form-group form-group-placeholder" aria-hidden="true"></div>';
            return html + '</div>';
        }

        var html = '<div class="deal-partner-quality-plaque-inner">';
        html += '<div class="section-header"><h2><i class="fas fa-flask"></i> Показатели качества и документы качества</h2></div>';
        html += '<div class="quality-fields">';
        html += formRow([['ID культуры', cropsUniqueCode], ['Культура', (cropType && cropType.name) || '—']]);
        html += formRow([['Год урожая', crops.yearOfHarvest != null ? String(crops.yearOfHarvest) : '—'], ['Регион происхождения', region || '—']]);
        html += formRow([['Срок хранения', shelfLife !== '—' ? shelfLife : '—']]);
        if (cultureProperties.length > 0) {
            var pairs = [];
            cultureProperties.forEach(function (prop) {
                var valueObj = cultureValues.find(function (v) { return v.cropsProperty && v.cropsProperty.id === prop.id; });
                var val = valueObj != null && valueObj.value !== undefined && valueObj.value !== null ? valueObj.value : null;
                var display = val !== null ? val + (prop.unit ? ' ' + prop.unit : '') : 'Не заполнено';
                pairs.push([prop.name || '—', display]);
            });
            for (var p = 0; p < pairs.length; p += 2) {
                html += formRow(pairs.slice(p, p + 2));
            }
        }
        html += '</div>';
        html += '<div class="quality-documents-inner"><h3 class="quality-docs-heading"><i class="fas fa-file-contract"></i> Документы качества</h3>';
        if (qualityDocs.length === 0) {
            html += '<div class="no-documents-message"><div class="no-documents-icon"><i class="fas fa-inbox"></i></div><h4>Документы отсутствуют</h4><p>Фермер не добавил документы о качестве</p></div>';
        } else {
            html += '<div class="documents-grid">';
            qualityDocs.forEach(function (url, i) {
                var u = String(url || '').trim();
                if (!u) return;
                var name = u.split('/').pop() || 'Документ ' + (i + 1);
                html += '<div class="document-card"><div class="document-icon"><i class="fas fa-file-pdf"></i></div><div class="document-info"><h4>' + escapeHtml(name) + '</h4><p>Документ качества</p><div class="document-meta"><span class="document-date"><i class="fas fa-link"></i> Доступен онлайн</span></div></div><div class="document-actions"><a href="' + escapeHtml(u) + '" target="_blank" rel="noopener" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> Открыть</a></div></div>';
            });
            html += '</div>';
        }
        if (cropsId) {
            html += '<div class="deal-crop-go-wrap"><a class="deal-crop-go-btn" href="/verification/detail/quality/' + encodeURIComponent(cropsId) + '/"><i class="fas fa-external-link-alt"></i> Перейти на культуру</a></div>';
        }
        html += '</div></div>';
        contentEl.innerHTML = html;
    }

    function renderPartnerMap(user, role) {
        var qualitySec = document.getElementById('dealPartnerQualitySection');
        if (qualitySec) {
            if (role === 'farmer') {
                qualitySec.style.display = '';
                renderPartnerFarmerQuality(window._dealData);
            } else {
                qualitySec.style.display = 'none';
            }
        }
        if (!user) return;
        var ep = user.entrepreneurProfile || {};
        var jp = user.juridicalProfile || {};
        var profile = ep.id ? ep : jp;
        var verificationName = (user.verificationStatus && user.verificationStatus.name) ? user.verificationStatus.name : (user.isVerified ? 'Верификация пройдена' : '—');
        var avatarWrap = document.getElementById('dealPartnerAvatar');
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
        setPartnerText('CreatedAt', user.created_at ? formatDate(user.created_at) : '—');
        setPartnerText('Phone', user.phone || '—');
        setPartnerText('Rating', user.rating != null ? String(user.rating) : '—');
        setPartnerText('Verification', verificationName);
        setPartnerText('LastName', profile.lastName || ep.lastName || '—');
        setPartnerText('FirstName', profile.firstName || ep.firstName || '—');
        setPartnerText('Patronymic', profile.patronymic || ep.patronymic || '—');
        setPartnerText('DateOfBirth', (profile.dateOfBirth || ep.dateOfBirth) ? formatDate(profile.dateOfBirth || ep.dateOfBirth) : '—');
        setPartnerText('Email', user.email || '—');
        setPartnerText('Inn', ep.inn || jp.inn || '—');
        setPartnerText('Ogrnip', ep.ogrnip || jp.ogrnip || '—');
        setPartnerText('OrgName', ep.organizationName || jp.organizationName || '—');
        setPartnerText('LegalAddress', ep.legalAddress || jp.legalAddress || '—');
        setPartnerText('BankName', ep.bankName || jp.bankName || '—');
        setPartnerText('Bik', ep.bik || jp.bik || '—');
        setPartnerText('CorrAccount', ep.correspondentAccount || jp.correspondentAccount || '—');
        setPartnerText('CheckingAccount', ep.checkingAccount || jp.checkingAccount || '—');
    }

    function escapeHtml(str) {
        if (str == null) return '';
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            return isNaN(d.getTime()) ? iso : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (_) {
            return iso;
        }
    }

    function formatNumber(num) {
        if (num == null || isNaN(num)) return '—';
        return Number(num).toLocaleString('ru-RU');
    }

    function formatPrice(val) {
        if (val == null || val === '') return '—';
        var n = parseFloat(String(val).replace(',', '.'));
        return isNaN(n) ? String(val) : n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text != null && text !== '' ? text : '—';
    }

    function setConsentIcon(iconId, value) {
        var el = document.getElementById(iconId);
        if (!el) return;
        el.className = 'deal-consent-status fas ' + (value === true ? 'fa-check' : 'fa-times');
    }

    function showSection(id, show) {
        var el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
    }

    var _lotsAllCache = null;
    // Кэш по dealsId: { html, lot }
    var _carrierLogisticsHtmlCache = {};
    var _currentDealsIdForLogistics = null;
    var _carrierCardOriginalHtml = null;

    async function fetchLotsAll() {
        if (Array.isArray(_lotsAllCache)) return _lotsAllCache;
        var headers = await getAuthHeaders();
        if (!headers) {
            _lotsAllCache = [];
            return _lotsAllCache;
        }

        var url = API_CONFIG.BASE_URL + '/moderators-module/lots/all?page=1&limit=10&orderBy=created_at&orderDirection=DESC';
        try {
            var res = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });

            if (res.status === 401 || res.status === 403) {
                if (typeof logout === 'function') logout();
                _lotsAllCache = [];
                return _lotsAllCache;
            }

            if (!res.ok) {
                _lotsAllCache = [];
                return _lotsAllCache;
            }

            var text = await res.text();
            if (!text) {
                _lotsAllCache = [];
                return _lotsAllCache;
            }

            var data = JSON.parse(text);
            var list = (data && Array.isArray(data.data)) ? data.data : [];
            _lotsAllCache = list;
            return _lotsAllCache;
        } catch (e) {
            console.error('fetchLotsAll error', e);
            _lotsAllCache = [];
            return _lotsAllCache;
        }
    }

    async function fetchLotByDealsId(dealsId) {
        var key = String(dealsId || '');
        if (!key) return { ok: false, status: null, lot: null };
        var headers = await getAuthHeaders();
        if (!headers) return { ok: false, status: null, lot: null };
        var url = API_CONFIG.BASE_URL + '/moderators-module/lots/by-deals-id/' + encodeURIComponent(key);
        try {
            var res = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 10000)
            });

            if (res.status === 401 || res.status === 403) {
                if (typeof logout === 'function') logout();
                return { ok: false, status: res.status, lot: null };
            }

            if (res.status === 404) {
                return { ok: false, status: 404, lot: null };
            }

            if (!res.ok) {
                return { ok: false, status: res.status, lot: null };
            }

            var text = await res.text();
            if (!text) return { ok: true, status: res.status, lot: null };
            var data = JSON.parse(text);
            return { ok: true, status: res.status, lot: data || null };
        } catch (e) {
            console.error('fetchLotByDealsId error', e);
            return { ok: false, status: 0, lot: null };
        }
    }

    function renderLotLogisticsMissing() {
        return (
            '<section class="deal-detail-section deal-logistics-section deal-logistics-section-missing">' +
                '<div class="deal-detail-section-title deal-logistics-header">' +
                    '<div class="deal-logistics-header-left">' +
                        '<h4 class="deal-logistics-title"><i class="fas fa-truck"></i> Грузоперевозка</h4>' +
                    '</div>' +
                '</div>' +
                '<div class="deal-partner-fields deal-logistics-fields">' +
                    '<p class="deal-modal-empty">Лот на грузоперевозку отсутствует.</p>' +
                '</div>' +
            '</section>'
        );
    }

    function setCarrierCardNoLot() {
        var btn = document.getElementById('dealRoleCarrier');
        if (!btn) return;
        if (_carrierCardOriginalHtml == null) _carrierCardOriginalHtml = btn.innerHTML;
        btn.classList.add('is-disabled');
        btn.setAttribute('aria-disabled', 'true');
        try { btn.disabled = true; } catch (e) {}
        btn.innerHTML =
            '<span class="participant-card-loading-wrap">' +
                '<i class="fas fa-ban" aria-hidden="true" style="font-size:2rem; color:#94a3b8;"></i>' +
                '<span class="participant-card-loading-text" style="font-weight:800; text-align:center;">Лот на грузоперевозку отсутствует</span>' +
            '</span>';
    }

    function setCarrierCardEnabled() {
        var btn = document.getElementById('dealRoleCarrier');
        if (!btn) return;
        if (_carrierCardOriginalHtml == null) _carrierCardOriginalHtml = btn.innerHTML;
        btn.classList.remove('is-disabled');
        btn.removeAttribute('aria-disabled');
        try { btn.disabled = false; } catch (e) {}
        // если ранее подменяли контент на "нет лота" — вернем исходный
        if (btn.innerHTML.indexOf('Лот на грузоперевозку отсутствует') !== -1 && _carrierCardOriginalHtml != null) {
            btn.innerHTML = _carrierCardOriginalHtml;
        }
    }

    async function preloadCarrierLotForDeal(dealId) {
        var key = String(dealId || '');
        if (!key) return null;

        // уже есть в кэше
        if (_carrierLogisticsHtmlCache[key]) {
            if (_carrierLogisticsHtmlCache[key].lot) setCarrierCardEnabled();
            else setCarrierCardNoLot();
            return _carrierLogisticsHtmlCache[key].lot || null;
        }

        var resp = await fetchLotByDealsId(key);
        if (resp && resp.status === 404) {
            setCarrierCardNoLot();
            _carrierLogisticsHtmlCache[key] = { html: renderLotLogisticsMissing(), lot: null };
            return null;
        }

        if (resp && resp.ok && resp.lot) {
            setCarrierCardEnabled();
            _carrierLogisticsHtmlCache[key] = { html: renderLotLogisticsDetail(resp.lot), lot: resp.lot };
            return resp.lot;
        }

        // неизвестная ошибка — оставим карточку активной, но без кэша
        setCarrierCardEnabled();
        return null;
    }

    function renderLotLogisticsDetail(lot) {
        lot = lot || {};
        var lotsStatus = lot.lotsStatus || {};
        var lotStatusId = lotsStatus.id;
        var lotStatusName = lotsStatus.name || '—';

        var distanceM = parseFloat(String(lot.distance != null ? lot.distance : '').replace(',', '.'));
        var distanceKm = !isNaN(distanceM) ? distanceM / 1000 : null;

        var volumeNum = parseFloat(String(lot.volume != null ? lot.volume : '').replace(',', '.'));
        var volumeFilledNum = parseFloat(String(lot.volumeFilled != null ? lot.volumeFilled : '').replace(',', '.'));
        var transportCoeffNum = parseFloat(String(lot.transportCoefficient != null ? lot.transportCoefficient : '').replace(',', '.'));
        var pricePerTonNum = parseFloat(String(lot.pricePerTon != null ? lot.pricePerTon : '').replace(',', '.'));

        var startDate = lot.startDate ? formatDate(lot.startDate) : '';
        var endDate = lot.deadline ? formatDate(lot.deadline) : '';
        var daysToUnloading = lot.daysToUnloading != null ? String(lot.daysToUnloading) : '';

        var hasStartEnd = Boolean(startDate) && Boolean(endDate);
        var percentFilled = null;
        if (!isNaN(volumeNum) && volumeNum > 0 && !isNaN(volumeFilledNum)) {
            percentFilled = (volumeFilledNum / volumeNum) * 100;
            if (percentFilled < 0) percentFilled = 0;
            if (percentFilled > 100) percentFilled = 100;
        }
        if (percentFilled == null || isNaN(percentFilled)) percentFilled = 0;

        var percentRounded = Math.round(percentFilled);
        var percentForWidth = Math.round(percentFilled * 10) / 10;

        var volumeText = !isNaN(volumeNum) ? formatNumber(volumeNum) : '—';
        var volumeFilledText = !isNaN(volumeFilledNum) ? formatNumber(volumeFilledNum) : '—';
        var transportCoeffText = !isNaN(transportCoeffNum) ? String(transportCoeffNum) : '—';
        var pricePerTonText = !isNaN(pricePerTonNum) ? (formatPrice(pricePerTonNum) + ' ₽/т') : '—';

        var volumeProgressBarHtml =
            '<div class="deal-logistics-volume-card">' +
            '<div class="deal-logistics-volume-progress" aria-hidden="true">' +
            '<div class="deal-logistics-volume-progress-fill" style="width: ' + escapeHtml(String(percentForWidth)) + '%;"></div>' +
            '</div>' +
            '<div class="deal-logistics-volume-meta">' +
            '<div class="deal-logistics-volume-meta-item">' +
            'Заполнено' +
            '<strong>' + escapeHtml(volumeFilledText) + ' т</strong>' +
            '<span class="deal-logistics-volume-meta-sub">Объем: ' + escapeHtml(volumeText) + ' т</span>' +
            '</div>' +
            '<div class="deal-logistics-volume-meta-item deal-logistics-volume-percent">' +
            'Процент' +
            '<strong>' + escapeHtml(String(percentRounded)) + '%</strong>' +
            '</div>' +
            '</div>' +
            '</div>';

        var datesHtml = hasStartEnd
            ? (
                '<div class="deal-partner-form-group">' +
                    '<span class="deal-partner-label">Дата начала</span>' +
                    '<span class="deal-partner-value">' + escapeHtml(startDate) + '</span>' +
                '</div>' +
                '<div class="deal-partner-form-group">' +
                    '<span class="deal-partner-label">Дата конца</span>' +
                    '<span class="deal-partner-value">' + escapeHtml(endDate) + '</span>' +
                '</div>'
            )
            : (
                '<div class="deal-partner-form-group deal-partner-form-group-full deal-logistics-dates-full">' +
                    '<span class="deal-partner-label">Кол-во дней до разгрузки</span>' +
                    '<span class="deal-partner-value">' + escapeHtml(daysToUnloading || '—') + '</span>' +
                '</div>'
            );

        var lotStatusClass = 'lot-status-1';
        if (String(lotStatusId) === '2') lotStatusClass = 'lot-status-2';
        if (String(lotStatusId) === '3') lotStatusClass = 'lot-status-3';
        var lotStatusLower = String(lotStatusName || '').toLowerCase().replace(/ё/g, 'е');
        if (lotStatusLower.indexOf('создан') !== -1) lotStatusClass = 'lot-status-1';
        if (lotStatusLower.indexOf('актив') !== -1) lotStatusClass = 'lot-status-2';
        if (lotStatusLower.indexOf('заверш') !== -1) lotStatusClass = 'lot-status-3';

        var statusBadgeHtml =
            '<span class="deal-status-badge ' + escapeHtml(lotStatusClass) + ' deal-logistics-status-pill">' + escapeHtml(lotStatusName) + '</span>';
        var agreeBtnHtml = '';
        if (String(lotStatusId) === '1' || lotStatusLower.indexOf('создан') !== -1) {
            agreeBtnHtml =
                '<button type="button" class="deal-btn-primary deal-logistics-header-btn" id="dealLotAgreeBtn">' +
                '<span class="deal-logistics-agree-icon" aria-hidden="true">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">' +
                '<polyline points="20 6 9 17 4 12"></polyline>' +
                '</svg>' +
                '</span>' +
                '<span>Согласовать</span>' +
                '</button>';
        }
        var headerRightHtml =
            '<div class="deal-logistics-header-actions">' +
            statusBadgeHtml +
            agreeBtnHtml +
            '</div>';

        return (
            '<section class="deal-detail-section deal-logistics-section">' +
                '<div class="deal-detail-section-title deal-logistics-header">' +
                    '<div class="deal-logistics-header-left">' +
                        '<i class="fas fa-truck" aria-hidden="true"></i>' +
                        'Лот логистики' +
                    '</div>' +
                    headerRightHtml +
                '</div>' +
                '<div class="deal-partner-fields deal-logistics-fields">' +
                    '<div class="deal-partner-form-group">' +
                        '<span class="deal-partner-label">Расстояние</span>' +
                        '<span class="deal-partner-value">' + (distanceKm != null ? (formatNumber(Math.round(distanceKm * 100) / 100) + ' км') : '—') + '</span>' +
                    '</div>' +
                    datesHtml +
                    '<div class="deal-partner-form-group">' +
                        '<span class="deal-partner-label">Коэффициент перевозки</span>' +
                        '<span class="deal-partner-value">' + escapeHtml(transportCoeffText) + '</span>' +
                    '</div>' +
                    '<div class="deal-partner-form-group">' +
                        '<span class="deal-partner-label">Цена за тонну</span>' +
                        '<span class="deal-partner-value">' + escapeHtml(pricePerTonText) + '</span>' +
                    '</div>' +
                    '<div class="deal-partner-form-group deal-partner-form-group-full deal-logistics-volume-block">' +
                        '<span class="deal-partner-label">Заполненность</span>' +
                        volumeProgressBarHtml +
                    '</div>' +
                '</div>' +
                '' +
            '</section>'
        );
    }

    var _lotPublishModalLot = null;
    var _lotPublishModalLotId = null;

    function openLotPublishModal(lot) {
        _lotPublishModalLot = lot || null;
        _lotPublishModalLotId = lot && lot.id != null ? String(lot.id) : '';
        var overlay = document.getElementById('dealLotPublishOverlay');
        if (!overlay) return;
        var errEl = document.getElementById('dealLotPublishError');
        if (errEl) errEl.style.display = 'none';

        var publishPanel = document.getElementById('dealLotPublishPanel');
        var editPanel = document.getElementById('dealLotEditPanel');
        if (publishPanel) publishPanel.style.display = '';
        if (editPanel) editPanel.style.display = 'none';

        var editErrEl = document.getElementById('dealLotEditError');
        if (editErrEl) {
            editErrEl.style.display = 'none';
            editErrEl.textContent = '';
        }

        var confirmBtn = document.getElementById('dealLotPublishConfirmBtn');
        var editBtn = document.getElementById('dealLotPublishEditBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            if (_lotPublishConfirmOriginalHtml != null) confirmBtn.innerHTML = _lotPublishConfirmOriginalHtml;
        }
        if (editBtn) editBtn.disabled = false;

        resetDealLotEditSubmitButton();

        var modalBox = overlay.querySelector('.accept-modal-content');
        if (modalBox) modalBox.scrollTop = 0;

        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function closeLotPublishModal() {
        var overlay = document.getElementById('dealLotPublishOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        _lotPublishModalLotId = null;
        _lotPublishModalLot = null;

        var publishPanel = document.getElementById('dealLotPublishPanel');
        var editPanel = document.getElementById('dealLotEditPanel');
        if (publishPanel) publishPanel.style.display = '';
        if (editPanel) editPanel.style.display = 'none';

        resetDealLotEditSubmitButton();
    }

    var _lotPublishConfirmOriginalHtml = null;
    var _lotEditSubmitOriginalHtml = null;

    /** Оставляет только цифры и один разделитель дроби (точка). Запятая приводится к точке. */
    function sanitizeDecimalInputString(s) {
        var normalized = String(s || '').replace(/,/g, '.');
        var out = '';
        var dotSeen = false;
        for (var i = 0; i < normalized.length; i++) {
            var c = normalized.charAt(i);
            if (c >= '0' && c <= '9') out += c;
            else if (c === '.' && !dotSeen) {
                dotSeen = true;
                out += '.';
            }
        }
        return out;
    }

    function bindDecimalOnlyInputs() {
        var ids = ['dealLotEditDistanceInput', 'dealLotEditTransportCoeffInput', 'dealLotEditPricePerTonInput'];
        ids.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', function () {
                var next = sanitizeDecimalInputString(el.value);
                if (el.value !== next) el.value = next;
                recalcLotEditFields();
            });
            el.addEventListener('paste', function (e) {
                e.preventDefault();
                var paste = (e.clipboardData || window.clipboardData).getData('text') || '';
                var start = el.selectionStart != null ? el.selectionStart : el.value.length;
                var end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
                var merged = el.value.slice(0, start) + paste + el.value.slice(end);
                el.value = sanitizeDecimalInputString(merged);
                recalcLotEditFields();
            });
        });
    }

    function parseLotEditMaybeNumber(v) {
        var s = String(v || '').trim();
        if (!s) return null;
        var n = parseFloat(s.replace(',', '.'));
        return isNaN(n) ? null : n;
    }

    function formatLotEditDecimalForInput(n) {
        if (n == null || isNaN(n)) return '';
        var r = Math.round(Number(n) * 1e6) / 1e6;
        return String(r);
    }

    /** Авторасчёт цены: только до сотых. */
    function formatLotEditAutoPriceHundredths(n) {
        if (n == null || isNaN(n)) return '';
        var r = Math.round(Number(n) * 100) / 100;
        return String(r);
    }

    /** В форме — километры (дробные). API: distance в метрах. Авто: цена = км×коэф (в поле цены — до сотых). Вручную: коэф = цена/км при км > 0. */
    function syncLotEditFieldLocks() {
        var manualEl = document.getElementById('dealLotEditManualPriceCheckbox');
        var manual = manualEl && manualEl.checked;
        var priceEl = document.getElementById('dealLotEditPricePerTonInput');
        var tcEl = document.getElementById('dealLotEditTransportCoeffInput');
        var priceWrap = document.getElementById('dealLotEditPriceInputWrap');
        var coeffWrap = document.getElementById('dealLotEditCoeffInputWrap');
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
        var manualEl = document.getElementById('dealLotEditManualPriceCheckbox');
        var manual = manualEl && manualEl.checked;
        var kmEl = document.getElementById('dealLotEditDistanceInput');
        var tcEl = document.getElementById('dealLotEditTransportCoeffInput');
        var priceEl = document.getElementById('dealLotEditPricePerTonInput');
        if (!kmEl || !tcEl || !priceEl) return;

        var km = parseLotEditMaybeNumber(kmEl.value);
        var tc = parseLotEditMaybeNumber(tcEl.value);
        var price = parseLotEditMaybeNumber(priceEl.value);

        if (!manual) {
            if (km != null && tc != null) {
                priceEl.value = formatLotEditAutoPriceHundredths(km * tc);
            } else {
                priceEl.value = '';
            }
        } else {
            if (km != null && km > 0 && price != null) {
                tcEl.value = formatLotEditDecimalForInput(price / km);
            } else {
                tcEl.value = '';
            }
        }
    }

    function bindDealLotEditPriceMode() {
        var cb = document.getElementById('dealLotEditManualPriceCheckbox');
        if (cb) {
            cb.addEventListener('change', function () {
                syncLotEditFieldLocks();
                recalcLotEditFields();
            });
        }
    }

    function resetDealLotEditSubmitButton() {
        var btn = document.getElementById('dealLotEditSubmitBtn');
        if (!btn) return;
        btn.disabled = false;
        if (_lotEditSubmitOriginalHtml != null) btn.innerHTML = _lotEditSubmitOriginalHtml;
    }

    async function goToActiveLot(lotId) {
        var urlPath = '/moderators-module/lots/go-to-active/' + encodeURIComponent(lotId);
        try {
            var headers = await getAuthHeaders();
            if (!headers) return { ok: false, status: null };
            var response = await fetch(API_CONFIG.BASE_URL + urlPath.replace('/api/', ''), {
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

    function showLotEditPanel() {
        var publishPanel = document.getElementById('dealLotPublishPanel');
        var editPanel = document.getElementById('dealLotEditPanel');
        if (publishPanel) publishPanel.style.display = 'none';
        if (editPanel) editPanel.style.display = '';

        var editErrEl = document.getElementById('dealLotEditError');
        if (editErrEl) {
            editErrEl.style.display = 'none';
            editErrEl.textContent = '';
        }
        var publishErrEl = document.getElementById('dealLotPublishError');
        if (publishErrEl) {
            publishErrEl.style.display = 'none';
            publishErrEl.textContent = '';
        }

        var distInput = document.getElementById('dealLotEditDistanceInput');
        var tcInput = document.getElementById('dealLotEditTransportCoeffInput');
        var priceInput = document.getElementById('dealLotEditPricePerTonInput');
        var manualCb = document.getElementById('dealLotEditManualPriceCheckbox');

        if (manualCb) manualCb.checked = false;

        var distM = NaN;
        if (_lotPublishModalLot && _lotPublishModalLot.distance != null) {
            distM = parseFloat(String(_lotPublishModalLot.distance).replace(',', '.'));
        }
        if (distInput) distInput.value = !isNaN(distM) ? formatLotEditDecimalForInput(distM / 1000) : '';

        if (tcInput) tcInput.value = _lotPublishModalLot && _lotPublishModalLot.transportCoefficient != null ? String(_lotPublishModalLot.transportCoefficient) : '';
        if (priceInput) priceInput.value = _lotPublishModalLot && _lotPublishModalLot.pricePerTon != null ? String(_lotPublishModalLot.pricePerTon) : '';

        syncLotEditFieldLocks();
        recalcLotEditFields();
    }

    async function goToUpdateLot(dto) {
        var urlPath = '/moderators-module/lots/update';
        try {
            var headers = await getAuthHeaders();
            if (!headers) return { ok: false, status: null };

            var response = await fetch(API_CONFIG.BASE_URL + urlPath.replace('/api/', ''), {
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

    function bindLotPublishActions(lot) {
        var lotStatusId = lot && lot.lotsStatus ? lot.lotsStatus.id : null;
        var lotStatusName = lot && lot.lotsStatus ? lot.lotsStatus.name : '';
        var lotStatusLower = String(lotStatusName || '').toLowerCase().replace(/ё/g, 'е');
        var agreeBtn = document.getElementById('dealLotAgreeBtn');
        if (!agreeBtn) return;

        if (!lot) return;
        if (String(lotStatusId) !== '1' && lotStatusLower.indexOf('создан') === -1) return;
        agreeBtn.addEventListener('click', function () {
            openLotPublishModal(lot);
        });
    }

    async function ensureCarrierLogisticsDetailLoaded(dealsId) {
        _currentDealsIdForLogistics = dealsId;
        var bodyEl = document.getElementById('dealLogisticsDetailBody');
        if (!bodyEl) return null;

        var key = String(dealsId || '');
        if (!key) return null;

        if (_carrierLogisticsHtmlCache[key]) {
            var cached = _carrierLogisticsHtmlCache[key];
            bodyEl.innerHTML = cached && cached.html ? cached.html : '';
            bindLotPublishActions(cached && cached.lot ? cached.lot : null);
            return cached && cached.lot ? cached.lot : null;
        }

        bodyEl.innerHTML = '<p class="deal-modal-empty">Загружаю логистику...</p>';

        var resp = await fetchLotByDealsId(key);
        var lot = resp && resp.lot ? resp.lot : null;

        if (!lot) {
            // 404: лота нет — пишем на плашке и отключаем действия
            if (resp && resp.status === 404) {
                var missingHtml = renderLotLogisticsMissing();
                bodyEl.innerHTML = missingHtml;
                _carrierLogisticsHtmlCache[key] = { html: missingHtml, lot: null };
                return null;
            }
            bodyEl.innerHTML = '<p class="deal-modal-empty">Детали логистики для данного лота не найдены.</p>';
            _carrierLogisticsHtmlCache[key] = { html: bodyEl.innerHTML, lot: null };
            return null;
        }

        var html = renderLotLogisticsDetail(lot);
        bodyEl.innerHTML = html;
        _carrierLogisticsHtmlCache[key] = { html: html, lot: lot };
        bindLotPublishActions(lot);
        return lot;
    }

    function renderDeal(d) {
        var sale = d.saleRequest || {};
        var storage = sale.storageConditions || {};
        var loading = d.loadingPoints || {};
        var unloading = d.unloadingPoints || {};
        var crops = d.crops || {};
        var cropType = crops.cropsType || {};
        var qualityTest = sale.qualityTest || {};
        var dealStatus = d.dealStatus || {};
        var deliveryMethod = d.deliveryMethod || {};

        var uniqueCode = d.uniqueCode != null && d.uniqueCode !== '' ? d.uniqueCode : '—';
        setText('dealUniqueCode', uniqueCode);
        document.getElementById('dealDetailSubtitle').textContent = uniqueCode !== '—' ? 'Код сделки: ' + uniqueCode : 'Загрузка...';

        // Верхняя полоса: даты | Сделка #номер | статус
        var topNum = document.getElementById('dealTopNumber');
        if (topNum) topNum.textContent = 'Сделка #' + (uniqueCode !== '—' ? uniqueCode : '—');
        var periodText = '—';
        if (d.startDate && d.deadline) {
            periodText = 'Сроки реализации: ' + formatDate(d.startDate) + ' – ' + formatDate(d.deadline);
        } else if (d.daysToUnloading != null) {
            periodText = 'Кол-во дней реализации: ' + d.daysToUnloading + ' дней';
        } else {
            periodText = 'Сроки реализации: —';
        }
        setText('dealTopPeriod', periodText);
        var statusName = (dealStatus.name || '').toLowerCase();
        var isRejected = isDealRejectedStatus(statusName);
        var isWorkingProcess = isWorkingProcessStatus(dealStatus, statusName);
        var statusEl = document.getElementById('dealTopStatus');
        if (statusEl) {
            statusEl.textContent = dealStatus.name || '—';
            // «Отклонена» — бейдж как у «Ожидает подтверждения», только красный
            if (isRejected) {
                statusEl.className = 'deal-center-status deal-status-badge deal-status-2 deal-status-rejected';
            } else {
                statusEl.className = 'deal-center-status deal-status-badge deal-status-' + (dealStatus.id || '');
            }
        }

        // Информационная плашка: «На согласовании» — старый текст, «Ожидает подтверждение» — текст про подписание
        var statusInfoSection = document.getElementById('dealDetailStatusInfo');
        var statusInfoText = document.getElementById('dealDetailStatusInfoText');
        var isOnAgreement = statusName.indexOf('согласован') !== -1;
        var isAwaitingConfirmation = statusName.indexOf('ожидает подтвержд') !== -1;
        if (statusInfoSection && statusInfoText) {
            if (isRejected) {
                statusInfoText.textContent = 'Сделка не состоялась: Агрогатор не подписал документы. Фермеру предложены варианты с более выгодными ценами.';
                statusInfoSection.style.display = 'block';
            } else if (isAwaitingConfirmation) {
                statusInfoText.textContent = 'Фермер и Экспортер договорились об условиях сделки, теперь Вам необходимо принять решение. Внимательно ознакомьтесь с контрагентами и качеством культуры. Если все устраивает, то согласуйте сделку, после этого документ отправится на Контур.Диадок для подписания. После того как вы его подпишите, платформа потребует подписи от остальных участников сделки.';
                statusInfoSection.style.display = 'block';
            } else if (isOnAgreement) {
                statusInfoText.textContent = 'На данный момент фермер подал отклик на лучшую цену от платформы АГРОГАТОР. Сейчас мы ждем экспортера, который подтвердит участие в сделке. Как только он подтвердит, два договора поступят на контур АГРОГАТОРА, которые необходимо либо подписать, либо отказаться от сделки «Сделка № ' + (uniqueCode !== '—' ? uniqueCode : '') + '».';
                statusInfoSection.style.display = 'block';
            } else {
                statusInfoSection.style.display = 'none';
            }
        }
        // Кнопки: «Ожидает подтверждение» — Принять; «На согласовании» — Изменить; «Отклонена» — связаться/архив;
        // «Рабочий процесс» — отменить/заморозить/платёжные/завершить; иначе — платёжные документы
        var btnAccept = document.getElementById('dealActionAccept');
        var btnDocs = document.getElementById('dealActionDocs');
        var btnEdit = document.getElementById('dealActionEdit');
        var btnCallFarmer = document.getElementById('dealActionCallFarmer');
        var btnArchive = document.getElementById('dealActionArchive');
        var btnCallExporter = document.getElementById('dealActionCallExporter');
        var btnCancelDeal = document.getElementById('dealActionCancel');
        var btnFreezeDeal = document.getElementById('dealActionFreeze');
        var btnFinishDeal = document.getElementById('dealActionFinish');
        if (btnAccept && btnDocs) {
            if (isAwaitingConfirmation) {
                btnAccept.style.display = '';
                btnDocs.style.display = 'none';
                if (btnEdit) btnEdit.style.display = 'none';
                if (btnCallFarmer) btnCallFarmer.style.display = 'none';
                if (btnArchive) btnArchive.style.display = 'none';
                if (btnCallExporter) btnCallExporter.style.display = 'none';
                if (btnCancelDeal) btnCancelDeal.style.display = '';
                if (btnFreezeDeal) btnFreezeDeal.style.display = '';
                if (btnFinishDeal) btnFinishDeal.style.display = 'none';
            } else if (isOnAgreement) {
                btnAccept.style.display = 'none';
                btnDocs.style.display = 'none';
                if (btnEdit) btnEdit.style.display = '';
                if (btnCallFarmer) btnCallFarmer.style.display = 'none';
                if (btnArchive) btnArchive.style.display = 'none';
                if (btnCallExporter) btnCallExporter.style.display = 'none';
                if (btnCancelDeal) btnCancelDeal.style.display = '';
                if (btnFreezeDeal) btnFreezeDeal.style.display = '';
                if (btnFinishDeal) btnFinishDeal.style.display = 'none';
            } else if (isRejected) {
                btnAccept.style.display = 'none';
                btnDocs.style.display = 'none';
                if (btnEdit) btnEdit.style.display = 'none';
                if (btnCallFarmer) btnCallFarmer.style.display = '';
                if (btnArchive) btnArchive.style.display = '';
                if (btnCallExporter) btnCallExporter.style.display = '';
                if (btnCancelDeal) btnCancelDeal.style.display = 'none';
                if (btnFreezeDeal) btnFreezeDeal.style.display = 'none';
                if (btnFinishDeal) btnFinishDeal.style.display = 'none';
            } else if (isWorkingProcess) {
                btnAccept.style.display = 'none';
                btnDocs.style.display = '';
                if (btnEdit) btnEdit.style.display = 'none';
                if (btnCallFarmer) btnCallFarmer.style.display = 'none';
                if (btnArchive) btnArchive.style.display = 'none';
                if (btnCallExporter) btnCallExporter.style.display = 'none';
                if (btnCancelDeal) btnCancelDeal.style.display = '';
                if (btnFreezeDeal) btnFreezeDeal.style.display = '';
                if (btnFinishDeal) btnFinishDeal.style.display = '';
            } else {
                btnAccept.style.display = 'none';
                btnDocs.style.display = '';
                if (btnEdit) btnEdit.style.display = 'none';
                if (btnCallFarmer) btnCallFarmer.style.display = 'none';
                if (btnArchive) btnArchive.style.display = 'none';
                if (btnCallExporter) btnCallExporter.style.display = 'none';
                if (btnCancelDeal) btnCancelDeal.style.display = '';
                if (btnFreezeDeal) btnFreezeDeal.style.display = '';
                if (btnFinishDeal) btnFinishDeal.style.display = 'none';
            }
        }

        // Платёжные и завершающие документы из сделки
        window._dealPaymentsDocs = Array.isArray(d.dealPaymentsDocument) ? d.dealPaymentsDocument : [];
        window._dealFinishDocs = Array.isArray(d.dealFinishDocument) ? d.dealFinishDocument : [];

        // Культура (4.8)
        setText('dealCropName', cropType.name || sale.cropsName || '—');

        // Колонка 1 — Фермер
        setText('dealLoadingAddress', loading.address || '—');
        setText('dealStorageText', storage.name || '—');
        var storagePriceWrap = document.getElementById('dealStoragePriceWrap');
        var storagePriceVal = document.getElementById('dealStoragePrice');
        if (storagePriceWrap && storagePriceVal) {
            if (storage.id === 1 && sale.storageConditionUnloadingPrice != null) {
                storagePriceWrap.style.display = '';
                storagePriceVal.textContent = formatPrice(sale.storageConditionUnloadingPrice) + ' ₽';
            } else {
                storagePriceWrap.style.display = 'none';
            }
        }
        var declList = sale.declarationsConformity || [];
        setText('dealDeclarationsCount', declList.length);

        var pricePerTonF = parseFloat(String(d.pricePerTon).replace(',', '.')) || 0;
        var pricePerTonE = parseFloat(String(d.pricePerTonExporter).replace(',', '.')) || 0;
        var volume = parseFloat(d.volume) || 0;
        var distanceM = parseFloat(d.distance) || 0;
        var distanceKm = distanceM > 0 ? distanceM / 1000 : 0;
        var totalFarmer = pricePerTonF * volume;
        var totalExporter = pricePerTonE * volume;

        setText('dealTotalFarmer', totalFarmer ? formatPrice(totalFarmer) + ' ₽' : '—');
        setText('dealTotalExporter', totalExporter ? formatPrice(totalExporter) + ' ₽' : '—');

        setConsentIcon('dealFarmerAcceptIcon', d.isFarmerAccept === true);
        setConsentIcon('dealFarmerSignedIcon', d.isFarmerDocumentSigned === true);
        setConsentIcon('dealExporterAcceptIcon', d.isExporterAccept === true);
        setConsentIcon('dealExporterSignedIcon', d.isExporterDocumentSigned === true);

        var paymentTerms = sale.paymentTerms;
        var paymentText = '—';
        if (paymentTerms && (paymentTerms.prepayment != null || paymentTerms.postPayment != null)) {
            paymentText = 'Предоплата ' + (paymentTerms.prepayment || 0) + '%, постоплата ' + (paymentTerms.postPayment || 0) + '%';
        }
        setText('dealPaymentTerms', paymentText);
        var paymentRow = document.getElementById('dealPaymentTermsRow');
        if (paymentRow) paymentRow.style.display = paymentText !== '—' ? '' : 'none';

        // Колонка 2 — Перевозка: км (из метров!), объём
        setText('dealDistance', distanceKm > 0 ? formatNumber(Math.round(distanceKm * 100) / 100) : '—');
        setText('dealVolume', volume ? formatNumber(volume) : '—');

        // Колонка 3 — Экспортер
        setText('dealUnloadingAddress', unloading.address || d.unloadingPointsAddress || '—');
        setText('dealQualityTest', qualityTest.name || '—');

        // Нижняя полоса: комиссия 150*тонн, стоимость перевозки (цена экспортера - 150*тонн - цена фермера)
        var commissionRub = volume * 150;
        var transportCostTotal = (pricePerTonE * volume) - (150 * volume) - (pricePerTonF * volume);
        setText('dealCommission', commissionRub ? formatNumber(commissionRub) + ' ₽' : '—');
        setText('dealTransportCost', !isNaN(transportCostTotal) ? formatPrice(transportCostTotal) + ' ₽' : '—');
        setText('dealTotalCenter', totalExporter ? formatPrice(totalExporter) + ' ₽' : '—');
        setText('dealVat', sale.isWithVAT === true ? 'С НДС' : sale.isWithVAT === false ? 'Без НДС' : '—');

        window._dealData = d;

        renderRoleCard('dealRoleFarmerBody', [
            { label: 'ФИО', value: d.farmerUserName || 'Фермер' },
            { label: 'Культура', value: cropType.name || '—' },
            { label: 'Адрес погрузки', value: loading.address || '—' },
            { label: 'Тип хранения', value: storage.name || '—' },
            { label: 'Объём, т', value: formatNumber(d.volume) }
        ]);
        renderRoleCard('dealRoleExporterBody', [
            { label: 'ФИО', value: d.exporterUserName || 'Экспортер' },
            { label: 'Адрес разгрузки', value: unloading.address || d.unloadingPointsAddress || '—' },
            { label: 'Проверка качества', value: qualityTest.name || '—' },
            { label: 'Цена для экспортера', value: formatPrice(d.pricePerTonExporter) }
        ]);
        renderRoleCard('dealRoleCarrierBody', [
            { label: 'Тип перевозки', value: deliveryMethod.name || '—' },
            { label: 'Расстояние, км', value: distanceKm > 0 ? formatNumber(Math.round(distanceKm * 100) / 100) : '—' },
            { label: 'Объём, т', value: formatNumber(d.volume) },
            { label: 'Цена за тонну', value: formatPrice(d.pricePerTon) }
        ]);
    }

    function renderRoleCard(bodyId, rows) {
        var body = document.getElementById(bodyId);
        if (!body) return;
        body.innerHTML = rows.map(function (r) {
            return '<div class="deal-role-row"><span class="deal-role-label">' + escapeHtml(r.label) + '</span><span class="deal-role-value">' + escapeHtml(r.value) + '</span></div>';
        }).join('');
    }

    function renderWorkScheduleFull(schedule, sectionTitle) {
        var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        var names = { monday: 'Понедельник', tuesday: 'Вторник', wednesday: 'Среда', thursday: 'Четверг', friday: 'Пятница', saturday: 'Суббота', sunday: 'Воскресенье' };
        var rows = [];
        days.forEach(function (key) {
            var val = schedule && schedule[key] ? String(schedule[key]).trim() : '';
            var display = val || 'Выходной';
            rows.push('<tr><td>' + escapeHtml(names[key]) + '</td><td>' + escapeHtml(display) + '</td></tr>');
        });
        return '<div class="deal-modal-section"><div class="deal-modal-section-title">' + escapeHtml(sectionTitle || 'Режим работы') + '</div><table class="deal-modal-schedule"><thead><tr><th>День</th><th>Время</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
    }

    function buildModalContent(type, d) {
        var sale = d.saleRequest || {};
        var loading = d.loadingPoints || {};
        var unloading = d.unloadingPoints || {};
        var crops = d.crops || {};
        var cropType = crops.cropsType || {};
        var declList = sale.declarationsConformity || [];

        function section(title, items) {
            var body = '<div class="deal-modal-section"><div class="deal-modal-section-title">' + escapeHtml(title) + '</div>';
            items.forEach(function (r) {
                body += '<div class="deal-modal-item"><span class="deal-modal-item-label">' + escapeHtml(r.label) + '</span><span class="deal-modal-item-value">' + escapeHtml(r.value) + '</span></div>';
            });
            return body + '</div>';
        }

        if (type === 'loading_point') {
            var lp = loading;
            var items = [
                { label: 'Название', value: lp.name || '—' },
                { label: 'Адрес', value: lp.address || '—' },
                { label: 'Тип', value: (lp.loadingPointsType && lp.loadingPointsType.name) || '—' },
                { label: 'Покрытие', value: (lp.roadSurfaceType && lp.roadSurfaceType.name) || '—' },
                { label: 'Способ погрузки', value: (lp.loadingMethod && lp.loadingMethod.length) ? lp.loadingMethod.map(function (m) { return m.name; }).join(', ') : (lp.transportTypeName || '—') },
                { label: 'Расстояние до весов', value: lp.loadingPointDistanceFromScales || '—' },
                { label: 'Вместимость', value: lp.maxSiteCapacity || '—' },
                { label: 'Высота', value: lp.maxSiteHeight || '—' }
            ];
            var generalHtml = '<div class="deal-modal-section"><div class="deal-modal-section-title">Общая информация</div>';
            items.forEach(function (r) {
                generalHtml += '<div class="deal-modal-item"><span class="deal-modal-item-label">' + escapeHtml(r.label) + '</span><span class="deal-modal-item-value">' + escapeHtml(r.value) + '</span></div>';
            });
            generalHtml += '</div>';
            var scheduleHtml = renderWorkScheduleFull(lp.loadingPointsWorkSchedule, 'Режим работы');
            var html = '<div class="deal-modal-declarations">';
            html += '<div class="deal-modal-tab-btns"><button type="button" class="deal-modal-tab-btn is-active" data-tab="general">Общая информация</button><button type="button" class="deal-modal-tab-btn" data-tab="schedule">Режим работы</button></div>';
            html += '<div class="deal-modal-tab-panel is-active" data-tab="general">' + generalHtml + '</div>';
            html += '<div class="deal-modal-tab-panel" data-tab="schedule">' + scheduleHtml + '</div>';
            return html + '</div>';
        }

        if (type === 'unloading_point') {
            var up = unloading;
            var items = [
                { label: 'Название', value: up.name || '—' },
                { label: 'Адрес', value: up.address || '—' },
                { label: 'Тип', value: (up.unloadingPointsType && up.unloadingPointsType.name) || '—' },
                { label: 'Покрытие', value: (up.roadSurfaceType && up.roadSurfaceType.name) || '—' },
                { label: 'Способ разгрузки', value: (up.unloadingMethod && up.unloadingMethod.length) ? up.unloadingMethod.map(function (m) { return m.name; }).join(', ') : '—' },
                { label: 'Транспорт', value: (up.transportType && up.transportType.length) ? up.transportType.map(function (m) { return m.name; }).join(', ') : (up.transportTypeName || '—') },
                { label: 'Расстояние до весов', value: up.loadingPointDistanceFromScales || '—' },
                { label: 'Вместимость', value: up.maxSiteCapacity || '—' },
                { label: 'Высота', value: up.maxSiteHeight || '—' }
            ];
            var generalHtml = '<div class="deal-modal-section"><div class="deal-modal-section-title">Общая информация</div>';
            items.forEach(function (r) {
                generalHtml += '<div class="deal-modal-item"><span class="deal-modal-item-label">' + escapeHtml(r.label) + '</span><span class="deal-modal-item-value">' + escapeHtml(r.value) + '</span></div>';
            });
            generalHtml += '</div>';
            var scheduleHtml = renderWorkScheduleFull(up.unloadingPointsWorkSchedule, 'Режим работы');
            var html = '<div class="deal-modal-declarations">';
            html += '<div class="deal-modal-tab-btns"><button type="button" class="deal-modal-tab-btn is-active" data-tab="general">Общая информация</button><button type="button" class="deal-modal-tab-btn" data-tab="schedule">Режим работы</button></div>';
            html += '<div class="deal-modal-tab-panel is-active" data-tab="general">' + generalHtml + '</div>';
            html += '<div class="deal-modal-tab-panel" data-tab="schedule">' + scheduleHtml + '</div>';
            return html + '</div>';
        }

        if (type === 'declarations') {
            var declContent = declList.length === 0
                ? '<p class="deal-modal-empty">Деклараций нет.</p>'
                : '<div class="deal-declarations-list">' + declList.map(function (decl) {
                    var date = formatDate(decl.declarationDate);
                    var num = decl.declarationNumber || '—';
                    var url = decl.declarationFile ? '<a href="' + escapeHtml(decl.declarationFile) + '" target="_blank" rel="noopener">Открыть документ</a>' : '—';
                    return '<div class="deal-declaration-item"><div class="deal-declaration-row"><span>Дата: ' + escapeHtml(date) + '</span><span>№ ' + escapeHtml(num) + '</span></div><div class="deal-declaration-link">' + url + '</div></div>';
                }).join('') + '</div>';
            var specialContent = '<div class="deal-modal-special-mock"><i class="fas fa-file-contract"></i><p>Фермер не сообщал особые условия.</p></div>';
            var html = '<div class="deal-modal-declarations">';
            html += '<div class="deal-modal-tab-btns"><button type="button" class="deal-modal-tab-btn is-active" data-tab="decl">Декларации</button><button type="button" class="deal-modal-tab-btn" data-tab="special">Особые условия</button></div>';
            html += '<div class="deal-modal-tab-panel is-active" data-tab="decl">' + declContent + '</div>';
            html += '<div class="deal-modal-tab-panel" data-tab="special">' + specialContent + '</div>';
            return html + '</div>';
        }

        if (type === 'price_detail_farmer') {
            var vol = parseFloat(d.volume) || 0;
            var distM = parseFloat(d.distance) || 0;
            var distKm = distM > 0 ? distM / 1000 : 0;
            var priceT = d.pricePerTon != null ? formatPrice(d.pricePerTon) + ' ₽' : '—';
            var totalF = (parseFloat(String(d.pricePerTon).replace(',', '.')) || 0) * vol;
            var perKm = distKm > 0 ? formatPrice(totalF / distKm) + ' ₽/км' : '—';
            return '<div class="deal-modal-price-detail">' +
                '<div class="deal-price-detail-item"><span class="deal-price-detail-label">Цена за тонну</span><span class="deal-price-detail-value">' + escapeHtml(priceT) + '</span></div>' +
                '<div class="deal-price-detail-item"><span class="deal-price-detail-label">Цена за км</span><span class="deal-price-detail-value">' + escapeHtml(perKm) + '</span></div>' +
                '</div>';
        }

        if (type === 'price_detail_exporter') {
            var vol = parseFloat(d.volume) || 0;
            var distM = parseFloat(d.distance) || 0;
            var distKm = distM > 0 ? distM / 1000 : 0;
            var priceT = d.pricePerTonExporter != null ? formatPrice(d.pricePerTonExporter) + ' ₽' : '—';
            var totalE = (parseFloat(String(d.pricePerTonExporter).replace(',', '.')) || 0) * vol;
            var perKm = distKm > 0 ? formatPrice(totalE / distKm) + ' ₽/км' : '—';
            return '<div class="deal-modal-price-detail">' +
                '<div class="deal-price-detail-item"><span class="deal-price-detail-label">Цена за тонну</span><span class="deal-price-detail-value">' + escapeHtml(priceT) + '</span></div>' +
                '<div class="deal-price-detail-item"><span class="deal-price-detail-label">Цена за км</span><span class="deal-price-detail-value">' + escapeHtml(perKm) + '</span></div>' +
                '</div>';
        }

        if (type === 'exporter_product') {
            return '<div class="deal-modal-section"><div class="deal-modal-special-mock"><i class="fas fa-tools"></i><p>Этот модуль в разработке.</p></div></div>';
        }

        if (type === 'crop') {
            var cr = crops;
            var cropsId = cr && cr.id ? String(cr.id) : '';
            var cropsUniqueCode = cr && cr.uniqueCode != null && String(cr.uniqueCode).trim() !== '' ? String(cr.uniqueCode).trim() : '—';
            var cropTypeId = cropType && cropType.id;
            var region = cr.cropsOriginRegion && cr.cropsOriginRegion.name;
            var shelfLife = cr.cropsShelfLife != null ? cr.cropsShelfLife + ' ' + (cr.cropsShelfLifeType && cr.cropsShelfLifeType.name ? cr.cropsShelfLifeType.name : '') : '—';
            var cultureValues = cr.cropsPropertyValue || [];
            var allProps = window._cropsProperties || [];
            var cultureProperties = cropTypeId ? allProps.filter(function (p) { return p.cropsType && p.cropsType.id === cropTypeId; }) : [];
            var generalItems = [
                { label: 'ID культуры', value: cropsUniqueCode, empty: cropsUniqueCode === '—' },
                { label: 'Культура', value: (cropType && cropType.name) || 'Не заполнено', empty: !(cropType && cropType.name) },
                { label: 'Регион происхождения', value: region || 'Не заполнено', empty: !region },
                { label: 'Год урожая', value: cr.yearOfHarvest != null ? String(cr.yearOfHarvest) : 'Не заполнено', empty: cr.yearOfHarvest == null },
                { label: 'Срок хранения', value: shelfLife !== '—' ? shelfLife : 'Не заполнено', empty: shelfLife === '—' }
            ];
            var generalHtml = '<div class="deal-modal-section"><div class="deal-modal-section-title">Общая информация</div>';
            generalItems.forEach(function (r) {
                var valClass = r.empty ? ' deal-modal-item-value-empty' : '';
                generalHtml += '<div class="deal-modal-item"><span class="deal-modal-item-label">' + escapeHtml(r.label) + '</span><span class="deal-modal-item-value' + valClass + '">' + escapeHtml(r.value) + '</span></div>';
            });
            generalHtml += '</div>';
            var qualityHtml = '<div class="deal-modal-section"><div class="deal-modal-section-title">Показатель качества</div>';
            if (cultureProperties.length === 0) {
                qualityHtml += '<p class="deal-modal-empty">Нет данных о показателях качества для данного типа культуры.</p>';
            } else {
                cultureProperties.forEach(function (prop) {
                    var valueObj = cultureValues.find(function (v) { return v.cropsProperty && v.cropsProperty.id === prop.id; });
                    var val = valueObj != null && valueObj.value !== undefined && valueObj.value !== null ? valueObj.value : null;
                    var display = val !== null ? val + (prop.unit ? ' ' + prop.unit : '') : 'Не заполнено';
                    var valClass = val === null ? ' deal-modal-item-value-empty' : '';
                    qualityHtml += '<div class="deal-modal-item"><span class="deal-modal-item-label">' + escapeHtml(prop.name || '—') + '</span><span class="deal-modal-item-value' + valClass + '">' + escapeHtml(display) + '</span></div>';
                });
            }
            qualityHtml += '</div>';
            var html = '<div class="deal-modal-declarations">';
            html += '<div class="deal-modal-tab-btns"><button type="button" class="deal-modal-tab-btn is-active" data-tab="general">Общая информация</button><button type="button" class="deal-modal-tab-btn" data-tab="quality">Показатель качества</button></div>';
            html += '<div class="deal-modal-tab-panel is-active" data-tab="general">' + generalHtml + '</div>';
            html += '<div class="deal-modal-tab-panel" data-tab="quality">' + qualityHtml + '</div>';
            if (cropsId) {
                html += '<div class="deal-crop-go-wrap"><a class="deal-crop-go-btn" href="/verification/detail/quality/' + encodeURIComponent(cropsId) + '/"><i class="fas fa-external-link-alt"></i> Перейти на культуру</a></div>';
            }
            return html + '</div>';
        }

        if (type === 'contracts') {
            function docToLabel(to) {
                return to === 'exporter' ? 'Экспортер' : 'Фермер';
            }

            var created = formatDate(d.created_at);
            function renderContractsPanel() {
                return (
                    '<div class="docflow-panel">' +
                        '<div class="docflow-grid">' +
                            '<div class="docflow-card">' +
                                '<div class="docflow-card-title">Договор с фермером</div>' +
                                '<div class="docflow-card-sub">Дата: ' + escapeHtml(created) + '</div>' +
                            '</div>' +
                            '<div class="docflow-card">' +
                                '<div class="docflow-card-title">Договор с экспортером</div>' +
                                '<div class="docflow-card-sub">Дата: ' + escapeHtml(created) + '</div>' +
                            '</div>' +
                            '<div class="docflow-card">' +
                                '<div class="docflow-card-title">Договор с перевозчиком</div>' +
                                '<div class="docflow-card-sub">Дата: ' + escapeHtml(created) + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="docflow-empty-note">Ссылки на договоры будут добавлены позже.</div>' +
                    '</div>'
                );
            }

            function renderPaymentsPanel() {
                var payDocs = Array.isArray(d.dealPaymentsDocument) ? d.dealPaymentsDocument : [];
                if (!payDocs.length) {
                    return (
                        '<div class="docflow-panel">' +
                            '<div class="docflow-empty">' +
                                '<div class="docflow-empty-icon"><i class="fas fa-file-invoice-dollar" aria-hidden="true"></i></div>' +
                                '<div class="docflow-empty-title">Платёжных документов пока нет</div>' +
                                '<div class="docflow-empty-sub">Добавьте документы оплаты — они появятся здесь.</div>' +
                            '</div>' +
                        '</div>'
                    );
                }

                var rows = payDocs.map(function (doc) {
                    var name = doc.fileName || 'Документ';
                    var to = docToLabel(doc.finishDocumentTo);
                    var dt = formatDate(doc.created_at);
                    var href = docOpenHref(doc);
                    var nameCell = href
                        ? '<a class="docflow-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(name) + '</a>'
                        : '<span class="docflow-link docflow-link-disabled" title="Не удалось определить ссылку">' + escapeHtml(name) + '</span>';

                    return (
                        '<div class="docflow-row">' +
                            '<div class="docflow-col docflow-col-name">' + nameCell + '</div>' +
                            '<div class="docflow-col docflow-col-to"><span class="docflow-pill">' + escapeHtml(to) + '</span></div>' +
                            '<div class="docflow-col docflow-col-date">' + escapeHtml(dt) + '</div>' +
                        '</div>'
                    );
                }).join('');

                return (
                    '<div class="docflow-panel">' +
                        '<div class="docflow-table">' +
                            '<div class="docflow-head">' +
                                '<div class="docflow-col docflow-col-name">Название</div>' +
                                '<div class="docflow-col docflow-col-to">Кому</div>' +
                                '<div class="docflow-col docflow-col-date">Дата</div>' +
                            '</div>' +
                            rows +
                        '</div>' +
                    '</div>'
                );
            }

            function renderFinishPanel() {
                var finishDocs = Array.isArray(d.dealFinishDocument) ? d.dealFinishDocument : [];
                if (!finishDocs.length) {
                    return (
                        '<div class="docflow-panel">' +
                            '<div class="docflow-empty">' +
                                '<div class="docflow-empty-icon"><i class="fas fa-clipboard-check" aria-hidden="true"></i></div>' +
                                '<div class="docflow-empty-title">Завершающих документов пока нет</div>' +
                                '<div class="docflow-empty-sub">После завершения сделки документы появятся здесь.</div>' +
                            '</div>' +
                        '</div>'
                    );
                }
                var finishRows = finishDocs.map(function (doc) {
                    var name = doc.fileName || 'Документ';
                    var to = docToLabel(doc.finishDocumentTo);
                    var num = doc.contractNumber || '';
                    var dt = formatDate(doc.created_at);
                    var href = docOpenHref(doc);
                    var nameCell = href
                        ? '<a class="docflow-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(name) + '</a>'
                        : '<span class="docflow-link docflow-link-disabled" title="Не удалось определить ссылку">' + escapeHtml(name) + '</span>';
                    return (
                        '<div class="docflow-row">' +
                            '<div class="docflow-col docflow-col-name">' + nameCell + '</div>' +
                            '<div class="docflow-col docflow-col-num">' + (num ? '<span class="docflow-pill docflow-pill-num">№ ' + escapeHtml(num) + '</span>' : '—') + '</div>' +
                            '<div class="docflow-col docflow-col-to"><span class="docflow-pill">' + escapeHtml(to) + '</span></div>' +
                            '<div class="docflow-col docflow-col-date">' + escapeHtml(dt) + '</div>' +
                        '</div>'
                    );
                }).join('');
                var finishHead = '<div class="docflow-head docflow-head-finish">' +
                    '<div class="docflow-col docflow-col-name">Название</div>' +
                    '<div class="docflow-col docflow-col-num">Номер</div>' +
                    '<div class="docflow-col docflow-col-to">Кому</div>' +
                    '<div class="docflow-col docflow-col-date">Дата</div>' +
                '</div>';
                return (
                    '<div class="docflow-panel">' +
                        '<div class="docflow-table docflow-table-finish">' +
                            finishHead +
                            finishRows +
                        '</div>' +
                    '</div>'
                );
            }

            var html =
                '<div class="docflow">' +
                    '<div class="docflow-tabs">' +
                        '<button type="button" class="docflow-tab is-active" data-tab="contracts"><i class="fas fa-file-contract" aria-hidden="true"></i><span>Договора</span></button>' +
                        '<button type="button" class="docflow-tab" data-tab="payments"><i class="fas fa-receipt" aria-hidden="true"></i><span>Платёжные</span></button>' +
                        '<button type="button" class="docflow-tab" data-tab="finish"><i class="fas fa-flag-checkered" aria-hidden="true"></i><span>Завершающие</span></button>' +
                    '</div>' +
                    '<div class="docflow-panels">' +
                        '<div class="docflow-tab-panel is-active" data-tab="contracts">' + renderContractsPanel() + '</div>' +
                        '<div class="docflow-tab-panel" data-tab="payments">' + renderPaymentsPanel() + '</div>' +
                        '<div class="docflow-tab-panel" data-tab="finish">' + renderFinishPanel() + '</div>' +
                    '</div>' +
                '</div>';

            return html;
        }

        return '<p>Нет данных.</p>';
    }

    function buildModalBody(role, d) {
        var sale = d.saleRequest || {};
        var storage = sale.storageConditions || {};
        var loading = d.loadingPoints || {};
        var unloading = d.unloadingPoints || {};
        var crops = d.crops || {};
        var cropType = crops.cropsType || {};
        var qualityTest = sale.qualityTest || {};
        var dealStatus = d.dealStatus || {};
        var deliveryMethod = d.deliveryMethod || {};
        var volume = parseFloat(d.volume) || 0;
        var distanceM = parseFloat(d.distance) || 0;
        var distanceKm = distanceM / 1000;
        var priceF = parseFloat(String(d.pricePerTon).replace(',', '.')) || 0;
        var priceE = parseFloat(String(d.pricePerTonExporter).replace(',', '.')) || 0;
        var totalF = priceF * volume;
        var totalE = priceE * volume;

        function section(title, items) {
            var body = '<div class="deal-modal-section"><div class="deal-modal-section-title">' + escapeHtml(title) + '</div>';
            items.forEach(function (r) {
                body += '<div class="deal-modal-item"><span class="deal-modal-item-label">' + escapeHtml(r.label) + '</span><span class="deal-modal-item-value">' + escapeHtml(r.value) + '</span></div>';
            });
            return body + '</div>';
        }

        if (role === 'farmer') {
            var main = [
                { label: 'ФИО', value: d.farmerUserName || 'Фермер' },
                { label: 'Культура', value: cropType.name || sale.cropsName || '—' },
                { label: 'Адрес погрузки', value: loading.address || '—' },
                { label: 'Тип хранения', value: storage.name || '—' }
            ];
            if (storage.id === 1 && sale.storageConditionUnloadingPrice != null) {
                main.push({ label: 'Стоимость хранения', value: formatPrice(sale.storageConditionUnloadingPrice) + ' ₽' });
            }
            var finance = [
                { label: 'Цена за т', value: formatPrice(d.pricePerTon) + ' ₽' },
                { label: 'Общая сумма', value: totalF ? formatPrice(totalF) + ' ₽' : '—' },
                { label: 'За км', value: distanceKm > 0 ? formatPrice(totalF / distanceKm) + ' ₽/км' : '—' }
            ];
            return section('Поставщик', main) + section('Финансы', finance);
        }
        if (role === 'carrier') {
            var datesText = '—';
            if (d.startDate || d.deadline) datesText = formatDate(d.startDate) + ' — ' + formatDate(d.deadline);
            else if (d.daysToUnloading != null) datesText = d.daysToUnloading + ' дн.';
            var dealInfo = [
                { label: 'Сроки перевозки', value: datesText },
                { label: 'Комиссия Агрогатора', value: formatNumber(volume * 150) + ' ₽' },
                { label: 'Стоимость перевозки', value: formatPrice((priceE * volume) - (150 * volume) - (priceF * volume)) + ' ₽' }
            ];
            var transport = [
                { label: 'Расстояние', value: distanceKm > 0 ? formatNumber(Math.round(distanceKm * 100) / 100) + ' км' : '—' },
                { label: 'Объём', value: volume ? formatNumber(volume) + ' т' : '—' },
                { label: 'Статус сделки', value: dealStatus.name || '—' },
                { label: 'Тип перевозки', value: deliveryMethod.name || '—' }
            ];
            return section('Информация о сделке', dealInfo) + section('Перевозка', transport);
        }
        var expMain = [
            { label: 'ФИО', value: d.exporterUserName || 'Экспортер' },
            { label: 'Компания перевозчиков', value: d.carrierCompanyName || '—' },
            { label: 'Адрес разгрузки', value: unloading.address || d.unloadingPointsAddress || '—' },
            { label: 'Проверка качества', value: qualityTest.name || '—' }
        ];
        var expFinance = [
            { label: 'Цена за т', value: formatPrice(d.pricePerTonExporter) + ' ₽' },
            { label: 'Общая сумма', value: totalE ? formatPrice(totalE) + ' ₽' : '—' },
            { label: 'За км', value: distanceKm > 0 ? formatPrice(totalE / distanceKm) + ' ₽/км' : '—' }
        ];
        return section('Покупатель', expMain) + section('Финансы', expFinance);
    }

    var modalTitles = {
        loading_point: 'Точка погрузки',
        unloading_point: 'Точка выгрузки',
        declarations: 'Декларации и особые условия',
        crop: 'Качество культуры',
        contracts: 'Документооборот',
        price_detail_farmer: 'Стоимость (поставщик)',
        price_detail_exporter: 'Стоимость (покупатель)',
        exporter_product: 'Продукция экспортера'
    };

    function openDetailModal(role) {
        var overlay = document.getElementById('dealModalOverlay');
        var titleEl = document.getElementById('dealModalTitle');
        var bodyEl = document.getElementById('dealModalBody');
        if (!overlay || !titleEl || !bodyEl) return;
        var titles = { farmer: 'Фермер', carrier: 'Перевозчик', exporter: 'Экспортер' };
        titleEl.textContent = titles[role] || 'Подробнее';
        var d = window._dealData;
        if (d) bodyEl.innerHTML = buildModalBody(role, d);
        else bodyEl.innerHTML = '<p>Нет данных.</p>';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function openModalByType(type) {
        var overlay = document.getElementById('dealModalOverlay');
        var titleEl = document.getElementById('dealModalTitle');
        var bodyEl = document.getElementById('dealModalBody');
        var modalEl = document.getElementById('dealModal');
        if (!overlay || !titleEl || !bodyEl) return;
        titleEl.textContent = modalTitles[type] || 'Подробнее';
        var d = window._dealData;
        if (d) bodyEl.innerHTML = buildModalContent(type, d);
        else bodyEl.innerHTML = '<p>Нет данных.</p>';
        if (modalEl) {
            modalEl.classList.toggle('deal-modal-wide', type === 'contracts');
        }
        function bindTabSwitcher() {
            // legacy tabs
            bodyEl.querySelectorAll('.deal-modal-tab-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var tab = this.getAttribute('data-tab');
                    bodyEl.querySelectorAll('.deal-modal-tab-btn').forEach(function (b) { b.classList.remove('is-active'); });
                    bodyEl.querySelectorAll('.deal-modal-tab-panel').forEach(function (p) { p.classList.remove('is-active'); });
                    this.classList.add('is-active');
                    var panel = bodyEl.querySelector('.deal-modal-tab-panel[data-tab="' + tab + '"]');
                    if (panel) panel.classList.add('is-active');
                });
            });

            // docflow tabs
            bodyEl.querySelectorAll('.docflow-tab').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var tab = this.getAttribute('data-tab');
                    bodyEl.querySelectorAll('.docflow-tab').forEach(function (b) { b.classList.remove('is-active'); });
                    bodyEl.querySelectorAll('.docflow-tab-panel').forEach(function (p) { p.classList.remove('is-active'); });
                    this.classList.add('is-active');
                    var panel = bodyEl.querySelector('.docflow-tab-panel[data-tab="' + tab + '"]');
                    if (panel) panel.classList.add('is-active');
                });
            });
        }
        if (type === 'declarations') bindTabSwitcher();
        if (type === 'loading_point' || type === 'unloading_point') bindTabSwitcher();
        if (type === 'crop') bindTabSwitcher();
        if (type === 'contracts') bindTabSwitcher();
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function closeDetailModal() {
        var overlay = document.getElementById('dealModalOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openAcceptSuccessModal() {
        var overlay = document.getElementById('dealAcceptSuccessOverlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeAcceptSuccessModal() {
        var overlay = document.getElementById('dealAcceptSuccessOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openFinishNoDocsModal() {
        var overlay = document.getElementById('dealFinishNoDocsOverlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeFinishNoDocsModal() {
        var overlay = document.getElementById('dealFinishNoDocsOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openFinishImbalanceModal(sideWithDocsOnly, finishBtn) {
        _pendingFinishImbalanceBtn = finishBtn || null;
        var onlyLabel = sideWithDocsOnly === 'exporter' ? 'экспортёра' : 'фермера';
        var recommendLabel = sideWithDocsOnly === 'exporter' ? 'фермера' : 'экспортёра';
        var text = 'На данный момент в системе находятся документы только для ' + onlyLabel + '. Если вы продолжите процесс, то в конечном итоге подписать закрывающие документы сможет только одна сторона. Мы рекомендуем загрузить документы для ' + recommendLabel + ' и продолжить процесс завершения сделки.';
        var p = document.getElementById('dealFinishImbalanceText');
        if (p) p.textContent = text;
        var overlay = document.getElementById('dealFinishImbalanceOverlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeFinishImbalanceModal() {
        var overlay = document.getElementById('dealFinishImbalanceOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openFinish409Modal() {
        var overlay = document.getElementById('dealFinish409Overlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeFinish409Modal() {
        var overlay = document.getElementById('dealFinish409Overlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openFinishSuccessModal() {
        var overlay = document.getElementById('dealFinishSuccessOverlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeFinishSuccessModal() {
        var overlay = document.getElementById('dealFinishSuccessOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openRejectConfirmModal() {
        var overlay = document.getElementById('dealRejectConfirmOverlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeRejectConfirmModal() {
        var overlay = document.getElementById('dealRejectConfirmOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openRejectSuccessModal() {
        var overlay = document.getElementById('dealRejectSuccessOverlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeRejectSuccessModal() {
        var overlay = document.getElementById('dealRejectSuccessOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    // === Управление документооборотом (модалка) ===
    var DOCFLOW_UPLOAD_PAYMENTS = '/documents/deals/payments-documents';
    var DOCFLOW_UPLOAD_FINISH = '/documents/deals/finish-documents';
    var DOCFLOW_PATCH_PAYMENTS = '/moderators-module/deals/load-payments-documents';
    var DOCFLOW_PATCH_FINISH = '/moderators-module/deals/load-finish-documents';

    var _docflow = {
        mainTab: 'manage',
        manageSub: 'payments',
        editingKey: null,
        managePayments: [],
        manageFinish: [],
        uploadPayStaged: [],
        uploadPayRows: [],
        uploadFinStaged: [],
        uploadFinRows: []
    };

    function pluralDocs(n) {
        var x = Math.abs(n) % 100;
        var y = x % 10;
        if (x > 10 && x < 20) return 'документов';
        if (y > 1 && y < 5) return 'документа';
        if (y === 1) return 'документ';
        return 'документов';
    }

    function cloneDocList(arr) {
        return (Array.isArray(arr) ? arr : []).map(function (x) {
            return {
                id: x.id,
                s3File: x.s3File,
                fileName: x.fileName || '',
                finishDocumentTo: x.finishDocumentTo === 'exporter' ? 'exporter' : 'farmer',
                created_at: x.created_at,
                path: x.path
            };
        });
    }

    function cloneFinishDocList(arr) {
        return (Array.isArray(arr) ? arr : []).map(function (x) {
            return {
                id: x.id,
                s3File: x.s3File,
                fileName: x.fileName || '',
                finishDocumentTo: x.finishDocumentTo === 'exporter' ? 'exporter' : 'farmer',
                created_at: x.created_at,
                path: x.path,
                contractNumber: x.contractNumber || '',
                date: x.date || x.created_at || null
            };
        });
    }

    function docflowSyncFromDeal() {
        var d = window._dealData || {};
        _docflow.managePayments = cloneDocList(d.dealPaymentsDocument);
        _docflow.manageFinish = cloneFinishDocList(d.dealFinishDocument);
    }

    function toIsoDate(doc) {
        var raw = doc.date || doc.created_at;
        if (raw) {
            var d = new Date(raw);
            if (!isNaN(d.getTime())) return d.toISOString();
        }
        return new Date().toISOString();
    }

    function docRecipientLabel(to) {
        return to === 'exporter' ? 'Экспортер' : 'Фермер';
    }

    function docOpenHref(doc) {
        var pathOrUrl = (doc && (doc.path || doc.declarationFile || doc.file || doc.url || doc.documentFile)) ? String(doc.path || doc.declarationFile || doc.file || doc.url || doc.documentFile).trim() : '';
        if (pathOrUrl && /^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
        if (pathOrUrl && pathOrUrl.charAt(0) === '/') {
            var base = String(API_CONFIG && API_CONFIG.BASE_URL ? API_CONFIG.BASE_URL : '').trim();
            if (!base) return null;
            return base.replace(/\/$/, '') + pathOrUrl;
        }
        var v = String(doc && doc.s3File ? doc.s3File : '').trim();
        if (!v) return null;
        if (/^https?:\/\//i.test(v)) return v;
        var base = String(API_CONFIG && API_CONFIG.BASE_URL ? API_CONFIG.BASE_URL : '').trim();
        if (!base) return null;
        base = base.replace(/\/$/, '');
        return base + '/documents/' + encodeURIComponent(v);
    }

    function docToApiDto(doc) {
        return {
            s3File: doc.s3File,
            fileName: (doc.fileName || '').trim(),
            finishDocumentTo: doc.finishDocumentTo === 'exporter' ? 'exporter' : 'farmer'
        };
    }

    function docToFinishApiDto(doc) {
        return {
            s3File: doc.s3File,
            contractNumber: String(doc.contractNumber || '').trim(),
            fileName: (doc.fileName || '').trim(),
            date: toIsoDate(doc),
            finishDocumentTo: doc.finishDocumentTo === 'exporter' ? 'exporter' : 'farmer'
        };
    }

    function createDocflowUploadRow(kind) {
        var row = {
            id: String(Date.now()) + '_' + Math.random().toString(16).slice(2),
            finishDocumentTo: 'farmer',
            fileName: '',
            file: null,
            status: 'idle',
            error: ''
        };
        if (kind === 'finish') row.contractNumber = '';
        return row;
    }

    function findUploadRow(kind, rowId) {
        var rows = kind === 'finish' ? _docflow.uploadFinRows : _docflow.uploadPayRows;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].id === rowId) return rows[i];
        }
        return null;
    }

    function openPaymentsModal() {
        openDocflowModal();
    }

    function openDocflowModal(initialTab) {
        docflowSyncFromDeal();
        _docflow.mainTab = initialTab === 'uploadFin' ? 'uploadFin' : 'manage';
        _docflow.manageSub = 'payments';
        _docflow.editingKey = null;
        _docflow.uploadPayStaged = [];
        _docflow.uploadPayRows = [createDocflowUploadRow()];
        _docflow.uploadFinStaged = [];
        _docflow.uploadFinRows = [createDocflowUploadRow('finish')];
        renderDocflowRoot();
        var overlay = document.getElementById('dealPaymentsOverlay');
        if (!overlay) return;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function closePaymentsModal() {
        var overlay = document.getElementById('dealPaymentsOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
    }

    function openPaymentsSuccessModal(uploadedDocs) {
        var overlay = document.getElementById('dealPaymentsSuccessOverlay');
        var textEl = document.getElementById('dealPaymentsSuccessText');
        var listEl = document.getElementById('dealPaymentsSuccessList');
        if (!overlay || !textEl || !listEl) return;
        var count = uploadedDocs.length;
        textEl.textContent = 'Были успешно загружены ' + count + ' ' + pluralDocs(count) + '.';
        listEl.innerHTML = uploadedDocs.map(function (d) {
            var to = docRecipientLabel(d.finishDocumentTo);
            return '<li><strong>' + escapeHtml(d.fileName || '—') + '</strong> — ' + to + '</li>';
        }).join('');
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function closePaymentsSuccessModal() {
        var overlay = document.getElementById('dealPaymentsSuccessOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
    }

    function renderDocflowRoot() {
        var root = document.getElementById('dealDocflowRoot');
        if (!root) return;

        var mt = _docflow.mainTab;
        var html = '';
        html += '<div class="docflow-mega-tabs">';
        html += '<button type="button" class="docflow-mega-tab' + (mt === 'manage' ? ' is-active' : '') + '" data-docflow-action="main-tab" data-tab="manage"><i class="fas fa-tasks"></i><span>Управление документами</span></button>';
        html += '<button type="button" class="docflow-mega-tab' + (mt === 'uploadPay' ? ' is-active' : '') + '" data-docflow-action="main-tab" data-tab="uploadPay"><i class="fas fa-cloud-upload-alt"></i><span>Загрузить платёжные</span></button>';
        html += '<button type="button" class="docflow-mega-tab' + (mt === 'uploadFin' ? ' is-active' : '') + '" data-docflow-action="main-tab" data-tab="uploadFin"><i class="fas fa-file-signature"></i><span>Загрузить завершающие</span></button>';
        html += '</div>';

        if (mt === 'manage') {
            html += renderDocflowManagePanel();
        } else if (mt === 'uploadPay') {
            html += renderDocflowUploadPanel('payments');
        } else {
            html += renderDocflowUploadPanel('finish');
        }

        root.innerHTML = html;
    }

    function renderDocflowManagePanel() {
        var sub = _docflow.manageSub;
        var h = '<div class="docflow-manage">';
        h += '<div class="docflow-sub-tabs">';
        h += '<button type="button" class="docflow-sub-tab' + (sub === 'payments' ? ' is-active' : '') + '" data-docflow-action="manage-sub" data-sub="payments">Платёжные документы</button>';
        h += '<button type="button" class="docflow-sub-tab' + (sub === 'closing' ? ' is-active' : '') + '" data-docflow-action="manage-sub" data-sub="closing">Закрывающие документы</button>';
        h += '</div>';
        h += '<div class="docflow-manage-list">';
        var list = sub === 'payments' ? _docflow.managePayments : _docflow.manageFinish;
        var kind = sub === 'payments' ? 'payments' : 'finish';
        if (!list.length) {
            h += '<div class="docflow-manage-empty">Нет документов.</div>';
        } else {
            for (var i = 0; i < list.length; i++) {
                h += renderManageDocCard(list[i], i, kind);
            }
        }
        h += '</div></div>';
        return h;
    }

    function renderManageDocCard(doc, index, kind) {
        var key = kind + ':' + index;
        var href = docOpenHref(doc);
        var nameView = href
            ? '<a class="docflow-mg-name" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(doc.fileName || 'Документ') + '</a>'
            : '<span class="docflow-mg-name docflow-mg-name-plain">' + escapeHtml(doc.fileName || 'Документ') + '</span>';
        var isEdit = _docflow.editingKey === key;
        if (isEdit) {
            var editRows = '<div class="docflow-mg-card docflow-mg-card-edit" data-docflow-key="' + escapeHtml(key) + '">' +
                '<div class="docflow-mg-edit-row">' +
                    '<label>Название</label>' +
                    '<input type="text" class="docflow-mg-input" data-docflow-manage-input="name" data-kind="' + escapeHtml(kind) + '" data-index="' + index + '" value="' + escapeHtml(doc.fileName) + '" />' +
                '</div>';
            if (kind === 'finish') {
                editRows += '<div class="docflow-mg-edit-row">' +
                    '<label>Номер</label>' +
                    '<input type="text" class="docflow-mg-input" data-docflow-manage-input="contractNumber" data-kind="' + escapeHtml(kind) + '" data-index="' + index + '" value="' + escapeHtml(doc.contractNumber || '') + '" placeholder="Номер договора" />' +
                '</div>';
            }
            editRows += '<div class="docflow-mg-edit-row">' +
                    '<label>Кому</label>' +
                    '<select class="docflow-mg-select" data-docflow-manage-input="to" data-kind="' + escapeHtml(kind) + '" data-index="' + index + '">' +
                        '<option value="farmer"' + (doc.finishDocumentTo === 'farmer' ? ' selected' : '') + '>Фермер</option>' +
                        '<option value="exporter"' + (doc.finishDocumentTo === 'exporter' ? ' selected' : '') + '>Экспортер</option>' +
                    '</select>' +
                '</div>' +
                '<div class="docflow-mg-actions">' +
                    '<button type="button" class="deal-btn-primary docflow-mg-btn-sm" data-docflow-action="manage-save" data-kind="' + escapeHtml(kind) + '" data-index="' + index + '">Сохранить</button>' +
                    '<button type="button" class="btn btn-secondary docflow-mg-btn-sm" data-docflow-action="manage-cancel">Отмена</button>' +
                '</div>' +
            '</div>';
            return editRows;
        }
        var metaHtml = '<span class="docflow-pill">' + escapeHtml(docRecipientLabel(doc.finishDocumentTo)) + '</span>' +
            (kind === 'finish' && (doc.contractNumber || '') ? '<span class="docflow-mg-number">№ ' + escapeHtml(doc.contractNumber) + '</span>' : '') +
            '<span class="docflow-mg-date">' + escapeHtml(formatDate(doc.created_at)) + '</span>';
        return (
            '<div class="docflow-mg-card">' +
                '<div class="docflow-mg-main">' +
                    '<div class="docflow-mg-title-block">' + nameView + '</div>' +
                    '<div class="docflow-mg-meta">' +
                        metaHtml +
                    '</div>' +
                '</div>' +
                '<div class="docflow-mg-tools">' +
                    '<button type="button" class="docflow-mg-icon-btn" data-docflow-action="manage-edit" data-kind="' + escapeHtml(kind) + '" data-index="' + index + '" title="Изменить"><i class="fas fa-pen"></i></button>' +
                    '<button type="button" class="docflow-mg-icon-btn docflow-mg-icon-danger" data-docflow-action="manage-delete" data-kind="' + escapeHtml(kind) + '" data-index="' + index + '" title="Удалить"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</div>'
        );
    }

    function renderDocflowUploadPanel(kind) {
        var isFin = kind === 'finish';
        var staged = isFin ? _docflow.uploadFinStaged : _docflow.uploadPayStaged;
        var rows = isFin ? _docflow.uploadFinRows : _docflow.uploadPayRows;
        var k = isFin ? 'finish' : 'payments';

        var h = '<div class="docflow-upload-panel">';
        h += '<div class="docflow-staged-block">';
        if (staged.length) {
            h += '<div class="docflow-staged-title">Готово к прикреплению</div>';
            staged.forEach(function (s) {
                var href = docOpenHref(s);
                var link = href
                    ? '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener" class="docflow-staged-link">' + escapeHtml(s.fileName || 'Документ') + '</a>'
                    : '<span class="docflow-staged-link">' + escapeHtml(s.fileName || 'Документ') + '</span>';
                var numberPart = isFin && (s.contractNumber || '') ? '<span class="docflow-staged-number">№ ' + escapeHtml(s.contractNumber) + '</span>' : '';
                h += '<div class="docflow-staged-row">' +
                    link +
                    numberPart +
                    '<span class="docflow-pill">' + escapeHtml(docRecipientLabel(s.finishDocumentTo)) + '</span>' +
                    '<button type="button" class="docflow-mg-icon-btn docflow-mg-icon-danger" data-docflow-action="staged-remove" data-kind="' + k + '" data-temp-id="' + escapeHtml(s.tempId) + '" title="Убрать"><i class="fas fa-trash"></i></button>' +
                    '</div>';
            });
        }
        h += '</div>';

        var canRemoveRow = rows.length > 1;
        rows.forEach(function (r) {
            h += renderUploadFormRow(r, k, canRemoveRow);
        });

        h += '<button type="button" class="docflow-add-row-btn" data-docflow-action="add-upload-row" data-kind="' + k + '"><i class="fas fa-plus"></i><span>Добавить документ</span></button>';
        h += '<div class="docflow-upload-footer">';
        h += '<button type="button" class="deal-btn-primary" data-docflow-action="attach-upload" data-kind="' + k + '"' + (docflowCanAttach(k) ? '' : ' disabled') + '>Прикрепить документы</button>';
        h += '</div></div>';
        return h;
    }

    function renderUploadFormRow(r, kind, canRemoveRow) {
        var err = r.error ? '<div class="docflow-form-err">' + escapeHtml(r.error) + '</div>' : '';
        var uploading = r.status === 'uploading';
        var btnContent = uploading
            ? '<i class="fas fa-spinner fa-spin"></i>'
            : '<i class="fas fa-cloud-upload-alt" aria-hidden="true"></i>';
        var numberField = (kind === 'finish')
            ? '<div class="deal-payments-field">' +
                '<label>Номер</label>' +
                '<input type="text" data-docflow-upload-field="contractNumber" data-kind="' + escapeHtml(kind) + '" data-row-id="' + escapeHtml(r.id) + '" value="' + escapeHtml(r.contractNumber || '') + '" placeholder="Номер договора" ' + (uploading ? 'readonly' : '') + ' />' +
              '</div>'
            : '';
        var removeBtn = canRemoveRow
            ? '<button type="button" class="docflow-form-row-remove" data-docflow-action="remove-upload-row" data-kind="' + escapeHtml(kind) + '" data-row-id="' + escapeHtml(r.id) + '" title="Удалить строку"><i class="fas fa-times"></i></button>'
            : '';
        var gridClass = 'docflow-form-grid' + (kind === 'finish' ? ' docflow-form-grid--finish' : '');
        return (
            '<div class="docflow-form-card" data-row-id="' + escapeHtml(r.id) + '">' +
                (removeBtn ? '<div class="docflow-form-card-header">' + removeBtn + '</div>' : '') +
                '<div class="' + gridClass + '">' +
                    '<div class="deal-payments-field">' +
                        '<label>Кому посвящён</label>' +
                        '<select class="docflow-mg-select" data-docflow-upload-field="to" data-kind="' + escapeHtml(kind) + '" data-row-id="' + escapeHtml(r.id) + '" ' + (uploading ? 'disabled' : '') + '>' +
                            '<option value="farmer"' + (r.finishDocumentTo === 'farmer' ? ' selected' : '') + '>Фермер</option>' +
                            '<option value="exporter"' + (r.finishDocumentTo === 'exporter' ? ' selected' : '') + '>Экспортер</option>' +
                        '</select>' +
                    '</div>' +
                    numberField +
                    '<div class="deal-payments-field">' +
                        '<label>Название документа</label>' +
                        '<input type="text" data-docflow-upload-field="name" data-kind="' + escapeHtml(kind) + '" data-row-id="' + escapeHtml(r.id) + '" value="' + escapeHtml(r.fileName) + '" placeholder="Напр. Платёжка" ' + (uploading ? 'readonly' : '') + ' />' +
                    '</div>' +
                    '<div class="deal-payments-field docflow-file-field">' +
                        '<span class="docflow-file-field-label">Файл</span>' +
                        '<label class="docflow-file-wrap">' +
                            '<input type="file" class="docflow-file-input" data-docflow-upload-field="file" data-kind="' + escapeHtml(kind) + '" data-row-id="' + escapeHtml(r.id) + '" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" ' + (uploading ? 'disabled' : '') + ' />' +
                            '<span class="docflow-file-label">' + escapeHtml(r.file ? r.file.name : 'Выбрать файл') + '</span>' +
                        '</label>' +
                    '</div>' +
                    '<div class="deal-payments-field docflow-upload-btn-cell">' +
                        '<label class="docflow-upload-label-spacer">&nbsp;</label>' +
                        '<button type="button" class="docflow-upload-submit-btn' + (uploading ? ' is-loading' : '') + '" data-docflow-action="upload-file" data-kind="' + escapeHtml(kind) + '" data-row-id="' + escapeHtml(r.id) + '" ' + (uploading ? 'disabled' : '') + ' title="Загрузить">' + btnContent + '</button>' +
                    '</div>' +
                '</div>' +
                err +
            '</div>'
        );
    }

    function docflowHasIncompleteUploadRow(rows) {
        return rows.some(function (r) {
            if (r.status === 'uploading') return true;
            if (r.file) return true;
            if (r.fileName && String(r.fileName).trim()) return true;
            return false;
        });
    }

    function docflowCanAttach(kind) {
        var isFin = kind === 'finish';
        var staged = isFin ? _docflow.uploadFinStaged : _docflow.uploadPayStaged;
        var rows = isFin ? _docflow.uploadFinRows : _docflow.uploadPayRows;
        if (!staged.length) return false;
        if (rows.some(function (r) { return r.status === 'uploading'; })) return false;
        return !docflowHasIncompleteUploadRow(rows);
    }

    async function patchDealPaymentsDto(dtoArr) {
        var dealId = getDealId();
        var headers = await getAuthHeaders();
        if (!headers) throw new Error('Нет токена');
        var res = await fetch(API_CONFIG.BASE_URL + DOCFLOW_PATCH_PAYMENTS.replace('/api/', ''), {
            method: 'PATCH',
            headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ deal: dealId, dealPaymentsDocumentDto: dtoArr }),
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_ATTACH_DOCS || 300000)
        });
        if (res.status === 401 || res.status === 403) {
            if (typeof logout === 'function') logout();
            throw new Error('auth');
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
    }

    async function patchDealFinishDto(dtoArr) {
        var dealId = getDealId();
        var headers = await getAuthHeaders();
        if (!headers) throw new Error('Нет токена');
        var res = await fetch(API_CONFIG.BASE_URL + DOCFLOW_PATCH_FINISH.replace('/api/', ''), {
            method: 'PATCH',
            headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ deal: dealId, dealFinishDocumentDto: dtoArr }),
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_ATTACH_DOCS || 300000)
        });
        if (res.status === 401 || res.status === 403) {
            if (typeof logout === 'function') logout();
            throw new Error('auth');
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
    }

    function onDocflowClick(e) {
        var t = e.target.closest('[data-docflow-action]');
        if (!t) return;
        var action = t.getAttribute('data-docflow-action');

        if (action === 'main-tab') {
            _docflow.mainTab = t.getAttribute('data-tab') || 'manage';
            _docflow.editingKey = null;
            renderDocflowRoot();
            return;
        }
        if (action === 'manage-sub') {
            _docflow.manageSub = t.getAttribute('data-sub') === 'closing' ? 'closing' : 'payments';
            _docflow.editingKey = null;
            renderDocflowRoot();
            return;
        }
        if (action === 'manage-edit') {
            var ek = t.getAttribute('data-kind') + ':' + t.getAttribute('data-index');
            _docflow.editingKey = ek;
            renderDocflowRoot();
            return;
        }
        if (action === 'manage-cancel') {
            _docflow.editingKey = null;
            renderDocflowRoot();
            return;
        }
        if (action === 'manage-save') {
            var sk = t.getAttribute('data-kind');
            var si = parseInt(t.getAttribute('data-index'), 10);
            var card = t.closest('.docflow-mg-card-edit');
            if (!card) return;
            var nameInp = card.querySelector('[data-docflow-manage-input="name"]');
            var toSel = card.querySelector('[data-docflow-manage-input="to"]');
            var numInp = card.querySelector('[data-docflow-manage-input="contractNumber"]');
            var list = sk === 'finish' ? _docflow.manageFinish : _docflow.managePayments;
            if (!list[si]) return;
            list[si].fileName = nameInp ? nameInp.value : list[si].fileName;
            list[si].finishDocumentTo = toSel && toSel.value === 'exporter' ? 'exporter' : 'farmer';
            if (sk === 'finish') list[si].contractNumber = numInp ? numInp.value : (list[si].contractNumber || '');
            _docflow.editingKey = null;
            var dto = sk === 'finish' ? list.map(docToFinishApiDto) : list.map(docToApiDto);
            (sk === 'finish' ? patchDealFinishDto(dto) : patchDealPaymentsDto(dto)).then(function () {
                return refreshDealDetail();
            }).then(function () {
                docflowSyncFromDeal();
                renderDocflowRoot();
            }).catch(function (err) { console.error('manage-save', err); });
            return;
        }
        if (action === 'manage-delete') {
            var dk = t.getAttribute('data-kind');
            var di = parseInt(t.getAttribute('data-index'), 10);
            var dlist = dk === 'finish' ? _docflow.manageFinish : _docflow.managePayments;
            if (di < 0 || di >= dlist.length) return;
            dlist.splice(di, 1);
            var ddto = dk === 'finish' ? dlist.map(docToFinishApiDto) : dlist.map(docToApiDto);
            (dk === 'finish' ? patchDealFinishDto(ddto) : patchDealPaymentsDto(ddto)).then(function () {
                return refreshDealDetail();
            }).then(function () {
                docflowSyncFromDeal();
                renderDocflowRoot();
            }).catch(function (err) { console.error('manage-delete', err); });
            return;
        }
        if (action === 'add-upload-row') {
            var ak = t.getAttribute('data-kind');
            if (ak === 'finish') _docflow.uploadFinRows.push(createDocflowUploadRow('finish'));
            else _docflow.uploadPayRows.push(createDocflowUploadRow());
            renderDocflowRoot();
            return;
        }
        if (action === 'remove-upload-row') {
            var rk = t.getAttribute('data-kind');
            var rowId = t.getAttribute('data-row-id');
            if (rk === 'finish') {
                _docflow.uploadFinRows = _docflow.uploadFinRows.filter(function (x) { return x.id !== rowId; });
                if (!_docflow.uploadFinRows.length) _docflow.uploadFinRows.push(createDocflowUploadRow('finish'));
            } else {
                _docflow.uploadPayRows = _docflow.uploadPayRows.filter(function (x) { return x.id !== rowId; });
                if (!_docflow.uploadPayRows.length) _docflow.uploadPayRows.push(createDocflowUploadRow());
            }
            renderDocflowRoot();
            return;
        }
        if (action === 'staged-remove') {
            var rk = t.getAttribute('data-kind');
            var tid = t.getAttribute('data-temp-id');
            if (rk === 'finish') {
                _docflow.uploadFinStaged = _docflow.uploadFinStaged.filter(function (x) { return x.tempId !== tid; });
            } else {
                _docflow.uploadPayStaged = _docflow.uploadPayStaged.filter(function (x) { return x.tempId !== tid; });
            }
            renderDocflowRoot();
            return;
        }
        if (action === 'upload-file') {
            var uk = t.getAttribute('data-kind');
            var ur = t.getAttribute('data-row-id');
            docflowPerformUpload(uk, ur);
            return;
        }
        if (action === 'attach-upload') {
            var ak2 = t.getAttribute('data-kind');
            docflowAttachStaged(ak2);
            return;
        }
    }

    function onDocflowChange(e) {
        var inp = e.target;
        if (!inp || !inp.getAttribute) return;
        var field = inp.getAttribute('data-docflow-upload-field');
        if (!field) return;
        var kind = inp.getAttribute('data-kind');
        var rowId = inp.getAttribute('data-row-id');
        var row = findUploadRow(kind === 'finish' ? 'finish' : 'payments', rowId);
        if (!row) return;
        if (field === 'name') row.fileName = inp.value;
        if (field === 'to') row.finishDocumentTo = inp.value === 'exporter' ? 'exporter' : 'farmer';
        if (field === 'file') {
            row.file = inp.files && inp.files[0] ? inp.files[0] : null;
            renderDocflowRoot();
        }
        if (field === 'contractNumber') row.contractNumber = inp.value;
    }

    async function docflowPerformUpload(kind, rowId) {
        var isFin = kind === 'finish';
        var row = findUploadRow(isFin ? 'finish' : 'payments', rowId);
        if (!row || row.status === 'uploading') return;

        var fn = (row.fileName || '').trim();
        if (!fn) {
            row.error = 'Укажите название документа';
            renderDocflowRoot();
            return;
        }
        if (!row.file) {
            row.error = 'Выберите файл';
            renderDocflowRoot();
            return;
        }
        var ext = String(row.file.name || '').toLowerCase().split('.').pop();
        var allowed = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'doc'];
        if (allowed.indexOf(ext) === -1) {
            row.error = 'Формат не поддерживается';
            renderDocflowRoot();
            return;
        }

        row.status = 'uploading';
        row.error = '';
        renderDocflowRoot();

        try {
            var headers = await getAuthHeaders();
            if (!headers) throw new Error('Нет токена');
            delete headers['Content-Type'];
            delete headers['content-type'];
            var form = new FormData();
            form.append('files', row.file, row.file.name);
            var urlPath = isFin ? DOCFLOW_UPLOAD_FINISH : DOCFLOW_UPLOAD_PAYMENTS;
            var res = await fetch(API_CONFIG.BASE_URL + urlPath.replace('/api/', ''), {
                method: 'POST',
                headers: headers,
                body: form,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_UPLOAD || 300000)
            });
            if (res.status === 401 || res.status === 403) {
                if (typeof logout === 'function') logout();
                row.status = 'idle';
                row.error = 'Сессия истекла';
                renderDocflowRoot();
                return;
            }
            var raw = await res.text();
            if (!res.ok) {
                row.status = 'idle';
                row.error = 'Ошибка ' + res.status + (raw ? ': ' + String(raw).slice(0, 120) : '');
                renderDocflowRoot();
                return;
            }
            var data = raw ? JSON.parse(raw) : null;
            var uploaded = Array.isArray(data) && data.length ? data[0] : null;
            var fileRef = uploaded && (uploaded.path || uploaded.id);
            if (!uploaded || !fileRef) throw new Error('bad response');

            var staged = {
                tempId: 'st_' + Date.now() + '_' + Math.random().toString(16).slice(2),
                s3File: uploaded.path || uploaded.id,
                fileName: fn,
                finishDocumentTo: row.finishDocumentTo,
                path: uploaded.path || null,
                created_at: uploaded.createdAt || null
            };
            if (isFin) {
                staged.contractNumber = row.contractNumber || '';
                staged.date = uploaded.createdAt ? new Date(uploaded.createdAt).toISOString() : new Date().toISOString();
            }

            if (isFin) {
                _docflow.uploadFinRows = _docflow.uploadFinRows.filter(function (x) { return x.id !== rowId; });
                _docflow.uploadFinStaged.push(staged);
                if (!_docflow.uploadFinRows.length) _docflow.uploadFinRows.push(createDocflowUploadRow('finish'));
            } else {
                _docflow.uploadPayRows = _docflow.uploadPayRows.filter(function (x) { return x.id !== rowId; });
                _docflow.uploadPayStaged.push(staged);
                if (!_docflow.uploadPayRows.length) _docflow.uploadPayRows.push(createDocflowUploadRow());
            }
        } catch (err) {
            row.status = 'idle';
            row.error = (err && err.name === 'AbortError') ? 'Таймаут' : 'Не удалось загрузить';
            console.error(err);
        }
        renderDocflowRoot();
    }

    async function docflowAttachStaged(kind) {
        var isFin = kind === 'finish';
        var staged = isFin ? _docflow.uploadFinStaged : _docflow.uploadPayStaged;
        if (!staged.length || !docflowCanAttach(kind)) return;

        // Loading state for "Прикрепить документы"
        var overlay = document.getElementById('dealPaymentsOverlay');
        var attachBtn = null;
        var attachOriginalHtml = null;
        if (overlay) {
            attachBtn = overlay.querySelector('[data-docflow-action="attach-upload"][data-kind="' + (isFin ? 'finish' : 'payments') + '"]');
            if (attachBtn) {
                attachOriginalHtml = attachBtn.innerHTML;
                attachBtn.disabled = true;
                attachBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>Загружаем документы…</span>';
            }
        }

        var existing = isFin
            ? cloneFinishDocList((window._dealData && window._dealData.dealFinishDocument) || [])
            : cloneDocList((window._dealData && window._dealData.dealPaymentsDocument) || []);
        var existingDto = isFin ? existing.map(docToFinishApiDto) : existing.map(docToApiDto);
        var newDto = isFin
            ? staged.map(function (s) {
                return {
                    s3File: s.s3File,
                    contractNumber: String(s.contractNumber || '').trim(),
                    fileName: (s.fileName || '').trim(),
                    date: s.date || new Date().toISOString(),
                    finishDocumentTo: s.finishDocumentTo === 'exporter' ? 'exporter' : 'farmer'
                };
            })
            : staged.map(function (s) {
                return { s3File: s.s3File, fileName: (s.fileName || '').trim(), finishDocumentTo: s.finishDocumentTo === 'exporter' ? 'exporter' : 'farmer' };
            });
        var fullDto = existingDto.concat(newDto);

        try {
            if (isFin) await patchDealFinishDto(fullDto);
            else await patchDealPaymentsDto(fullDto);
            await refreshDealDetail();
            docflowSyncFromDeal();
            if (isFin) {
                _docflow.uploadFinStaged = [];
                _docflow.uploadFinRows = [createDocflowUploadRow('finish')];
            } else {
                _docflow.uploadPayStaged = [];
                _docflow.uploadPayRows = [createDocflowUploadRow()];
            }
            openPaymentsSuccessModal(newDto);
            renderDocflowRoot();
        } catch (err) {
            console.error('attach', err);
        } finally {
            if (attachBtn) {
                attachBtn.disabled = false;
                if (attachOriginalHtml != null) attachBtn.innerHTML = attachOriginalHtml;
            }
        }
    }

    function bindDocflowOverlayEvents() {
        var overlay = document.getElementById('dealPaymentsOverlay');
        if (!overlay || overlay._docflowBound) return;
        overlay._docflowBound = true;
        overlay.addEventListener('click', onDocflowClick);
        overlay.addEventListener('change', onDocflowChange);
    }

    function init() {
        var dealId = getDealId();
        if (!dealId) {
            showSection('dealDetailLoading', false);
            showSection('dealDetailError', true);
            setText('dealDetailErrorMessage', 'Не указан ID сделки.');
            return;
        }

        var backBtn = document.getElementById('dealDetailBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                if (window.history.length > 1) window.history.back();
                else window.location.href = '/main/';
            });
        }

        document.querySelectorAll('.participant-card').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (this.classList.contains('participant-card-loading')) return;
                if (this.classList.contains('is-disabled')) return;
                var role = this.getAttribute('data-role');
                if (!role) return;
                var isActive = this.classList.contains('is-active');
                var logisticsEl = document.getElementById('dealLogisticsDetail');
                document.querySelectorAll('.participant-card').forEach(function (c) {
                    c.classList.remove('is-active');
                    c.setAttribute('aria-pressed', 'false');
                });
                if (role === 'farmer' || role === 'exporter') {
                    if (logisticsEl) logisticsEl.style.display = 'none';
                    closeDetailModal();
                    var mapEl = document.getElementById('dealPartnerMap');
                    var titleEl = document.getElementById('dealPartnerMapTitle');
                    var user = role === 'farmer' ? window._farmerUserData : window._exporterUserData;
                    if (mapEl && titleEl) {
                        titleEl.textContent = role === 'farmer' ? 'Карта партнёра: Фермер' : 'Карта партнёра: Экспортер';
                        renderPartnerMap(user || null, role);
                        mapEl.style.display = 'block';
                    }
                    if (!isActive) {
                        this.classList.add('is-active');
                        this.setAttribute('aria-pressed', 'true');
                    } else {
                        if (mapEl) mapEl.style.display = 'none';
                    }
                } else {
                    var mapEl2 = document.getElementById('dealPartnerMap');
                    if (mapEl2) mapEl2.style.display = 'none';
                    if (isActive) {
                        if (logisticsEl) logisticsEl.style.display = 'none';
                        closeDetailModal();
                        return;
                    }

                    this.classList.add('is-active');
                    this.setAttribute('aria-pressed', 'true');
                    if (logisticsEl) logisticsEl.style.display = 'block';
                    closeDetailModal();
                    await ensureCarrierLogisticsDetailLoaded(dealId);
                }
            });
        });

        var tileLoading = document.getElementById('dealTileLoading');
        if (tileLoading) tileLoading.addEventListener('click', function () { openModalByType('loading_point'); });
        var tileUnloading = document.getElementById('dealTileUnloading');
        if (tileUnloading) tileUnloading.addEventListener('click', function () { openModalByType('unloading_point'); });
        var tileDeclarations = document.getElementById('dealTileDeclarations');
        if (tileDeclarations) tileDeclarations.addEventListener('click', function () { openModalByType('declarations'); });
        var tilePriceFarmer = document.getElementById('dealTilePriceFarmer');
        if (tilePriceFarmer) tilePriceFarmer.addEventListener('click', function () { openModalByType('price_detail_farmer'); });
        var tilePriceExporter = document.getElementById('dealTilePriceExporter');
        if (tilePriceExporter) tilePriceExporter.addEventListener('click', function () { openModalByType('price_detail_exporter'); });
        var tileExporterProduct = document.getElementById('dealTileExporterProduct');
        if (tileExporterProduct) tileExporterProduct.addEventListener('click', function () { openModalByType('exporter_product'); });
        var cropLink = document.getElementById('dealCropLink');
        if (cropLink) cropLink.addEventListener('click', function () { openModalByType('crop'); });
        var tileContracts = document.getElementById('dealTileContracts');
        if (tileContracts) tileContracts.addEventListener('click', function () { openModalByType('contracts'); });

        var modalClose = document.getElementById('dealModalClose');
        if (modalClose) modalClose.addEventListener('click', closeDetailModal);
        var modalOverlay = document.getElementById('dealModalOverlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === modalOverlay) closeDetailModal();
            });
        }

        // Публикация лота (статус «Создана»)
        var lotPublishOverlay = document.getElementById('dealLotPublishOverlay');
        var lotPublishCloseBtn = document.getElementById('dealLotPublishCloseBtn');
        var lotPublishConfirmBtn = document.getElementById('dealLotPublishConfirmBtn');
        var lotPublishEditBtn = document.getElementById('dealLotPublishEditBtn');
        var lotEditCancelBtn = document.getElementById('dealLotEditCancelBtn');
        var lotEditSubmitBtn = document.getElementById('dealLotEditSubmitBtn');

        if (lotPublishCloseBtn) {
            lotPublishCloseBtn.addEventListener('click', function () {
                closeLotPublishModal();
            });
        }
        if (lotPublishOverlay) {
            lotPublishOverlay.addEventListener('click', function (e) {
                if (e.target !== lotPublishOverlay) return;
                var editPanel = document.getElementById('dealLotEditPanel');
                if (editPanel && editPanel.style.display !== 'none') return;
                closeLotPublishModal();
            });
        }

        if (lotPublishEditBtn) {
            lotPublishEditBtn.addEventListener('click', function () {
                showLotEditPanel();
            });
        }

        if (lotEditCancelBtn) lotEditCancelBtn.addEventListener('click', closeLotPublishModal);

        if (lotPublishConfirmBtn) {
            _lotPublishConfirmOriginalHtml = lotPublishConfirmBtn.innerHTML;
            lotPublishConfirmBtn.addEventListener('click', async function () {
                if (!_lotPublishModalLotId) return;

                var btn = this;
                btn.disabled = true;
                if (lotPublishEditBtn) lotPublishEditBtn.disabled = true;

                btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>Публикация</span>';

                var result = await goToActiveLot(_lotPublishModalLotId);
                if (result && result.ok) {
                    closeLotPublishModal();
                    window.location.reload();
                    return;
                }

                btn.disabled = false;
                if (lotPublishEditBtn) lotPublishEditBtn.disabled = false;
                if (_lotPublishConfirmOriginalHtml != null) btn.innerHTML = _lotPublishConfirmOriginalHtml;

                var errEl = document.getElementById('dealLotPublishError');
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

                var btn = this;
                var errEl = document.getElementById('dealLotEditError');

                if (errEl) {
                    errEl.textContent = '';
                    errEl.style.display = 'none';
                }

                var distanceEl = document.getElementById('dealLotEditDistanceInput');
                var tcEl = document.getElementById('dealLotEditTransportCoeffInput');
                var priceEl = document.getElementById('dealLotEditPricePerTonInput');
                var manualCb = document.getElementById('dealLotEditManualPriceCheckbox');
                var manualPrice = manualCb && manualCb.checked;

                recalcLotEditFields();

                var kmVal = parseLotEditMaybeNumber(distanceEl ? distanceEl.value : '');
                var tcVal = parseLotEditMaybeNumber(tcEl ? tcEl.value : '');
                var priceVal = parseLotEditMaybeNumber(priceEl ? priceEl.value : '');

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

                var dto = { id: _lotPublishModalLotId };
                dto.distance = kmVal * 1000;
                if (manualPrice) {
                    if (priceVal != null) dto.pricePerTon = priceVal;
                    if (tcVal != null) dto.transportCoefficient = tcVal;
                } else {
                    if (tcVal != null) dto.transportCoefficient = tcVal;
                }

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>Обновляем</span>';

                var result = await goToUpdateLot(dto);
                if (result && result.ok) {
                    btn.disabled = false;
                    if (_lotEditSubmitOriginalHtml != null) btn.innerHTML = _lotEditSubmitOriginalHtml;
                    closeLotPublishModal();

                    // Обновляем только секцию логистики, без полного refresh страницы
                    try {
                        _lotsAllCache = null;
                        _carrierLogisticsHtmlCache = {};
                        if (_currentDealsIdForLogistics) await ensureCarrierLogisticsDetailLoaded(_currentDealsIdForLogistics);
                    } catch (_) { /* ignore */ }

                    return;
                }

                btn.disabled = false;
                if (_lotEditSubmitOriginalHtml != null) btn.innerHTML = _lotEditSubmitOriginalHtml;

                if (errEl) {
                    errEl.textContent = 'Не удалось обновить лот. Попробуйте снова.';
                    errEl.style.display = 'block';
                }
            });
        }

        var dealActionCancel = document.getElementById('dealActionCancel');
        if (dealActionCancel) {
            dealActionCancel.addEventListener('click', function () {
                openRejectConfirmModal();
            });
        }
        var freezeBtn = document.getElementById('dealActionFreeze');
        if (freezeBtn) freezeBtn.addEventListener('click', function () { console.log('Заморозить сделку'); });

        var docsBtn = document.getElementById('dealActionDocs');
        if (docsBtn) docsBtn.addEventListener('click', function () { openPaymentsModal(); });

        var finishBtn = document.getElementById('dealActionFinish');
        if (finishBtn) {
            finishBtn.addEventListener('click', function () {
                var btn = this;
                var id = getDealId();
                if (!id) return;
                var finishDocs = window._dealData && Array.isArray(window._dealData.dealFinishDocument) ? window._dealData.dealFinishDocument : [];
                if (finishDocs.length === 0) {
                    openFinishNoDocsModal();
                    return;
                }
                var cov = finishDocsCoverBothSides(finishDocs);
                if (!cov.balanced) {
                    var sideWithDocsOnly = cov.hasFarmer && !cov.hasExporter ? 'farmer' : 'exporter';
                    openFinishImbalanceModal(sideWithDocsOnly, btn);
                    return;
                }
                performGoToFinishWithButton(btn);
            });
        }

        var dealActionAccept = document.getElementById('dealActionAccept');
        if (dealActionAccept) {
            dealActionAccept.addEventListener('click', function () {
                var btn = this;
                var id = getDealId();
                if (!id) return;
                var originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Отправка...</span>';
                goToSign(id).then(function (ok) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                    if (ok) openAcceptSuccessModal();
                });
            });
        }

        var dealAcceptSuccessClose = document.getElementById('dealAcceptSuccessClose');
        var dealAcceptSuccessOk = document.getElementById('dealAcceptSuccessOk');
        var dealAcceptSuccessOverlay = document.getElementById('dealAcceptSuccessOverlay');
        if (dealAcceptSuccessClose) dealAcceptSuccessClose.addEventListener('click', closeAcceptSuccessModal);
        if (dealAcceptSuccessOk) dealAcceptSuccessOk.addEventListener('click', closeAcceptSuccessModal);
        if (dealAcceptSuccessOverlay) {
            dealAcceptSuccessOverlay.addEventListener('click', function (e) {
                if (e.target === dealAcceptSuccessOverlay) closeAcceptSuccessModal();
            });
        }

        var dealFinishNoDocsClose = document.getElementById('dealFinishNoDocsClose');
        var dealFinishNoDocsOk = document.getElementById('dealFinishNoDocsOk');
        var dealFinishNoDocsUpload = document.getElementById('dealFinishNoDocsUpload');
        var dealFinishNoDocsOverlay = document.getElementById('dealFinishNoDocsOverlay');
        if (dealFinishNoDocsClose) dealFinishNoDocsClose.addEventListener('click', closeFinishNoDocsModal);
        if (dealFinishNoDocsOk) dealFinishNoDocsOk.addEventListener('click', closeFinishNoDocsModal);
        if (dealFinishNoDocsUpload) {
            dealFinishNoDocsUpload.addEventListener('click', function () {
                closeFinishNoDocsModal();
                openDocflowModal('uploadFin');
            });
        }
        if (dealFinishNoDocsOverlay) {
            dealFinishNoDocsOverlay.addEventListener('click', function (e) {
                if (e.target === dealFinishNoDocsOverlay) closeFinishNoDocsModal();
            });
        }

        var dealFinishImbalanceClose = document.getElementById('dealFinishImbalanceClose');
        var dealFinishImbalanceCancel = document.getElementById('dealFinishImbalanceCancel');
        var dealFinishImbalanceContinue = document.getElementById('dealFinishImbalanceContinue');
        var dealFinishImbalanceOverlay = document.getElementById('dealFinishImbalanceOverlay');
        function clearFinishImbalancePending() {
            _pendingFinishImbalanceBtn = null;
        }
        if (dealFinishImbalanceClose) {
            dealFinishImbalanceClose.addEventListener('click', function () {
                clearFinishImbalancePending();
                closeFinishImbalanceModal();
            });
        }
        if (dealFinishImbalanceCancel) {
            dealFinishImbalanceCancel.addEventListener('click', function () {
                clearFinishImbalancePending();
                closeFinishImbalanceModal();
            });
        }
        if (dealFinishImbalanceContinue) {
            dealFinishImbalanceContinue.addEventListener('click', function () {
                var b = _pendingFinishImbalanceBtn;
                clearFinishImbalancePending();
                closeFinishImbalanceModal();
                if (b) performGoToFinishWithButton(b);
            });
        }
        if (dealFinishImbalanceOverlay) {
            dealFinishImbalanceOverlay.addEventListener('click', function (e) {
                if (e.target === dealFinishImbalanceOverlay) {
                    clearFinishImbalancePending();
                    closeFinishImbalanceModal();
                }
            });
        }

        var dealFinish409Close = document.getElementById('dealFinish409Close');
        var dealFinish409Ok = document.getElementById('dealFinish409Ok');
        var dealFinish409Overlay = document.getElementById('dealFinish409Overlay');
        if (dealFinish409Close) dealFinish409Close.addEventListener('click', closeFinish409Modal);
        if (dealFinish409Ok) dealFinish409Ok.addEventListener('click', closeFinish409Modal);
        if (dealFinish409Overlay) {
            dealFinish409Overlay.addEventListener('click', function (e) {
                if (e.target === dealFinish409Overlay) closeFinish409Modal();
            });
        }

        var dealFinishSuccessClose = document.getElementById('dealFinishSuccessClose');
        var dealFinishSuccessOk = document.getElementById('dealFinishSuccessOk');
        var dealFinishSuccessOverlay = document.getElementById('dealFinishSuccessOverlay');
        if (dealFinishSuccessClose) dealFinishSuccessClose.addEventListener('click', closeFinishSuccessModal);
        if (dealFinishSuccessOk) dealFinishSuccessOk.addEventListener('click', closeFinishSuccessModal);
        if (dealFinishSuccessOverlay) {
            dealFinishSuccessOverlay.addEventListener('click', function (e) {
                if (e.target === dealFinishSuccessOverlay) closeFinishSuccessModal();
            });
        }

        var dealRejectConfirmClose = document.getElementById('dealRejectConfirmClose');
        var dealRejectCancelBtn = document.getElementById('dealRejectCancelBtn');
        var dealRejectConfirmOverlay = document.getElementById('dealRejectConfirmOverlay');
        if (dealRejectConfirmClose) dealRejectConfirmClose.addEventListener('click', closeRejectConfirmModal);
        if (dealRejectCancelBtn) dealRejectCancelBtn.addEventListener('click', closeRejectConfirmModal);
        if (dealRejectConfirmOverlay) {
            dealRejectConfirmOverlay.addEventListener('click', function (e) {
                if (e.target === dealRejectConfirmOverlay) closeRejectConfirmModal();
            });
        }

        var dealRejectBtn = document.getElementById('dealRejectBtn');
        if (dealRejectBtn) {
            dealRejectBtn.addEventListener('click', function () {
                var btn = this;
                var id = getDealId();
                if (!id) return;
                var originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Отклоняю...</span>';
                rejectDealByAgrogator(id).then(function (ok) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                    if (ok) {
                        closeRejectConfirmModal();
                        openRejectSuccessModal();
                    }
                });
            });
        }

        var dealRejectSuccessClose = document.getElementById('dealRejectSuccessClose');
        var dealRejectSuccessOverlay = document.getElementById('dealRejectSuccessOverlay');
        var dealRejectGoListBtn = document.getElementById('dealRejectGoListBtn');
        var dealRejectStayBtn = document.getElementById('dealRejectStayBtn');
        if (dealRejectSuccessClose) dealRejectSuccessClose.addEventListener('click', closeRejectSuccessModal);
        if (dealRejectSuccessOverlay) {
            dealRejectSuccessOverlay.addEventListener('click', function (e) {
                if (e.target === dealRejectSuccessOverlay) closeRejectSuccessModal();
            });
        }
        if (dealRejectGoListBtn) {
            dealRejectGoListBtn.addEventListener('click', function () {
                window.location.href = '/order/my-deals/';
            });
        }
        if (dealRejectStayBtn) {
            dealRejectStayBtn.addEventListener('click', function () {
                closeRejectSuccessModal();
                window.location.reload();
            });
        }

        // Документооборот (модалка)
        bindDocflowOverlayEvents();
        var dealPaymentsClose = document.getElementById('dealPaymentsClose');
        var dealPaymentsOverlay = document.getElementById('dealPaymentsOverlay');
        if (dealPaymentsClose) dealPaymentsClose.addEventListener('click', closePaymentsModal);
        if (dealPaymentsOverlay) {
            dealPaymentsOverlay.addEventListener('click', function (e) {
                if (e.target === dealPaymentsOverlay) closePaymentsModal();
            });
        }

        var dealPaymentsSuccessClose = document.getElementById('dealPaymentsSuccessClose');
        var dealPaymentsSuccessOk = document.getElementById('dealPaymentsSuccessOk');
        var dealPaymentsSuccessOverlay = document.getElementById('dealPaymentsSuccessOverlay');
        if (dealPaymentsSuccessClose) dealPaymentsSuccessClose.addEventListener('click', closePaymentsSuccessModal);
        if (dealPaymentsSuccessOk) dealPaymentsSuccessOk.addEventListener('click', closePaymentsSuccessModal);
        if (dealPaymentsSuccessOverlay) {
            dealPaymentsSuccessOverlay.addEventListener('click', function (e) {
                if (e.target === dealPaymentsSuccessOverlay) closePaymentsSuccessModal();
            });
        }

        (async function load() {
            showSection('dealDetailLoading', true);
            showSection('dealDetailError', false);
            showSection('dealInfoSection', false);
            showSection('dealRolesSection', false);

            var data = await fetchDeal(dealId);
            showSection('dealDetailLoading', false);

            if (!data) {
                showSection('dealDetailError', true);
                setText('dealDetailErrorMessage', 'Не удалось загрузить сделку. Проверьте авторизацию и ID.');
                return;
            }

            showSection('dealDetailError', false);
            showSection('dealInfoSection', true);
            showSection('dealRolesSection', true);
            renderDeal(data);
            // Сразу проверяем наличие лота по сделке и обновляем плашку перевозчика
            await preloadCarrierLotForDeal(dealId);

            var farmerBtn = document.getElementById('dealRoleFarmer');
            var exporterBtn = document.getElementById('dealRoleExporter');
            var farmerHtmlBackup = farmerBtn ? farmerBtn.innerHTML : '';
            var exporterHtmlBackup = exporterBtn ? exporterBtn.innerHTML : '';
            var loadingInner = '<span class="participant-card-loading-wrap"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span class="participant-card-loading-text">Загружаю информацию</span></span>';
            if (farmerBtn) {
                farmerBtn.innerHTML = loadingInner;
                farmerBtn.classList.add('participant-card-loading');
                farmerBtn.disabled = true;
                farmerBtn.setAttribute('aria-busy', 'true');
            }
            if (exporterBtn) {
                exporterBtn.innerHTML = loadingInner;
                exporterBtn.classList.add('participant-card-loading');
                exporterBtn.disabled = true;
                exporterBtn.setAttribute('aria-busy', 'true');
            }

            try {
                await Promise.all([
                    fetchUserById(data.farmerUserId).then(function (u) { window._farmerUserData = u; return u; }),
                    fetchUserById(data.exporterUserId).then(function (u) { window._exporterUserData = u; return u; }),
                    fetchCropsAllRelations()
                ]);
            } catch (e) {
                console.error('load participant data', e);
            } finally {
                if (farmerBtn) {
                    farmerBtn.innerHTML = farmerHtmlBackup;
                    farmerBtn.classList.remove('participant-card-loading');
                    farmerBtn.disabled = false;
                    farmerBtn.removeAttribute('aria-busy');
                }
                if (exporterBtn) {
                    exporterBtn.innerHTML = exporterHtmlBackup;
                    exporterBtn.classList.remove('participant-card-loading');
                    exporterBtn.disabled = false;
                    exporterBtn.removeAttribute('aria-busy');
                }
            }
            setParticipantCard('Farmer', parseUserForCard(window._farmerUserData), window._farmerUserData);
            setParticipantCard('Exporter', parseUserForCard(window._exporterUserData), window._exporterUserData);
        })();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
