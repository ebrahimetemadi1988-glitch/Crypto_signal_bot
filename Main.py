import requests
from telegram import Bot
from telegram.ext import Application, CommandHandler
import asyncio

TOKEN = "توکن_ربات_تلگرام_خودت"
CHAT_ID = "آی‌دی_تلگرام_خودت"

async def send_signal():
    bot = Bot(token=TOKEN)
    await bot.send_message(chat_id=CHAT_ID, text="✅ Bot is now running on Render!")

async def main():
    await send_signal()
    while True:
        # نمونه تست برای ارسال هر 1 ساعت
        await asyncio.sleep(3600)
        await send_signal()

if __name__ == "__main__":
    asyncio.run(main())
