import SwiftUI

@main
struct ForgiaApp: App {
    @State private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .tint(Theme.accent)
                .preferredColorScheme(.dark)
        }
    }
}
