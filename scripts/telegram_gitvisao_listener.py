#!/usr/bin/env python3
"""
Telegram Listener para GitVisão
Monitora mensagens no grupo/canal Telegram e envia repositórios GitHub para a API do GitVisão.
"""

import os
import re
import asyncio
import logging
import urllib.parse
import aiohttp
from telethon import TelegramClient, events
from telethon.tl.types import MessageEntityTextUrl, MessageEntityUrl

# ================= CONFIGURAÇÕES =================
# Obtenha API_ID e API_HASH em: https://my.telegram.org (App configuration)
API_ID = int(os.getenv("TELEGRAM_API_ID", "1234567"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "seu_api_hash_aqui")
SESSION_NAME = "gitvisao_userbot"

# Canal/Grupo alvo e Tópico específico (ex: tópico 4180 de https://t.me/mundoautomatik/4180)
TARGET_CHAT = os.getenv("TARGET_CHAT", "mundoautomatik")
FILTER_TOPIC_ID = int(os.getenv("FILTER_TOPIC_ID", "4180")) if os.getenv("FILTER_TOPIC_ID") else None

# Configurações da API do GitVisão
GITVISAO_BASE_URL = os.getenv("GITVISAO_URL", "https://vision.24hs.eu.org")
ADMIN_PASSWORD = os.getenv("GITVISAO_ADMIN_PASSWORD", "12131415")

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO
)
logger = logging.getLogger("GitVisaoTelegram")

GITHUB_REPO_REGEX = re.compile(
    r"https?://(?:www\.)?github\.com/([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+)",
    re.IGNORECASE
)
IGNORED_PATHS = {
    "login", "join", "features", "pricing", "security", "explore",
    "trending", "collections", "events", "about", "contact", "site"
}

processed_cache = set()

def extract_github_urls(message) -> set:
    found_urls = set()
    text = message.text or ""

    for match in GITHUB_REPO_REGEX.finditer(text):
        owner, repo = match.groups()
        repo_clean = repo.removesuffix(".git").rstrip("/#?")
        if owner.lower() not in IGNORED_PATHS and repo_clean.lower() not in IGNORED_PATHS:
            found_urls.add(f"https://github.com/{owner}/{repo_clean}")

    if message.entities:
        for entity in message.entities:
            url = None
            if isinstance(entity, MessageEntityTextUrl):
                url = entity.url
            elif isinstance(entity, MessageEntityUrl):
                url = text[entity.offset:entity.offset + entity.length]

            if url:
                m = GITHUB_REPO_REGEX.search(url)
                if m:
                    owner, repo = m.groups()
                    repo_clean = repo.removesuffix(".git").rstrip("/#?")
                    if owner.lower() not in IGNORED_PATHS and repo_clean.lower() not in IGNORED_PATHS:
                        found_urls.add(f"https://github.com/{owner}/{repo_clean}")

    return found_urls

def is_in_target_topic(message, target_topic_id: int | None) -> bool:
    if not target_topic_id:
        return True
    reply = message.reply_to
    if not reply:
        return target_topic_id == 1
    if getattr(reply, "reply_to_top_id", None) == target_topic_id:
        return True
    if getattr(reply, "reply_to_msg_id", None) == target_topic_id:
        return True
    return False

async def check_repo_exists(session: aiohttp.ClientSession, repo_url: str) -> bool:
    check_url = f"{GITVISAO_BASE_URL}/api/check?repo={urllib.parse.quote(repo_url)}"
    try:
        async with session.get(check_url, timeout=10) as resp:
            if resp.status == 200:
                data = await resp.json()
                return bool(data.get("exists", False))
            return False
    except Exception as e:
        logger.warning(f"Falha ao consultar /api/check para {repo_url}: {e}")
        return False

async def send_to_gitvisao(session: aiohttp.ClientSession, repo_url: str):
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": ADMIN_PASSWORD,
        "Authorization": f"Bearer {ADMIN_PASSWORD}"
    }
    payload = {
        "repo": repo_url,
        "text": repo_url
    }

    url = f"{GITVISAO_BASE_URL}/api/webhook"
    try:
        async with session.post(url, headers=headers, json=payload, timeout=60) as resp:
            data = await resp.json() if resp.content_type == "application/json" else await resp.text()
            if resp.status in (200, 201):
                logger.info(f"✅ [SUCESSO] Repositório catalogado: {repo_url}")
            else:
                logger.error(f"❌ [ERRO API] Status {resp.status}: {data}")
    except Exception as e:
        logger.error(f"❌ [ERRO CONEXÃO] Falha ao enviar {repo_url}: {e}")

async def process_message(message, http_session: aiohttp.ClientSession):
    if FILTER_TOPIC_ID and not is_in_target_topic(message, FILTER_TOPIC_ID):
        return

    github_urls = extract_github_urls(message)
    if not github_urls:
        return

    for url in github_urls:
        if url in processed_cache:
            continue
        processed_cache.add(url)
        logger.info(f"🔍 [DETECTADO] Novo link do GitHub: {url}")

        already_exists = await check_repo_exists(http_session, url)
        if already_exists:
            logger.info(f"ℹ️  [JÁ CATALOGADO] Repositório já cadastrado: {url}")
            continue

        logger.info(f"🚀 [ENVIANDO] Disparando catalogação: {url}")
        await send_to_gitvisao(http_session, url)

async def main():
    logger.info("Iniciando GitVisão Telegram Listener...")
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    logger.info(f"Conectado ao Telegram como: {(await client.get_me()).first_name}")
    logger.info(f"Monitorando chat: @{TARGET_CHAT} (Filtro Tópico: {FILTER_TOPIC_ID or 'Todos'})")

    entity = await client.get_entity(TARGET_CHAT)

    async with aiohttp.ClientSession() as http_session:
        @client.on(events.NewMessage(chats=entity))
        async def handler(event):
            await process_message(event.message, http_session)

        logger.info("🟢 Escutando em tempo real... Pressione Ctrl+C para encerrar.")
        await client.run_until_disconnected()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Listener encerrado.")
