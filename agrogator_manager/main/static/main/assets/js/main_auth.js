// Функция для проверки авторизации на главной странице
async function checkMainPageAuth() {
    console.log('Checking main page authorization...');
    
    try {
        // Проверяем токены
        const authResult = await getAuthTokens();
        
        if (authResult.status !== 200) {
            console.log('Not authenticated, redirecting to login');
            window.location.href = '/';
            return;
        }
        
        console.log('User authenticated, role:', authResult.data.userRole);
        
        // Управление административной плашкой в зависимости от роли
        const adminPanel = document.querySelector('.admin-panel');
        const adminActions = document.querySelector('.admin-actions');
        const adminToggle = document.querySelector('.admin-toggle');
        
        if (authResult.data.userRole === 'manager') {
            // Скрываем административные элементы для manager
            if (adminPanel) adminPanel.style.display = 'none';
            if (adminActions) adminActions.style.display = 'none';
            if (adminToggle) adminToggle.style.display = 'none';
            console.log('Admin panel hidden for manager');
        } else if (authResult.data.userRole === 'senior_manager') {
            // Показываем административные элементы для senior_manager
            if (adminPanel) adminPanel.style.display = 'block';
            if (adminActions) adminActions.style.display = 'block';
            if (adminToggle) adminToggle.style.display = 'flex';
            console.log('Admin panel shown for senior_manager');
        }
        
        // Обновляем информацию о пользователе в интерфейсе
        updateUserInfo(authResult.data);
        
    } catch (error) {
        console.error('Error checking main page auth:', error);
        window.location.href = '/';
    }
}

// Функция для обновления информации о пользователе
function updateUserInfo(userData) {
    const userNameElements = document.querySelectorAll('.user-name');
    const userRoleElements = document.querySelectorAll('.user-role');
    
    if (userData.userInfo) {
        const userName = userData.userInfo.email || userData.userInfo.phone || 'Пользователь';
        
        userNameElements.forEach(element => {
            element.textContent = userName;
        });
        
        userRoleElements.forEach(element => {
            const roleText = userData.userRole === 'manager' ? 'Менеджер' : 'Старший менеджер';
            element.textContent = roleText;
        });
    }
}

// Функция для показа модалки подтверждения выхода
function showLogoutModal() {
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal) {
        logoutModal.style.display = 'flex';
        console.log('Logout modal shown');
        
        // Добавляем анимированную иконку двери с небольшой задержкой
        setTimeout(() => {
            addAnimatedDoorIcon();
        }, 100);
    }
}

// Функция для скрытия модалки подтверждения выхода
function hideLogoutModal() {
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal) {
        logoutModal.style.display = 'none';
        console.log('Logout modal hidden');
    }
}

// Функция для выхода из системы
async function performLogout() {
    console.log('Logging out...');
    
    try {
        // Вызываем функцию logout из total_post.js (проверяем, что она существует)
        if (typeof window.logout === 'function') {
            window.logout();
        } else {
            // Если функция недоступна, очищаем localStorage вручную
            const CACHE_KEYS = {
                ACCESS_TOKEN: 'accessToken',
                REFRESH_TOKEN: 'refreshToken',
                USER_ROLE: 'role',
                USER_INFO: 'user_info',
                LAST_TOKEN_CHECK: 'lastTokenCheck'
            };
            
            Object.values(CACHE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        }
        
        // Показываем сообщение о выходе
        showSuccessMessage('Вы успешно вышли из системы');
        
        // Скрываем модалку
        hideLogoutModal();
        
        // Небольшая задержка перед перенаправлением
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        console.error('Error during logout:', error);
        window.location.href = '/';
    }
}

// Функция для показа сообщений
function showSuccessMessage(message) {
    // Создаем элемент сообщения
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-success';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        border: 2px solid #10b981;
        border-radius: 12px;
        color: #065f46;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        animation: slideInRight 0.3s ease-out;
    `;
    
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-check-circle" style="color: #10b981;"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Автоматически удаляем через 3 секунды
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Добавляем CSS анимации и стили для новой модалки
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes scaleIn {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    /* Улучшенные стили для модалки выхода */
    .logout-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
        padding: 2rem;
    }
    
    .logout-modal-container {
        background: white;
        border-radius: 20px;
        padding: 3rem 2.5rem;
        width: 100%;
        max-width: 480px;
        position: relative;
        text-align: center;
        animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    
    .logout-modal-icon {
        margin: 0 auto 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .logout-modal-content {
        margin-bottom: 2.5rem;
    }
    
    .logout-modal-title {
        font-size: 1.75rem;
        font-weight: 700;
        color: #111827;
        margin: 0 0 1rem;
        line-height: 1.2;
        letter-spacing: -0.025em;
    }
    
    .logout-modal-description {
        font-size: 1rem;
        color: #6b7280;
        line-height: 1.6;
        margin: 0;
        max-width: 320px;
        margin: 0 auto;
    }
    
    .logout-modal-actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
    }
    
    .logout-modal-btn {
        flex: 1;
        padding: 0.875rem 1.5rem;
        border-radius: 12px;
        font-size: 0.95rem;
        font-weight: 600;
        border: 2px solid;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: none;
        outline: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        min-height: 48px;
        position: relative;
        overflow: hidden;
    }
    
    .logout-modal-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s;
    }
    
    .logout-modal-btn:hover::before {
        transform: translateX(100%);
    }
    
    .logout-modal-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    
    .logout-modal-btn:active {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.1);
    }
    
    .logout-modal-btn svg {
        width: 16px;
        height: 16px;
        transition: transform 0.2s ease;
    }
    
    .logout-modal-btn:hover svg {
        transform: scale(1.1);
    }
    
    /* Специальная анимация для иконки двери */
    .logout-modal-btn--primary svg path:nth-child(3),
    .logout-modal-btn--primary svg path:nth-child(4) {
        animation: doorArrow 2s ease-in-out infinite;
    }
    
    @keyframes doorArrow {
        0%, 100% {
            opacity: 1;
            transform: translateX(0);
        }
        50% {
            opacity: 0.6;
            transform: translateX(2px);
        }
    }
    
    .logout-modal-btn--secondary {
        color: #374151;
        border-color: #e5e7eb;
        background: white;
    }
    
    .logout-modal-btn--secondary:hover {
        color: #111827;
        border-color: #d1d5db;
        background: #f9fafb;
    }
    
    .logout-modal-btn--primary {
        color: white;
        border-color: #ef4444;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1);
    }
    
    .logout-modal-btn--primary:hover {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        border-color: #dc2626;
        box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.2);
    }
    
    .logout-modal-close {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        width: 2.5rem;
        height: 2.5rem;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        transition: all 0.2s ease;
    }
    
    .logout-modal-close:hover {
        background: #f3f4f6;
        color: #4b5563;
        transform: scale(1.05);
    }
    
    /* Улучшенная адаптивность */
    @media (max-width: 640px) {
        .logout-modal-overlay {
            padding: 1rem;
        }
        
        .logout-modal-container {
            padding: 2rem 1.5rem;
            max-width: 100%;
        }
        
        .logout-modal-title {
            font-size: 1.5rem;
        }
        
        .logout-modal-description {
            font-size: 0.95rem;
        }
        
        .logout-modal-actions {
            flex-direction: column;
            gap: 0.75rem;
        }
        
        .logout-modal-btn {
            width: 100%;
        }
        
        .logout-modal-icon::before {
            width: 64px;
            height: 64px;
        }
        
        .logout-modal-icon svg {
            width: 48px;
            height: 48px;
        }
    }
`;
document.head.appendChild(style);

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main auth.js initialized');
    
    // Проверяем авторизацию
    checkMainPageAuth();
    
    // Добавляем обработчик для кнопки выхода - открывает модалку
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showLogoutModal();
        });
    }
    
    // Добавляем обработчики для всех элементов с классом logout-link
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showLogoutModal();
        });
    });
    
    // Обработчик для кнопки подтверждения выхода
    const confirmLogoutBtn = document.getElementById('confirmLogout');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', performLogout);
    }
    
    // Обработчик для кнопки отмены выхода
    const cancelLogoutBtn = document.getElementById('cancelLogout');
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', hideLogoutModal);
    }
    
    // Обработчик для закрытия модалки по крестику
    const modalClose = document.querySelector('#logoutConfirmModal .modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', hideLogoutModal);
    }
    
    // Закрытие модалки по клику вне её области
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal) {
        logoutModal.addEventListener('click', function(e) {
            if (e.target === logoutModal) {
                hideLogoutModal();
            }
        });
    }
});

// Функция для добавления простой иконки двери в начало модалки
function addAnimatedDoorIcon() {
    const modalIcon = document.querySelector('.logout-modal-icon');
    if (!modalIcon) return;
    
    console.log('Adding simple door icon...');
    
    // Очищаем существующее содержимое
    modalIcon.innerHTML = '';
    
    // Создаем простую иконку двери
    const doorIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    doorIcon.setAttribute('width', '64');
    doorIcon.setAttribute('height', '64');
    doorIcon.setAttribute('viewBox', '0 0 24 24');
    doorIcon.setAttribute('fill', 'none');
    doorIcon.style.cssText = `
        color: #ef4444;
        opacity: 0.2;
        margin: 0 auto;
        display: block;
    `;
    
    doorIcon.innerHTML = `
        <!-- Дверная рамка -->
        <rect x="4" y="3" width="16" height="18" rx="1" 
              stroke="currentColor" stroke-width="2" fill="none"/>
        <!-- Левая дверца -->
        <path d="M8 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <!-- Правая дверца -->
        <path d="M16 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <!-- Ручка двери -->
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
        <!-- Стрелка выхода -->
        <path d="M12 20L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 18L12 20L14 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `;
    
    modalIcon.appendChild(doorIcon);
    console.log('Simple door icon added successfully');
}
