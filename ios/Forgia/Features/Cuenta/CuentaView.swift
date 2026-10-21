import SwiftUI

struct CuentaView: View {
    @Environment(SessionStore.self) private var session
    @State private var showConsent = false
    @State private var confirmRevoke = false
    @State private var showDelete = false

    var body: some View {
        List {
            Section("Información personal") {
                LabeledContent("Correo", value: session.profile?.email ?? "—")
                if let name = session.profile?.displayName {
                    LabeledContent("Nombre", value: name)
                }
                Link("Editar perfil en forgia.fit", destination: AppConfig.webURL.appending(path: "app/perfil"))
            }

            Section {
                if session.profile?.aiConsentAt != nil {
                    Text("Permitiste enviar tus datos de entrenamiento a Anthropic (Claude). Así se generan tus WODs.")
                        .font(.footnote).foregroundStyle(Theme.muted)
                    Button("Retirar permiso") { confirmRevoke = true }
                } else {
                    Text("Sin permiso para enviar tus datos a Anthropic (Claude). La generación de WODs está desactivada.")
                        .font(.footnote).foregroundStyle(Theme.muted)
                    Button("Activar") { showConsent = true }
                }
            } header: {
                Text("Coach con IA")
            }

            Section {
                Button("Cerrar sesión") { Task { await session.signOut() } }
            }

            Section {
                Button("Eliminar cuenta", role: .destructive) { showDelete = true }
            } footer: {
                Text("Borra tu cuenta y todo lo que guardaste: perfil, WODs, resultados, PRs y programas. No se puede deshacer.")
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.ground)
        .navigationTitle("Cuenta")
        .sheet(isPresented: $showConsent) { AIConsentView() }
        .sheet(isPresented: $showDelete) { DeleteAccountView() }
        .confirmationDialog("¿Retirar el permiso de IA?", isPresented: $confirmRevoke, titleVisibility: .visible) {
            Button("Retirar permiso", role: .destructive) {
                Task { try? await session.setAIConsent(false) }
            }
        } message: {
            Text("Dejamos de enviar tus datos a Anthropic. No podrás generar WODs hasta que lo vuelvas a activar. Lo que ya guardaste no se borra.")
        }
    }
}
