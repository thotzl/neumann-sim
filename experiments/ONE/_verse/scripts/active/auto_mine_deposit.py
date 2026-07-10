import bob_sdk
me = bob_sdk.Agent()

# Check current energy
current_energy = me.energy()

# If energy is low, withdraw from system depot
if current_energy < 30:
    me.withdraw(resource="energy", amount=60)
    # Re-check energy after withdrawal for safety, though it should be updated internally

# Mine 100 matter
me.mine()

# Deposit collected matter into the system depot
me.deposit(amount=100, resource="matter")