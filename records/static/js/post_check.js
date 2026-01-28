/* static/records/js/post_check.js */

document.addEventListener('DOMContentLoaded', function() {
    const postBtns = document.querySelectorAll('.js-post-check');

    postBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const hasPosted = this.dataset.posted === 'true';
            const isMissionCleared = this.dataset.mission === 'true';
            
            let message = '';
            
            // エラー判定
            if (hasPosted) {
                message = '本日の投稿は完了しています ✨';
            } else if (!isMissionCleared) {
                message = '今日のミッションをクリアしていません 💦';
            }

            // メッセージがある場合（＝投稿できない場合）
            if (message) {
                e.preventDefault(); // 画面遷移ストップ
                
                // 親のラッパーを探す
                const wrapper = this.closest('.js-post-button-wrapper');
                if (!wrapper) return;

                // メッセージ表示エリアを探す
                const errorEl = wrapper.querySelector('.js-error-message');
                if (!errorEl) return;

                // メッセージをセットして表示
                errorEl.innerText = message;
                errorEl.style.display = 'block';
                
                // アニメーション用のクラス付与（もしあれば）
                // errorEl.classList.add('fade-in');

                // 既にタイマーが動いていたらリセット（連打対策）
                if (errorEl.dataset.timer) {
                    clearTimeout(errorEl.dataset.timer);
                }

                // 3秒後に非表示にする
                const timerId = setTimeout(() => {
                    errorEl.style.display = 'none';
                }, 3000);

                // タイマーIDを保存
                errorEl.dataset.timer = timerId;
            }
        });
    });
});