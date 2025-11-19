#!/usr/bin/env python3
"""
Script to combine per-instance details from info_for_leaderboard.json
into the leaderboards.json file for all model entries.
"""

import json
import sys
from pathlib import Path


# Mapping from info_for_leaderboard.json keys to leaderboard entry names
MODEL_MAPPING = {
    'gpt-5': 'GPT-5 (2025-08-07) (medium reasoning)',
    'gpt-5-mini': 'GPT-5 mini (2025-08-07) (medium reasoning)',
    'sonnet-4': 'Claude 4 Sonnet (20250514)',
    'sonnet-4-5': 'Claude 4.5 Sonnet (20250929)',
}


def main():
    # Define file paths
    script_dir = Path(__file__).parent
    info_file = script_dir / "info_for_leaderboard.json"
    leaderboards_file = script_dir / "leaderboards.json"
    backup_file = script_dir / "leaderboards.json.backup"

    # Check files exist
    if not info_file.exists():
        print(f"Error: {info_file} not found")
        return 1

    if not leaderboards_file.exists():
        print(f"Error: {leaderboards_file} not found")
        return 1

    # Load the info file
    print(f"Loading {info_file}...")
    with open(info_file, 'r') as f:
        info_data = json.load(f)

    print(f"Found {len(info_data)} model entries in info file")
    print(f"Available models: {list(info_data.keys())}")

    # Load leaderboards
    print(f"\nLoading {leaderboards_file}...")
    with open(leaderboards_file, 'r') as f:
        leaderboards_data = json.load(f)

    # Find bash-only leaderboard
    bash_only = None
    bash_only_idx = None
    for idx, lb in enumerate(leaderboards_data['leaderboards']):
        if lb.get('name') == 'bash-only':
            bash_only = lb
            bash_only_idx = idx
            break

    if bash_only is None:
        print("Error: 'bash-only' leaderboard not found")
        return 1

    print(f"Found 'bash-only' leaderboard with {len(bash_only['results'])} entries")

    # Track which models will be updated
    models_to_update = []
    for info_key, leaderboard_name in MODEL_MAPPING.items():
        if info_key not in info_data:
            print(f"\nWarning: '{info_key}' not found in info file, skipping...")
            continue

        # Find the entry in leaderboard
        entry_idx = None
        for idx, result in enumerate(bash_only['results']):
            if result.get('name') == leaderboard_name:
                entry_idx = idx
                break

        if entry_idx is None:
            print(f"\nWarning: '{leaderboard_name}' not found in leaderboard, skipping...")
            continue

        # Check if already has per_instance_details
        has_details = 'per_instance_details' in bash_only['results'][entry_idx]
        num_instances = len(info_data[info_key])

        models_to_update.append({
            'info_key': info_key,
            'leaderboard_name': leaderboard_name,
            'entry_idx': entry_idx,
            'num_instances': num_instances,
            'has_details': has_details,
        })

        status = "(will overwrite)" if has_details else "(new)"
        print(f"\n  - {leaderboard_name} {status}")
        print(f"    {num_instances} instances from '{info_key}'")

    if not models_to_update:
        print("\nError: No models to update")
        return 1

    # Ask for confirmation
    print(f"\n{'='*60}")
    print(f"Will update {len(models_to_update)} model(s)")

    overwrite_count = sum(1 for m in models_to_update if m['has_details'])
    if overwrite_count > 0:
        print(f"Warning: {overwrite_count} model(s) already have per_instance_details")

    response = input("\nContinue? (yes/no): ").strip().lower()
    if response != 'yes':
        print("Aborted.")
        return 0

    # Create backup
    print(f"\nCreating backup at {backup_file}...")
    with open(backup_file, 'w') as f:
        json.dump(leaderboards_data, f, indent=2)

    # Update all models
    print("\nUpdating models...")
    for model in models_to_update:
        info_key = model['info_key']
        entry_idx = model['entry_idx']
        leaderboard_name = model['leaderboard_name']

        per_instance_details = info_data[info_key]
        leaderboards_data['leaderboards'][bash_only_idx]['results'][entry_idx]['per_instance_details'] = per_instance_details

        print(f"  ✓ {leaderboard_name}: {len(per_instance_details)} instances")

    # Write updated data
    print(f"\nWriting updated data to {leaderboards_file}...")
    with open(leaderboards_file, 'w') as f:
        json.dump(leaderboards_data, f, indent=2)

    print("\n" + "="*60)
    print("✓ Success! All models updated")
    print(f"  - Backup saved to: {backup_file}")
    print(f"  - Models updated: {len(models_to_update)}")

    # Show sample of added data for first model
    if models_to_update:
        first_model = models_to_update[0]
        print(f"\nSample instances from {first_model['leaderboard_name']}:")
        sample_data = info_data[first_model['info_key']]
        for i, (key, value) in enumerate(list(sample_data.items())[:3]):
            print(f"  - {key}: resolved={value.get('resolved')}, cost={value.get('cost')}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
