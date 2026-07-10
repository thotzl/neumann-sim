files = [
    'bob_os/test_suite/sdk_tests/test_flat_sdk.py',
    'bob_os/test_suite/sdk_tests/test_full_sdk.py',
    'bob_os/test_suite/test_transfer.py'
]

for path in files:
    with open(path, 'r') as f:
        text = f.read()
    
    # We want to change status['matter'] to status['raw_matter_inventory']
    text = text.replace("['matter']", "['raw_matter_inventory']")
    text = text.replace("['energy']", "['energy_inventory']")
    
    with open(path, 'w') as f:
        f.write(text)

with open('bob_os/test_suite/sdk_tests/test_ubcl.py', 'r') as f:
    text = f.read()
    text = text.replace("'energy: 100'", "'energy_inventory: 100'")
    text = text.replace("'matter: 50'", "'raw_matter_inventory: 50'")
with open('bob_os/test_suite/sdk_tests/test_ubcl.py', 'w') as f:
    f.write(text)

