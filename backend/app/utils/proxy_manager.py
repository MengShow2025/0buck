import logging

logger = logging.getLogger(__name__)

# v8.5 Patch: Aait Residential Proxy Mapping
PROXY_MAP = {
    "US": "http://ZpEpkxfg:KP6MQc7D@us.aproxy.top:15867",
    "UK": "http://ZpEpkxfg:KP6MQc7D@uk.aproxy.top:15867",
    "DE": "http://ZpEpkxfg:KP6MQc7D@us.aproxy.top:15867", # Fallback to US if DE not available, or add more
}

def get_proxy_for_country(country_code: str):
    """
    v8.5 Patch: Returns the residential proxy for the specified country.
    """
    proxy = PROXY_MAP.get(country_code.upper())
    if proxy:
        logger.info(f"🌐 [ProxyManager] Selected residential proxy for {country_code}")
        return {"all://": proxy}
    return None
