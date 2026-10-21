import Foundation
import Observation
import Supabase

/// Sesión de Supabase y perfil del usuario. Es la única dueña del cliente.
@MainActor
@Observable
final class SessionStore {
    enum State: Equatable {
        case loading
        case signedOut
        case signedIn(userID: UUID, email: String?)
    }

    private(set) var state: State = .loading
    private(set) var profile: Profile?

    let client = SupabaseClient(supabaseURL: AppConfig.supabaseURL, supabaseKey: AppConfig.supabaseAnonKey)

    init() {
        Task { await listen() }
    }

    private func listen() async {
        for await (_, session) in client.auth.authStateChanges {
            if let session, !session.isExpired {
                state = .signedIn(userID: session.user.id, email: session.user.email)
                await refreshProfile()
            } else {
                state = .signedOut
                profile = nil
            }
        }
    }

    var userID: UUID? {
        if case let .signedIn(id, _) = state { return id }
        return nil
    }

    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }

    /// El trigger handle_new_user guarda terms_accepted_at con la hora del servidor.
    func signUp(email: String, password: String) async throws {
        try await client.auth.signUp(
            email: email,
            password: password,
            data: ["terms_accepted": .bool(true)],
            redirectTo: AppConfig.webURL.appending(path: "auth/callback")
        )
    }

    func signOut() async {
        try? await client.auth.signOut()
    }

    /// Tras borrar la cuenta en el servidor, sólo queda limpiar la sesión local.
    func clearLocalSession() async {
        try? await client.auth.signOut(scope: .local)
    }

    func accessToken() async throws -> String {
        try await client.auth.session.accessToken
    }

    func refreshProfile() async {
        guard let userID else { return }
        profile = try? await client.from("profiles")
            .select("id, email, display_name, onboarding_completed, training_frequency, ai_consent_at, terms_accepted_at")
            .eq("id", value: userID)
            .single()
            .execute()
            .value
    }

    func setAIConsent(_ granted: Bool) async throws {
        guard let userID else { return }
        let now = Date()
        try await client.from("profiles")
            .update(ProfileConsentUpdate(aiConsentAt: granted ? now : nil, updatedAt: now))
            .eq("id", value: userID)
            .execute()
        await refreshProfile()
    }

}

/// `ai_consent_at` se manda aunque sea nil: así se retira el permiso.
private struct ProfileConsentUpdate: Encodable {
    let aiConsentAt: Date?
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case aiConsentAt = "ai_consent_at"
        case updatedAt = "updated_at"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(aiConsentAt, forKey: .aiConsentAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }
}
