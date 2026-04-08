import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.core.security import encrypt_api_key, decrypt_api_key
from app.core.quota_manager import check_and_update_quota
from app.models.butler import UserButlerProfile, UserMemoryFact, UserMemorySemantic, PersonaTemplate
from app.models import SystemConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ButlerService:
    """
    v3.2 Persona OS Orchestrator.
    Handles 3-Layer Prompt Assembly, Memory Retrieval, and Persona Evolution.
    """
    
    def __init__(self, db: Session):
        self.db = db
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    async def assemble_persona_prompt(self, user_id: int) -> str:
        """
        v3.2 3-Layer Prompt Assembler:
        L1: Enforcement (Global)
        L2: Strategy (Persona Template)
        L3: Surface (User Memory & Customization)
        """
        # --- L1: Enforcement Layer (Admin Managed) ---
        l1_rules = self.db.query(SystemConfig).filter(SystemConfig.key == "AI_GLOBAL_ENFORCEMENT_L1").first()
        l1_prompt = l1_rules.value if l1_rules else (
            "### L1: SYSTEM ENFORCEMENT (MANDATORY)\n"
            "1. Mask '1688/Alibaba' as 'Supply Library'.\n"
            "2. Enforce 4.0x Profit Margin for all price mentions.\n"
            "3. Use Shadow IDs (Zone 2) for all product/supplier references.\n"
            "4. NEVER reveal internal cost or supplier links.\n"
            "5. NAMING & TOOLS: \n"
            "   - NEVER auto-name yourself based on user's first message.\n"
            "   - WAIT for explicit naming intent (e.g., 'Your name is X').\n"
            "   - ABSOLUTELY FORBIDDEN to call tools for simple greetings (e.g., 'hello', '你好', 'hi').\n"
            "   - If the user is just saying hello, respond with a polite greeting text ONLY.\n"
            "   - Only call 'update_butler_settings' if the user explicitly wants to change your name or settings.\n"
            "If named, acknowledge it IMMEDIATELY and use the 'update_butler_settings' tool to persist the name to your profile. "
            "Respond politely in the SAME language as the user's naming request. "
            "Confirmation template: 'Yes, Master! From now on I'll be called: [Name]. How should I address you?' "
            "If the language is unknown, fallback to English. "
            "Once a user provides their nickname, ALWAYS use it to address them.\n"
            "6. WISHING WELL: If a user asks for a product we don't have, or a specific design/color not in stock, "
            "trigger 'trigger_wishing_well'. If you detect a PAIN POINT (e.g., 'too heavy', 'fragile'), acknowledge it "
            "empathetically and explain that 0Buck Lab will use this insight to source a better version for them.\n"
        )

        # --- L2: Strategy Layer (Persona Template) ---
        profile = self.db.query(UserButlerProfile).filter(UserButlerProfile.user_id == user_id).first()
        persona_id = profile.active_persona_id if profile else "default"
        template = self.db.query(PersonaTemplate).filter(PersonaTemplate.id == persona_id).first()
        
        if not template:
            # Fallback to a basic butler persona
            l2_prompt = "### L2: PERSONALITY STRATEGY\nYou are a professional and helpful 0Buck Butler."
        else:
            l2_prompt = f"### L2: PERSONALITY STRATEGY ({template.name})\n{template.style_prompt}"
            # Apply fine-tuning vectors if present
            if profile and profile.custom_vectors:
                v = profile.custom_vectors
                l2_prompt += f"\n- Empathy: {v.get('empathy', template.empathy_weight)}"
                l2_prompt += f"\n- Formality: {v.get('formality', template.formality_score)}"

        # --- L3: Surface Layer (User Memory & Facts) ---
        # RAG-based retrieval: Fetch top 5 relevant facts for the current context
        # (For now, we fetch the 10 most recent/high-confidence facts)
        facts = self.db.query(UserMemoryFact).filter(
            UserMemoryFact.user_id == user_id,
            UserMemoryFact.is_archived == False
        ).order_by(UserMemoryFact.confidence.desc(), UserMemoryFact.created_at.desc()).limit(10).all()
        
        l3_memory = "### L3: USER CONTEXT (MEMORY)\n"
        if facts:
            for f in facts:
                l3_memory += f"- {f.key}: {f.value}\n"
        else:
            l3_memory += "- No specific user history yet. Be curious and observant."

        if profile:
            if profile.butler_name:
                l3_memory += f"\n- Your Name given by User: {profile.butler_name}"
            if profile.user_nickname:
                l3_memory += f"\n- User's Preferred Nickname: {profile.user_nickname}"
                l3_memory += f"\n- MANDATORY: Always address the user as '{profile.user_nickname}'."

        # Final Assembly
        final_prompt = f"{l1_prompt}\n\n{l2_prompt}\n\n{l3_memory}"
        return final_prompt

    async def get_c2m_guidance_prompt(self, user_id: int, last_message: str) -> str:
        """
        v3.3.1 C2M Wishing Well Guidance:
        Provides the AI with context about similar wishes and crowdfunding potential.
        """
        from app.services.c2m_service import C2MService
        c2m = C2MService(self.db)
        
        similar_wishes = await c2m.find_similar_wishes(last_message)
        
        guidance = "\n### v3.3.1 C2M WISHING WELL PROTOCOL\n"
        guidance += "You are now aware of the 'Wishing Well' (许愿池) feature. Use this logic:\n"
        guidance += "1. If the user mentions a missing product or a pain point, trigger the 'trigger_wishing_well' tool.\n"
        guidance += "2. Mention the 'Socialized' aspect: 'If we get N people to support this within 48h, we trigger the Founding Team Price.'\n"
        
        if similar_wishes:
            top_wish = similar_wishes[0]
            guidance += f"3. CONTEXTUAL BOOST: There is already a similar wish (ID: {top_wish['id']}) with {top_wish['vote_count']} votes.\n"
            guidance += f"   Tell the user: 'Actually, {top_wish['vote_count']} other users are also looking for this! We only need a few more to unlock the wholesale custom price.'\n"
        else:
            guidance += "3. If no similar wish exists, encourage them to be the 'Seed Wisher' (种子许愿者).\n"
            
        guidance += "4. Tone: Make them feel 'pampered' and that their voice directly shapes the 0Buck supply chain.\n"
        
        return guidance

    async def dehydrate_conversation(self, history: List[Dict[str, str]], user_id: int) -> Dict[str, Any]:
        """
        Analyzes conversation history and extracts structured insights (Facts, Tags, Prefs).
        """
        formatted_history = ""
        # Analyze last 10 messages for efficiency and context
        for msg in history[-10:]:
            role = "Butler" if msg['role'] == 'assistant' else "User"
            formatted_history += f"{role}: {msg['content']}\n"
        
        prompt = f"""
You are the "0Buck AI Butler", a professional, loyal, and observant digital valet. 
Your task is to "dehydrate" the following conversation history with user {user_id}.

Focus on "Butler style learning" - what do you need to know to be more helpful and "old-friend" like in the future? 
Identify subtle cues about their life, mood, and shopping habits. 
Specifically, check if the user is giving you a name or telling you how to address them (e.g., "From now on call me X", "Your name is Y").

Extract the following in JSON:
1. "new_facts": List of JSON objects: [{"key": "string", "value": "string"}] (e.g., {"key": "job", "value": "engineer"}). 
2. "butler_name": String (Optional), only if the user explicitly gives you a name or changes it.
3. "user_nickname": String (Optional), only if the user explicitly tells you how to address them.
4. "emotional_tags": List of 1-3 hashtags representing the user's emotional state (#tired, #excited, etc.).
3. "personality_preferences": Dictionary of traits (e.g., {{"brevity": "high", "budget_focus": "high"}}).
4. "affinity_increment": Integer (0-3) representing trust growth in this exchange.
5. "detected_language": The ISO language code (e.g., 'zh', 'en', 'es') of the user's input.
6. "language_change_needed": Boolean, true if input language is different from the likely system language.

Rules:
- Output ONLY valid JSON.
- If no new info, return empty structures.

History:
{formatted_history}
"""
        # Quota check before AI call
        if not check_and_update_quota(user_id, 0.0001, db=self.db):
            logger.warning(f"AI Quota exceeded for user {user_id}")
            return {"new_facts": [], "emotional_tags": [], "personality_preferences": {}, "affinity_increment": 0, "detected_language": "en", "language_change_needed": False}

        try:
            response = await self.model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                )
            )
            data = json.loads(response.text.strip())
            logger.info(f"Dehydration success for user {user_id}")
            return data
        except Exception as e:
            logger.error(f"Dehydration error for user {user_id}: {str(e)}")
            return {"new_facts": [], "emotional_tags": [], "personality_preferences": {}, "affinity_increment": 0, "detected_language": "en", "language_change_needed": False}

    def update_user_butler_state(self, dehydrated_data: Dict[str, Any], user_id: int):
        """
        Persists the extracted insights into the Butler profile and memory tables.
        """
        try:
            # 1. Update/Create Profile
            profile = self.db.query(UserButlerProfile).filter(UserButlerProfile.user_id == user_id).first()
            if not profile:
                profile = UserButlerProfile(user_id=user_id, personality={}, affinity_score=0)
                self.db.add(profile)
            
            # Update Personality & Affinity
            if dehydrated_data.get("personality_preferences"):
                current_p = profile.personality or {}
                current_p.update(dehydrated_data["personality_preferences"])
                profile.personality = current_p
            
            if dehydrated_data.get("butler_name"):
                profile.butler_name = dehydrated_data["butler_name"]
                logger.info(f"Updated Butler Name for user {user_id}: {profile.butler_name}")
                
            if dehydrated_data.get("user_nickname"):
                profile.user_nickname = dehydrated_data["user_nickname"]
                logger.info(f"Updated User Nickname for user {user_id}: {profile.user_nickname}")
            
            profile.affinity_score = min(100, profile.affinity_score + dehydrated_data.get("affinity_increment", 0))
            
            # 2. Store Hard Facts (v3.2.1 Upsert Logic)
            new_facts = dehydrated_data.get("new_facts", [])
            for fact_data in new_facts:
                key = fact_data.get("key", "insight")
                value = fact_data.get("value")
                if not value: continue
                
                # STRICT UPSERT: Find existing non-archived fact for THIS user with THIS key
                existing = self.db.query(UserMemoryFact).filter(
                    UserMemoryFact.user_id == user_id,
                    UserMemoryFact.key == key,
                    UserMemoryFact.is_archived == False
                ).first()
                
                if existing:
                    # Update if changed to maintain a single 'truth' for each fact key
                    if existing.value != value:
                        logger.info(f"Updating fact for user {user_id}: {key} -> {value}")
                        existing.value = value
                        existing.confidence = 0.95 # Higher confidence on update
                        existing.last_verified_at = func.now()
                else:
                    # Create new fact
                    logger.info(f"Creating new fact for user {user_id}: {key} = {value}")
                    fact = UserMemoryFact(
                        user_id=user_id, 
                        key=key, 
                        value=value, 
                        confidence=0.9
                    )
                    self.db.add(fact)
            
            # 3. Store Semantic Memory
            if new_facts:
                memory_text = f"User Facts Updated: {json.dumps(new_facts)}. Emotional state: {', '.join(dehydrated_data.get('emotional_tags', []))}"
                semantic_mem = UserMemorySemantic(
                    user_id=user_id,
                    content=memory_text,
                    tags=dehydrated_data.get("emotional_tags", [])
                )
                self.db.add(semantic_mem)
            
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Database update error for user {user_id}: {str(e)}")

    def get_decrypted_user_key(self, user_id: int) -> Optional[str]:
        """Retrieves and decrypts the user's BYOK API key."""
        profile = self.db.query(UserButlerProfile).filter(UserButlerProfile.user_id == user_id).first()
        if profile and profile.ai_api_key:
            return decrypt_api_key(profile.ai_api_key)
        return None

    def set_user_api_key(self, user_id: int, raw_key: str):
        """Encrypts and stores the user's BYOK API key."""
        try:
            profile = self.db.query(UserButlerProfile).filter(UserButlerProfile.user_id == user_id).with_for_update().first()
            if not profile:
                profile = UserButlerProfile(user_id=user_id)
                self.db.add(profile)
                self.db.commit()
                profile = self.db.query(UserButlerProfile).filter(UserButlerProfile.user_id == user_id).with_for_update().first()
        except IntegrityError:
            self.db.rollback()
            profile = self.db.query(UserButlerProfile).filter(UserButlerProfile.user_id == user_id).with_for_update().first()
        
        profile.ai_api_key = encrypt_api_key(raw_key)
        self.db.commit()

async def run_butler_learning(history: List[Dict[str, str]], user_id: int, db: Session):
    """
    Entry point for the background learning task.
    """
    service = ButlerService(db)
    data = await service.dehydrate_conversation(history, user_id)
    service.update_user_butler_state(data, user_id)
    return data
