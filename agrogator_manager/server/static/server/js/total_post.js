// API конфигурация
const API_CONFIG = {
    BASE_URL: 'http://85.239.38.190:3000/api',
    LOGIN_URL: '/auth/login',
    USER_ME_URL: '/users/me',
    TIMEOUT: 10000,
    ALLOWED_ROLES: ['manager', 'senior manager'] // В lowercase, как приходит от API
};

console.log('=== TOTAL_POST.JS LOADED ===');
console.log('API_CONFIG.ALLOWED_ROLES:', API_CONFIG.ALLOWED_ROLES);
console.log('=============================');

// Функция для проверки JWT токенов
async function getAuthTokens() {
    // Cache ключи (должны совпадать с теми что в auth.js)
    const CACHE_KEYS = {
        ACCESS_TOKEN: 'accessToken',
        REFRESH_TOKEN: 'refreshToken',
        USER_ROLE: 'role',
        USER_INFO: 'user_info',
        LAST_TOKEN_CHECK: 'lastTokenCheck' // Время последней проверки токена
    };
    
    // Получаем токены из localStorage
    const accessToken = localStorage.getItem(CACHE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(CACHE_KEYS.REFRESH_TOKEN);
    const userRole = localStorage.getItem(CACHE_KEYS.USER_ROLE);
    const lastTokenCheck = localStorage.getItem(CACHE_KEYS.LAST_TOKEN_CHECK);
    
    // Проверяем наличие токенов
    if (!accessToken || !refreshToken || !userRole) {
        return {
            status: 403,
            message: 'Токены авторизации отсутствуют',
            data: null,
            action: 'redirect_to_auth'
        };
    }
    
    // Проверяем роль пользователя
    if (!API_CONFIG.ALLOWED_ROLES.includes(userRole)) {
        return {
            status: 403,
            message: `Доступ запрещен. Ваша роль: ${userRole}`,
            data: null,
            action: 'redirect_to_auth'
        };
    }
    
    // Проверяем время последней проверки (6 часов = 6 * 60 * 60 * 1000 мс)
    const sixHours = 6 * 60 * 60 * 1000;
    const now = Date.now();
    const lastCheckTime = lastTokenCheck ? parseInt(lastTokenCheck) : 0;
    
    // Если с последней проверки прошло меньше 6 часов, возвращаем токен
    if (now - lastCheckTime < sixHours) {
        return {
            status: 200,
            message: 'Авторизация успешна (токен валиден)',
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                userRole: userRole,
                bearerToken: `Bearer ${accessToken}`
            }
        };
    }
    
    // Делаем тестовый запрос для проверки токена
    try {
        const testResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.USER_ME_URL}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
        });
        
        if (testResponse.status === 200 || testResponse.status === 201) {
            // Токен валиден, обновляем время проверки
            localStorage.setItem(CACHE_KEYS.LAST_TOKEN_CHECK, now.toString());
            
            return {
                status: 200,
                message: 'Авторизация успешна (токен проверен)',
                data: {
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    userRole: userRole,
                    bearerToken: `Bearer ${accessToken}`
                }
            };
        }
        
        // Токен невалиден, пробуем обновить через refresh
        const refreshResult = await refreshAccessToken(refreshToken);
        
        if (refreshResult.status === 201) {
            // Обновление успешно
            localStorage.setItem(CACHE_KEYS.ACCESS_TOKEN, refreshResult.data.accessToken);
            localStorage.setItem(CACHE_KEYS.REFRESH_TOKEN, refreshResult.data.refreshToken);
            localStorage.setItem(CACHE_KEYS.LAST_TOKEN_CHECK, now.toString());
            
            return {
                status: 200,
                message: 'Авторизация успешна (токен обновлен)',
                data: {
                    accessToken: refreshResult.data.accessToken,
                    refreshToken: refreshResult.data.refreshToken,
                    userRole: userRole,
                    bearerToken: `Bearer ${refreshResult.data.accessToken}`
                }
            };
        } else {
            // Не удалось обновить токен
            return {
                status: 409,
                message: 'Токен истек и не удалось обновить',
                data: null,
                action: 'redirect_to_auth'
            };
        }
        
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        return {
            status: 409,
            message: 'Ошибка при проверке токена',
            data: null,
            action: 'redirect_to_auth'
        };
    }
}

// Функция для обновления access токена
async function refreshAccessToken(refreshToken) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh-tokens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken: refreshToken
            }),
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
        });
        
        if (response.status === 201) {
            const tokens = await response.json();
            
            return {
                status: 201,
                message: 'Токен успешно обновлен',
                data: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken
                }
            };
        } else {
            return {
                status: 409,
                message: 'Не удалось обновить токен',
                data: null
            };
        }
        
    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        return {
            status: 409,
            message: 'Ошибка при обновлении токена',
            data: null
        };
    }
}

// Функция для выхода из системы
function logout() {
    const CACHE_KEYS = {
        ACCESS_TOKEN: 'accessToken',
        REFRESH_TOKEN: 'refreshToken',
        USER_ROLE: 'role',
        USER_INFO: 'user_info',
        LAST_TOKEN_CHECK: 'lastTokenCheck'
    };
    
    // Очищаем все токены
    Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

// Экспортируем функции для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAuthTokens,
        refreshAccessToken,
        logout
    };
}