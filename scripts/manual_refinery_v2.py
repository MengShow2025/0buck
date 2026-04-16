import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

# Expanded High-Quality Polished Data
POLISHED_DATA_V2 = {
    11: {
        "title": "AuraMoist™ 2-in-1 Floor Navigation Robot",
        "desc": "The ultimate floor care assistant. High-frequency vibration mopping combined with 3000Pa vacuum suction for a pristine home environment.",
        "hook": "Enjoy the luxury of a professionally cleaned floor, every single morning, without lifting a finger.",
        "logic": "By removing the 'Smart Home' retail premium, we offer the same brushless motors and mapping algorithms found in $600 flagship models at a fraction of the cost.",
        "closing": "Autonomous care for the modern home."
    },
    12: {
        "title": "PrecisionScan™ Intelligent Sweeping Hub",
        "desc": "Advanced infrared obstacle avoidance and intelligent route planning ensure 100% coverage of your living space.",
        "hook": "Smart automation that works around your life, not the other way around.",
        "logic": "We source the same LIDAR and sensor arrays used by industry leaders, eliminating the brand markup and passing the efficiency directly to you.",
        "closing": "Engineered for excellence. Priced for truth."
    },
    19: {
        "title": "Industrial-Grade Electric Scooter Solid Tire",
        "desc": "High-durability honeycomb design. Puncture-proof, shock-absorbing, and engineered for 5000+ miles of urban commuting.",
        "hook": "End the frustration of flat tires forever with military-grade solid-state engineering.",
        "logic": "Proprietary rubber compounds often carry hidden 'Tech Brand' surcharges. We deliver the pure material science directly from the specialized artisan factory.",
        "closing": "Reliable mobility for the long haul."
    },
    20: {
        "title": "DeepRelief™ Infrared Phototherapy System",
        "desc": "Medical-grade 660nm and 850nm dual-wavelength infrared light for deep tissue recovery and skin rejuvenation.",
        "hook": "Accelerate your body's natural healing process with clinical-strength light therapy.",
        "logic": "Professional wellness tech shouldn't be a luxury. We provide the same high-output LED diodes used in sports medicine clinics without the boutique pricing.",
        "closing": "Science-backed recovery at your fingertips."
    },
    23: {
        "title": "ZenPaw™ Secure Grooming Hammock",
        "desc": "Double-layered reinforced fabric for safe, stress-free pet nail trimming and grooming at home.",
        "hook": "Turn a stressful grooming day into a calm, professional-grade spa experience for your pet.",
        "logic": "Innovative pet comfort doesn't require a high-street logo. We source the same durable materials used by top vets, bypassing the retail markup.",
        "closing": "Artisan care for your beloved companions."
    }
}

def apply_refinery_v2():
    with engine.connect() as conn:
        for p_id, data in POLISHED_DATA_V2.items():
            query = text("""
                UPDATE candidate_products 
                SET title_en_preview = :title,
                    description_zh = :desc,
                    desire_hook = :hook,
                    desire_logic = :logic,
                    desire_closing = :closing,
                    status = 'refined',
                    audit_notes = 'Manual Agent-Led Refinery (v5.9.7 Natural)'
                WHERE id = :id
            """)
            conn.execute(query, {
                "id": p_id, "title": data['title'], "desc": data['desc'], "hook": data['hook'], "logic": data['logic'], "closing": data['closing']
            })
        conn.commit()
        print(f"✅ Refined {len(POLISHED_DATA_V2)} more items.")

if __name__ == "__main__":
    apply_refinery_v2()
