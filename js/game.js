// js/game.js
const game = (() => { // Aggiungo l'assegnazione a game
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const gameOverlay = document.getElementById('game-overlay'); // Rinominato da overlay
    const overlayMessage = document.getElementById('overlay-message'); // Rinominato da msg

    let currentMapData = null; // Conterrà { name, rows, cols, mapData: gridData }
    let player = { x: 0, y: 0, dir: 0 }; // dir: 0=su, 1=dx, 2=giu, 3=sx
    let trophy = { x: 0, y: 0 };
    let CELL_SIZE = 20; // Valore di default, sarà ricalcolato
    let gameWon = false;
    let gameLost = false;

    let commandQueue = [];
    let isSequenceRunning = false;

    // Carica immagini asset e player
    const assets = {};
    window.assetList.forEach(a => {
        const img = new Image();
        img.src = a.url;
        assets[a.key] = img;
    });
    const playerImg = new Image();
    playerImg.src = 'https://raw.githubusercontent.com/mineatar-io/skin-render/main/steve.png';



    function calculateCellSizeAndDraw() {
        if (!canvas || canvas.width === 0 || canvas.height === 0 || !currentMapData) {
            return;
        }
        CELL_SIZE = Math.floor(Math.min(canvas.width / currentMapData.cols, canvas.height / currentMapData.rows));
        CELL_SIZE = Math.max(1, CELL_SIZE); // Assicura CELL_SIZE sia almeno 1
        drawGame();
    }

    // Esposta per app.js per ridisegnare quando il canvas diventa visibile/ridimensionato
    function redrawGameCanvas() {
        calculateCellSizeAndDraw();
    }



    function startGameWithMapData(mapData) {
        if (!mapData || !mapData.mapData) {
            console.error("Dati mappa non validi per iniziare il gioco.");
            alert("Impossibile caricare la mappa selezionata.");
            // Potrebbe essere utile tornare alla schermata di selezione o al menu
            if (typeof window.showScreen === 'function') {
                 // Assumendo che showScreen sia globale o accessibile
                 // window.showScreen('menu-screen-section'); 
            }
            return;
        }
        currentMapData = JSON.parse(JSON.stringify(mapData)); // Deep copy per evitare modifiche accidentali
        
        // Sovrascrivi ROWS, COLS con quelle della mappa caricata
        // Queste costanti globali nel modulo game.js non possono essere riassegnate direttamente
        // se definite con const/let a livello di modulo. Le useremo tramite currentMapData.
        // Perciò, CELL_SIZE e il disegno dovranno usare currentMapData.rows e currentMapData.cols

        // Trova la posizione iniziale del giocatore e del trofeo
        // e inizializza la griglia di gioco (mapGrid)
        initializeGridAndEntities(); 

        // Resetta stati di gioco
        gameWon = false;
        gameLost = false;
        gameOverlay.classList.add('hidden');

        // Rimuovi la gestione degli eventi in tempo reale
        window.removeEventListener('keydown', handleKeydown);

        // Pulisci e riattacca listener per i bottoni dell'overlay (se necessario)
        // Per ora, l'overlay ha solo il messaggio e il bottone di restart.
        const restartBtn = document.getElementById('restart-game-btn');
        if (restartBtn) {
            const newRestartBtn = restartBtn.cloneNode(true);
            restartBtn.parentNode.replaceChild(newRestartBtn, restartBtn);
            newRestartBtn.addEventListener('click', () => {
                if(currentMapData) startGameWithMapData(currentMapData); // Riavvia con la stessa mappa
            });
        }


        console.log("Gioco avviato con la mappa:", currentMapData.name);
        calculateCellSizeAndDraw(); // Calcola e disegna la prima volta
    }

    function initializeGridAndEntities() {
        // mapGrid ora sarà currentMapData.mapData
        // Trova giocatore e trofeo
        let playerFound = false;
        let trophyFound = false;
        for (let r = 0; r < currentMapData.rows; r++) {
            for (let c = 0; c < currentMapData.cols; c++) {
                if (currentMapData.mapData[r][c] === 'player') {
                    player = { x: c, y: r };
                    playerFound = true;
                }
                if (currentMapData.mapData[r][c] === 'trophy') {
                    trophy = { x: c, y: r };
                    trophyFound = true;
                }
            }
        }
        if (!playerFound) {
            console.warn("Giocatore non trovato nella mappa, lo posiziono in 0,0");
            player = { x: 0, y: 0 };
            if(currentMapData.mapData[0][0] === 'wall') currentMapData.mapData[0][0] = 'empty'; // Assicura che non sia un muro
        }
        if (!trophyFound) {
            console.warn("Trofeo non trovato nella mappa, lo posiziono all'opposto del giocatore o in 1,1");
            trophy = { x: currentMapData.cols -1, y: currentMapData.rows - 1};
            if(player.x === trophy.x && player.y === trophy.y) trophy = {x:1, y:1};
            if(currentMapData.mapData[trophy.y][trophy.x] === 'wall') currentMapData.mapData[trophy.y][trophy.x] = 'empty';
        }
    }

    function drawGame(){
        if (!ctx || !currentMapData || !currentMapData.mapData || !player) {
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Disegna la mappa
        for (let r = 0; r < currentMapData.rows; r++) {
            for (let c = 0; c < currentMapData.cols; c++) {
                const assetKey = currentMapData.mapData[r][c];
                if (assets[assetKey] && assets[assetKey].complete) {
                    ctx.drawImage(assets[assetKey], c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                } else if (assetKey !== 'empty' && assetKey !== 'player' && assetKey !== 'trophy') {
                    // Fallback se l'asset non è caricato o la chiave non esiste
                    ctx.fillStyle = 'gray';
                    ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }

        // Disegna il giocatore
        if (playerImg.complete) {
            ctx.drawImage(playerImg, player.x * CELL_SIZE, player.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }

        // Disegna il trofeo (se non è stato 'raccolto' dal giocatore)
        if (currentMapData.mapData[trophy.y][trophy.x] === 'trophy' && assets.trophy.complete) {
             ctx.drawImage(assets.trophy, trophy.x * CELL_SIZE, trophy.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }

        if (gameWon) {
            showOverlayMessage("Hai Vinto!");
        } else if (gameLost) {
            showOverlayMessage("Hai Perso!");
        }
    }

    

    


    function movePlayer() {
        if (gameWon || gameLost) return;

        let newX = player.x;
        let newY = player.y;

        // Calcola la nuova posizione basata sulla direzione
        // dir: 0=su, 1=dx, 2=giu, 3=sx
        if (player.dir === 0) newY -= 1; // Su
        else if (player.dir === 1) newX += 1; // Destra
        else if (player.dir === 2) newY += 1; // Giù
        else if (player.dir === 3) newX -= 1; // Sinistra

        // Controllo dei limiti della mappa
        if (newX < 0 || newX >= currentMapData.cols || newY < 0 || newY >= currentMapData.rows) {
            return; // Movimento fuori mappa non permesso
        }

        const targetCell = currentMapData.mapData[newY][newX];

        // Controllo collisioni con ostacoli
        if (targetCell === 'wall' || targetCell === 'tree' || targetCell === 'water') {
            gameLost = true;
            calculateCellSizeAndDraw();
            return;
        }

        // Aggiorna la mappa (la vecchia cella del giocatore diventa 'empty')
        currentMapData.mapData[player.y][player.x] = 'empty';
        player.x = newX;
        player.y = newY;
        // Non rimettiamo 'player' nella mappa, lo disegniamo sopra

        // Controllo vittoria
        if (player.x === trophy.x && player.y === trophy.y) {
            gameWon = true;
            // Rimuovi il trofeo dalla mappa logica se vuoi che scompaia
            // currentMapData.mapData[trophy.y][trophy.x] = 'empty'; 
        }
        calculateCellSizeAndDraw(); // Ridisegna dopo ogni mossa valida
    }

    function showOverlayMessage(message) {
        if(overlayMessage) overlayMessage.textContent = message;
        if(gameOverlay) gameOverlay.classList.remove('hidden');
        // Nascondi i controlli di gioco quando l'overlay è mostrato
        const playControls = document.getElementById('play-controls');
        if(playControls) playControls.classList.add('hidden');
    }

    // Gestione caricamento assets (semplificata, il disegno avviene on-demand)
    let allAssetsLoaded = false;
    const totalAssetImages = window.assetList.length + 1; // +1 per playerImg
    let loadedAssetImages = 0;

    function checkAllAssetsLoaded() {
        loadedAssetImages++;
        if (loadedAssetImages >= totalAssetImages) {
            allAssetsLoaded = true;
            console.log("Tutti gli asset grafici caricati.");
            // Se c'è una mappa corrente e il gioco è in attesa di disegno, ridisegna.
            if (currentMapData && (gameWon || gameLost || !gameOverlay.classList.contains('hidden') )) {
                 // Non ridisegnare automaticamente qui a meno che non sia strettamente necessario
                 // Il primo disegno avviene con calculateCellSizeAndDraw() in startGameWithMapData
            }
        }
    }

    window.assetList.forEach(a => {
        if (assets[a.key]) { // Verifica che l'asset esista prima di assegnare onload
            assets[a.key].onload = checkAllAssetsLoaded;
            assets[a.key].onerror = () => { 
                console.error(`Errore caricamento asset: ${a.key}`); 
                checkAllAssetsLoaded(); // Conta anche gli errori per non bloccare
            };
        } else {
            console.warn(`Asset key '${a.key}' definito in assetList ma non trovato in assets object.`);
            checkAllAssetsLoaded(); // Consideralo 'caricato' per non bloccare il conteggio
        }
    });
    playerImg.onload = checkAllAssetsLoaded;
    playerImg.onerror = () => { console.error('Errore caricamento immagine giocatore'); checkAllAssetsLoaded(); };

    // Se per qualche motivo non ci sono immagini (improbabile)
    if (totalAssetImages === 0) {
        allAssetsLoaded = true;
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function addCommandToQueue(command) {
        if (isSequenceRunning) return;
        commandQueue.push(command);
        updateCommandListUI();
    }

    function clearCommandQueue() {
        if (isSequenceRunning) return;
        commandQueue = [];
        updateCommandListUI();
    }

    function updateCommandListUI() {
        const listContainer = document.getElementById('command-sequence-list');
        listContainer.innerHTML = '';
        if (commandQueue.length === 0) {
            listContainer.innerHTML = '<p>Aggiungi comandi...</p>';
            return;
        }
        commandQueue.forEach(cmd => {
            const commandItem = document.createElement('div');
            commandItem.className = 'command-item';
            commandItem.textContent = cmd.charAt(0).toUpperCase() + cmd.slice(1);
            listContainer.appendChild(commandItem);
        });
    }

    async function runCommandQueue() {
        if (isSequenceRunning || commandQueue.length === 0) return;

        isSequenceRunning = true;
        toggleCommandButtons(false); // Disabilita i pulsanti

        for (const command of commandQueue) {
            if (gameWon || gameLost) break; // Interrompi se il gioco è finito
            // La logica di movimento è già in handleCommand, che chiama movePlayer, che chiama drawGame
            if (command === 'avanti') {
                movePlayer();
            } else if (command === 'destra') {
                player.dir = (player.dir + 1) % 4;
                drawGame();
            } else if (command === 'sinistra') {
                player.dir = (player.dir + 3) % 4;
                drawGame();
            }
            await sleep(500); // Pausa di 500ms tra i comandi
        }

        isSequenceRunning = false;
        toggleCommandButtons(true); // Riabilita i pulsanti
    }

    function toggleCommandButtons(enabled) {
        document.querySelectorAll('#command-panel button').forEach(btn => {
            // Non disabilitare il tasto "Torna al Menu"
            if (btn.id !== 'back-menu-from-game') {
                btn.disabled = !enabled;
            }
        });
    }

    function initializeCommandPanel() {
        const commandButtons = document.querySelectorAll('.command-buttons button[data-cmd]');
        commandButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', () => addCommandToQueue(newButton.dataset.cmd));
        });

        const runBtn = document.getElementById('run-sequence');
        const newRunBtn = runBtn.cloneNode(true);
        runBtn.parentNode.replaceChild(newRunBtn, runBtn);
        newRunBtn.addEventListener('click', runCommandQueue);

        const clearBtn = document.getElementById('clear-sequence');
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        newClearBtn.addEventListener('click', clearCommandQueue);
        
        clearCommandQueue();
        toggleCommandButtons(true);
    }

    // Espone le funzioni necessarie
    return {
        startGameWithMapData,
        redrawGameCanvas, // Esposta per app.js
        initializeCommandPanel
    };
})();