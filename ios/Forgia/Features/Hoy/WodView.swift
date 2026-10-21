import SwiftUI

/// El WOD por secciones, con los colores de sección de la web.
struct WodView: View {
    let wod: Wod

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(wod.title)
                .font(.title.bold())
            SectionCard(section: wod.warmUp, color: Theme.warmUp, items: wod.warmUp.parts)
            SectionCard(section: wod.strengthSkill, color: Theme.strength, items: wod.strengthSkill.details)
            SectionCard(section: wod.metcon, color: Theme.metcon, items: wod.metcon.movements)
            SectionCard(section: wod.coolDown, color: Theme.coolDown, items: wod.coolDown.parts)
        }
    }
}

private struct SectionCard: View {
    let section: WodSection
    let color: Color
    let items: [String]?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(section.title).font(.headline).foregroundStyle(color)
                Spacer()
                if let duration = section.duration {
                    Text(duration).font(.caption).foregroundStyle(Theme.muted)
                }
            }
            if let type = section.type {
                Text(type).font(.caption.bold()).padding(.horizontal, 8).padding(.vertical, 3)
                    .background(color.opacity(0.15), in: Capsule()).foregroundStyle(color)
            }
            if let description = section.description {
                Text(description).font(.subheadline)
            }
            ForEach(items ?? [], id: \.self) { item in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Circle().fill(color).frame(width: 6, height: 6)
                    Text(item).font(.subheadline)
                }
            }
            if let notes = section.notes, !notes.isEmpty {
                Text(notes).font(.footnote).foregroundStyle(Theme.muted)
            }
        }
        .card()
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2).fill(color).frame(width: 4).padding(.vertical, 16)
        }
    }
}
