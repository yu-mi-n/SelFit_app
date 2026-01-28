document.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const startBtn = document.getElementById('startCameraBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    const shutterBtn = document.getElementById('shutterBtn');
    const switchBtn = document.getElementById('switchCameraBtn');
    
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const cameraArea = document.getElementById('cameraArea');
    const previewArea = document.getElementById('previewArea');
    const photoPreview = document.getElementById('photoPreview');

    const ghostImage = document.getElementById('ghostImage');
    const toggleGhostBtn = document.getElementById('toggleGhostBtn');
    
    // Djangoのファイル入力フィールドを自動特定
    // (form内の type="file" を探します)
    const fileInput = document.querySelector('form input[type="file"]');

    let stream = null;
    let facingMode = 'user'; // 'user'(インカメ) or 'environment'(外カメ)

    // カメラ機能が使えるかチェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("お使いのブラウザはカメラ機能に対応していないか、HTTPS接続ではありません。");
        return;
    }

    // --- 関数定義 ---

    // 1. カメラ起動
    async function startCamera() {
        try {
            // 既存のストリームがあれば停止
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            // カメラの権限リクエスト
            stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            video.srcObject = stream;
            
            // UIの切り替え
            cameraArea.style.display = 'block';
            startBtn.style.display = 'none';
            previewArea.style.display = 'none';

        } catch (err) {
            console.error("カメラ起動エラー:", err);
            alert("カメラを起動できませんでした。\nブラウザの設定でカメラの使用を許可してください。");
        }
    }

    // 2. カメラ停止
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraArea.style.display = 'none';
        startBtn.style.display = 'inline-block';
        startBtn.innerText = "📷 カメラを起動する"; // 文言を戻す
    }

    // 3. シャッターを切る
    function takePhoto() {
        if (!stream) return;

        // キャンバスサイズを映像に合わせる
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        
        // 映像をキャンバスに描画
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // キャンバスの内容を画像ファイル(Blob)に変換
        canvas.toBlob(function(blob) {
            if (!blob) return;

            // ファイルオブジェクトを作成 (ファイル名は現在時刻など適当に)
            const fileName = `capture_${new Date().getTime()}.jpg`;
            const file = new File([blob], fileName, { type: "image/jpeg" });
            
            // DataTransferを使って input[type="file"] にセットする
            // これでユーザーが「ファイル選択」したのと同じ状態になります
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;

            // プレビュー表示
            photoPreview.src = URL.createObjectURL(blob);
            previewArea.style.display = 'block';
            
            // 撮影完了したらカメラを止める
            stopCamera();
            startBtn.innerText = "📷 撮り直す";

        }, 'image/jpeg', 0.85); // 画質 0.85
    }

    // ゴースト機能
    if (toggleGhostBtn && ghostImage) {
            toggleGhostBtn.addEventListener('click', function() {
                if (ghostImage.style.display === 'none') {
                    ghostImage.style.display = 'block';
                    toggleGhostBtn.classList.add('active', 'bg-warning', 'text-white'); // ON時のスタイル
                } else {
                    ghostImage.style.display = 'none';
                    toggleGhostBtn.classList.remove('active', 'bg-warning', 'text-white'); // OFF時のスタイル
                }
            });
        }


    // --- イベントリスナー設定 ---

    if (startBtn) startBtn.addEventListener('click', startCamera);
    if (stopBtn) stopBtn.addEventListener('click', stopCamera);
    if (shutterBtn) shutterBtn.addEventListener('click', takePhoto);
    
    // カメラ切り替えボタン
    if (switchBtn) {
        switchBtn.addEventListener('click', function() {
            // インカメ⇔外カメ を反転
            facingMode = (facingMode === 'user') ? 'environment' : 'user';
            startCamera(); // 再起動
        });
    }
});