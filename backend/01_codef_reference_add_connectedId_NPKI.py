import base64, json, requests
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5 as PKCS1
from urllib import parse

import os
from dotenv import load_dotenv
load_dotenv()

sandbox_client_id = os.getenv("sandbox_client_id")
sandbox_client_secret = os.getenv("sandbox_client_secret")
demo_client_id = os.getenv("demo_client_id")
demo_client_secret = os.getenv("demo_client_secret")
client_id = os.getenv("client_id")
client_secret = os.getenv("client_secret")
public_key = os.getenv("public_key")

sandbox_url = os.getenv("sandbox_url")
demo_url = os.getenv("demo_url")
product_url = os.getenv("product_url")

connectedId_kb_NPKI = os.getenv("connectedId_kb_NPKI")

# 위에서 쓰던 것과 동일하게 설정
USE_DEMO = True

def encrypt_rsa(text, public_key):
    key_der = base64.b64decode(public_key)
    key_pub = RSA.import_key(key_der)
    cipher = PKCS1.new(key_pub)
    return base64.b64encode(cipher.encrypt(text.encode('utf-8'))).decode('utf-8')

# ★ 추가: 인증서 파일 읽어서 Base64로 인코딩
CERT_DIR = r"C:\Users\parkk\AppData\LocalLow\NPKI\yessign\USER\cn=박천(PARKCHEON)0004049J034439179,ou=KMB,ou=personal4IB,o=yessign,c=kr"
with open(os.path.join(CERT_DIR, "signCert.der"), "rb") as f:
    der_file_b64 = base64.b64encode(f.read()).decode("utf-8")
with open(os.path.join(CERT_DIR, "signPri.key"), "rb") as f:
    key_file_b64 = base64.b64encode(f.read()).decode("utf-8")

# 토큰 발급
client_info = f"{demo_client_id}:{demo_client_secret}"
b64_auth = base64.b64encode(client_info.encode()).decode()
token_res = requests.post(
    "https://oauth.codef.io/oauth/token",
    data="grant_type=client_credentials&scope=read",
    headers={
        "Authorization": f"Basic {b64_auth}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
)
access_token = token_res.json()["access_token"]
base_url = demo_url if USE_DEMO else product_url

print("connectedId 값:", connectedId_kb_NPKI)

# 계정 추가
res = requests.post(
    base_url + "/v1/account/add",
    json={
        "connectedId": connectedId_kb_NPKI,
        "accountList": [{  
            "countryCode": "KR",
            "businessType": "CD",
            "clientType": "P",
            "organization": "0302",
            "loginType": "0",
            "password": encrypt_rsa("qag70025353@", public_key),
            "derFile" : der_file_b64,
            "keyFile" : key_file_b64,
        }]
    },
    headers={"Authorization": f"Bearer {access_token}"}
)

# 결과 출력
print("status_code:", res.status_code)
print("raw response:", res.text)

try:
    data = res.json()
except Exception:
    data = json.loads(parse.unquote(res.text))

print("\n✅ 계정 추가 결과:", json.dumps(data, indent=2, ensure_ascii=False))
print("\n✅ 발급된 connectedId:", data["data"]["connectedId"])
# 출력된 connectedId를 복사해서 codef_card_list.py에 붙여넣으세요
