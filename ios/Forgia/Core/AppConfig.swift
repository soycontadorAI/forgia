import Foundation

/// Valores de Info.plist que vienen de Config/*.xcconfig.
enum AppConfig {
    static let supabaseURL = url(for: "SupabaseURL")
    static let supabaseAnonKey = string(for: "SupabaseAnonKey")
    static let apiBaseURL = url(for: "ForgiaAPIBaseURL")
    static let webURL = URL(string: "https://forgia.fit")!

    private static func string(for key: String) -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String, !value.isEmpty else {
            fatalError("Falta \(key) en Info.plist: corre ios/scripts/write-secrets.sh")
        }
        return value
    }

    private static func url(for key: String) -> URL {
        guard let url = URL(string: string(for: key)) else { fatalError("\(key) no es una URL válida") }
        return url
    }
}
