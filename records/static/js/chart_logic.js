/* static/js/chart_logic.js */

document.addEventListener('DOMContentLoaded', function() {
    // 1. データ取得
    const data = window.CHART_DATA;
    // HTML側で定義された標準体重範囲を取得
    const healthyRange = window.CHART_HEALTHY_RANGE || null;
    const targetWeight = window.CHART_TARGET_WEIGHT || null;

    if (!data || !data.dates || data.dates.length === 0) {
        console.warn('表示するデータがありません。');
        return;
    }

    // 2. DOM要素
    const ctxCanvas = document.getElementById('weightChart');
    const scrollWrapper = document.querySelector('.chart-scroll-wrapper');
    const chartBody = document.querySelector('.chart-body');

    if (!ctxCanvas || !scrollWrapper || !chartBody) return;

    let chartInstance = null;

    // ========================================================
    // ★ 表示幅の更新関数
    // ========================================================
    function updateChartWidth(zoomLevel) {
        const containerWidth = scrollWrapper.clientWidth || window.innerWidth;
        
        let widthPerPoint;
        let totalWidth;

        if (zoomLevel === 'all') {
            totalWidth = containerWidth;
        } else {
            const pointsPerScreen = parseInt(zoomLevel) || 7;
            widthPerPoint = containerWidth / pointsPerScreen;
            totalWidth = Math.max(containerWidth, widthPerPoint * data.dates.length);
        }

        chartBody.style.width = `${totalWidth}px`;
        
        if (chartInstance) {
            chartInstance.resize();
            setTimeout(() => {
                scrollWrapper.scrollLeft = scrollWrapper.scrollWidth;
            }, 0);
        }
    }

    updateChartWidth(7);


    // ========================================================
    // Chart.js 設定
    // ========================================================
    chartInstance = new Chart(ctxCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [
                {
                    label: '体重 (kg)',
                    data: data.weights,
                    borderColor: '#ff9f43',
                    backgroundColor: 'rgba(255, 159, 67, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: function(context) {
                        const value = context.raw;
                        // 適正範囲内なら明るいテーマカラー(#4dd0e1)、それ以外はオレンジ(#ff9f43)
                        if (healthyRange && value !== null && value >= healthyRange.min && value <= healthyRange.max) {
                            return '#4dd0e1';
                        }
                        return '#ff9f43';
                    },
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.3,
                    yAxisID: 'y',
                    spanGaps: true,
                    segment: {
                        borderColor: function(context) {
                            if (!healthyRange) return '#ff9f43';
                            const v0 = context.p0.parsed.y;
                            const v1 = context.p1.parsed.y;
                            // 線の両端が適正範囲内ならテーマカラー(#3bb2b8)にする
                            if (v0 >= healthyRange.min && v0 <= healthyRange.max &&
                                v1 >= healthyRange.min && v1 <= healthyRange.max) {
                                return '#3bb2b8';
                            }
                            return '#ff9f43';
                        },
                        // ★追加: 適正範囲内は線を太くして強調
                        borderWidth: function(context) {
                            if (!healthyRange) return 3;
                            const v0 = context.p0.parsed.y;
                            const v1 = context.p1.parsed.y;
                            if (v0 >= healthyRange.min && v0 <= healthyRange.max &&
                                v1 >= healthyRange.min && v1 <= healthyRange.max) {
                                return 5; 
                            }
                            return 3;
                        }
                    },
                    datalabels: {
                        align: 'top',
                        anchor: 'end',
                        textAlign: 'center',
                        offset: 4,
                        font: { size: 12, weight: 'bold' },
                        color: '#ff9f43',
                        formatter: (value, context) => {
                            if (value === null) return '';
                            if (window.CHART_INTERVAL !== 'daily') return value;
                            
                            const emoji = data.emojis[context.dataIndex];
                            return emoji ? `${emoji}\n${value}` : value;
                        }
                    }
                },
                {
                    label: '体脂肪率 (%)',
                    data: data.bodyFats,
                    borderColor: '#4dabf7',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    tension: 0.3,
                    yAxisID: 'y1',
                    spanGaps: true,
                    datalabels: { display: false }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            
            // ▼▼▼ 修正箇所：plugins の閉じカッコの位置を変更しました ▼▼▼
            plugins: {
                legend: { display: false },
                
                // tooltip は plugins の中に入っている必要があります
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const rangeLabel = data.ranges ? data.ranges[index] : null;
                            return rangeLabel || context[0].label;
                        }
                    }
                },
                // ▲▲▲ tooltip 設定ここまで ▲▲▲

                // ★追加: 標準体重の範囲（アノテーション）
                annotation: {
                    annotations: {
                        // 1. 適正体重の範囲（薄黄色）
                        ...(healthyRange ? {
                            healthyZone: {
                                type: 'box',
                                yMin: healthyRange.min,
                                yMax: healthyRange.max,
                                backgroundColor: 'rgba(255, 235, 59, 0.15)',
                                borderWidth: 0,
                                label: {
                                    display: true,
                                    content: '適正体重',
                                    position: 'end',
                                    color: 'rgba(0,0,0,0.25)',
                                    font: { size: 11 }
                                }
                            }
                        } : {}),
                        // 2. 目標体重のライン（点線）
                        ...(targetWeight ? {
                            targetLine: {
                                type: 'line',
                                yMin: targetWeight,
                                yMax: targetWeight,
                                borderColor: '#ff6b6b', // 赤系で強調
                                borderWidth: 2,
                                borderDash: [6, 4], // 点線
                                label: {
                                    display: true,
                                    content: 'Goal ' + targetWeight + 'kg',
                                    position: 'start',
                                    backgroundColor: 'transparent',
                                    color: '#ff6b6b',
                                    font: { size: 10, weight: 'bold' },
                                    yAdjust: -10 // 線の上に表示
                                }
                            }
                        } : {})
                    }
                },

                datalabels: { /* DataLabels設定があればここに */ }
            }, 
            // ▲▲▲ plugins の閉じカッコはここが正解です ▲▲▲

            layout: { padding: { top: 20, right: 10, bottom: 0, left: 10 } },
            scales: {
                x: { 
                    grid: { display: false }, 
                    ticks: { 
                        maxRotation: 0,   // 文字を常に水平にする（読みやすさ優先）
                        autoSkip: true,   // ★これ重要：重なる場合は自動で間引く
                        autoSkipPadding: 3, // ラベル間の最低余白（px）
                        
                    } 
                },
                y: { type: 'linear', display: true, position: 'left', grid: { color: '#f0f0f0' }, title: { display: false } },
                y1: { type: 'linear', display: true, position: 'right', grid: { display: false }, suggestedMin: 10, suggestedMax: 40 }
            },
            onClick: (e) => {
                if (window.CHART_INTERVAL !== 'daily') {
                    return; 
                }

                const points = chartInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length > 0) {
                    const index = points[0].index;
                    const labelDate = chartInstance.data.labels[index];
                    const targetId = `record-${labelDate}`;
                    const targetEl = document.getElementById(targetId);
                    
                    if (targetEl) {
                        // 画面内に要素がある場合、モーダルトリガーをクリック
                        const trigger = targetEl.querySelector('[data-bs-toggle="modal"]');
                        if (trigger) trigger.click();
                    } else {
                        // 画面内にない場合、Ajaxでデータを取得して表示
                        fetchAndShowModal(labelDate);
                    }
                }
            },
        },
        plugins: [ChartDataLabels]
    });

    // ========================================================
    // ズームボタン設定
    // ========================================================
    const zoomBtns = document.querySelectorAll('.zoom-btn');
    zoomBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            zoomBtns.forEach(b => b.classList.remove('active', 'btn-secondary'));
            zoomBtns.forEach(b => b.classList.add('btn-outline-secondary'));
            
            this.classList.remove('btn-outline-secondary');
            this.classList.add('active', 'btn-secondary');

            const level = this.getAttribute('data-zoom');
            updateChartWidth(level);
        });
    });

    setTimeout(() => {
        scrollWrapper.scrollLeft = scrollWrapper.scrollWidth;
    }, 100);

    // ========================================================
    // 動的モーダル取得・表示関数
    // ========================================================
    function fetchAndShowModal(date) {
        const container = document.getElementById('dynamic-modal-container');
        if (!container) return;

        // ※サーバー側に /records/modal/<date>/ のようなエンドポイントが必要です
        // 例: /records/modal/2023-10-25/
        const url = `/records/modal/${date}/`; 

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Record not found or server error');
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                const modalEl = container.querySelector('.modal');
                if (modalEl) {
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                    
                    // 閉じたら中身をクリア
                    modalEl.addEventListener('hidden.bs.modal', () => {
                        modal.dispose();
                        container.innerHTML = '';
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching record modal:', error);
                // エラー時は簡易アラート、または何もしない
                // alert('詳細データの取得に失敗しました');
            });
    }
});