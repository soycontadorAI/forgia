import Foundation

/// Los campos de `profiles` que usa la app nativa.
struct Profile: Codable {
    var id: UUID
    var email: String?
    var displayName: String?
    var onboardingCompleted: Bool
    var trainingFrequency: Int?
    var aiConsentAt: Date?
    var termsAcceptedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, email
        case displayName = "display_name"
        case onboardingCompleted = "onboarding_completed"
        case trainingFrequency = "training_frequency"
        case aiConsentAt = "ai_consent_at"
        case termsAcceptedAt = "terms_accepted_at"
    }

    var firstName: String? {
        displayName?.split(separator: " ").first.map(String.init)
    }
}
