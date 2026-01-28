/* static/js/dashboard.js */

document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // 日替わり健康コラム (Health Tip)
    // ==========================================
    const tips = [
        "朝コップ一杯の白湯は、内臓を温めて代謝を上げます☕",
        "「ベジファースト」で野菜から食べると、血糖値の急上昇を防げます🥗",
        "よく噛んで食べることで、満腹中枢が刺激され食べ過ぎ防止に！🦷",
        "寝る前のスマホを控えると、睡眠の質がグッと上がります😴",
        "タンパク質は筋肉の材料！毎食手のひら一枚分を目安に🥩",
        "姿勢を正すだけでも、腹筋や背筋を使ったプチ筋トレになります✨",
        "ストレスはダイエットの大敵。深呼吸してリラックスしましょう🌿",
        "1駅分歩く、階段を使う。日常の「ちりつも」運動が大切です🚶",
        "空腹時のスーパーマーケットは危険！買い物は食後に行きましょう🛒",
        "水分補給は喉が渇く前に。こまめな給水が代謝アップの鍵です💧"
    ];

    const tipEl = document.getElementById('health-tip-content');
    if (tipEl) {
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        tipEl.textContent = randomTip;
    }

    // ==========================================
    // モーダル自動オープン & ナビゲーション
    // ==========================================
    
    // 1. URLパラメータによる自動オープン
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open_modal') === 'true' && urlParams.get('target_date')) {
        const targetDate = urlParams.get('target_date');
        const targetEl = document.getElementById(`record-${targetDate}`);
        if (targetEl) {
            const trigger = targetEl.querySelector('[data-bs-toggle="modal"]');
            if (trigger) {
                setTimeout(() => {
                    trigger.click();
                }, 500);
            }
        }
    }

    // 2. モーダル左右ナビゲーション
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.js-modal-nav');
        if (!btn) return;

        const direction = btn.dataset.direction; // 'prev' or 'next'
        const currentModalEl = btn.closest('.modal');
        
        // 現在のモーダルの日付を取得（タイトルから解析）
        const titleEl = currentModalEl.querySelector('.modal-title');
        let currentDateStr = null;
        if (titleEl) {
            // "2023年10月01日" 形式から抽出して YYYY-MM-DD に変換
            const match = titleEl.textContent.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            if (match) {
                currentDateStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
            }
        }

        // 日付データがない場合は処理中断
        if (!currentDateStr || !window.CHART_DATA || !window.CHART_DATA.dates) return;

        const dates = window.CHART_DATA.dates; // 日付リスト（通常は昇順）
        let currentIndex = dates.indexOf(currentDateStr);

        if (currentIndex === -1) return;

        // 次のインデックスを計算
        // datesは昇順(古い->新しい)と仮定
        // prev(左): 過去へ -> index - 1
        // next(右): 未来へ -> index + 1
        let nextIndex = (direction === 'prev') ? currentIndex - 1 : currentIndex + 1;

        // ループ処理
        if (nextIndex < 0) {
            nextIndex = dates.length - 1;
        } else if (nextIndex >= dates.length) {
            nextIndex = 0;
        }

        const nextDate = dates[nextIndex];
        
        // 1. DOM上に既にカードが存在するか確認（ページ内の記録）
        const recordCard = document.getElementById(`record-${nextDate}`);
        if (recordCard) {
            const trigger = recordCard.querySelector('[data-bs-toggle="modal"]');
            if (trigger) {
                const targetModalId = trigger.getAttribute('data-bs-target');
                const targetModalEl = document.querySelector(targetModalId);
                if (targetModalEl) {
                    switchModal(currentModalEl, targetModalEl);
                    return;
                }
            }
        }

        // 2. DOMにない場合、Ajaxで取得（ページ外の記録）
        fetch(`/records/modal/${nextDate}/`)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(html => {
                const container = document.getElementById('dynamic-modal-container');
                if (!container) return;

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const newModalEl = tempDiv.querySelector('.modal');

                if (newModalEl) {
                    // 既存の同IDモーダルがあれば削除
                    const existing = document.getElementById(newModalEl.id);
                    if (existing) existing.remove();

                    container.appendChild(newModalEl);
                    
                    // 新しいモーダルのボタン親要素を中央寄せ（スマホ用）
                    setupModalNavButtons(newModalEl);
                    switchModal(currentModalEl, newModalEl);
                }
            })
            .catch(error => console.error('Error:', error));
    });

    function switchModal(fromEl, toEl) {
        const fromInstance = bootstrap.Modal.getOrCreateInstance(fromEl);
        fromInstance.hide();
        fromEl.addEventListener('hidden.bs.modal', function () {
            const toInstance = bootstrap.Modal.getOrCreateInstance(toEl);
            toInstance.show();
        }, { once: true });
    }

    // ==========================================
    // ナビゲーションボタンのスタイル調整
    // ==========================================
    
    // ボタンをモーダルコンテンツの末尾に移動させて中央寄せする関数
    function setupModalNavButtons(modalEl) {
        const contentEl = modalEl.querySelector('.modal-content');
        const btns = modalEl.querySelectorAll('.js-modal-nav');
        
        if (!contentEl || btns.length === 0) return;

        // ボタンを包むラッパーを作成（なければ）
        let wrapper = contentEl.querySelector('.modal-nav-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'modal-nav-wrapper';
            contentEl.appendChild(wrapper);
        }

        // ボタンをラッパー内に移動
        btns.forEach(btn => {
            wrapper.appendChild(btn);
        });
    }

    // 初期表示の全てのモーダルに対して適用
    document.querySelectorAll('.modal').forEach(modalEl => {
        setupModalNavButtons(modalEl);
    });

    const navStyle = document.createElement('style');
    navStyle.textContent = `
        /* スマホ画面: 矢印ボタンの位置調整 */
        .modal-nav-wrapper {
            text-align: center;
            padding-bottom: 20px;
            margin-top: 10px;
            width: 100%;
        }
        .js-modal-nav {
            position: static !important; /* 絶対配置を解除して自然な位置へ */
            transform: none !important;
            display: inline-flex !important;
            margin: 0 15px !important;
        }

        /* PC画面（768px以上） */
        @media (min-width: 768px) {
            /* モーダル本体のはみ出し表示を許可 */
            .modal-content {
                overflow: visible !important;
            }
            /* PCではラッパーを絶対配置にしてモーダルに重ねる */
            .modal-nav-wrapper {
                position: absolute !important;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none; /* ラッパー自体はクリックを阻害しない */
                padding: 0;
                margin: 0;
            }
            .js-modal-nav {
                pointer-events: auto; /* ボタンはクリック可能に */
                position: absolute !important;
                top: 50% !important;
                opacity: 1 !important;
                color: #fff !important;
                background-color: rgba(0, 0, 0, 0.4);
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex !important;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                transition: all 0.3s ease;
                text-decoration: none !important;
                margin: 0 !important;
                z-index: 1060;
            }
            
            /* 左ボタン */
            .js-modal-nav[data-direction="prev"] {
                left: -80px !important;
                right: auto !important;
                transform: translateY(-50%) !important;
            }
            
            /* 右ボタン */
            .js-modal-nav[data-direction="next"] {
                right: -80px !important;
                left: auto !important;
                transform: translateY(-50%) !important;
            }

            .js-modal-nav:hover {
                background-color: rgba(0, 0, 0, 0.7);
                transform: translateY(-50%) scale(1.1) !important;
            }
        }
    `;
    document.head.appendChild(navStyle);
});