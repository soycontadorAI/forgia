import SwiftUI

/// Eliminación de cuenta dentro de la app (App Store 5.1.1(v)).
struct DeleteAccountView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var confirmText = ""
    @State private var deleting = false
    @State private var error: String?

    private var canDelete: Bool {
        confirmText.trimmingCharacters(in: .whitespaces).uppercased() == "ELIMINAR" && !deleting
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("¿Eliminar tu cuenta?").font(.title.bold())
            Text("Se borran de inmediato tu perfil, WODs, resultados, PRs, programas y evaluaciones. No hay forma de recuperarlos.")
                .foregroundStyle(Theme.muted)
            TextField("Escribe ELIMINAR para confirmar", text: $confirmText)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .textFieldStyle(FieldStyle())
            if let error { Text(error).font(.footnote).foregroundStyle(Theme.accent) }
            Button {
                Task { await delete() }
            } label: {
                if deleting { ProgressView().tint(.white) } else { Text("Eliminar mi cuenta") }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(!canDelete)
            .opacity(canDelete ? 1 : 0.5)
            Button("Cancelar") { dismiss() }
                .buttonStyle(SecondaryButtonStyle())
                .disabled(deleting)
            Spacer()
        }
        .padding(24)
        .background(Theme.ground)
        .presentationDetents([.medium, .large])
    }

    private func delete() async {
        deleting = true
        error = nil
        do {
            try await ForgiaAPI(session: session).deleteAccount()
            dismiss()
        } catch {
            self.error = error.localizedDescription
            deleting = false
        }
    }
}
