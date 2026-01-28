/* static/js/gallery.js */

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM要素の取得 ---
    const galleryContainer = document.getElementById('gallery');
    const playBtn = document.getElementById('playBtn');
    
    // モーダル関連
    const modal = document.getElementById('flipbookModal');
    const closeBtn = document.getElementById('closeBtn');
    const flipImage = document.getElementById('flipImage');
    const flipDate = document.getElementById('flipDate');
    const flipWeight = document.getElementById('flipWeight');
    const speedRange = document.getElementById('speedRange');
    
    // 状態管理
    let isPlaying = false;
    let timerId = null;
    let currentIndex = 0;
    let popoverTimer = null;

    // --- ヘルパー関数 ---
    
    // データの取得
    function getRecords() {
        const dataScript = document.getElementById('records-data');
        if (!dataScript) return [];
        try {
            return JSON.parse(dataScript.textContent);
        } catch (e) {
            console.error("JSON Parse error:", e);
            return [];
        }
    }

    // 画像パスの解決（相対パスなら /media/ を付与）
    function getImagePath(record) {
        let src = record.photo_url || record.image || '';
        if (src && !src.startsWith('/') && !src.startsWith('http')) {
            src = '/media/' + src;
        }
        return src;
    }

    // --- 1. ギャラリー一覧（グリッド）の描画 ---
    function renderGallery() {
        if (!galleryContainer) return;
        
        const records = getRecords();
        galleryContainer.innerHTML = ''; // クリア

        if (records.length === 0) {
            // Empty State
            galleryContainer.innerHTML = `
                <div class="gallery-empty-state text-center py-5">
                    <div class="mb-3 text-muted opacity-50">
                        <i class="bi bi-images" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="fw-bold text-muted mb-2">該当する記録がありません</h5>
                    <p class="text-muted small mb-0">
                        期間を変更するか、<br>
                        新しい記録を追加して写真を登録しましょう！
                    </p>
                </div>
            `;
            return;
        }

        // カードの生成
        records.forEach(record => {
            const imgSrc = getImagePath(record);
            if (!imgSrc) return; // 画像がないレコードはグリッドには表示しない

            const card = document.createElement('div');
            card.className = 'gallery-card'; 

            card.innerHTML = `
                <img src="${imgSrc}" class="gallery-image" alt="${record.date}" loading="lazy">
                <div class="gallery-info">
                    <div class="record-date">${record.date}</div>
                    <div class="record-weight">${record.weight ? record.weight + ' kg' : '--'}</div>
                </div>
            `;
            galleryContainer.appendChild(card);
        });
    }

    // --- 2. イベントリスナー設定 ---
    
    // 初期描画
    renderGallery();

    if (playBtn) {
        playBtn.addEventListener('click', function(e) { // キャプチャフェーズでイベントを捕捉
            const records = getRecords();
            // 画像があるレコードのみ抽出
            const imageRecords = records.filter(r => getImagePath(r));

            if (imageRecords.length === 0) {
                e.preventDefault();
                e.stopImmediatePropagation();

                // 既存のタイマーとインスタンスをクリア
                if (popoverTimer) {
                    clearTimeout(popoverTimer);
                    popoverTimer = null;
                }
                const existingPopover = bootstrap.Popover.getInstance(playBtn);
                if (existingPopover) {
                    existingPopover.dispose();
                }

                // BootstrapのPopoverを動的に生成して表示
                const popover = new bootstrap.Popover(playBtn, {
                    content: '<div class="d-flex align-items-center text-nowrap"><i class="bi bi-exclamation-circle-fill text-danger me-2"></i><span class="text-danger fw-bold">登録されている写真がありません</span></div>',
                    html: true,
                    placement: 'bottom',
                    trigger: 'manual'
                });
                popover.show();

                // 3秒後に非表示にして破棄
                popoverTimer = setTimeout(() => {
                    popover.hide();
                    playBtn.addEventListener('hidden.bs.popover', () => {
                        popover.dispose();
                    }, { once: true });
                }, 3000);
            } else {
                // レコードがある場合、自前のスライドショーを実行し、gallery.jsの処理をブロックする
                e.preventDefault();
                e.stopImmediatePropagation();
                startSlideshow(imageRecords);
            }
        }, true);
    }

    // --- 3. スライドショー機能 ---
    function startSlideshow(records) {
        // 日付順にソート
        records.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        currentIndex = 0;
        isPlaying = true;
        modal.style.display = 'flex';
        
        showSlide(records);
    }

    function showSlide(records) {
        if (!isPlaying) return;

        const record = records[currentIndex];
        
        // 画像と情報の更新
        const imgSrc = getImagePath(record);
        if (imgSrc && flipImage) {
            flipImage.src = imgSrc;
        }
        
        // 日付のフォーマット
        flipDate.textContent = record.date; 
        flipWeight.textContent = record.weight ? record.weight + ' kg' : '-- kg';

        // スライダーの値から速度計算 (値が大きいほど速い = 間隔が短い)
        // min=1(遅い:2000ms) ~ max=20(速い:100ms)
        const val = speedRange ? parseInt(speedRange.value) : 10;
        const interval = 2100 - (val * 100);

        // 最後の写真まで表示したら終了（ループしない）
        if (currentIndex >= records.length - 1) {
            // 最後の写真を表示した状態で指定時間待機してから終了
            timerId = setTimeout(() => {
                stopSlideshow();
            }, interval);
            return;
        }

        // 次のインデックスへ
        currentIndex++;

        timerId = setTimeout(() => {
            showSlide(records);
        }, interval);
    }

    function stopSlideshow() {
        isPlaying = false;
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
        modal.style.display = 'none';
    }

    // 閉じるボタン
    if (closeBtn) {
        closeBtn.addEventListener('click', stopSlideshow);
    }

    // モーダル外クリックで閉じる
    window.addEventListener('click', function(e) {
        if (e.target == modal) {
            stopSlideshow();
        }
    });
});
