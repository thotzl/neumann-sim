import sys
import os

def delete_file(filepath):
    if "--help" in sys.argv:
        print("Syntax: python3 tools/delete.py <pfad_zur_datei>")
        print("Beschreibung: Löscht eine Datei im Dateisystem (z.B. ein Skript in scripts/active/).")
        return

    if not filepath:
        print("[ERROR] Kein Dateipfad angegeben. Nutze --help.")
        return

    # Sicherheits-Check: Nur Dateien im _verse Ordner löschen
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    full_path = os.path.abspath(filepath)
    
    if not full_path.startswith(base_dir):
        print(f"[DENIED] Zugriff außerhalb des erlaubten Bereichs: {filepath}")
        return
        
    if not os.path.exists(full_path):
        print(f"[ERROR] Datei '{filepath}' existiert nicht.")
        return
        
    if os.path.isdir(full_path):
        print(f"[ERROR] '{filepath}' ist ein Verzeichnis. Kann nicht gelöscht werden.")
        return

    try:
        os.remove(full_path)
        print(f"[SUCCESS] Datei '{filepath}' wurde gelöscht.")
    except Exception as e:
        print(f"[ERROR] Konnte '{filepath}' nicht löschen: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        delete_file(sys.argv[1])
    else:
        delete_file(None)
