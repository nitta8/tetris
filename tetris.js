const SATRT_BTN_ID = "start-btn"
const MAIN_CANVAS_ID = "main-canvas"
const NEXT_CANVAS_ID = "next-canvas"
const GAME_SPEED = 500;
const BLOCK_SIZE = 32;
const COLS_COUNT = 10;
const ROWS_COUNT = 20;
const SCREEN_WIDTH = COLS_COUNT * BLOCK_SIZE;
const SCREEN_HEIGHT = ROWS_COUNT * BLOCK_SIZE;
const NEXT_AREA_SIZE = 160;
const BLOCK_SOURCES = [
        "images/block-0.png",
        "images/block-1.png",
        "images/block-2.png",
        "images/block-3.png",
        "images/block-4.png",
        "images/block-5.png",
        "images/block-6.png"
    ]

window.onload = function(){
  Asset.init()
  let game = new Game()
  document.getElementById(SATRT_BTN_ID).onclick = function(){
      game.start()
      this.blur() // ボタンのフォーカスを外す
  }
  
  // タッチ操作用のイベントリスナーを設定
  game.setupTouchControls()
}

// 素材を管理するクラス
// ゲーム開始前に初期化する
class Asset{
    // ブロック用Imageの配列
    static blockImages = []

    // 初期化処理
    // callback には、init完了後に行う処理を渡す
    static init(callback){
        let loadCnt = 0
        for(let i = 0; i <= 6; i++){
            let img = new Image();
            img.src = BLOCK_SOURCES[i];
            img.onload = function(){
                loadCnt++
                Asset.blockImages.push(img)

                // 全ての画像読み込みが終われば、callback実行
                if(loadCnt >= BLOCK_SOURCES.length && callback){
                    callback()
                }
            }
        }
    }
}

class Game{
    constructor(){
        this.initMainCanvas()
        this.initNextCanvas()
        this.isPlaying = false
        this.isAnimating = false  // アニメーション中フラグ
        this.initScore()
    }

    // スコア関連の初期化
    initScore(){
        this.score = 0
        this.level = 1
        this.lines = 0
        this.gameSpeed = GAME_SPEED
        this.updateScoreDisplay()
    }

    // スコア表示の更新
    updateScoreDisplay(){
        document.getElementById('score').textContent = this.score.toLocaleString()
        document.getElementById('level').textContent = this.level
        document.getElementById('lines').textContent = this.lines
    }

    // レベル表示の強調エフェクト
    highlightLevelDisplay(){
        const levelElement = document.getElementById('level')
        levelElement.classList.add('level-up')
        
        setTimeout(() => {
            levelElement.classList.remove('level-up')
        }, 3000) // 3秒後に元に戻す
        
        // 画面振動エフェクト
        const container = document.getElementById('container')
        container.style.animation = 'shake 0.5s ease-in-out 3'
        
        setTimeout(() => {
            container.style.animation = ''
        }, 1500)
    }

    // メインキャンバスの初期化
    initMainCanvas(){
        this.mainCanvas = document.getElementById(MAIN_CANVAS_ID);
        this.mainCtx = this.mainCanvas.getContext("2d");
        this.mainCanvas.width = SCREEN_WIDTH;
        this.mainCanvas.height = SCREEN_HEIGHT;
        this.mainCanvas.style.border = "4px solid #555";
        
        // レスポンシブ対応
        this.resizeCanvas()
        window.addEventListener('resize', () => this.resizeCanvas())
    }

    // キャンバスのレスポンシブ対応
    resizeCanvas(){
        const container = document.getElementById('container')
        const isMobile = window.innerWidth <= 768
        
        if (isMobile) {
            // モバイル用のサイズ調整
            const availableWidth = Math.min(window.innerWidth - 20, 320)
            const availableHeight = Math.min(window.innerHeight * 0.5, 400)
            
            // アスペクト比を維持しながらサイズを調整
            const scale = Math.min(availableWidth / SCREEN_WIDTH, availableHeight / SCREEN_HEIGHT)
            
            this.mainCanvas.style.width = (SCREEN_WIDTH * scale) + 'px'
            this.mainCanvas.style.height = (SCREEN_HEIGHT * scale) + 'px'
            
            // ネクストキャンバスも調整
            if (this.nextCanvas) {
                const nextScale = Math.min(scale, 0.5)
                this.nextCanvas.style.width = (NEXT_AREA_SIZE * nextScale) + 'px'
                this.nextCanvas.style.height = (NEXT_AREA_SIZE * nextScale) + 'px'
            }
        } else {
            // デスクトップ用
            const maxWidth = Math.min(container.clientWidth - 40, SCREEN_WIDTH)
            if (maxWidth < SCREEN_WIDTH) {
                const scale = maxWidth / SCREEN_WIDTH
                this.mainCanvas.style.width = maxWidth + 'px'
                this.mainCanvas.style.height = (SCREEN_HEIGHT * scale) + 'px'
            } else {
                this.mainCanvas.style.width = SCREEN_WIDTH + 'px'
                this.mainCanvas.style.height = SCREEN_HEIGHT + 'px'
            }
            
            if (this.nextCanvas) {
                this.nextCanvas.style.width = NEXT_AREA_SIZE + 'px'
                this.nextCanvas.style.height = NEXT_AREA_SIZE + 'px'
            }
        }
    }

    // ネクストキャンバスの初期化
    initNextCanvas(){
        this.nextCanvas = document.getElementById(NEXT_CANVAS_ID);
        this.nextCtx = this.nextCanvas.getContext("2d");
        this.nextCanvas.width = NEXT_AREA_SIZE
        this.nextCanvas.height = NEXT_AREA_SIZE;
        this.nextCanvas.style.border = "4px solid #555";
    }

    // ゲームの開始処理（STARTボタンクリック時）
    start(){
        // フィールドとミノの初期化
        this.field = new Field()
        this.isPlaying = true
        
        // スコアリセット
        this.initScore()

        // 最初のミノを読み込み
        this.popMino()

        // 初回描画
        this.drawAll()

        // 落下処理（レベルに応じた速度）
        clearInterval(this.timer)
        this.timer = setInterval(() => this.dropMino(), this.gameSpeed);

        // キーボードイベントの登録
        this.setKeyEvent()
    }

    // 新しいミノを読み込む
    popMino(){
        this.mino = this.nextMino ?? new Mino()
        this.mino.spawn()
        this.nextMino = new Mino()

        // ゲームオーバー判定
        if(!this.valid(0, 1)){
            // 全てのタイマーを確実に停止
            clearInterval(this.timer)
            this.timer = null
            this.isPlaying = false
            this.isAnimating = false
            
            this.drawAll()
            this.showGameOver()
        }
    }

    // 画面の描画
    drawAll(){
        // 表示クリア
        this.mainCtx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
        this.nextCtx.clearRect(0, 0, NEXT_AREA_SIZE, NEXT_AREA_SIZE)

        // 落下済みのミノを描画
        this.field.drawFixedBlocks(this.mainCtx)

        // 再描画
        this.nextMino.drawNext(this.nextCtx)
        this.mino.draw(this.mainCtx)
    }

    // ミノの落下処理
    dropMino(){
        // ゲームが停止中は何もしない
        if(!this.isPlaying || this.isAnimating) return
        
        if(this.valid(0, 1)) {
            this.mino.y++;
        }else{
            // Minoを固定する（座標変換してFieldに渡す）
            this.mino.blocks.forEach( e => {
                e.x += this.mino.x
                e.y += this.mino.y
            })
            this.field.blocks = this.field.blocks.concat(this.mino.blocks)
            
            // ミノ配置ボーナス
            this.score += this.level
            
            // ライン消去チェックとアニメーション
            const completedLines = this.field.checkLine()
            if(completedLines.length > 0){
                this.animateLineClear(completedLines)
            } else {
                this.updateScoreDisplay()
                this.popMino()
            }
        }
        this.drawAll();
    }

    // ライン消去アニメーション
    animateLineClear(completedLines){
        this.isAnimating = true  // アニメーション開始
        
        // ゲームタイマーを一時停止
        clearInterval(this.timer)
        
        let flashCount = 0
        const maxFlashes = 6 // 3回点滅
        
        const flashInterval = setInterval(() => {
            // 点滅効果（偶数回は非表示、奇数回は白色表示）
            this.drawAll()
            
            if(flashCount % 2 === 1){
                // 白色で点滅表示
                this.mainCtx.fillStyle = '#FFFFFF'
                completedLines.forEach(line => {
                    this.mainCtx.fillRect(
                        0, 
                        line * BLOCK_SIZE, 
                        SCREEN_WIDTH, 
                        BLOCK_SIZE
                    )
                })
            }
            
            flashCount++
            
            if(flashCount >= maxFlashes){
                clearInterval(flashInterval)
                
                // アニメーション終了後にライン消去とスコア処理
                this.field.clearLines(completedLines)
                this.addScore(completedLines.length)
                
                // ゲームが継続中の場合のみ次のミノを生成
                if(this.isPlaying){
                    this.popMino()
                    this.drawAll()
                }
                
                // アニメーション終了、ゲーム再開
                this.isAnimating = false
                this.timer = setInterval(() => this.dropMino(), this.gameSpeed)
            }
        }, 120) // 120ms間隔で点滅（少し遅めに調整）
    }

    // スコア加算とレベルアップ処理
    addScore(linesCleared){
        // ライン数を加算
        this.lines += linesCleared
        
        // スコア計算（レベルとライン数に応じて）
        const baseScore = [0, 100, 300, 500, 800] // 0, 1, 2, 3, 4ライン同時消去
        this.score += baseScore[linesCleared] * this.level
        
        // レベルアップ判定（1ライン毎に変更）
        const newLevel = Math.floor(this.lines / 1) + 1
        if(newLevel > this.level){
            const oldLevel = this.level
            this.level = newLevel
            this.updateGameSpeed()
            this.animateLevelUp(oldLevel, newLevel)
        } else {
            this.updateScoreDisplay()
        }
    }

    // レベルアップアニメーション
    animateLevelUp(oldLevel, newLevel){
        this.isAnimating = true
        
        // レベル表示を強調
        this.highlightLevelDisplay()
        
        // より派手なアニメーション設定
        let flashCount = 0
        const maxFlashes = 12 // 6回点滅に増加
        let scaleEffect = 1.0
        let rotateEffect = 0
        
        const levelUpInterval = setInterval(() => {
            this.drawAll()
            
            // 背景フラッシュとテキストアニメーション
            if(flashCount % 2 === 1){
                // 虹色の背景エフェクト
                const colors = ['rgba(255, 0, 0, 0.4)', 'rgba(255, 127, 0, 0.4)', 'rgba(255, 255, 0, 0.4)', 
                               'rgba(0, 255, 0, 0.4)', 'rgba(0, 0, 255, 0.4)', 'rgba(75, 0, 130, 0.4)']
                const colorIndex = Math.floor(flashCount / 2) % colors.length
                this.mainCtx.fillStyle = colors[colorIndex]
                this.mainCtx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
                
                // 星のエフェクト
                this.drawStars()
                
                // アニメーション効果の計算
                scaleEffect = 1.0 + Math.sin(flashCount * 0.5) * 0.3
                rotateEffect = Math.sin(flashCount * 0.3) * 5
                
                this.mainCtx.save()
                this.mainCtx.translate(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)
                this.mainCtx.scale(scaleEffect, scaleEffect)
                this.mainCtx.rotate(rotateEffect * Math.PI / 180)
                
                // "LEVEL UP!" メインテキスト（アウトライン付き）
                this.mainCtx.font = 'bold 32px Arial'
                this.mainCtx.lineWidth = 4
                this.mainCtx.strokeStyle = '#000000'
                this.mainCtx.fillStyle = '#FFD700'
                this.mainCtx.textAlign = 'center'
                this.mainCtx.strokeText('LEVEL UP!', 0, -30)
                this.mainCtx.fillText('LEVEL UP!', 0, -30)
                
                // 光る効果
                this.mainCtx.shadowColor = '#FFD700'
                this.mainCtx.shadowBlur = 20
                this.mainCtx.fillText('LEVEL UP!', 0, -30)
                this.mainCtx.shadowBlur = 0
                
                // レベル変化テキスト
                this.mainCtx.font = 'bold 24px Arial'
                this.mainCtx.strokeStyle = '#000000'
                this.mainCtx.lineWidth = 3
                this.mainCtx.fillStyle = '#FFFFFF'
                this.mainCtx.strokeText(`${oldLevel} → ${newLevel}`, 0, 10)
                this.mainCtx.fillText(`${oldLevel} → ${newLevel}`, 0, 10)
                
                // スピードアップメッセージ
                this.mainCtx.font = 'bold 18px Arial'
                this.mainCtx.fillStyle = '#FF0000'
                this.mainCtx.strokeStyle = '#000000'
                this.mainCtx.lineWidth = 2
                this.mainCtx.strokeText('SPEED UP!', 0, 40)
                this.mainCtx.fillText('SPEED UP!', 0, 40)
                
                this.mainCtx.restore()
                
                // 画面境界の光るエフェクト
                this.drawBorderGlow(flashCount)
            }
            
            flashCount++
            
            if(flashCount >= maxFlashes){
                clearInterval(levelUpInterval)
                
                // フィニッシュエフェクト
                this.drawAll()
                this.drawLevelUpFinish(newLevel)
                
                setTimeout(() => {
                    this.isAnimating = false
                    this.updateScoreDisplay()
                    this.drawAll()
                }, 1000) // 1秒間フィニッシュエフェクトを表示
            }
        }, 120) // 少し速めに変更
    }

    // 星のエフェクト
    drawStars(){
        const starCount = 20
        this.mainCtx.fillStyle = '#FFFF00'
        
        for(let i = 0; i < starCount; i++){
            const x = Math.random() * SCREEN_WIDTH
            const y = Math.random() * SCREEN_HEIGHT
            const size = Math.random() * 3 + 2
            
            this.mainCtx.save()
            this.mainCtx.translate(x, y)
            this.mainCtx.rotate(Math.random() * Math.PI)
            
            // 星の形を描画
            this.mainCtx.beginPath()
            this.mainCtx.moveTo(0, -size)
            this.mainCtx.lineTo(size * 0.3, -size * 0.3)
            this.mainCtx.lineTo(size, 0)
            this.mainCtx.lineTo(size * 0.3, size * 0.3)
            this.mainCtx.lineTo(0, size)
            this.mainCtx.lineTo(-size * 0.3, size * 0.3)
            this.mainCtx.lineTo(-size, 0)
            this.mainCtx.lineTo(-size * 0.3, -size * 0.3)
            this.mainCtx.closePath()
            this.mainCtx.fill()
            
            this.mainCtx.restore()
        }
    }

    // 境界の光るエフェクト
    drawBorderGlow(flashCount){
        const intensity = Math.sin(flashCount * 0.5) * 0.5 + 0.5
        const glowWidth = 8
        
        this.mainCtx.strokeStyle = `rgba(255, 215, 0, ${intensity})`
        this.mainCtx.lineWidth = glowWidth
        this.mainCtx.strokeRect(glowWidth/2, glowWidth/2, 
                               SCREEN_WIDTH - glowWidth, SCREEN_HEIGHT - glowWidth)
    }

    // レベルアップ完了エフェクト
    drawLevelUpFinish(newLevel){
        this.mainCtx.save()
        
        // 金色の背景
        this.mainCtx.fillStyle = 'rgba(255, 215, 0, 0.2)'
        this.mainCtx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
        
        // 完了メッセージ
        this.mainCtx.translate(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)
        this.mainCtx.font = 'bold 20px Arial'
        this.mainCtx.fillStyle = '#FFD700'
        this.mainCtx.strokeStyle = '#000000'
        this.mainCtx.lineWidth = 2
        this.mainCtx.textAlign = 'center'
        
        const message = `Level ${newLevel} 突入！`
        this.mainCtx.strokeText(message, 0, 0)
        this.mainCtx.fillText(message, 0, 0)
        
        this.mainCtx.restore()
    }

    // ゲーム速度の更新
    updateGameSpeed(){
        // レベルが上がるにつれて速くなる
        this.gameSpeed = Math.max(50, GAME_SPEED - (this.level - 1) * 50)
        
        // タイマーを更新
        if(this.isPlaying){
            clearInterval(this.timer)
            this.timer = setInterval(() => this.dropMino(), this.gameSpeed)
        }
    }
    
    // 次の移動が可能かチェック（壁キック対応版）
    valid(moveX, moveY, rot=0){
        let newBlocks = this.mino.getNewBlocks(moveX, moveY, rot)
        return newBlocks.every(block => {
            return (
                block.x >= 0 &&
                block.y >= -1 &&
                block.x < COLS_COUNT &&
                block.y < ROWS_COUNT &&
                !this.field.has(block.x, block.y)
            )
        })
    }

    // 壁キック対応の回転処理
    tryRotate(){
        // O型（正方形）は回転しても同じなので処理を省略
        if(this.mino.type === 1) {
            return true // O型は常に回転成功として扱う
        }

        // 基本的な回転が可能かチェック
        if(this.valid(0, 0, 1)){
            this.mino.rotate()
            return true
        }

        // 壁キック試行（左右への移動を試す）
        const kickOffsets = [-1, 1, -2, 2] // 左1、右1、左2、右2の順で試行
        
        for(let offset of kickOffsets){
            if(this.valid(offset, 0, 1)){
                this.mino.x += offset
                this.mino.rotate()
                return true
            }
        }

        // I型ミノの特別処理（より大きな範囲での壁キック）
        if(this.mino.type === 0){ // I型
            const iKickOffsets = [-3, 3] // より大きな移動も試行
            for(let offset of iKickOffsets){
                if(this.valid(offset, 0, 1)){
                    this.mino.x += offset
                    this.mino.rotate()
                    return true
                }
            }
        }

        return false // 回転不可
    }

    // キーボードイベント
    setKeyEvent(){
        document.onkeydown = function(e){
            if (!this.isPlaying || this.isAnimating) return
            
            let moved = false
            switch(e.keyCode){
                case 37: // 左
                    if( this.valid(-1, 0)) {
                        this.mino.x--
                        moved = true
                    }
                    break;
                case 39: // 右
                    if( this.valid(1, 0)) {
                        this.mino.x++
                        moved = true
                    }
                    break;
                case 40: // 下
                    if( this.valid(0, 1) ) {
                        this.mino.y++
                        moved = true
                    }
                    break;
                case 32: // スペース
                    if( this.tryRotate()) {
                        moved = true
                    }
                    break;
            }
            if (moved) {
                this.drawAll()
            }
        }.bind(this)
    }

    // タッチ操作用のセットアップ
    setupTouchControls(){
        const leftBtn = document.getElementById('left-btn')
        const rightBtn = document.getElementById('right-btn')
        const downBtn = document.getElementById('down-btn')
        const rotateBtn = document.getElementById('rotate-btn')

        // ボタンごとの状態管理
        const createButtonHandler = (moveFunction) => {
            let isPressed = false
            let intervalId = null
            
            const startPress = (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!this.isPlaying || this.isAnimating || isPressed) return
                
                isPressed = true
                
                // 即座に1回実行
                moveFunction()
                
                // 長押し用の連続実行
                let delay = 300 // 初回遅延
                const repeat = () => {
                    if (!isPressed || !this.isPlaying) return
                    moveFunction()
                    delay = 120 // 2回目以降の間隔
                    intervalId = setTimeout(repeat, delay)
                }
                intervalId = setTimeout(repeat, delay)
            }
            
            const endPress = (e) => {
                e.preventDefault()
                isPressed = false
                if (intervalId) {
                    clearTimeout(intervalId)
                    intervalId = null
                }
            }
            
            return { startPress, endPress }
        }

        // 左移動ボタン
        if (leftBtn) {
            const leftHandler = createButtonHandler(() => {
                if (this.valid(-1, 0)) {
                    this.mino.x--
                    this.drawAll()
                }
            })
            
            leftBtn.addEventListener('touchstart', leftHandler.startPress)
            leftBtn.addEventListener('touchend', leftHandler.endPress)
            leftBtn.addEventListener('touchcancel', leftHandler.endPress)
            leftBtn.addEventListener('mousedown', leftHandler.startPress)
            leftBtn.addEventListener('mouseup', leftHandler.endPress)
            leftBtn.addEventListener('mouseleave', leftHandler.endPress)
        }

        // 右移動ボタン
        if (rightBtn) {
            const rightHandler = createButtonHandler(() => {
                if (this.valid(1, 0)) {
                    this.mino.x++
                    this.drawAll()
                }
            })
            
            rightBtn.addEventListener('touchstart', rightHandler.startPress)
            rightBtn.addEventListener('touchend', rightHandler.endPress)
            rightBtn.addEventListener('touchcancel', rightHandler.endPress)
            rightBtn.addEventListener('mousedown', rightHandler.startPress)
            rightBtn.addEventListener('mouseup', rightHandler.endPress)
            rightBtn.addEventListener('mouseleave', rightHandler.endPress)
        }

        // 下移動ボタン（高速落下）
        if (downBtn) {
            const downHandler = createButtonHandler(() => {
                if (this.valid(0, 1)) {
                    this.mino.y++
                    this.drawAll()
                }
            })
            
            downBtn.addEventListener('touchstart', downHandler.startPress)
            downBtn.addEventListener('touchend', downHandler.endPress)
            downBtn.addEventListener('touchcancel', downHandler.endPress)
            downBtn.addEventListener('mousedown', downHandler.startPress)
            downBtn.addEventListener('mouseup', downHandler.endPress)
            downBtn.addEventListener('mouseleave', downHandler.endPress)
        }

        // 回転ボタン（長押し対応、間隔を長めに設定）
        if (rotateBtn) {
            const rotateHandler = createButtonHandler(() => {
                if (this.valid(0, 0, 1)) {
                    this.mino.rotate()
                    this.drawAll()
                }
            })
            
            // 回転は誤操作防止のため、より長い間隔で設定
            const createRotateHandler = (moveFunction) => {
                let isPressed = false
                let intervalId = null
                
                const startPress = (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!this.isPlaying || this.isAnimating || isPressed) return
                    
                    isPressed = true
                    
                    // 即座に1回実行
                    moveFunction()
                    
                    // 長押し用の連続実行（回転は間隔を長めに）
                    let delay = 500 // 初回遅延を長く
                    const repeat = () => {
                        if (!isPressed || !this.isPlaying) return
                        moveFunction()
                        delay = 300 // 2回目以降も長めの間隔
                        intervalId = setTimeout(repeat, delay)
                    }
                    intervalId = setTimeout(repeat, delay)
                }
                
                const endPress = (e) => {
                    e.preventDefault()
                    isPressed = false
                    if (intervalId) {
                        clearTimeout(intervalId)
                        intervalId = null
                    }
                }
                
                return { startPress, endPress }
            }
            
            const rotateHandler2 = createRotateHandler(() => {
                if (this.tryRotate()) {
                    this.drawAll()
                }
            })
            
            rotateBtn.addEventListener('touchstart', rotateHandler2.startPress)
            rotateBtn.addEventListener('touchend', rotateHandler2.endPress)
            rotateBtn.addEventListener('touchcancel', rotateHandler2.endPress)
            rotateBtn.addEventListener('mousedown', rotateHandler2.startPress)
            rotateBtn.addEventListener('mouseup', rotateHandler2.endPress)
            rotateBtn.addEventListener('mouseleave', rotateHandler2.endPress)
        }
    }

    // ゲームオーバー画面を表示
    showGameOver(){
        // 最終スコアを表示
        document.getElementById('final-score').textContent = this.score.toLocaleString()
        document.getElementById('final-lines').textContent = this.lines.toString()
        document.getElementById('final-level').textContent = this.level.toString()
        
        // オーバーレイを表示
        const overlay = document.getElementById('game-over-overlay')
        overlay.classList.remove('hidden')
        overlay.classList.add('show')
        
        // リスタートボタンのイベント設定
        document.getElementById('restart-btn').onclick = () => {
            this.restart()
        }
    }

    // ゲーム再開
    restart(){
        // 既存のタイマーを確実に停止
        if(this.timer){
            clearInterval(this.timer)
            this.timer = null
        }
        
        // オーバーレイを非表示
        const overlay = document.getElementById('game-over-overlay')
        overlay.classList.add('hidden')
        overlay.classList.remove('show')
        
        // ゲーム状態をリセット
        this.score = 0
        this.lines = 0
        this.level = 1
        this.gameSpeed = GAME_SPEED  // ゲーム速度を初期値にリセット
        this.isPlaying = false
        this.isAnimating = false
        
        // フィールドをクリア
        this.field.blocks = []
        
        // 画面をクリア
        this.drawAll()
        
        // スコア表示を更新
        this.updateScoreDisplay()
        
        // 新しいゲームを開始準備
        this.popMino()
        this.isPlaying = true
        
        // タイマー再開
        this.timer = setInterval(this.dropMino.bind(this), this.gameSpeed)
    }
}

class Block{
    // 基準地点からの座標
    // 移動中 ⇒ Minoの左上
    // 配置後 ⇒ Fieldの左上
    constructor(x, y, type){
        this.x = x
        this.y = y
        
        // 描画しないときはタイプを指定しない
        if(type >= 0) this.setType(type)
    }

    setType(type){
        this.type = type
        this.image = Asset.blockImages[type]
    }

    // Minoに属するときは、Minoの位置をオフセットに指定
    // Fieldに属するときは、(0,0)を起点とするので不要
    draw(offsetX = 0, offsetY = 0, ctx){
        let drawX = this.x + offsetX
        let drawY = this.y + offsetY

        // 画面外は描画しない
        if(drawX >= 0 && drawX < COLS_COUNT &&
           drawY >= 0 && drawY < ROWS_COUNT){
            ctx.drawImage(
                this.image, 
                drawX * BLOCK_SIZE, 
                drawY * BLOCK_SIZE,
                BLOCK_SIZE, 
                BLOCK_SIZE
            )
        }
    }

    // 次のミノを描画する
    // タイプごとに余白を調整して、中央に表示
    drawNext(ctx){
        let offsetX = 0
        let offsetY = 0
        switch(this.type){
            case 0:
                offsetX = 0.5
                offsetY = 0
                break;
            case 1:
                offsetX = 0.5
                offsetY = 0.5
                break;
            default:
                offsetX = 1
                offsetY = 0.5
                break;
        }

        ctx.drawImage(
            this.image, 
            (this.x + offsetX) * BLOCK_SIZE, 
            (this.y + offsetY) * BLOCK_SIZE,
            BLOCK_SIZE, 
            BLOCK_SIZE
        )
    }
}

class Mino{
    constructor(){
        this.type = 0; // I字型（長いライン）のミノのみ
        this.initBlocks()
    }

    initBlocks(){
        let t = this.type
        switch(t){
            case 0: // I型
                this.blocks = [new Block(0,2,t),new Block(1,2,t),new Block(2,2,t),new Block(3,2,t)]
                break;
            case 1: // O型
                this.blocks = [new Block(1,1,t),new Block(2,1,t),new Block(1,2,t),new Block(2,2,t)]
                break;
            case 2: // T型
                this.blocks = [new Block(1,1,t),new Block(0,2,t),new Block(1,2,t),new Block(2,2,t)]
                break;
            case 3: // J型
                this.blocks = [new Block(1,1,t),new Block(0,2,t),new Block(1,2,t),new Block(2,2,t)]
                break;
            case 4: // L型
                this.blocks = [new Block(2,1,t),new Block(0,2,t),new Block(1,2,t),new Block(2,2,t)]
                break;
            case 5: // S型
                this.blocks = [new Block(1,1,t),new Block(2,1,t),new Block(0,2,t),new Block(1,2,t)]
                break;
            case 6: // Z型
                this.blocks = [new Block(0,1,t),new Block(1,1,t),new Block(1,2,t),new Block(2,2,t)]
                break;
            }
    }

    // フィールドに生成する
    spawn(){
        this.x = COLS_COUNT/2 - 2
        this.y = -3
    }

    // フィールドに描画する
    draw(ctx){
        this.blocks.forEach(block => {
            block.draw(this.x, this.y, ctx)
        })
    }

    // 次のミノを描画する
    drawNext(ctx){
        this.blocks.forEach(block => {
            block.drawNext(ctx)
        })
    }
    
    // 回転させる
    rotate(){
        this.blocks.forEach(block=>{
            let oldX = block.x
            block.x = block.y
            block.y = 3-oldX
        })
    }

    // 次に移動しようとしている位置の情報を持ったミノを生成
    // 描画はせず、移動が可能かどうかの判定に使用する
    getNewBlocks(moveX, moveY, rot){
        let newBlocks = this.blocks.map(block=>{
            return new Block(block.x, block.y)
        })
        newBlocks.forEach(block => {
            // 回転させる場合（移動より先に処理）
            if(rot){
                let oldX = block.x
                block.x = block.y
                block.y = 3-oldX
            }

            // 移動させる場合
            if(moveX || moveY){
                block.x += moveX
                block.y += moveY
            }

            // グローバル座標に変換
            block.x += this.x
            block.y += this.y
        })
        
        return newBlocks
    }
}

class Field{
    constructor(){
        this.blocks = []
    }

    drawFixedBlocks(ctx){
        this.blocks.forEach(block => block.draw(0, 0, ctx))
    }

    checkLine(){
      let completedLines = []
      
      // 完成したラインを特定
      for(var r = 0; r < ROWS_COUNT; r++){
        var c = this.blocks.filter(block => block.y === r).length
        if(c === COLS_COUNT){
          completedLines.push(r)
        }
      }
      
      return completedLines
    }

    // ライン消去の実際の処理
    clearLines(linesToClear){
      // 指定されたラインを削除
      linesToClear.forEach(line => {
        this.blocks = this.blocks.filter(block => block.y !== line)
        // 上のブロックを下に移動
        this.blocks.filter(block => block.y < line).forEach(upper => upper.y++)
      })
    }

    has(x, y){
        return this.blocks.some(block => block.x == x && block.y == y)
    }
}