import SwiftUI

struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        ZStack {
            Theme.ground.ignoresSafeArea()
            switch session.state {
            case .loading:
                ProgressView()
            case .signedOut:
                LoginView()
            case .signedIn:
                if let profile = session.profile, !profile.onboardingCompleted {
                    OnboardingOnWebView()
                } else {
                    MainTabs()
                }
            }
        }
    }
}

private struct MainTabs: View {
    var body: some View {
        TabView {
            NavigationStack { HoyView() }
                .tabItem { Label("Hoy", systemImage: "flame") }
            NavigationStack { CuentaView() }
                .tabItem { Label("Cuenta", systemImage: "person") }
        }
    }
}

/// El cuestionario inicial todavía vive en la web.
private struct OnboardingOnWebView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "list.bullet.clipboard")
                .font(.system(size: 44))
                .foregroundStyle(Theme.accent)
            Text("Completa tu perfil")
                .font(.title2.bold())
            Text("Tu nivel, objetivos y equipo arman cada WOD. Llénalo en forgia.fit y vuelve aquí.")
                .multilineTextAlignment(.center)
                .foregroundStyle(Theme.muted)
            Link("Abrir forgia.fit", destination: AppConfig.webURL.appending(path: "app/onboarding"))
                .buttonStyle(PrimaryButtonStyle())
            Button("Ya lo completé") { Task { await session.refreshProfile() } }
                .buttonStyle(SecondaryButtonStyle())
            Button("Cerrar sesión", role: .destructive) { Task { await session.signOut() } }
                .padding(.top, 8)
        }
        .padding(24)
    }
}
