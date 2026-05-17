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

# ============================================================================
# 1. 환경 설정 (사용자 작성 필요, https://codef.io/account/keys 참조)
# ============================================================================
USE_DEMO = True  # True: DEMO 서버, False: PRODUCT 서버

# DEMO(테스트) 클라이언트 정보 
demo_client_id = "ef27cfaa-10c1-4470-adac-60ba476273f9"
demo_client_secret = "83160c33-9045-4915-86d8-809473cdf5c3"

# PRODUCT(정식) 클라이언트 정보
client_id = "발급받은_client_id"
client_secret = "발급받은_client_secret"

# RSA 퍼블릭키 정보
public_key = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwdrckp+oN+8PhXcCZUQjauYP9LC3CN2NiUjHAtcuEu7NyL/RsXUFeX+9bPh2cAQFt0XXp5Z2cCb/3insfSQ2bo9KWLeJgfvteJ5ZiDUNY7H/mTUyZoYly1EOqXB3m+j+UWGXDkpvrV4i+gYFn8iPDBvu2OAK+4J+f7A3PErlnfR7V/mx7G04wdjlXi9FcqGsgtTJvnWTkvbxaiVBg7ZPsgZADu2iXSRsGaln2tLvu0HZUW86k/FjFAws2I7xrsDDWTJpWhR8c5Ldbo/THuN165ZOq6koHInb/3DEQTujebF3GUGKLcQGSTGGZwH3dqHTWrzeymGbxNj+bYK46Tw/twIDAQAB"

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
    base_url = "https://sandbox.codef.io"
else:
    selected_client_id = client_id
    selected_client_secret = client_secret
    base_url = "https://api.codef.io"

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
    "organization": "0301",  # ✅ 필수입력
    "birthDate": "19990129",  # ⚪ 선택입력 # [생년월일/주민등록번호] 
# 제한직전 필수 입력하는 기관존재(YYYYMMDD)
    "inquiryType": "0",  # ⚪ 선택입력 # [카드이미지포함여부]
# "0" : 미포함, "1" : 포함
#    "cardNo": "카드번호",  # ⚪ 선택입력 # 현대카드 아이디로그인(필수) : 인증할 카드번호
# KB 카드소지확인 인증이 필요한 경우 : 카드번호 전체
#    "cardPassword": encrypt_rsa("카드비밀번호", public_key),  # ⚪ 선택입력 # (RSA 암호화된 카드 비밀번호)
# 현대카드 아이디로그인(필수) : 카드 비밀번호 4자리
# KB 카드소지확인 인증이 필요한 경우 : 카드비밀번호 앞 2자리
    "connectedId": "byi1wYwD40k8hEIiXl6bRF",  # ✅ 필수입력
}
endpoint = "/v1/kr/card/p/account/card-list"

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
