// Persistent Game Save and Upgrade Manager
// Uses localStorage to save stages cleared, unlocked heroes, gold, and stat upgrades.

const SAVE_KEY = 'stickman_wars_save_v1';

const DEFAULT_SAVE = {
    gold: 300,
    maxClearedStage: 0, // 0 means Stage 1 is playable, Stage 1 cleared makes it 1
    unlockedHeroes: ['blade'], // Initially only Blade Master is unlocked!
    selectedHero: 'blade',
    upgrades: {
        // Castle & Mana
        manaMaxLv: 1,    // +30 Max Mana per Lv
        manaRegenLv: 1,  // +2 Mana/sec per Lv
        castleHpLv: 1,   // +200 Castle HP per Lv
        castleTurretLv: 1,// +8 Turret DMG per Lv
        // Hero
        heroHpLv: 1,     // +15% Hero HP per Lv
        heroAtkLv: 1,    // +15% Hero ATK per Lv
        // Units
        swordsmanLv: 1,
        shieldLv: 1,
        bowLv: 1,
        mageLv: 1
    }
};

class SaveManager {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SAVE));
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_SAVE,
                ...parsed,
                upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) }
            };
        } catch (e) {
            return JSON.parse(JSON.stringify(DEFAULT_SAVE));
        }
    }

    save() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch (e) {}
    }

    reset() {
        this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
        this.save();
    }

    addGold(amount) {
        this.data.gold += Math.round(amount);
        this.save();
    }

    isHeroUnlocked(heroId) {
        return this.data.unlockedHeroes.includes(heroId);
    }

    unlockHero(heroId) {
        if (!this.data.unlockedHeroes.includes(heroId)) {
            this.data.unlockedHeroes.push(heroId);
            this.save();
            return true;
        }
        return false;
    }

    recordStageClear(stageNumber) {
        let newlyUnlocked = [];
        if (stageNumber > this.data.maxClearedStage) {
            this.data.maxClearedStage = stageNumber;
        }

        // Stage 1 clear unlocks Archer!
        if (this.data.maxClearedStage >= 1 && !this.isHeroUnlocked('archer')) {
            this.unlockHero('archer');
            newlyUnlocked.push('archer');
        }

        // Stage 3 clear unlocks Paladin!
        if (this.data.maxClearedStage >= 3 && !this.isHeroUnlocked('paladin')) {
            this.unlockHero('paladin');
            newlyUnlocked.push('paladin');
        }

        this.save();
        return newlyUnlocked;
    }

    getUpgradeCost(statKey) {
        const lv = this.data.upgrades[statKey] || 1;
        return Math.round(60 * Math.pow(1.5, lv - 1));
    }

    upgradeStat(statKey) {
        const cost = this.getUpgradeCost(statKey);
        if (this.data.gold >= cost) {
            this.data.gold -= cost;
            this.data.upgrades[statKey] = (this.data.upgrades[statKey] || 1) + 1;
            this.save();
            return true;
        }
        return false;
    }
}

export const saveManager = new SaveManager();
