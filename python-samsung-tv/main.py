
import asyncio
import json
import os
import ssl
import socket
import uuid
from typing import Dict, Any

from aiohttp import web

TV_NAME = "Fake Samsung TV"
MODEL = "Tizen 7.0 Mock"
HTTP_PORT = int(os.getenv("FAKE_TV_PORT", 8001))
USE_WSS = os.getenv("FAKE_TV_WSS", "false").lower() == "true"
CERT_FILE = os.getenv("FAKE_TV_CERT", "cert.pem")
KEY_FILE = os.getenv("FAKE_TV_KEY", "key.pem")
TOKEN_FILE = os.getenv("FAKE_TV_TOKEN", "tv_token.txt")
WS_PATH = "/api/v2/channels/samsung.remote.control"
SSDP_ST = "urn:samsung.com:device:RemoteControlReceiver:1"
SSDP_TTL = 2 

state: Dict[str, Any] = {
    "power": True,
    "volume": 10,
    "channel": 1,
}

# Persist a token like Samsung does
if os.path.exists(TOKEN_FILE):
    PERSISTED_TOKEN = open(TOKEN_FILE, "r", encoding="utf-8").read().strip()
else:
    PERSISTED_TOKEN = str(uuid.uuid4())
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        f.write(PERSISTED_TOKEN)


def get_local_ip() -> str:
    """Best-effort local IP detection."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


LOCAL_IP = get_local_ip()

async def api_v2(request: web.Request) -> web.Response:
    data = {
        "device": {
            "type": "Samsung SmartTV",
            "name": TV_NAME,
            "id": "fake-" + str(uuid.uuid4())[:8],
            "version": "2.0.0",
            "productCode": MODEL,
            "model": MODEL,
            "tokenSupport": "true",
        },
        "id": "api-v2",
        "name": TV_NAME,
        "type": "Samsung TV",
        "version": "2.0.0",
    }
    return web.json_response(data)


async def description_xml(request: web.Request) -> web.Response:
    xml = f"""<?xml version=\"1.0\"?>
<root xmlns=\"urn:schemas-upnp-org:device-1-0\">
  <specVersion><major>1</major><minor>0</minor></specVersion>
  <device>
    <deviceType>{SSDP_ST}</deviceType>
    <friendlyName>{TV_NAME}</friendlyName>
    <manufacturer>Samsung Electronics</manufacturer>
    <modelName>{MODEL}</modelName>
    <UDN>uuid:{uuid.uuid4()}</UDN>
  </device>
</root>"""
    return web.Response(text=xml, content_type="application/xml")


async def ws_handler(request: web.Request) -> web.StreamResponse:
    ws = web.WebSocketResponse(heartbeat=30.0)
    await ws.prepare(request)

    async for msg in ws:
        if msg.type != web.WSMsgType.TEXT:
            continue
        try:
            payload = json.loads(msg.data)
        except Exception:
            await ws.send_json({"event": "error", "error": "invalid json"})
            continue

        method = payload.get("method")
        params = payload.get("params", {})

        if method == "ms.channel.connect":
            # Always accept
            resp = {
                "event": "ms.channel.connect",
                "data": {
                    "id": params.get("id"),
                    "token": PERSISTED_TOKEN,
                },
            }
            await ws.send_json(resp)

        elif method == "ms.remote.control":
            cmd = params.get("DataOfCmd")
            _apply_key(cmd)
            ack = {
                "event": "ms.remote.control",
                "data": {
                    "cmd": cmd,
                    "state": state,
                },
            }
            await ws.send_json(ack)

        else:
            await ws.send_json({"event": "unknown", "received": payload})

    return ws


def _apply_key(cmd: str | None) -> None:
    if not cmd:
        return
    if cmd == "KEY_VOLUP":
        state["volume"] = min(100, state["volume"] + 1)
    elif cmd == "KEY_VOLDOWN":
        state["volume"] = max(0, state["volume"] - 1)
    elif cmd == "KEY_CHUP":
        state["channel"] += 1
    elif cmd == "KEY_CHDOWN":
        state["channel"] = max(1, state["channel"] - 1)
    elif cmd == "KEY_MUTE":
        state["volume"] = 0
    elif cmd == "KEY_POWER":
        state["power"] = not state["power"]
    # add more KEY_* as needed


async def ssdp_responder() -> None:
    """Listen for M-SEARCH and respond like a Samsung TV."""
    MCAST_GRP = "239.255.255.250"
    MCAST_PORT = 1900

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(("", MCAST_PORT))
    except OSError:
        # On some systems SO_REUSEPORT is needed or port is busy.
        # We'll just log and skip SSDP in that case.
        print("[SSDP] Could not bind to 1900, skipping SSDP responder.")
        return

    mreq = socket.inet_aton(MCAST_GRP) + socket.inet_aton("0.0.0.0")
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
    sock.setblocking(False)

    LOCATION = f"http://{LOCAL_IP}:{HTTP_PORT}/description.xml"
    USN = f"uuid:{uuid.uuid4()}::{SSDP_ST}"

    async def handle_search(data: bytes, addr):
        text = data.decode("utf-8", "ignore")
        if "M-SEARCH" not in text or "ssdp:discover" not in text:
            return
        if SSDP_ST not in text and "ssdp:all" not in text:
            return

        # Honor MX if present (max wait)
        mx = SSDP_TTL
        for line in text.split("\r\n"):
            if line.upper().startswith("MX:"):
                try:
                    mx = min(SSDP_TTL, int(line.split(":", 1)[1].strip()))
                except Exception:
                    pass
        await asyncio.sleep(mx)

        resp = "\r\n".join([
            "HTTP/1.1 200 OK",
            f"ST: {SSDP_ST}",
            f"USN: {USN}",
            f"LOCATION: {LOCATION}",
            "CACHE-CONTROL: max-age=1800",
            "SERVER: Linux/3.10 UPnP/1.0 SamsungUPnP/1.0",
            "", ""
        ]).encode("utf-8")
        sock.sendto(resp, addr)

    loop = asyncio.get_event_loop()
    print("SSDP responder running on 239.255.255.250:1900")
    while True:
        try:
            data, addr = await loop.run_in_executor(None, sock.recvfrom, 65507)
        except Exception:
            await asyncio.sleep(0.1)
            continue
        loop.create_task(handle_search(data, addr))


def get_ssl_context():
    if not USE_WSS:
        return None
    if not (os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE)):
        raise FileNotFoundError(
            "WSS requested but cert.pem or key.pem not found. "
            "Generate: openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365"
        )
    sslctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    sslctx.load_cert_chain(CERT_FILE, KEY_FILE)
    return sslctx


async def main() -> None:
    app = web.Application()
    app.router.add_get("/api/v2/", api_v2)
    app.router.add_get("/description.xml", description_xml)
    app.router.add_get(WS_PATH, ws_handler)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", HTTP_PORT, ssl_context=get_ssl_context())
    await site.start()
    scheme = "wss" if USE_WSS else "ws"
    print(f"HTTP API on http://{LOCAL_IP}:{HTTP_PORT}")
    print(f"WebSocket on {scheme}://{LOCAL_IP}:{HTTP_PORT}{WS_PATH}")

    asyncio.create_task(ssdp_responder())

    await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Bye")
