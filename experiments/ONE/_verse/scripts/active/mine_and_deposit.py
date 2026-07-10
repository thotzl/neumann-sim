import bob_sdk
me = bob_sdk.Agent()

# Materie abbauen
mine_amount = me.mine()

# Abgebaute Materie ins System-Depot einzahlen
if mine_amount > 0:
    me.deposit(amount=mine_amount, resource="materie")