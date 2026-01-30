from django.contrib.auth.forms import UserCreationForm
from .models import CustomUser
from django import forms
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomUserCreationForm(UserCreationForm): # ユーザー登録
    """
    カスタムユーザーモデルに対応した登録フォーム
    """
    class Meta:
        model = CustomUser
        # 登録時に入力させる項目
        fields = ('username',  'height', 'target_weight') # 'email'
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['height'].required = True
        self.fields['target_weight'].required = True

class ProfileEditForm(forms.ModelForm): # プロフィール編集
    class Meta:
        model = User
        fields = ['username', 'profile_image', 'height', 'target_weight', 'introduction', 'is_anonymous_account', 'hide_profile_image']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'profile_image': forms.FileInput(attrs={'class': 'form-control'}),
            'height': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': '165.5'}),
            'target_weight': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': '55.0', 'step': '0.1'}),
            'introduction': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'is_anonymous_account': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'hide_profile_image': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
        labels = {
            'username': 'ユーザー名',
            'profile_image': 'プロフィール写真',
            'height': '身長 (cm)',
            'target_weight': '目標体重 (kg)',
            'introduction': '自己紹介',
        }