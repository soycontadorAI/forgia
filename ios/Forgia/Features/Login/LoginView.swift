import SwiftUI

struct LoginView: View {
    @Environment(SessionStore.self) private var session
    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var termsAccepted = false
    @State private var loading = false
    @State private var message: String?
    @State private var error: String?

    private var canSubmit: Bool {
        email.contains("@") && password.count >= 6 && (!isSignUp || termsAccepted) && !loading
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 10) {
                    Image(systemName: "flame.fill")
                        .font(.title2)
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(Theme.accent, in: RoundedRectangle(cornerRadius: 12))
                    Text("Forgia").font(.title2.bold())
                }
                .padding(.top, 40)

                VStack(alignment: .leading, spacing: 6) {
                    Text(isSignUp ? "Crea tu cuenta" : "Hola de nuevo")
                        .font(.largeTitle.bold())
                    Text(isSignUp ? "Tu WOD diario, armado con tu nivel y tu equipo." : "Entra para generar el WOD de hoy.")
                        .foregroundStyle(Theme.muted)
                }

                Picker("Modo", selection: $isSignUp) {
                    Text("Iniciar sesión").tag(false)
                    Text("Crear cuenta").tag(true)
                }
                .pickerStyle(.segmented)

                VStack(spacing: 12) {
                    TextField("Correo electrónico", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Contraseña", text: $password)
                        .textContentType(isSignUp ? .newPassword : .password)
                }
                .textFieldStyle(FieldStyle())

                if isSignUp {
                    Toggle(isOn: $termsAccepted) {
                        Text("Acepto los [Términos](https://forgia.fit/terminos) y el [Aviso de privacidad](https://forgia.fit/privacidad)")
                            .font(.footnote)
                    }
                    .toggleStyle(.switch)
                }

                if let error {
                    Text(error).font(.footnote).foregroundStyle(Theme.accent)
                }
                if let message {
                    Text(message).font(.footnote).foregroundStyle(Theme.coolDown)
                }

                Button {
                    Task { await submit() }
                } label: {
                    if loading { ProgressView().tint(.white) } else { Text(isSignUp ? "Crear cuenta" : "Iniciar sesión") }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(!canSubmit)
                .opacity(canSubmit ? 1 : 0.5)

                if !isSignUp {
                    Link("¿Olvidaste tu contraseña?", destination: AppConfig.webURL.appending(path: "login"))
                        .font(.footnote)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(24)
        }
        .onChange(of: isSignUp) {
            error = nil
            message = nil
        }
    }

    private func submit() async {
        loading = true
        error = nil
        message = nil
        defer { loading = false }
        do {
            if isSignUp {
                try await session.signUp(email: email, password: password)
                message = "Revisa tu correo para confirmar tu cuenta y luego inicia sesión."
                isSignUp = false
            } else {
                try await session.signIn(email: email, password: password)
            }
        } catch {
            self.error = Self.translate(error)
        }
    }

    /// Mismos mensajes que la web (src/app/login/page.tsx).
    private static func translate(_ error: Error) -> String {
        let text = error.localizedDescription
        if text.contains("Invalid login credentials") { return "Correo o contraseña incorrectos." }
        if text.contains("Email not confirmed") { return "Confirma tu correo antes de iniciar sesión." }
        if text.contains("already registered") { return "Ya existe una cuenta con este correo." }
        return "No se pudo continuar. Revisa tu conexión e intenta de nuevo."
    }
}

struct FieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .frame(minHeight: 52)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.raised))
    }
}
