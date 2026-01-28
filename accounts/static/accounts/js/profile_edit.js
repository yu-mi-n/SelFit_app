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