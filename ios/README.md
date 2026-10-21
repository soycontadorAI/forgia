# Forgia para iOS

App nativa en SwiftUI. Usa el mismo backend que la web: Supabase para sesión y
tablas (con RLS) y las rutas `https://forgia.fit/api/*` con
`Authorization: Bearer <JWT>`. El contrato está en `../docs/API.md`.

## Qué hay

- Inicio de sesión y creación de cuenta (los términos se guardan en el primer inicio)
- Hoy: generar el WOD con nota opcional, ver el último WOD del día y guardarlo en `wods`
- Permiso de IA antes de cualquier generación (App Store 5.1.2(i)), igual que la web
- Cuenta: permiso de IA, cerrar sesión y eliminar la cuenta (App Store 5.1.1(v))
- Si el perfil no está completo, manda a terminar el cuestionario en forgia.fit

Siguiente: cuestionario inicial nativo, registrar resultado, modo en vivo con
Live Activity, push por APNs (la tabla `push_subscriptions` ya acepta
`platform: "apns"`), HealthKit y StoreKit.

## Correrlo

Requisitos: Xcode 26 o más nuevo (App Store Connect ya no acepta builds hechos
con SDKs anteriores) y XcodeGen (`brew install xcodegen`).

```sh
cd ios
./scripts/write-secrets.sh   # arma Config/Secrets.xcconfig desde ../.env.local
xcodegen                     # genera Forgia.xcodeproj (no se versiona)
open Forgia.xcodeproj
```

En Xcode: Signing & Capabilities → elige tu equipo de Apple Developer. El
bundle id es `fit.forgia.app`.

Con Xcode 26, sube `supabase-swift` en `project.yml` a la última versión
(2.50+ pide Swift 6.1).
