// Main Application Controller (Mobile & Desktop Unified)
import { Game } from './game.js';
import { sound } from './audio.js';
import { saveManager } from './save.js';
import { ISLANDS, STAGE_CONFIGS } from './spawner.js';

let currentGame = null;
let currentIslandId = 'isolated';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const lobbyScreen = document.getElementById('lobby-screen');
const mobileControls = document.getElementById('mobile-controls');
const ingameTopBar = document.getElementById('ingame-top-bar');
const lobbyGoldDisplay = document.getElementById('lobby-gold-display');
const btnPauseLobby = document.getElementById('btn-pause-lobby');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Containers
const islandSelectorBar = document.getElementById('island-selector-bar');
const islandBannerInfo = document.getElementById('island-banner-info');
const stagesContainer = document.getElementById('stages-container');
const heroesContainer = document.getElementById('heroes-container');

// Universal Fast-Tap Helper (Instant 0ms Mobile Touch & Desktop Mouse Support)
function bindFastTap(elem, callback) {
    if (!elem) return;
    let lastTapTime = 0;

    const handleTap = (e) => {
        const now = Date.now();
        if (now - lastTapTime < 220) return; // Prevent rapid duplicate firing
        lastTapTime = now;
        sound.init();
        sound.startBgm();
        callback(e);
    };

    elem.addEventListener('click', handleTap);
}

// Tab Switching
tabBtns.forEach(btn => {
    bindFastTap(btn, () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.dataset.tab;
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
        sound.slash();
        refreshLobbyUI();
    });
});

// Refresh Lobby UI
function refreshLobbyUI() {
    lobbyGoldDisplay.textContent = saveManager.data.gold;

    // 1. Render Stages
    renderStages();

    // 2. Render Heroes
    renderHeroes();

    // 3. Refresh Shop Items
    refreshShopItems();
}

function renderIslandNav() {
    if (!islandSelectorBar) return;
    islandSelectorBar.innerHTML = '';
    const maxCleared = saveManager.data.maxClearedStage;

    ISLANDS.forEach(island => {
        const isUnlocked = maxCleared >= island.requiredClear;
        const clearedInIsland = island.stages.filter(s => s <= maxCleared).length;
        const isSelected = island.id === currentIslandId;

        const btn = document.createElement('button');
        btn.className = `btn-island ${isSelected ? 'active' : ''} ${isUnlocked ? '' : 'locked'}`;
        btn.innerHTML = `
            <span class="island-tab-icon">${island.icon}</span>
            <span class="island-tab-name">${island.name.split(' ')[0]}</span>
            <span class="island-tab-badge">${isUnlocked ? `${clearedInIsland}/5 Clear` : '🔒 잠김'}</span>
        `;

        bindFastTap(btn, () => {
            if (isUnlocked) {
                currentIslandId = island.id;
                sound.slash();
                renderStages();
            } else {
                sound.defeat();
                const reqStageName = island.requiredClear === 5 ? '외딴섬 1-5' : '바다섬 2-5';
                showToast(`🔒 이전 섬의 모든 스테이지(${reqStageName})를 클리어해야 개방됩니다!`);
            }
        });

        islandSelectorBar.appendChild(btn);
    });
}

function renderStages() {
    renderIslandNav();

    const maxCleared = saveManager.data.maxClearedStage;
    const currentIsland = ISLANDS.find(i => i.id === currentIslandId) || ISLANDS[0];

    // Render Banner Info
    if (islandBannerInfo) {
        const isUnlocked = maxCleared >= currentIsland.requiredClear;
        const clearedCount = currentIsland.stages.filter(s => s <= maxCleared).length;
        islandBannerInfo.innerHTML = `
            <div class="island-banner-content">
                <div class="island-banner-title">
                    <span>${currentIsland.icon} ${currentIsland.name}</span>
                    <span class="island-banner-progress">${clearedCount} / 5 스테이지 정복 ⭐</span>
                </div>
                <div class="island-banner-desc">${currentIsland.desc}</div>
            </div>
        `;
    }

    stagesContainer.innerHTML = '';
    const stages = STAGE_CONFIGS.filter(cfg => cfg.islandId === currentIslandId);

    stages.forEach((cfg) => {
        const isIslandUnlocked = maxCleared >= currentIsland.requiredClear;
        const isUnlocked = isIslandUnlocked && (cfg.stage <= maxCleared + 1);
        const isCleared = cfg.stage <= maxCleared;

        const card = document.createElement('div');
        card.className = `stage-card ${isUnlocked ? '' : 'locked'}`;

        let statusTag = '';
        if (isCleared) {
            statusTag = `<span class="badge-status cleared">⭐ 클리어 완료</span>`;
        } else if (isUnlocked) {
            statusTag = `<span class="badge-status available">⚔️ 출격 가능</span>`;
        } else {
            statusTag = `<span class="badge-status locked">🔒 이전 관문 클리어 필요</span>`;
        }

        let unlockTag = '';
        if (cfg.unlockReward === 'archer') {
            unlockTag = `<div class="stage-unlock-tag">🎁 클리어 시 [그림자 궁수] 해금 & 바다섬 개방!</div>`;
        } else if (cfg.unlockReward === 'paladin') {
            unlockTag = `<div class="stage-unlock-tag">🎁 클리어 시 [성기사] 해금 & 화산섬 개방!</div>`;
        } else if (cfg.unlockReward === 'legend') {
            unlockTag = `<div class="stage-unlock-tag gold">👑 전설의 대륙 구원자 칭호 획득!</div>`;
        }

        card.innerHTML = `
            <div class="stage-card-body">
                <div class="stage-badge-num">STAGE ${cfg.subStage}</div>
                <div class="stage-title">${cfg.title.split(': ')[1] || cfg.title}</div>
                <div class="stage-desc">${cfg.desc}</div>
                <div class="stage-boss-preview">👹 보스: <strong>${cfg.bossName}</strong> (HP: ${cfg.bossHp})</div>
                <div class="stage-status-row">${statusTag}</div>
                ${unlockTag}
                <div class="stage-reward">💰 클리어 보상: +${cfg.goldReward}G</div>
            </div>
            ${isUnlocked ? `<button class="btn-stage-start" data-stage="${cfg.stage}">출격하기 (BATTLE)</button>` : `<button class="btn-stage-start disabled" disabled>잠김</button>`}
        `;

        if (isUnlocked) {
            const btn = card.querySelector('.btn-stage-start');
            const cardBody = card.querySelector('.stage-card-body');
            const launchBattle = () => {
                sound.ultimate();
                startBattle(cfg.stage);
            };
            bindFastTap(btn, launchBattle);
            bindFastTap(cardBody, launchBattle);
        }

        stagesContainer.appendChild(card);
    });
}

function renderHeroes() {
    heroesContainer.innerHTML = '';
    const heroesData = [
        {
            id: 'blade',
            name: '검성 (Blade Master)',
            role: '초고속 참격 & 콤보 딜러',
            icon: '⚔️',
            aura: '🌀 <strong>질풍의 오라</strong><br>아군 공속 +35% / 이속 +30%',
            unlockCond: '기본 지급'
        },
        {
            id: 'archer',
            name: '그림자 궁수 (Archer)',
            role: '자유 조준 & 차지 저격 관통포',
            icon: '🏹',
            aura: '🎯 <strong>집중의 눈 오라</strong><br>아군 치명타 +40% / 사거리 +25%',
            unlockCond: '외딴섬 1-5 클리어 시 해금'
        },
        {
            id: 'paladin',
            name: '성기사 (Holy Paladin)',
            role: '거대 해머 탱커 & 아군 수호',
            icon: '🛡️',
            aura: '✨ <strong>수호의 성역 오라</strong><br>아군 방어력 +50% / 초당 HP 회복',
            unlockCond: '바다섬 2-5 클리어 시 해금'
        }
    ];

    heroesData.forEach(h => {
        const isUnlocked = saveManager.isHeroUnlocked(h.id);
        const isSelected = saveManager.data.selectedHero === h.id;

        const card = document.createElement('div');
        card.className = `hero-card ${isUnlocked ? '' : 'locked'} ${isSelected ? 'selected' : ''}`;

        card.innerHTML = `
            <div class="hero-icon">${h.icon}</div>
            <div class="hero-card-title">${h.name}</div>
            <div class="hero-card-role">${h.role}</div>
            <div class="hero-card-aura">${h.aura}</div>
            ${isUnlocked ?
                `<button class="btn-select-hero">${isSelected ? '선택됨' : '영웅 선택'}</button>` :
                `<div class="hero-locked-msg">🔒 ${h.unlockCond}</div>`
            }
        `;

        if (isUnlocked) {
            const btn = card.querySelector('.btn-select-hero');
            const selectHero = () => {
                saveManager.data.selectedHero = h.id;
                saveManager.save();
                sound.slash();
                renderHeroes();
                showToast(`👤 ${h.name} 선택 완료!`);
            };
            bindFastTap(btn, selectHero);
            bindFastTap(card, selectHero);
        }

        heroesContainer.appendChild(card);
    });
}

let shopEventsInitialized = false;
function initShopEvents() {
    if (shopEventsInitialized) return;
    shopEventsInitialized = true;

    const shopItems = document.querySelectorAll('.upgrade-item');
    shopItems.forEach(item => {
        const statKey = item.dataset.stat;
        const buyBtn = item.querySelector('.btn-buy-upgrade');
        if (!buyBtn) return;

        let lastBuyTime = 0;
        bindFastTap(buyBtn, () => {
            const now = Date.now();
            if (now - lastBuyTime < 350) return; // Strict debounce to prevent accidental chain-buying
            lastBuyTime = now;

            if (saveManager.upgradeStat(statKey)) {
                sound.victory();
                refreshLobbyUI();
                showToast('✨ 강화 완료!');
            } else {
                sound.defeat();
                showToast('골드가 부족합니다!');
            }
        });
    });
}

function refreshShopItems() {
    initShopEvents();
    const shopItems = document.querySelectorAll('.upgrade-item');
    shopItems.forEach(item => {
        const statKey = item.dataset.stat;
        const currentLv = saveManager.data.upgrades[statKey] || 1;
        const cost = saveManager.getUpgradeCost(statKey);

        const lvLabel = item.querySelector('.up-lv');
        const buyBtn = item.querySelector('.btn-buy-upgrade');

        if (lvLabel) lvLabel.textContent = `Lv.${currentLv}`;
        if (buyBtn) {
            buyBtn.textContent = `강화: ${cost}G`;
            if (saveManager.data.gold >= cost) {
                buyBtn.classList.remove('disabled');
            } else {
                buyBtn.classList.add('disabled');
            }
        }
    });
}

// Start Battle
function startBattle(stageNumber) {
    if (currentGame) {
        currentGame.stop();
    }

    lobbyScreen.style.display = 'none';
    mobileControls.style.display = 'block';
    ingameTopBar.style.display = 'block';

    const heroType = saveManager.data.selectedHero || 'blade';

    // Update attack button label based on hero
    const atkIcon = document.getElementById('attack-btn-icon');
    const atkLabel = document.getElementById('attack-btn-label');
    if (heroType === 'archer') {
        atkIcon.textContent = '🏹';
        atkLabel.textContent = '조준사격';
    } else if (heroType === 'paladin') {
        atkIcon.textContent = '🔨';
        atkLabel.textContent = '강타';
    } else {
        atkIcon.textContent = '⚔️';
        atkLabel.textContent = '참격';
    }

    currentGame = new Game(canvas, heroType, stageNumber, () => {
        exitToLobby();
    });
    currentGame.start();
}

function exitToLobby() {
    if (currentGame) {
        currentGame.stop();
        currentGame = null;
    }
    lobbyScreen.style.display = 'flex';
    mobileControls.style.display = 'none';
    ingameTopBar.style.display = 'none';
    refreshLobbyUI();
}

if (btnPauseLobby) bindFastTap(btnPauseLobby, exitToLobby);

// ================= MOBILE & PC MULTI-TOUCH POINTER SYSTEM =================
function bindTouchButton(elemId, onDown, onUp) {
    const btn = document.getElementById(elemId);
    if (!btn) return;

    let activePointerId = null;

    const start = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activePointerId !== null) return;
        activePointerId = e.pointerId;
        try {
            btn.setPointerCapture(e.pointerId);
        } catch (err) {}
        sound.init();
        sound.startBgm();
        btn.classList.add('active');
        if (onDown) onDown();
    };

    const stop = (e) => {
        if (e.pointerId !== activePointerId) return;
        e.preventDefault();
        e.stopPropagation();
        activePointerId = null;
        btn.classList.remove('active');
        try {
            btn.releasePointerCapture(e.pointerId);
        } catch (err) {}
        if (onUp) onUp();
    };

    const cancel = (e) => {
        if (e.pointerId !== activePointerId) return;
        activePointerId = null;
        btn.classList.remove('active');
        if (onUp) onUp();
    };

    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', cancel);
}

// Left / Right / Jump (Both Left and Right Action Jump Buttons!)
bindTouchButton('touch-left',
    () => { if (currentGame) currentGame.input.left = true; },
    () => { if (currentGame) currentGame.input.left = false; }
);

bindTouchButton('touch-right',
    () => { if (currentGame) currentGame.input.right = true; },
    () => { if (currentGame) currentGame.input.right = false; }
);

bindTouchButton('touch-jump',
    () => { if (currentGame) currentGame.input.jump = true; },
    () => { if (currentGame) currentGame.input.jump = false; }
);

bindTouchButton('touch-jump-action',
    () => { if (currentGame) currentGame.input.jump = true; },
    () => { if (currentGame) currentGame.input.jump = false; }
);

// Attack Button (Interactive Aiming for Archer, Run & Slash for Melee)
const touchAttackBtn = document.getElementById('touch-attack');
if (touchAttackBtn) {
    let attackPointerId = null;
    let touchOrigin = null;

    const startAttack = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (attackPointerId !== null) return;
        attackPointerId = e.pointerId;
        try {
            touchAttackBtn.setPointerCapture(e.pointerId);
        } catch (err) {}
        sound.init();
        sound.startBgm();
        touchAttackBtn.classList.add('active');
        if (!currentGame) return;

        if (currentGame.hero.type === 'archer') {
            currentGame.input.aiming = true;
            currentGame.input.attackHeld = true;
            touchOrigin = { x: e.clientX, y: e.clientY };
            currentGame.input.aimOffset = { dx: (currentGame.hero.facing || 1) * 150, dy: -30 };
        } else {
            currentGame.input.attack = true;
        }
    };

    const moveAttack = (e) => {
        if (e.pointerId !== attackPointerId) return;
        if (!currentGame || !currentGame.input.aiming || !touchOrigin) return;
        const dx = e.clientX - touchOrigin.x;
        const dy = e.clientY - touchOrigin.y;
        if (Math.hypot(dx, dy) > 10) {
            currentGame.input.aimOffset = { dx: dx * 3, dy: dy * 3 };
        }
    };

    const endAttack = (e) => {
        if (e.pointerId !== attackPointerId) return;
        e.preventDefault();
        e.stopPropagation();
        attackPointerId = null;
        touchOrigin = null;
        touchAttackBtn.classList.remove('active');
        try {
            touchAttackBtn.releasePointerCapture(e.pointerId);
        } catch (err) {}
        if (!currentGame) return;

        if (currentGame.hero.type === 'archer') {
            currentGame.input.releaseAim = true;
            currentGame.input.releaseAttack = true;
            currentGame.input.aiming = false;
            currentGame.input.attackHeld = false;
        }
    };

    touchAttackBtn.addEventListener('pointerdown', startAttack);
    touchAttackBtn.addEventListener('pointermove', moveAttack);
    touchAttackBtn.addEventListener('pointerup', endAttack);
    touchAttackBtn.addEventListener('pointercancel', endAttack);
}

// Skills
bindTouchButton('touch-skill-1',
    () => { if (currentGame) currentGame.input.skill1 = true; },
    () => {}
);

bindTouchButton('touch-skill-2',
    () => { if (currentGame) currentGame.input.skill2 = true; },
    () => {}
);

bindTouchButton('touch-ult',
    () => { if (currentGame) currentGame.input.ult = true; },
    () => {}
);

// Summon buttons (Instant Multi-touch Pointer Response)
['swordsman', 'shield', 'bow', 'mage'].forEach((unit, idx) => {
    const btn = document.getElementById(`touch-summon-${idx + 1}`);
    if (btn) {
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sound.init();
            sound.startBgm();
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 120);
            if (currentGame) currentGame.trySummon(unit);
        });
    }
});

// Mana Boost
const manaBoostBtn = document.getElementById('touch-mana-boost');
if (manaBoostBtn) {
    manaBoostBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sound.init();
        sound.startBgm();
        manaBoostBtn.classList.add('active');
        setTimeout(() => manaBoostBtn.classList.remove('active'), 120);
        if (currentGame) {
            currentGame.boostBattleMana();
            const costLabel = document.getElementById('label-boost-cost');
            if (costLabel) costLabel.textContent = `${currentGame.battleManaUpgradeCost}⚡`;
        }
    });
}

// ================= MOBILE UTILITIES & FULLSCREEN =================
const modalQrConnect = document.getElementById('modal-qr-connect');
const btnPhoneConnect = document.getElementById('btn-phone-connect');
const btnCloseQrModal = document.getElementById('btn-close-qr-modal');
const qrUrlText = document.getElementById('qr-url-text');
const qrCodeImg = document.getElementById('qr-code-img');
const btnCopyUrl = document.getElementById('btn-copy-url');

const PUBLIC_ONLINE_URL = 'https://backheyoung.github.io/ac00/';
const activeMobileUrl = (window.location && window.location.href && window.location.href.startsWith('https://backheyoung.github.io'))
    ? window.location.href
    : PUBLIC_ONLINE_URL;

if (qrUrlText) qrUrlText.value = activeMobileUrl;
if (qrCodeImg) {
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeMobileUrl)}`;
}

if (btnPhoneConnect) {
    bindFastTap(btnPhoneConnect, () => {
        if (modalQrConnect) modalQrConnect.style.display = 'flex';
    });
}

if (btnCloseQrModal) {
    bindFastTap(btnCloseQrModal, () => {
        if (modalQrConnect) modalQrConnect.style.display = 'none';
    });
}

if (btnCopyUrl && qrUrlText) {
    bindFastTap(btnCopyUrl, () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(qrUrlText.value).then(() => {
                btnCopyUrl.textContent = '복사됨!';
                setTimeout(() => { btnCopyUrl.textContent = '복사'; }, 1500);
            }).catch(() => {
                qrUrlText.select();
            });
        } else {
            qrUrlText.select();
        }
    });
}

// Toast Notification Utility
const toastPill = document.getElementById('toast-pill');
let toastTimer = null;
function showToast(msg, duration = 2500) {
    if (!toastPill) return;
    toastPill.textContent = msg;
    toastPill.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastPill.style.display = 'none';
    }, duration);
}

// Robust Fullscreen Toggle (Supports Desktop, Android, iOS fallback)
function toggleFullscreen() {
    sound.init();
    const doc = document;
    const docEl = document.documentElement;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!isFs) {
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {
                fallbackFullscreen();
            });
        } else if (docEl.webkitRequestFullscreen) {
            try { docEl.webkitRequestFullscreen(); } catch (e) { fallbackFullscreen(); }
        } else if (docEl.mozRequestFullScreen) {
            try { docEl.mozRequestFullScreen(); } catch (e) { fallbackFullscreen(); }
        } else if (docEl.msRequestFullscreen) {
            try { docEl.msRequestFullscreen(); } catch (e) { fallbackFullscreen(); }
        } else {
            fallbackFullscreen();
        }
    } else {
        if (doc.exitFullscreen) {
            doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
            try { doc.webkitExitFullscreen(); } catch (e) {}
        } else if (doc.mozCancelFullScreen) {
            try { doc.mozCancelFullScreen(); } catch (e) {}
        } else if (doc.msExitFullscreen) {
            try { doc.msExitFullscreen(); } catch (e) {}
        }
        document.body.classList.remove('simulated-fullscreen');
    }
}

function fallbackFullscreen() {
    document.body.classList.toggle('simulated-fullscreen');
    window.scrollTo(0, 1);
    showToast('⛶ 전체 화면 모드가 적용되었습니다 (기기를 가로로 회전해주세요)');
}

const btnFsLobby = document.getElementById('btn-fullscreen-lobby');
const btnFsIngame = document.getElementById('btn-fullscreen-ingame');
if (btnFsLobby) {
    bindFastTap(btnFsLobby, toggleFullscreen);
}
if (btnFsIngame) {
    bindFastTap(btnFsIngame, toggleFullscreen);
}

// BGM Controls
const btnBgmToggle = document.getElementById('btn-bgm-toggle');
const btnBgmToggleIngame = document.getElementById('btn-bgm-toggle-ingame');

function updateBgmButtonLabels(enabled) {
    const label = enabled ? '🎵 BGM ON' : '🔇 BGM OFF';
    if (btnBgmToggle) btnBgmToggle.textContent = label;
    if (btnBgmToggleIngame) btnBgmToggleIngame.textContent = label;
}

if (btnBgmToggle) {
    bindFastTap(btnBgmToggle, () => {
        const enabled = sound.toggleBgm();
        updateBgmButtonLabels(enabled);
        showToast(enabled ? '🎵 잔잔한 BGM이 켜졌습니다' : '🔇 BGM이 꺼졌습니다');
    });
}
if (btnBgmToggleIngame) {
    bindFastTap(btnBgmToggleIngame, () => {
        const enabled = sound.toggleBgm();
        updateBgmButtonLabels(enabled);
        showToast(enabled ? '🎵 잔잔한 BGM이 켜졌습니다' : '🔇 BGM이 꺼졌습니다');
    });
}

// Web Audio & Calm BGM Unlock on First Touch/Click
['touchstart', 'pointerdown', 'click', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => {
        sound.init();
        sound.startBgm();
    }, { once: true, passive: true });
});

// Initialize on Load
sound.initBgm();
updateBgmButtonLabels(sound.bgmEnabled);
refreshLobbyUI();

// PWA Service Worker Registration
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}
