import os
import re

replacements = {
    r'\bresources\b': 'extractable_matter_in_core',
    r'\bmatter_stored\b': 'raw_matter_depot',
    r'\bmatter_cap\b': 'depot_matter_capacity',
    r'\benergy_stored\b': 'energy_depot',
    r'\benergy_cap\b': 'depot_energy_capacity',
    r'\bstorage_limit\b': 'matter_storage_capacity',
    r'\bmatter\b': 'raw_matter_inventory',
    r'\benergy\b': 'energy_inventory',
    r'agent\.actuators\.mine\(': 'agent.mine(',
    r'agent\.actuators\.move\(': 'agent.move(',
    r'agent\.actuators\.build\(': 'agent.build(',
    r'agent\.actuators\.refine\(': 'agent.refine(',
}

# Fixes for avoiding double replacements like raw_raw_matter_inventory_inventory
exclude_patterns = [
    r'raw_matter_inventory',
    r'energy_inventory',
    r'extractable_matter_in_core',
    r'raw_matter_depot',
    r'depot_matter_capacity',
    r'energy_depot',
    r'depot_energy_capacity',
    r'matter_storage_capacity',
    r'refined_matter_inventory',
    r'progress_matter',
    r'required_matter',
    r'matter_to_invest',
    r'matter_generation_per_cycle',
    r'energy_generation_per_cycle'
]

def replace_safe(text):
    # This is tricky because we might replace part of a new name if we do it sequentially.
    # Better to do a single pass using a function.
    
    # First, handle specific API call mappings
    text = re.sub(r'agent\.actuators\.([a-z_]+)\(', r'agent.\1(', text)
    
    # Handle amount -> matter_to_invest specifically in build/invest calls
    text = re.sub(r'(agent\.build\([^)]*)amount=', r'\1matter_to_invest=', text)
    
    # Word replacements mapping
    word_map = {
        'resources': 'extractable_matter_in_core',
        'matter_stored': 'raw_matter_depot',
        'matter_cap': 'depot_matter_capacity',
        'energy_stored': 'energy_depot',
        'energy_cap': 'depot_energy_capacity',
        'storage_limit': 'matter_storage_capacity',
        'matter': 'raw_matter_inventory',
        'energy': 'energy_inventory',
    }
    
    # Reverse lookups to avoid re-replacing
    new_names = set(word_map.values())
    new_names.update(['progress_matter', 'required_matter', 'refined_matter_inventory', 'matter_to_invest', 'raw_matter_to_refine', 'matter_generation_per_cycle', 'energy_generation_per_cycle'])

    def replacer(match):
        word = match.group(0)
        # Check if this word is part of an already updated name, e.g., raw_matter_inventory
        # Actually regex \b catches the whole word if we use it correctly
        if word in word_map:
            return word_map[word]
        return word

    # Build regex that matches any of the words
    pattern = re.compile(r'\b(' + '|'.join(word_map.keys()) + r')\b')
    
    # We shouldn't replace if it's part of a larger compound word not separated by \b (wait, \b separates at _)
    # Ah! In python, \b matches between \w (alphanumeric+_) and non-\w.
    # So \bmatter\b will NOT match inside raw_matter_inventory because _ is \w.
    # This is perfect!
    
    return pattern.sub(replacer, text)

targets = [
    'bob_os/test_suite/',
    'bob_os/test_suite/sdk_tests/',
    'sim_engine/'
]

files_to_process = []
for target in targets:
    for root, _, files in os.walk(target):
        for file in files:
            if file.endswith('.py') or file.endswith('.js'):
                # Ignore node_modules if any
                if 'node_modules' not in root:
                    files_to_process.append(os.path.join(root, file))

for path in files_to_process:
    with open(path, 'r') as f:
        content = f.read()
        
    new_content = replace_safe(content)
    
    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Updated {path}")

