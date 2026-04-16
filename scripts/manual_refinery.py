import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import json

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

# High-Quality Polished Data (v5.9.7 Natural Narrative Mode)
POLISHED_DATA = {
    1: {
        "title": "Clinical-Grade IPL Laser Hair Removal System",
        "desc": "Professional-level IPL technology for permanent hair reduction. Gentle, safe, and effective for all sensitive areas.",
        "hook": "Stop recurring clinic visits and experience permanent smoothness from the comfort of your home.",
        "logic": "We've deconstructed the 'Luxury Spa' markup. By sourcing the same clinical laser components directly, we provide professional performance without the $2000 branding fee.",
        "closing": "Precision technology. Transparent value."
    },
    2: {
        "title": "EliteBeam™ Pro: High-Intensity Laser Esthetics Station",
        "desc": "A powerhouse of aesthetic technology. Featuring infinite pulse technology and optimized cooling for a painless, medical-grade experience.",
        "hook": "Achieve silk-smooth skin results once reserved only for high-end medical spas.",
        "logic": "Typical retail brands charge 5x for the same internal diode. We've bypassed the glossy billboards to deliver industrial integrity at an artisan price point.",
        "closing": "The smart choice for long-term beauty."
    },
    3: {
        "title": "AuraPulse™ Professional Hair Removal Device",
        "desc": "Engineered for durability and precision. This device uses broad-spectrum pulse light to target follicles at the root.",
        "hook": "Professional-grade hair reduction that respects your skin's delicate ecosystem.",
        "logic": "Why pay for a celebrity endorsement? Our value is built into the engineering, not the marketing budget. Directly from the floor to your hand.",
        "closing": "Verified quality. Unbeatable value."
    },
    4: {
        "title": "Foldable Precision-Pulse IPL Device",
        "desc": "The ultimate travel-friendly aesthetic tool. Folds for ergonomics while maintaining full clinical power output.",
        "hook": "Uncompromising power in a versatile, folding design for perfect angles everywhere.",
        "logic": "Mechanical ingenuity shouldn't come with a 'brand tax'. We source directly from the engineering innovators who build for the big names.",
        "closing": "Your skin, your schedule, our value."
    },
    5: {
        "title": "LuminaSkin™ Photorejuvenation System",
        "desc": "Dual-action technology: Permanent hair reduction plus skin-tone evening photorejuvenation in one device.",
        "hook": "Transform your skin texture while eliminating unwanted hair with one clinical tool.",
        "logic": "Direct-to-consumer means you own the technology, not the retail overhead. Professional grade components, honest artisan pricing.",
        "closing": "Total skin confidence starts here."
    },
    10: {
        "title": "AetherVac™ Intelligent Navigation Robot",
        "desc": "State-of-the-art lidar mapping and high-torque suction. Bypasses obstacles with millimetric precision.",
        "hook": "Reclaim your time with a robot that truly understands the geography of your home.",
        "logic": "Modern smart-home tech often carries a 300% brand markup. We source the same high-precision sensors used in $800 models, straight from the artisan floor.",
        "closing": "Autonomous cleaning. Radical transparency."
    },
    18: {
        "title": "Medical-Grade 7-Color LED Therapy Mask",
        "desc": "A full-spectrum light therapy suite. 7 distinct wavelengths to target acne, wrinkles, and inflammation simultaneously.",
        "hook": "Professional photo-therapy sessions now fit perfectly into your daily self-care ritual.",
        "logic": "We've removed the middleman from the beauty industry. Same clinical LED arrays, same results, zero 'Luxury Department Store' surcharge.",
        "closing": "Science-backed beauty, artisan-direct value."
    },
    22: {
        "title": "ArcticPulse™ Ice-Cooling IPL System",
        "desc": "Integrated freezing-point technology protects skin while the laser targets the follicle. Maximum power, zero discomfort.",
        "hook": "The most comfortable clinical-grade hair removal experience ever engineered.",
        "logic": "Cooling technology is an engineering feat, not a brand status symbol. We pay for the components, you save on the tax.",
        "closing": "Cool. Calm. Collected. Clinical."
    }
}

def apply_manual_refinery():
    with engine.connect() as conn:
        for p_id, data in POLISHED_DATA.items():
            query = text("""
                UPDATE candidate_products 
                SET title_en_preview = :title,
                    description_zh = :desc,
                    desire_hook = :hook,
                    desire_logic = :logic,
                    desire_closing = :closing,
                    status = 'refined',
                    audit_notes = 'Manual Agent-Led Refinery (Labels Removed)'
                WHERE id = :id
            """)
            conn.execute(query, {
                "id": p_id,
                "title": data['title'],
                "desc": data['desc'],
                "hook": data['hook'],
                "logic": data['logic'],
                "closing": data['closing']
            })
        conn.commit()
        print(f"✅ Manually refined {len(POLISHED_DATA)} key items.")

if __name__ == "__main__":
    apply_manual_refinery()
