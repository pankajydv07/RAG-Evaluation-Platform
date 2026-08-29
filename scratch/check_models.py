import asyncio
import os
from dotenv import load_dotenv
from groq import AsyncGroq
from openai import AsyncOpenAI

load_dotenv()

async def check_models():
    print("--- Checking Groq Models ---")
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        groq_client = AsyncGroq(api_key=groq_key)
        try:
            res = await groq_client.models.list()
            print("Groq Models:", [m.id for m in res.data])
        except Exception as e:
            print("Groq Error:", e)

    print("\n--- Checking Nebius AI Models ---")
    nebius_key = os.getenv("NEBIUS_API_KEY")
    nebius_base = os.getenv("NEBIUS_BASE_URL", "https://api.studio.nebius.ai/v1")
    if nebius_key:
        nebius_client = AsyncOpenAI(api_key=nebius_key, base_url=nebius_base)
        try:
            res = await nebius_client.models.list()
            print("Nebius Models:", [m.id for m in res.data])
        except Exception as e:
            print("Nebius Error:", e)

if __name__ == "__main__":
    asyncio.run(check_models())
