import Foundation

/// Mismo contrato que src/types/wod.ts y wodSchema (src/lib/ai/schemas.ts).
struct WodSection: Codable, Hashable {
    var title: String
    var duration: String?
    var parts: [String]?
    var details: [String]?
    var type: String?
    var description: String?
    var movements: [String]?
    var notes: String?
}

struct Wod: Codable, Hashable {
    var title: String
    var warmUp: WodSection
    var strengthSkill: WodSection
    var metcon: WodSection
    var coolDown: WodSection
}

struct SavedWod: Codable, Identifiable {
    var id: UUID
    var wod: Wod
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, wod
        case createdAt = "created_at"
    }
}
