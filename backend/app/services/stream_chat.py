from app.core.bap_protocol import BAP_ProductGrid, BAP_CashbackRadar, BAPType
import json
import logging
from typing import Optional, List, Dict, Any
from stream_chat import StreamChat
from app.core.config import settings

logger = logging.getLogger(__name__)

class StreamChatService:
    def __init__(self):
        self.api_key = settings.STREAM_API_KEY
        self.api_secret = settings.STREAM_API_SECRET
        self.server_client = StreamChat(api_key=self.api_key, api_secret=self.api_secret)

    async def send_targeted_bap_card(self, user_id: int, bap_payload: Any, channel_id: str = "vortex-global"):
        """
        v4.0: VCC Targeted Card Emitter.
        Sends a rich BAP card message that only the target user can see (or standard if public).
        """
        try:
            msg_payload = {
                "text": "Sent you a Vortex BAP Card! 🚀",
                "user_id": "0buck-butler",
                "attachments": [
                    {
                        "type": bap_payload.type.value,
                        "bap_data": bap_payload.dict()
                    }
                ],
                "silent": True # Don't trigger push notifications for UI cards
            }
            
            # Send to the channel
            channel = self.server_client.channel("messaging", channel_id)
            channel.send_message(msg_payload, "0buck-butler")
            logger.info(f"✨ BAP Card {bap_payload.type} sent to channel {channel_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Stream BAP Error: {str(e)}")
            return False

    def generate_user_token(self, user_id: str) -> str:
        """
        Generates a token for a user to authenticate with Stream Chat.
        """
        if not self.api_key or not self.api_secret:
            raise ValueError("Stream Chat API Key or Secret not configured.")
        
        # Create user if it doesn't exist (optional, Stream handles it usually but good practice)
        # self.server_client.upsert_user({"id": user_id, "role": "user"})
        
        return self.server_client.create_token(user_id)

    def get_api_key(self) -> str:
        return self.api_key

    def verify_webhook(self, body: bytes, signature: str) -> bool:
        """
        v3.4 VCC: Verify that the webhook request came from Stream.
        """
        return self.server_client.verify_webhook(body, signature)

    def create_channel(self, channel_type: str, channel_id: str, name: str, members: List[str] = None, extra_data: Dict[str, Any] = None):
        """
        v3.4 VCC: Create or update a channel for Social, Commerce, or Concierge.
        """
        channel = self.server_client.channel(channel_type, channel_id)
        channel.create(user_id="0buck_system")
        
        update_data = {"name": name}
        if extra_data:
            update_data.update(extra_data)
            
        channel.update(update_data)
        
        if members:
            channel.add_members(members)
            
        return channel

    def send_bap_card(self, channel_type: str, channel_id: str, card_type: str, data: Dict[str, Any], targeted_user_id: str = None):
        """
        v3.4 BAP (Business Attachment Protocol):
        Send a functional business card as a custom attachment.
        Supports 'Private Projection' via targeted_user_id.
        """
        channel = self.server_client.channel(channel_type, channel_id)
        
        message_payload = {
            "text": "", # Cards usually speak for themselves or have brief intro
            "attachments": [{
                "type": "0B_CARD_V3",
                "component": card_type,
                "data": data,
                "is_private": bool(targeted_user_id)
            }]
        }
        
        if targeted_user_id:
            # Targeted message: only visible to the specific user in a group
            message_payload["silent"] = True
            message_payload["mentioned_users"] = [targeted_user_id]
            # Stream natively supports 'silent' but for 'Private Projection',
            # we can also use specific channel permissions or metadata.
            
        return channel.send_message(message_payload, user_id="0buck_system")

stream_chat_service = StreamChatService()
