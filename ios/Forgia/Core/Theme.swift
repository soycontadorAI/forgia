import SwiftUI

/// Tokens de "Pulso" (src/app/globals.css) en su versión oscura.
enum Theme {
    static let ground = Color(red: 0.039, green: 0.043, blue: 0.055)
    static let surface = Color(red: 0.086, green: 0.094, blue: 0.114)
    static let raised = Color(red: 0.133, green: 0.141, blue: 0.165)
    static let muted = Color(red: 0.62, green: 0.64, blue: 0.68)
    static let accent = Color(red: 0.937, green: 0.267, blue: 0.267)
    static let accentSolid = Color(red: 0.863, green: 0.149, blue: 0.149)

    static let warmUp = Color(red: 0.961, green: 0.620, blue: 0.043)
    static let strength = Color(red: 0.231, green: 0.510, blue: 0.965)
    static let metcon = accent
    static let coolDown = Color(red: 0.063, green: 0.725, blue: 0.506)
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(.white)
            .background(Theme.accentSolid.opacity(configuration.isPressed ? 0.8 : 1), in: RoundedRectangle(cornerRadius: 16))
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(.white)
            .background(Theme.raised.opacity(configuration.isPressed ? 0.7 : 1), in: RoundedRectangle(cornerRadius: 16))
    }
}

extension View {
    func card() -> some View {
        padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 24))
    }
}
