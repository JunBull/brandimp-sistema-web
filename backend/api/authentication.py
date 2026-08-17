from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # 1. Primero intentar leer del header (por si acaso o para pruebas API)
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                return self.get_validated_token_and_user(raw_token)

        # 2. Si no hay header, intentar leer de la cookie HttpOnly
        raw_token = request.COOKIES.get(getattr(settings, 'JWT_AUTH_COOKIE', 'access_token'))
        if raw_token is not None:
            return self.get_validated_token_and_user(raw_token)
            
        return None
        
    def get_validated_token_and_user(self, raw_token):
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
