// // グローバル関数として定義（どこからでも呼べるようにする）
// window.highlightAndScroll = function(targetId) {
//     const element = document.getElementById(targetId);
//     if (!element) return false; // 要素がない場合は何もしない

//     // 1. スクロール実行
//     element.scrollIntoView({ behavior: 'smooth', block: 'center' });

//     // 2. ハイライト演出 (Bootstrap classes)
//     // 既存のクラスを一時的に削除して再適用アニメーションさせる工夫
//     element.classList.remove('bg-warning', 'bg-opacity-10');
    
//     // 少しタイムラグを設けて適用（視覚的な認識向上のため）
//     setTimeout(() => {
//         element.classList.add('bg-warning', 'bg-opacity-10');
//         element.style.transition = 'background-color 0.5s ease-in-out';

//         // 3. 一定時間後に元に戻す
//         setTimeout(() => {
//             element.classList.remove('bg-warning', 'bg-opacity-10');
//             // transition設定もクリア（後の操作に影響させないため）
//             setTimeout(() => { element.style.transition = ''; }, 500);
//         }, 2000); // 2秒間ハイライト
//     }, 100);

//     return true;
// };

// document.addEventListener('DOMContentLoaded', function() {
//     // URLパラメータがある場合（ページ遷移してきた場合）の処理
//     const urlParams = new URLSearchParams(window.location.search);
//     const targetDate = urlParams.get('target_date');


// // --- 2. グラフへのスクロール（追加機能） ---
//     // グラフ関連のパラメータがあるかチェック
//     if (urlParams.has('interval') || urlParams.has('graph_start') || urlParams.has('graph_end') || urlParams.has('graph_reset')) {
//         const chartSection = document.getElementById('chart-section');
//         if (chartSection) {
//             // 少し待ってからスクロール（グラフ描画などの負荷を考慮）
//             setTimeout(() => {
//                 chartSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
//             }, 300);
//         }
//     }
// });