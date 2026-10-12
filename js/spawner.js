// Multi-Island Stage System and Enemy Wave Spawner
import { Unit } from './entities.js';

export const ISLANDS = [
    {
        id: 'isolated',
        name: '외딴섬 (Island 1)',
        icon: '🏝️',
        desc: '안개 낀 해안과 바위 협곡으로 둘러싸인 고블린 요새 (스테이지 1-1 ~ 1-5)',
        stages: [1, 2, 3, 4, 5],
        requiredClear: 0 // Available immediately
    },
    {
        id: 'sea',
        name: '바다섬 (Island 2)',
        icon: '🌊',
        desc: '거친 파도와 난파선 해적단, 심해 괴수가 도사리는 푸른 바다의 섬 (스테이지 2-1 ~ 2-5)',
        stages: [6, 7, 8, 9, 10],
        requiredClear: 5 // Requires Island 1 Clear (Stage 5)
    },
    {
        id: 'volcano',
        name: '화산섬 (Island 3)',
        icon: '🌋',
        desc: '작열하는 마그마와 암흑 군단이 도사리는 흑요석 화산 요새 (스테이지 3-1 ~ 3-5)',
        stages: [11, 12, 13, 14, 15],
        requiredClear: 10 // Requires Island 2 Clear (Stage 10)
    }
];

export const STAGE_CONFIGS = [
    // ================= ISLAND 1: 외딴섬 (Stages 1-1 to 1-5) =================
    {
        stage: 1,
        islandId: 'isolated',
        subStage: '1-1',
        title: '외딴섬 1-1: 안개 낀 해안',
        desc: '안개 낀 해변가로 고블린 검병 척후단이 아군 성채를 노립니다.',
        bgColors: { sky1: '#09152a', sky2: '#162842', moon: '#38bdf8', ground: '#1a2936' },
        baseHp: 1200,
        bossTime: 32,
        bossHp: 550,
        bossName: '고블린 척후장',
        goldReward: 200,
        unlockReward: null,
        enemyPool: ['swordsman']
    },
    {
        stage: 2,
        islandId: 'isolated',
        subStage: '1-2',
        title: '외딴섬 1-2: 바람 부는 평원',
        desc: '고블린 검병과 뼈 화살 궁수단이 몰려오기 시작합니다.',
        bgColors: { sky1: '#0c1b33', sky2: '#1c3456', moon: '#60a5fa', ground: '#162f27' },
        baseHp: 1500,
        bossTime: 34,
        bossHp: 750,
        bossName: '평원의 고블린 정예병',
        goldReward: 260,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow']
    },
    {
        stage: 3,
        islandId: 'isolated',
        subStage: '1-3',
        title: '외딴섬 1-3: 버려진 망루',
        desc: '단단한 방패병이 아군 전선을 압박해오며 포위망을 좁혀옵니다.',
        bgColors: { sky1: '#11223b', sky2: '#233f64', moon: '#93c5fd', ground: '#1d3326' },
        baseHp: 1850,
        bossTime: 35,
        bossHp: 950,
        bossName: '철벽의 방패 오우거',
        goldReward: 330,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield']
    },
    {
        stage: 4,
        islandId: 'isolated',
        subStage: '1-4',
        title: '외딴섬 1-4: 바위 협곡',
        desc: '어둠의 마법사가 합류하여 강력한 원거리 폭격을 가합니다.',
        bgColors: { sky1: '#181b29', sky2: '#2c3247', moon: '#f472b6', ground: '#2b2628' },
        baseHp: 2250,
        bossTime: 36,
        bossHp: 1200,
        bossName: '협곡의 암석 골렘',
        goldReward: 420,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 5,
        islandId: 'isolated',
        subStage: '1-5',
        title: '외딴섬 1-5: 지배자의 성채',
        desc: '외딴섬의 지배자 [고블린 군주 그로그]와의 결전입니다!',
        bgColors: { sky1: '#240d2e', sky2: '#411952', moon: '#ec4899', ground: '#271530' },
        baseHp: 2700,
        bossTime: 35,
        bossHp: 1600,
        bossName: '고블린 군주 그로그',
        goldReward: 550,
        unlockReward: 'archer', // Unlocks Shadow Archer & Sea Island!
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },

    // ================= ISLAND 2: 바다섬 (Stages 2-1 to 2-5) =================
    {
        stage: 6,
        islandId: 'sea',
        subStage: '2-1',
        title: '바다섬 2-1: 푸른 파도 여울',
        desc: '재빠른 바다 해적단이 푸른 파도를 가르며 상륙합니다.',
        bgColors: { sky1: '#041d30', sky2: '#0b4266', moon: '#38bdf8', ground: '#0b2f3d' },
        baseHp: 3200,
        bossTime: 36,
        bossHp: 2000,
        bossName: '산호초 거수',
        goldReward: 650,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow']
    },
    {
        stage: 7,
        islandId: 'sea',
        subStage: '2-2',
        title: '바다섬 2-2: 난파선 해적단',
        desc: '해적 작살 궁수단과 방패병이 거세게 진격해옵니다.',
        bgColors: { sky1: '#05223a', sky2: '#0e4e79', moon: '#00e5ff', ground: '#0c2738' },
        baseHp: 3800,
        bossTime: 38,
        bossHp: 2450,
        bossName: '난파선의 망령 선장',
        goldReward: 780,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield']
    },
    {
        stage: 8,
        islandId: 'sea',
        subStage: '2-3',
        title: '바다섬 2-3: 심해 산호 동굴',
        desc: '심해의 마력을 다루는 바다 마법사들의 파도 마법이 쏟아집니다.',
        bgColors: { sky1: '#061a29', sky2: '#123e5c', moon: '#2dd4bf', ground: '#092128' },
        baseHp: 4400,
        bossTime: 38,
        bossHp: 2900,
        bossName: '심해 크라켄 파수병',
        goldReward: 900,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 9,
        islandId: 'sea',
        subStage: '2-4',
        title: '바다섬 2-4: 폭풍우 치는 암초',
        desc: '폭풍우치는 밤, 바다섬 해적 함대의 정예 군단이 총공세를 펼칩니다.',
        bgColors: { sky1: '#031422', sky2: '#092b45', moon: '#67e8f9', ground: '#071c26' },
        baseHp: 5000,
        bossTime: 40,
        bossHp: 3500,
        bossName: '폭풍의 군단장 렉스',
        goldReward: 1050,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 10,
        islandId: 'sea',
        subStage: '2-5',
        title: '바다섬 2-5: 해저 신전의 심연',
        desc: '바다섬의 절대 지배자 [해적 제독 바르바롯]과의 대결투!',
        bgColors: { sky1: '#01192b', sky2: '#083758', moon: '#06b6d4', ground: '#051824' },
        baseHp: 5800,
        bossTime: 38,
        bossHp: 4200,
        bossName: '해적 제독 바르바롯',
        goldReward: 1300,
        unlockReward: 'paladin', // Unlocks Holy Paladin & Volcano Island!
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },

    // ================= ISLAND 3: 화산섬 (Stages 3-1 to 3-5) =================
    {
        stage: 11,
        islandId: 'volcano',
        subStage: '3-1',
        title: '화산섬 3-1: 잿빛 유황 지대',
        desc: '뜨거운 유황 연기 속에서 화염 갑주를 두른 용암 검병단이 돌격합니다.',
        bgColors: { sky1: '#250808', sky2: '#471616', moon: '#f87171', ground: '#2b1515' },
        baseHp: 6500,
        bossTime: 38,
        bossHp: 4800,
        bossName: '마그마 골렘 브루트',
        goldReward: 1500,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield']
    },
    {
        stage: 12,
        islandId: 'volcano',
        subStage: '3-2',
        title: '화산섬 3-2: 마그마 협곡',
        desc: '화염 화살과 작열하는 폭염 마법이 성채를 불태우려 합니다.',
        bgColors: { sky1: '#2e0a0d', sky2: '#57181e', moon: '#ef4444', ground: '#331418' },
        baseHp: 7200,
        bossTime: 40,
        bossHp: 5500,
        bossName: '인페르노 화염술사',
        goldReward: 1750,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 13,
        islandId: 'volcano',
        subStage: '3-3',
        title: '화산섬 3-3: 흑요석 요새',
        desc: '단단한 흑요석 철갑으로 무장한 정예 군단과의 치열한 공방전입니다.',
        bgColors: { sky1: '#210815', sky2: '#41132e', moon: '#f43f5e', ground: '#26101e' },
        baseHp: 8000,
        bossTime: 40,
        bossHp: 6200,
        bossName: '흑요석 철인 저거너트',
        goldReward: 2000,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 14,
        islandId: 'volcano',
        subStage: '3-4',
        title: '화산섬 3-4: 분화구 결전지',
        desc: '타오르는 화산 분화구에서 암흑 군단의 최정예 총공세가 펼쳐집니다.',
        bgColors: { sky1: '#2a0707', sky2: '#5f1212', moon: '#ff0055', ground: '#2b0a0a' },
        baseHp: 8900,
        bossTime: 42,
        bossHp: 7000,
        bossName: '화염용기사 발록',
        goldReward: 2350,
        unlockReward: null,
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    },
    {
        stage: 15,
        islandId: 'volcano',
        subStage: '3-5',
        title: '화산섬 3-5: 파멸의 암흑 제단',
        desc: '대륙의 평화를 건 최후의 결전! [암흑 군주 말로크]를 처단하라!',
        bgColors: { sky1: '#16000a', sky2: '#330017', moon: '#ff0055', ground: '#1c000e' },
        baseHp: 9999,
        bossTime: 40,
        bossHp: 8200,
        bossName: '암흑 군주 말로크',
        goldReward: 3200,
        unlockReward: 'legend', // Ultimate Triumph!
        enemyPool: ['swordsman', 'bow', 'shield', 'mage']
    }
];

export class Spawner {
    constructor(baseX = 2100, stageNumber = 1) {
        this.baseX = baseX;
        this.stageNumber = stageNumber;
        this.config = STAGE_CONFIGS[stageNumber - 1] || STAGE_CONFIGS[0];

        this.timer = 0;
        this.spawnTimer = 0;
        this.nextSpawnDelay = 3.2;
        this.bossSpawned = false;

        this.announcement = this.config.title;
        this.announcementTimer = 3.5;
    }

    update(dt, enemies) {
        this.timer += dt;
        this.spawnTimer += dt;

        if (this.announcementTimer > 0) {
            this.announcementTimer -= dt;
        }

        // Boss spawn trigger
        if (!this.bossSpawned && this.timer >= this.config.bossTime) {
            this.bossSpawned = true;
            this.announcement = `⚠️ WARNING: [${this.config.bossName}] 출현! ⚠️`;
            this.announcementTimer = 4.0;
            this.spawnBoss(enemies);
        }

        // Regular enemy spawns
        if (this.spawnTimer >= this.nextSpawnDelay) {
            this.spawnTimer = 0;
            // Spawn interval gently speeds up as battle progresses
            const baseDelay = Math.max(1.5, 3.8 - this.timer * 0.02 - (this.stageNumber - 1) * 0.05);
            this.nextSpawnDelay = baseDelay + Math.random() * 1.2;

            const pool = this.config.enemyPool;
            const chosenType = pool[Math.floor(Math.random() * pool.length)];
            this.spawnEnemy(enemies, chosenType);
        }
    }

    spawnEnemy(enemies, type) {
        const stageMod = (this.stageNumber - 1);
        let config = {
            x: this.baseX - 40,
            y: 540,
            isPlayer: false,
            scale: 0.9
        };

        if (type === 'swordsman') {
            config = {
                ...config,
                unitType: 'enemy',
                maxHp: 80 + stageMod * 16,
                attackPower: 12 + stageMod * 2.2,
                speed: 85,
                attackRange: 45,
                attackSpeed: 1.0,
                cost: 20 + stageMod * 4
            };
        } else if (type === 'bow') {
            config = {
                ...config,
                unitType: 'bow',
                maxHp: 65 + stageMod * 14,
                attackPower: 14 + stageMod * 2.5,
                speed: 70,
                attackRange: 280,
                attackSpeed: 0.75,
                cost: 30 + stageMod * 5
            };
        } else if (type === 'shield') {
            config = {
                ...config,
                unitType: 'shield',
                maxHp: 240 + stageMod * 45,
                attackPower: 10 + stageMod * 2.0,
                speed: 55,
                attackRange: 40,
                attackSpeed: 0.8,
                scale: 1.05,
                cost: 50 + stageMod * 8
            };
        } else if (type === 'mage') {
            config = {
                ...config,
                unitType: 'mage',
                maxHp: 85 + stageMod * 18,
                attackPower: 26 + stageMod * 3.5,
                speed: 65,
                attackRange: 240,
                attackSpeed: 0.65,
                cost: 65 + stageMod * 10
            };
        }

        enemies.push(new Unit(config));
    }

    spawnBoss(enemies) {
        const islandId = this.config.islandId;
        const capeColor = islandId === 'volcano' ? '#ffd700' : (islandId === 'sea' ? '#00e5ff' : '#ff0055');

        const config = {
            x: this.baseX - 50,
            y: 540,
            isPlayer: false,
            unitType: 'enemy',
            maxHp: this.config.bossHp,
            attackPower: 35 + this.stageNumber * 5,
            speed: 58,
            attackRange: 70,
            attackSpeed: 0.85,
            scale: 1.55,
            hasCape: true,
            capeColor: capeColor,
            cost: 250 + this.stageNumber * 30
        };
        enemies.push(new Unit(config));
    }
}
