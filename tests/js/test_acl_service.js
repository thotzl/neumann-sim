const assert = require('assert');
const { checkAccess } = require('../../src/sim_engine/services/acl_service');

console.log("==================================================");
console.log("🚀 STARTING ACL SERVICE UNIT TESTS");
console.log("==================================================");

try {
    // 1. Setup mock state
    const state = {
        security: {
            acl: {
                "scripts/admin.py": { owner: "Instance-1", write_key: "master_key" },
                "scripts/closed_circle.py": { owner: "Instance-2", read_key: "shared_key" }
            },
            wallets: {
                "Instance-1": { label1: "master_key" },
                "Instance-2": { label1: "shared_key" },
                "Instance-3": { label1: "guest_key" }
            }
        }
    };

    // 2. Test: No ACL (Granted by default)
    console.log("Test 1: Unprotected files are accessible by default...");
    const unprotectedRes = checkAccess("scripts/public.py", "WRITE", "Instance-3", state);
    assert.strictEqual(unprotectedRes.granted, true, "Access to unprotected file was incorrectly denied!");

    // 3. Test: Stolen Write Access (Denied due to missing write_key)
    console.log("Test 2: Protected write files are blocked without keys...");
    const blockedWrite = checkAccess("scripts/admin.py", "WRITE", "Instance-3", state);
    assert.strictEqual(blockedWrite.granted, false, "Write access to protected file was incorrectly granted!");
    assert.match(blockedWrite.reason, /DENIED: Cryptographic protection/);

    // 4. Test: Stolen Read Access (Denied due to missing read_key)
    console.log("Test 3: Closed-circle read files are blocked without keys...");
    const blockedRead = checkAccess("scripts/closed_circle.py", "READ", "Instance-3", state);
    assert.strictEqual(blockedRead.granted, false, "Read access to closed circle was incorrectly granted!");

    // 5. Test: Correct Write Access (Granted due to matching write_key)
    console.log("Test 4: Write access is granted with matching write_key...");
    const grantedWrite = checkAccess("scripts/admin.py", "WRITE", "Instance-1", state);
    assert.strictEqual(grantedWrite.granted, true, "Write access was incorrectly denied to key owner!");

    // 6. Test: Closed Circle Read (Granted due to matching read_key)
    console.log("Test 5: Read access is granted with matching read_key...");
    const grantedRead = checkAccess("scripts/closed_circle.py", "READ", "Instance-2", state);
    assert.strictEqual(grantedRead.granted, true, "Read access was incorrectly denied in closed circle!");

    // 7. Test: Closed Circle Write (Blocked because shared_key acts as read-key only)
    console.log("Test 6: Closed-circle write is blocked with only read_key in wallet...");
    const blockedCircleWrite = checkAccess("scripts/closed_circle.py", "WRITE", "Instance-3", state);
    assert.strictEqual(blockedCircleWrite.granted, false, "Write access was incorrectly granted to unkeyed circular agent!");

    console.log("\n🎉 ALL ACL SERVICE UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (e) {
    console.error("\n❌ ACL service test failed:", e.message);
    process.exit(1);
}
