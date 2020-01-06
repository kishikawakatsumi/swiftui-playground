import SwiftUI
import UIKit

var builder = PreviewBuilder()
let previews = previewProviders()
builder.build(view: previews)

var renderEach = ""
var renderAllInner = ""
for (index, preview) in builder.previews.enumerated() {
    let number = String(format: "%02d", index)
    renderEach += """
        func render\(number)(preview: Preview) {
            guard let view = preview.view as? \(preview.type) else { return }

            let hostingController = UIHostingController(rootView: view)
            let window = UIWindow(frame: CGRect(origin: .zero, size: builder.previewSize(for: preview)))
            window.rootViewController = hostingController
            window.makeKeyAndVisible()

            let image = window.asImage()
            guard let pngData = image.pngData() else {
                return
            }
            try? pngData.write(to: URL(fileURLWithPath: "\(workingDirectory())/preview_\(number).png"))
        }


        """

    renderAllInner += """
            render\(number)(preview: previews[\(index)])

        """
}

let source = """
    import SwiftUI

    \(renderEach)
    func renderAll(previews: [Preview]) {
    \(renderAllInner)
    }
    """

if let data = source.data(using: .utf8) {
    do {
        try data.write(to: URL(fileURLWithPath: "\(workingDirectory())/render.swift"))
    } catch {
        print(error)
    }
}

renderAll(previews: builder.previews)
