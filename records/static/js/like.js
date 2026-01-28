/* static/records/js/like.js */

document.addEventListener('DOMContentLoaded', function() {
    
    // 全てのいいねボタンを取得
    const likeButtons = document.querySelectorAll('.js-like-btn');

    likeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); // 本来のボタンの動き（送信など）をキャンセル
            
            const btn = this;
            const url = btn.dataset.url; // HTMLに埋め込んだURLを取得
            const icon = btn.querySelector('i'); // ハートアイコン
            const countSpan = btn.querySelector('.js-like-count'); // 数字部分
            
            // CSRFトークンを取得
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            // サーバーに通信開始
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({})
            })
            .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(data => {
                // 成功したら画面を更新
                
                // 1. カウントの更新
                countSpan.textContent = data.count;

                // 2. アイコンと色の切り替え
                if (data.liked) {
                    // いいねされた状態へ
                    icon.classList.remove('bi-heart', 'text-secondary');
                    icon.classList.add('bi-heart-fill', 'text-danger');
                    // ポヨンと跳ねるアニメーション（sns.cssの既存クラスがあれば活用、なければ今回は簡易的に）
                    icon.style.transform = 'scale(1.2)';
                    setTimeout(() => icon.style.transform = 'scale(1)', 200);
                } else {
                    // 解除された状態へ
                    icon.classList.remove('bi-heart-fill', 'text-danger');
                    icon.classList.add('bi-heart', 'text-secondary');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // エラー時は何もしないか、アラートを出す
            });
        });
    });
});