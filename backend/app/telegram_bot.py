"""
Telegram Bot integration for Club del Coleo.
Sends deposit comprobantes to admin chat with Approve/Reject inline buttons.
Admin can approve or reject deposits directly from Telegram.
"""

import os
import httpx
import logging

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_ADMIN_CHAT_ID = os.environ.get("TELEGRAM_ADMIN_CHAT_ID", "")
BACKEND_URL = os.environ.get("BACKEND_PUBLIC_URL", "")

API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def is_configured() -> bool:
    """Check if Telegram bot is properly configured."""
    return bool(TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID)


async def send_message(chat_id: str, text: str, reply_markup: dict | None = None) -> dict | None:
    """Send a text message to a Telegram chat."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram bot token not configured, skipping message")
        return None
    try:
        payload: dict = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{API_BASE}/sendMessage", json=payload)
            return resp.json()
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")
        return None


async def send_photo(chat_id: str, photo_url: str, caption: str, reply_markup: dict | None = None) -> dict | None:
    """Send a photo with caption to a Telegram chat."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram bot token not configured, skipping photo")
        return None
    try:
        payload: dict = {
            "chat_id": chat_id,
            "photo": photo_url,
            "caption": caption,
            "parse_mode": "HTML",
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(f"{API_BASE}/sendPhoto", json=payload)
            return resp.json()
    except Exception as e:
        logger.error(f"Error sending Telegram photo: {e}")
        return None


async def send_document(chat_id: str, document_path: str, caption: str, reply_markup: dict | None = None) -> dict | None:
    """Send a document (PDF, etc.) with caption to a Telegram chat."""
    if not TELEGRAM_BOT_TOKEN:
        return None
    try:
        with open(document_path, "rb") as f:
            files = {"document": (os.path.basename(document_path), f)}
            data: dict = {
                "chat_id": chat_id,
                "caption": caption,
                "parse_mode": "HTML",
            }
            if reply_markup:
                import json
                data["reply_markup"] = json.dumps(reply_markup)
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(f"{API_BASE}/sendDocument", data=data, files=files)
                return resp.json()
    except Exception as e:
        logger.error(f"Error sending Telegram document: {e}")
        return None


async def send_photo_file(chat_id: str, photo_path: str, caption: str, reply_markup: dict | None = None) -> dict | None:
    """Send a photo file from disk with caption to a Telegram chat."""
    if not TELEGRAM_BOT_TOKEN:
        return None
    try:
        with open(photo_path, "rb") as f:
            files = {"photo": (os.path.basename(photo_path), f)}
            data: dict = {
                "chat_id": chat_id,
                "caption": caption,
                "parse_mode": "HTML",
            }
            if reply_markup:
                import json
                data["reply_markup"] = json.dumps(reply_markup)
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(f"{API_BASE}/sendPhoto", data=data, files=files)
                return resp.json()
    except Exception as e:
        logger.error(f"Error sending Telegram photo file: {e}")
        return None


async def answer_callback_query(callback_query_id: str, text: str) -> dict | None:
    """Answer a callback query (dismiss the loading indicator on inline button)."""
    if not TELEGRAM_BOT_TOKEN:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{API_BASE}/answerCallbackQuery", json={
                "callback_query_id": callback_query_id,
                "text": text,
            })
            return resp.json()
    except Exception as e:
        logger.error(f"Error answering callback query: {e}")
        return None


async def edit_message_reply_markup(chat_id: str, message_id: int, reply_markup: dict | None = None) -> dict | None:
    """Edit the reply markup of an existing message (e.g., remove buttons after action)."""
    if not TELEGRAM_BOT_TOKEN:
        return None
    try:
        payload: dict = {
            "chat_id": chat_id,
            "message_id": message_id,
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{API_BASE}/editMessageReplyMarkup", json=payload)
            return resp.json()
    except Exception as e:
        logger.error(f"Error editing message markup: {e}")
        return None


async def edit_message_caption(chat_id: str, message_id: int, caption: str, reply_markup: dict | None = None) -> dict | None:
    """Edit the caption of a photo/document message."""
    if not TELEGRAM_BOT_TOKEN:
        return None
    try:
        payload: dict = {
            "chat_id": chat_id,
            "message_id": message_id,
            "caption": caption,
            "parse_mode": "HTML",
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{API_BASE}/editMessageCaption", json=payload)
            return resp.json()
    except Exception as e:
        logger.error(f"Error editing message caption: {e}")
        return None


async def notify_new_deposit(
    deposit_id: int,
    username: str,
    amount: float,
    method: str,
    comprobante_path: str,
):
    """
    Send deposit notification to admin Telegram chat with comprobante and approve/reject buttons.
    """
    if not is_configured():
        logger.info("Telegram bot not configured, skipping deposit notification")
        return

    method_names = {"nequi": "Nequi", "daviplata": "Daviplata", "bancolombia": "Bancolombia"}
    method_display = method_names.get(method, method)

    caption = (
        f"<b>Nueva Solicitud de Deposito</b>\n\n"
        f"<b>Usuario:</b> {username}\n"
        f"<b>Monto:</b> ${int(amount):,} COP\n"
        f"<b>Metodo:</b> {method_display}\n"
        f"<b>ID Deposito:</b> #{deposit_id}\n\n"
        f"Selecciona una opcion:"
    )

    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "Aprobar", "callback_data": f"approve_deposit:{deposit_id}"},
                {"text": "Rechazar", "callback_data": f"reject_deposit:{deposit_id}"},
            ]
        ]
    }

    # Determine if comprobante is an image or document
    ext = comprobante_path.rsplit(".", 1)[-1].lower() if "." in comprobante_path else ""
    image_exts = {"jpg", "jpeg", "png", "webp", "gif"}

    if ext in image_exts:
        result = await send_photo_file(
            TELEGRAM_ADMIN_CHAT_ID, comprobante_path, caption, reply_markup
        )
    else:
        result = await send_document(
            TELEGRAM_ADMIN_CHAT_ID, comprobante_path, caption, reply_markup
        )

    if result and result.get("ok"):
        logger.info(f"Deposit #{deposit_id} notification sent to Telegram")
    else:
        logger.error(f"Failed to send deposit notification to Telegram: {result}")


async def notify_deposit_result(deposit_id: int, status: str, username: str, amount: float, message_id: int | None = None):
    """Update the Telegram message after deposit is approved/rejected (from web panel too)."""
    if not is_configured():
        return

    status_emoji = "APROBADO" if status == "approved" else "RECHAZADO"
    status_text = f"{'Aprobado' if status == 'approved' else 'Rechazado'}"

    text = (
        f"<b>Deposito #{deposit_id} - {status_emoji}</b>\n\n"
        f"<b>Usuario:</b> {username}\n"
        f"<b>Monto:</b> ${int(amount):,} COP\n"
        f"<b>Estado:</b> {status_text}"
    )

    if message_id:
        # Edit existing message to show result and remove buttons
        await edit_message_caption(TELEGRAM_ADMIN_CHAT_ID, message_id, text)
    else:
        # Send new message if we don't have the original message ID
        await send_message(TELEGRAM_ADMIN_CHAT_ID, text)


async def setup_webhook(webhook_url: str) -> dict | None:
    """Set the webhook URL for the Telegram bot."""
    if not TELEGRAM_BOT_TOKEN:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{API_BASE}/setWebhook", json={
                "url": webhook_url,
                "allowed_updates": ["callback_query", "message"],
            })
            result = resp.json()
            logger.info(f"Webhook setup result: {result}")
            return result
    except Exception as e:
        logger.error(f"Error setting up webhook: {e}")
        return None


async def delete_webhook() -> dict | None:
    """Remove the webhook (for switching to polling or cleanup)."""
    if not TELEGRAM_BOT_TOKEN:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{API_BASE}/deleteWebhook")
            return resp.json()
    except Exception as e:
        logger.error(f"Error deleting webhook: {e}")
        return None


async def get_updates(offset: int = 0) -> list:
    """Get updates via long polling (used for getting chat_id during setup)."""
    if not TELEGRAM_BOT_TOKEN:
        return []
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{API_BASE}/getUpdates", params={
                "offset": offset,
                "timeout": 5,
            })
            data = resp.json()
            return data.get("result", [])
    except Exception as e:
        logger.error(f"Error getting updates: {e}")
        return []
