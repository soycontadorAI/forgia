#!/bin/sh
# Genera ios/Config/Secrets.xcconfig con la URL y la llave anon de .env.local.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
read_var() { grep -E "^$1=" "$ROOT/.env.local" | head -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//' | tr -d '"'; }
URL="$(read_var NEXT_PUBLIC_SUPABASE_URL)"
KEY="$(read_var NEXT_PUBLIC_SUPABASE_ANON_KEY)"
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "Faltan variables de Supabase en .env.local" >&2; exit 1; }
printf 'SUPABASE_URL = %s\nSUPABASE_ANON_KEY = %s\n' "$(printf %s "$URL" | sed 's#//#/$()/#')" "$KEY" > "$ROOT/ios/Config/Secrets.xcconfig"
echo "ios/Config/Secrets.xcconfig listo"
