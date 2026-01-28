/* static/diet_calendar/js/calendar_logic.js */

document.addEventListener('DOMContentLoaded', function() {
    
    // ===============================================
    // 1. カレンダーレイアウトの強制修正
    // ===============================================
    function restructureCalendarCells() {
        try {
            const cells = document.querySelectorAll('.calendar-table td');
            
            cells.forEach(td => {
                if (td.querySelector('.cell-inner-wrapper')) return;

                const dateEl = td.querySelector('.date-number');
                const iconsEl = td.querySelector('.condition-icons');
                const contentEl = td.querySelector('.calendar-content');
                const weightEl = td.querySelector('.weight-text');
                const fatEl = td.querySelector('.fat-text');

                // 要素が一つもない場合はスキップ
                if (!dateEl && !iconsEl && !contentEl && !weightEl && !fatEl) return;

                const wrapper = document.createElement('div');
                wrapper.className = 'cell-inner-wrapper';

                if (dateEl) wrapper.appendChild(dateEl);
                if (iconsEl) {
                    iconsEl.className = 'condition-icons'; 
                    wrapper.appendChild(iconsEl);
                }
                if (contentEl) wrapper.appendChild(contentEl);
                if (weightEl) wrapper.appendChild(weightEl);
                if (fatEl) wrapper.appendChild(fatEl);

                td.innerHTML = '';
                td.appendChild(wrapper);
            });
        } catch (error) {
            console.error('Calendar layout restructuring failed:', error);
        }
    }

    restructureCalendarCells();


    // ===============================================
    // 2. 記録詳細モーダルの制御
    // ===============================================
    document.body.addEventListener('click', function(e) {
        const targetLink = e.target.closest('.open-detail-modal');
        
        if (targetLink) {
            e.preventDefault();
            
            // コンテナを取得、なければ動的に作成してbody末尾に追加（安全策）
            let modalContainer = document.getElementById('dynamicModalContainer');
            if (!modalContainer) {
                modalContainer = document.createElement('div');
                modalContainer.id = 'dynamicModalContainer';
                document.body.appendChild(modalContainer);
            }

            const url = targetLink.getAttribute('data-url') || targetLink.href;
            
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.text();
                })
                .then(html => {
                    // HTMLがモーダル全体を含んでいるかチェック
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    const isFullModal = tempDiv.querySelector('.modal');

                    if (isFullModal) {
                        // ミッション詳細などのフルモーダルの場合
                        modalContainer.innerHTML = html;
                    } else {
                        // 記録詳細などの部分HTMLの場合、枠を生成して埋め込む
                        modalContainer.innerHTML = `
                            <div class="modal fade" id="recordDetailModal" tabindex="-1" aria-hidden="true">
                                <div class="modal-dialog modal-dialog-centered">
                                    <div class="modal-content border-0 shadow-lg" style="border-radius: 24px; overflow: hidden;">
                                        <div class="modal-header border-0 py-3 px-4" style="background: linear-gradient(135deg, #42e695 0%, #3bb2b8 100%);">
                                            <h5 class="modal-title fw-bold text-white border-0" style="text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                記録詳細
                                            </h5>
                                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div class="modal-body p-4 bg-light">
                                            ${html}
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                    }

                    // 注入されたHTMLの中からモーダル要素を探す
                    const modalEl = modalContainer.querySelector('.modal');
                    if (modalEl) {
                        const modal = new bootstrap.Modal(modalEl);
                        modal.show();

                        // 閉じた後にDOMをクリーンアップ
                        modalEl.addEventListener('hidden.bs.modal', function () {
                            modal.dispose();
                            modalContainer.innerHTML = '';
                        });
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('データの読み込みに失敗しました。');
                });
        }
    });
});