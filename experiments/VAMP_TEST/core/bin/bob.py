import sys
import os
import argparse
from core.lib import bob_sdk

def main():
    parser = argparse.ArgumentParser(prog="bob", description="Unified Bob Command Line (UBCL)")
    subparsers = parser.add_subparsers(dest="command", help="Hardware & Systembefehle")

    # Actuators
    subparsers.add_parser("mine", help="Baut Materie ab")
    
    # Logistics
    p_dep = subparsers.add_parser("deposit", help="Zahlt Materie ins Silo ein")
    p_dep.add_argument("amount", type=int, default=100, nargs="?")

    p_wit = subparsers.add_parser("withdraw", help="Entnimmt Energie/Materie aus dem Depot")
    p_wit.add_argument("resource", choices=["energy", "matter"], default="energy")
    p_wit.add_argument("amount", type=int, default=50)

    # Comms
    p_scut = subparsers.add_parser("scut", help="Sendet eine Nachricht")
    p_scut.add_argument("receiver")
    p_scut.add_argument("message")

    # Diagnostics / Sensors
    subparsers.add_parser("storage", help="Zeigt eigene Füllstände")
    subparsers.add_parser("fs", help="Listet eigene Skripte auf")

    args = parser.parse_args()
    
    try:
        agent = bob_sdk.Agent()
        if args.command == "mine":
            agent.actuators.mine()
        elif args.command == "deposit":
            agent.logistics.deposit(args.amount)
        elif args.command == "withdraw":
            agent.logistics.withdraw(args.resource, args.amount)
        elif args.command == "scut":
            agent.comms.scut(args.receiver, args.message)
        elif args.command == "storage":
            print(agent.sensors.storage())
        elif args.command == "fs":
            print(agent.diagnostics.list_files())
        else:
            parser.print_help()
    except Exception as e:
        print(f"[CLI ERROR] {str(e)}")

if __name__ == "__main__":
    main()
