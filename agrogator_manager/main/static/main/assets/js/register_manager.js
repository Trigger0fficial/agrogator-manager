document.addEventListener('DOMContentLoaded', function() {
    // Инициализация компонентов
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const successModal = document.getElementById('successModal');
    const closeSuccessModal = document.getElementById('closeSuccessModal');
    const goToDashboardBtn = document.getElementById('goToDashboard');

    // Поля формы
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const roleSelect = document.getElementById('role');

    // Элементы для отображения данных в модалке
    const sentEmailElement = document.getElementById('sentEmail');
    const newManagerNameElement = document.getElementById('newManagerName');
    const newManagerRoleElement = document.getElementById('newManagerRole');

    // Валидация формы
    function validateForm() {
        let isValid = true;
        const errors = {};

        // Валидация ФИО
        if (!fullNameInput.value.trim()) {
            errors.fullName = 'Поле ФИО обязательно для заполнения';
            isValid = false;
        } else if (fullNameInput.value.trim().length < 3) {
            errors.fullName = 'ФИО должно содержать минимум 3 символа';
            isValid = false;
        }

        // Валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput.value.trim()) {
            errors.email = 'Поле Email обязательно для заполнения';
            isValid = false;
        } else if (!emailRegex.test(emailInput.value.trim())) {
            errors.email = 'Введите корректный email адрес';
            isValid = false;
        }

        // Валидация роли
        if (!roleSelect.value) {
            errors.role = 'Выберите роль пользователя';
            isValid = false;
        }

        // Отображение ошибок
        displayErrors(errors);
        return isValid;
    }

    // Отображение ошибок
    function displayErrors(errors) {
        // Очистка предыдущих ошибок
        document.querySelectorAll('.error-message').forEach(elem => {
            elem.classList.remove('show');
            elem.textContent = '';
        });
        document.querySelectorAll('.form-input, .form-select').forEach(elem => {
            elem.classList.remove('error');
        });

        // Отображение новых ошибок
        Object.keys(errors).forEach(fieldName => {
            const errorElement = document.getElementById(fieldName + 'Error');
            const inputElement = document.getElementById(fieldName);
            
            if (errorElement) {
                errorElement.textContent = errors[fieldName];
                errorElement.classList.add('show');
            }
            
            if (inputElement) {
                inputElement.classList.add('error');
            }
        });
    }

    // Очистка ошибок
    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(elem => {
            elem.classList.remove('show');
            elem.textContent = '';
        });
        document.querySelectorAll('.form-input, .form-select').forEach(elem => {
            elem.classList.remove('error');
        });
    }

    // Показать модальное окно
    function showSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    // Скрыть модальное окно
    function hideSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Сброс формы
    function resetForm() {
        registerForm.reset();
        clearErrors();
    }

    // Симуляция отправки данных на сервер
    async function submitForm(formData) {
        // Имитация задержки сети
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Имитация успешного ответа от сервера
        return {
            success: true,
            message: 'Пользователь успешно зарегистрирован',
            data: {
                id: Date.now(),
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                role: formData.get('role'),
                createdAt: new Date().toISOString()
            }
        };
    }

    // Обработчик отправки формы
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Валидация
        if (!validateForm()) {
            return;
        }

        // Показать состояние загрузки
        registerBtn.classList.add('loading');
        registerBtn.disabled = true;

        try {
            // Создание FormData для отправки
            const formData = new FormData();
            formData.append('fullName', fullNameInput.value.trim());
            formData.append('email', emailInput.value.trim());
            formData.append('role', roleSelect.value);

            // Отправка данных
            const response = await submitForm(formData);

            if (response.success) {
                // Скрыть состояние загрузки
                registerBtn.classList.remove('loading');
                registerBtn.disabled = false;

                // Показать модальное окно успеха
                showSuccessModal();
                
                // Сброс формы
                resetForm();
            } else {
                throw new Error(response.message || 'Ошибка при регистрации');
            }
        } catch (error) {
            // Скрыть состояние загрузки
            registerBtn.classList.remove('loading');
            registerBtn.disabled = false;

            // Показать ошибку
            console.error('Ошибка регистрации:', error);
            
            // Можно добавить отображение ошибки пользователю
            const errorElement = document.getElementById('emailError');
            if (errorElement) {
                errorElement.textContent = 'Ошибка при регистрации. Попробуйте еще раз.';
                errorElement.classList.add('show');
            }
        }
    });

    // Обработчики для модального окна
    closeSuccessModal.addEventListener('click', hideSuccessModal);
    
    // Добавляем обработчик для кнопки ОК
    const confirmSuccessBtn = document.getElementById('confirmSuccess');
    if (confirmSuccessBtn) {
        confirmSuccessBtn.addEventListener('click', function() {
            hideSuccessModal();
            window.location.href = 'index.html';
        });
    }

    // Закрытие модалки по клику вне ее области
    successModal.addEventListener('click', function(e) {
        if (e.target === successModal) {
            hideSuccessModal();
        }
    });

    // Закрытие модалки по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && successModal.classList.contains('show')) {
            hideSuccessModal();
        }
    });

    // Очистка ошибок при вводе данных
    fullNameInput.addEventListener('input', function() {
        if (this.value.trim()) {
            const errorElement = document.getElementById('fullNameError');
            if (errorElement) {
                errorElement.classList.remove('show');
                errorElement.textContent = '';
            }
            this.classList.remove('error');
        }
    });

    emailInput.addEventListener('input', function() {
        if (this.value.trim()) {
            const errorElement = document.getElementById('emailError');
            if (errorElement) {
                errorElement.classList.remove('show');
                errorElement.textContent = '';
            }
            this.classList.remove('error');
        }
    });

    roleSelect.addEventListener('change', function() {
        if (this.value) {
            const errorElement = document.getElementById('roleError');
            if (errorElement) {
                errorElement.classList.remove('show');
                errorElement.textContent = '';
            }
            this.classList.remove('error');
        }
    });

    // Инициализация пользовательского dropdown (если нужно)
    function initCustomSelect() {
        const selectContainers = document.querySelectorAll('.select-container');
        
        selectContainers.forEach(container => {
            const select = container.querySelector('.form-select');
            const arrow = container.querySelector('.select-arrow');
            
            if (select && arrow) {
                select.addEventListener('focus', () => {
                    arrow.style.transform = 'translateY(-50%) rotate(180deg)';
                });
                
                select.addEventListener('blur', () => {
                    arrow.style.transform = 'translateY(-50%) rotate(0deg)';
                });
            }
        });
    }

    // Инициализация
    initCustomSelect();
});
