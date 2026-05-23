# ============================================================================
# 이 예제는 Python3 환경(Python 3.9 ~ 3.14)에서 정상 동작합니다.
#
# 필요 라이브러리:
# - pycryptodome : RSA 암호화를 위해 필요 (pip install pycryptodome)
# - requests     : HTTP 요청 전송을 위해 필요 (pip install requests)
# ============================================================================

import base64
import json
import requests
from urllib import parse
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5 as PKCS1

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

connectedId_kb = os.getenv("connectedId_kb")
connectedId_hyundaicard = os.getenv("connectedId_hyundaicard")
connectedId_kb_NPKI = os.getenv("connectedId_kb_NPKI")

# ============================================================================
# 1. 환경 설정 (사용자 작성 필요, https://codef.io/account/keys 참조)
# ============================================================================
USE_DEMO = True  # True: DEMO 서버, False: PRODUCT 서버


# ============================================================================
# 2. RSA 암호화 함수 (비밀번호 암호화가 필요한 일부 API에서만 사용, 필요 없는 경우 미호출)
# ============================================================================
def encrypt_rsa(text: str, public_key: str) -> str:
    try:
        # public_key 미입력 시 에러 방지
        if not public_key or public_key.strip() == "":
            return "ENCRYPTION_ERROR: Public key is missing"
            
        key_der = base64.b64decode(public_key)
        key_pub = RSA.import_key(key_der)
        cipher = PKCS1.new(key_pub)
        cipher_text = cipher.encrypt(text.encode('utf-8'))
        return base64.b64encode(cipher_text).decode('utf-8')
    except:
        # 그 외 암호화 과정에서 발생하는 예외 처리
        return "ENCRYPTION_ERROR: Unknown error"

# ============================================================================
# 3. 토큰 발급
# ============================================================================
if USE_DEMO:
    selected_client_id = demo_client_id
    selected_client_secret = demo_client_secret
    base_url = demo_url
else:
    selected_client_id = client_id
    selected_client_secret = client_secret
    base_url = product_url

client_info = f"{selected_client_id}:{selected_client_secret}"
b64_auth = base64.b64encode(client_info.encode('utf-8')).decode('utf-8')
token_url = "https://oauth.codef.io/oauth/token"
token_headers = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": f"Basic {b64_auth}",
}
token_body = "grant_type=client_credentials&scope=read"

token_res = requests.post(token_url, data=token_body, headers=token_headers)

if token_res.status_code != 200:
    print("토큰 발급 실패:", token_res.text)
    exit()

access_token = token_res.json().get("access_token")

# ============================================================================
# 4. API 호출 정보 (사용자 작성 필요)
# ============================================================================
parameter = {
    "organization": "0301",
    "connectedId": connectedId_kb_NPKI,  # ✅ 필수입력
    "inquiryType": "0",  # ⚪ 선택입력 # "0" : 등록여부, "1" : 인증서 자동등록 포함 (default : 0)
    "identity": "9901291068418",  # ⚪ 선택입력 # <code>inquiryType="1" 필수</code><br> "birthDate" 값 입력시 주민번호 뒤 7자리만 입력
    #"birthDate": "990129",  # ⚪ 선택입력 # <code>inquiryType="1" 입력</code><br>주민번호 뒷자리만 암호화하는 경우 사용 (yyMMdd)
    #"userId": "로그인 아이디",  # ⚪ 선택입력 # <code>inquiryType="1" 필수</code>
    #"cardNo": "카드번호",  # ⚪ 선택입력 # <code>inquiryType="1" 필수</code><br>현대카드 아이디로그인(필수) : 인증할 카드번호<br>KB 카드소지확인 인증이 필요한 경우 : 카드번호 전체
    #"cardPassword": encrypt_rsa("카드비번", public_key),  # ⚪ 선택입력 # <code>inquiryType="1" 필수</code><br>(RSA 암호화된 카드 비밀번호)<br>현대카드 아이디로그인(필수) : 카드 비밀번호 4자리<br>KB 카드소지확인 인증이 필요한 경우 : 카드비밀번호 앞 2자리
    #"cardValidPeriod": "유효기간",  # ⚪ 선택입력 # <code>inquiryType="1" 필수</code>
}
endpoint = "/v1/kr/card/p/user/registration-status"

# ============================================================================
# 5. API 호출
# ============================================================================
headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {access_token}",
}
res = requests.post(base_url + endpoint, json=parameter, headers=headers)

# ============================================================================
# 6. 결과 출력
# ============================================================================
try:
    parsed_json = res.json()
    print(json.dumps(parsed_json, indent=2, ensure_ascii=False))
except (json.JSONDecodeError, ValueError):
    try:
        decoded_text = parse.unquote(res.text)
        parsed_json = json.loads(decoded_text)
        print(json.dumps(parsed_json, indent=2, ensure_ascii=False))
    except Exception:
        print("응답 분석 실패:", res.text)
