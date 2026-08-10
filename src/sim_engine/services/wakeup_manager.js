const fs = require('fs');
const path = require('path');
const Database = require('./db'); // Unbeugsamer JS-Datenbanktreiber!

async function getSectorSnapshot(location, agentId, dbPath) {
    if (!location || location === 'Interstellar') return null;
    let db;
    try {
        db = new Database(dbPath);
        
        // 1. Bobs count (Resolving virtual location via physical hosts) - Relational & Nativ!
        const bobsRow = await db.get(`
            SELECT COUNT(*) as count FROM agents 
            WHERE id != ? AND (
                (host_type = 'ship' AND CAST(host_id AS INTEGER) IN (SELECT id FROM ships WHERE system_name = ?))
                OR
                (host_type = 'matrix' AND CAST(host_id AS INTEGER) IN (SELECT id FROM infrastructure WHERE system_name = ?))
            )
        `, [agentId, location, location]);
        const bobs = bobsRow ? bobsRow.count : 0;

        // 2. Ships count (excluding own)
        const shipsRow = await db.get("SELECT COUNT(*) as count FROM ships WHERE system_name = ? AND pilot_id != ?", [location, agentId]);
        const ships = shipsRow ? shipsRow.count : 0;

        // 3. All infra
        const infraRow = await db.get("SELECT COUNT(*) as count FROM infrastructure WHERE system_name = ?", [location]);
        const infra = infraRow ? infraRow.count : 0;

        // 4. Active infra
        const activeInfraRow = await db.get("SELECT COUNT(*) as count FROM infrastructure WHERE system_name = ? AND status = 'active'", [location]);
        const active_infra = activeInfraRow ? activeInfraRow.count : 0;

        // 5. Core matter
        const coreRow = await db.get("SELECT extractable_matter_in_core FROM systems WHERE name = ?", [location]);
        const core = coreRow ? coreRow.extractable_matter_in_core : 50000;

        // 6. Any structure or ship below 80% HP?
        const damagedInfraRow = await db.get("SELECT COUNT(*) as count FROM infrastructure WHERE system_name = ? AND health < (max_health * 0.8)", [location]);
        const damaged_infra = damagedInfraRow ? damagedInfraRow.count : 0;

        const damagedShipsRow = await db.get("SELECT COUNT(*) as count FROM ships WHERE system_name = ? AND health < (max_health * 0.8)", [location]);
        const damaged_ships = damagedShipsRow ? damagedShipsRow.count : 0;

        // 7. Unread priority scut messages count
        const priorityRow = await db.get("SELECT COUNT(*) as count FROM messages WHERE receiver = ? AND priority = 1", [agentId]);
        const priority_scuts = priorityRow ? priorityRow.count : 0;

        await db.close();

        return {
            bobs_count: bobs,
            ships_count: ships,
            infra_count: infra,
            active_infra_count: active_infra,
            core_matter: core,
            has_low_health: (damaged_infra + damaged_ships) > 0,
            priority_scuts: priority_scuts
        };
    } catch (e) {
        console.error("[SNAPSHOT-ERROR]", e.message);
        if (db) {
            try { await db.close(); } catch(err) {}
        }
        return null;
    }
}

async function handleStandby(agent, state, config, universeDir, logFile, dbPath) {
    const snapshot = await module.exports.getSectorSnapshot(agent.location, agent.id, dbPath);
    
    // Resolve any newly logged passive sensor detections in current cycle (Steel-man Fix)
    const db = new Database(dbPath);
    let hasDetections = false;
    try {
        const detectionsRow = await db.get("SELECT COUNT(*) as count FROM visual_events WHERE cycle = ? AND actor_id = ? AND description LIKE '%[DETECTION]%'", [state.round, agent.id]);
        hasDetections = detectionsRow ? detectionsRow.count > 0 : false;
    } catch (e) {
        console.error("[WAKEUP-DETECTION-ERROR]", e.message);
    }
    await db.close();
    
    // Initialize baselines if they don't exist yet (Freeze on sleep initiation)
    if (!agent.sleep_baselines && snapshot) {
        agent.sleep_baselines = {
            bobs_count: snapshot.bobs_count,
            ships_count: snapshot.ships_count,
            infra_count: snapshot.infra_count,
            active_infra_count: snapshot.active_infra_count,
            core_matter: snapshot.core_matter
        };
    }
    
    let wakeUp = false;
    let wakeReason = "";
    
    const myInbox = state.global_inbox[agent.id] || [];
    const hasUnreadScut = myInbox.some(item => item.type === 'scut');
    const hasVoG = myInbox.some(item => item.type === 'vog');
    const hasPriorityScut = snapshot ? snapshot.priority_scuts > 0 : false;
    const isDnd = agent.sleep_state === 2;

    // --- DEKLARATIVE WAKEUP PIPELINE (SENSORS) ---
    const wakeupSensors = [
        // Tier II: Administrative Alarms
        {
            trigger: () => hasVoG,
            reason: "Direct administrative command of the Progenitor (VoG Broadcast)."
        },
        {
            trigger: () => agent.needsResumeNotify,
            reason: "System operations resumed. Synchronizing local timeline references.",
            cleanup: () => { agent.needsResumeNotify = false; }
        },
        {
            trigger: () => hasPriorityScut,
            reason: "Emergency Broadcast Beacon received with critical priority."
        },
        {
            trigger: () => hasUnreadScut && !isDnd,
            reason: "Incoming sub-etheric radio transmission (SCUT)."
        },
        {
            trigger: () => hasDetections && !isDnd,
            reason: "Orte neues Sternensystem! Passive Sensoren haben unbekannte stellare Signaturen erfasst."
        },
        // Tier III: Navigational Alarms
        {
            trigger: () => agent.status === 'active' && agent.last_status === 'traveling',
            reason: "Transit finished. Movement status updated to stationary."
        },
        // Tier IV: Physical Alarms (Unblockable by DND - Triggers on any sector state change)
        {
            trigger: () => snapshot && snapshot.bobs_count !== agent.sleep_baselines.bobs_count,
            reason: () => `Demographic contact! Sector population changed (Before: ${agent.sleep_baselines.bobs_count}, Current: ${snapshot.bobs_count}).`
        },
        {
            trigger: () => snapshot && snapshot.ships_count !== agent.sleep_baselines.ships_count,
            reason: () => `Radar contact! Local sector ship count changed (Before: ${agent.sleep_baselines.ships_count}, Current: ${snapshot.ships_count}).`
        },
        {
            trigger: () => snapshot && snapshot.infra_count !== agent.sleep_baselines.infra_count,
            reason: () => `Industrial signal! Sector infrastructure list changed (Before: ${agent.sleep_baselines.infra_count}, Current: ${snapshot.infra_count}).`
        },
        {
            trigger: () => snapshot && snapshot.active_infra_count !== agent.sleep_baselines.active_infra_count,
            reason: () => `Construction status update! Local structure operational states changed (Before: ${agent.sleep_baselines.active_infra_count}, Current: ${snapshot.active_infra_count}).`
        },
        {
            trigger: () => snapshot && snapshot.has_low_health,
            reason: "Structural distress! Asset health dropped below 80% capacity."
        },
        {
            trigger: () => snapshot && snapshot.core_matter <= 0 && agent.sleep_baselines.core_matter > 0,
            reason: "Resource exhaustion! Sector core matter has been fully depleted."
        }
    ];

    const activeAlarm = wakeupSensors.find(sensor => sensor.trigger());
    if (activeAlarm) {
        wakeUp = true;
        wakeReason = typeof activeAlarm.reason === 'function' ? activeAlarm.reason() : activeAlarm.reason;
        if (activeAlarm.cleanup) activeAlarm.cleanup();
    }

    if (wakeUp) {
        console.log(`  [WAKE] Replicant ${agent.id} awakened! Reason: ${wakeReason}`);
        agent.sleep_state = 0;
        agent.sleep_until_cycle = 0;
        agent.sleep_baselines = null;
        agent.wake_reason = wakeReason; // Pass reason reference
        
        // Symmetrisch in SQLite freigeben (NATIV IN JS!)
        const db = new Database(dbPath);
        await db.run("UPDATE agents SET sleep_state=0, sleep_until_round=0 WHERE id = ?", [agent.id]);
        await db.close();
        
        agent.wakeup_notification = `\n[SYSTEM NOTIFICATION]: Standby deactivated. Reason: ${wakeReason}\n`;
        return false; // Standby ended, turn active!
    } else {
        console.log(`  [SLEEPING] ${agent.id} is in deep sleep mode (Until cycle: ${agent.sleep_until_cycle}).`);
        fs.appendFileSync(logFile, `### [STANDBY] Replicant ${agent.id} is in deep sleep mode (Current cycle: ${state.round}).\n\n`);
        return true; // Remained in standby, turn skipped!
    }
}

module.exports = {
    handleStandby,
    getSectorSnapshot
};
