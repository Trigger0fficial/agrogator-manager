from django import forms

class LoginForm(forms.Form):
    """
    Форма для авторизации пользователя
    """
    phone = forms.CharField(
        label='Телефон',
        max_length=18,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': '+7 (___)-___-__-__',
            'id': 'phone',
            'required': True,
        })
    )
    
    password = forms.CharField(
        label='Пароль',
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'Пароль',
            'id': 'password',
            'required': True,
        })
    )

    def clean_phone(self):
        print("=== clean_phone called ===")
        phone = self.cleaned_data.get('phone')
        print(f"Raw phone: {phone}")
        
        if not phone:
            print("Phone is empty")
            raise forms.ValidationError('Пожалуйста, введите номер телефона')
        
        # Удаляем все символы кроме цифр
        digits_only = ''.join(c for c in phone if c.isdigit())
        print(f"Digits only: {digits_only}")
        
        # Проверяем длину номера
        if len(digits_only) == 11:
            # Если ввели 89284102358 или 79284102358
            if digits_only.startswith('8'):
                digits_only = '7' + digits_only[1:]
            clean_phone = '+' + digits_only
        elif len(digits_only) == 10:
            # Если ввели 9284102358 (без кода страны)
            clean_phone = '+7' + digits_only
        else:
            print(f"Invalid phone length: {len(digits_only)}")
            raise forms.ValidationError('Номер телефона должен содержать 10 или 11 цифр')
        
        # Финальная проверка
        if not clean_phone.startswith('+7') or len(clean_phone) != 12:
            print(f"Invalid phone format: {clean_phone}")
            raise forms.ValidationError('Неверный формат номера телефона')
        
        print(f"Clean phone: {clean_phone}")
        return clean_phone

    def clean_password(self):
        print("=== clean_password called ===")
        password = self.cleaned_data.get('password')
        print(f"Raw password: {'*' * len(password) if password else 'None'}")
        
        if password:
            password = password.strip()
        return password
    
    def is_valid(self):
        print("=== LoginForm.is_valid called ===")
        valid = super().is_valid()
        print(f"Form is valid: {valid}")
        if not valid:
            print(f"Form errors: {self.errors}")
        return valid