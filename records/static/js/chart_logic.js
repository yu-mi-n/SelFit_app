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

    // ★追加: 星(★)を描画したCanvasを作成する関数
    function createStarCanvas(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#ffffff'; // 境界線の色（白）
        ctx.lineWidth = 3;           // 線の太さ（内側は塗りつぶされるため実質外側1px）
        ctx.strokeText('★', 12, 10); // 境界線を描画
        ctx.fillStyle = color;
        ctx.fillText('★', 12, 10); // 中心に描画
        return canvas;
    }

    // 適正範囲内(緑)と範囲外(オレンジ)の星を作成
    const starGreen = createStarCanvas('#4dd0e1');
    const starOrange = createStarCanvas('#e6a05c');

    // ★高速化: スタイルを事前に計算して配列化する
    // 描画のたびに関数を実行するオーバーヘッドを削減します
    const pointStyles = [];
    const pointRadii = [];
    const pointBorderColors = [];

    if (data.weights) {
        data.weights.forEach((weight, index) => {
            const hasPhoto = data.hasPhotos && data.hasPhotos[index];
            const isHealthy = healthyRange && weight !== null && weight >= healthyRange.min && weight <= healthyRange.max;

            // 1. ポイントの形状とサイズ
            if (hasPhoto) {
                // 写真あり -> 星形、サイズ大きめ
                pointStyles.push(isHealthy ? starGreen : starOrange);
                pointRadii.push(8);
            } else {
                // 写真なし -> 丸、サイズ通常
                pointStyles.push('circle');
                pointRadii.push(5);
            }

            // 2. ポイントの枠線色（丸の場合に適用）
            pointBorderColors.push(isHealthy ? '#4dd0e1' : '#e6a05c');
        });
    }

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
                    normalized: true, // データがソート済みであることを明示して描画を高速化
                    borderColor: '#e6a05c',
                    backgroundColor: 'rgba(230, 160, 92, 0.1)',
                    borderWidth: 3,
                    // ★修正: 事前計算した配列を直接渡す（関数呼び出しを回避して高速化）
                    pointBackgroundColor: '#fff',
                    pointBorderColor: pointBorderColors,
                    pointStyle: pointStyles,
                    pointRadius: pointRadii,
                    
                    pointHoverRadius: pointRadii, // ホバー時もサイズを変えない
                    tension: 0.3,
                    yAxisID: 'y',
                    spanGaps: true,
                    segment: {
                        borderColor: function(context) {
                            if (!healthyRange) return '#e6a05c';
                            const v0 = context.p0.parsed.y;
                            const v1 = context.p1.parsed.y;
                            // 線の両端が適正範囲内ならテーマカラー(#3bb2b8)にする
                            if (v0 >= healthyRange.min && v0 <= healthyRange.max &&
                                v1 >= healthyRange.min && v1 <= healthyRange.max) {
                                return '#3bb2b8';
                            }
                            return '#e6a05c';
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
                        display: 'auto', // ラベルが重なる場合は自動的に非表示にする
                        // ★変更: 体脂肪率グラフと被る場合は下側に表示する
                        anchor: 'center', // 中心を基準にする
                        align: function(context) {
                            const chart = context.chart;
                            const index = context.dataIndex;
                            const weight = context.dataset.data[index];
                            // 体脂肪率は2番目のデータセット(index 1)
                            const bodyFatDataset = chart.data.datasets[1];
                            const bodyFat = bodyFatDataset ? bodyFatDataset.data[index] : null;

                            if (weight !== null && bodyFat !== null && chart.scales.y && chart.scales.y1) {
                                const yWeight = chart.scales.y.getPixelForValue(weight);
                                const yBodyFat = chart.scales.y1.getPixelForValue(bodyFat);
                                
                                // 体脂肪(yBodyFat)が体重(yWeight)より「上(値が小さい)」にあり、かつ近い場合
                                // ラベルを上に置くと被るので「下(bottom)」にする
                                if (yBodyFat < yWeight && (yWeight - yBodyFat) < 40) {
                                    return 'bottom';
                                }
                            }
                            return 'top'; // 基本は上
                        },
                        offset: function(context) {
                            // 点の半径 + 余白(4px)
                            const index = context.dataIndex;
                            const radii = context.dataset.pointRadius;
                            const r = Array.isArray(radii) ? radii[index] : (radii || 5);
                            return r + 4;
                        },
                        textAlign: 'center',
                        font: { size: 12, weight: 'bold' },
                        color: '#e6a05c',
                        borderRadius: 4,
                        padding: {
                            top: 2,
                            bottom: 1,
                            left: 4,
                            right: 4
                        },
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
                    normalized: true, // データがソート済みであることを明示して描画を高速化
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
            animation: false, // ★追加: 初期描画アニメーションも無効化して即時表示
            // ホバー時のアニメーションを無効化してレスポンスを向上
            hover: {
                animationDuration: 0
            },
            // インタラクション設定の最適化
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: true // ポイントにカーソルが乗った時だけ表示
            },
            
            // ▼▼▼ 修正箇所：plugins の閉じカッコの位置を変更しました ▼▼▼
            plugins: {
                legend: { display: false },
                
                // tooltip は plugins の中に入っている必要があります
                tooltip: {
                    // ポイントの下側に表示（yAlign: 'top' で吹き出しの矢印が上＝ポイント側を向く）
                    yAlign: 'top',
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
                                    position: 'start',
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
                                borderColor: 'rgba(255, 107, 107, 0.5)', // 薄く表示
                                borderWidth: 1,
                                borderDash: [6, 4], // 点線
                                label: {
                                    display: true,
                                    content: 'Goal ' + targetWeight + 'kg',
                                    position: 'end',
                                    backgroundColor: 'transparent',
                                    color: '#ff6b6b',
                                    font: { size: 7, weight: 'bold' },
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