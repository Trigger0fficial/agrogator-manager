// Cache ключи (должны совпадать с теми что в total_post.js)
const CACHE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_ROLE: 'role',
    USER_INFO: 'user_info'
};

// DOM элементы с уникальными именами
let authLoginForm, authPhoneInput, authPasswordInput, authLoginBtn, authBtnContent, authBtnLoader;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Auth.js initialized');
    
    // Проверяем наличие валидного токена перед показом формы
    try {
        const authResult = await getAuthTokens();
        
        if (authResult.status === 200) {
            console.log('User already authenticated, redirecting to main');
            window.location.href = '/main/';
            return; // Прерываем выполнение, не показываем форму
        }
        
        console.log('Token check result:', authResult.message);
        // Если токенов нет или они невалидны, просто показываем форму входа
        console.log('Showing login form - no valid tokens found');
        
    } catch (error) {
        console.error('Error checking authentication:', error);
        // При ошибке тоже показываем форму входа
        console.log('Showing login form due to error');
    }
    
    // Получаем DOM элементы с уникальными именами
    authLoginForm = document.getElementById('loginForm');
    authPhoneInput = document.getElementById('phone');
    authPasswordInput = document.getElementById('password');
    authLoginBtn = document.getElementById('loginBtn');
    authBtnContent = authLoginBtn?.querySelector('.btn-content');
    authBtnLoader = authLoginBtn?.querySelector('.btn-loader');
    
    // Добавляем обработчик отправки формы
    if (authLoginForm) {
        authLoginForm.addEventListener('submit', handleLogin);
    }
});

// Обработка отправки формы
async function handleLogin(e) {
    e.preventDefault();
    
    console.log('Login form submitted');
    
    // Валидация полей
    const phone = validatePhone(authPhoneInput.value);
    const password = authPasswordInput.value.trim();
    
    if (!phone) {
        showError('Пожалуйста, введите корректный номер телефона');
        return;
    }
    
    if (!password) {
        showError('Пожалуйста, введите пароль');
        return;
    }
    
    // Показываем загрузку
    showLoading(true);
    
    try {
        // Шаг 1: Авторизация через API
        console.log('Sending login request...');
        const authResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.LOGIN_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: phone,
                password: password
            }),
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
        });
        
        console.log('Auth response status:', authResponse.status);
        
        if (authResponse.status === 401 || authResponse.status === 404) {
            throw new Error('Неверный номер телефона или пароль');
        }
        
        if (!authResponse.ok) {
            throw new Error('Ошибка авторизации. Попробуйте позже.');
        }
        
        const authData = await authResponse.json();
        console.log('Auth successful:', authData);
        
        // Сохраняем токены в кеше (используем localStorage как временное решение)
        localStorage.setItem(CACHE_KEYS.ACCESS_TOKEN, authData.accessToken);
        localStorage.setItem(CACHE_KEYS.REFRESH_TOKEN, authData.refreshToken);
        
        // Шаг 2: Получение данных пользователя
        console.log('Getting user data...');
        const userResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.USER_ME_URL}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
        });
        
        if (!userResponse.ok) {
            throw new Error('Ошибка получения данных пользователя');
        }
        
        const userData = await userResponse.json();
        console.log('User data received:', userData);
        
        // Проверяем роль пользователя - роль находится в profileRoles.name
        const userRole = userData.profileRoles?.name?.toLowerCase();
        console.log('=== DEBUG ROLE CHECK ===');
        console.log('User role from API:', userData.profileRoles?.name);
        console.log('User role (lowercase):', userRole);
        console.log('API_CONFIG object:', API_CONFIG);
        console.log('ALLOWED_ROLES array:', API_CONFIG.ALLOWED_ROLES);
        console.log('ALLOWED_ROLES type:', typeof API_CONFIG.ALLOWED_ROLES);
        console.log('ALLOWED_ROLES length:', API_CONFIG.ALLOWED_ROLES?.length);
        console.log('Role check result:', API_CONFIG.ALLOWED_ROLES.includes(userRole));
        console.log('========================');
        
        if (!userRole || !API_CONFIG.ALLOWED_ROLES.includes(userRole)) {
            const errorMsg = `Доступ запрещен. Ваша роль: ${userRole || 'не определена'}. Требуются роли: ${API_CONFIG.ALLOWED_ROLES.join(', ')}`;
            console.error('Access denied:', errorMsg);
            throw new Error(errorMsg);
        }
        
        // Сохраняем данные пользователя
        localStorage.setItem(CACHE_KEYS.USER_ROLE, userRole);
        localStorage.setItem(CACHE_KEYS.USER_INFO, JSON.stringify(userData));
        
        // Показываем успех и перенаправляем
        showLoadingSuccess('Входим в личный кабинет...');
        
        setTimeout(() => {
            window.location.href = '/main/';
        }, 2000);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Очищаем кеш при ошибке
        clearCache();
        
        // Показываем ошибку
        if (error.name === 'AbortError') {
            showError('Превышено время ожидания. Проверьте подключение к интернету.');
        } else {
            showError(error.message || 'Произошла ошибка при авторизации');
        }
    } finally {
        showLoading(false);
    }
}

// Валидация телефона
function validatePhone(phone) {
    if (!phone) return null;
    
    // Удаляем все символы кроме цифр
    const digitsOnly = phone.replace(/\D/g, '');
    
    let cleanPhone;
    
    if (digitsOnly.length === 11) {
        // Если ввели 89284102358 или 79284102358
        if (digitsOnly.startsWith('8')) {
            cleanPhone = '7' + digitsOnly.substring(1);
        } else {
            cleanPhone = digitsOnly;
        }
        cleanPhone = '+' + cleanPhone;
    } else if (digitsOnly.length === 10) {
        // Если ввели 9284102358 (без кода страны)
        cleanPhone = '+7' + digitsOnly;
    } else {
        return null;
    }
    
    // Финальная проверка
    if (cleanPhone.startsWith('+7') && cleanPhone.length === 12) {
        return cleanPhone;
    }
    
    return null;
}

// Показать/скрыть загрузку
function showLoading(show) {
    if (!authBtnContent || !authBtnLoader) return;
    
    if (show) {
        authBtnContent.style.display = 'none';
        authBtnLoader.style.display = 'block';
        authLoginBtn.disabled = true;
    } else {
        authBtnContent.style.display = 'flex';
        authBtnLoader.style.display = 'none';
        authLoginBtn.disabled = false;
    }
}

// Показать ошибку
function showError(message) {
    // Удаляем старые сообщения
    removeMessages();
    
    const alertHtml = `
        <div class="alert alert-error alert-error-design">
            <div class="alert-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">Ошибка</div>
                <div class="alert-message">${message}</div>
            </div>
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    insertMessage(alertHtml);
}

// Показать успех
function showSuccess(message) {
    // Удаляем старые сообщения
    removeMessages();
    
    const alertHtml = `
        <div class="alert alert-success">
            <div class="alert-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">Успешно</div>
                <div class="alert-message">${message}</div>
            </div>
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    insertMessage(alertHtml);
}

// Показать загрузку успеха (центральная иконка)
function showLoadingSuccess(message) {
    // Удаляем старые сообщения
    removeMessages();
    
    // Создаем overlay для размытия фона
    const blurOverlay = document.createElement('div');
    blurOverlay.className = 'blur-overlay';
    blurOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(8px);
        z-index: 9998;
        pointer-events: none;
    `;
    document.body.appendChild(blurOverlay);
    
    // Создаем загрузку и добавляем напрямую в body
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = `
        <div class="loading-success-overlay">
            <div class="loading-success-content">
                <div class="loading-success-spinner">
                    <div class="agricultural-icon">
                        <i class="fas fa-tractor"></i>
                    </div>
                    <div class="wheat-decoration">
                        <i class="fas fa-seedling"></i>
                        <i class="fas fa-wheat"></i>
                        <i class="fas fa-seedling"></i>
                    </div>
                </div>
                <div class="loading-success-text">${message}</div>
                <div class="loading-success-subtitle">Проверяем ваш аккаунт</div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingDiv.firstElementChild);
}

// Вставить сообщение в DOM
function insertMessage(html) {
    const messagesContainer = document.querySelector('.messages-container') || createMessagesContainer();
    messagesContainer.insertAdjacentHTML('beforeend', html);
}

// Создать контейнер для сообщений
function createMessagesContainer() {
    const container = document.createElement('div');
    container.className = 'messages-container';
    authLoginForm.parentNode.insertBefore(container, authLoginForm);
    return container;
}

// Удалить все сообщения
function removeMessages() {
    const messages = document.querySelectorAll('.alert');
    messages.forEach(msg => msg.remove());
    
    // Также удаляем загрузку если есть
    const loadingOverlay = document.querySelector('.loading-success-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
    
    // Удаляем blur overlay
    const blurOverlay = document.querySelector('.blur-overlay');
    if (blurOverlay) {
        blurOverlay.remove();
    }
}

// Очистить кеш
function clearCache() {
    Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Удаляем blur overlay
    const blurOverlay = document.querySelector('.blur-overlay');
    if (blurOverlay) {
        blurOverlay.remove();
    }
    
    // Удаляем загрузку
    const loadingOverlay = document.querySelector('.loading-success-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}
