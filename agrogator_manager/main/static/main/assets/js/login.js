// Визуальные элементы для страницы входа
// Переменные для слайдера
let featureSlider, sliderNav, currentSlide = 0, totalSlides = 5;
let sliderInterval;

// Данные для блока управления в зависимости от слайда
const managementData = [
    {
        title: "Мониторинг и контроль",
        features: [
            "Отслеживание выполнения планов",
            "Контроль качества работ",
            "Оперативное реагирование",
            "Прозрачность процессов"
        ]
    },
    {
        title: "Управление сделками",
        features: [
            "Автоматизация договоров",
            "Контроль обязательств",
            "Управление расчетами",
            "Работа с контрагентами"
        ]
    },
    {
        title: "Аналитика и отчеты",
        features: [
            "Анализ эффективности",
            "Отчеты в реальном времени",
            "Прогнозирование показателей",
            "Визуализация данных"
        ]
    },
    {
        title: "Логистика и поставки",
        features: [
            "Оптимизация маршрутов",
            "Контроль транспорта",
            "Управление цепочками",
            "Снижение издержек"
        ]
    },
    {
        title: "Автоматизация",
        features: [
            "Интеграция процессов",
            "Сокращение рутины",
            "Повышение эффективности",
            "Единая система"
        ]
    }
];

// Функция инициализации слайдера (только на странице логина)
function initSlider() {
    featureSlider = document.getElementById('featureSlider');
    sliderNav = document.getElementById('sliderNav');

    // Проверяем, существует ли слайдер на текущей странице
    if (!featureSlider || !sliderNav) {
        return; // Слайдера нет на этой странице
    }

    // Создаем навигационные точки
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.className = `slider-dot ${i === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(i));
        sliderNav.appendChild(dot);
    }

    // Инициализируем блок управления для первого слайда
    updateManagementInfo(0);

    // Автопрокрутка слайдов
    sliderInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateSlider();
    }, 5000);
}

// Функция обновления блока управления
function updateManagementInfo(slideIndex) {
    const data = managementData[slideIndex];
    const titleElement = document.getElementById('managementTitle');
    const featuresContainer = document.getElementById('managementFeatures');

    // Проверяем существование элементов
    if (!titleElement || !featuresContainer) return;

    // Обновляем заголовок
    titleElement.textContent = data.title;

    // Очищаем и обновляем фичи
    featuresContainer.innerHTML = '';
    data.features.forEach(feature => {
        const featureElement = document.createElement('div');
        featureElement.className = 'management-feature';
        featureElement.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${feature}</span>
        `;
        featuresContainer.appendChild(featureElement);
    });
}

function goToSlide(slideIndex) {
    currentSlide = slideIndex;
    updateSlider();

    // Сбрасываем автопрокрутку
    clearInterval(sliderInterval);
    sliderInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateSlider();
    }, 5000);
}

function updateSlider() {
    if (!featureSlider) return;

    featureSlider.style.transform = `translateX(-${currentSlide * 100}%)`;

    // Обновляем активную точку
    const dots = document.querySelectorAll('.slider-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });

    // Обновляем блок управления
    updateManagementInfo(currentSlide);
}

// Управление видимостью пароля
const passwordToggle = document.getElementById('passwordToggle');
if (passwordToggle) {
    passwordToggle.addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const icon = this.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
            this.setAttribute('aria-label', 'Скрыть пароль');
        } else {
            passwordInput.type = 'password';
            icon.className = 'fas fa-eye';
            this.setAttribute('aria-label', 'Показать пароль');
        }
    });
}

// Маска для телефона
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        
        if (value.length > 0) {
            if (value[0] === '7') {
                formattedValue = '+7';
                value = value.substring(1);
            } else if (value[0] === '8') {
                formattedValue = '+7';
                value = value.substring(1);
            } else {
                formattedValue = '+7';
            }
            
            if (value.length > 0) {
                formattedValue += ' (' + value.substring(0, 3);
            }
            if (value.length >= 4) {
                formattedValue += ') ' + value.substring(3, 6);
            }
            if (value.length >= 7) {
                formattedValue += '-' + value.substring(6, 8);
            }
            if (value.length >= 9) {
                formattedValue += '-' + value.substring(8, 10);
            }
        }
        
        e.target.value = formattedValue;
    });
    
    phoneInput.addEventListener('focus', function(e) {
        if (e.target.value === '') {
            e.target.value = '+7 ';
        }
    });
    
    phoneInput.addEventListener('blur', function(e) {
        if (e.target.value === '+7 ') {
            e.target.value = '';
        }
    });
}

// Анимация при фокусе для полей ввода
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
});

// Добавляем интерактивность для карточек фич
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация слайдера
    initSlider();

    // Автофокус на поле телефона
    const phoneInput = document.getElementById('phone');
    if (phoneInput) phoneInput.focus();

    // Отладка: проверяем отправку формы
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            console.log('Form submitted!');
            console.log('Action:', this.action);
            console.log('Method:', this.method);
            console.log('FormData:', new FormData(this));
        });
    }

    // Добавляем класс для плавного появления
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// Очистка интервала слайдера при переходе на другую страницу
window.addEventListener('beforeunload', function() {
    if (sliderInterval) {
        clearInterval(sliderInterval);
    }
});