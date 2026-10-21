import Foundation
import Supabase

enum APIError: LocalizedError {
    /// 403 ai_consent_required: falta el permiso para enviar datos a Anthropic
    case consentRequired
    case server(String)

    var errorDescription: String? {
        switch self {
        case .consentRequired: "Para usar el coach con IA necesitas permitir que tus datos de entrenamiento se envíen a Anthropic."
        case let .server(message): message
        }
    }
}

/// Cliente de las rutas /api de forgia.fit (Bearer con el JWT de Supabase) y de
/// las tablas que la app lee directo con RLS. Contrato en docs/API.md.
struct ForgiaAPI {
    let session: SessionStore

    private struct ErrorBody: Decodable {
        let error: String?
        let code: String?
    }

    private func request(_ path: String, method: String, body: some Encodable) async throws -> Data {
        var request = URLRequest(url: AppConfig.apiBaseURL.appending(path: path))
        request.httpMethod = method
        request.timeoutInterval = 120
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(try await session.accessToken())", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let decoded = try? JSONDecoder().decode(ErrorBody.self, from: data)
            if status == 403, decoded?.code == "ai_consent_required" { throw APIError.consentRequired }
            throw APIError.server(decoded?.error ?? "Algo salió mal (\(status)). Intenta de nuevo.")
        }
        return data
    }

    // MARK: WOD

    func generateWod(notes: String) async throws -> Wod {
        struct Body: Encodable { let sessionNotes: String? }
        let trimmed = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let data = try await request("api/generate-wod", method: "POST", body: Body(sessionNotes: trimmed.isEmpty ? nil : trimmed))
        return try JSONDecoder().decode(Wod.self, from: data)
    }

    /// La API no guarda el WOD: el cliente decide guardarlo (igual que la web).
    func save(_ wod: Wod) async throws {
        guard let userID = session.userID else { return }
        struct Row: Encodable { let user_id: UUID; let wod: Wod }
        try await session.client.from("wods").insert(Row(user_id: userID, wod: wod)).execute()
    }

    func latestWod() async throws -> SavedWod? {
        guard let userID = session.userID else { return nil }
        let rows: [SavedWod] = try await session.client.from("wods")
            .select("id, wod, created_at")
            .eq("user_id", value: userID)
            .order("created_at", ascending: false)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    // MARK: Cuenta

    func deleteAccount() async throws {
        struct Body: Encodable { let confirm = "ELIMINAR" }
        _ = try await request("api/account", method: "DELETE", body: Body())
        await session.clearLocalSession()
    }
}
