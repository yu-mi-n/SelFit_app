document.addEventListener('DOMContentLoaded', function() {

    // URLパラメータから初期テキストをセット
    const urlParams = new URLSearchParams(window.location.search);
    const initialText = urlParams.get('initial_text');

    if (initialText) {
        // Djangoフォームのテキストエリア（name="content"）を探す
        const contentArea = document.querySelector('[name="content"]');
        if (contentArea) {
            contentArea.value = initialText;
        }
    }
    // 保存ボタンを取得
    const saveBtn = document.getElementById('savePrivacyBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            // HTMLの data-url 属性からAPIのURLを取得
            const url = saveBtn.dataset.url;
            
            // フォームの値を取得
            const isAnonymous = document.getElementById('modal_is_anonymous').checked;
            const hideImage = document.getElementById('modal_hide_image').checked;
            
            // CSRFトークンを取得（メインフォーム内のhidden inputから）
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            // ボタンをローディング状態にする
            const originalText = saveBtn.innerText;
            saveBtn.innerText = '保存中...';
            saveBtn.disabled = true;

            // Ajax通信
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    'is_anonymous_account': isAnonymous,
                    'hide_profile_image': hideImage
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // 1. モーダルを閉じる
                    const modalEl = document.getElementById('privacyModal');
                    let modalInstance = bootstrap.Modal.getInstance(modalEl);

                    // インスタンスが取れなかったら新しく作る
                    if (!modalInstance) {
                        modalInstance = new bootstrap.Modal(modalEl);
                    }

                    modalInstance.hide();

                    // 2. 画面上の表示テキストを更新
                    const statusText = `
                        ユーザー名：${isAnonymous ? '非公開' : '公開'}  
                        アイコン：${hideImage ? '非表示' : '表示'}
                    `;
                    // spanタグの中身を書き換え
                    const statusSpan = document.getElementById('privacy-status-text');
                    if (statusSpan) {
                        statusSpan.innerText = statusText.trim();
                    }
                } else {
                    alert('エラーが発生しました: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('通信エラーが発生しました');
            })
            .finally(() => {
                // ボタンを元に戻す
                saveBtn.innerText = originalText;
                saveBtn.disabled = false;
            });
        });
    }
});