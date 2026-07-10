import bob_sdk
me = bob_sdk.Agent()

# Hole aktuellen Status
status = me.storage()

# Wenn Materie im Inventar ist, einzahlen
if status.get('matter', 0) > 0:
    me.deposit(amount=status['matter'], resource='matter')
    status = me.storage() # Status nach Einzahlung aktualisieren

# Energie prüfen und ggf. entnehmen
if status.get('energy', 0) < 30: # 30 Energie für eine Mine-Operation
    me.withdraw(resource='energy', amount=30)
    status = me.storage() # Status nach Entnahme aktualisieren

# Materie abbauen, wenn genug Energie vorhanden
if status.get('energy', 0) >= 30:
    me.mine()