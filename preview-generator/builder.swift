import SwiftUI

struct Preview {
    let view: Any
    let type: String
    let modifiers: [Any]
}

struct PreviewBuilder {
    var previews = [Preview]()
    var modifiers = [Any]()

    func previewSize(for preview: Preview) -> CGSize {
        for modifier in preview.modifiers + modifiers {
            switch modifier {
            case let modifier as PreviewLayout:
                switch modifier {
                case .device, .sizeThatFits:
                    break
                case .fixed(let width, let height):
                    let size = CGSize(width: min(width, 2048), height: min(height, 2048))
                    return size
                @unknown default:
                    break
                }
            case _ as PreviewDevice:
                break
            case _ as PreviewPlatform:
                break
            default:
                break
            }
        }
        return CGSize(width: 375, height: 812)
    }

    mutating func build(view: Any) {
        let mirror = Mirror(reflecting: view)
        if String(describing: mirror.subjectType).hasPrefix("Group") {
            return extractGroup(group: mirror)
        } else {
            if String(describing: mirror.subjectType).hasPrefix("ModifiedContent") {
                inspectModifiedContent(view: mirror)
            } else {
                let v = Preview(view: view,
                                type: String(describing: mirror.subjectType),
                                modifiers: modifiers)
                previews.append(v)
                modifiers.removeAll()
            }
        }
        inspectContent(view: mirror)
    }

    mutating func inspectContent(view: Mirror) {
        let children = view.children
        for child in children {
            if child.label == "content" {
                inspectContent(view: Mirror(reflecting: child.value))
            }
            if child.label == "modifier" {
                if let modifier = Mirror(reflecting: child.value).descendant("value") {
                    modifiers.append(modifier)
                }
            }
        }
    }

    mutating func inspectModifiedContent(view: Mirror) {
        let children = view.children
        for child in children {
            if child.label == "content" {
                let mirror = Mirror(reflecting: child.value)
                if String(describing: mirror.subjectType).hasPrefix("Group") {
                    extractGroup(group: mirror)
                } else {
                    let v = Preview(view: child.value,
                                    type: String(describing: mirror.subjectType),
                                    modifiers: modifiers)
                    previews.append(v)
                    modifiers.removeAll()
                }
            }
        }
    }

    mutating func extractGroup(group: Mirror) {
        let children = group.children
        for child in children {
            if child.label == "content" {
                let mirror = Mirror(reflecting: child.value)
                if String(describing: mirror.subjectType).hasPrefix("TupleView") {
                    let tupleView = mirror
                    for child in tupleView.children {
                        if child.label == "value" {
                            let view = Mirror(reflecting: child.value)
                            for child in view.children {
                                let mirror = Mirror(reflecting: child.value)
                                if String(describing: mirror.subjectType).hasPrefix("Group") {
                                    extractGroup(group: mirror)
                                } else {
                                    let mirror = Mirror(reflecting: child.value)
                                    if String(describing: mirror.subjectType).hasPrefix("ModifiedContent") {
                                        inspectModifiedContent(view: mirror)
                                    } else {
                                        let v = Preview(view: child.value,
                                                        type: String(describing: mirror.subjectType),
                                                        modifiers: modifiers)
                                        previews.append(v)
                                        modifiers.removeAll()
                                    }
                                }
                            }
                        }
                    }
                } else {
                    let v = Preview(view: child.value,
                                    type: String(describing: mirror.subjectType),
                                    modifiers: modifiers)
                    previews.append(v)
                    modifiers.removeAll()
                }
            }
        }
    }
}
