// swift-tools-version:5.1

import PackageDescription

let package = Package(
    name: "PreviewProviderParser",
    dependencies: [
        .package(url: "https://github.com/apple/swift-syntax.git", .exact("0.50100.0")),
    ],
    targets: [
        .target(
            name: "PreviewProviderParser",
            dependencies: ["SwiftSyntax"]),
    ]
)
