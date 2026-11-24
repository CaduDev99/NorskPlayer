const openDrawerBtn = document.getElementById('open-drawer-btn');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const navDrawer = document.getElementById('nav-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');

const navAllSongsBtn = document.getElementById('nav-all-songs');
const navPlaylistsBtn = document.getElementById('nav-playlists');

const playerPanel = document.getElementById('player-panel');
const minimizePlayerBtn = document.getElementById('minimize-player-btn');

const mobileMiniPlayer = document.getElementById('mobile-mini-player');
const miniPlayerExpand = document.getElementById('mini-player-expand');
const miniVinyl = document.getElementById('mini-vinyl');
const miniTrackTitle = document.getElementById('mini-track-title');
const miniTrackArtist = document.getElementById('mini-track-artist');
const miniPlayBtn = document.getElementById('mini-play-btn');
const miniNextBtn = document.getElementById('mini-next-btn');

const fileUpload = document.getElementById('file-upload');
const viewTitle = document.getElementById('view-title');
const panelActions = document.getElementById('panel-actions');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const contentList = document.getElementById('content-list');

const addSongsModal = document.getElementById('add-songs-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalSongList = document.getElementById('modal-song-list');
const confirmAddSongsBtn = document.getElementById('confirm-add-songs-btn');

const audioPlayer = document.getElementById('audio-player');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const vinyl = document.getElementById('vinyl');

const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');

const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const volumeBar = document.getElementById('volume-bar');

const visualizerCanvas = document.getElementById('visualizer-canvas');
const canvasCtx = visualizerCanvas.getContext('2d');
const bassBtn = document.getElementById('bass-btn');
const sleepBtn = document.getElementById('sleep-btn');
const tavernBtn = document.getElementById('tavern-btn');

const tavernModal = document.getElementById('tavern-modal');
const closeTavernBtn = document.getElementById('close-tavern-btn');
const sleepModal = document.getElementById('sleep-modal');
const closeSleepBtn = document.getElementById('close-sleep-btn');
const sleepBadge = document.getElementById('sleep-badge');
const sleepCountdown = document.getElementById('sleep-countdown');
const customSleepInput = document.getElementById('custom-sleep-input');
const setCustomSleepBtn = document.getElementById('set-custom-sleep-btn');
const playIconSVG = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const pauseIconSVG = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
const miniPlaySVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const miniPauseSVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

let deviceSongs = [];
let activeQueue = [];
let playlists = JSON.parse(localStorage.getItem('norse_playlists')) || {};

let currentView = 'all';
let selectedPlaylist = null;
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0;

const audioExtensions = /\.(mp3|wav|ogg|m4a|flac|aac|wma|opus)$/i;

let audioCtx = null;
let analyser = null;
let bassFilter = null;
let isBassBoost = false;
let useFallbackVisualizer = false;
const ambientNodes = {};

function getAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function initAudioEngine() {
    const ctx = getAudioContext();
    if (analyser || useFallbackVisualizer) return;

    try {
        const source = ctx.createMediaElementSource(audioPlayer);
        bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 140;
        bassFilter.gain.value = isBassBoost ? 12 : 0;

        analyser = ctx.createAnalyser();
        analyser.fftSize = 128;

        source.connect(bassFilter);
        bassFilter.connect(analyser);
        analyser.connect(ctx.destination);
    } catch (e) {
        useFallbackVisualizer = true;
    }
}

let wavePhase = 0;
function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    if (!isPlaying) return;

    const cx = visualizerCanvas.width / 2;
    const cy = visualizerCanvas.height / 2;
    const radius = 96;
    const bars = 48;
    let dataArray = new Uint8Array(bars);

    if (analyser && !useFallbackVisualizer) {
        analyser.getByteFrequencyData(dataArray);
    } else {
        wavePhase += 0.14;
        for (let i = 0; i < bars; i++) {
            const pulse = Math.sin(wavePhase + i * 0.45) * 0.5 + 0.5;
            const boost = isBassBoost ? 1.35 : 0.85;
            dataArray[i] = Math.min(255, Math.floor((pulse * 160 + 40) * boost));
        }
    }

    for (let i = 0; i < bars; i++) {
        const value = dataArray[i] || 0;
        const barHeight = (value / 255) * 28;
        const angle = (i / bars) * Math.PI * 2;

        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + barHeight);
        const y2 = cy + Math.sin(angle) * (radius + barHeight);

        canvasCtx.strokeStyle = isBassBoost ? '#ff7b39' : (value > 180 ? '#f2c47c' : 'rgba(212, 163, 89, 0.8)');
        canvasCtx.lineWidth = 3;
        canvasCtx.beginPath();
        canvasCtx.moveTo(x1, y1);
        canvasCtx.lineTo(x2, y2);
        canvasCtx.stroke();
    }
}
drawVisualizer();

bassBtn.addEventListener('click', () => {
    initAudioEngine();
    isBassBoost = !isBassBoost;
    bassBtn.classList.toggle('perk-active', isBassBoost);
    if (bassFilter) {
        bassFilter.gain.value = isBassBoost ? 12 : 0;
    } else {
        audioPlayer.volume = Math.min(1, parseFloat(volumeBar.value) * (isBassBoost ? 1.15 : 1));
    }
});
function toggleAmbientSound(type, btnEl) {
    const ctx = getAudioContext();

    if (ambientNodes[type]) {
        ambientNodes[type].source.stop();
        delete ambientNodes[type];
        btnEl.classList.remove('active-ambient');
        updateTavernButtonState();
        return;
    }

    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain') {
            data[i] = (lastOut + (0.08 * white)) / 1.08;
            lastOut = data[i];
        } else if (type === 'wind') {
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
        } else {
            data[i] = Math.random() > 0.994 ? white * 0.95 : (lastOut + (0.04 * white)) / 1.04;
            lastOut = data[i];
        }
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = type === 'wind' ? 'bandpass' : 'lowpass';
    filter.frequency.value = type === 'rain' ? 950 : (type === 'wind' ? 320 : 650);

    const gainNode = ctx.createGain();
    const slider = document.querySelector(`.ambient-vol[data-sound="${type}"]`);
    gainNode.gain.value = slider ? parseFloat(slider.value) : 0.3;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    noise.start();

    ambientNodes[type] = { source: noise, gain: gainNode };
    btnEl.classList.add('active-ambient');
    updateTavernButtonState();
}

function updateTavernButtonState() {
    tavernBtn.classList.toggle('perk-active', Object.keys(ambientNodes).length > 0);
}

tavernBtn.addEventListener('click', () => tavernModal.classList.add('open'));
closeTavernBtn.addEventListener('click', () => tavernModal.classList.remove('open'));

document.querySelectorAll('.ambient-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleAmbientSound(btn.dataset.sound, btn));
});

document.querySelectorAll('.ambient-vol').forEach(slider => {
    slider.addEventListener('input', () => {
        const node = ambientNodes[slider.dataset.sound];
        if (node) node.gain.gain.value = parseFloat(slider.value);
    });
});

let sleepInterval = null;
let sleepSecondsLeft = 0;

function startSleepTimer(mins) {
    clearInterval(sleepInterval);
    sleepModal.classList.remove('open');

    if (!mins || mins <= 0) {
        sleepBadge.classList.add('hidden');
        sleepBtn.classList.remove('perk-active');
        audioPlayer.volume = parseFloat(volumeBar.value);
        return;
    }

    sleepSecondsLeft = Math.round(mins * 60);
    sleepBadge.classList.remove('hidden');
    sleepBtn.classList.add('perk-active');
    updateSleepDisplay();

    sleepInterval = setInterval(() => {
        sleepSecondsLeft--;
        updateSleepDisplay();

        if (sleepSecondsLeft <= 15 && sleepSecondsLeft > 0) {
            const targetVol = parseFloat(volumeBar.value) * (sleepSecondsLeft / 15);
            audioPlayer.volume = Math.max(0, targetVol);
        }

        if (sleepSecondsLeft <= 0) {
            clearInterval(sleepInterval);
            pauseSong();
            audioPlayer.volume = parseFloat(volumeBar.value);
            sleepBadge.classList.add('hidden');
            sleepBtn.classList.remove('perk-active');
        }
    }, 1000);
}

sleepBtn.addEventListener('click', () => sleepModal.classList.add('open'));
closeSleepBtn.addEventListener('click', () => sleepModal.classList.remove('open'));

document.querySelectorAll('.sleep-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mins = parseInt(btn.dataset.mins, 10);
        startSleepTimer(mins);
    });
});

setCustomSleepBtn.addEventListener('click', () => {
    const customMins = parseFloat(customSleepInput.value);
    if (customMins && customMins > 0) {
        startSleepTimer(customMins);
        customSleepInput.value = '';
    } else {
        alert("Digite um número válido de minutos (ex: 3, 25, 90).");
    }
});

function updateSleepDisplay() {
    const m = Math.floor(sleepSecondsLeft / 60);
    const s = sleepSecondsLeft % 60;
    sleepCountdown.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
}
function openDrawer() {
    navDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
}

function closeDrawer() {
    navDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
}

openDrawerBtn.addEventListener('click', openDrawer);
closeDrawerBtn.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

miniPlayerExpand.addEventListener('click', () => playerPanel.classList.add('maximized'));
minimizePlayerBtn.addEventListener('click', () => playerPanel.classList.remove('maximized'));

navAllSongsBtn.addEventListener('click', () => {
    currentView = 'all';
    selectedPlaylist = null;
    navAllSongsBtn.classList.add('active');
    navPlaylistsBtn.classList.remove('active');
    playerPanel.classList.remove('maximized');
    closeDrawer();
    renderView();
});

navPlaylistsBtn.addEventListener('click', () => {
    currentView = 'playlists';
    selectedPlaylist = null;
    navPlaylistsBtn.classList.add('active');
    navAllSongsBtn.classList.remove('active');
    playerPanel.classList.remove('maximized');
    closeDrawer();
    renderView();
});

fileUpload.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(f =>
        f.type.startsWith('audio/') || audioExtensions.test(f.name)
    );
    files.forEach(file => {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        if (!deviceSongs.some(s => s.name === cleanName)) {
            deviceSongs.push({ name: cleanName, url: URL.createObjectURL(file) });
        }
    });
    e.target.value = '';
    renderView();
});

searchInput.addEventListener('input', renderView);

function savePlaylists() {
    localStorage.setItem('norse_playlists', JSON.stringify(playlists));
}

function renderView() {
    panelActions.innerHTML = '';
    contentList.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();

    if (currentView === 'all') {
        searchContainer.style.display = 'block';
        const filtered = deviceSongs.filter(s => s.name.toLowerCase().includes(query));
        viewTitle.textContent = `Todas as Músicas (${filtered.length})`;

        if (filtered.length === 0) {
            contentList.innerHTML = '<li class="empty-msg">Nenhuma música detectada ainda.<br>Clique no botão acima para carregar faixas.</li>';
            return;
        }

        filtered.forEach((song, idx) => {
            const li = document.createElement('li');
            if (audioPlayer.src === song.url) li.classList.add('active');

            const span = document.createElement('span');
            span.className = 'item-title';
            span.textContent = `${idx + 1}. ${song.name}`;
            li.appendChild(span);

            li.addEventListener('click', () => {
                activeQueue = [...filtered];
                loadSong(idx, 'Todas as Músicas');
                playSong();
            });
            contentList.appendChild(li);
        });
    } else if (currentView === 'playlists') {
        searchContainer.style.display = 'none';
        const plNames = Object.keys(playlists);
        viewTitle.textContent = `Playlists (${plNames.length})`;

        const createBtn = document.createElement('button');
        createBtn.className = 'rustic-btn';
        createBtn.textContent = '+ Nova Playlist';
        createBtn.addEventListener('click', () => {
            const name = prompt("Nome da nova playlist:");
            if (name && name.trim()) {
                const clean = name.trim();
                if (!playlists[clean]) {
                    playlists[clean] = [];
                    savePlaylists();
                    renderView();
                }
            }
        });
        panelActions.appendChild(createBtn);

        if (plNames.length === 0) {
            contentList.innerHTML = '<li class="empty-msg">Nenhuma playlist criada.<br>Clique em "+ Nova Playlist" acima.</li>';
            return;
        }

        plNames.forEach(plName => {
            const li = document.createElement('li');
            const count = playlists[plName].length;

            const titleSpan = document.createElement('span');
            titleSpan.className = 'item-title';
            titleSpan.textContent = plName;

            const metaSpan = document.createElement('span');
            metaSpan.className = 'item-meta';
            metaSpan.textContent = `${count} faixa(s)`;

            const delBtn = document.createElement('button');
            delBtn.className = 'remove-btn';
            delBtn.textContent = 'Excluir';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Excluir a playlist "${plName}"?`)) {
                    delete playlists[plName];
                    savePlaylists();
                    renderView();
                }
            });

            li.appendChild(titleSpan);
            li.appendChild(metaSpan);
            li.appendChild(delBtn);

            li.addEventListener('click', () => {
                selectedPlaylist = plName;
                currentView = 'playlist-detail';
                renderView();
            });
            contentList.appendChild(li);
        });
    }
    else if (currentView === 'playlist-detail' && selectedPlaylist) {
        searchContainer.style.display = 'none';
        const songNames = playlists[selectedPlaylist] || [];
        const playlistSongs = deviceSongs.filter(s => songNames.includes(s.name));

        viewTitle.textContent = selectedPlaylist;

        const backBtn = document.createElement('button');
        backBtn.className = 'rustic-btn secondary';
        backBtn.textContent = '← Voltar';
        backBtn.addEventListener('click', () => {
            currentView = 'playlists';
            selectedPlaylist = null;
            renderView();
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'rustic-btn';
        addBtn.textContent = '+ Adicionar';
        addBtn.addEventListener('click', openAddSongsModal);

        panelActions.appendChild(backBtn);
        panelActions.appendChild(addBtn);

        if (playlistSongs.length === 0) {
            contentList.innerHTML = '<li class="empty-msg">Esta playlist está vazia.<br>Clique em "+ Adicionar" acima.</li>';
            return;
        }

        playlistSongs.forEach((song, idx) => {
            const li = document.createElement('li');
            if (audioPlayer.src === song.url) li.classList.add('active');

            const span = document.createElement('span');
            span.className = 'item-title';
            span.textContent = `${idx + 1}. ${song.name}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-x-btn';
            removeBtn.textContent = '✕';
            removeBtn.title = 'Remover música desta playlist';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playlists[selectedPlaylist] = playlists[selectedPlaylist].filter(n => n !== song.name);
                savePlaylists();
                renderView();
            });

            li.appendChild(span);
            li.appendChild(removeBtn);

            li.addEventListener('click', () => {
                activeQueue = [...playlistSongs];
                loadSong(idx, `Playlist: ${selectedPlaylist}`);
                playSong();
            });
            contentList.appendChild(li);
        });
    }
}

function openAddSongsModal() {
    if (deviceSongs.length === 0) {
        alert("Nenhuma música carregada no dispositivo ainda.");
        return;
    }
    modalSongList.innerHTML = '';
    const currentList = playlists[selectedPlaylist] || [];

    deviceSongs.forEach(song => {
        const li = document.createElement('li');
        const labelWrapper = document.createElement('label');
        labelWrapper.className = 'modal-song-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = song.name;
        checkbox.checked = currentList.includes(song.name);

        const textSpan = document.createElement('span');
        textSpan.textContent = song.name;

        labelWrapper.appendChild(checkbox);
        labelWrapper.appendChild(textSpan);
        li.appendChild(labelWrapper);
        modalSongList.appendChild(li);
    });

    addSongsModal.classList.add('open');
}

closeModalBtn.addEventListener('click', () => addSongsModal.classList.remove('open'));

confirmAddSongsBtn.addEventListener('click', () => {
    const checkboxes = modalSongList.querySelectorAll('input[type="checkbox"]:checked');
    playlists[selectedPlaylist] = Array.from(checkboxes).map(cb => cb.value);
    savePlaylists();
    addSongsModal.classList.remove('open');
    renderView();
});

function loadSong(index, sourceLabel) {
    if (!activeQueue[index]) return;
    currentIndex = index;
    audioPlayer.src = activeQueue[index].url;

    const name = activeQueue[index].name;
    const label = sourceLabel || 'Norse Player';

    trackTitle.textContent = name;
    trackArtist.textContent = label;
    miniTrackTitle.textContent = name;
    miniTrackArtist.textContent = label;
    mobileMiniPlayer.classList.remove('hidden');

    renderView();
}

function playSong() {
    if (activeQueue.length === 0) return;
    initAudioEngine();
    isPlaying = true;
    audioPlayer.play();
    playBtn.innerHTML = pauseIconSVG;
    miniPlayBtn.innerHTML = miniPauseSVG;
    vinyl.classList.add('playing');
    miniVinyl.classList.add('playing');
}

function pauseSong() {
    isPlaying = false;
    audioPlayer.pause();
    playBtn.innerHTML = playIconSVG;
    miniPlayBtn.innerHTML = miniPlaySVG;
    vinyl.classList.remove('playing');
    miniVinyl.classList.remove('playing');
}

playBtn.addEventListener('click', () => isPlaying ? pauseSong() : playSong());
miniPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); isPlaying ? pauseSong() : playSong(); });

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active-mode', isShuffle);
});

repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    repeatBtn.classList.remove('active-mode', 'repeat-one');
    if (repeatMode === 1) {
        repeatBtn.classList.add('active-mode');
        repeatBtn.title = "Repetir Lista";
    } else if (repeatMode === 2) {
        repeatBtn.classList.add('active-mode', 'repeat-one');
        repeatBtn.title = "Repetir Faixa Atual";
    } else {
        repeatBtn.title = "Repetir (Desativado)";
    }
});

function playNext() {
    if (activeQueue.length === 0) return;
    if (isShuffle && activeQueue.length > 1) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * activeQueue.length);
        } while (randomIndex === currentIndex);
        currentIndex = randomIndex;
    } else {
        currentIndex = (currentIndex + 1) % activeQueue.length;
    }
    loadSong(currentIndex, trackArtist.textContent);
    playSong();
}

nextBtn.addEventListener('click', playNext);
miniNextBtn.addEventListener('click', (e) => { e.stopPropagation(); playNext(); });

prevBtn.addEventListener('click', () => {
    if (activeQueue.length === 0) return;
    currentIndex = (currentIndex - 1 + activeQueue.length) % activeQueue.length;
    loadSong(currentIndex, trackArtist.textContent);
    playSong();
});

audioPlayer.addEventListener('ended', () => {
    if (repeatMode === 2) {
        audioPlayer.currentTime = 0;
        playSong();
    } else if (repeatMode === 1 || isShuffle || currentIndex < activeQueue.length - 1) {
        playNext();
    } else {
        pauseSong();
    }
});

audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
        progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        durationEl.textContent = formatTime(audioPlayer.duration);
    }
});

progressBar.addEventListener('input', () => {
    if (audioPlayer.duration) {
        audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
    }
});

audioPlayer.volume = 0.8;
volumeBar.addEventListener('input', () => audioPlayer.volume = volumeBar.value);

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

renderView();
