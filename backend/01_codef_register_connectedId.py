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

# 위에서 쓰던 것과 동일하게 설정
USE_DEMO = True

def encrypt_rsa(text, public_key):
    key_der = base64.b64decode(public_key)
    key_pub = RSA.import_key(key_der)
    cipher = PKCS1.new(key_pub)
    return base64.b64encode(cipher.encrypt(text.encode('utf-8'))).decode('utf-8')

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

# 계정 등록
res = requests.post(
    base_url + "/v1/account/create",
    json={
        "accountList": [{
            "countryCode": "KR",
            "businessType": "CD",
            "clientType": "P",
            "organization": "0302",
            "loginType": "1",
            "id": "likewhat9901",
            "password": encrypt_rsa("qag70025353@", public_key),
            "birthDate": "19990129",
            "cardNo": "4033020225873307",
            "cardPassword": encrypt_rsa("7596", public_key),
        }]
    },
    headers={"Authorization": f"Bearer {access_token}"}
)

# ← 이 두 줄 추가
print("status_code:", res.status_code)
print("raw response:", res.text)

try:
    data = res.json()
except Exception:
    data = json.loads(parse.unquote(res.text))

print(json.dumps(data, indent=2, ensure_ascii=False))
print("\n✅ 발급된 connectedId:", data["data"]["connectedId"])
# 출력된 connectedId를 복사해서 codef_card_list.py에 붙여넣으세요

"""
status_code: 200
raw response: {"result":{"code":"CF-00000","extraMessage":"","message":"정상","transactionId":"e2c58b41-483a-4b32-8be7-c11fc962d1bc"},"data":{"successList":[{"clientType":"P","code":"CF-00000","loginType":"1","countryCode":"KR","organization":"0301","extraMessage":"","businessType":"CD","message":"정상"}],"errorList":[],"connectedId":"byi1wYwD40k8hEIiXl6bRF"}}
{
  "result": {
    "code": "CF-00000",
    "extraMessage": "",
    "message": "정상",
    "transactionId": "e2c58b41-483a-4b32-8be7-c11fc962d1bc"
  },
  "data": {
    "successList": [
      {
        "clientType": "P",
        "code": "CF-00000",
        "loginType": "1",
        "countryCode": "KR",
        "organization": "0301",
        "extraMessage": "",
        "businessType": "CD",
        "message": "정상"
      }
    ],
    "errorList": [],
    "connectedId": "byi1wYwD40k8hEIiXl6bRF"
  }
}

✅ 발급된 connectedId: byi1wYwD40k8hEIiXl6bRF
"""