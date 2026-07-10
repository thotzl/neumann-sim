import bob_sdk
me = bob_sdk.Agent()

# Führe einen Dashboard-Scan durch, um den aktuellen Status von Energie und Materie zu erhalten.
status = me.dashboard()

# Prüfe, ob genügend Energie zum Abbau vorhanden ist (30 Energie).
if status['agent']['energy'] >= 30:
    me.mine() # Baue Materie ab

# Nach dem Abbau (oder wenn keine Energie zum Abbau vorhanden war, aber Materie im Inventar ist)
# führe erneut einen Dashboard-Scan durch, um den aktualisierten Materiebestand zu ermitteln.
status = me.dashboard()

# Zahle alle gesammelte Materie ins System-Depot ein.
if status['agent']['matter'] > 0:
    me.deposit(amount=status['agent']['matter'], resource='matter')