udid:="964548FA-E4BB-489C-906A-2484DF276552"

bin:="preview"
src:=main.swift usercode.swift builder.swift helper.swift preview.swift directory.swift render.swift
app_bundle:=preview.app/
app_id:=$(shell xmllint --xpath '//key[text()="CFBundleIdentifier"]/following::string[1]/text()' Info.plist)

simulator:
	xcrun -sdk iphonesimulator swiftc -target x86_64-apple-ios13 $(src) -o $(bin)
	mkdir -p $(app_bundle)
	cp Info.plist $(bin) $(app_bundle)

device:
	xcrun -sdk iphoneos swiftc -target arm64-apple-ios13 $(src)
	mkdir -p $(app_bundle)
	cp Info.plist $(bin) $(app_bundle)

launch:
	xcrun simctl launch --console $(udid) $(app_id)

install:
	xcrun simctl install $(udid) $(app_bundle)

uninstall:
	xcrun simctl uninstall $(udid) $(app_id)
