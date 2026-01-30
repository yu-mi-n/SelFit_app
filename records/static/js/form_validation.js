document.addEventListener('DOMContentLoaded', function() {
    // 変換対象のIDリスト
    const targetIds = ['id_weight', 'id_body_fat', 'id_target_weight', 'id_height'];

    targetIds.forEach(function(id) {
        const input = document.getElementById(id);
        if (input) {
            // 入力欄から離れたとき(blur)に発動
            input.addEventListener('blur', function() {
                let val = this.value;
                
                // 1. 全角数字を半角に変換
                val = val.replace(/[０-９]/g, function(s) {
                    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                });
                
                // 2. 全角ピリオド「．」を半角「.」に変換
                val = val.replace(/．/g, '.');

                // 3. 値を書き戻す
                this.value = val;
            });
        }
    });
});