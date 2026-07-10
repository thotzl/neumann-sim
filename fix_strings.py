import re

files = [
    'bob_os/test_suite/sdk_tests/test_flat_sdk.py',
    'bob_os/test_suite/sdk_tests/test_full_sdk.py',
    'bob_os/test_suite/sdk_tests/test_ubcl.py',
    'bob_os/test_suite/test_transfer.py'
]

for path in files:
    with open(path, 'r') as f:
        text = f.read()
    
    text = text.replace("'energy_inventory'", "'energy'")
    text = text.replace("'raw_matter_inventory'", "'matter'")
    text = text.replace("raw_matter_inventory mined", "matter mined")
    text = text.replace("energy_inventory: ", "energy: ")
    text = text.replace("raw_matter_inventory: ", "matter: ")
    
    with open(path, 'w') as f:
        f.write(text)

