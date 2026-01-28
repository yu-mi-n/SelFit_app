/* static/js/meal_camera.js */

document.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const startCameraBtn = document.getElementById('startCameraBtn');
    const cameraModalEl = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const shutterBtn = document.getElementById('shutterBtn');
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    const fileInput = document.querySelector('input[type="file"]');
    
    // ▼ 追加：プレビュー画像要素
    const imagePreview = document.getElementById('imagePreview'); 

    if (!startCameraBtn || !cameraModalEl || !video || !shutterBtn || !fileInput) {
        return; 
    }

    const cameraModal = new bootstrap.Modal(cameraModalEl);
    let stream = null;
    let currentFacingMode = 'environment';

    // --- 0. プレビュー表示機能（追加） ---
    // ファイルが選択されたら実行される
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0]; // 選択されたファイルを取得
        if (file && imagePreview) {
            const reader = new FileReader(); // ファイルを読み込むための機能
            
            // 読み込み完了時の処理
            reader.onload = function(e) {
                imagePreview.src = e.target.result; // 画像のデータURLをセット
                imagePreview.style.display = 'block'; // 非表示を解除して表示
            }
            
            reader.readAsDataURL(file); // 読み込み開始
        }
    });


    // --- カメラ起動関数 ---
    async function startCamera() {
        stopCamera();
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: currentFacingMode } 
            });
            video.srcObject = stream;
        } catch (err) {
            console.error(err);
            alert("カメラを起動できませんでした。");
        }
    }

    // --- 1. カメラ起動ボタン ---
    startCameraBtn.addEventListener('click', () => {
        currentFacingMode = 'environment';
        startCamera();
        cameraModal.show();
    });

    // --- 2. カメラ切り替えボタン ---
    if (switchCameraBtn) {
        switchCameraBtn.addEventListener('click', () => {
            currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
            startCamera();
        });
    }

    // --- 3. 撮影（シャッター）処理 ---
    shutterBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        
        // 内カメラなら左右反転
        if (currentFacingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const now = new Date();
            const filename = `meal_${now.getTime()}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });
            
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;

            // ▼ 重要：手動で 'change' イベントを発火させる
            // これにより、上の「0. プレビュー表示機能」が動き出します
            fileInput.dispatchEvent(new Event('change'));

            stopCamera();
            cameraModal.hide();
        }, 'image/jpeg', 0.8);
    });

    // --- 4. 終了処理 ---
    cameraModalEl.addEventListener('hidden.bs.modal', stopCamera);

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }
});