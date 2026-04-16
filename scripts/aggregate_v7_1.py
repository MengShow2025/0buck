import os
import json

def aggregate():
    files = [
        'deliverables/batch_v7_1/electronics.json', 
        'deliverables/batch_v7_1/home_kitchen.json', 
        'deliverables/batch_v7_1/beauty_personal_care.json', 
        'deliverables/batch_v7_1/pet_supplies.json', 
        'deliverables/batch_v7_1/sports_outdoors.json'
    ]
    all_data = []
    for f in files:
        if os.path.exists(f):
            with open(f) as jf:
                all_data.extend(json.load(jf))
        else:
            print(f"File {f} not found!")
            
    with open('deliverables/batch_v7_1/V7.1-Batch-01_Summary.json', 'w') as out:
        json.dump(all_data, out, indent=2)
    print(f"Combined {len(all_data)} products into summary.")

if __name__ == "__main__":
    aggregate()
