/* static/js/profile_edit.js */

document.addEventListener('DOMContentLoaded', function() {
    // アイコン画像（トリガー）と、隠されたファイル入力要素を取得
    const trigger = document.getElementById('profileImageTrigger');
    const fileInput = document.getElementById('id_profile_image'); // DjangoのデフォルトID

    if (trigger && fileInput) {
        // 画像がクリックされたら、ファイル選択ダイアログを開く
        trigger.addEventListener('click', function() {
            fileInput.click();
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.querySelector('input[name="profile_image"]');
    const trigger = document.getElementById('profileImageTrigger');

    // アイコンクリックでファイル選択を開く
    if (trigger && fileInput) {
        trigger.addEventListener('click', function() {
            fileInput.click();
        });
    }

    // 画像選択時にプレビュー表示
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const currentIcon = trigger.querySelector('.main-icon');
                    const newImg = document.createElement('img');
                    newImg.src = e.target.result;
                    newImg.className = 'rounded-circle shadow-sm border border-4 border-white main-icon';
                    newImg.width = 120;
                    newImg.height = 120;
                    newImg.style.objectFit = 'cover';

                    if (currentIcon) {
                        currentIcon.replaceWith(newImg);
                    }
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
});
