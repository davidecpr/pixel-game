// js/app.js
// Gestisce navigazione, full-screen e ridimensionamento
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const menuScreenSection = document.getElementById('menu-screen-section');
    const editorScreenSection = document.getElementById('editor-screen-section');
    const playScreenSection = document.getElementById('play-screen-section');
    const playScreen = document.getElementById('play-screen'); // Il contenitore del gioco e del pannello comandi

    const btnEditor = document.getElementById('btn-editor');
    const btnPlay = document.getElementById('btn-play');
    const mapSelectionContainer = document.getElementById('map-selection-container');
    const mapListContainer = document.getElementById('map-list-container');
    const btnStartGame = document.getElementById('btn-start-game');
    let selectedMapData = null;

    // Elementi del nuovo pannello comandi
    const commandPanel = document.getElementById('command-panel');

    const editorCanvas = document.getElementById('editor-canvas');
    const gameCanvas = document.getElementById('game-canvas');

    // --- Funzioni di utility ---
    function requestFullScreen(element) {
        if (element.requestFullscreen) element.requestFullscreen();
        else if (element.mozRequestFullScreen) element.mozRequestFullScreen(); /* Firefox */
        else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen(); /* Chrome, Safari & Opera */
        else if (element.msRequestFullscreen) element.msRequestFullscreen(); /* IE/Edge */
    }

    function showScreen(screenId) {
        [menuScreenSection, editorScreenSection, playScreenSection].forEach(section => {
            if (section.id === screenId) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
    }

    // --- Gestione Canvas ---
    function updateCanvasResolution(canvas) {
        if (!canvas) return;
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        if ((canvas.width !== displayWidth || canvas.height !== displayHeight) && displayWidth > 0 && displayHeight > 0) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            // Chiama le funzioni di redraw specifiche se esistono globalmente
            if (canvas.id === 'editor-canvas' && typeof window.redrawEditorCanvas === 'function') {
                window.redrawEditorCanvas();
            }
            if (canvas.id === 'game-canvas' && typeof game !== 'undefined' && game.redrawGameCanvas) {
                game.redrawGameCanvas();
            }
        } else if (displayWidth <= 0 || displayHeight <= 0) {
            requestAnimationFrame(() => updateCanvasResolution(canvas));
        }
    }

    function resizeCanvases() { // Rinominata da scheduleCanvasResize per chiarezza
        [editorCanvas, gameCanvas].forEach(canvas => {
            if (canvas) {
                requestAnimationFrame(() => updateCanvasResolution(canvas));
            }
        });
    }

    window.addEventListener('resize', resizeCanvases);
    setTimeout(resizeCanvases, 50); // Chiamata iniziale

    // --- Navigazione tra schermate ---
    btnEditor.onclick = () => {
        showScreen('editor-screen-section');
        resizeCanvases();
    };

    btnPlay.onclick = () => {
        showScreen('play-screen-section');
        mapSelectionContainer.classList.remove('hidden');
        playScreen.classList.add('hidden'); // Nasconde l'area di gioco
        populateMapList();
        resizeCanvases(); 
    };

    const btnBackMenu1 = document.getElementById('back-menu-1'); // Da editor
    const btnBackMenu2 = document.getElementById('back-menu-2'); // Da selezione mappa
    const btnBackMenuFromGame = document.getElementById('back-menu-from-game'); // Da gioco

    [btnBackMenu1, btnBackMenu2, btnBackMenuFromGame].forEach(btn => {
        if(btn) btn.addEventListener('click', () => showScreen('menu-screen-section'));
    });

    // --- Logica Selezione Mappa ---
    function populateMapList() {
        mapListContainer.innerHTML = '';
        btnStartGame.disabled = true;
        selectedMapData = null;
        const maps = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('map_')) {
                try {
                    const mapData = JSON.parse(localStorage.getItem(key));
                    if (mapData && mapData.name && mapData.mapData) maps.push(mapData);
                } catch (e) { console.error(`Errore parsing mappa ${key}:`, e); }
            }
        }

        if (maps.length === 0) {
            mapListContainer.innerHTML = '<p>Nessuna mappa creata. Vai all\'editor!</p>';
            return;
        }

        maps.forEach(map => {
            const mapItem = document.createElement('div');
            mapItem.classList.add('map-list-item', 'btn');
            mapItem.textContent = map.name;
            mapItem.addEventListener('click', () => {
                document.querySelectorAll('.map-list-item.selected').forEach(item => item.classList.remove('selected'));
                mapItem.classList.add('selected');
                selectedMapData = map;
                btnStartGame.disabled = false;
            });
            mapListContainer.appendChild(mapItem);
        });
    }

    btnStartGame.addEventListener('click', () => {
        if (selectedMapData) {
            mapSelectionContainer.classList.add('hidden');
            playScreen.classList.remove('hidden'); // Mostra l'area di gioco
            
            if (typeof game !== 'undefined' && game.startGameWithMapData) {
                game.startGameWithMapData(selectedMapData);
            } else {
                console.error('Funzione game.startGameWithMapData non trovata.');
                alert('Errore nell\'avviare il gioco. Controlla la console.');
            }
            resizeCanvases();
        } else {
            alert('Per favore, seleziona una mappa per iniziare.');
        }
    });

});