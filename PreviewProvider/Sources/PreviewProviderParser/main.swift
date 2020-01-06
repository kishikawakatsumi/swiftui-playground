import Foundation
import SwiftSyntax


struct TypeInheritanceVisitor: SyntaxVisitor {
    var previewProviders = [String]()

    mutating func visit(_ node: TypeInheritanceClauseSyntax) -> SyntaxVisitorContinueKind {
        for inheritance in node.inheritedTypeCollection {
            if inheritance.description.trimmingCharacters(in: .whitespaces) == "PreviewProvider" {
                if let decl = node.parent as? StructDeclSyntax {
                    previewProviders.append("\(decl.identifier)")
                }
            }
        }
        return .skipChildren
    }
}

if CommandLine.arguments.count > 1 {
    let sourceFile = try SyntaxParser.parse(URL(fileURLWithPath: CommandLine.arguments[1]))
    var visitor = TypeInheritanceVisitor()
    sourceFile.walk(&visitor)

    print(visitor.previewProviders.joined(separator: ","))
}
