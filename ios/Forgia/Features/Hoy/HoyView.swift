import SwiftUI

struct HoyView: View {
    @Environment(SessionStore.self) private var session
    @State private var wod: Wod?
    @State private var notes = ""
    @State private var loadingLatest = true
    @State private var generating = false
    @State private var error: String?
    @State private var showConsent = false

    private var api: ForgiaAPI { ForgiaAPI(session: session) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "es_MX"))).capitalized)
                        .font(.subheadline).foregroundStyle(Theme.muted)
                    Text(greeting).font(.largeTitle.bold())
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Nota para la sesión (opcional)").font(.subheadline)
                    TextField("Ej: hoy quiero gimnásticos y tengo 45 min", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                        .padding(14)
                        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
                }

                Button {
                    Task { await generate() }
                } label: {
                    if generating {
                        HStack(spacing: 10) { ProgressView().tint(.white); Text("Generando…") }
                    } else {
                        Label(wod == nil ? "Generar WOD" : "Generar otro WOD", systemImage: "bolt.fill")
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(generating)

                if let error {
                    Text(error).font(.footnote).foregroundStyle(Theme.accent)
                }

                if let wod {
                    WodView(wod: wod)
                } else if loadingLatest {
                    ProgressView().frame(maxWidth: .infinity).padding(.top, 40)
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "dice").font(.largeTitle).foregroundStyle(Theme.muted)
                        Text("Todavía no hay WOD").font(.headline)
                        Text("Genera tu entrenamiento del día; se arma con tu perfil y tus últimas 4 semanas.")
                            .font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .card()
                }
            }
            .padding(20)
        }
        .background(Theme.ground)
        .toolbar(.hidden, for: .navigationBar)
        .task { await loadLatest() }
        .refreshable { await loadLatest() }
        .sheet(isPresented: $showConsent) { AIConsentView() }
        .onAppear {
            if session.profile?.aiConsentAt == nil { showConsent = true }
        }
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        let base = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"
        if let name = session.profile?.firstName { return "\(base), \(name)" }
        return base
    }

    private func loadLatest() async {
        defer { loadingLatest = false }
        if let latest = try? await api.latestWod(), Calendar.current.isDateInToday(latest.createdAt) {
            wod = latest.wod
        }
    }

    private func generate() async {
        guard session.profile?.aiConsentAt != nil else {
            showConsent = true
            return
        }
        generating = true
        error = nil
        defer { generating = false }
        do {
            let generated = try await api.generateWod(notes: notes)
            wod = generated
            notes = ""
            try? await api.save(generated)
        } catch APIError.consentRequired {
            showConsent = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}
