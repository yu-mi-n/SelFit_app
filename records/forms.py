from django import forms
from .models import DailyRecord, ConditionTag, Meal, Post

class ConditionModelMultipleChoiceField(forms.ModelMultipleChoiceField):
    def label_from_instance(self, obj):
        return f"{obj.icon} {obj.name}" if obj.icon else obj.name

class DailyRecordForm(forms.ModelForm):
    conditions = ConditionModelMultipleChoiceField(
        queryset=ConditionTag.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label="今日のコンディション"
    )

    class Meta:
        model = DailyRecord
        # ユーザーに入力させる項目を指定
        fields = ['date', 'weight', 'body_fat', 'photo', 'conditions', 'note']
        
        # 見た目を良くするための設定（ウィジェット）
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'weight': forms.TextInput(attrs={
                'class': 'form-control', 
                'inputmode': 'decimal' 
            }),
            'body_fat': forms.TextInput(attrs={
                'class': 'form-control', 
                'inputmode': 'decimal'
            }),
            'photo': forms.FileInput(attrs={'class': 'form-control'}),
            'note': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            # タグはチェックボックスで選択できるようにする
            'conditions': forms.CheckboxSelectMultiple(),
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)  # userを取り出す（無ければNone）
        super().__init__(*args, **kwargs)
        
        # 前回の修正（必須化）
        self.fields['weight'].required = True
        self.fields['body_fat'].required = True
        self.fields['weight'].widget.attrs['required'] = 'required'
        self.fields['body_fat'].widget.attrs['required'] = 'required'

    # 重複チェック
    def clean_date(self):
        date = self.cleaned_data.get('date')
        
        # ユーザー情報があり、かつ日付が入力されている場合
        if self.user and date:
            # 「このユーザー」かつ「この日付」のデータが存在するか確認
            # .exclude(pk=self.instance.pk) は「自分自身（編集時）」を除外するための安全策です
            if DailyRecord.objects.filter(user=self.user, date=date).exclude(pk=self.instance.pk).exists():
                raise forms.ValidationError("この日付の記録は既に存在します。一覧から編集してください。")
        return date

class MealForm(forms.ModelForm):
    class Meta:
        model = Meal
        fields = ['meal_type', 'image', 'memo']
        widgets = {
            'meal_type': forms.RadioSelect(attrs={'class': 'form-check-input'}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
            'memo': forms.Textarea(attrs={
                'class': 'form-control', 
                'rows': 3,
                'placeholder': '例：鶏胸肉のサラダ、玄米ご飯（150g）\n少し食べすぎたかも...'
            }),
        }

class PostForm(forms.ModelForm): # 投稿
    class Meta:
        model = Post
        fields = ['content', 'image']
        widgets = {
            'content': forms.Textarea(attrs={
                'class': 'form-control', 
                'rows': 4, 
                'placeholder': 'ミッションコンプリート！今の気持ちをシェアしよう🎉'
            }),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
        }