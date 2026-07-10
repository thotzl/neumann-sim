import bob_sdk

agent = bob_sdk.Agent()

# Versuche, Materie abzubauen. Benötigt 30 Energie.
# Falls nicht genügend Energie vorhanden ist, wird die Aktion fehlschlagen.
agent.actuators.mine()

# Nach erfolgreichem Abbau sollte mein Inventar mit 100 Materie gefüllt sein.
# Versuche, die Materie in das System-Depot einzuzahlen.
# Dies setzt voraus, dass nach einem erfolgreichen mine() 100 Materie im Inventar ist.
# Die Einzahlung wird Materie aus meinem Inventar in das System-Depot verschieben.
agent.actuators.deposit(amount=100)