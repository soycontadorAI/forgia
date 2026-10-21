import SwiftUI

/// Permiso explícito antes de enviar datos a Anthropic (App Store 5.1.2(i)).
/// Mismo texto que AIConsentGate en la web.
struct AIConsentView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var saving = false
    @State private var error: String?

    private let sentData = [
        "Tu perfil de entrenamiento: edad, sexo, peso, estatura, nivel, objetivos, equipo y frecuencia",
        "Las lesiones o limitaciones que registres",
        "Tus WODs, resultados, notas y PRs recientes",
        "Los mensajes que le escribas al Coach",
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Tu coach usa IA").font(.title.bold())
                Text("Para crear tus WODs, tu programa, el análisis semanal y las respuestas del Coach, Forgia envía datos de tu entrenamiento a Claude, el modelo de IA de Anthropic.")
                    .foregroundStyle(Theme.muted)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Qué se envía").font(.headline)
                    ForEach(sentData, id: \.self) { item in
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Circle().fill(Theme.accent).frame(width: 6, height: 6)
                            Text(item).foregroundStyle(Theme.muted)
                        }
                    }
                }
                .card()

                Label {
                    Text("No se envían tu nombre, tu correo ni tu contraseña. Anthropic procesa los datos para responder y, según sus términos comerciales, no los usa para entrenar sus modelos.")
                        .foregroundStyle(Theme.muted)
                } icon: {
                    Image(systemName: "checkmark.shield").foregroundStyle(Theme.coolDown)
                }

                Text("Sin este permiso no puedes generar WODs. Puedes cambiarlo cuando quieras en Cuenta.")
                    .font(.footnote)
                    .foregroundStyle(Theme.muted)

                if let error { Text(error).font(.footnote).foregroundStyle(Theme.accent) }

                Button {
                    Task { await accept() }
                } label: {
                    if saving { ProgressView().tint(.white) } else { Label("Permitir y continuar", systemImage: "checkmark") }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(saving)

                Button("Ahora no") { dismiss() }
                    .buttonStyle(SecondaryButtonStyle())
            }
            .padding(24)
        }
        .background(Theme.ground)
    }

    private func accept() async {
        saving = true
        defer { saving = false }
        do {
            try await session.setAIConsent(true)
            dismiss()
        } catch {
            self.error = "No se pudo guardar tu permiso. Intenta de nuevo."
        }
    }
}
